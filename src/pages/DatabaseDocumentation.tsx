import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Download, 
  Database, 
  Table, 
  Key, 
  Link2, 
  Shield, 
  ChevronDown, 
  ChevronLeft,
  FileText,
  Code,
  Zap,
  ArrowRight
} from "lucide-react";
import { downloadDatabaseSchemaDoc } from "@/utils/exportDatabaseSchema";

// Database schema definitions
const tables = [
  {
    name: "vendor_requests",
    hebrewName: "בקשות ספקים",
    description: "טבלה מרכזית - מכילה את כל המידע על בקשות קליטת ספקים",
    icon: "📋",
    columns: [
      { name: "id", type: "uuid", nullable: false, default: "gen_random_uuid()", description: "מזהה ייחודי" },
      { name: "vendor_name", type: "text", nullable: false, description: "שם הספק" },
      { name: "vendor_email", type: "text", nullable: false, description: "אימייל הספק" },
      { name: "status", type: "vendor_status", nullable: false, default: "'pending'", description: "סטטוס הבקשה" },
      { name: "secure_token", type: "uuid", nullable: false, default: "gen_random_uuid()", description: "טוקן אבטחה לגישה" },
      { name: "company_id", type: "text", nullable: true, description: "ח.פ./ע.מ." },
      { name: "phone", type: "text", nullable: true, description: "טלפון" },
      { name: "mobile", type: "text", nullable: true, description: "נייד" },
      { name: "city", type: "text", nullable: true, description: "עיר" },
      { name: "street", type: "text", nullable: true, description: "רחוב" },
      { name: "street_number", type: "text", nullable: true, description: "מספר בית" },
      { name: "bank_name", type: "text", nullable: true, description: "שם הבנק" },
      { name: "bank_branch", type: "text", nullable: true, description: "סניף" },
      { name: "bank_account_number", type: "text", nullable: true, description: "מספר חשבון" },
      { name: "payment_method", type: "payment_method", nullable: true, description: "אמצעי תשלום" },
      { name: "handler_name", type: "text", nullable: true, description: "שם המטפל" },
      { name: "handler_email", type: "text", nullable: true, description: "אימייל המטפל" },
      { name: "vendor_type", type: "text", nullable: true, default: "'general'", description: "סוג ספק" },
      { name: "crm_status", type: "crm_vendor_status", nullable: true, default: "'active'", description: "סטטוס CRM" },
      { name: "requires_vp_approval", type: "boolean", nullable: false, default: "true", description: "דורש אישור סמנכ\"ל" },
      { name: "procurement_manager_signed", type: "boolean", nullable: true, default: "false", description: "חתימת מנהל רכש" },
      { name: "ceo_signed", type: "boolean", nullable: true, default: "false", description: "חתימת סמנכ\"ל" },
      { name: "rating", type: "integer", nullable: true, description: "דירוג ממוצע" },
      { name: "created_at", type: "timestamptz", nullable: false, default: "now()", description: "תאריך יצירה" },
      { name: "updated_at", type: "timestamptz", nullable: false, default: "now()", description: "תאריך עדכון" },
    ],
    policies: [
      { name: "Authenticated users can read", command: "SELECT" },
      { name: "Authenticated users can insert", command: "INSERT" },
      { name: "Authenticated users can update", command: "UPDATE" },
    ],
    relations: [
      { table: "vendor_documents", type: "one-to-many" },
      { table: "vendor_quotes", type: "one-to-many" },
      { table: "vendor_receipts", type: "one-to-many" },
      { table: "vendor_ratings", type: "one-to-many" },
      { table: "vendor_status_history", type: "one-to-many" },
      { table: "crm_history", type: "one-to-many" },
    ]
  },
  {
    name: "vendor_documents",
    hebrewName: "מסמכי ספקים",
    description: "אחסון קבצים ומסמכים שספקים מעלים",
    icon: "📄",
    columns: [
      { name: "id", type: "uuid", nullable: false, default: "gen_random_uuid()", description: "מזהה ייחודי" },
      { name: "vendor_request_id", type: "uuid", nullable: false, description: "מזהה בקשת הספק" },
      { name: "document_type", type: "document_type", nullable: false, description: "סוג המסמך" },
      { name: "file_path", type: "text", nullable: false, description: "נתיב הקובץ ב-Storage" },
      { name: "file_name", type: "text", nullable: false, description: "שם הקובץ" },
      { name: "extracted_tags", type: "jsonb", nullable: true, description: "נתונים שחולצו ע\"י AI" },
      { name: "uploaded_at", type: "timestamptz", nullable: false, default: "now()", description: "תאריך העלאה" },
    ],
    policies: [
      { name: "Authenticated users can read", command: "SELECT" },
      { name: "Authenticated users can insert", command: "INSERT" },
      { name: "Authenticated users can delete", command: "DELETE" },
    ],
    relations: [
      { table: "vendor_requests", type: "many-to-one", foreignKey: "vendor_request_id" },
    ]
  },
  {
    name: "vendor_quotes",
    hebrewName: "הצעות מחיר",
    description: "ניהול הצעות מחיר מספקים ותהליך אישורן",
    icon: "💰",
    columns: [
      { name: "id", type: "uuid", nullable: false, default: "gen_random_uuid()", description: "מזהה ייחודי" },
      { name: "vendor_request_id", type: "uuid", nullable: false, description: "מזהה הספק" },
      { name: "file_path", type: "text", nullable: false, description: "נתיב קובץ ההצעה" },
      { name: "file_name", type: "text", nullable: false, description: "שם הקובץ" },
      { name: "amount", type: "numeric", nullable: true, description: "סכום ההצעה" },
      { name: "description", type: "text", nullable: true, description: "תיאור" },
      { name: "status", type: "text", nullable: false, default: "'pending'", description: "סטטוס" },
      { name: "quote_date", type: "date", nullable: false, default: "CURRENT_DATE", description: "תאריך ההצעה" },
      { name: "quote_secure_token", type: "uuid", nullable: true, default: "gen_random_uuid()", description: "טוקן אבטחה" },
      { name: "handler_approved", type: "boolean", nullable: true, description: "אישור מטפל" },
      { name: "handler_approved_by", type: "text", nullable: true, description: "מאשר מטפל" },
      { name: "procurement_manager_approved", type: "boolean", nullable: true, description: "אישור מנהל רכש" },
      { name: "procurement_manager_signature_data", type: "text", nullable: true, description: "חתימת מנהל רכש" },
      { name: "vp_approved", type: "boolean", nullable: true, description: "אישור סמנכ\"ל" },
      { name: "vp_signature_data", type: "text", nullable: true, description: "חתימת סמנכ\"ל" },
      { name: "created_at", type: "timestamptz", nullable: false, default: "now()", description: "תאריך יצירה" },
      { name: "updated_at", type: "timestamptz", nullable: false, default: "now()", description: "תאריך עדכון" },
    ],
    policies: [
      { name: "Anyone can read by token", command: "SELECT" },
      { name: "Authenticated users can insert", command: "INSERT" },
      { name: "Anyone can update", command: "UPDATE" },
      { name: "Authenticated users can delete", command: "DELETE" },
    ],
    relations: [
      { table: "vendor_requests", type: "many-to-one", foreignKey: "vendor_request_id" },
    ]
  },
  {
    name: "vendor_receipts",
    hebrewName: "קבלות ספקים",
    description: "קבלות שספקים מעלים לאחר אישור",
    icon: "🧾",
    columns: [
      { name: "id", type: "uuid", nullable: false, default: "gen_random_uuid()", description: "מזהה ייחודי" },
      { name: "vendor_request_id", type: "uuid", nullable: false, description: "מזהה הספק" },
      { name: "file_path", type: "text", nullable: false, description: "נתיב הקובץ" },
      { name: "file_name", type: "text", nullable: false, description: "שם הקובץ" },
      { name: "amount", type: "numeric", nullable: false, description: "סכום הקבלה" },
      { name: "receipt_date", type: "date", nullable: false, description: "תאריך הקבלה" },
      { name: "description", type: "text", nullable: true, description: "תיאור" },
      { name: "status", type: "text", nullable: false, default: "'pending'", description: "סטטוס" },
      { name: "reviewed_by", type: "text", nullable: true, description: "נבדק ע\"י" },
      { name: "reviewed_at", type: "timestamptz", nullable: true, description: "תאריך בדיקה" },
      { name: "rejection_reason", type: "text", nullable: true, description: "סיבת דחייה" },
      { name: "created_at", type: "timestamptz", nullable: false, default: "now()", description: "תאריך יצירה" },
      { name: "updated_at", type: "timestamptz", nullable: false, default: "now()", description: "תאריך עדכון" },
    ],
    policies: [
      { name: "Authenticated users can read", command: "SELECT" },
      { name: "Anyone can insert", command: "INSERT" },
      { name: "Authenticated users can update", command: "UPDATE" },
      { name: "Authenticated users can delete", command: "DELETE" },
    ],
    relations: [
      { table: "vendor_requests", type: "many-to-one", foreignKey: "vendor_request_id" },
    ]
  },
  {
    name: "vendor_ratings",
    hebrewName: "דירוגי ספקים",
    description: "דירוגים שעובדים נותנים לספקים",
    icon: "⭐",
    columns: [
      { name: "id", type: "uuid", nullable: false, default: "gen_random_uuid()", description: "מזהה ייחודי" },
      { name: "vendor_request_id", type: "uuid", nullable: false, description: "מזהה הספק" },
      { name: "user_id", type: "uuid", nullable: false, description: "מזהה המשתמש" },
      { name: "user_email", type: "text", nullable: false, description: "אימייל המשתמש" },
      { name: "rating", type: "integer", nullable: false, description: "דירוג (1-5)" },
      { name: "created_at", type: "timestamptz", nullable: false, default: "now()", description: "תאריך יצירה" },
      { name: "updated_at", type: "timestamptz", nullable: false, default: "now()", description: "תאריך עדכון" },
    ],
    policies: [
      { name: "Authenticated users can read", command: "SELECT" },
      { name: "Users can insert their own", command: "INSERT" },
      { name: "Users can update their own", command: "UPDATE" },
      { name: "Users can delete their own", command: "DELETE" },
    ],
    relations: [
      { table: "vendor_requests", type: "many-to-one", foreignKey: "vendor_request_id" },
    ]
  },
  {
    name: "vendor_status_history",
    hebrewName: "היסטוריית סטטוסים",
    description: "תיעוד כל שינויי הסטטוס של בקשות",
    icon: "📊",
    columns: [
      { name: "id", type: "uuid", nullable: false, default: "gen_random_uuid()", description: "מזהה ייחודי" },
      { name: "vendor_request_id", type: "uuid", nullable: false, description: "מזהה הבקשה" },
      { name: "old_status", type: "text", nullable: true, description: "סטטוס קודם" },
      { name: "new_status", type: "text", nullable: false, description: "סטטוס חדש" },
      { name: "changed_by", type: "text", nullable: true, description: "שונה ע\"י" },
      { name: "changed_at", type: "timestamptz", nullable: false, default: "now()", description: "תאריך שינוי" },
    ],
    policies: [
      { name: "Authenticated users can read", command: "SELECT" },
      { name: "Authenticated users can insert", command: "INSERT" },
    ],
    relations: [
      { table: "vendor_requests", type: "many-to-one", foreignKey: "vendor_request_id" },
    ]
  },
  {
    name: "crm_history",
    hebrewName: "היסטוריית CRM",
    description: "תיעוד פעולות ושינויים ב-CRM",
    icon: "📝",
    columns: [
      { name: "id", type: "uuid", nullable: false, default: "gen_random_uuid()", description: "מזהה ייחודי" },
      { name: "vendor_request_id", type: "uuid", nullable: false, description: "מזהה הספק" },
      { name: "action", type: "text", nullable: false, description: "סוג הפעולה" },
      { name: "field_name", type: "text", nullable: true, description: "שם השדה" },
      { name: "old_value", type: "text", nullable: true, description: "ערך קודם" },
      { name: "new_value", type: "text", nullable: true, description: "ערך חדש" },
      { name: "changed_by", type: "text", nullable: true, description: "שונה ע\"י" },
      { name: "changed_at", type: "timestamptz", nullable: false, default: "now()", description: "תאריך שינוי" },
    ],
    policies: [
      { name: "Authenticated users can read", command: "SELECT" },
      { name: "Authenticated users can insert", command: "INSERT" },
    ],
    relations: [
      { table: "vendor_requests", type: "many-to-one", foreignKey: "vendor_request_id" },
    ]
  },
  {
    name: "profiles",
    hebrewName: "פרופילי משתמשים",
    description: "פרטי משתמשי המערכת (עובדים)",
    icon: "👤",
    columns: [
      { name: "id", type: "uuid", nullable: false, description: "מזהה (מ-auth.users)" },
      { name: "full_name", type: "text", nullable: true, description: "שם מלא" },
      { name: "avatar_url", type: "text", nullable: true, description: "תמונת פרופיל" },
      { name: "is_approved", type: "boolean", nullable: false, default: "false", description: "מאושר" },
      { name: "approved_by", type: "uuid", nullable: true, description: "אושר ע\"י" },
      { name: "approved_at", type: "timestamptz", nullable: true, description: "תאריך אישור" },
      { name: "created_at", type: "timestamptz", nullable: false, default: "now()", description: "תאריך יצירה" },
      { name: "updated_at", type: "timestamptz", nullable: false, default: "now()", description: "תאריך עדכון" },
    ],
    policies: [
      { name: "Users can view their own", command: "SELECT" },
      { name: "Users can update their own", command: "UPDATE" },
      { name: "Users can insert their own", command: "INSERT" },
    ],
    relations: [
      { table: "auth.users", type: "one-to-one", foreignKey: "id" },
    ]
  },
  {
    name: "user_roles",
    hebrewName: "תפקידי משתמשים",
    description: "הרשאות ותפקידים במערכת",
    icon: "🔐",
    columns: [
      { name: "id", type: "uuid", nullable: false, default: "gen_random_uuid()", description: "מזהה ייחודי" },
      { name: "user_id", type: "uuid", nullable: false, description: "מזהה המשתמש" },
      { name: "role", type: "app_role", nullable: false, default: "'user'", description: "תפקיד (admin/user)" },
      { name: "created_at", type: "timestamptz", nullable: false, default: "now()", description: "תאריך יצירה" },
    ],
    policies: [
      { name: "Users can view their own", command: "SELECT" },
      { name: "Admins can view all", command: "SELECT" },
      { name: "Admins can insert", command: "INSERT" },
      { name: "Admins can update", command: "UPDATE" },
      { name: "Admins can delete", command: "DELETE" },
    ],
    relations: [
      { table: "auth.users", type: "many-to-one", foreignKey: "user_id" },
    ]
  },
  {
    name: "pending_approvals",
    hebrewName: "אישורים ממתינים",
    description: "בקשות הרשמה ממתינות לאישור אדמין",
    icon: "⏳",
    columns: [
      { name: "id", type: "uuid", nullable: false, default: "gen_random_uuid()", description: "מזהה ייחודי" },
      { name: "user_id", type: "uuid", nullable: false, description: "מזהה המשתמש" },
      { name: "user_email", type: "text", nullable: false, description: "אימייל" },
      { name: "user_name", type: "text", nullable: true, description: "שם" },
      { name: "status", type: "text", nullable: false, default: "'pending'", description: "סטטוס" },
      { name: "approval_token", type: "uuid", nullable: false, default: "gen_random_uuid()", description: "טוקן אישור" },
      { name: "created_at", type: "timestamptz", nullable: false, default: "now()", description: "תאריך יצירה" },
    ],
    policies: [
      { name: "Admins can read all", command: "SELECT" },
      { name: "Admins can update all", command: "UPDATE" },
    ],
    relations: [
      { table: "auth.users", type: "many-to-one", foreignKey: "user_id" },
    ]
  },
  {
    name: "app_settings",
    hebrewName: "הגדרות מערכת",
    description: "הגדרות כלליות של המערכת",
    icon: "⚙️",
    columns: [
      { name: "id", type: "uuid", nullable: false, default: "gen_random_uuid()", description: "מזהה ייחודי" },
      { name: "setting_key", type: "text", nullable: false, description: "מפתח ההגדרה" },
      { name: "setting_value", type: "text", nullable: false, description: "ערך ההגדרה" },
      { name: "created_at", type: "timestamptz", nullable: false, default: "now()", description: "תאריך יצירה" },
      { name: "updated_at", type: "timestamptz", nullable: false, default: "now()", description: "תאריך עדכון" },
    ],
    policies: [
      { name: "Anyone can read", command: "SELECT" },
      { name: "Authenticated users can update", command: "UPDATE" },
      { name: "Authenticated users can insert", command: "INSERT" },
    ],
    relations: []
  },
];

const enums = [
  {
    name: "vendor_status",
    hebrewName: "סטטוס בקשה",
    values: [
      { value: "pending", description: "ממתין - נוצר אך טרם נשלח לספק" },
      { value: "with_vendor", description: "אצל הספק - נשלח קישור לספק" },
      { value: "submitted", description: "הוגש - הספק שלח את הטופס" },
      { value: "first_review", description: "בבדיקה ראשונית - מטפל בודק" },
      { value: "approved", description: "מאושר - הושלם תהליך האישור" },
      { value: "resent", description: "נשלח מחדש - הוחזר לספק לתיקון" },
      { value: "rejected", description: "נדחה - הבקשה נדחתה" },
    ]
  },
  {
    name: "crm_vendor_status",
    hebrewName: "סטטוס CRM",
    values: [
      { value: "active", description: "פעיל - ספק פעיל במערכת" },
      { value: "suspended", description: "מושהה - ספק מושהה זמנית" },
      { value: "closed", description: "סגור - ספק סגור" },
      { value: "vip", description: "VIP - ספק מועדף" },
      { value: "security_approved", description: "מאושר ביטחוני - עבר אישור אבטחה" },
    ]
  },
  {
    name: "document_type",
    hebrewName: "סוג מסמך",
    values: [
      { value: "bookkeeping_cert", description: "אישור ניהול ספרים" },
      { value: "tax_cert", description: "אישור ניכוי מס במקור" },
      { value: "bank_confirmation", description: "אישור פרטי בנק" },
      { value: "invoice_screenshot", description: "צילום חשבונית לדוגמה" },
    ]
  },
  {
    name: "payment_method",
    hebrewName: "אמצעי תשלום",
    values: [
      { value: "check", description: "שיק" },
      { value: "invoice", description: "חשבונית" },
      { value: "transfer", description: "העברה בנקאית" },
    ]
  },
  {
    name: "app_role",
    hebrewName: "תפקיד משתמש",
    values: [
      { value: "admin", description: "מנהל - גישה מלאה" },
      { value: "user", description: "משתמש - גישה רגילה" },
    ]
  },
];

const dbFunctions = [
  {
    name: "is_admin",
    description: "בדיקה האם משתמש הוא אדמין",
    params: "user_id: uuid",
    returns: "boolean",
    usage: "RLS policies, הרשאות"
  },
  {
    name: "has_role",
    description: "בדיקה האם למשתמש יש תפקיד מסוים",
    params: "_user_id: uuid, _role: app_role",
    returns: "boolean",
    usage: "RLS policies, הרשאות"
  },
  {
    name: "handle_new_user",
    description: "Trigger - יצירת פרופיל אוטומטית בהרשמה",
    params: "-",
    returns: "trigger",
    usage: "מופעל אוטומטית ב-INSERT ל-auth.users"
  },
  {
    name: "log_vendor_status_change",
    description: "Trigger - תיעוד שינויי סטטוס",
    params: "-",
    returns: "trigger",
    usage: "מופעל אוטומטית ב-UPDATE של vendor_requests"
  },
  {
    name: "update_updated_at_column",
    description: "Trigger - עדכון שדה updated_at",
    params: "-",
    returns: "trigger",
    usage: "מופעל אוטומטית ב-UPDATE"
  },
];

const DatabaseDocumentation = () => {
  const [activeTab, setActiveTab] = useState("tables");
  const [expandedTables, setExpandedTables] = useState<string[]>(["vendor_requests"]);

  const toggleTable = (tableName: string) => {
    setExpandedTables(prev => 
      prev.includes(tableName) 
        ? prev.filter(t => t !== tableName)
        : [...prev, tableName]
    );
  };

  const expandAll = () => {
    setExpandedTables(tables.map(t => t.name));
  };

  const collapseAll = () => {
    setExpandedTables([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white py-12">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Database className="h-10 w-10" />
                <h1 className="text-4xl font-bold">תיעוד מסד הנתונים</h1>
              </div>
              <p className="text-blue-200 text-lg">
                מסמך מלא של כל הטבלאות, השדות, הקשרים ומדיניות הגישה
              </p>
            </div>
            <div className="flex gap-3">
              <Button 
                onClick={downloadDatabaseSchemaDoc}
                className="bg-white text-blue-900 hover:bg-blue-50"
              >
                <Download className="h-4 w-4 ml-2" />
                הורד כ-Word
              </Button>
              <Button 
                variant="outline"
                onClick={() => window.location.href = '/documentation'}
                className="border-white text-white hover:bg-white/10"
              >
                <FileText className="h-4 w-4 ml-2" />
                תיעוד מערכת
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full max-w-2xl mx-auto mb-8">
            <TabsTrigger value="tables" className="flex items-center gap-2">
              <Table className="h-4 w-4" />
              טבלאות
            </TabsTrigger>
            <TabsTrigger value="enums" className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              Enums
            </TabsTrigger>
            <TabsTrigger value="functions" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              פונקציות
            </TabsTrigger>
            <TabsTrigger value="diagram" className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              דיאגרמה
            </TabsTrigger>
          </TabsList>

          {/* Tables Tab */}
          <TabsContent value="tables">
            <div className="flex justify-between items-center mb-6">
              <div className="text-muted-foreground">
                סה"כ {tables.length} טבלאות במסד הנתונים
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={expandAll}>
                  פתח הכל
                </Button>
                <Button variant="outline" size="sm" onClick={collapseAll}>
                  סגור הכל
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {tables.map((table) => (
                <Card key={table.name} className="overflow-hidden">
                  <Collapsible 
                    open={expandedTables.includes(table.name)}
                    onOpenChange={() => toggleTable(table.name)}
                  >
                    <CollapsibleTrigger className="w-full">
                      <CardHeader className="hover:bg-muted/50 transition-colors cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{table.icon}</span>
                            <div className="text-right">
                              <CardTitle className="text-lg flex items-center gap-2">
                                {table.hebrewName}
                                <Badge variant="outline" className="font-mono text-xs">
                                  {table.name}
                                </Badge>
                              </CardTitle>
                              <CardDescription>{table.description}</CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-sm text-muted-foreground">
                              {table.columns.length} עמודות
                            </div>
                            {expandedTables.includes(table.name) ? (
                              <ChevronDown className="h-5 w-5" />
                            ) : (
                              <ChevronLeft className="h-5 w-5" />
                            )}
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <CardContent className="border-t pt-4">
                        {/* Columns */}
                        <div className="mb-6">
                          <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <Table className="h-4 w-4" />
                            עמודות
                          </h4>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-muted/50">
                                  <th className="text-right p-2 font-medium">שם</th>
                                  <th className="text-right p-2 font-medium">סוג</th>
                                  <th className="text-right p-2 font-medium">Nullable</th>
                                  <th className="text-right p-2 font-medium">ברירת מחדל</th>
                                  <th className="text-right p-2 font-medium">תיאור</th>
                                </tr>
                              </thead>
                              <tbody>
                                {table.columns.map((col, idx) => (
                                  <tr key={col.name} className={idx % 2 === 0 ? "bg-white" : "bg-muted/20"}>
                                    <td className="p-2 font-mono text-xs flex items-center gap-1">
                                      {col.name === "id" && <Key className="h-3 w-3 text-yellow-600" />}
                                      {col.name.includes("_id") && col.name !== "id" && <Link2 className="h-3 w-3 text-blue-600" />}
                                      {col.name}
                                    </td>
                                    <td className="p-2">
                                      <Badge variant="secondary" className="font-mono text-xs">
                                        {col.type}
                                      </Badge>
                                    </td>
                                    <td className="p-2">
                                      {col.nullable ? (
                                        <span className="text-muted-foreground">כן</span>
                                      ) : (
                                        <span className="text-red-600 font-medium">לא</span>
                                      )}
                                    </td>
                                    <td className="p-2 font-mono text-xs text-muted-foreground">
                                      {col.default || "-"}
                                    </td>
                                    <td className="p-2">{col.description}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* RLS Policies */}
                        <div className="mb-6">
                          <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            מדיניות RLS
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {table.policies.map((policy) => (
                              <Badge key={policy.name} variant="outline" className="flex items-center gap-1">
                                <span className={
                                  policy.command === "SELECT" ? "text-green-600" :
                                  policy.command === "INSERT" ? "text-blue-600" :
                                  policy.command === "UPDATE" ? "text-yellow-600" :
                                  "text-red-600"
                                }>
                                  {policy.command}
                                </span>
                                <span className="text-muted-foreground">-</span>
                                {policy.name}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* Relations */}
                        {table.relations.length > 0 && (
                          <div>
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                              <Link2 className="h-4 w-4" />
                              קשרים
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {table.relations.map((rel) => (
                                <Badge key={rel.table} className="flex items-center gap-1">
                                  {rel.type === "one-to-many" ? "1:N" : rel.type === "many-to-one" ? "N:1" : "1:1"}
                                  <ArrowRight className="h-3 w-3" />
                                  {rel.table}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Enums Tab */}
          <TabsContent value="enums">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {enums.map((enumType) => (
                <Card key={enumType.name}>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {enumType.hebrewName}
                      <Badge variant="outline" className="font-mono text-xs">
                        {enumType.name}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {enumType.values.map((val) => (
                        <div key={val.value} className="flex items-start gap-2 p-2 bg-muted/50 rounded">
                          <Badge variant="secondary" className="font-mono text-xs shrink-0">
                            {val.value}
                          </Badge>
                          <span className="text-sm text-muted-foreground">{val.description}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Functions Tab */}
          <TabsContent value="functions">
            <div className="grid gap-4">
              {dbFunctions.map((func) => (
                <Card key={func.name}>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Zap className="h-5 w-5 text-yellow-600" />
                      <code className="font-mono">{func.name}()</code>
                    </CardTitle>
                    <CardDescription>{func.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">פרמטרים:</span>
                        <div className="font-mono mt-1">{func.params}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">מחזיר:</span>
                        <div className="font-mono mt-1">{func.returns}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">שימוש:</span>
                        <div className="mt-1">{func.usage}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Diagram Tab */}
          <TabsContent value="diagram">
            <Card>
              <CardHeader>
                <CardTitle>דיאגרמת ישויות וקשרים (ERD)</CardTitle>
                <CardDescription>
                  תרשים ויזואלי של הקשרים בין הטבלאות במסד הנתונים
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/30 p-8 rounded-lg overflow-auto">
                  <pre className="text-sm font-mono text-center whitespace-pre" dir="ltr">
{`
┌─────────────────────────────────────────────────────────────────────────────┐
│                              auth.users                                      │
│                         (מנוהל ע"י Supabase)                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                │                    │                    │
                │ 1:1                │ N:1                │ N:1
                ▼                    ▼                    ▼
        ┌───────────────┐   ┌───────────────┐   ┌───────────────────┐
        │   profiles    │   │  user_roles   │   │ pending_approvals │
        │ פרופילי משתמש │   │ תפקידי משתמש  │   │  אישורים ממתינים  │
        └───────────────┘   └───────────────┘   └───────────────────┘


                        ┌────────────────────────────┐
                        │      vendor_requests       │
                        │       בקשות ספקים         │
                        │   (טבלה מרכזית)           │
                        └────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │               │           │           │               │
        │ 1:N           │ 1:N       │ 1:N       │ 1:N          │ 1:N
        ▼               ▼           ▼           ▼               ▼
┌───────────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐
│vendor_documents│ │vendor_quotes│ │vendor_receipts│ │vendor_ratings│ │vendor_status_history│
│  מסמכי ספקים  │ │הצעות מחיר │ │קבלות ספקים│ │דירוגים    │ │היסטוריית סטטוס│
└───────────────┘ └───────────┘ └───────────┘ └───────────┘ └───────────┘
                                                                    │
                                                                    │ 1:N
                                                                    ▼
                                                            ┌───────────┐
                                                            │crm_history│
                                                            │היסטוריית CRM│
                                                            └───────────┘

                        ┌───────────────┐
                        │ app_settings  │
                        │ הגדרות מערכת │
                        │  (עצמאית)    │
                        └───────────────┘
`}
                  </pre>
                </div>

                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-4 h-4 bg-blue-500 rounded" />
                    <span>1:1 - אחד לאחד</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-4 h-4 bg-green-500 rounded" />
                    <span>1:N - אחד לרבים</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-4 h-4 bg-yellow-500 rounded" />
                    <span>N:1 - רבים לאחד</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Key className="w-4 h-4 text-yellow-600" />
                    <span>Primary Key</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default DatabaseDocumentation;
