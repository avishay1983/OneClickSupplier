import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Loader2, Mail, Lock, User, ArrowRight, Eye, EyeOff, Sparkles, Shield, Zap, CheckCircle2 } from 'lucide-react';
import { z } from 'zod';

// --- סכמות Zod ---
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

// --- רכיבים חיצוניים (חובה שיהיו מחוץ ל-Auth כדי למנוע איבוד פוקוס) ---

const BrandedPanel = () => (
  <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary/90 to-primary/80 relative overflow-hidden">
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

// רכיב האינפוט - מוגדר בחוץ ומנהל את הטוגל של העין בעצמו
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
  icon: any;
  error?: string;
  dir?: string;
  showPasswordToggle?: boolean;
}) => {
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

const StyledButton = ({ children, isLoading: loading, ...props }: React.ComponentProps<typeof Button> & { isLoading?: boolean }) => (
  <Button
    {...props}
    className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground font-semibold shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5"
    disabled={loading ||