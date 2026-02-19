export const generateIntegrationsDoc = (): string => {
  const styles = `
    <style>
      body { font-family: 'Arial', sans-serif; direction: rtl; text-align: right; padding: 30px; max-width: 900px; margin: 0 auto; }
      h1 { color: #1a365d; border-bottom: 3px solid #3182ce; padding-bottom: 10px; }
      h2 { color: #2c5282; margin-top: 35px; background: #ebf8ff; padding: 10px 15px; border-radius: 5px; }
      h3 { color: #2b6cb0; margin-top: 20px; }
      table { width: 100%; border-collapse: collapse; margin: 15px 0; }
      th { background: #3182ce; color: white; padding: 10px; text-align: right; }
      td { border: 1px solid #e2e8f0; padding: 8px; vertical-align: top; }
      tr:nth-child(even) { background: #f7fafc; }
      .badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: bold; margin: 2px; }
      .badge-external { background: #fed7d7; color: #9b2c2c; }
      .badge-internal { background: #c6f6d5; color: #276749; }
      .badge-email { background: #fefcbf; color: #975a16; }
      .badge-ai { background: #e9d8fd; color: #553c9a; }
      .section { margin: 20px 0; padding: 15px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fafafa; }
      .flow { background: #f0fff4; padding: 15px; border-radius: 8px; border-right: 4px solid #38a169; margin: 10px 0; }
      .note { background: #fffff0; padding: 10px; border-radius: 5px; border-right: 3px solid #d69e2e; margin: 10px 0; font-size: 14px; }
      code { background: #edf2f7; padding: 2px 6px; border-radius: 3px; font-family: monospace; direction: ltr; display: inline-block; }
      ul { padding-right: 20px; }
      li { margin: 5px 0; }
    </style>
  `;

  const content = `
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head>
      <meta charset="UTF-8">
      ${styles}
    </head>
    <body>
      <h1>🔗 מסמך אינטגרציות ודפים חיצוניים - מערכת ספק בקליק</h1>
      <p><strong>תאריך יצירה:</strong> ${new Date().toLocaleDateString('he-IL')}</p>
      <p><strong>ארגון:</strong> ביטוח ישיר</p>

      <!-- ==================== חלק 1: דפים חיצוניים ==================== -->
      <h2>📱 חלק א׳: דפים חיצוניים (נגישים לספקים)</h2>
      <p>דפים אלו נגישים לספקים חיצוניים ללא צורך בהתחברות למערכת. הגישה מתבצעת באמצעות קישור מאובטח עם טוקן ייחודי.</p>

      <div class="section">
        <h3>1. טופס מילוי פרטי ספק</h3>
        <table>
          <tr><th width="25%">שדה</th><th>פירוט</th></tr>
          <tr><td>נתיב</td><td><code>/vendor/:token</code></td></tr>
          <tr><td>קומפוננטה</td><td><code>VendorForm.tsx</code></td></tr>
          <tr><td>סוג</td><td><span class="badge badge-external">חיצוני - ספק</span></td></tr>
          <tr><td>אימות</td><td>טוקן מאובטח + קוד OTP למייל</td></tr>
          <tr><td>תיאור</td><td>
            טופס מקיף שבו הספק ממלא את כל הפרטים הנדרשים להקמה בארגון:
            <ul>
              <li><strong>שלב 1:</strong> אימות זהות - הספק מזין את המייל שלו ומקבל קוד OTP לאימות</li>
              <li><strong>שלב 2:</strong> העלאת מסמכים - אישור ניהול ספרים, אישור ניכוי מס, צילום המחאה/אישור בנק, צילום חשבונית</li>
              <li><strong>שלב 3:</strong> מילוי פרטים - פרטי חברה (ח.פ, טלפון, כתובת), אנשי קשר, פרטי בנק, אמצעי תשלום</li>
              <li><strong>שלב 4:</strong> העלאת הצעת מחיר חתומה (אופציונלי) + העלאת חוזה חתום (אם נדרש)</li>
            </ul>
          </td></tr>
          <tr><td>Edge Functions</td><td>
            <code>vendor-form-api</code> - קריאה/עדכון/שליחת הטופס<br>
            <code>send-vendor-otp</code> - שליחת קוד אימות<br>
            <code>verify-vendor-otp</code> - אימות קוד OTP<br>
            <code>vendor-upload</code> - העלאת מסמכים<br>
            <code>classify-document</code> - זיהוי אוטומטי של סוג המסמך<br>
            <code>extract-bank-details</code> - חילוץ פרטי בנק מהמסמכים<br>
            <code>extract-document-data</code> - חילוץ נתונים מהמסמכים
          </td></tr>
          <tr><td>הודעות יוצאות</td><td>
            בסיום מילוי הטופס נשלחת התראה למטפל (<code>send-handler-notification</code>)
          </td></tr>
        </table>
      </div>

      <div class="section">
        <h3>2. עמוד סטטוס בקשת ספק</h3>
        <table>
          <tr><th width="25%">שדה</th><th>פירוט</th></tr>
          <tr><td>נתיב</td><td><code>/vendor-status/:token</code></td></tr>
          <tr><td>קומפוננטה</td><td><code>VendorStatus.tsx</code></td></tr>
          <tr><td>סוג</td><td><span class="badge badge-external">חיצוני - ספק</span></td></tr>
          <tr><td>אימות</td><td>טוקן מאובטח</td></tr>
          <tr><td>תיאור</td><td>
            עמוד המאפשר לספק לצפות בסטטוס הבקשה שלו בזמן אמת. הספק רואה:
            <ul>
              <li>שלב נוכחי בתהליך (ממתין, הוגש, בקרה ראשונה, אושר, נדחה)</li>
              <li>פרטי הבקשה שהוגשו</li>
              <li>הודעות מהמטפל (במקרה של דחייה - סיבת הדחייה)</li>
            </ul>
          </td></tr>
          <tr><td>Edge Functions</td><td><code>vendor-status</code> - שליפת סטטוס הבקשה</td></tr>
        </table>
      </div>

      <div class="section">
        <h3>3. עמוד העלאת קבלות</h3>
        <table>
          <tr><th width="25%">שדה</th><th>פירוט</th></tr>
          <tr><td>נתיב</td><td><code>/vendor-receipts/:token</code></td></tr>
          <tr><td>קומפוננטה</td><td><code>VendorReceipts.tsx</code></td></tr>
          <tr><td>סוג</td><td><span class="badge badge-external">חיצוני - ספק</span></td></tr>
          <tr><td>אימות</td><td>טוקן מאובטח</td></tr>
          <tr><td>תיאור</td><td>
            עמוד שנשלח לספק לאחר שהבקשה אושרה, המאפשר לו להעלות קבלות:
            <ul>
              <li>העלאת קובץ קבלה (PDF/תמונה)</li>
              <li>ציון סכום, תאריך ותיאור הקבלה</li>
              <li>צפייה בקבלות קודמות שהועלו וסטטוס כל אחת (ממתין/אושר/נדחה)</li>
            </ul>
          </td></tr>
          <tr><td>Edge Functions</td><td>
            <code>vendor-receipts-data</code> - שליפת נתוני קבלות<br>
            <code>vendor-receipt-upload</code> - העלאת קבלה חדשה
          </td></tr>
        </table>
      </div>

      <div class="section">
        <h3>4. עמוד הגשת הצעת מחיר</h3>
        <table>
          <tr><th width="25%">שדה</th><th>פירוט</th></tr>
          <tr><td>נתיב</td><td><code>/vendor-quote/:token</code></td></tr>
          <tr><td>קומפוננטה</td><td><code>VendorQuoteSubmit.tsx</code></td></tr>
          <tr><td>סוג</td><td><span class="badge badge-external">חיצוני - ספק</span></td></tr>
          <tr><td>אימות</td><td>טוקן מאובטח (quote_secure_token)</td></tr>
          <tr><td>תיאור</td><td>
            עמוד שנשלח לספק להגשת הצעת מחיר:
            <ul>
              <li>העלאת קובץ הצעת מחיר (PDF)</li>
              <li>ציון סכום ותיאור ההצעה</li>
              <li>הצעה נכנסת לתהליך אישור רב-שלבי</li>
            </ul>
          </td></tr>
          <tr><td>Edge Functions</td><td>
            <code>vendor-quote-details</code> - שליפת פרטי ההצעה<br>
            <code>vendor-quote-submit</code> - הגשת הצעה
          </td></tr>
        </table>
      </div>

      <div class="section">
        <h3>5. עמוד אישור הצעת מחיר (מנהלים)</h3>
        <table>
          <tr><th width="25%">שדה</th><th>פירוט</th></tr>
          <tr><td>נתיב</td><td><code>/quote-approval/:token</code></td></tr>
          <tr><td>קומפוננטה</td><td><code>QuoteApproval.tsx</code></td></tr>
          <tr><td>סוג</td><td><span class="badge badge-external">חיצוני - מנהל</span></td></tr>
          <tr><td>אימות</td><td>טוקן מאובטח</td></tr>
          <tr><td>תיאור</td><td>
            עמוד חיצוני שנשלח למנהלים (סמנכ"ל / מנהל רכש) לצפייה ואישור/דחיית הצעת מחיר.
            כולל חתימה דיגיטלית על ההצעה.
          </td></tr>
        </table>
      </div>

      <div class="section">
        <h3>6. עמוד תוצאת אישור מנהל</h3>
        <table>
          <tr><th width="25%">שדה</th><th>פירוט</th></tr>
          <tr><td>נתיב</td><td><code>/manager-approval-result</code></td></tr>
          <tr><td>קומפוננטה</td><td><code>ManagerApprovalResult.tsx</code></td></tr>
          <tr><td>סוג</td><td><span class="badge badge-external">חיצוני - מנהל</span></td></tr>
          <tr><td>תיאור</td><td>
            עמוד שמציג את תוצאת האישור/דחייה של בקשת ספק ע"י מנהל.
            המנהל מגיע לעמוד זה לאחר לחיצה על קישור האישור במייל.
          </td></tr>
          <tr><td>Edge Functions</td><td><code>handle-manager-approval</code> - עיבוד החלטת המנהל</td></tr>
        </table>
      </div>

      <!-- ==================== חלק 2: דפים פנימיים ==================== -->
      <h2>🏢 חלק ב׳: דפים פנימיים (למשתמשי המערכת)</h2>

      <div class="section">
        <table>
          <tr><th>נתיב</th><th>קומפוננטה</th><th>תיאור</th></tr>
          <tr><td><code>/</code></td><td>Dashboard</td><td>לוח בקרה ראשי - ניהול בקשות ספקים, יצירת בקשות, מעקב סטטוסים</td></tr>
          <tr><td><code>/auth</code></td><td>Auth</td><td>עמוד התחברות/הרשמה למערכת</td></tr>
          <tr><td><code>/crm</code></td><td>CRM</td><td>ניהול ספקים מאושרים - הצעות מחיר, קבלות, דירוג, סטטוסים</td></tr>
          <tr><td><code>/documentation</code></td><td>SystemDocumentation</td><td>תיעוד מערכת מלא</td></tr>
          <tr><td><code>/database-docs</code></td><td>DatabaseDocumentation</td><td>תיעוד מבנה מסד הנתונים</td></tr>
          <tr><td><code>/presentation</code></td><td>Presentation</td><td>מצגת המערכת</td></tr>
        </table>
      </div>

      <!-- ==================== חלק 3: Edge Functions ==================== -->
      <h2>⚡ חלק ג׳: אינטגרציות - Edge Functions</h2>
      <p>כל ה-Edge Functions רצות ב-Supabase ומתקשרות עם שירותים חיצוניים.</p>

      <h3>📧 פונקציות שליחת מיילים (Gmail SMTP)</h3>
      <div class="note">כל המיילים נשלחים באמצעות Gmail SMTP עם הגדרות <code>GMAIL_USER</code> ו-<code>GMAIL_APP_PASSWORD</code></div>
      <table>
        <tr><th>Edge Function</th><th>תיאור</th><th>נמען</th><th>תוכן</th></tr>
        <tr>
          <td><code>send-vendor-email</code></td>
          <td>שליחת קישור ראשוני לספק</td>
          <td><span class="badge badge-external">ספק</span></td>
          <td>קישור למילוי טופס הספק (<code>/vendor/:token</code>)</td>
        </tr>
        <tr>
          <td><code>send-vendor-otp</code></td>
          <td>שליחת קוד אימות</td>
          <td><span class="badge badge-external">ספק</span></td>
          <td>קוד OTP חד-פעמי לאימות זהות</td>
        </tr>
        <tr>
          <td><code>send-vendor-confirmation</code></td>
          <td>אישור הגשת טופס</td>
          <td><span class="badge badge-external">ספק</span></td>
          <td>הודעת אישור שהטופס התקבל בהצלחה</td>
        </tr>
        <tr>
          <td><code>send-vendor-rejection</code></td>
          <td>הודעת דחייה</td>
          <td><span class="badge badge-external">ספק</span></td>
          <td>הודעה על דחיית הבקשה עם סיבה</td>
        </tr>
        <tr>
          <td><code>send-handler-notification</code></td>
          <td>התראה למטפל</td>
          <td><span class="badge badge-internal">מטפל</span></td>
          <td>הודעה שספק סיים למלא את הטופס</td>
        </tr>
        <tr>
          <td><code>send-approval-request</code></td>
          <td>בקשת אישור מנהל</td>
          <td><span class="badge badge-internal">מנהל</span></td>
          <td>קישור לאישור/דחיית בקשת ספק</td>
        </tr>
        <tr>
          <td><code>send-manager-approval</code></td>
          <td>שליחה לאישור מנהלים (חוזה)</td>
          <td><span class="badge badge-internal">מנהל</span></td>
          <td>קישור לחתימה דיגיטלית על חוזה + PDF מצורף</td>
        </tr>
        <tr>
          <td><code>send-expiry-reminder</code></td>
          <td>תזכורת תפוגת קישור</td>
          <td><span class="badge badge-external">ספק</span></td>
          <td>התראה שהקישור עומד לפוג תוך 24 שעות</td>
        </tr>
        <tr>
          <td><code>send-receipts-link</code></td>
          <td>שליחת קישור קבלות</td>
          <td><span class="badge badge-external">ספק</span></td>
          <td>קישור להעלאת קבלות (<code>/vendor-receipts/:token</code>)</td>
        </tr>
        <tr>
          <td><code>send-receipt-status</code></td>
          <td>עדכון סטטוס קבלה</td>
          <td><span class="badge badge-external">ספק</span></td>
          <td>הודעה על אישור/דחיית קבלה</td>
        </tr>
        <tr>
          <td><code>send-quote-request</code></td>
          <td>בקשת הצעת מחיר</td>
          <td><span class="badge badge-external">ספק</span></td>
          <td>קישור להגשת הצעת מחיר (<code>/vendor-quote/:token</code>)</td>
        </tr>
        <tr>
          <td><code>send-quote-approval-email</code></td>
          <td>אישור הצעת מחיר</td>
          <td><span class="badge badge-internal">מנהל</span></td>
          <td>קישור לאישור/דחיית הצעת מחיר (<code>/quote-approval/:token</code>)</td>
        </tr>
      </table>

      <h3>🤖 פונקציות AI (Google Gemini API)</h3>
      <div class="note">שימוש ב-Google Gemini API באמצעות <code>GOOGLE_GEMINI_API_KEY</code></div>
      <table>
        <tr><th>Edge Function</th><th>תיאור</th><th>קלט</th><th>פלט</th></tr>
        <tr>
          <td><code>classify-document</code></td>
          <td>זיהוי אוטומטי של סוג מסמך</td>
          <td>תמונה/PDF של מסמך</td>
          <td>סוג: אישור ניהול ספרים / ניכוי מס / המחאה / חשבונית</td>
        </tr>
        <tr>
          <td><code>extract-bank-details</code></td>
          <td>חילוץ פרטי בנק</td>
          <td>תמונת המחאה/אישור בנק</td>
          <td>שם בנק, סניף, מספר חשבון</td>
        </tr>
        <tr>
          <td><code>extract-document-data</code></td>
          <td>חילוץ נתונים ממסמכים</td>
          <td>מסמך שהועלה</td>
          <td>פרטי חברה, מספרים, תאריכים</td>
        </tr>
        <tr>
          <td><code>extract-document-text</code></td>
          <td>חילוץ טקסט ממסמכים</td>
          <td>מסמך PDF/תמונה</td>
          <td>טקסט מלא של המסמך</td>
        </tr>
        <tr>
          <td><code>detect-signature-position</code></td>
          <td>זיהוי מיקום חתימה</td>
          <td>PDF חוזה</td>
          <td>מיקום X,Y להטמעת חתימה דיגיטלית</td>
        </tr>
      </table>

      <h3>🔧 פונקציות שירות</h3>
      <table>
        <tr><th>Edge Function</th><th>תיאור</th></tr>
        <tr><td><code>vendor-form-api</code></td><td>API מרכזי לטופס הספק - קריאה, עדכון, שליחה, מחיקת מסמכים</td></tr>
        <tr><td><code>vendor-upload</code></td><td>העלאת מסמכים ל-Storage</td></tr>
        <tr><td><code>vendor-status</code></td><td>שליפת סטטוס בקשה לפי טוקן</td></tr>
        <tr><td><code>vendor-quote-details</code></td><td>שליפת פרטי הצעת מחיר לפי טוקן</td></tr>
        <tr><td><code>vendor-quote-submit</code></td><td>הגשת הצעת מחיר ע"י ספק</td></tr>
        <tr><td><code>vendor-receipt-upload</code></td><td>העלאת קבלה ע"י ספק</td></tr>
        <tr><td><code>vendor-receipts-data</code></td><td>שליפת נתוני קבלות לפי טוקן</td></tr>
        <tr><td><code>handle-manager-approval</code></td><td>עיבוד תשובת מנהל (אישור/דחייה) + שליחת מייל לספק</td></tr>
        <tr><td><code>approve-user</code></td><td>אישור משתמש חדש ע"י מנהל מערכת</td></tr>
        <tr><td><code>search-streets</code></td><td>חיפוש רחובות לפי עיר (שירות חיצוני)</td></tr>
        <tr><td><code>verify-vendor-otp</code></td><td>אימות קוד OTP שנשלח לספק</td></tr>
      </table>

      <!-- ==================== חלק 4: שירותים חיצוניים ==================== -->
      <h2>🌐 חלק ד׳: שירותים חיצוניים משולבים</h2>
      <table>
        <tr><th>שירות</th><th>שימוש</th><th>Secret</th></tr>
        <tr>
          <td><strong>Gmail SMTP</strong></td>
          <td>שליחת כל המיילים במערכת (לספקים ולמנהלים)</td>
          <td><code>GMAIL_USER</code>, <code>GMAIL_APP_PASSWORD</code></td>
        </tr>
        <tr>
          <td><strong>Google Gemini API</strong></td>
          <td>זיהוי מסמכים, חילוץ נתונים, זיהוי חתימות</td>
          <td><code>GOOGLE_GEMINI_API_KEY</code></td>
        </tr>
        <tr>
          <td><strong>Supabase Auth</strong></td>
          <td>ניהול משתמשים, הרשמה, התחברות</td>
          <td><code>SUPABASE_URL</code>, <code>SUPABASE_ANON_KEY</code></td>
        </tr>
        <tr>
          <td><strong>Supabase Storage</strong></td>
          <td>אחסון מסמכים, קבלות, הצעות מחיר, חוזים</td>
          <td>bucket: <code>vendor_documents</code></td>
        </tr>
        <tr>
          <td><strong>Supabase Database</strong></td>
          <td>מסד נתונים PostgreSQL - כל הטבלאות והפונקציות</td>
          <td><code>SUPABASE_DB_URL</code></td>
        </tr>
      </table>

      <!-- ==================== חלק 5: תרשים זרימה ==================== -->
      <h2>🔄 חלק ה׳: תרשים זרימת קישורים לספק</h2>
      <div class="flow">
        <p><strong>1. יצירת בקשה</strong> → מטפל יוצר בקשה בדשבורד</p>
        <p>↓ <code>send-vendor-email</code></p>
        <p><strong>2. קישור לטופס</strong> → ספק מקבל מייל עם קישור ל-<code>/vendor/:token</code></p>
        <p>↓ ספק ממלא ושולח</p>
        <p><strong>3. התראה למטפל</strong> → <code>send-handler-notification</code></p>
        <p>↓ מטפל מאשר</p>
        <p><strong>4. בקשת אישור</strong> → <code>send-approval-request</code> / <code>send-manager-approval</code></p>
        <p>↓ מנהל מאשר</p>
        <p><strong>5. אישור סופי</strong> → <code>handle-manager-approval</code> → שולח לספק קישור קבלות</p>
        <p>↓ <code>send-receipts-link</code></p>
        <p><strong>6. העלאת קבלות</strong> → ספק מעלה קבלות ב-<code>/vendor-receipts/:token</code></p>
      </div>

      <div class="flow">
        <p><strong>תהליך הצעות מחיר (במקביל):</strong></p>
        <p><code>send-quote-request</code> → ספק מגיש ב-<code>/vendor-quote/:token</code></p>
        <p>↓ <code>send-quote-approval-email</code></p>
        <p>סמנכ"ל מאשר ב-<code>/quote-approval/:token</code> → מנהל רכש מאשר</p>
      </div>

      <h2>🔑 חלק ו׳: סיכום Secrets</h2>
      <table>
        <tr><th>Secret</th><th>שימוש</th><th>היכן</th></tr>
        <tr><td><code>GMAIL_USER</code></td><td>כתובת Gmail לשליחת מיילים</td><td>כל פונקציות המייל</td></tr>
        <tr><td><code>GMAIL_APP_PASSWORD</code></td><td>סיסמת אפליקציה של Gmail</td><td>כל פונקציות המייל</td></tr>
        <tr><td><code>GOOGLE_GEMINI_API_KEY</code></td><td>מפתח Google Gemini API</td><td>זיהוי וחילוץ מסמכים</td></tr>
        <tr><td><code>SUPABASE_URL</code></td><td>כתובת פרויקט Supabase</td><td>כל ה-Edge Functions</td></tr>
        <tr><td><code>SUPABASE_SERVICE_ROLE_KEY</code></td><td>מפתח שירות (גישה מלאה)</td><td>כל ה-Edge Functions</td></tr>
        <tr><td><code>SUPABASE_ANON_KEY</code></td><td>מפתח ציבורי</td><td>צד לקוח</td></tr>
        <tr><td><code>ADMIN_EMAIL</code></td><td>מייל מנהל מערכת</td><td>שליחת התראות</td></tr>
      </table>

    </body>
    </html>
  `;

  return content;
};

export const downloadIntegrationsDoc = () => {
  const content = generateIntegrationsDoc();
  const blob = new Blob([content], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `אינטגרציות-ודפים-חיצוניים-ספק-בקליק-${new Date().toLocaleDateString('he-IL').replace(/\./g, '-')}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
