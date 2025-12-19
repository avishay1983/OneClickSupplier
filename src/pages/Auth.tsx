import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Loader2, Mail, Lock, User, ArrowRight, Eye, EyeOff, Sparkles, Shield, Zap, CheckCircle2 } from 'lucide-react';
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

const features = [
  { icon: Zap, title: 'מהיר וחכם', description: 'הקמת ספק תוך 24-48 שעות במקום שבועות' },
  { icon: Shield, title: 'מאובטח לחלוטין', description: 'הזדהות דו-שלבית ואימות מסמכים' },
  { icon: Sparkles, title: 'AI מתקדם', description: 'זיהוי אוטומטי של מסמכים ונתונים' },
];

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
    const checkRecoveryToken = () => {
      const hash = window.location.hash;
      if (hash) {
        const hashParams = new URLSearchParams(hash.substring(1));
        const type = hashParams.get('type');
        const accessToken = hashParams.get('access_token');
        
        if (type === 'recovery' && accessToken) {
          supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: hashParams.get('refresh_token') || '',
          }).then(() => {
            setShowUpdatePassword(true);
            window.history.replaceState(null, '', window.location.pathname);
          });
          return true;
        }
      }
      return false;
    };

    const isRecovery = checkRecoveryToken();

    if (!isRecovery) {
      const checkSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && !showUpdatePassword) {
          navigate('/');
        }
      };
      checkSession();
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setShowUpdatePassword(true);
      } else if (session && !showUpdatePassword) {
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

      if (signUpData.user && (!signUpData.user.identities || signUpData.user.identities.length === 0)) {
        setShowUserExistsMessage(true);
        return;
      }

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

  // Branded side panel component
  const BrandedPanel = () => (
    <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary/90 to-primary/80 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 right-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-40 left-10 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-accent/20 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
        backgroundSize: '50px 50px'
      }} />

      <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
        {/* Logo and brand */}
        <div>
          <svg width="150" height="52" viewBox="0 0 275 95" role="img" aria-label="לוגו ביטוח ישיר" xmlns="http://www.w3.org/2000/svg">
            <g fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fill="#ffffff" textAnchor="end">
              <text x="135" y="45" fontSize="45">ביטוח</text>
              <text x="135" y="88" fontSize="45">ישיר</text>
            </g>
            <g fill="#FF2D55">
              <circle cx="165" cy="25" r="10" />
              <circle cx="205" cy="25" r="10" />
              <circle cx="185" cy="47.5" r="10" />
              <circle cx="165" cy="70" r="10" />
              <circle cx="205" cy="70" r="10" />
            </g>
          </svg>
        </div>

        {/* Main content */}
        <div className="space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold leading-tight">
              ספק בקליק
            </h1>
            <p className="text-xl text-white/80 max-w-md">
              מערכת הקמת ספקים מתקדמת המשלבת בינה מלאכותית לחוויה חלקה ומהירה
            </p>
          </div>

          {/* Features */}
          <div className="space-y-6">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="flex items-start gap-4 p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 transition-all duration-300 hover:bg-white/15"
              >
                <div className="p-3 bg-white/20 rounded-xl">
                  <feature.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{feature.title}</h3>
                  <p className="text-white/70 text-sm">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-white/60 text-sm">
          © 2025 ביטוח ישיר. כל הזכויות שמורות.
        </div>
      </div>
    </div>
  );

  // Form container with glass effect
  const FormContainer = ({ children, title, description }: { children: React.ReactNode; title: string; description: string }) => (
    <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 bg-gradient-to-br from-background via-background to-muted/30" dir="rtl">
      <div className="w-full max-w-md">
        {/* Mobile logo */}
        <div className="lg:hidden mb-8 flex justify-center">
          <svg width="150" height="52" viewBox="0 0 275 95" role="img" aria-label="לוגו ביטוח ישיר" xmlns="http://www.w3.org/2000/svg">
            <g fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fill="#202A65" textAnchor="end">
              <text x="135" y="45" fontSize="45">ביטוח</text>
              <text x="135" y="88" fontSize="45">ישיר</text>
            </g>
            <g fill="#FF2D55">
              <circle cx="165" cy="25" r="10" />
              <circle cx="205" cy="25" r="10" />
              <circle cx="185" cy="47.5" r="10" />
              <circle cx="165" cy="70" r="10" />
              <circle cx="205" cy="70" r="10" />
            </g>
          </svg>
        </div>

        {/* Glass card */}
        <div className="relative">
          {/* Glow effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-3xl blur-xl opacity-50" />
          
          <div className="relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-8 shadow-2xl">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary to-primary/80 rounded-2xl mb-4 shadow-lg">
                <User className="w-8 h-8 text-primary-foreground" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">{title}</h2>
              <p className="text-muted-foreground mt-2">{description}</p>
            </div>

            {children}
          </div>
        </div>

        {/* Trust badges */}
        <div className="mt-8 flex items-center justify-center gap-6 text-muted-foreground text-sm">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span>מאובטח</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>פרטיות מלאה</span>
          </div>
        </div>
      </div>
    </div>
  );

  // Styled input component
  const StyledInput = ({ 
    id, 
    type, 
    placeholder, 
    value, 
    onChange, 
    icon: Icon, 
    error, 
    dir = 'rtl',
    showPasswordToggle = false 
  }: {
    id: string;
    type: string;
    placeholder: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    icon: typeof Mail;
    error?: string;
    dir?: string;
    showPasswordToggle?: boolean;
  }) => (
    <div className="space-y-2">
      <div className="relative group">
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
          <Icon className="w-5 h-5" />
        </div>
        <Input
          id={id}
          type={showPasswordToggle && showPassword ? "text" : type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className={`h-12 pr-12 ${showPasswordToggle ? 'pl-12' : 'pl-4'} rounded-xl border-border/50 bg-background/50 focus:bg-background transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary`}
          dir={dir}
        />
        {showPasswordToggle && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        )}
      </div>
      {error && (
        <p className="text-sm text-destructive flex items-center gap-1">
          <span className="inline-block w-1 h-1 bg-destructive rounded-full" />
          {error}
        </p>
      )}
    </div>
  );

  // Styled button
  const StyledButton = ({ children, isLoading: loading, ...props }: React.ComponentProps<typeof Button> & { isLoading?: boolean }) => (
    <Button
      {...props}
      className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground font-semibold shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5"
      disabled={loading || props.disabled}
    >
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        children
      )}
    </Button>
  );

  // Update password form
  if (showUpdatePassword) {
    return (
      <div className="min-h-screen flex">
        <BrandedPanel />
        <FormContainer title="עדכון סיסמה" description="הזן את הסיסמה החדשה שלך">
          <form onSubmit={handleUpdatePassword} className="space-y-5">
            <StyledInput
              id="new-password"
              type="password"
              placeholder="סיסמה חדשה"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              icon={Lock}
              error={errors.newPassword}
              dir="ltr"
              showPasswordToggle
            />

            <StyledInput
              id="confirm-password"
              type="password"
              placeholder="אימות סיסמה"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              icon={Lock}
              error={errors.confirmPassword}
              dir="ltr"
              showPasswordToggle
            />

            <StyledButton type="submit" isLoading={isLoading}>
              עדכן סיסמה
            </StyledButton>
          </form>
        </FormContainer>
      </div>
    );
  }

  // Reset password form
  if (showResetPassword) {
    return (
      <div className="min-h-screen flex">
        <BrandedPanel />
        <FormContainer 
          title="איפוס סיסמה" 
          description={resetEmailSent ? 'בדוק את האימייל שלך' : 'הזן את כתובת האימייל שלך'}
        >
          {resetEmailSent ? (
            <div className="space-y-6">
              <div className="text-center py-6">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-full mb-4">
                  <Mail className="h-10 w-10 text-primary" />
                </div>
                <p className="text-muted-foreground">
                  שלחנו לך מייל עם הוראות לאיפוס הסיסמה.
                  <br />
                  בדוק גם בתיקיית הספאם.
                </p>
              </div>
              <StyledButton
                isLoading={isLoading}
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
                שלח שוב
              </StyledButton>
              <Button 
                variant="ghost" 
                className="w-full h-12 rounded-xl gap-2"
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
            <form onSubmit={handleResetPassword} className="space-y-5">
              <StyledInput
                id="reset-email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={Mail}
                error={errors.email}
                dir="ltr"
              />
              
              <StyledButton type="submit" isLoading={isLoading}>
                שלח הוראות איפוס
              </StyledButton>
              
              <Button 
                type="button"
                variant="ghost" 
                className="w-full h-12 rounded-xl gap-2"
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
        </FormContainer>
      </div>
    );
  }

  // Main auth form
  return (
    <div className="min-h-screen flex">
      <BrandedPanel />
      <FormContainer title="ברוכים הבאים" description="התחבר או הירשם כדי להמשיך">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-12 rounded-xl bg-muted/50 p-1 mb-6">
            <TabsTrigger 
              value="login" 
              className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
            >
              התחברות
            </TabsTrigger>
            <TabsTrigger 
              value="signup"
              className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
            >
              הרשמה
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="login" className="mt-0">
            <form onSubmit={handleLogin} className="space-y-5">
              <StyledInput
                id="login-email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={Mail}
                error={errors.email}
                dir="ltr"
              />
              
              <StyledInput
                id="login-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={Lock}
                error={errors.password}
                dir="ltr"
                showPasswordToggle
              />
              
              <StyledButton type="submit" isLoading={isLoading}>
                התחבר
              </StyledButton>
              
              <Button 
                type="button"
                variant="link" 
                className="w-full text-sm text-muted-foreground hover:text-primary"
                onClick={() => {
                  setShowResetPassword(true);
                  setErrors({});
                }}
              >
                שכחת סיסמה?
              </Button>
            </form>
          </TabsContent>
          
          <TabsContent value="signup" className="mt-0">
            {showUserExistsMessage ? (
              <div className="space-y-6 py-4">
                <div className="text-center">
                  <div className="mx-auto w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-4">
                    <User className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">המשתמש כבר קיים במערכת</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    כתובת האימייל {email} כבר רשומה במערכת.
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  <StyledButton
                    onClick={() => {
                      setShowUserExistsMessage(false);
                      setActiveTab('login');
                    }}
                  >
                    עבור להתחברות
                  </StyledButton>
                  <Button 
                    variant="outline"
                    className="w-full h-12 rounded-xl"
                    onClick={() => {
                      setShowUserExistsMessage(false);
                      setShowResetPassword(true);
                    }}
                  >
                    שכחתי סיסמה
                  </Button>
                  <Button 
                    variant="ghost"
                    className="w-full h-12 rounded-xl text-sm"
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
              <form onSubmit={handleSignup} className="space-y-5">
                <StyledInput
                  id="signup-name"
                  type="text"
                  placeholder="ישראל ישראלי"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  icon={User}
                  error={errors.fullName}
                />
                
                <StyledInput
                  id="signup-email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  icon={Mail}
                  error={errors.email}
                  dir="ltr"
                />
                
                <StyledInput
                  id="signup-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  icon={Lock}
                  error={errors.password}
                  dir="ltr"
                  showPasswordToggle
                />
                
                <StyledButton type="submit" isLoading={isLoading}>
                  הירשם
                </StyledButton>
              </form>
            )}
          </TabsContent>
        </Tabs>
      </FormContainer>
    </div>
  );
}
