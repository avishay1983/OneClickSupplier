import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Download, FileText, Database, Server, Mail, Brain, Code, Eye, List } from "lucide-react";

const SystemDocumentation = () => {
  const [activeTab, setActiveTab] = useState("architecture");

  const generateMarkdownDoc = () => {
    const doc = `# תיעוד טכני מלא - מערכת "ספק בקליק"
תאריך: ${new Date().toLocaleDateString('he-IL')}

## 1. סקירה כללית

מערכת "ספק בקליק" היא מערכת לניהול תהליך קליטת ספקים חדשים, הכוללת:
- ממשק פנימי לעובדים (Dashboard)
- טופס חיצוני לספקים
- תהליך אישורים רב-שלבי
- מערכת CRM לניהול ספקים מאושרים
- העלאת קבלות לספקים מאושרים

---

## 2. תשתית Backend - Supabase

### 2.1 בסיס נתונים (PostgreSQL)

| טבלה | תיאור | שדות עיקריים |
|------|-------|---------------|
| vendor_requests | בקשות ספקים | id, vendor_name, vendor_email, status, secure_token, handler_name, vendor_type |
| vendor_documents | מסמכי ספקים | id, vendor_request_id, document_type, file_path, extracted_tags |
| vendor_receipts | קבלות ספקים | id, vendor_request_id, amount, receipt_date, status, file_path |
| vendor_status_history | היסטוריית סטטוסים | id, vendor_request_id, old_status, new_status, changed_at |
| crm_history | היסטוריית CRM | id, vendor_request_id, action, field_name, old_value, new_value |
| profiles | פרופילי משתמשים | id, full_name, is_approved, approved_by |
| user_roles | תפקידי משתמשים | id, user_id, role (admin/user) |
| pending_approvals | אישורים ממתינים | id, user_id, user_email, status, approval_token |
| app_settings | הגדרות מערכת | id, setting_key, setting_value |

### 2.2 Storage Buckets

| Bucket | תיאור | גישה |
|--------|-------|------|
| vendor_documents | אחסון מסמכי ספקים | Public |

### 2.3 Database Functions

- \`is_admin(user_id)\` - בדיקת הרשאות אדמין
- \`has_role(user_id, role)\` - בדיקת תפקיד
- \`handle_new_user()\` - Trigger ליצירת פרופיל
- \`log_vendor_status_change()\` - Trigger לתיעוד שינויי סטטוס
- \`update_updated_at_column()\` - עדכון timestamp

---

## 3. Edge Functions - API Reference

### 3.1 שליחת אימייל לספק
\`\`\`
Function: send-vendor-email
Method: POST
Auth: לא נדרש (verify_jwt = false)
Body: {
  vendorName: string,
  vendorEmail: string,
  formLink: string,
  expiryDays: number
}
Response: { success: boolean }
\`\`\`

### 3.2 שליחת OTP
\`\`\`
Function: send-vendor-otp
Method: POST
Auth: לא נדרש
Body: {
  vendorEmail: string,
  vendorName: string,
  otpCode: string
}
Response: { success: boolean }
\`\`\`

### 3.3 אימות OTP
\`\`\`
Function: verify-vendor-otp
Method: POST
Auth: לא נדרש
Body: {
  token: string,
  otp: string
}
Response: { success: boolean, expired?: boolean }
\`\`\`

### 3.4 API טופס ספק
\`\`\`
Function: vendor-form-api
Method: POST
Auth: לא נדרש
Body: {
  action: 'get' | 'get-documents' | 'update' | 'submit' | 'delete-document',
  token: string,
  data?: object
}
Response: { success: boolean, data?: object }
\`\`\`

### 3.5 העלאת מסמכים
\`\`\`
Function: vendor-upload
Method: POST
Auth: לא נדרש
Content-Type: multipart/form-data
Body: FormData {
  token: string,
  documentType: string,
  file: File,
  extractedTags?: string (JSON)
}
Response: { success: boolean, filePath?: string }
\`\`\`

### 3.6 חילוץ פרטי בנק (AI)
\`\`\`
Function: extract-bank-details
Method: POST
Auth: לא נדרש
Body: {
  imageBase64: string,
  mimeType: string
}
Response: {
  bank_number?: string,
  branch_number?: string,
  account_number?: string,
  confidence?: number
}
AI Model: google/gemini-2.5-flash
Cost: ~$0.001-0.005/request
\`\`\`

### 3.7 חילוץ נתוני מסמך (AI)
\`\`\`
Function: extract-document-data
Method: POST
Auth: לא נדרש
Body: {
  imageBase64: string,
  mimeType: string,
  documentType: string
}
Response: {
  company_id?: string,
  company_name?: string,
  phone?: string,
  city?: string,
  ...
}
AI Model: google/gemini-2.5-flash
Cost: ~$0.001-0.005/request
\`\`\`

### 3.8 חילוץ טקסט ממסמך (AI)
\`\`\`
Function: extract-document-text
Method: POST
Auth: לא נדרש
Body: {
  textContent: string,
  documentType: string
}
Response: { extracted data object }
AI Model: google/gemini-2.5-flash
Cost: ~$0.001-0.005/request
\`\`\`

### 3.9 חיפוש רחובות
\`\`\`
Function: search-streets
Method: POST
Auth: לא נדרש
Body: {
  city: string,
  query: string
}
Response: { streets: string[] }
External API: OpenStreetMap Nominatim (חינם)
\`\`\`

### 3.10 שליחת בקשת אישור משתמש
\`\`\`
Function: send-approval-request
Method: POST
Auth: לא נדרש
Body: {
  userEmail: string,
  userName: string,
  approvalToken: string
}
Response: { success: boolean }
\`\`\`

### 3.11 אישור משתמש
\`\`\`
Function: approve-user
Method: GET
Auth: לא נדרש
Query: ?token=xxx&action=approve|reject
Response: Redirect to result page
\`\`\`

### 3.12 שליחת אישור מנהל
\`\`\`
Function: send-manager-approval
Method: POST
Auth: לא נדרש
Body: {
  vendorRequestId: string,
  managerType: 'procurement' | 'vp',
  managerEmail: string,
  managerName: string,
  vendorName: string,
  contractPdfBase64?: string
}
Response: { success: boolean }
\`\`\`

### 3.13 טיפול באישור מנהל
\`\`\`
Function: handle-manager-approval
Method: GET
Auth: לא נדרש
Query: ?id=xxx&action=approve|reject&manager=procurement|vp
Response: Redirect to result page
\`\`\`

### 3.14 התראה למטפל
\`\`\`
Function: send-handler-notification
Method: POST
Auth: לא נדרש
Body: {
  handlerEmail: string,
  handlerName: string,
  vendorName: string,
  vendorRequestId: string
}
Response: { success: boolean }
\`\`\`

### 3.15 דחיית ספק
\`\`\`
Function: send-vendor-rejection
Method: POST
Auth: לא נדרש
Body: {
  vendorRequestId: string,
  reason: string
}
Response: { success: boolean }
\`\`\`

### 3.16 סטטוס ספק
\`\`\`
Function: vendor-status
Method: POST
Auth: לא נדרש
Body: {
  token: string
}
Response: {
  vendor_name: string,
  status: string,
  created_at: string,
  updated_at: string
}
\`\`\`

### 3.17 שליחת לינק קבלות
\`\`\`
Function: send-receipts-link
Method: POST
Auth: לא נדרש
Body: {
  vendorRequestId: string,
  vendorEmail: string,
  vendorName: string
}
Response: { success: boolean }
\`\`\`

---

## 4. שירותי AI

| שירות | Gateway | מודל | שימוש |
|-------|---------|------|-------|
| OCR מסמכים | Lovable AI Gateway | google/gemini-2.5-flash | חילוץ נתונים מתמונות |
| חילוץ טקסט | Lovable AI Gateway | google/gemini-2.5-flash | חילוץ מ-Word/PDF |

**Endpoint:** https://ai.gateway.lovable.dev/v1/chat/completions
**Token:** LOVABLE_API_KEY (מוגדר אוטומטית)
**עלות משוערת:** $0.001-0.005 לבקשה

---

## 5. שירותי Email

| שירות | פרוטוקול | הגדרות |
|-------|----------|--------|
| Gmail SMTP | SMTP over TLS | smtp.gmail.com:465 |

**Secrets נדרשים:**
- GMAIL_USER - כתובת Gmail
- GMAIL_APP_PASSWORD - App Password (לא סיסמה רגילה)

**מגבלות:** 500 הודעות ליום (חינם)

---

## 6. שירותים חיצוניים

| שירות | שימוש | עלות |
|-------|-------|------|
| OpenStreetMap Nominatim | השלמת רחובות | חינם |

---

## 7. ספריות Frontend

| ספרייה | גרסה | שימוש |
|--------|------|-------|
| React | ^18.3.1 | Framework |
| Tailwind CSS | - | Styling |
| shadcn/ui | - | UI Components |
| pdf-lib | ^1.17.1 | הטמעת חתימות PDF |
| signature_pad | ^5.1.3 | ציור חתימות |
| mammoth | ^1.11.0 | קריאת Word |
| xlsx | ^0.18.5 | קריאת Excel |
| @supabase/supabase-js | ^2.86.0 | Supabase Client |

---

## 8. סיכום Secrets

| Secret | שימוש | חובה |
|--------|-------|------|
| SUPABASE_URL | כתובת Supabase | כן |
| SUPABASE_ANON_KEY | מפתח ציבורי | כן |
| SUPABASE_SERVICE_ROLE_KEY | מפתח שרת | כן |
| GMAIL_USER | כתובת Gmail | כן |
| GMAIL_APP_PASSWORD | App Password | כן |
| LOVABLE_API_KEY | מפתח AI | כן |
| ADMIN_EMAIL | מיילים לאישור | כן |
| RESEND_API_KEY | (לא בשימוש) | לא |

---

## 9. המלצות להטמעה ב-Java Microservices

### Backend Services
| רכיב נוכחי | המרה מומלצת |
|------------|-------------|
| Edge Functions (Deno) | Spring Boot Microservices |
| Supabase DB | PostgreSQL + JPA/Hibernate |
| Lovable AI Gateway | Google Gemini API ישירות |
| Gmail SMTP | Spring Mail / JavaMail |
| Storage | MinIO / S3 / Azure Blob |

### Frontend
- React קיים תואם ל-Microfrontend
- ניתן לארוז כ-Module Federation
- או Single-SPA integration

---

## 10. Flow Charts

### תהליך קליטת ספק
1. עובד יוצר בקשה חדשה
2. לינק נשלח לספק במייל
3. ספק מאמת OTP
4. ספק מעלה מסמכים (OCR אוטומטי)
5. ספק ממלא טופס ושולח
6. מטפל מאשר/דוחה/מחזיר
7. מנהל רכש מקבל מייל + חותם
8. סמנכ"ל מקבל מייל + חותם (אם נדרש)
9. ספק מועבר ל-CRM

---

נוצר אוטומטית על ידי מערכת "ספק בקליק"
`;
    return doc;
  };

  const downloadDocumentation = () => {
    const htmlContent = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
<meta charset="UTF-8">
<title>תיעוד טכני - ספק בקליק</title>
<style>
  body { font-family: Arial, sans-serif; direction: rtl; padding: 40px; line-height: 1.6; }
  h1 { color: #1e40af; border-bottom: 2px solid #1e40af; padding-bottom: 10px; }
  h2 { color: #1e3a8a; margin-top: 30px; }
  h3 { color: #1e40af; }
  table { border-collapse: collapse; width: 100%; margin: 15px 0; }
  th, td { border: 1px solid #ccc; padding: 10px; text-align: right; }
  th { background-color: #f0f4ff; }
  code { background-color: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
  pre { background-color: #f3f4f6; padding: 15px; border-radius: 8px; overflow-x: auto; direction: ltr; text-align: left; }
  .section { margin-bottom: 30px; }
  .badge { display: inline-block; background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
  .badge-ai { background: #f3e8ff; color: #7c3aed; }
</style>
</head>
<body>

<h1>תיעוד טכני מלא - מערכת "ספק בקליק"</h1>
<p><strong>תאריך:</strong> ${new Date().toLocaleDateString('he-IL')}</p>

<div class="section">
<h2>1. סקירה כללית</h2>
<p>מערכת "ספק בקליק" היא מערכת לניהול תהליך קליטת ספקים חדשים, הכוללת:</p>
<ul>
<li>ממשק פנימי לעובדים (Dashboard)</li>
<li>טופס חיצוני לספקים</li>
<li>תהליך אישורים רב-שלבי</li>
<li>מערכת CRM לניהול ספקים מאושרים</li>
<li>העלאת קבלות לספקים מאושרים</li>
</ul>
</div>

<div class="section">
<h2>2. תשתית Backend - Supabase</h2>
<h3>2.1 בסיס נתונים (PostgreSQL)</h3>
<table>
<tr><th>טבלה</th><th>תיאור</th><th>שדות עיקריים</th></tr>
<tr><td>vendor_requests</td><td>בקשות ספקים</td><td>id, vendor_name, vendor_email, status, secure_token, handler_name, vendor_type</td></tr>
<tr><td>vendor_documents</td><td>מסמכי ספקים</td><td>id, vendor_request_id, document_type, file_path, extracted_tags</td></tr>
<tr><td>vendor_receipts</td><td>קבלות ספקים</td><td>id, vendor_request_id, amount, receipt_date, status, file_path</td></tr>
<tr><td>vendor_status_history</td><td>היסטוריית סטטוסים</td><td>id, vendor_request_id, old_status, new_status, changed_at</td></tr>
<tr><td>crm_history</td><td>היסטוריית CRM</td><td>id, vendor_request_id, action, field_name, old_value, new_value</td></tr>
<tr><td>profiles</td><td>פרופילי משתמשים</td><td>id, full_name, is_approved, approved_by</td></tr>
<tr><td>user_roles</td><td>תפקידי משתמשים</td><td>id, user_id, role (admin/user)</td></tr>
<tr><td>pending_approvals</td><td>אישורים ממתינים</td><td>id, user_id, user_email, status, approval_token</td></tr>
<tr><td>app_settings</td><td>הגדרות מערכת</td><td>id, setting_key, setting_value</td></tr>
</table>

<h3>2.2 Storage Buckets</h3>
<table>
<tr><th>Bucket</th><th>תיאור</th><th>גישה</th></tr>
<tr><td>vendor_documents</td><td>אחסון מסמכי ספקים</td><td>Public</td></tr>
</table>

<h3>2.3 Database Functions</h3>
<ul>
<li><code>is_admin(user_id)</code> - בדיקת הרשאות אדמין</li>
<li><code>has_role(user_id, role)</code> - בדיקת תפקיד</li>
<li><code>handle_new_user()</code> - Trigger ליצירת פרופיל</li>
<li><code>log_vendor_status_change()</code> - Trigger לתיעוד שינויי סטטוס</li>
<li><code>update_updated_at_column()</code> - עדכון timestamp</li>
</ul>
</div>

<div class="section">
<h2>3. Edge Functions - API Reference</h2>

<h3>3.1 send-vendor-email - שליחת לינק טופס לספק</h3>
<pre>Method: POST
Auth: לא נדרש (verify_jwt = false)
Body: { vendorName, vendorEmail, formLink, expiryDays }
Response: { success: boolean }</pre>

<h3>3.2 send-vendor-otp - שליחת קוד OTP</h3>
<pre>Method: POST
Auth: לא נדרש
Body: { vendorEmail, vendorName, otpCode }
Response: { success: boolean }</pre>

<h3>3.3 verify-vendor-otp - אימות קוד OTP</h3>
<pre>Method: POST
Body: { token, otp }
Response: { success: boolean, expired?: boolean }</pre>

<h3>3.4 vendor-form-api - API טופס ספק</h3>
<pre>Method: POST
Body: { action: 'get'|'update'|'submit'|'delete-document', token, data? }
Response: { success: boolean, data?: object }</pre>

<h3>3.5 vendor-upload - העלאת מסמכים</h3>
<pre>Method: POST
Content-Type: multipart/form-data
Body: FormData { token, documentType, file, extractedTags? }
Response: { success: boolean, filePath?: string }</pre>

<h3>3.6 extract-bank-details - חילוץ פרטי בנק <span class="badge badge-ai">AI</span></h3>
<pre>Method: POST
Body: { imageBase64, mimeType }
Response: { bank_number?, branch_number?, account_number?, confidence? }
AI Model: google/gemini-2.5-flash
Cost: ~$0.001-0.005/request</pre>

<h3>3.7 extract-document-data - חילוץ נתוני מסמך <span class="badge badge-ai">AI</span></h3>
<pre>Method: POST
Body: { imageBase64, mimeType, documentType }
Response: { company_id?, company_name?, phone?, city?, ... }
AI Model: google/gemini-2.5-flash
Cost: ~$0.001-0.005/request</pre>

<h3>3.8 extract-document-text - חילוץ טקסט ממסמך <span class="badge badge-ai">AI</span></h3>
<pre>Method: POST
Body: { textContent, documentType }
AI Model: google/gemini-2.5-flash
Cost: ~$0.001-0.005/request</pre>

<h3>3.9 search-streets - חיפוש רחובות</h3>
<pre>Method: POST
Body: { city, query }
Response: { streets: string[] }
External API: OpenStreetMap Nominatim (חינם)</pre>

<h3>3.10 send-approval-request - בקשת אישור משתמש</h3>
<pre>Method: POST
Body: { userEmail, userName, approvalToken }
Response: { success: boolean }</pre>

<h3>3.11 approve-user - אישור/דחיית משתמש</h3>
<pre>Method: GET
Query: ?token=xxx&action=approve|reject
Response: Redirect to result page</pre>

<h3>3.12 send-manager-approval - שליחת אישור מנהל</h3>
<pre>Method: POST
Body: { vendorRequestId, managerType, managerEmail, managerName, vendorName, contractPdfBase64? }
Response: { success: boolean }</pre>

<h3>3.13 handle-manager-approval - טיפול באישור מנהל</h3>
<pre>Method: GET
Query: ?id=xxx&action=approve|reject&manager=procurement|vp
Response: Redirect to result page</pre>

<h3>3.14 send-handler-notification - התראה למטפל</h3>
<pre>Method: POST
Body: { handlerEmail, handlerName, vendorName, vendorRequestId }
Response: { success: boolean }</pre>

<h3>3.15 send-vendor-rejection - דחיית ספק</h3>
<pre>Method: POST
Body: { vendorRequestId, reason }
Response: { success: boolean }</pre>

<h3>3.16 vendor-status - סטטוס ספק</h3>
<pre>Method: POST
Body: { token }
Response: { vendor_name, status, created_at, updated_at }</pre>

<h3>3.17 send-receipts-link - שליחת לינק קבלות</h3>
<pre>Method: POST
Body: { vendorRequestId, vendorEmail, vendorName }
Response: { success: boolean }</pre>
</div>

<div class="section">
<h2>4. שירותי AI</h2>
<table>
<tr><th>שירות</th><th>Gateway</th><th>מודל</th><th>שימוש</th></tr>
<tr><td>OCR מסמכים</td><td>Lovable AI Gateway</td><td>google/gemini-2.5-flash</td><td>חילוץ נתונים מתמונות</td></tr>
<tr><td>חילוץ טקסט</td><td>Lovable AI Gateway</td><td>google/gemini-2.5-flash</td><td>חילוץ מ-Word/PDF</td></tr>
</table>
<p><strong>Endpoint:</strong> https://ai.gateway.lovable.dev/v1/chat/completions</p>
<p><strong>Token:</strong> LOVABLE_API_KEY (מוגדר אוטומטית)</p>
<p><strong>עלות משוערת:</strong> $0.001-0.005 לבקשה</p>
</div>

<div class="section">
<h2>5. שירותי Email</h2>
<table>
<tr><th>שירות</th><th>פרוטוקול</th><th>הגדרות</th></tr>
<tr><td>Gmail SMTP</td><td>SMTP over TLS</td><td>smtp.gmail.com:465</td></tr>
</table>
<p><strong>Secrets נדרשים:</strong></p>
<ul>
<li>GMAIL_USER - כתובת Gmail</li>
<li>GMAIL_APP_PASSWORD - App Password (לא סיסמה רגילה)</li>
</ul>
<p><strong>מגבלות:</strong> 500 הודעות ליום (חינם)</p>
</div>

<div class="section">
<h2>6. שירותים חיצוניים</h2>
<table>
<tr><th>שירות</th><th>שימוש</th><th>עלות</th></tr>
<tr><td>OpenStreetMap Nominatim</td><td>השלמת רחובות</td><td>חינם</td></tr>
</table>
</div>

<div class="section">
<h2>7. ספריות Frontend</h2>
<table>
<tr><th>ספרייה</th><th>גרסה</th><th>שימוש</th></tr>
<tr><td>React</td><td>^18.3.1</td><td>Framework</td></tr>
<tr><td>Tailwind CSS</td><td>-</td><td>Styling</td></tr>
<tr><td>shadcn/ui</td><td>-</td><td>UI Components</td></tr>
<tr><td>pdf-lib</td><td>^1.17.1</td><td>הטמעת חתימות PDF</td></tr>
<tr><td>signature_pad</td><td>^5.1.3</td><td>ציור חתימות</td></tr>
<tr><td>mammoth</td><td>^1.11.0</td><td>קריאת Word</td></tr>
<tr><td>xlsx</td><td>^0.18.5</td><td>קריאת Excel</td></tr>
<tr><td>@supabase/supabase-js</td><td>^2.86.0</td><td>Supabase Client</td></tr>
</table>
</div>

<div class="section">
<h2>8. סיכום Secrets</h2>
<table>
<tr><th>Secret</th><th>שימוש</th><th>חובה</th></tr>
<tr><td>SUPABASE_URL</td><td>כתובת Supabase</td><td>כן</td></tr>
<tr><td>SUPABASE_ANON_KEY</td><td>מפתח ציבורי</td><td>כן</td></tr>
<tr><td>SUPABASE_SERVICE_ROLE_KEY</td><td>מפתח שרת</td><td>כן</td></tr>
<tr><td>GMAIL_USER</td><td>כתובת Gmail</td><td>כן</td></tr>
<tr><td>GMAIL_APP_PASSWORD</td><td>App Password</td><td>כן</td></tr>
<tr><td>LOVABLE_API_KEY</td><td>מפתח AI</td><td>כן</td></tr>
<tr><td>ADMIN_EMAIL</td><td>מיילים לאישור</td><td>כן</td></tr>
</table>
</div>

<div class="section">
<h2>9. המלצות להטמעה ב-Java Microservices</h2>
<h3>Backend Services</h3>
<table>
<tr><th>רכיב נוכחי</th><th>המרה מומלצת</th></tr>
<tr><td>Edge Functions (Deno)</td><td>Spring Boot Microservices</td></tr>
<tr><td>Supabase DB</td><td>PostgreSQL + JPA/Hibernate</td></tr>
<tr><td>Lovable AI Gateway</td><td>Google Gemini API ישירות</td></tr>
<tr><td>Gmail SMTP</td><td>Spring Mail / JavaMail</td></tr>
<tr><td>Storage</td><td>MinIO / S3 / Azure Blob</td></tr>
</table>
<h3>Frontend</h3>
<ul>
<li>React קיים תואם ל-Microfrontend</li>
<li>ניתן לארוז כ-Module Federation</li>
<li>או Single-SPA integration</li>
</ul>
</div>

<div class="section">
<h2>10. תהליך קליטת ספק</h2>
<ol>
<li>עובד יוצר בקשה חדשה</li>
<li>לינק נשלח לספק במייל</li>
<li>ספק מאמת OTP</li>
<li>ספק מעלה מסמכים (OCR אוטומטי)</li>
<li>ספק ממלא טופס ושולח</li>
<li>מטפל מאשר/דוחה/מחזיר</li>
<li>מנהל רכש מקבל מייל + חותם</li>
<li>סמנכ"ל מקבל מייל + חותם (אם נדרש)</li>
<li>ספק מועבר ל-CRM</li>
</ol>
</div>

<hr>
<p><em>נוצר אוטומטית על ידי מערכת "ספק בקליק"</em></p>

</body>
</html>
`;
    
    const blob = new Blob([htmlContent], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vendor-system-documentation.doc';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background p-6" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-foreground">תיעוד טכני - ספק בקליק</h1>
          <Button onClick={downloadDocumentation} className="gap-2">
            <Download className="h-4 w-4" />
            הורד תיעוד מלא
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="architecture">ארכיטקטורה</TabsTrigger>
            <TabsTrigger value="api">Edge Functions API</TabsTrigger>
            <TabsTrigger value="database">בסיס נתונים</TabsTrigger>
            <TabsTrigger value="lookups">Lookups</TabsTrigger>
            <TabsTrigger value="services">שירותים</TabsTrigger>
          </TabsList>

          <TabsContent value="architecture">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  תרשים ארכיטקטורה
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted p-6 rounded-lg overflow-x-auto">
                  <pre className="text-sm font-mono whitespace-pre text-right" dir="ltr">
{`
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React)                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │  Dashboard   │  │ Vendor Form  │  │     CRM      │  │ Vendor Receipts  │ │
│  │  (Internal)  │  │  (External)  │  │  (Approved)  │  │    (External)    │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────────┘ │
│         │                  │                 │                   │          │
│         └──────────────────┴─────────────────┴───────────────────┘          │
│                                     │                                        │
│                          Supabase JS Client                                  │
└─────────────────────────────────────┼───────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SUPABASE EDGE FUNCTIONS                            │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │  Email Service  │  │   OCR Service   │  │  Form API       │              │
│  │  • send-vendor- │  │  • extract-bank │  │  • vendor-form  │              │
│  │    email        │  │    -details     │  │    -api         │              │
│  │  • send-otp     │  │  • extract-doc  │  │  • vendor-upload│              │
│  │  • send-manager │  │    -data        │  │  • vendor-status│              │
│  │    -approval    │  │  • extract-doc  │  │                 │              │
│  │  • send-handler │  │    -text        │  │                 │              │
│  │    -notification│  │                 │  │                 │              │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘              │
│           │                    │                    │                        │
└───────────┼────────────────────┼────────────────────┼────────────────────────┘
            │                    │                    │
            ▼                    ▼                    ▼
┌───────────────────┐  ┌───────────────────┐  ┌───────────────────────────────┐
│   Gmail SMTP      │  │ Lovable AI Gateway│  │     SUPABASE SERVICES         │
│   smtp.gmail.com  │  │ ai.gateway.lovable│  │  ┌─────────────────────────┐  │
│                   │  │ .dev              │  │  │     PostgreSQL DB       │  │
│  GMAIL_USER       │  │                   │  │  │  • vendor_requests      │  │
│  GMAIL_APP_PASS   │  │  LOVABLE_API_KEY  │  │  │  • vendor_documents     │  │
│                   │  │                   │  │  │  • vendor_receipts      │  │
│  Cost: FREE       │  │  Model:           │  │  │  • profiles             │  │
│  Limit: 500/day   │  │  gemini-2.5-flash │  │  │  • user_roles           │  │
│                   │  │                   │  │  │  • app_settings         │  │
│                   │  │  Cost:            │  │  └─────────────────────────┘  │
│                   │  │  ~$0.001-0.005/req│  │  ┌─────────────────────────┐  │
└───────────────────┘  └───────────────────┘  │  │     Storage Bucket      │  │
                                              │  │  • vendor_documents     │  │
┌───────────────────┐                         │  └─────────────────────────┘  │
│ OpenStreetMap API │                         │  ┌─────────────────────────┐  │
│ Nominatim         │                         │  │    Auth (Supabase)      │  │
│                   │◄────────────────────────┤  │  • Email/Password       │  │
│ Street Search     │                         │  │  • Password Reset       │  │
│ Cost: FREE        │                         │  └─────────────────────────┘  │
└───────────────────┘                         └───────────────────────────────┘
`}
                  </pre>
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="bg-blue-50 dark:bg-blue-950">
                    <CardContent className="pt-4">
                      <h3 className="font-semibold mb-2">Frontend Components</h3>
                      <ul className="text-sm space-y-1">
                        <li>• Dashboard - ניהול בקשות פנימי</li>
                        <li>• Vendor Form - טופס ספק חיצוני</li>
                        <li>• CRM - ניהול ספקים מאושרים</li>
                        <li>• Vendor Receipts - העלאת קבלות</li>
                      </ul>
                    </CardContent>
                  </Card>
                  <Card className="bg-green-50 dark:bg-green-950">
                    <CardContent className="pt-4">
                      <h3 className="font-semibold mb-2">AI Services</h3>
                      <ul className="text-sm space-y-1">
                        <li>• OCR לחילוץ פרטי בנק</li>
                        <li>• חילוץ נתוני חברה ממסמכים</li>
                        <li>• Model: gemini-2.5-flash</li>
                        <li>• Gateway: Lovable AI</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="api">
            <div className="space-y-4">
              {[
                { 
                  name: 'send-vendor-email', 
                  desc: 'שליחת לינק טופס לספק', 
                  method: 'POST', 
                  ai: false,
                  params: [
                    { name: 'vendorName', type: 'string', required: false, desc: 'שם הספק (או vendorRequestId)' },
                    { name: 'vendorEmail', type: 'string', required: false, desc: 'אימייל הספק (או vendorRequestId)' },
                    { name: 'secureLink', type: 'string', required: false, desc: 'לינק מאובטח לטופס (או vendorRequestId)' },
                    { name: 'vendorRequestId', type: 'string', required: false, desc: 'מזהה בקשת ספק - אם קיים, ימשוך את שאר הנתונים אוטומטית' },
                    { name: 'includeReason', type: 'boolean', required: false, desc: 'האם לכלול הערה מהמטפל (לשליחה חוזרת)' },
                    { name: 'reason', type: 'string', required: false, desc: 'הערה/סיבת שליחה מחדש' },
                  ],
                  example: `// מקרה 1: ספק כללי - שליחה ראשונה
await supabase.functions.invoke('send-vendor-email', {
  body: {
    vendorName: "חברה לדוגמה בע״מ",
    vendorEmail: "vendor@example.com",
    secureLink: "https://app.com/vendor/abc-123"
  }
})

// מקרה 2: שימוש ב-vendorRequestId (ימשוך נתונים מה-DB)
await supabase.functions.invoke('send-vendor-email', {
  body: {
    vendorRequestId: "uuid-of-vendor-request"
  }
})

// מקרה 3: שליחה חוזרת עם הערה מהמטפל
await supabase.functions.invoke('send-vendor-email', {
  body: {
    vendorRequestId: "uuid",
    includeReason: true,
    reason: "יש להעלות מחדש אישור ניהול ספרים תקף"
  }
})

// הערה: סוג ספק (כללי/תביעות) ואזור תביעות נשמרים
// בטבלת vendor_requests בעת יצירת הבקשה:
// vendor_type: 'general' | 'claims'
// claims_area: 'car' | 'life' | 'health' | 'home' (רק אם claims)
// claims_sub_category: 'מוסך' | 'שמאי' | 'רופא' | 'עורך דין' וכו'`
                },
                { 
                  name: 'create-vendor-request',
                  desc: 'יצירת בקשת ספק חדשה (דרך Dashboard)',
                  method: 'INSERT',
                  ai: false,
                  params: [
                    { name: 'vendor_name', type: 'string', required: true, desc: 'שם הספק' },
                    { name: 'vendor_email', type: 'string', required: true, desc: 'אימייל הספק' },
                    { name: 'handler_name', type: 'string', required: false, desc: 'שם המטפל בתהליך' },
                    { name: 'handler_email', type: 'string', required: false, desc: 'אימייל המטפל' },
                    { name: 'vendor_type', type: 'string', required: true, desc: "'general' (ספק כללי) | 'claims' (ספק תביעות)" },
                    { name: 'claims_area', type: 'string', required: false, desc: "אזור תביעות: 'car' | 'life' | 'health' | 'home' (רק אם vendor_type='claims')" },
                    { name: 'claims_sub_category', type: 'string', required: false, desc: "תת-קטגוריה: רכב='מוסך'/'שמאי', חיים/בריאות='רופא'/'עורך דין', בית='שרברב'/'חברת ניהול'" },
                    { name: 'requires_vp_approval', type: 'boolean', required: true, desc: 'האם נדרש אישור סמנכ"ל בנוסף למנהל רכש' },
                    { name: 'expires_at', type: 'timestamp', required: false, desc: 'תאריך תפוגת הלינק (ברירת מחדל: 7 ימים)' },
                  ],
                  example: `// יצירת ספק כללי
const { data, error } = await supabase
  .from('vendor_requests')
  .insert({
    vendor_name: "חברה לדוגמה בע״מ",
    vendor_email: "vendor@example.com",
    handler_name: "ישראל ישראלי",
    handler_email: "handler@company.com",
    vendor_type: "general",
    requires_vp_approval: false,
    status: "pending"
  })
  .select()
  .single();

// יצירת ספק תביעות - רכב (מוסך)
const { data, error } = await supabase
  .from('vendor_requests')
  .insert({
    vendor_name: "מוסך לדוגמה",
    vendor_email: "garage@example.com",
    vendor_type: "claims",
    claims_area: "car",
    claims_sub_category: "מוסך",
    requires_vp_approval: true,
    status: "pending"
  })
  .select()
  .single();

// יצירת ספק תביעות - בריאות (רופא)
const { data, error } = await supabase
  .from('vendor_requests')
  .insert({
    vendor_name: "ד״ר ישראל",
    vendor_email: "doctor@example.com",
    vendor_type: "claims",
    claims_area: "health",
    claims_sub_category: "רופא",
    requires_vp_approval: true,
    status: "pending"
  })
  .select()
  .single();

// יצירת ספק תביעות - בית (שרברב)
const { data, error } = await supabase
  .from('vendor_requests')
  .insert({
    vendor_name: "שירותי אינסטלציה בע״מ",
    vendor_email: "plumber@example.com",
    vendor_type: "claims",
    claims_area: "home",
    claims_sub_category: "שרברב",
    requires_vp_approval: false,
    status: "pending"
  })
  .select()
  .single();`
                },
                { 
                  name: 'send-vendor-otp', 
                  desc: 'שליחת קוד OTP', 
                  method: 'POST', 
                  ai: false,
                  params: [
                    { name: 'vendorEmail', type: 'string', required: true, desc: 'אימייל הספק' },
                    { name: 'vendorName', type: 'string', required: true, desc: 'שם הספק' },
                    { name: 'otpCode', type: 'string', required: true, desc: 'קוד OTP (6 ספרות)' },
                  ],
                  example: `await supabase.functions.invoke('send-vendor-otp', {
  body: {
    vendorEmail: "vendor@example.com",
    vendorName: "חברה לדוגמה בע״מ",
    otpCode: "123456"
  }
})`
                },
                { 
                  name: 'verify-vendor-otp', 
                  desc: 'אימות קוד OTP', 
                  method: 'POST', 
                  ai: false,
                  params: [
                    { name: 'token', type: 'string', required: true, desc: 'טוקן הבקשה (secure_token)' },
                    { name: 'otp', type: 'string', required: true, desc: 'קוד OTP שהוזן' },
                  ],
                  example: `await supabase.functions.invoke('verify-vendor-otp', {
  body: {
    token: "abc-123-def-456",
    otp: "123456"
  }
})
// Response: { success: true } או { success: false, expired: true }`
                },
                { 
                  name: 'vendor-form-api', 
                  desc: 'API לטופס ספק', 
                  method: 'POST', 
                  ai: false,
                  params: [
                    { name: 'action', type: 'string', required: true, desc: "פעולה: 'get' | 'get-documents' | 'update' | 'submit' | 'delete-document'" },
                    { name: 'token', type: 'string', required: true, desc: 'טוקן הבקשה' },
                    { name: 'data', type: 'object', required: false, desc: 'נתונים לעדכון (לפי הפעולה)' },
                  ],
                  example: `// קבלת נתוני ספק
await supabase.functions.invoke('vendor-form-api', {
  body: { action: 'get', token: "abc-123" }
})

// שליחת טופס
await supabase.functions.invoke('vendor-form-api', {
  body: {
    action: 'submit',
    token: "abc-123",
    data: {
      company_id: "123456789",
      phone: "03-1234567",
      city: "תל אביב",
      bank_name: "לאומי",
      bank_branch: "800",
      bank_account_number: "123456"
    }
  }
})`
                },
                { 
                  name: 'vendor-upload', 
                  desc: 'העלאת מסמכים', 
                  method: 'POST', 
                  ai: false,
                  params: [
                    { name: 'token', type: 'string', required: true, desc: 'טוקן הבקשה' },
                    { name: 'documentType', type: 'string', required: true, desc: "סוג מסמך: 'bookkeeping_cert' | 'tax_cert' | 'bank_confirmation' | 'invoice_screenshot'" },
                    { name: 'file', type: 'File', required: true, desc: 'קובץ להעלאה' },
                    { name: 'extractedTags', type: 'string', required: false, desc: 'JSON של נתונים שחולצו מהמסמך' },
                  ],
                  example: `const formData = new FormData();
formData.append('token', 'abc-123');
formData.append('documentType', 'bank_confirmation');
formData.append('file', fileObject);
formData.append('extractedTags', JSON.stringify({
  bank_number: "10",
  branch_number: "800",
  account_number: "123456"
}));

await fetch(SUPABASE_URL + '/functions/v1/vendor-upload', {
  method: 'POST',
  body: formData
})`
                },
                { 
                  name: 'extract-bank-details', 
                  desc: 'חילוץ פרטי בנק', 
                  method: 'POST', 
                  ai: true,
                  params: [
                    { name: 'imageBase64', type: 'string', required: true, desc: 'תמונה בפורמט Base64' },
                    { name: 'mimeType', type: 'string', required: true, desc: "סוג קובץ: 'image/jpeg' | 'image/png' | 'application/pdf'" },
                  ],
                  example: `await supabase.functions.invoke('extract-bank-details', {
  body: {
    imageBase64: "/9j/4AAQSkZJRg...", // Base64 של התמונה
    mimeType: "image/jpeg"
  }
})
// Response: {
//   bank_number: "10",
//   branch_number: "800", 
//   account_number: "123456",
//   confidence: 0.95
// }`
                },
                { 
                  name: 'extract-document-data', 
                  desc: 'חילוץ נתוני מסמך', 
                  method: 'POST', 
                  ai: true,
                  params: [
                    { name: 'imageBase64', type: 'string', required: true, desc: 'תמונה בפורמט Base64' },
                    { name: 'mimeType', type: 'string', required: true, desc: 'סוג קובץ' },
                    { name: 'documentType', type: 'string', required: true, desc: 'סוג המסמך' },
                  ],
                  example: `await supabase.functions.invoke('extract-document-data', {
  body: {
    imageBase64: "/9j/4AAQSkZJRg...",
    mimeType: "image/jpeg",
    documentType: "bookkeeping_cert"
  }
})
// Response: {
//   company_id: "123456789",
//   company_name: "חברה לדוגמה בע״מ",
//   phone: "03-1234567",
//   city: "תל אביב"
// }`
                },
                { 
                  name: 'extract-document-text', 
                  desc: 'חילוץ טקסט', 
                  method: 'POST', 
                  ai: true,
                  params: [
                    { name: 'textContent', type: 'string', required: true, desc: 'טקסט שחולץ מהמסמך' },
                    { name: 'documentType', type: 'string', required: true, desc: 'סוג המסמך' },
                  ],
                  example: `await supabase.functions.invoke('extract-document-text', {
  body: {
    textContent: "חברה לדוגמה בע״מ ח.פ. 123456789...",
    documentType: "bookkeeping_cert"
  }
})`
                },
                { 
                  name: 'search-streets', 
                  desc: 'חיפוש רחובות', 
                  method: 'POST', 
                  ai: false,
                  params: [
                    { name: 'city', type: 'string', required: true, desc: 'שם העיר בעברית' },
                    { name: 'query', type: 'string', required: true, desc: 'חיפוש רחוב' },
                  ],
                  example: `await supabase.functions.invoke('search-streets', {
  body: {
    city: "תל אביב",
    query: "דיזנגוף"
  }
})
// Response: { streets: ["דיזנגוף", "דיזנגוף סנטר"] }`
                },
                { 
                  name: 'send-approval-request', 
                  desc: 'בקשת אישור משתמש', 
                  method: 'POST', 
                  ai: false,
                  params: [
                    { name: 'userEmail', type: 'string', required: true, desc: 'אימייל המשתמש' },
                    { name: 'userName', type: 'string', required: true, desc: 'שם המשתמש' },
                    { name: 'approvalToken', type: 'string', required: true, desc: 'טוקן אישור' },
                  ],
                  example: `await supabase.functions.invoke('send-approval-request', {
  body: {
    userEmail: "user@company.com",
    userName: "ישראל ישראלי",
    approvalToken: "uuid-token"
  }
})`
                },
                { 
                  name: 'approve-user', 
                  desc: 'אישור/דחיית משתמש', 
                  method: 'GET', 
                  ai: false,
                  params: [
                    { name: 'token', type: 'string', required: true, desc: 'טוקן האישור (Query param)' },
                    { name: 'action', type: 'string', required: true, desc: "'approve' | 'reject' (Query param)" },
                  ],
                  example: `// נקרא ישירות מלינק באימייל
GET /functions/v1/approve-user?token=abc-123&action=approve

// מפנה לדף תוצאה: /manager-approval-result?status=approved`
                },
                { 
                  name: 'send-manager-approval', 
                  desc: 'שליחת אישור מנהל', 
                  method: 'POST', 
                  ai: false,
                  params: [
                    { name: 'vendorRequestId', type: 'string', required: true, desc: 'מזהה בקשת הספק' },
                    { name: 'managerType', type: 'string', required: true, desc: "'procurement' | 'vp'" },
                    { name: 'managerEmail', type: 'string', required: true, desc: 'אימייל המנהל' },
                    { name: 'managerName', type: 'string', required: true, desc: 'שם המנהל' },
                    { name: 'vendorName', type: 'string', required: true, desc: 'שם הספק' },
                    { name: 'contractPdfBase64', type: 'string', required: false, desc: 'חוזה מצורף ב-Base64' },
                  ],
                  example: `await supabase.functions.invoke('send-manager-approval', {
  body: {
    vendorRequestId: "uuid",
    managerType: "procurement",
    managerEmail: "manager@company.com",
    managerName: "מנהל רכש",
    vendorName: "חברה לדוגמה בע״מ",
    contractPdfBase64: "JVBERi0xLjQK..." // אופציונלי
  }
})`
                },
                { 
                  name: 'handle-manager-approval', 
                  desc: 'טיפול באישור', 
                  method: 'GET', 
                  ai: false,
                  params: [
                    { name: 'id', type: 'string', required: true, desc: 'מזהה הבקשה (Query param)' },
                    { name: 'action', type: 'string', required: true, desc: "'approve' | 'reject' (Query param)" },
                    { name: 'manager', type: 'string', required: true, desc: "'procurement' | 'vp' (Query param)" },
                  ],
                  example: `// נקרא ישירות מלינק באימייל
GET /functions/v1/handle-manager-approval?id=uuid&action=approve&manager=vp`
                },
                { 
                  name: 'send-handler-notification', 
                  desc: 'התראה למטפל', 
                  method: 'POST', 
                  ai: false,
                  params: [
                    { name: 'handlerEmail', type: 'string', required: true, desc: 'אימייל המטפל' },
                    { name: 'handlerName', type: 'string', required: true, desc: 'שם המטפל' },
                    { name: 'vendorName', type: 'string', required: true, desc: 'שם הספק' },
                    { name: 'vendorRequestId', type: 'string', required: true, desc: 'מזהה הבקשה' },
                  ],
                  example: `await supabase.functions.invoke('send-handler-notification', {
  body: {
    handlerEmail: "handler@company.com",
    handlerName: "מטפל בתהליך",
    vendorName: "חברה לדוגמה בע״מ",
    vendorRequestId: "uuid"
  }
})`
                },
                { 
                  name: 'send-vendor-rejection', 
                  desc: 'דחיית ספק', 
                  method: 'POST', 
                  ai: false,
                  params: [
                    { name: 'vendorRequestId', type: 'string', required: true, desc: 'מזהה בקשת הספק' },
                    { name: 'reason', type: 'string', required: true, desc: 'סיבת הדחייה (לשימוש פנימי)' },
                  ],
                  example: `await supabase.functions.invoke('send-vendor-rejection', {
  body: {
    vendorRequestId: "uuid",
    reason: "מסמכים חסרים"
  }
})
// הערה: סיבת הדחייה לא נשלחת לספק באימייל`
                },
                { 
                  name: 'vendor-status', 
                  desc: 'סטטוס ספק', 
                  method: 'POST', 
                  ai: false,
                  params: [
                    { name: 'token', type: 'string', required: true, desc: 'טוקן הבקשה' },
                  ],
                  example: `await supabase.functions.invoke('vendor-status', {
  body: { token: "abc-123" }
})
// Response: {
//   vendor_name: "חברה לדוגמה בע״מ",
//   status: "first_review",
//   created_at: "2024-01-15T10:00:00Z",
//   updated_at: "2024-01-16T14:30:00Z"
// }`
                },
                { 
                  name: 'send-receipts-link', 
                  desc: 'לינק קבלות', 
                  method: 'POST', 
                  ai: false,
                  params: [
                    { name: 'vendorRequestId', type: 'string', required: true, desc: 'מזהה בקשת הספק' },
                    { name: 'vendorEmail', type: 'string', required: true, desc: 'אימייל הספק' },
                    { name: 'vendorName', type: 'string', required: true, desc: 'שם הספק' },
                  ],
                  example: `await supabase.functions.invoke('send-receipts-link', {
  body: {
    vendorRequestId: "uuid",
    vendorEmail: "vendor@example.com",
    vendorName: "חברה לדוגמה בע״מ"
  }
})`
                },
              ].map((fn) => (
                <Card key={fn.name}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <code className="bg-primary/10 px-2 py-1 rounded text-sm">{fn.method}</code>
                        <span className="font-mono text-sm">/functions/v1/{fn.name}</span>
                        {fn.ai && (
                          <span className="bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded text-xs flex items-center gap-1">
                            <Brain className="h-3 w-3" /> AI
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-sm">{fn.desc}</span>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-1">
                              <Eye className="h-3 w-3" />
                              פרטים
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto" dir="rtl">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-3">
                                <code className="bg-primary/10 px-2 py-1 rounded text-sm">{fn.method}</code>
                                <span className="font-mono">/functions/v1/{fn.name}</span>
                                {fn.ai && (
                                  <span className="bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded text-xs flex items-center gap-1">
                                    <Brain className="h-3 w-3" /> AI
                                  </span>
                                )}
                              </DialogTitle>
                            </DialogHeader>
                            
                            <div className="space-y-6 mt-4">
                              {/* Parameters Table */}
                              <div>
                                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                  <Code className="h-4 w-4" />
                                  פרמטרים
                                </h4>
                                <div className="bg-muted rounded-lg overflow-hidden">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="border-b border-border">
                                        <th className="text-right p-3 font-medium">שם</th>
                                        <th className="text-right p-3 font-medium">סוג</th>
                                        <th className="text-right p-3 font-medium">חובה</th>
                                        <th className="text-right p-3 font-medium">תיאור</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {fn.params.map((param) => (
                                        <tr key={param.name} className="border-b border-border/50 last:border-0">
                                          <td className="p-3 font-mono text-xs bg-background/50">{param.name}</td>
                                          <td className="p-3 text-muted-foreground">{param.type}</td>
                                          <td className="p-3">{param.required ? <span className="text-green-600">✓</span> : <span className="text-muted-foreground">-</span>}</td>
                                          <td className="p-3 text-muted-foreground">{param.desc}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                              
                              {/* Code Example */}
                              <div>
                                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                  <FileText className="h-4 w-4" />
                                  דוגמת קריאה
                                </h4>
                                <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs overflow-x-auto" dir="ltr">
                                  <code>{fn.example}</code>
                                </pre>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="database">
            <div className="space-y-4">
              {[
                { name: 'vendor_requests', desc: 'בקשות ספקים', fields: 'id, vendor_name, vendor_email, status, secure_token, handler_name, vendor_type, bank details, approval fields' },
                { name: 'vendor_documents', desc: 'מסמכי ספקים', fields: 'id, vendor_request_id, document_type, file_path, file_name, extracted_tags' },
                { name: 'vendor_receipts', desc: 'קבלות ספקים', fields: 'id, vendor_request_id, amount, receipt_date, status, file_path, description' },
                { name: 'vendor_status_history', desc: 'היסטוריית סטטוסים', fields: 'id, vendor_request_id, old_status, new_status, changed_at, changed_by' },
                { name: 'crm_history', desc: 'היסטוריית CRM', fields: 'id, vendor_request_id, action, field_name, old_value, new_value, changed_at' },
                { name: 'profiles', desc: 'פרופילי משתמשים', fields: 'id, full_name, is_approved, approved_by, approved_at' },
                { name: 'user_roles', desc: 'תפקידי משתמשים', fields: 'id, user_id, role (admin/user)' },
                { name: 'pending_approvals', desc: 'אישורים ממתינים', fields: 'id, user_id, user_email, user_name, status, approval_token' },
                { name: 'app_settings', desc: 'הגדרות מערכת', fields: 'id, setting_key, setting_value' },
              ].map((table) => (
                <Card key={table.name}>
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <Database className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <h3 className="font-semibold">{table.name}</h3>
                        <p className="text-sm text-muted-foreground">{table.desc}</p>
                        <p className="text-xs text-muted-foreground mt-1 font-mono">{table.fields}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="lookups">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <List className="h-5 w-5" />
                    רשימות Metadata במערכת
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Status Labels */}
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <span className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded text-xs">Enum</span>
                      סטטוסי בקשת ספק (vendor_status)
                    </h3>
                    <div className="bg-muted rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-right p-3 font-medium">מזהה</th>
                            <th className="text-right p-3 font-medium">תווית עברית</th>
                            <th className="text-right p-3 font-medium">תיאור</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { key: 'pending', label: 'ממתין לספק', desc: 'נוצרה בקשה, לינק נשלח' },
                            { key: 'with_vendor', label: 'ממתין לספק', desc: 'הספק בתהליך מילוי הטופס' },
                            { key: 'submitted', label: 'ממתין לאישור מנהלים', desc: 'הספק שלח את הטופס' },
                            { key: 'first_review', label: 'בקרה ראשונה', desc: 'ממתין לאישור מטפל' },
                            { key: 'approved', label: 'אושר', desc: 'הספק אושר לחלוטין' },
                            { key: 'resent', label: 'נשלח מחדש', desc: 'הטופס נשלח מחדש לספק' },
                            { key: 'rejected', label: 'נדחה', desc: 'הבקשה נדחתה' },
                          ].map((item) => (
                            <tr key={item.key} className="border-b border-border/50 last:border-0">
                              <td className="p-3 font-mono text-xs bg-background/50">{item.key}</td>
                              <td className="p-3">{item.label}</td>
                              <td className="p-3 text-muted-foreground">{item.desc}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      <strong>קובץ:</strong> src/types/vendor.ts → STATUS_LABELS
                    </p>
                  </div>

                  {/* CRM Status Labels */}
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <span className="bg-green-100 dark:bg-green-900 px-2 py-1 rounded text-xs">Enum</span>
                      סטטוסי CRM (crm_vendor_status)
                    </h3>
                    <div className="bg-muted rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-right p-3 font-medium">מזהה</th>
                            <th className="text-right p-3 font-medium">תווית עברית</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { key: 'active', label: 'פעיל' },
                            { key: 'suspended', label: 'מושהה' },
                            { key: 'closed', label: 'סגור' },
                            { key: 'vip', label: 'VIP' },
                          ].map((item) => (
                            <tr key={item.key} className="border-b border-border/50 last:border-0">
                              <td className="p-3 font-mono text-xs bg-background/50">{item.key}</td>
                              <td className="p-3">{item.label}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      <strong>קובץ:</strong> src/types/vendor.ts → CRM_STATUS_LABELS
                    </p>
                  </div>

                  {/* Vendor Type Labels */}
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <span className="bg-purple-100 dark:bg-purple-900 px-2 py-1 rounded text-xs">Enum</span>
                      סוגי ספקים (vendor_type)
                    </h3>
                    <div className="bg-muted rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-right p-3 font-medium">מזהה</th>
                            <th className="text-right p-3 font-medium">תווית עברית</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { key: 'general', label: 'ספק כללי' },
                            { key: 'claims', label: 'ספק תביעות' },
                          ].map((item) => (
                            <tr key={item.key} className="border-b border-border/50 last:border-0">
                              <td className="p-3 font-mono text-xs bg-background/50">{item.key}</td>
                              <td className="p-3">{item.label}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      <strong>קובץ:</strong> src/types/vendor.ts → VENDOR_TYPE_LABELS
                    </p>
                  </div>

                  {/* Claims Area Labels */}
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <span className="bg-orange-100 dark:bg-orange-900 px-2 py-1 rounded text-xs">Enum</span>
                      אזורי תביעות (claims_area)
                    </h3>
                    <div className="bg-muted rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-right p-3 font-medium">מזהה</th>
                            <th className="text-right p-3 font-medium">תווית עברית</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { key: 'home', label: 'דירה' },
                            { key: 'car', label: 'רכב' },
                            { key: 'life', label: 'חיים' },
                            { key: 'health', label: 'בריאות' },
                          ].map((item) => (
                            <tr key={item.key} className="border-b border-border/50 last:border-0">
                              <td className="p-3 font-mono text-xs bg-background/50">{item.key}</td>
                              <td className="p-3">{item.label}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      <strong>קובץ:</strong> src/types/vendor.ts → CLAIMS_AREA_LABELS
                    </p>
                  </div>

                  {/* Claims Sub-Category Labels */}
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <span className="bg-red-100 dark:bg-red-900 px-2 py-1 rounded text-xs">Enum</span>
                      תתי-קטגוריות תביעות (claims_sub_category)
                    </h3>
                    <div className="bg-muted rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-right p-3 font-medium">מזהה</th>
                            <th className="text-right p-3 font-medium">תווית עברית</th>
                            <th className="text-right p-3 font-medium">אזור תביעות</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { key: 'garage', label: 'מוסך', area: 'רכב' },
                            { key: 'appraiser', label: 'שמאי', area: 'רכב' },
                            { key: 'doctor', label: 'רופא', area: 'חיים / בריאות' },
                            { key: 'lawyer', label: 'עורך דין', area: 'חיים / בריאות' },
                            { key: 'plumber', label: 'שרברב', area: 'דירה' },
                            { key: 'management', label: 'חברת ניהול', area: 'דירה' },
                          ].map((item) => (
                            <tr key={item.key} className="border-b border-border/50 last:border-0">
                              <td className="p-3 font-mono text-xs bg-background/50">{item.key}</td>
                              <td className="p-3">{item.label}</td>
                              <td className="p-3 text-muted-foreground">{item.area}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      <strong>קובץ:</strong> src/types/vendor.ts → CLAIMS_SUB_CATEGORY_LABELS
                    </p>
                  </div>

                  {/* Payment Method Labels */}
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <span className="bg-cyan-100 dark:bg-cyan-900 px-2 py-1 rounded text-xs">Enum</span>
                      אמצעי תשלום (payment_method)
                    </h3>
                    <div className="bg-muted rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-right p-3 font-medium">מזהה</th>
                            <th className="text-right p-3 font-medium">תווית עברית</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { key: 'check', label: 'המחאה' },
                            { key: 'invoice', label: 'מס"ב' },
                            { key: 'transfer', label: 'העברה בנקאית' },
                          ].map((item) => (
                            <tr key={item.key} className="border-b border-border/50 last:border-0">
                              <td className="p-3 font-mono text-xs bg-background/50">{item.key}</td>
                              <td className="p-3">{item.label}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      <strong>קובץ:</strong> src/types/vendor.ts → PAYMENT_METHOD_LABELS
                    </p>
                  </div>

                  {/* Document Type Labels */}
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <span className="bg-yellow-100 dark:bg-yellow-900 px-2 py-1 rounded text-xs">Enum</span>
                      סוגי מסמכים (document_type)
                    </h3>
                    <div className="bg-muted rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-right p-3 font-medium">מזהה</th>
                            <th className="text-right p-3 font-medium">תווית עברית</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { key: 'bookkeeping_cert', label: 'אישור ניהול ספרים' },
                            { key: 'tax_cert', label: 'אישור ניכוי מס במקור' },
                            { key: 'bank_confirmation', label: 'צילום המחאה / אישור בנק' },
                            { key: 'invoice_screenshot', label: 'צילום חשבונית' },
                          ].map((item) => (
                            <tr key={item.key} className="border-b border-border/50 last:border-0">
                              <td className="p-3 font-mono text-xs bg-background/50">{item.key}</td>
                              <td className="p-3">{item.label}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      <strong>קובץ:</strong> src/types/vendor.ts → DOCUMENT_TYPE_LABELS
                    </p>
                  </div>

                  {/* Israel Banks */}
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <span className="bg-indigo-100 dark:bg-indigo-900 px-2 py-1 rounded text-xs">Static Data</span>
                      רשימת בנקים ישראליים (ISRAEL_BANKS)
                    </h3>
                    <div className="bg-muted rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-right p-3 font-medium">קוד בנק</th>
                            <th className="text-right p-3 font-medium">שם הבנק</th>
                            <th className="text-right p-3 font-medium">ספרות בחשבון</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { code: '10', name: 'בנק לאומי לישראל', digits: 8 },
                            { code: '11', name: 'בנק דיסקונט לישראל', digits: 9 },
                            { code: '12', name: 'בנק הפועלים', digits: 9 },
                            { code: '13', name: 'בנק אגוד לישראל', digits: 6 },
                            { code: '14', name: 'בנק אוצר החייל', digits: 7 },
                            { code: '17', name: 'בנק מרכנתיל דיסקונט', digits: 9 },
                            { code: '20', name: 'בנק מזרחי טפחות', digits: 6 },
                            { code: '31', name: 'הבנק הבינלאומי הראשון', digits: 9 },
                            { code: '34', name: 'בנק ערבי ישראלי', digits: 9 },
                            { code: '46', name: 'בנק מסד', digits: 9 },
                            { code: '52', name: 'בנק פועלי אגודת ישראל', digits: 9 },
                            { code: '54', name: 'בנק ירושלים', digits: 9 },
                            { code: '99', name: 'בנק ישראל', digits: 9 },
                          ].map((item) => (
                            <tr key={item.code} className="border-b border-border/50 last:border-0">
                              <td className="p-3 font-mono text-xs bg-background/50">{item.code}</td>
                              <td className="p-3">{item.name}</td>
                              <td className="p-3 text-muted-foreground">{item.digits}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      <strong>קובץ:</strong> src/data/israelBanks.ts → ISRAEL_BANKS
                    </p>
                  </div>

                  {/* Bank Branches Summary */}
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <span className="bg-indigo-100 dark:bg-indigo-900 px-2 py-1 rounded text-xs">Static Data</span>
                      סניפי בנקים (BANK_BRANCHES)
                    </h3>
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="text-sm mb-2">רשימה מקיפה של סניפי בנקים בישראל, מאורגנת לפי שם הבנק.</p>
                      <p className="text-sm text-muted-foreground">כל סניף כולל: קוד סניף (3-4 ספרות), שם הסניף, ועיר.</p>
                      <div className="mt-3 text-xs bg-background p-3 rounded">
                        <strong>מבנה:</strong>
                        <pre className="mt-1" dir="ltr">{`{
  "בנק לאומי לישראל": [
    { code: "800", name: "סניף ראשי תל אביב", city: "תל אביב" },
    ...
  ],
  ...
}`}</pre>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      <strong>קובץ:</strong> src/data/bankBranches.ts → BANK_BRANCHES (658 שורות)
                    </p>
                  </div>

                  {/* Israel Cities */}
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <span className="bg-teal-100 dark:bg-teal-900 px-2 py-1 rounded text-xs">Static Data</span>
                      רשימת ערים וישובים בישראל (ISRAEL_CITIES)
                    </h3>
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="text-sm mb-2">רשימה מקיפה של כ-900+ ערים וישובים בישראל.</p>
                      <p className="text-sm text-muted-foreground">משמש ב-autocomplete של שדה העיר בטופס הספק.</p>
                      <div className="mt-3 flex flex-wrap gap-1">
                        {['תל אביב', 'ירושלים', 'חיפה', 'באר שבע', 'אשדוד', 'ראשון לציון', 'פתח תקווה', 'נתניה', 'חולון', 'רמת גן'].map((city) => (
                          <span key={city} className="bg-background px-2 py-1 rounded text-xs">{city}</span>
                        ))}
                        <span className="text-muted-foreground text-xs px-2 py-1">+890 נוספים...</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      <strong>קובץ:</strong> src/data/israelCities.ts → ISRAEL_CITIES (1155 שורות)
                    </p>
                  </div>

                  {/* App Settings Keys */}
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs">DB Settings</span>
                      מפתחות הגדרות מערכת (app_settings)
                    </h3>
                    <div className="bg-muted rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-right p-3 font-medium">setting_key</th>
                            <th className="text-right p-3 font-medium">תיאור</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { key: 'master_otp', desc: 'קוד OTP מאסטר לגישה לטופס (ברירת מחדל: 111111)' },
                            { key: 'procurement_manager_email', desc: 'כתובת מייל מנהל רכש' },
                            { key: 'procurement_manager_name', desc: 'שם מנהל רכש' },
                            { key: 'vp_email', desc: 'כתובת מייל סמנכ"ל' },
                            { key: 'vp_name', desc: 'שם סמנכ"ל' },
                          ].map((item) => (
                            <tr key={item.key} className="border-b border-border/50 last:border-0">
                              <td className="p-3 font-mono text-xs bg-background/50">{item.key}</td>
                              <td className="p-3 text-muted-foreground">{item.desc}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      <strong>טבלה:</strong> app_settings (ניתן לעריכה דרך Settings Dialog)
                    </p>
                  </div>

                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="services">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Brain className="h-5 w-5" />
                    Lovable AI Gateway
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <p><strong>Endpoint:</strong> ai.gateway.lovable.dev</p>
                    <p><strong>Model:</strong> google/gemini-2.5-flash</p>
                    <p><strong>Token:</strong> LOVABLE_API_KEY</p>
                    <p><strong>עלות:</strong> ~$0.001-0.005/בקשה</p>
                    <p><strong>שימוש:</strong> OCR, חילוץ נתונים</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Mail className="h-5 w-5" />
                    Gmail SMTP
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <p><strong>Server:</strong> smtp.gmail.com:465</p>
                    <p><strong>Protocol:</strong> SMTP over TLS</p>
                    <p><strong>Tokens:</strong> GMAIL_USER, GMAIL_APP_PASSWORD</p>
                    <p><strong>עלות:</strong> חינם</p>
                    <p><strong>מגבלה:</strong> 500 הודעות/יום</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Database className="h-5 w-5" />
                    Supabase
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <p><strong>Database:</strong> PostgreSQL</p>
                    <p><strong>Auth:</strong> Email/Password</p>
                    <p><strong>Storage:</strong> vendor_documents bucket</p>
                    <p><strong>Edge Functions:</strong> 17 functions</p>
                    <p><strong>Tokens:</strong> SUPABASE_URL, ANON_KEY, SERVICE_ROLE_KEY</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5" />
                    OpenStreetMap
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <p><strong>API:</strong> Nominatim</p>
                    <p><strong>שימוש:</strong> השלמת רחובות</p>
                    <p><strong>Token:</strong> לא נדרש</p>
                    <p><strong>עלות:</strong> חינם</p>
                    <p><strong>מגבלה:</strong> 1 בקשה/שנייה</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SystemDocumentation;
