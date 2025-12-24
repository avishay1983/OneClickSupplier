import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Loader2, Mail, Lock, User, ArrowRight, Eye, EyeOff, Sparkles, Shield, Zap, LucideIcon } from 'lucide-react';
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

// Floating orb component for background - defined OUTSIDE Auth component
const FloatingOrb = ({ className, delay = 0 }: { className?: string; delay?: number }) => (
  <div 
    className={`absolute rounded-full blur-3xl opacity-30 animate-pulse ${className}`}
    style={{ animationDelay: `${delay}s`, animationDuration: '4s' }}
  />
);

// Glass card component - defined OUTSIDE Auth component
const GlassCard = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl ${className}`}>
    {children}
  </div>
);

// Feature item for side panel - defined OUTSIDE Auth component
const FeatureItem = ({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) => (
  <div className="flex items-start gap-4 group">
    <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20 group-hover:bg-white/20 transition-all duration-300">
      <Icon className="w-6 h-6 text-white" />
    </div>
    <div>
      <h3 className="font-semibold text-white text-lg mb-1">{title}</h3>
      <p className="text-white/70 text-sm leading-relaxed">{description}</p>
    </div>
  </div>
);

// Shared background component - defined OUTSIDE Auth component
const AuthBackground = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen relative overflow-hidden" dir="rtl">
    {/* Animated gradient background */}
    <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-accent" />
    
    {/* Animated mesh gradient overlay */}
    <div className="absolute inset-0 opacity-50">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-accent/40 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-brand-magenta/30 via-transparent to-transparent" />
    </div>
    
    {/* Floating orbs */}
    <FloatingOrb className="w-96 h-96 bg-accent -top-20 -right-20" delay={0} />
    <FloatingOrb className="w-72 h-72 bg-brand-pink top-1/3 -left-10" delay={1} />
    <FloatingOrb className="w-64 h-64 bg-brand-magenta bottom-10 right-1/4" delay={2} />
    <FloatingOrb className="w-48 h-48 bg-accent/50 top-1/2 right-1/3" delay={1.5} />
    
    {/* Grid pattern overlay */}
    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0wIDBoNjB2NjBIMHoiLz48cGF0aCBkPSJNMzAgMzBtLTEgMGExIDEgMCAxIDAgMiAwYTEgMSAwIDEgMCAtMiAwIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiLz48L2c+PC9zdmc+')] opacity-40" />
    
    {/* Content container */}
    <div className="relative z-10 min-h-screen flex">
      {children}
    </div>
  </div>
);

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

  // Update password form
  if (showUpdatePassword) {
    return (
      <AuthBackground>
        <div className="flex-1 flex items-center justify-center p-6">
          <GlassCard className="w-full max-w-md p-8">
            <div className="text-center mb-8">
              <div className="mx-auto mb-6 w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
                <Lock className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">עדכון סיסמה</h1>
              <p className="text-white/70">הזן את הסיסמה החדשה שלך</p>
            </div>
            
            <form onSubmit={handleUpdatePassword} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-white/90 font-medium">סיסמה חדשה</Label>
                <div className="relative">
                  <Lock className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/50" />
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="h-12 pr-12 pl-12 bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-xl focus:bg-white/15 focus:border-white/40 transition-all"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.newPassword && <p className="text-sm text-red-300">{errors.newPassword}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-white/90 font-medium">אימות סיסמה</Label>
                <div className="relative">
                  <Lock className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/50" />
                  <Input
                    id="confirm-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-12 pr-12 pl-12 bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-xl focus:bg-white/15 focus:border-white/40 transition-all"
                    dir="ltr"
                  />
                </div>
                {errors.confirmPassword && <p className="text-sm text-red-300">{errors.confirmPassword}</p>}
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 bg-white text-primary hover:bg-white/90 rounded-xl font-semibold text-lg shadow-lg shadow-black/20 transition-all duration-300" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                    מעדכן...
                  </>
                ) : (
                  'עדכן סיסמה'
                )}
              </Button>
            </form>
          </GlassCard>
        </div>
      </AuthBackground>
    );
  }

  // Reset password form
  if (showResetPassword) {
    return (
      <AuthBackground>
        <div className="flex-1 flex items-center justify-center p-6">
          <GlassCard className="w-full max-w-md p-8">
            <div className="text-center mb-8">
              <div className="mx-auto mb-6 w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
                <Mail className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">איפוס סיסמה</h1>
              <p className="text-white/70">
                {resetEmailSent 
                  ? 'בדוק את האימייל שלך להוראות איפוס הסיסמה'
                  : 'הזן את כתובת האימייל שלך לקבלת הוראות איפוס'
                }
              </p>
            </div>
            
            {resetEmailSent ? (
              <div className="space-y-4">
                <div className="text-center py-6">
                  <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4 border border-green-400/30">
                    <Mail className="h-8 w-8 text-green-400" />
                  </div>
                  <p className="text-white/70">
                    שלחנו לך מייל עם הוראות לאיפוס הסיסמה.
                    <br />
                    בדוק גם בתיקיית הספאם.
                  </p>
                </div>
                <Button 
                  className="w-full h-12 bg-white text-primary hover:bg-white/90 rounded-xl font-semibold shadow-lg shadow-black/20"
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
                      <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                      שולח...
                    </>
                  ) : (
                    'שלח שוב'
                  )}
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full h-12 text-white hover:bg-white/10 rounded-xl gap-2"
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
                <div className="space-y-2">
                  <Label htmlFor="reset-email" className="text-white/90 font-medium">אימייל</Label>
                  <div className="relative">
                    <Mail className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/50" />
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12 pr-12 bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-xl focus:bg-white/15 focus:border-white/40 transition-all"
                      dir="ltr"
                    />
                  </div>
                  {errors.email && <p className="text-sm text-red-300">{errors.email}</p>}
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full h-12 bg-white text-primary hover:bg-white/90 rounded-xl font-semibold text-lg shadow-lg shadow-black/20" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                      שולח...
                    </>
                  ) : (
                    'שלח הוראות איפוס'
                  )}
                </Button>
                
                <Button 
                  type="button"
                  variant="ghost" 
                  className="w-full h-12 text-white hover:bg-white/10 rounded-xl gap-2"
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
          </GlassCard>
        </div>
      </AuthBackground>
    );
  }

  return (
    <AuthBackground>
      {/* Left side - Features panel (hidden on mobile) */}
      <div className="hidden lg:flex flex-1 flex-col justify-center p-12 xl:p-20">
        <div className="max-w-lg">
          <div className="mb-12">
            <img 
              src="/images/bituach-yashir-logo.png" 
              alt="ביטוח ישיר" 
              className="h-14 mb-8 [&]:mix-blend-multiply dark:[&]:mix-blend-screen"
              style={{ backgroundColor: 'transparent' }}
            />
            <h1 className="text-4xl xl:text-5xl font-bold text-white mb-4 leading-tight">
              ספק בקליק
            </h1>
            <p className="text-xl text-white/80 leading-relaxed">
              מערכת הקמת ספקים דיגיטלית חכמה - מהפכה בתהליך קליטת הספקים
            </p>
          </div>
          
          <div className="space-y-8">
            <FeatureItem 
              icon={Zap}
              title="מהיר וחכם"
              description="AI מתקדם לזיהוי אוטומטי של מסמכים וחילוץ נתונים - חוסך 90% מהזמן"
            />
            <FeatureItem 
              icon={Shield}
              title="מאובטח לחלוטין"
              description="אימות OTP, הצפנה מקצה לקצה וחתימות דיגיטליות מאושרות"
            />
            <FeatureItem 
              icon={Sparkles}
              title="חווית משתמש מושלמת"
              description="ממשק אינטואיטיבי שמנחה את הספק צעד אחר צעד"
            />
          </div>
        </div>
      </div>

      {/* Right side - Auth form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <GlassCard className="w-full max-w-md p-8">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <img 
              src="/images/bituach-yashir-logo.png" 
              alt="ביטוח ישיר" 
              className="h-10 mx-auto mb-4 [&]:mix-blend-multiply dark:[&]:mix-blend-screen"
              style={{ backgroundColor: 'transparent' }}
            />
            <h2 className="text-2xl font-bold text-white">ספק בקליק</h2>
          </div>

          <div className="text-center mb-8 hidden lg:block">
            <h2 className="text-2xl font-bold text-white mb-2">ברוכים הבאים</h2>
            <p className="text-white/70">התחבר או הירשם כדי להמשיך</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-white/10 p-1 rounded-xl mb-6">
              <TabsTrigger 
                value="login" 
                className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-primary text-white/70 transition-all duration-300"
              >
                התחברות
              </TabsTrigger>
              <TabsTrigger 
                value="signup"
                className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-primary text-white/70 transition-all duration-300"
              >
                הרשמה
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="mt-0">
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-white/90 font-medium">אימייל</Label>
                  <div className="relative">
                    <Mail className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/50" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12 pr-12 bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-xl focus:bg-white/15 focus:border-white/40 transition-all"
                      dir="ltr"
                    />
                  </div>
                  {errors.email && <p className="text-sm text-red-300">{errors.email}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-white/90 font-medium">סיסמה</Label>
                  <div className="relative">
                    <Lock className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/50" />
                    <Input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 pr-12 pl-12 bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-xl focus:bg-white/15 focus:border-white/40 transition-all"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-sm text-red-300">{errors.password}</p>}
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full h-12 bg-white text-primary hover:bg-white/90 rounded-xl font-semibold text-lg shadow-lg shadow-black/20 transition-all duration-300" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                      מתחבר...
                    </>
                  ) : (
                    'התחבר'
                  )}
                </Button>
                
                <Button 
                  type="button"
                  variant="ghost" 
                  className="w-full text-white/70 hover:text-white hover:bg-white/5 text-sm"
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
                <div className="space-y-4 py-4">
                  <div className="text-center">
                    <div className="mx-auto w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mb-4 border border-amber-400/30">
                      <User className="h-8 w-8 text-amber-400" />
                    </div>
                    <h3 className="font-semibold text-lg text-white mb-2">המשתמש כבר קיים במערכת</h3>
                    <p className="text-white/70 text-sm mb-4">
                      כתובת האימייל {email} כבר רשומה במערכת.
                      <br />
                      ניתן להתחבר או לאפס את הסיסמה.
                    </p>
                  </div>
                  <div className="flex flex-col gap-3">
                    <Button 
                      className="w-full h-12 bg-white text-primary hover:bg-white/90 rounded-xl font-semibold shadow-lg shadow-black/20"
                      onClick={() => {
                        setShowUserExistsMessage(false);
                        setActiveTab('login');
                      }}
                    >
                      עבור להתחברות
                    </Button>
                    <Button 
                      variant="ghost"
                      className="w-full h-12 text-white border border-white/20 hover:bg-white/10 rounded-xl"
                      onClick={() => {
                        setShowUserExistsMessage(false);
                        setShowResetPassword(true);
                      }}
                    >
                      שכחתי סיסמה
                    </Button>
                    <Button 
                      variant="ghost"
                      className="w-full text-white/70 hover:text-white hover:bg-white/5 text-sm"
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
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="text-white/90 font-medium">שם מלא</Label>
                    <div className="relative">
                      <User className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/50" />
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="ישראל ישראלי"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="h-12 pr-12 bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-xl focus:bg-white/15 focus:border-white/40 transition-all"
                      />
                    </div>
                    {errors.fullName && <p className="text-sm text-red-300">{errors.fullName}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-white/90 font-medium">אימייל</Label>
                    <div className="relative">
                      <Mail className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/50" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-12 pr-12 bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-xl focus:bg-white/15 focus:border-white/40 transition-all"
                        dir="ltr"
                      />
                    </div>
                    {errors.email && <p className="text-sm text-red-300">{errors.email}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-white/90 font-medium">סיסמה</Label>
                    <div className="relative">
                      <Lock className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/50" />
                      <Input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-12 pr-12 pl-12 bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-xl focus:bg-white/15 focus:border-white/40 transition-all"
                        dir="ltr"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {errors.password && <p className="text-sm text-red-300">{errors.password}</p>}
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-white text-primary hover:bg-white/90 rounded-xl font-semibold text-lg shadow-lg shadow-black/20 transition-all duration-300" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="ml-2 h-5 w-5 animate-spin" />
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

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <p className="text-white/50 text-sm">
              © 2024 ביטוח ישיר. כל הזכויות שמורות.
            </p>
          </div>
        </GlassCard>
      </div>
    </AuthBackground>
  );
}
