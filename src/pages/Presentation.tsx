import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import PptxGenJS from 'pptxgenjs';
import { downloadJudgesPdf } from '@/utils/generateJudgesPdf';
import { 
  ArrowRight, 
  ArrowLeft,
  Building2, 
  Mail, 
  FileText, 
  Shield, 
  CheckCircle, 
  Users,
  FileSignature,
  Receipt,
  Star,
  Clock,
  Upload,
  Eye,
  Send,
  UserCheck,
  Scan,
  Home,
  Download,
  Loader2,
  FileCheck,
  CreditCard,
  Link,
  PenTool,
  Workflow,
  Database,
  Bell,
  Camera,
  BookOpen,
  Target,
  Zap
} from 'lucide-react';

// Import screenshots
import screenshotNewRequestForm from '@/assets/screenshots/new-request-form.png';
import screenshotDashboardManager from '@/assets/screenshots/dashboard-manager.png';
import screenshotVendorRequestsTable from '@/assets/screenshots/vendor-requests-table.png';
import screenshotCrmQuoteDialog from '@/assets/screenshots/crm-quote-dialog.png';
import screenshotCrmQuotesMenu from '@/assets/screenshots/crm-quotes-menu.png';
import screenshotCrmQuotesDialog from '@/assets/screenshots/crm-quotes-dialog.png';
import screenshotCrmQuotesTable from '@/assets/screenshots/crm-quotes-table.png';
import screenshotCrmVendorsList from '@/assets/screenshots/crm-vendors-list.png';
import screenshotVendorActionsMenu from '@/assets/screenshots/vendor-actions-menu.png';
import screenshotVendorRequestsActions from '@/assets/screenshots/vendor-requests-actions.png';
import screenshotDigitalSignature from '@/assets/screenshots/digital-signature.png';
import screenshotQuoteApproval from '@/assets/screenshots/quote-approval.png';
import screenshotDashboardManager2 from '@/assets/screenshots/dashboard-manager-2.png';

const slides = [
  {
    id: 1,
    title: 'ספק בקליק',
    subtitle: 'מערכת הקמת ספקים חכמה',
    content: (
      <div className="flex flex-col items-center justify-center h-full space-y-8">
        <div className="text-8xl animate-bounce">🚀</div>
        <h1 className="text-5xl font-bold text-gradient-brand text-center">ספק בקליק</h1>
        <p className="text-2xl text-muted-foreground text-center max-w-2xl">
          מערכת דיגיטלית מתקדמת להקמת ספקים - מהבקשה ועד האישור הסופי
        </p>
        <div className="flex flex-wrap gap-4 mt-8 justify-center">
          <Badge variant="outline" className="text-lg px-4 py-2 border-accent text-accent">אוטומציה מלאה</Badge>
          <Badge variant="outline" className="text-lg px-4 py-2 border-brand-purple text-brand-purple">OCR חכם</Badge>
          <Badge variant="outline" className="text-lg px-4 py-2 border-brand-coral text-brand-coral">חתימות דיגיטליות</Badge>
          <Badge variant="outline" className="text-lg px-4 py-2 border-success text-success">הצעות מחיר</Badge>
        </div>
      </div>
    ),
  },
  {
    id: 2,
    title: 'מסמך דרישות מוצר (PRD)',
    subtitle: 'סקירה עסקית',
    content: (
      <div className="flex flex-col items-center justify-center h-full space-y-6" dir="rtl">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="h-12 w-12 text-primary" />
          <h3 className="text-3xl font-bold text-primary">מסמך דרישות מוצר</h3>
        </div>
        
        <div className="grid grid-cols-2 gap-6 w-full max-w-5xl">
          <Card className="p-5 border-primary/20 hover:border-primary/40 transition-colors">
            <CardContent className="p-0">
              <div className="flex items-center gap-3 mb-3">
                <Target className="h-8 w-8 text-accent" />
                <h4 className="font-bold text-lg">מטרת המערכת</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                פלטפורמה דיגיטלית מקיפה לניהול תהליך הקמת ספקים חדשים - מרגע יצירת הבקשה ועד לאישור הסופי וניהול שוטף.
              </p>
            </CardContent>
          </Card>
          
          <Card className="p-5 border-accent/20 hover:border-accent/40 transition-colors">
            <CardContent className="p-0">
              <div className="flex items-center gap-3 mb-3">
                <Users className="h-8 w-8 text-accent" />
                <h4 className="font-bold text-lg">קהל יעד</h4>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• מנהלי רכש - יצירה ואישור בקשות</li>
                <li>• סמנכ"ל - אישור וחתימה (כשנדרש)</li>
                <li>• מטפלים - ניהול יומיומי</li>
                <li>• ספקים - מילוי טפסים והגשת מסמכים</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-3 gap-4 w-full max-w-5xl">
          <Card className="p-4 border-success/20 hover:border-success/40 transition-colors">
            <CardContent className="p-0">
              <div className="flex items-center gap-2 mb-2">
                <Workflow className="h-6 w-6 text-success" />
                <h4 className="font-bold text-sm">תהליכים עסקיים</h4>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• הקמת ספק חדש</li>
                <li>• הגשת הצעות מחיר</li>
                <li>• ניהול קבלות</li>
                <li>• אישור משתמשים</li>
              </ul>
            </CardContent>
          </Card>
          
          <Card className="p-4 border-warning/20 hover:border-warning/40 transition-colors">
            <CardContent className="p-0">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-6 w-6 text-warning" />
                <h4 className="font-bold text-sm">יכולות חכמות</h4>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• זיהוי אוטומטי של מסמכים</li>
                <li>• חילוץ פרטי בנק מ-OCR</li>
                <li>• מילוי אוטומטי של שדות</li>
                <li>• התראות על אי-התאמות</li>
              </ul>
            </CardContent>
          </Card>
          
          <Card className="p-4 border-brand-purple/20 hover:border-brand-purple/40 transition-colors">
            <CardContent className="p-0">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-6 w-6 text-brand-purple" />
                <h4 className="font-bold text-sm">אבטחה</h4>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• קישורים מאובטחים עם תוקף</li>
                <li>• אימות OTP</li>
                <li>• הרשאות לפי תפקיד</li>
                <li>• תיעוד כל הפעולות</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 max-w-3xl">
          <p className="text-center text-sm text-muted-foreground">
            <strong className="text-primary">רמות אישור:</strong> המערכת תומכת באישור מנהל רכש בלבד או אישור מנהל רכש + סמנכ"ל, בהתאם לדרישות העסקה
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 3,
    title: 'סקירת התהליך',
    subtitle: 'מבט על מלמעלה',
    content: (
      <div className="flex flex-col items-center justify-center h-full space-y-6">
        <div className="grid grid-cols-6 gap-3 w-full max-w-6xl">
          {[
            { icon: Send, label: 'שליחת בקשה', color: 'bg-accent/10 text-accent' },
            { icon: FileText, label: 'מילוי פרטים', color: 'bg-success/10 text-success' },
            { icon: UserCheck, label: 'בקרה ראשונה', color: 'bg-warning/10 text-warning' },
            { icon: FileSignature, label: 'חתימות מנהלים', color: 'bg-brand-purple/10 text-brand-purple' },
            { icon: CheckCircle, label: 'אישור סופי', color: 'bg-success/10 text-success' },
            { icon: FileCheck, label: 'הצעות וקבלות', color: 'bg-accent/10 text-accent' },
          ].map((step, index) => (
            <div key={index} className="flex flex-col items-center text-center">
              <div className={`w-16 h-16 rounded-full ${step.color} flex items-center justify-center mb-2`}>
                <step.icon className="h-8 w-8" />
              </div>
              <span className="font-medium text-sm">{step.label}</span>
              {index < 5 && (
                <ArrowLeft className="h-5 w-5 text-muted-foreground mt-1" />
              )}
            </div>
          ))}
        </div>
        <div className="mt-6 p-4 bg-primary/5 rounded-xl max-w-3xl border border-primary/10">
          <p className="text-lg text-center">
            תהליך מובנה ומאובטח שמבטיח עמידה בכל דרישות הארגון והרגולציה
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 4,
    title: 'שלב 1: יצירת בקשה',
    subtitle: 'התחלת התהליך',
    content: (
      <div className="grid grid-cols-2 gap-8 h-full items-center" dir="rtl">
        <div className="space-y-6">
          <h3 className="text-3xl font-bold text-primary">יצירת בקשת ספק חדש</h3>
          <ul className="space-y-4 text-lg">
            <li className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-success flex-shrink-0" />
              <span>הזנת פרטי ספק בסיסיים (שם + אימייל)</span>
            </li>
            <li className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-success flex-shrink-0" />
              <span>בחירת סוג ספק: משרד / תביעות</span>
            </li>
            <li className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-success flex-shrink-0" />
              <span>הקצאת מטפל לבקשה</span>
            </li>
            <li className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-success flex-shrink-0" />
              <span>בחירת סוג אישור נדרש</span>
            </li>
          </ul>
          <div className="flex flex-wrap gap-2 mt-4">
            <Badge className="bg-accent/10 text-accent border-accent/20">העלאה בודדת</Badge>
            <Badge className="bg-brand-purple/10 text-brand-purple border-brand-purple/20">העלאה מאקסל</Badge>
          </div>
        </div>
        <Card className="p-6 gradient-brand-light border-primary/10">
          <CardContent className="space-y-4">
            <h4 className="font-bold text-xl mb-4 text-primary">אפשרויות אישור:</h4>
            <div className="space-y-3">
              <div className="p-4 bg-background rounded-lg border border-primary/10">
                <div className="font-medium">אישור מנהל רכש בלבד</div>
                <div className="text-sm text-muted-foreground">תהליך מהיר - חתימה אחת</div>
              </div>
              <div className="p-4 bg-background rounded-lg border border-primary/10">
                <div className="font-medium">אישור מנהל רכש + סמנכ"ל</div>
                <div className="text-sm text-muted-foreground">תהליך מלא - שתי חתימות</div>
              </div>
              <div className="p-4 bg-background rounded-lg border border-primary/10">
                <div className="font-medium">ללא צורך באישור מנהל</div>
                <div className="text-sm text-muted-foreground">אישור מיידי - מעקף תהליך</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    ),
  },
  {
    id: 5,
    title: 'שלב 2: טופס הספק',
    subtitle: 'מילוי פרטים והעלאת מסמכים',
    content: (
      <div className="grid grid-cols-2 gap-8 h-full items-center" dir="rtl">
        <div className="space-y-6">
          <h3 className="text-3xl font-bold text-primary">תהליך דו-שלבי חכם</h3>
          
          <div className="p-4 bg-accent/5 rounded-xl border border-accent/20">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold">1</div>
              <span className="font-bold text-lg">העלאת מסמכים</span>
            </div>
            <ul className="space-y-2 text-sm mr-11">
              <li>• אישור ניהול ספרים</li>
              <li>• אישור ניכוי מס במקור</li>
              <li>• אישור בנק / צ'ק</li>
              <li>• צילום חשבונית</li>
              <li>• חוזה (אם נדרש)</li>
            </ul>
          </div>

          <div className="p-4 bg-success/5 rounded-xl border border-success/20">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-success text-success-foreground flex items-center justify-center font-bold">2</div>
              <span className="font-bold text-lg">מילוי פרטים</span>
            </div>
            <ul className="space-y-2 text-sm mr-11">
              <li>• פרטי חברה (שם, ח.פ, כתובת)</li>
              <li>• אנשי קשר</li>
              <li>• פרטי בנק (ממולאים אוטומטית!)</li>
            </ul>
          </div>
        </div>

        <Card className="p-6 bg-gradient-to-br from-warning/5 to-brand-coral/5 border-warning/20">
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Scan className="h-10 w-10 text-warning" />
              <h4 className="font-bold text-2xl text-warning">OCR חכם</h4>
            </div>
            <p className="text-lg">
              המערכת סורקת את המסמכים ומחלצת אוטומטית:
            </p>
            <ul className="space-y-3">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-success" />
                <span>מספר בנק, סניף וחשבון</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-success" />
                <span>שם חברה וח.פ</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-success" />
                <span>כתובת ופרטי קשר</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-success" />
                <span>טלפון ופקס</span>
              </li>
            </ul>
            <div className="mt-4 p-3 bg-warning/10 rounded-lg border border-warning/20">
              <p className="text-sm text-warning">
                <strong>תמיכה:</strong> PDF, תמונות, Word
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    ),
  },
  {
    id: 6,
    title: 'אבטחה ואימות',
    subtitle: 'גישה מאובטחת לטופס',
    content: (
      <div className="flex flex-col items-center justify-center h-full space-y-8" dir="rtl">
        <Shield className="h-24 w-24 text-primary" />
        <h3 className="text-3xl font-bold text-center">מנגנוני אבטחה</h3>
        
        <div className="grid grid-cols-3 gap-6 w-full max-w-4xl">
          <Card className="p-6 text-center border-accent/20 hover:border-accent/40 transition-colors">
            <CardContent>
              <Mail className="h-12 w-12 mx-auto mb-4 text-accent" />
              <h4 className="font-bold text-lg mb-2">קישור מאובטח</h4>
              <p className="text-sm text-muted-foreground">
                קישור ייחודי לכל ספק עם תוקף מוגבל (3-30 ימים)
              </p>
            </CardContent>
          </Card>
          
          <Card className="p-6 text-center border-warning/20 hover:border-warning/40 transition-colors">
            <CardContent>
              <Clock className="h-12 w-12 mx-auto mb-4 text-warning" />
              <h4 className="font-bold text-lg mb-2">אימות OTP</h4>
              <p className="text-sm text-muted-foreground">
                קוד חד פעמי נשלח למייל הספק לאימות זהות
              </p>
            </CardContent>
          </Card>
          
          <Card className="p-6 text-center border-success/20 hover:border-success/40 transition-colors">
            <CardContent>
              <Bell className="h-12 w-12 mx-auto mb-4 text-success" />
              <h4 className="font-bold text-lg mb-2">תזכורת פקיעה</h4>
              <p className="text-sm text-muted-foreground">
                התראה אוטומטית 24 שעות לפני סיום תוקף הקישור
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    ),
  },
  {
    id: 7,
    title: 'שלב 3: בקרה ראשונה',
    subtitle: 'אישור המטפל',
    content: (
      <div className="grid grid-cols-2 gap-8 h-full items-center" dir="rtl">
        <div className="space-y-6">
          <h3 className="text-3xl font-bold text-primary">בקרת המטפל</h3>
          <p className="text-lg text-muted-foreground">
            לאחר שהספק משלים את הטופס, המטפל בודק את הפרטים והמסמכים
          </p>
          
          <div className="space-y-4">
            <div className="p-4 bg-success/5 rounded-xl border border-success/20">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-success" />
                <div>
                  <div className="font-bold">אישור</div>
                  <div className="text-sm text-muted-foreground">ממשיך לשלב החתימות</div>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-warning/5 rounded-xl border border-warning/20">
              <div className="flex items-center gap-3">
                <Send className="h-8 w-8 text-warning" />
                <div>
                  <div className="font-bold">שליחה מחדש</div>
                  <div className="text-sm text-muted-foreground">הספק מתבקש לתקן/להשלים</div>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-destructive/5 rounded-xl border border-destructive/20">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-destructive" />
                <div>
                  <div className="font-bold">דחייה</div>
                  <div className="text-sm text-muted-foreground">הספק מקבל הודעה ליצור קשר</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <Card className="p-6 gradient-brand-light border-primary/10">
          <CardContent className="space-y-4">
            <h4 className="font-bold text-xl text-primary">צפייה במסמכים</h4>
            <p className="text-muted-foreground">
              המטפל יכול לצפות בכל המסמכים ובפרטי הספק לפני קבלת החלטה
            </p>
            <div className="space-y-2 mt-4">
              <div className="flex items-center gap-2 p-2 bg-background rounded border border-primary/10">
                <FileText className="h-5 w-5 text-accent" />
                <span>אישור ניהול ספרים</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-background rounded border border-primary/10">
                <FileText className="h-5 w-5 text-accent" />
                <span>אישור ניכוי מס</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-background rounded border border-primary/10">
                <FileText className="h-5 w-5 text-accent" />
                <span>אישור בנק</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-background rounded border border-primary/10">
                <FileText className="h-5 w-5 text-accent" />
                <span>חשבונית לדוגמא</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    ),
  },
  {
    id: 8,
    title: 'שלב 4: חתימות מנהלים',
    subtitle: 'אישור דיגיטלי',
    content: (
      <div className="flex flex-col items-center justify-center h-full space-y-6" dir="rtl">
        <h3 className="text-3xl font-bold text-primary">תהליך החתימות</h3>
        
        <div className="flex items-center gap-8 w-full max-w-4xl justify-center">
          <Card className="p-6 w-64 text-center border-2 border-brand-purple/30 hover:border-brand-purple/60 transition-colors">
            <CardContent>
              <div className="w-16 h-16 rounded-full bg-brand-purple/10 flex items-center justify-center mx-auto mb-4">
                <FileSignature className="h-8 w-8 text-brand-purple" />
              </div>
              <h4 className="font-bold text-lg">סמנכ"ל</h4>
              <p className="text-sm text-muted-foreground mt-2">חתימה ראשונה</p>
              <Badge className="mt-3 bg-brand-purple/10 text-brand-purple border-brand-purple/20">חובה בתהליך מלא</Badge>
            </CardContent>
          </Card>
          
          <ArrowLeft className="h-10 w-10 text-muted-foreground" />
          
          <Card className="p-6 w-64 text-center border-2 border-accent/30 hover:border-accent/60 transition-colors">
            <CardContent>
              <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <FileSignature className="h-8 w-8 text-accent" />
              </div>
              <h4 className="font-bold text-lg">מנהל רכש</h4>
              <p className="text-sm text-muted-foreground mt-2">חתימה שנייה</p>
              <Badge className="mt-3 bg-accent/10 text-accent border-accent/20">חובה תמיד</Badge>
            </CardContent>
          </Card>
        </div>
        
        <div className="mt-6 p-6 bg-primary/5 rounded-xl max-w-3xl border border-primary/10">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h5 className="font-bold mb-2">✉️ התראות במייל</h5>
              <p className="text-sm text-muted-foreground">
                כל מנהל מקבל מייל עם קישור לחתימה + החוזה מצורף
              </p>
            </div>
            <div>
              <h5 className="font-bold mb-2">✍️ חתימה דיגיטלית</h5>
              <p className="text-sm text-muted-foreground">
                חתימה ידנית על משטח מגע, נשמרת ישירות על ה-PDF
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 9,
    title: 'חתימה על חוזה',
    subtitle: 'מיקום חתימה חכם',
    content: (
      <div className="grid grid-cols-2 gap-8 h-full items-center" dir="rtl">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <PenTool className="h-10 w-10 text-brand-purple" />
            <h3 className="text-3xl font-bold text-primary">חתימה חכמה על PDF</h3>
          </div>
          
          <ul className="space-y-4 text-lg">
            <li className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-success flex-shrink-0" />
              <span>צפייה במסמך PDF בתוך המערכת</span>
            </li>
            <li className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-success flex-shrink-0" />
              <span>בחירת מיקום החתימה על המסמך</span>
            </li>
            <li className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-success flex-shrink-0" />
              <span>חתימה ידנית על קנבס דיגיטלי</span>
            </li>
            <li className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-success flex-shrink-0" />
              <span>שמירת החתימה על ה-PDF המקורי</span>
            </li>
          </ul>

          <div className="p-4 bg-brand-purple/5 rounded-xl border border-brand-purple/20">
            <h5 className="font-bold mb-2 text-brand-purple">זיהוי אוטומטי AI</h5>
            <p className="text-sm text-muted-foreground">
              המערכת מזהה אוטומטית את המיקום המתאים לחתימה בחוזה באמצעות AI
            </p>
          </div>
        </div>

        <Card className="p-6 bg-gradient-to-br from-brand-purple/5 to-accent/5 border-brand-purple/20">
          <CardContent className="space-y-4">
            <h4 className="font-bold text-xl text-brand-purple">תהליך החתימה</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-background rounded-lg border border-brand-purple/10">
                <div className="w-8 h-8 rounded-full bg-brand-purple/10 flex items-center justify-center text-brand-purple font-bold">1</div>
                <span>מנהל מקבל מייל עם קישור</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-background rounded-lg border border-brand-purple/10">
                <div className="w-8 h-8 rounded-full bg-brand-purple/10 flex items-center justify-center text-brand-purple font-bold">2</div>
                <span>צפייה בחוזה במערכת</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-background rounded-lg border border-brand-purple/10">
                <div className="w-8 h-8 rounded-full bg-brand-purple/10 flex items-center justify-center text-brand-purple font-bold">3</div>
                <span>לחיצה על מיקום החתימה</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-background rounded-lg border border-brand-purple/10">
                <div className="w-8 h-8 rounded-full bg-brand-purple/10 flex items-center justify-center text-brand-purple font-bold">4</div>
                <span>חתימה ידנית ואישור</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    ),
  },
  {
    id: 10,
    title: 'שלב 5: אישור סופי',
    subtitle: 'הספק פעיל במערכת',
    content: (
      <div className="grid grid-cols-2 gap-8 h-full items-center" dir="rtl">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <CheckCircle className="h-16 w-16 text-success" />
            <h3 className="text-3xl font-bold text-success">הספק אושר!</h3>
          </div>
          
          <p className="text-lg">
            לאחר השלמת כל החתימות, הספק מועבר אוטומטית ל-CRM
          </p>
          
          <ul className="space-y-3">
            <li className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-accent" />
              <span>מייל אישור נשלח לספק</span>
            </li>
            <li className="flex items-center gap-3">
              <Receipt className="h-5 w-5 text-accent" />
              <span>קישור להעלאת קבלות</span>
            </li>
            <li className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-accent" />
              <span>הספק מופיע ב-CRM</span>
            </li>
            <li className="flex items-center gap-3">
              <FileCheck className="h-5 w-5 text-accent" />
              <span>אפשרות לשליחת הצעות מחיר</span>
            </li>
          </ul>
        </div>
        
        <Card className="p-6 bg-gradient-to-br from-success/5 to-success/10 border-success/20">
          <CardContent className="space-y-4">
            <h4 className="font-bold text-xl text-success">סטטוסי CRM</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-success/10">
                <span>פעיל</span>
                <Badge className="bg-success/10 text-success border-success/20">Active</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-brand-purple/10">
                <span>VIP</span>
                <Badge className="bg-brand-purple/10 text-brand-purple border-brand-purple/20">VIP</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-warning/10">
                <span>מושהה</span>
                <Badge className="bg-warning/10 text-warning border-warning/20">Suspended</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-destructive/10">
                <span>סגור</span>
                <Badge className="bg-destructive/10 text-destructive border-destructive/20">Closed</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-accent/10">
                <span>אושר ביטחון</span>
                <Badge className="bg-accent/10 text-accent border-accent/20">Security</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    ),
  },
  {
    id: 11,
    title: 'ניהול הצעות מחיר',
    subtitle: 'תהליך הצעות מחיר מקצה לקצה',
    content: (
      <div className="flex flex-col items-center justify-center h-full space-y-6" dir="rtl">
        <div className="flex items-center gap-3">
          <FileCheck className="h-16 w-16 text-accent" />
          <h3 className="text-3xl font-bold text-primary">מערכת הצעות מחיר</h3>
        </div>
        
        <div className="grid grid-cols-4 gap-4 w-full max-w-5xl">
          <Card className="p-4 border-accent/20 hover:border-accent/40 transition-colors">
            <CardContent className="text-center p-0">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-3">
                <Send className="h-6 w-6 text-accent" />
              </div>
              <h4 className="font-bold text-sm mb-1">שליחת בקשה</h4>
              <p className="text-xs text-muted-foreground">
                שליחת קישור לספק להגשת הצעה
              </p>
            </CardContent>
          </Card>
          
          <Card className="p-4 border-warning/20 hover:border-warning/40 transition-colors">
            <CardContent className="text-center p-0">
              <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-3">
                <Upload className="h-6 w-6 text-warning" />
              </div>
              <h4 className="font-bold text-sm mb-1">הגשת הצעה</h4>
              <p className="text-xs text-muted-foreground">
                הספק מעלה קובץ עם סכום ותיאור
              </p>
            </CardContent>
          </Card>
          
          <Card className="p-4 border-brand-purple/20 hover:border-brand-purple/40 transition-colors">
            <CardContent className="text-center p-0">
              <div className="w-12 h-12 rounded-full bg-brand-purple/10 flex items-center justify-center mx-auto mb-3">
                <UserCheck className="h-6 w-6 text-brand-purple" />
              </div>
              <h4 className="font-bold text-sm mb-1">אישור מנהלים</h4>
              <p className="text-xs text-muted-foreground">
                מטפל → מנהל רכש → סמנכ"ל
              </p>
            </CardContent>
          </Card>
          
          <Card className="p-4 border-success/20 hover:border-success/40 transition-colors">
            <CardContent className="text-center p-0">
              <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3">
                <FileSignature className="h-6 w-6 text-success" />
              </div>
              <h4 className="font-bold text-sm mb-1">חתימה</h4>
              <p className="text-xs text-muted-foreground">
                חתימה דיגיטלית על ההצעה
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-2 gap-6 w-full max-w-4xl mt-4">
          <div className="p-4 bg-accent/5 rounded-xl border border-accent/20">
            <h5 className="font-bold mb-2 text-accent">✉️ התראות אוטומטיות</h5>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• מייל לספק עם קישור להגשה</li>
              <li>• מייל למנהלים לאישור</li>
              <li>• עדכון לספק על סטטוס ההצעה</li>
            </ul>
          </div>
          <div className="p-4 bg-success/5 rounded-xl border border-success/20">
            <h5 className="font-bold mb-2 text-success">📊 מעקב וסטטוסים</h5>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• ממתין להגשה / הוגש</li>
              <li>• ממתין לאישור מטפל / מנהל / סמנכ"ל</li>
              <li>• מאושר / נדחה</li>
            </ul>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 12,
    title: 'ניהול קבלות',
    subtitle: 'מעקב אחר הוצאות',
    content: (
      <div className="flex flex-col items-center justify-center h-full space-y-8" dir="rtl">
        <Receipt className="h-20 w-20 text-primary" />
        <h3 className="text-3xl font-bold">מערכת קבלות</h3>
        
        <div className="grid grid-cols-4 gap-4 w-full max-w-5xl">
          <Card className="p-4 border-accent/20 hover:border-accent/40 transition-colors">
            <CardContent className="text-center p-0">
              <Link className="h-10 w-10 mx-auto mb-3 text-accent" />
              <h4 className="font-bold text-sm mb-1">שליחת קישור</h4>
              <p className="text-xs text-muted-foreground">
                שליחת קישור לספק מה-CRM
              </p>
            </CardContent>
          </Card>
          
          <Card className="p-4 border-warning/20 hover:border-warning/40 transition-colors">
            <CardContent className="text-center p-0">
              <Upload className="h-10 w-10 mx-auto mb-3 text-warning" />
              <h4 className="font-bold text-sm mb-1">העלאה</h4>
              <p className="text-xs text-muted-foreground">
                הספק מעלה קבלות דרך קישור מאובטח
              </p>
            </CardContent>
          </Card>
          
          <Card className="p-4 border-brand-purple/20 hover:border-brand-purple/40 transition-colors">
            <CardContent className="text-center p-0">
              <Eye className="h-10 w-10 mx-auto mb-3 text-brand-purple" />
              <h4 className="font-bold text-sm mb-1">בדיקה</h4>
              <p className="text-xs text-muted-foreground">
                המטפל בודק ומאשר/דוחה כל קבלה
              </p>
            </CardContent>
          </Card>
          
          <Card className="p-4 border-success/20 hover:border-success/40 transition-colors">
            <CardContent className="text-center p-0">
              <Star className="h-10 w-10 mx-auto mb-3 text-success" />
              <h4 className="font-bold text-sm mb-1">דירוג</h4>
              <p className="text-xs text-muted-foreground">
                דירוג ספקים לפי ביצועים
              </p>
            </CardContent>
          </Card>
        </div>
        
        <div className="p-4 bg-primary/5 rounded-xl max-w-3xl border border-primary/10">
          <p className="text-center text-muted-foreground">
            כל קבלה כוללת: סכום, תאריך, תיאור, וסטטוס (ממתין / מאושר / נדחה)
          </p>
        </div>

        <div className="p-4 bg-accent/5 rounded-xl max-w-3xl border border-accent/20">
          <h5 className="font-bold mb-2 text-accent text-center">🔗 שליחת קישור קבלות מה-CRM</h5>
          <p className="text-sm text-muted-foreground text-center">
            לחיצה על "שלח קישור להעלאת קבלות" בתפריט הפעולות של הספק ב-CRM
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 13,
    title: 'מערכת CRM',
    subtitle: 'ניהול ספקים מאושרים',
    content: (
      <div className="grid grid-cols-2 gap-8 h-full items-center" dir="rtl">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Database className="h-10 w-10 text-primary" />
            <h3 className="text-3xl font-bold text-primary">מערכת CRM מתקדמת</h3>
          </div>
          
          <ul className="space-y-4 text-lg">
            <li className="flex items-center gap-3">
              <Building2 className="h-6 w-6 text-accent flex-shrink-0" />
              <span>רשימת כל הספקים המאושרים</span>
            </li>
            <li className="flex items-center gap-3">
              <FileCheck className="h-6 w-6 text-accent flex-shrink-0" />
              <span>ניהול הצעות מחיר</span>
            </li>
            <li className="flex items-center gap-3">
              <Receipt className="h-6 w-6 text-accent flex-shrink-0" />
              <span>ניהול קבלות</span>
            </li>
            <li className="flex items-center gap-3">
              <Star className="h-6 w-6 text-accent flex-shrink-0" />
              <span>דירוג ספקים</span>
            </li>
            <li className="flex items-center gap-3">
              <Send className="h-6 w-6 text-accent flex-shrink-0" />
              <span>שליחת קישורים לספקים</span>
            </li>
          </ul>
        </div>

        <Card className="p-6 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
          <CardContent className="space-y-4">
            <h4 className="font-bold text-xl text-primary">פעולות ב-CRM</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-background rounded-lg border border-primary/10">
                <Eye className="h-5 w-5 text-accent" />
                <span>צפייה בפרטי ספק</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-background rounded-lg border border-primary/10">
                <FileCheck className="h-5 w-5 text-accent" />
                <span>שליחת בקשה להצעת מחיר</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-background rounded-lg border border-primary/10">
                <Link className="h-5 w-5 text-accent" />
                <span>שליחת קישור להעלאת קבלות</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-background rounded-lg border border-primary/10">
                <Star className="h-5 w-5 text-warning" />
                <span>דירוג ספק</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-background rounded-lg border border-primary/10">
                <Workflow className="h-5 w-5 text-brand-purple" />
                <span>שינוי סטטוס (VIP, מושהה וכו')</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    ),
  },
  {
    id: 14,
    title: 'צילומי מסך מהמערכת',
    subtitle: 'תמונות מהמערכת בפעולה',
    content: (
      <div className="flex flex-col items-center justify-center h-full space-y-4" dir="rtl">
        <div className="flex items-center gap-3 mb-2">
          <Camera className="h-10 w-10 text-accent" />
          <h3 className="text-3xl font-bold text-primary">צילומי מסך מהמערכת</h3>
        </div>
        
        <div className="grid grid-cols-3 gap-4 w-full max-w-6xl">
          <div className="space-y-2">
            <img 
              src={screenshotNewRequestForm} 
              alt="טופס בקשה חדשה" 
              className="w-full h-40 object-cover object-top rounded-lg border border-primary/20 shadow-md hover:scale-105 transition-transform cursor-pointer"
            />
            <p className="text-xs text-center text-muted-foreground">טופס בקשה חדשה</p>
          </div>
          
          <div className="space-y-2">
            <img 
              src={screenshotDashboardManager} 
              alt="דשבורד מנהל" 
              className="w-full h-40 object-cover object-top rounded-lg border border-primary/20 shadow-md hover:scale-105 transition-transform cursor-pointer"
            />
            <p className="text-xs text-center text-muted-foreground">דשבורד מנהל - חתימות</p>
          </div>
          
          <div className="space-y-2">
            <img 
              src={screenshotVendorRequestsTable} 
              alt="טבלת בקשות ספקים" 
              className="w-full h-40 object-cover object-top rounded-lg border border-primary/20 shadow-md hover:scale-105 transition-transform cursor-pointer"
            />
            <p className="text-xs text-center text-muted-foreground">טבלת בקשות ספקים</p>
          </div>
          
          <div className="space-y-2">
            <img 
              src={screenshotCrmVendorsList} 
              alt="רשימת ספקים CRM" 
              className="w-full h-40 object-cover object-top rounded-lg border border-primary/20 shadow-md hover:scale-105 transition-transform cursor-pointer"
            />
            <p className="text-xs text-center text-muted-foreground">מערכת CRM - רשימת ספקים</p>
          </div>
          
          <div className="space-y-2">
            <img 
              src={screenshotCrmQuotesTable} 
              alt="הצעות מחיר" 
              className="w-full h-40 object-cover object-top rounded-lg border border-primary/20 shadow-md hover:scale-105 transition-transform cursor-pointer"
            />
            <p className="text-xs text-center text-muted-foreground">ניהול הצעות מחיר</p>
          </div>
          
          <div className="space-y-2">
            <img 
              src={screenshotVendorActionsMenu} 
              alt="תפריט פעולות" 
              className="w-full h-40 object-cover object-top rounded-lg border border-primary/20 shadow-md hover:scale-105 transition-transform cursor-pointer"
            />
            <p className="text-xs text-center text-muted-foreground">תפריט פעולות ספק</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 15,
    title: 'צילומי מסך נוספים',
    subtitle: 'עוד תמונות מהמערכת',
    content: (
      <div className="flex flex-col items-center justify-center h-full space-y-4" dir="rtl">
        <div className="flex items-center gap-3 mb-2">
          <Camera className="h-10 w-10 text-brand-purple" />
          <h3 className="text-3xl font-bold text-primary">צילומי מסך נוספים</h3>
        </div>
        
        <div className="grid grid-cols-2 gap-6 w-full max-w-4xl">
          <div className="space-y-2">
            <img 
              src={screenshotCrmQuoteDialog} 
              alt="דיאלוג הצעת מחיר" 
              className="w-full h-56 object-cover object-top rounded-lg border border-primary/20 shadow-md hover:scale-105 transition-transform cursor-pointer"
            />
            <p className="text-sm text-center text-muted-foreground">שליחת בקשה להצעת מחיר</p>
          </div>
          
          <div className="space-y-2">
            <img 
              src={screenshotCrmQuotesDialog} 
              alt="דיאלוג בחירת ספק" 
              className="w-full h-56 object-cover object-top rounded-lg border border-primary/20 shadow-md hover:scale-105 transition-transform cursor-pointer"
            />
            <p className="text-sm text-center text-muted-foreground">בחירת ספק להצעת מחיר</p>
          </div>
          
          <div className="space-y-2">
            <img 
              src={screenshotCrmQuotesMenu} 
              alt="תפריט הצעות מחיר" 
              className="w-full h-56 object-cover object-top rounded-lg border border-primary/20 shadow-md hover:scale-105 transition-transform cursor-pointer"
            />
            <p className="text-sm text-center text-muted-foreground">תפריט פעולות - הצעות מחיר</p>
          </div>
          
          <div className="space-y-2">
            <img 
              src={screenshotVendorRequestsActions} 
              alt="פעולות בקשות" 
              className="w-full h-56 object-cover object-top rounded-lg border border-primary/20 shadow-md hover:scale-105 transition-transform cursor-pointer"
            />
            <p className="text-sm text-center text-muted-foreground">פעולות על בקשת ספק</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 16,
    title: 'חתימות דיגיטליות',
    subtitle: 'תהליך החתימה על הצעות מחיר',
    content: (
      <div className="flex flex-col items-center justify-center h-full space-y-4" dir="rtl">
        <div className="flex items-center gap-3 mb-2">
          <FileSignature className="h-10 w-10 text-brand-purple" />
          <h3 className="text-3xl font-bold text-primary">חתימות דיגיטליות</h3>
        </div>
        
        <div className="grid grid-cols-3 gap-6 w-full max-w-6xl">
          <div className="space-y-2">
            <img 
              src={screenshotQuoteApproval} 
              alt="אישור הצעת מחיר" 
              className="w-full h-64 object-cover object-top rounded-lg border border-primary/20 shadow-md hover:scale-105 transition-transform cursor-pointer"
            />
            <p className="text-sm text-center text-muted-foreground">מסך אישור הצעת מחיר</p>
          </div>
          
          <div className="space-y-2">
            <img 
              src={screenshotDigitalSignature} 
              alt="חתימה דיגיטלית" 
              className="w-full h-64 object-cover object-top rounded-lg border border-primary/20 shadow-md hover:scale-105 transition-transform cursor-pointer"
            />
            <p className="text-sm text-center text-muted-foreground">חתימה דיגיטלית על הצעה</p>
          </div>
          
          <div className="space-y-2">
            <img 
              src={screenshotDashboardManager2} 
              alt="דשבורד מנהל" 
              className="w-full h-64 object-cover object-top rounded-lg border border-primary/20 shadow-md hover:scale-105 transition-transform cursor-pointer"
            />
            <p className="text-sm text-center text-muted-foreground">דשבורד סמנכ"ל - הצעות לחתימה</p>
          </div>
        </div>
        
        <div className="p-4 bg-brand-purple/5 rounded-xl border border-brand-purple/20 max-w-3xl mt-4">
          <p className="text-center text-muted-foreground">
            <strong className="text-brand-purple">חתימה דיגיטלית מאובטחת</strong> - המנהלים חותמים ישירות על המסמך ב-PDF
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 17,
    title: 'סיכום',
    subtitle: 'יתרונות המערכת',
    content: (
      <div className="flex flex-col items-center justify-center h-full space-y-6" dir="rtl">
        <h3 className="text-4xl font-bold text-gradient-brand text-center">למה ספק בקליק?</h3>
        
        <div className="grid grid-cols-3 gap-4 w-full max-w-5xl">
          <div className="p-4 bg-accent/5 rounded-xl border border-accent/20">
            <div className="flex items-center gap-3 mb-3">
              <Clock className="h-8 w-8 text-accent" />
              <span className="font-bold text-lg">חיסכון בזמן</span>
            </div>
            <p className="text-sm text-muted-foreground">
              תהליך אוטומטי שמחליף טפסים ידניים
            </p>
          </div>
          
          <div className="p-4 bg-success/5 rounded-xl border border-success/20">
            <div className="flex items-center gap-3 mb-3">
              <Shield className="h-8 w-8 text-success" />
              <span className="font-bold text-lg">אבטחה מלאה</span>
            </div>
            <p className="text-sm text-muted-foreground">
              קישורים מוגני זמן, אימות OTP
            </p>
          </div>
          
          <div className="p-4 bg-brand-purple/5 rounded-xl border border-brand-purple/20">
            <div className="flex items-center gap-3 mb-3">
              <Scan className="h-8 w-8 text-brand-purple" />
              <span className="font-bold text-lg">OCR חכם</span>
            </div>
            <p className="text-sm text-muted-foreground">
              חילוץ אוטומטי של נתונים ממסמכים
            </p>
          </div>
          
          <div className="p-4 bg-warning/5 rounded-xl border border-warning/20">
            <div className="flex items-center gap-3 mb-3">
              <FileSignature className="h-8 w-8 text-warning" />
              <span className="font-bold text-lg">חתימות דיגיטליות</span>
            </div>
            <p className="text-sm text-muted-foreground">
              חתימה על חוזים והצעות מחיר
            </p>
          </div>
          
          <div className="p-4 bg-accent/5 rounded-xl border border-accent/20">
            <div className="flex items-center gap-3 mb-3">
              <FileCheck className="h-8 w-8 text-accent" />
              <span className="font-bold text-lg">הצעות מחיר</span>
            </div>
            <p className="text-sm text-muted-foreground">
              ניהול מלא של הצעות מחיר
            </p>
          </div>
          
          <div className="p-4 bg-success/5 rounded-xl border border-success/20">
            <div className="flex items-center gap-3 mb-3">
              <Receipt className="h-8 w-8 text-success" />
              <span className="font-bold text-lg">ניהול קבלות</span>
            </div>
            <p className="text-sm text-muted-foreground">
              מעקב ואישור קבלות מספקים
            </p>
          </div>
        </div>
        
        <div className="mt-6">
          <Badge className="text-xl px-6 py-3 gradient-brand text-primary-foreground border-0">
            ביטוח ישיר - ספק בקליק 🚀
          </Badge>
        </div>
      </div>
    ),
  },
];

const Presentation = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const navigate = useNavigate();
  const slideRef = useRef<HTMLDivElement>(null);

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') prevSlide();
    if (e.key === 'ArrowLeft') nextSlide();
  };

  const downloadPDF = async () => {
    if (!slideRef.current) return;
    
    setIsDownloading(true);
    const originalSlide = currentSlide;
    
    try {
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < slides.length; i++) {
        setCurrentSlide(i);
        await new Promise(resolve => setTimeout(resolve, 300));

        const canvas = await html2canvas(slideRef.current, {
          scale: 0.8,
          useCORS: true,
          backgroundColor: '#ffffff',
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.4);
        
        if (i > 0) {
          pdf.addPage();
        }
        
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      }

      pdf.save('ספק-בקליק-מצגת.pdf');
      
      toast({
        title: 'הורדה הושלמה',
        description: 'המצגת הורדה בהצלחה כקובץ PDF',
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן להוריד את המצגת',
        variant: 'destructive',
      });
    } finally {
      setCurrentSlide(originalSlide);
      setIsDownloading(false);
    }
  };

  const downloadPPTX = async () => {
    if (!slideRef.current) return;
    
    setIsDownloading(true);
    const originalSlide = currentSlide;
    
    try {
      const pptx = new PptxGenJS();
      pptx.layout = 'LAYOUT_WIDE';
      pptx.title = 'ספק בקליק - מצגת';
      pptx.author = 'ביטוח ישיר';

      for (let i = 0; i < slides.length; i++) {
        setCurrentSlide(i);
        await new Promise(resolve => setTimeout(resolve, 300));

        const canvas = await html2canvas(slideRef.current, {
          scale: 1.5,
          useCORS: true,
          backgroundColor: '#ffffff',
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.7);
        
        const slide = pptx.addSlide();
        slide.addImage({
          data: imgData,
          x: 0,
          y: 0,
          w: '100%',
          h: '100%',
        });
      }

      await pptx.writeFile({ fileName: 'ספק-בקליק-מצגת.pptx' });
      
      toast({
        title: 'הורדה הושלמה',
        description: 'המצגת הורדה בהצלחה כקובץ PowerPoint',
      });
    } catch (error) {
      console.error('Error generating PPTX:', error);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן להוריד את המצגת',
        variant: 'destructive',
      });
    } finally {
      setCurrentSlide(originalSlide);
      setIsDownloading(false);
    }
  };

  return (
    <div 
      className="min-h-screen bg-background flex flex-col"
      onKeyDown={(e) => handleKeyDown(e as unknown as KeyboardEvent)}
      tabIndex={0}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-primary/10 bg-primary/5">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="hover:bg-primary/10">
          <Home className="h-4 w-4 ml-2" />
          חזרה לדף הבית
        </Button>
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={downloadPDF}
            disabled={isDownloading}
            className="border-accent/30 hover:border-accent hover:bg-accent/10"
          >
            {isDownloading ? (
              <>
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                מייצר...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 ml-2" />
                PDF
              </>
            )}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={downloadJudgesPdf}
            className="border-green-500/30 hover:border-green-500 hover:bg-green-500/10"
          >
            <FileText className="h-4 w-4 ml-2" />
            תשובות לשופטים
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={downloadPPTX}
            disabled={isDownloading}
            className="border-brand-purple/30 hover:border-brand-purple hover:bg-brand-purple/10"
          >
            {isDownloading ? (
              <>
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                מייצר...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 ml-2" />
                PowerPoint
              </>
            )}
          </Button>
          <span className="text-sm text-muted-foreground">
            {currentSlide + 1} / {slides.length}
          </span>
        </div>
        <div className="text-sm font-medium text-primary">{slides[currentSlide].title}</div>
      </div>

      {/* Slide Content */}
      <div className="flex-1 p-8 overflow-auto" ref={slideRef}>
        <div className="max-w-6xl mx-auto h-full">
          {slides[currentSlide].content}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between p-4 border-t border-primary/10 bg-primary/5">
        <Button
          variant="outline"
          onClick={prevSlide}
          disabled={currentSlide === 0}
          className="border-primary/20 hover:border-primary hover:bg-primary/10"
        >
          <ArrowRight className="h-4 w-4 ml-2" />
          הקודם
        </Button>

        {/* Slide indicators */}
        <div className="flex gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-3 h-3 rounded-full transition-all ${
                index === currentSlide 
                  ? 'bg-accent w-8' 
                  : 'bg-primary/20 hover:bg-primary/40'
              }`}
            />
          ))}
        </div>

        <Button
          variant="outline"
          onClick={nextSlide}
          disabled={currentSlide === slides.length - 1}
          className="border-primary/20 hover:border-primary hover:bg-primary/10"
        >
          הבא
          <ArrowLeft className="h-4 w-4 mr-2" />
        </Button>
      </div>
    </div>
  );
};

export default Presentation;
