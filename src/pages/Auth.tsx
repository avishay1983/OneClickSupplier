import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// ... שאר ה-imports נשארים אותו דבר ...
import { Loader2, Mail, Lock, User, ArrowRight, Eye, EyeOff, Sparkles, Shield, Zap, CheckCircle2 } from 'lucide-react';
import { z } from 'zod';

// ... הגדרות ה-Schemas נשארות כאן ...

const features = [
  { icon: Zap, title: 'מהיר וחכם', description: 'הקמת ספק תוך 24-48 שעות במקום שבועות' },
  { icon: Shield, title: 'מאובטח לחלוטין', description: 'הזדהות דו-שלבית ואימות מסמכים' },
  { icon: Sparkles, title: 'AI מתקדם', description: 'זיהוי אוטומטי של מסמכים ונתונים' },
];

// --- העברנו את הרכיבים לכאן (מחוץ ל-Auth) ---

// Branded side panel component
const BrandedPanel = () => (
  <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary/90 to-primary/80 relative overflow-hidden">
    {/* ... תוכן הקומפוננטה ... */}
    {/* (הקוד זהה למה שכתבת, רק המיקום השתנה) */}
     <div className="absolute inset-0">
        <div className="absolute top-20 right-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-40 left-10 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-accent/20 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>
      
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
        backgroundSize: '50px 50px'
      }} />

      <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
        <div>
          <img 
            src="/images/bituach-yashir-logo.png" 
            alt="ביטוח ישיר" 
            className="h-14"
          />
        </div>

        <div className="space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold leading-tight">
              ספק בקליק
            </h1>
            <p className="text-xl text-white/80 max-w-md">
              מערכת הקמת ספקים מתקדמת המשלבת בינה מלאכותית לחוויה חלקה ומהירה
            </p>
          </div>

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

        <div className="text-white/60 text-sm">
          © 2025 ביטוח ישיר. כל הזכויות שמורות.
        </div>
      </div>
  </div>
);

// Form container
const FormContainer = ({ children, title, description }: { children: React.ReactNode; title: string; description: string }) => (
  <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 bg-gradient-to-br from-background via-background to-muted/30" dir="rtl">
    <div className="w-full max-w-md">
      <div className="lg:hidden mb-8 text-center">
        <img 
          src="/images/bituach-yashir-logo.png" 
          alt="ביטוח ישיר" 
          className="h-12 mx-auto mb-4"
        />
      </div>

      <div className="relative">
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-3xl blur-xl opacity-50" />
        
        <div className="relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-8 shadow-2xl">
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
  icon: any; // שיניתי את ה-Type כדי למנוע בעיות ייבוא, או שתשתמש ב-LucideIcon
  error?: string;
  dir?: string;
  showPasswordToggle?: boolean;
}) => {
  // צריך להעביר את ה-State של הסיסמה לתוך הקומפוננטה או לקבל אותו כ-prop
  // בגלל שזה extracted, נשתמש ב-state מקומי לטוגל של העין
  const [showPassword, setShowPassword] = useState(false);
  
  const inputType = showPasswordToggle && showPassword ? "text" : type;

  return (
    <div className="space-y-2">
      <div className="relative group">
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
          <Icon className="w-5 h-5" />
        </div>
        <Input
          id={id}
          type={inputType}
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
};

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


// --- הקומפוננטה הראשית Auth ---

export default function Auth() {
  const navigate = useNavigate();
  // ... שאר ה-State ...
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  // שימי לב: מחקנו את showPassword מה-Auth כי הוא עבר לתוך StyledInput או שצריך לנהל אותו אחרת
  // במקרה הזה StyledInput ינהל את הטוגל של עצמו באופן מקומי (כפי שתיקנתי למעלה)
  const [showUserExistsMessage, setShowUserExistsMessage] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  const [showUpdatePassword, setShowUpdatePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // ... שאר הלוגיקה וה-Effects נשארים אותו דבר בדיוק ...
  
  // (אין צורך להגדיר כאן את BrandedPanel, FormContainer, StyledInput, StyledButton)

  // ... פונקציות ה-Handle (Login, Signup וכו') נשארות אותו דבר ...

  // החלק של ה-Return נשאר זהה, הרכיבים זמינים כי הם באותו קובץ למעלה
  // ...