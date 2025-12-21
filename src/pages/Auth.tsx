import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Loader2, Mail, Lock, User, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('כתובת אימייל לא תקינה'),
  password: z.string().min(6, 'סיסמה חייבת להכיל לפחות 6 תווים'),
});

const signupSchema = z.object({
  email: z.string().email('כתובת אימייל לא תקינה'),
  password: z.string().min(6, 'סיסמה חייבת להכיל לפחות 6 תווים'),
  fullName: z.string().min(2, 'שם מלא חייב להכיל לפחות 2 תווים'),
});

const resetSchema = z.object({
  email: z.string().email('כתובת אימייל לא תקינה'),
});

export default function Auth() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showUserExistsMessage, setShowUserExistsMessage] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  const [showUpdatePassword, setShowUpdatePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    // Check URL hash for recovery token on initial load
    const checkRecoveryToken = () => {
      const hash = window.location.hash;
      if (hash) {
        const hashParams = new URLSearchParams(hash.substring(1));
        const type = hashParams.get('type');
        const accessToken = hashParams.get('access_token');
        
        if (type === 'recovery' && accessToken) {
          // Set the session from the recovery token
          supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: hashParams.get('refresh_token') || '',
          }).then(() => {
            setShowUpdatePassword(true);
            // Clear hash from URL
            window.history.replaceState(null, '', window.location.pathname);
          });
          return true;
        }
      }
      return false;
    };

    const isRecovery = checkRecoveryToken();

    // Check if user is already logged in (only if not in recovery mode)
    if (!isRecovery) {
      const checkSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && !showUpdatePassword) {
          navigate('/');
        }
      };
      checkSession();
    }

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setShowUpdatePassword(true);
      } else if (session && !showUpdatePassword) {
        // Don't redirect if we're showing the update password form
        const hash = window.location.hash;
        if (!hash.includes('type=recovery')) {
          navigate('/');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, showUpdatePassword]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message === 'Invalid login credentials') {
          toast({
            title: 'שגיאת התחברות',
            description: 'אימייל או סיסמה שגויים',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'שגיאה',
            description: error.message,
            variant: 'destructive',
          });
        }
        return;
      }

      toast({
        title: 'התחברת בהצלחה',
        description: 'מעביר לדשבורד...',
      });
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: 'שגיאה',
        description: 'אירעה שגיאה בהתחברות',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const result = signupSchema.safeParse({ email, password, fullName });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data: signUpData, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        if (error.message.includes('already registered') || error.message.includes('User already registered')) {
          setShowUserExistsMessage(true);
        } else {
          toast({
            title: 'שגיאה',
            description: error.message,
            variant: 'destructive',
          });
        }
        return;
      }

      // Check if user already exists (Supabase returns user but with empty identities when email exists)
      if (signUpData.user && (!signUpData.user.identities || signUpData.user.identities.length === 0)) {
        setShowUserExistsMessage(true);
        return;
      }

      // Send approval request email to admin - only for truly new users
      if (signUpData.user && signUpData.user.identities && signUpData.user.identities.length > 0) {
        try {
          await supabase.functions.invoke('send-approval-request', {
            body: {
              userId: signUpData.user.id,
              userEmail: email,
              userName: fullName,
            },
          });
        } catch (emailErr) {
          console.error('Failed to send approval email:', emailErr);
        }
      }

      toast({
        title: 'ההרשמה התקבלה',
        description: 'בקשתך נשלחה למנהל המערכת לאישור. תקבל הודעה כשהרישום יאושר.',
      });
      
      // Sign out immediately since they're not approved yet
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Signup error:', error);
      toast({
        title: 'שגיאה',
        description: 'אירעה שגיאה בהרשמה',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const result = resetSchema.safeParse({ email });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/auth`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        toast({
          title: 'שגיאה',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      setResetEmailSent(true);
      toast({
        title: 'נשלח בהצלחה',
        description: 'בדוק את האימייל שלך להוראות איפוס הסיסמה',
      });
    } catch (error) {
      console.error('Reset password error:', error);
      toast({
        title: 'שגיאה',
        description: 'אירעה שגיאה בשליחת הבקשה',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (newPassword.length < 6) {
      setErrors({ newPassword: 'סיסמה חייבת להכיל לפחות 6 תווים' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrors({ confirmPassword: 'הסיסמאות אינן תואמות' });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) {
        toast({
          title: 'שגיאה',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'הסיסמה עודכנה בהצלחה',
        description: 'כעת תוכל להתחבר עם הסיסמה החדשה',
      });

      // Sign out and redirect to login
      await supabase.auth.signOut();
      setShowUpdatePassword(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Update password error:', error);
      toast({
        title: 'שגיאה',
        description: 'אירעה שגיאה בעדכון הסיסמה',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Update password form (after clicking email link)
  if (showUpdatePassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 flex items-center justify-center p-4" dir="rtl">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <img 
                src="/images/bituach-yashir-logo.png" 
                alt="ביטוח ישיר" 
                className="h-12 mx-auto"
              />
            </div>
            <CardTitle className="text-2xl">עדכון סיסמה</CardTitle>
            <CardDescription>הזן את הסיסמה החדשה שלך</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">סיסמה חדשה</Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pr-10 pl-10"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.newPassword && <p className="text-sm text-destructive">{errors.newPassword}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">אימות סיסמה</Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirm-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pr-10 pl-10"
                    dir="ltr"
                  />
                </div>
                {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    מעדכן...
                  </>
                ) : (
                  'עדכן סיסמה'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Reset password form
  if (showResetPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 flex items-center justify-center p-4" dir="rtl">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <img 
                src="/images/bituach-yashir-logo.png" 
                alt="ביטוח ישיר" 
                className="h-12 mx-auto"
              />
            </div>
            <CardTitle className="text-2xl">איפוס סיסמה</CardTitle>
            <CardDescription>
              {resetEmailSent 
                ? 'בדוק את האימייל שלך להוראות איפוס הסיסמה'
                : 'הזן את כתובת האימייל שלך לקבלת הוראות איפוס'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {resetEmailSent ? (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <Mail className="h-12 w-12 mx-auto text-primary mb-4" />
                  <p className="text-muted-foreground">
                    שלחנו לך מייל עם הוראות לאיפוס הסיסמה.
                    <br />
                    בדוק גם בתיקיית הספאם.
                  </p>
                </div>
                <Button 
                  variant="default" 
                  className="w-full"
                  disabled={isLoading}
                  onClick={async () => {
                    setIsLoading(true);
                    try {
                      const redirectUrl = `${window.location.origin}/auth`;
                      const { error } = await supabase.auth.resetPasswordForEmail(email, {
                        redirectTo: redirectUrl,
                      });
                      if (error) {
                        toast({
                          title: 'שגיאה',
                          description: error.message,
                          variant: 'destructive',
                        });
                      } else {
                        toast({
                          title: 'נשלח בהצלחה',
                          description: 'מייל איפוס נשלח שוב',
                        });
                      }
                    } catch (error) {
                      toast({
                        title: 'שגיאה',
                        description: 'אירעה שגיאה בשליחה',
                        variant: 'destructive',
                      });
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      שולח...
                    </>
                  ) : (
                    'שלח שוב'
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full gap-2"
                  onClick={() => {
                    setShowResetPassword(false);
                    setResetEmailSent(false);
                    setEmail('');
                  }}
                >
                  <ArrowRight className="h-4 w-4" />
                  חזרה להתחברות
                </Button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">אימייל</Label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pr-10"
                      dir="ltr"
                    />
                  </div>
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      שולח...
                    </>
                  ) : (
                    'שלח הוראות איפוס'
                  )}
                </Button>
                
                <Button 
                  type="button"
                  variant="ghost" 
                  className="w-full gap-2"
                  onClick={() => {
                    setShowResetPassword(false);
                    setErrors({});
                  }}
                >
                  <ArrowRight className="h-4 w-4" />
                  חזרה להתחברות
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 flex items-center justify-center p-4" dir="rtl">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <img 
              src="/images/bituach-yashir-logo.png" 
              alt="ביטוח ישיר" 
              className="h-12 mx-auto"
            />
          </div>
          <CardTitle className="text-2xl">מערכת הקמת ספקים</CardTitle>
          <CardDescription>התחבר או הירשם כדי להמשיך</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">התחברות</TabsTrigger>
              <TabsTrigger value="signup">הרשמה</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">אימייל</Label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pr-10"
                      dir="ltr"
                    />
                  </div>
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="login-password">סיסמה</Label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-10 pl-10"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                </div>
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      מתחבר...
                    </>
                  ) : (
                    'התחבר'
                  )}
                </Button>
                
                <Button 
                  type="button"
                  variant="link" 
                  className="w-full text-sm"
                  onClick={() => {
                    setShowResetPassword(true);
                    setErrors({});
                  }}
                >
                  שכחת סיסמה?
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              {showUserExistsMessage ? (
                <div className="space-y-4 py-4">
                  <div className="text-center">
                    <div className="mx-auto w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                      <User className="h-6 w-6 text-amber-600" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">המשתמש כבר קיים במערכת</h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      כתובת האימייל {email} כבר רשומה במערכת.
                      <br />
                      ניתן להתחבר או לאפס את הסיסמה.
                    </p>
                  </div>
                  <div className="flex flex-col gap-3">
                    <Button 
                      className="w-full"
                      onClick={() => {
                        setShowUserExistsMessage(false);
                        setActiveTab('login');
                      }}
                    >
                      עבור להתחברות
                    </Button>
                    <Button 
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setShowUserExistsMessage(false);
                        setShowResetPassword(true);
                      }}
                    >
                      שכחתי סיסמה
                    </Button>
                    <Button 
                      variant="ghost"
                      className="w-full text-sm"
                      onClick={() => {
                        setShowUserExistsMessage(false);
                        setEmail('');
                      }}
                    >
                      נסה עם אימייל אחר
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">שם מלא</Label>
                    <div className="relative">
                      <User className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="ישראל ישראלי"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="pr-10"
                      />
                    </div>
                    {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">אימייל</Label>
                    <div className="relative">
                      <Mail className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pr-10"
                        dir="ltr"
                      />
                    </div>
                    {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">סיסמה</Label>
                    <div className="relative">
                      <Lock className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pr-10 pl-10"
                        dir="ltr"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute left-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                  </div>
                  
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                        נרשם...
                      </>
                    ) : (
                      'הירשם'
                    )}
                  </Button>
                </form>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
