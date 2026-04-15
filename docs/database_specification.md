# מפרט מסד נתונים - מערכת OneClickSupplier

מסמך זה מיועד לצוות ה-DBA של ביטוח ישיר לצורך הקמת תשתית מסד הנתונים עבור מערכת ניהול הספקים וחתימות דיגיטליות.

> [!IMPORTANT]
> המערכת תוכננה לעבוד עם **PostgreSQL**. מומלץ להשתמש בטיפוס הנתונים `UUID` למפתחות ראשיים וב-`TIMESTAMPTZ` עבור חותמות זמן עם אזור זמן (UTC).

## 1. טבלת פרופילי משתמשים (`profiles`)
טבלה זו מרכזת את פרטי המשתמשים הפנימיים במערכת (מנהלי רכש, סמנכ"לים, פקידי CRM).

| שם שדה | טיפוס נתונים | תיאור |
| :--- | :--- | :--- |
| `id` | UUID (PK) | מזהה ייחודי של המשתמש (מקושר ל-Auth) |
| `email` | TEXT (Unique) | כתובת המייל של המשתמש |
| `full_name` | TEXT | שם מלא |
| `is_approved` | BOOLEAN | האם המשתמש מאושר לכניסה למערכת |
| `created_at` | TIMESTAMPTZ | תאריך יצירה |
| `updated_at` | TIMESTAMPTZ | תאריך עדכון אחרון |
| `approved_at` | TIMESTAMPTZ | תאריך אישור המשתמש ע"י אדמין |

---

## 2. טבלת בקשות ספקים (`vendor_requests`)
הטבלה המרכזית במערכת. מרכזת את כל תהליך הרישום, פרטי הספק וסטטוס האישורים (חוזה מסגרת).

| שם שדה | טיפוס נתונים | תיאור |
| :--- | :--- | :--- |
| `id` | UUID (PK) | מזהה ייחודי של הבקשה |
| `vendor_name` | TEXT | שם הספק |
| `vendor_email` | TEXT | כתובת מייל של הספק לתקשורת |
| `company_id` | TEXT | ח.פ. / מספר עוסק מורשה |
| `status` | TEXT | סטטוס הבקשה (draft, submitted, approved, rejected וכו') |
| `secure_token` | UUID | טוקן גישה חד-פעמי לספק עבור הטופס |
| `payment_terms` | TEXT | תנאי תשלום (למשל: שוטף+60) |
| `handler_name` | TEXT | שם המטפל הפנימי בבקשה |
| `handler_email` | TEXT | מייל המטפל הפנימי |
| `vendor_type` | TEXT | סוג ספק (general, consultant וכו') |
| `requires_vp_approval` | BOOLEAN | האם נדרש אישור סמנכ"ל |
| `requires_contract_signature` | BOOLEAN | האם נדרשת חתימה על חוזה |
| `contract_file_path` | TEXT | נתיב לקובץ החוזה ב-Storage |
| `otp_verified` | BOOLEAN | האם הספק אימת את זהותו ב-OTP |
| `created_at` | TIMESTAMPTZ | תאריך יצירת הבקשה |
| `updated_at` | TIMESTAMPTZ | תאריך עדכון אחרון |
| `ceo_signed` | BOOLEAN | האם נחתם ע"י סמנכ"ל |
| `procurement_manager_signed` | BOOLEAN | האם נחתם ע"י מנהל רכש |

---

## 3. טבלת הצעות מחיר (`vendor_quotes`)
טבלה המנהלת את תהליך הגשת הצעות המחיר עבור ספקים קיימים.

| שם שדה | טיפוס נתונים | תיאור |
| :--- | :--- | :--- |
| `id` | UUID (PK) | מזהה ייחודי של הצעת המחיר |
| `vendor_request_id` | UUID (FK) | קישור לספק (vendor_requests) |
| `status` | TEXT | סטטוס (pending_vendor, pending_vp, approved וכו') |
| `amount` | DECIMAL | סכום הצעת המחיר |
| `description` | TEXT | תיאור ההצעה / פריטים |
| `file_path` | TEXT | נתיב לקובץ הצעת המחיר החתומה |
| `quote_secure_token` | UUID | טוקן גישה ייחודי לספק להעלאת הצעה |
| `handler_approved` | BOOLEAN | אישור בקרת איכות של המטפל |
| `vp_approved` | BOOLEAN | אישור סמנכ"ל להוצאת ההזמנה |
| `procurement_manager_approved` | BOOLEAN | אישור סופי של מנהל הרכש |
| `vendor_submitted_at` | TIMESTAMPTZ | מתי הספק העלה את הקובץ |

---

## 4. טבלת קבלות וחשבוניות (`vendor_receipts`)
ריכוז קבצים ומידע כספי שהועלה ע"י הספקים.

| שם שדה | טיפוס נתונים | תיאור |
| :--- | :--- | :--- |
| `id` | UUID (PK) | מזהה ייחודי |
| `vendor_request_id` | UUID (FK) | קישור לספק |
| `amount` | DECIMAL | סכום החשבונית |
| `file_path` | TEXT | נתיב לקובץ ב-Storage |
| `status` | TEXT | סטטוס בדיקה (pending, approved) |
| `uploaded_at` | TIMESTAMPTZ | תאריך העלאה |

---

## 5. טבלת הגדרות מערכת (`app_settings`)
הגדרות גלובליות של האפליקציה (מיילים מורשים, קודים גלובליים וכו').

| שם שדה | טיפוס נתונים | תיאור |
| :--- | :--- | :--- |
| `id` | UUID (PK) | מזהה ייחודי |
| `setting_key` | TEXT (Unique) | מפתח ההגדרה (למשל: `vp_email`) |
| `setting_value` | TEXT | ערך ההגדרה |
| `updated_at` | TIMESTAMPTZ | תאריך עדכון אחרון |

---

## 6. טבלת דירוג ספקים (`vendor_ratings`)
פידבק ודירוג איכות השירות של הספקים.

| שם שדה | טיפוס נתונים | תיאור |
| :--- | :--- | :--- |
| `id` | UUID (PK) | מזהה ייחודי |
| `vendor_request_id` | UUID (FK) | קישור לספק |
| `rating` | INTEGER | דירוג (1-5) |
| `comment` | TEXT | הערות חופשיות |
| `created_at` | TIMESTAMPTZ | תאריך מתן הדירוג |

---

## הנחיות ליישום (Implementation Notes):

1. **מפתחות זרים (Foreign Keys):** רוב הטבלאות מקושרות ל-`vendor_requests` דרך השדה `vendor_request_id`.
2. **אינדקסים (Indexes):** יש להקים אינדקסים על עמודות ה-`email` בטבלאות המשתמשים, ועל עמודות ה-`secure_token` בטבלאות הבקשות והצעות המחיר לטובת שליפה מהירה בגישה חיצונית.
3. **אחסון קבצים (Storage):** שדות ה-`file_path` בטבלאות השונות מכילים נתיב יחסי. בבסיס הנתונים הסופי יש לוודא שהנתיב תואם לסטנדרט האחסון של ביטוח ישיר (S3, Azure Blob, או Cluster מקומי).
