import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import PptxGenJS from 'pptxgenjs';
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
  Loader2
} from 'lucide-react';

const slides = [
  {
    id: 1,
    title: 'ספק בקליק',
    subtitle: 'מערכת הקמת ספקים חכמה',
    content: (
      <div className="flex flex-col items-center justify-center h-full space-y-8">
        <div className="text-8xl animate-bounce">🚀</div>
        <h1 className="text-5xl font-bold text-primary text-center">ספק בקליק</h1>
        <p className="text-2xl text-muted-foreground text-center max-w-2xl">
          מערכת דיגיטלית מתקדמת להקמת ספקים - מהבקשה ועד האישור הסופי
        </p>
        <div className="flex gap-4 mt-8">
          <Badge variant="outline" className="text-lg px-4 py-2">אוטומציה מלאה</Badge>
          <Badge variant="outline" className="text-lg px-4 py-2">OCR חכם</Badge>
          <Badge variant="outline" className="text-lg px-4 py-2">חתימות דיגיטליות</Badge>
        </div>
      </div>
    ),
  },
  {
    id: 2,
    title: 'סקירת התהליך',
    subtitle: 'מבט על מלמעלה',
    content: (
      <div className="flex flex-col items-center justify-center h-full space-y-6">
        <div className="grid grid-cols-5 gap-4 w-full max-w-5xl">
          {[
            { icon: Send, label: 'שליחת בקשה', color: 'bg-blue-100 text-blue-600' },
            { icon: FileText, label: 'מילוי פרטים', color: 'bg-green-100 text-green-600' },
            { icon: UserCheck, label: 'בקרה ראשונה', color: 'bg-yellow-100 text-yellow-600' },
            { icon: FileSignature, label: 'חתימות מנהלים', color: 'bg-purple-100 text-purple-600' },
            { icon: CheckCircle, label: 'אישור סופי', color: 'bg-emerald-100 text-emerald-600' },
          ].map((step, index) => (
            <div key={index} className="flex flex-col items-center text-center">
              <div className={`w-20 h-20 rounded-full ${step.color} flex items-center justify-center mb-3`}>
                <step.icon className="h-10 w-10" />
              </div>
              <span className="font-medium text-lg">{step.label}</span>
              {index < 4 && (
                <ArrowLeft className="h-6 w-6 text-muted-foreground mt-2 rotate-180" />
              )}
            </div>
          ))}
        </div>
        <div className="mt-8 p-6 bg-muted/50 rounded-xl max-w-3xl">
          <p className="text-lg text-center">
            תהליך מובנה ומאובטח שמבטיח עמידה בכל דרישות הארגון והרגולציה
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 3,
    title: 'שלב 1: יצירת בקשה',
    subtitle: 'התחלת התהליך',
    content: (
      <div className="grid grid-cols-2 gap-8 h-full items-center" dir="rtl">
        <div className="space-y-6">
          <h3 className="text-3xl font-bold text-primary">יצירת בקשת ספק חדש</h3>
          <ul className="space-y-4 text-lg">
            <li className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
              <span>הזנת פרטי ספק בסיסיים (שם + אימייל)</span>
            </li>
            <li className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
              <span>בחירת סוג ספק: משרד / תביעות</span>
            </li>
            <li className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
              <span>הקצאת מטפל לבקשה</span>
            </li>
            <li className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
              <span>בחירת סוג אישור נדרש</span>
            </li>
          </ul>
          <div className="flex flex-wrap gap-2 mt-4">
            <Badge className="bg-blue-100 text-blue-700">העלאה בודדת</Badge>
            <Badge className="bg-purple-100 text-purple-700">העלאה מאקסל</Badge>
          </div>
        </div>
        <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="space-y-4">
            <h4 className="font-bold text-xl mb-4">אפשרויות אישור:</h4>
            <div className="space-y-3">
              <div className="p-4 bg-background rounded-lg border">
                <div className="font-medium">אישור מנהל רכש בלבד</div>
                <div className="text-sm text-muted-foreground">תהליך מהיר - חתימה אחת</div>
              </div>
              <div className="p-4 bg-background rounded-lg border">
                <div className="font-medium">אישור מנהל רכש + סמנכ"ל</div>
                <div className="text-sm text-muted-foreground">תהליך מלא - שתי חתימות</div>
              </div>
              <div className="p-4 bg-background rounded-lg border">
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
    id: 4,
    title: 'שלב 2: טופס הספק',
    subtitle: 'מילוי פרטים והעלאת מסמכים',
    content: (
      <div className="grid grid-cols-2 gap-8 h-full items-center" dir="rtl">
        <div className="space-y-6">
          <h3 className="text-3xl font-bold text-primary">תהליך דו-שלבי חכם</h3>
          
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">1</div>
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

          <div className="p-4 bg-green-50 rounded-xl border border-green-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold">2</div>
              <span className="font-bold text-lg">מילוי פרטים</span>
            </div>
            <ul className="space-y-2 text-sm mr-11">
              <li>• פרטי חברה (שם, ח.פ, כתובת)</li>
              <li>• אנשי קשר</li>
              <li>• פרטי בנק (ממולאים אוטומטית!)</li>
            </ul>
          </div>
        </div>

        <Card className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Scan className="h-10 w-10 text-amber-600" />
              <h4 className="font-bold text-2xl text-amber-800">OCR חכם</h4>
            </div>
            <p className="text-lg">
              המערכת סורקת את המסמכים ומחלצת אוטומטית:
            </p>
            <ul className="space-y-3">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>מספר בנק, סניף וחשבון</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>שם חברה וח.פ</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>כתובת ופרטי קשר</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>טלפון ופקס</span>
              </li>
            </ul>
            <div className="mt-4 p-3 bg-amber-100 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>תמיכה:</strong> PDF, תמונות, Word
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    ),
  },
  {
    id: 5,
    title: 'אבטחה ואימות',
    subtitle: 'גישה מאובטחת לטופס',
    content: (
      <div className="flex flex-col items-center justify-center h-full space-y-8" dir="rtl">
        <Shield className="h-24 w-24 text-primary" />
        <h3 className="text-3xl font-bold text-center">מנגנוני אבטחה</h3>
        
        <div className="grid grid-cols-3 gap-6 w-full max-w-4xl">
          <Card className="p-6 text-center">
            <CardContent>
              <Mail className="h-12 w-12 mx-auto mb-4 text-blue-500" />
              <h4 className="font-bold text-lg mb-2">קישור מאובטח</h4>
              <p className="text-sm text-muted-foreground">
                קישור ייחודי לכל ספק עם תוקף מוגבל (3-30 ימים)
              </p>
            </CardContent>
          </Card>
          
          <Card className="p-6 text-center">
            <CardContent>
              <Clock className="h-12 w-12 mx-auto mb-4 text-amber-500" />
              <h4 className="font-bold text-lg mb-2">אימות OTP</h4>
              <p className="text-sm text-muted-foreground">
                קוד חד פעמי נשלח למייל הספק לאימות זהות
              </p>
            </CardContent>
          </Card>
          
          <Card className="p-6 text-center">
            <CardContent>
              <Eye className="h-12 w-12 mx-auto mb-4 text-green-500" />
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
    id: 6,
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
            <div className="p-4 bg-green-50 rounded-xl border border-green-200">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-green-500" />
                <div>
                  <div className="font-bold">אישור</div>
                  <div className="text-sm text-muted-foreground">ממשיך לשלב החתימות</div>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200">
              <div className="flex items-center gap-3">
                <Send className="h-8 w-8 text-yellow-500" />
                <div>
                  <div className="font-bold">שליחה מחדש</div>
                  <div className="text-sm text-muted-foreground">הספק מתבקש לתקן/להשלים</div>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-red-50 rounded-xl border border-red-200">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-red-500" />
                <div>
                  <div className="font-bold">דחייה</div>
                  <div className="text-sm text-muted-foreground">הספק מקבל הודעה ליצור קשר</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="space-y-4">
            <h4 className="font-bold text-xl">צפייה במסמכים</h4>
            <p className="text-muted-foreground">
              המטפל יכול לצפות בכל המסמכים ובפרטי הספק לפני קבלת החלטה
            </p>
            <div className="space-y-2 mt-4">
              <div className="flex items-center gap-2 p-2 bg-background rounded">
                <FileText className="h-5 w-5 text-primary" />
                <span>אישור ניהול ספרים</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-background rounded">
                <FileText className="h-5 w-5 text-primary" />
                <span>אישור ניכוי מס</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-background rounded">
                <FileText className="h-5 w-5 text-primary" />
                <span>אישור בנק</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-background rounded">
                <FileText className="h-5 w-5 text-primary" />
                <span>חשבונית לדוגמא</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    ),
  },
  {
    id: 7,
    title: 'שלב 4: חתימות מנהלים',
    subtitle: 'אישור דיגיטלי',
    content: (
      <div className="flex flex-col items-center justify-center h-full space-y-6" dir="rtl">
        <h3 className="text-3xl font-bold text-primary">תהליך החתימות</h3>
        
        <div className="flex items-center gap-8 w-full max-w-4xl justify-center">
          <Card className="p-6 w-64 text-center border-2 border-purple-200">
            <CardContent>
              <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
                <FileSignature className="h-8 w-8 text-purple-600" />
              </div>
              <h4 className="font-bold text-lg">סמנכ"ל</h4>
              <p className="text-sm text-muted-foreground mt-2">חתימה ראשונה</p>
              <Badge className="mt-3 bg-purple-100 text-purple-700">חובה בתהליך מלא</Badge>
            </CardContent>
          </Card>
          
          <ArrowLeft className="h-10 w-10 text-muted-foreground" />
          
          <Card className="p-6 w-64 text-center border-2 border-blue-200">
            <CardContent>
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                <FileSignature className="h-8 w-8 text-blue-600" />
              </div>
              <h4 className="font-bold text-lg">מנהל רכש</h4>
              <p className="text-sm text-muted-foreground mt-2">חתימה שנייה</p>
              <Badge className="mt-3 bg-blue-100 text-blue-700">חובה תמיד</Badge>
            </CardContent>
          </Card>
        </div>
        
        <div className="mt-8 p-6 bg-muted/50 rounded-xl max-w-3xl">
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
    id: 8,
    title: 'שלב 5: אישור סופי',
    subtitle: 'הספק פעיל במערכת',
    content: (
      <div className="grid grid-cols-2 gap-8 h-full items-center" dir="rtl">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
            <h3 className="text-3xl font-bold text-green-600">הספק אושר!</h3>
          </div>
          
          <p className="text-lg">
            לאחר השלמת כל החתימות, הספק מועבר אוטומטית ל-CRM
          </p>
          
          <ul className="space-y-3">
            <li className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-primary" />
              <span>מייל אישור נשלח לספק</span>
            </li>
            <li className="flex items-center gap-3">
              <Receipt className="h-5 w-5 text-primary" />
              <span>קישור להעלאת קבלות</span>
            </li>
            <li className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-primary" />
              <span>הספק מופיע ב-CRM</span>
            </li>
          </ul>
        </div>
        
        <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardContent className="space-y-4">
            <h4 className="font-bold text-xl text-green-800">סטטוסי CRM</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-background rounded-lg">
                <span>פעיל</span>
                <Badge className="bg-green-100 text-green-700">Active</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-background rounded-lg">
                <span>VIP</span>
                <Badge className="bg-purple-100 text-purple-700">VIP</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-background rounded-lg">
                <span>מושהה</span>
                <Badge className="bg-yellow-100 text-yellow-700">Suspended</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-background rounded-lg">
                <span>סגור</span>
                <Badge className="bg-red-100 text-red-700">Closed</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-background rounded-lg">
                <span>אושר ביטחון</span>
                <Badge className="bg-blue-100 text-blue-700">Security</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    ),
  },
  {
    id: 9,
    title: 'ניהול קבלות',
    subtitle: 'מעקב אחר הוצאות',
    content: (
      <div className="flex flex-col items-center justify-center h-full space-y-8" dir="rtl">
        <Receipt className="h-20 w-20 text-primary" />
        <h3 className="text-3xl font-bold">מערכת קבלות</h3>
        
        <div className="grid grid-cols-3 gap-6 w-full max-w-4xl">
          <Card className="p-6">
            <CardContent className="text-center">
              <Upload className="h-12 w-12 mx-auto mb-4 text-blue-500" />
              <h4 className="font-bold mb-2">העלאה</h4>
              <p className="text-sm text-muted-foreground">
                הספק מעלה קבלות דרך קישור מאובטח
              </p>
            </CardContent>
          </Card>
          
          <Card className="p-6">
            <CardContent className="text-center">
              <Eye className="h-12 w-12 mx-auto mb-4 text-amber-500" />
              <h4 className="font-bold mb-2">בדיקה</h4>
              <p className="text-sm text-muted-foreground">
                המטפל בודק ומאשר/דוחה כל קבלה
              </p>
            </CardContent>
          </Card>
          
          <Card className="p-6">
            <CardContent className="text-center">
              <Star className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <h4 className="font-bold mb-2">דירוג</h4>
              <p className="text-sm text-muted-foreground">
                דירוג ספקים לפי ביצועים
              </p>
            </CardContent>
          </Card>
        </div>
        
        <div className="p-4 bg-muted/50 rounded-xl max-w-2xl">
          <p className="text-center text-muted-foreground">
            כל קבלה כוללת: סכום, תאריך, תיאור, וסטטוס (ממתין / מאושר / נדחה)
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 10,
    title: 'סיכום',
    subtitle: 'יתרונות המערכת',
    content: (
      <div className="flex flex-col items-center justify-center h-full space-y-8" dir="rtl">
        <h3 className="text-4xl font-bold text-primary text-center">למה ספק בקליק?</h3>
        
        <div className="grid grid-cols-2 gap-6 w-full max-w-4xl">
          <div className="p-6 bg-blue-50 rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <Clock className="h-8 w-8 text-blue-600" />
              <span className="font-bold text-xl">חיסכון בזמן</span>
            </div>
            <p className="text-muted-foreground">
              תהליך אוטומטי שמחליף טפסים ידניים והתכתבויות אינסופיות
            </p>
          </div>
          
          <div className="p-6 bg-green-50 rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <Shield className="h-8 w-8 text-green-600" />
              <span className="font-bold text-xl">אבטחה מלאה</span>
            </div>
            <p className="text-muted-foreground">
              קישורים מוגני זמן, אימות OTP, והצפנת נתונים
            </p>
          </div>
          
          <div className="p-6 bg-purple-50 rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <Scan className="h-8 w-8 text-purple-600" />
              <span className="font-bold text-xl">OCR חכם</span>
            </div>
            <p className="text-muted-foreground">
              חילוץ אוטומטי של נתונים ממסמכים - פחות טעויות הקלדה
            </p>
          </div>
          
          <div className="p-6 bg-amber-50 rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <FileSignature className="h-8 w-8 text-amber-600" />
              <span className="font-bold text-xl">חתימות דיגיטליות</span>
            </div>
            <p className="text-muted-foreground">
              תהליך אישור מובנה עם חתימות דיגיטליות על מסמכים
            </p>
          </div>
        </div>
        
        <div className="mt-8">
          <Badge className="text-xl px-6 py-3 bg-primary text-primary-foreground">
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
      <div className="flex items-center justify-between p-4 border-b">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
          <Home className="h-4 w-4 ml-2" />
          חזרה לדף הבית
        </Button>
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={downloadPDF}
            disabled={isDownloading}
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
            onClick={downloadPPTX}
            disabled={isDownloading}
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
        <div className="text-sm font-medium">{slides[currentSlide].title}</div>
      </div>

      {/* Slide Content */}
      <div className="flex-1 p-8 overflow-auto" ref={slideRef}>
        <div className="max-w-6xl mx-auto h-full">
          {slides[currentSlide].content}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between p-4 border-t bg-muted/30">
        <Button
          variant="outline"
          onClick={prevSlide}
          disabled={currentSlide === 0}
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
                  ? 'bg-primary w-8' 
                  : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
              }`}
            />
          ))}
        </div>

        <Button
          variant="outline"
          onClick={nextSlide}
          disabled={currentSlide === slides.length - 1}
        >
          הבא
          <ArrowLeft className="h-4 w-4 mr-2" />
        </Button>
      </div>
    </div>
  );
};

export default Presentation;
