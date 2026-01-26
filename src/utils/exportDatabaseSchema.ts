export const generateDatabaseSchemaDoc = (): string => {
  const styles = `
    <style>
      body { font-family: 'Arial', sans-serif; direction: rtl; text-align: right; padding: 20px; }
      h1 { color: #1a365d; border-bottom: 2px solid #3182ce; padding-bottom: 10px; }
      h2 { color: #2c5282; margin-top: 30px; background: #ebf8ff; padding: 10px; border-radius: 5px; }
      h3 { color: #2b6cb0; margin-top: 20px; }
      table { width: 100%; border-collapse: collapse; margin: 15px 0; }
      th { background: #3182ce; color: white; padding: 10px; text-align: right; }
      td { border: 1px solid #e2e8f0; padding: 8px; }
      tr:nth-child(even) { background: #f7fafc; }
      .connection { background: #f0fff4; padding: 5px 10px; border-radius: 3px; color: #276749; font-weight: bold; }
      .enum { background: #faf5ff; padding: 2px 6px; border-radius: 3px; color: #553c9a; }
      .required { color: #c53030; }
      .section { margin: 20px 0; padding: 15px; border: 1px solid #e2e8f0; border-radius: 8px; }
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
      <h1>📊 מבנה טבלאות מסד הנתונים - מערכת ספק בקליק</h1>
      <p><strong>תאריך יצירה:</strong> ${new Date().toLocaleDateString('he-IL')}</p>
      
      <div class="section">
        <h2>1. vendor_requests (בקשות ספקים)</h2>
        <p>הטבלה המרכזית במערכת - מכילה את כל בקשות הספקים ופרטיהם המלאים</p>
        
        <h3>שדות בסיסיים</h3>
        <table>
          <tr><th>שם השדה</th><th>סוג</th><th>חובה</th><th>ברירת מחדל</th><th>תיאור</th></tr>
          <tr><td>id</td><td>uuid</td><td class="required">כן</td><td>gen_random_uuid()</td><td>מזהה ייחודי</td></tr>
          <tr><td>vendor_name</td><td>text</td><td class="required">כן</td><td>-</td><td>שם הספק</td></tr>
          <tr><td>vendor_email</td><td>text</td><td class="required">כן</td><td>-</td><td>כתובת אימייל</td></tr>
          <tr><td>secure_token</td><td>uuid</td><td class="required">כן</td><td>gen_random_uuid()</td><td>טוקן מאובטח לגישה</td></tr>
          <tr><td>status</td><td class="enum">vendor_status</td><td class="required">כן</td><td>'pending'</td><td>סטטוס הבקשה</td></tr>
          <tr><td>created_at</td><td>timestamp</td><td class="required">כן</td><td>now()</td><td>תאריך יצירה</td></tr>
          <tr><td>updated_at</td><td>timestamp</td><td class="required">כן</td><td>now()</td><td>תאריך עדכון אחרון</td></tr>
          <tr><td>expires_at</td><td>timestamp</td><td>לא</td><td>now() + 7 days</td><td>תאריך תפוגה</td></tr>
        </table>

        <h3>פרטי חברה</h3>
        <table>
          <tr><th>שם השדה</th><th>סוג</th><th>תיאור</th></tr>
          <tr><td>company_id</td><td>text</td><td>ח.פ / מספר עוסק</td></tr>
          <tr><td>phone</td><td>text</td><td>טלפון</td></tr>
          <tr><td>mobile</td><td>text</td><td>נייד</td></tr>
          <tr><td>fax</td><td>text</td><td>פקס</td></tr>
        </table>

        <h3>כתובת</h3>
        <table>
          <tr><th>שם השדה</th><th>סוג</th><th>תיאור</th></tr>
          <tr><td>street</td><td>text</td><td>רחוב</td></tr>
          <tr><td>street_number</td><td>text</td><td>מספר בית</td></tr>
          <tr><td>city</td><td>text</td><td>עיר</td></tr>
          <tr><td>postal_code</td><td>text</td><td>מיקוד</td></tr>
          <tr><td>po_box</td><td>text</td><td>ת.ד</td></tr>
        </table>

        <h3>אנשי קשר</h3>
        <table>
          <tr><th>שם השדה</th><th>סוג</th><th>תיאור</th></tr>
          <tr><td>accounting_contact_name</td><td>text</td><td>שם איש קשר - הנהלת חשבונות</td></tr>
          <tr><td>accounting_contact_phone</td><td>text</td><td>טלפון איש קשר - הנהלת חשבונות</td></tr>
          <tr><td>sales_contact_name</td><td>text</td><td>שם איש קשר - מכירות</td></tr>
          <tr><td>sales_contact_phone</td><td>text</td><td>טלפון איש קשר - מכירות</td></tr>
        </table>

        <h3>פרטי בנק</h3>
        <table>
          <tr><th>שם השדה</th><th>סוג</th><th>תיאור</th></tr>
          <tr><td>bank_name</td><td>text</td><td>שם הבנק</td></tr>
          <tr><td>bank_branch</td><td>text</td><td>מספר סניף</td></tr>
          <tr><td>bank_account_number</td><td>text</td><td>מספר חשבון</td></tr>
          <tr><td>payment_method</td><td class="enum">payment_method</td><td>אמצעי תשלום (check/invoice/transfer)</td></tr>
          <tr><td>payment_terms</td><td>text</td><td>תנאי תשלום (ברירת מחדל: שוטף + 60)</td></tr>
        </table>

        <h3>סיווג ספק</h3>
        <table>
          <tr><th>שם השדה</th><th>סוג</th><th>תיאור</th></tr>
          <tr><td>vendor_type</td><td>text</td><td>סוג ספק (general/claims)</td></tr>
          <tr><td>claims_area</td><td>text</td><td>תחום תביעות (home/car/life/health)</td></tr>
          <tr><td>claims_sub_category</td><td>text</td><td>תת-קטגוריה (garage/appraiser/doctor/lawyer/plumber/management)</td></tr>
          <tr><td>is_consultant</td><td>boolean</td><td>האם יועץ</td></tr>
          <tr><td>is_sensitive</td><td>boolean</td><td>האם רגיש</td></tr>
        </table>

        <h3>מטפל ואישורים</h3>
        <table>
          <tr><th>שם השדה</th><th>סוג</th><th>תיאור</th></tr>
          <tr><td>handler_name</td><td>text</td><td>שם המטפל</td></tr>
          <tr><td>handler_email</td><td>text</td><td>אימייל המטפל</td></tr>
          <tr><td>approver_name</td><td>text</td><td>שם המאשר</td></tr>
          <tr><td>requires_vp_approval</td><td>boolean</td><td>האם דורש אישור סמנכ"ל</td></tr>
          <tr><td>vp_approved</td><td>boolean</td><td>אושר ע"י סמנכ"ל</td></tr>
          <tr><td>vp_approved_by</td><td>text</td><td>שם הסמנכ"ל שאישר</td></tr>
          <tr><td>vp_approved_at</td><td>timestamp</td><td>תאריך אישור סמנכ"ל</td></tr>
          <tr><td>procurement_manager_approved</td><td>boolean</td><td>אושר ע"י מנהל רכש</td></tr>
          <tr><td>procurement_manager_approved_by</td><td>text</td><td>שם מנהל הרכש שאישר</td></tr>
          <tr><td>procurement_manager_approved_at</td><td>timestamp</td><td>תאריך אישור מנהל רכש</td></tr>
        </table>

        <h3>חתימות על חוזה</h3>
        <table>
          <tr><th>שם השדה</th><th>סוג</th><th>תיאור</th></tr>
          <tr><td>requires_contract_signature</td><td>boolean</td><td>האם דורש חתימה על חוזה</td></tr>
          <tr><td>contract_file_path</td><td>text</td><td>נתיב קובץ החוזה</td></tr>
          <tr><td>contract_uploaded_at</td><td>timestamp</td><td>תאריך העלאת החוזה</td></tr>
          <tr><td>ceo_signed</td><td>boolean</td><td>חתם סמנכ"ל</td></tr>
          <tr><td>ceo_signed_by</td><td>text</td><td>שם הסמנכ"ל שחתם</td></tr>
          <tr><td>ceo_signed_at</td><td>timestamp</td><td>תאריך חתימת סמנכ"ל</td></tr>
          <tr><td>procurement_manager_signed</td><td>boolean</td><td>חתם מנהל רכש</td></tr>
          <tr><td>procurement_manager_signed_by</td><td>text</td><td>שם מנהל הרכש שחתם</td></tr>
          <tr><td>procurement_manager_signed_at</td><td>timestamp</td><td>תאריך חתימת מנהל רכש</td></tr>
        </table>

        <h3>שלבי אישור</h3>
        <table>
          <tr><th>שם השדה</th><th>סוג</th><th>תיאור</th></tr>
          <tr><td>first_review_approved</td><td>boolean</td><td>אושר בקרה ראשונה</td></tr>
          <tr><td>first_review_approved_by</td><td>text</td><td>שם המאשר</td></tr>
          <tr><td>first_review_approved_at</td><td>timestamp</td><td>תאריך אישור</td></tr>
          <tr><td>first_signature_approved</td><td>boolean</td><td>אושר חתימה ראשונה</td></tr>
          <tr><td>first_signature_approved_by</td><td>text</td><td>שם המאשר</td></tr>
          <tr><td>first_signature_approved_at</td><td>timestamp</td><td>תאריך אישור</td></tr>
          <tr><td>second_signature_approved</td><td>boolean</td><td>אושר חתימה שנייה</td></tr>
          <tr><td>second_signature_approved_by</td><td>text</td><td>שם המאשר</td></tr>
          <tr><td>second_signature_approved_at</td><td>timestamp</td><td>תאריך אישור</td></tr>
        </table>

        <h3>CRM</h3>
        <table>
          <tr><th>שם השדה</th><th>סוג</th><th>תיאור</th></tr>
          <tr><td>crm_status</td><td class="enum">crm_vendor_status</td><td>סטטוס CRM (active/suspended/closed/vip/security_approved)</td></tr>
          <tr><td>rating</td><td>integer</td><td>דירוג (1-5)</td></tr>
        </table>

        <h3>OTP</h3>
        <table>
          <tr><th>שם השדה</th><th>סוג</th><th>תיאור</th></tr>
          <tr><td>otp_code</td><td>varchar</td><td>קוד אימות</td></tr>
          <tr><td>otp_expires_at</td><td>timestamp</td><td>תפוגת הקוד</td></tr>
          <tr><td>otp_verified</td><td>boolean</td><td>האם אומת</td></tr>
        </table>
      </div>

      <div class="section">
        <h2>2. vendor_documents (מסמכי ספקים)</h2>
        <p>מסמכים שהספק העלה במסגרת תהליך ההקמה</p>
        <p><span class="connection">🔗 קשור ל: vendor_requests (vendor_request_id)</span></p>
        
        <table>
          <tr><th>שם השדה</th><th>סוג</th><th>חובה</th><th>תיאור</th></tr>
          <tr><td>id</td><td>uuid</td><td class="required">כן</td><td>מזהה ייחודי</td></tr>
          <tr><td>vendor_request_id</td><td>uuid</td><td class="required">כן</td><td>מזהה בקשת הספק</td></tr>
          <tr><td>document_type</td><td class="enum">document_type</td><td class="required">כן</td><td>סוג המסמך</td></tr>
          <tr><td>file_name</td><td>text</td><td class="required">כן</td><td>שם הקובץ</td></tr>
          <tr><td>file_path</td><td>text</td><td class="required">כן</td><td>נתיב הקובץ באחסון</td></tr>
          <tr><td>extracted_tags</td><td>jsonb</td><td>לא</td><td>נתונים שחולצו אוטומטית (פרטי בנק)</td></tr>
          <tr><td>uploaded_at</td><td>timestamp</td><td class="required">כן</td><td>תאריך העלאה</td></tr>
        </table>

        <h3>סוגי מסמכים (document_type)</h3>
        <table>
          <tr><th>ערך</th><th>תיאור בעברית</th></tr>
          <tr><td>bookkeeping_cert</td><td>אישור ניהול ספרים</td></tr>
          <tr><td>tax_cert</td><td>אישור ניכוי מס במקור</td></tr>
          <tr><td>bank_confirmation</td><td>צילום המחאה / אישור בנק</td></tr>
          <tr><td>invoice_screenshot</td><td>צילום חשבונית</td></tr>
        </table>
      </div>

      <div class="section">
        <h2>3. vendor_quotes (הצעות מחיר)</h2>
        <p>הצעות מחיר שהתקבלו מספקים</p>
        <p><span class="connection">🔗 קשור ל: vendor_requests (vendor_request_id)</span></p>
        
        <table>
          <tr><th>שם השדה</th><th>סוג</th><th>חובה</th><th>תיאור</th></tr>
          <tr><td>id</td><td>uuid</td><td class="required">כן</td><td>מזהה ייחודי</td></tr>
          <tr><td>vendor_request_id</td><td>uuid</td><td class="required">כן</td><td>מזהה בקשת הספק</td></tr>
          <tr><td>quote_secure_token</td><td>uuid</td><td>לא</td><td>טוקן מאובטח להגשת הצעה</td></tr>
          <tr><td>file_name</td><td>text</td><td class="required">כן</td><td>שם הקובץ</td></tr>
          <tr><td>file_path</td><td>text</td><td class="required">כן</td><td>נתיב הקובץ</td></tr>
          <tr><td>amount</td><td>numeric</td><td>לא</td><td>סכום ההצעה</td></tr>
          <tr><td>description</td><td>text</td><td>לא</td><td>תיאור ההצעה</td></tr>
          <tr><td>quote_date</td><td>date</td><td class="required">כן</td><td>תאריך ההצעה</td></tr>
          <tr><td>status</td><td>text</td><td class="required">כן</td><td>סטטוס (pending/approved/rejected)</td></tr>
          <tr><td>vendor_submitted</td><td>boolean</td><td>לא</td><td>האם הוגש ע"י הספק</td></tr>
          <tr><td>vendor_submitted_at</td><td>timestamp</td><td>לא</td><td>תאריך הגשה</td></tr>
          <tr><td>submitted_by</td><td>text</td><td>לא</td><td>מי הגיש</td></tr>
        </table>

        <h3>אישורים</h3>
        <table>
          <tr><th>שם השדה</th><th>סוג</th><th>תיאור</th></tr>
          <tr><td>handler_approved</td><td>boolean</td><td>אושר ע"י מטפל</td></tr>
          <tr><td>handler_approved_by</td><td>text</td><td>שם המטפל</td></tr>
          <tr><td>handler_approved_at</td><td>timestamp</td><td>תאריך אישור</td></tr>
          <tr><td>handler_rejection_reason</td><td>text</td><td>סיבת דחייה</td></tr>
          <tr><td>vp_approved</td><td>boolean</td><td>אושר ע"י סמנכ"ל</td></tr>
          <tr><td>vp_approved_by</td><td>text</td><td>שם הסמנכ"ל</td></tr>
          <tr><td>vp_approved_at</td><td>timestamp</td><td>תאריך אישור</td></tr>
          <tr><td>vp_rejection_reason</td><td>text</td><td>סיבת דחייה</td></tr>
          <tr><td>vp_signature_data</td><td>text</td><td>נתוני חתימה</td></tr>
          <tr><td>procurement_manager_approved</td><td>boolean</td><td>אושר ע"י מנהל רכש</td></tr>
          <tr><td>procurement_manager_approved_by</td><td>text</td><td>שם מנהל הרכש</td></tr>
          <tr><td>procurement_manager_approved_at</td><td>timestamp</td><td>תאריך אישור</td></tr>
          <tr><td>procurement_manager_rejection_reason</td><td>text</td><td>סיבת דחייה</td></tr>
          <tr><td>procurement_manager_signature_data</td><td>text</td><td>נתוני חתימה</td></tr>
        </table>
      </div>

      <div class="section">
        <h2>4. vendor_receipts (קבלות ספקים)</h2>
        <p>קבלות שהספק העלה לאחר אישורו</p>
        <p><span class="connection">🔗 קשור ל: vendor_requests (vendor_request_id)</span></p>
        
        <table>
          <tr><th>שם השדה</th><th>סוג</th><th>חובה</th><th>תיאור</th></tr>
          <tr><td>id</td><td>uuid</td><td class="required">כן</td><td>מזהה ייחודי</td></tr>
          <tr><td>vendor_request_id</td><td>uuid</td><td class="required">כן</td><td>מזהה בקשת הספק</td></tr>
          <tr><td>file_name</td><td>text</td><td class="required">כן</td><td>שם הקובץ</td></tr>
          <tr><td>file_path</td><td>text</td><td class="required">כן</td><td>נתיב הקובץ</td></tr>
          <tr><td>amount</td><td>numeric</td><td class="required">כן</td><td>סכום הקבלה</td></tr>
          <tr><td>receipt_date</td><td>date</td><td class="required">כן</td><td>תאריך הקבלה</td></tr>
          <tr><td>description</td><td>text</td><td>לא</td><td>תיאור</td></tr>
          <tr><td>status</td><td>text</td><td class="required">כן</td><td>סטטוס (pending/approved/rejected)</td></tr>
          <tr><td>rejection_reason</td><td>text</td><td>לא</td><td>סיבת דחייה</td></tr>
          <tr><td>reviewed_by</td><td>text</td><td>לא</td><td>נסקר ע"י</td></tr>
          <tr><td>reviewed_at</td><td>timestamp</td><td>לא</td><td>תאריך סקירה</td></tr>
        </table>
      </div>

      <div class="section">
        <h2>5. vendor_ratings (דירוגי ספקים)</h2>
        <p>דירוגים שניתנו לספקים ע"י משתמשי המערכת</p>
        <p><span class="connection">🔗 קשור ל: vendor_requests (vendor_request_id)</span></p>
        
        <table>
          <tr><th>שם השדה</th><th>סוג</th><th>חובה</th><th>תיאור</th></tr>
          <tr><td>id</td><td>uuid</td><td class="required">כן</td><td>מזהה ייחודי</td></tr>
          <tr><td>vendor_request_id</td><td>uuid</td><td class="required">כן</td><td>מזהה בקשת הספק</td></tr>
          <tr><td>user_id</td><td>uuid</td><td class="required">כן</td><td>מזהה המשתמש שדירג</td></tr>
          <tr><td>user_email</td><td>text</td><td class="required">כן</td><td>אימייל המשתמש</td></tr>
          <tr><td>rating</td><td>integer</td><td class="required">כן</td><td>דירוג (1-5)</td></tr>
        </table>
      </div>

      <div class="section">
        <h2>6. vendor_status_history (היסטוריית סטטוסים)</h2>
        <p>מעקב אחר שינויי סטטוס של בקשות ספקים</p>
        <p><span class="connection">🔗 קשור ל: vendor_requests (vendor_request_id)</span></p>
        
        <table>
          <tr><th>שם השדה</th><th>סוג</th><th>חובה</th><th>תיאור</th></tr>
          <tr><td>id</td><td>uuid</td><td class="required">כן</td><td>מזהה ייחודי</td></tr>
          <tr><td>vendor_request_id</td><td>uuid</td><td class="required">כן</td><td>מזהה בקשת הספק</td></tr>
          <tr><td>old_status</td><td>text</td><td>לא</td><td>הסטטוס הקודם</td></tr>
          <tr><td>new_status</td><td>text</td><td class="required">כן</td><td>הסטטוס החדש</td></tr>
          <tr><td>changed_by</td><td>text</td><td>לא</td><td>מי ביצע את השינוי</td></tr>
          <tr><td>changed_at</td><td>timestamp</td><td class="required">כן</td><td>מתי בוצע השינוי</td></tr>
        </table>
      </div>

      <div class="section">
        <h2>7. crm_history (היסטוריית CRM)</h2>
        <p>מעקב אחר שינויים שבוצעו בפרטי ספקים ב-CRM</p>
        <p><span class="connection">🔗 קשור ל: vendor_requests (vendor_request_id)</span></p>
        
        <table>
          <tr><th>שם השדה</th><th>סוג</th><th>חובה</th><th>תיאור</th></tr>
          <tr><td>id</td><td>uuid</td><td class="required">כן</td><td>מזהה ייחודי</td></tr>
          <tr><td>vendor_request_id</td><td>uuid</td><td class="required">כן</td><td>מזהה בקשת הספק</td></tr>
          <tr><td>action</td><td>text</td><td class="required">כן</td><td>סוג הפעולה</td></tr>
          <tr><td>field_name</td><td>text</td><td>לא</td><td>שם השדה שהשתנה</td></tr>
          <tr><td>old_value</td><td>text</td><td>לא</td><td>הערך הקודם</td></tr>
          <tr><td>new_value</td><td>text</td><td>לא</td><td>הערך החדש</td></tr>
          <tr><td>changed_by</td><td>text</td><td>לא</td><td>מי ביצע את השינוי</td></tr>
          <tr><td>changed_at</td><td>timestamp</td><td class="required">כן</td><td>מתי בוצע השינוי</td></tr>
        </table>
      </div>

      <div class="section">
        <h2>8. profiles (פרופילי משתמשים)</h2>
        <p>פרטי המשתמשים הפנימיים במערכת</p>
        <p><span class="connection">🔗 קשור ל: auth.users (id)</span></p>
        
        <table>
          <tr><th>שם השדה</th><th>סוג</th><th>חובה</th><th>תיאור</th></tr>
          <tr><td>id</td><td>uuid</td><td class="required">כן</td><td>מזהה המשתמש (מ-auth.users)</td></tr>
          <tr><td>full_name</td><td>text</td><td>לא</td><td>שם מלא</td></tr>
          <tr><td>avatar_url</td><td>text</td><td>לא</td><td>תמונת פרופיל</td></tr>
          <tr><td>is_approved</td><td>boolean</td><td class="required">כן</td><td>האם מאושר לעבודה</td></tr>
          <tr><td>approved_by</td><td>uuid</td><td>לא</td><td>מי אישר</td></tr>
          <tr><td>approved_at</td><td>timestamp</td><td>לא</td><td>מתי אושר</td></tr>
        </table>
      </div>

      <div class="section">
        <h2>9. user_roles (תפקידי משתמשים)</h2>
        <p>הרשאות ותפקידים של משתמשים</p>
        <p><span class="connection">🔗 קשור ל: auth.users (user_id)</span></p>
        
        <table>
          <tr><th>שם השדה</th><th>סוג</th><th>חובה</th><th>תיאור</th></tr>
          <tr><td>id</td><td>uuid</td><td class="required">כן</td><td>מזהה ייחודי</td></tr>
          <tr><td>user_id</td><td>uuid</td><td class="required">כן</td><td>מזהה המשתמש</td></tr>
          <tr><td>role</td><td class="enum">app_role</td><td class="required">כן</td><td>תפקיד (admin/user)</td></tr>
        </table>

        <h3>תפקידים (app_role)</h3>
        <table>
          <tr><th>ערך</th><th>תיאור</th></tr>
          <tr><td>admin</td><td>מנהל מערכת - גישה מלאה</td></tr>
          <tr><td>user</td><td>משתמש רגיל - גישה מוגבלת</td></tr>
        </table>
      </div>

      <div class="section">
        <h2>10. pending_approvals (ממתינים לאישור)</h2>
        <p>משתמשים חדשים הממתינים לאישור מנהל</p>
        <p><span class="connection">🔗 קשור ל: auth.users (user_id)</span></p>
        
        <table>
          <tr><th>שם השדה</th><th>סוג</th><th>חובה</th><th>תיאור</th></tr>
          <tr><td>id</td><td>uuid</td><td class="required">כן</td><td>מזהה ייחודי</td></tr>
          <tr><td>user_id</td><td>uuid</td><td class="required">כן</td><td>מזהה המשתמש</td></tr>
          <tr><td>user_email</td><td>text</td><td class="required">כן</td><td>אימייל המשתמש</td></tr>
          <tr><td>user_name</td><td>text</td><td>לא</td><td>שם המשתמש</td></tr>
          <tr><td>status</td><td>text</td><td class="required">כן</td><td>סטטוס (pending/approved)</td></tr>
          <tr><td>approval_token</td><td>uuid</td><td class="required">כן</td><td>טוקן לאישור</td></tr>
        </table>
      </div>

      <div class="section">
        <h2>11. app_settings (הגדרות מערכת)</h2>
        <p>הגדרות כלליות של המערכת</p>
        
        <table>
          <tr><th>שם השדה</th><th>סוג</th><th>חובה</th><th>תיאור</th></tr>
          <tr><td>id</td><td>uuid</td><td class="required">כן</td><td>מזהה ייחודי</td></tr>
          <tr><td>setting_key</td><td>text</td><td class="required">כן</td><td>מפתח ההגדרה</td></tr>
          <tr><td>setting_value</td><td>text</td><td class="required">כן</td><td>ערך ההגדרה</td></tr>
        </table>

        <h3>הגדרות נפוצות</h3>
        <table>
          <tr><th>מפתח</th><th>תיאור</th></tr>
          <tr><td>vp_name</td><td>שם הסמנכ"ל</td></tr>
          <tr><td>vp_email</td><td>אימייל הסמנכ"ל</td></tr>
          <tr><td>procurement_manager_name</td><td>שם מנהל הרכש</td></tr>
          <tr><td>procurement_manager_email</td><td>אימייל מנהל הרכש</td></tr>
          <tr><td>admin_name</td><td>שם מנהל המערכת</td></tr>
          <tr><td>admin_email</td><td>אימייל מנהל המערכת</td></tr>
        </table>
      </div>

      <div class="section">
        <h2>📋 סיכום Enums (ערכים קבועים)</h2>
        
        <h3>vendor_status (סטטוס בקשה)</h3>
        <table>
          <tr><th>ערך</th><th>תיאור</th></tr>
          <tr><td>pending</td><td>ממתין</td></tr>
          <tr><td>with_vendor</td><td>ממתין לספק</td></tr>
          <tr><td>submitted</td><td>הוגש</td></tr>
          <tr><td>first_review</td><td>בקרה ראשונה</td></tr>
          <tr><td>approved</td><td>אושר</td></tr>
          <tr><td>resent</td><td>נשלח מחדש</td></tr>
          <tr><td>rejected</td><td>נדחה</td></tr>
        </table>

        <h3>crm_vendor_status (סטטוס CRM)</h3>
        <table>
          <tr><th>ערך</th><th>תיאור</th></tr>
          <tr><td>active</td><td>פעיל</td></tr>
          <tr><td>suspended</td><td>מושהה</td></tr>
          <tr><td>closed</td><td>סגור</td></tr>
          <tr><td>vip</td><td>VIP</td></tr>
          <tr><td>security_approved</td><td>אושר ביטחון</td></tr>
        </table>

        <h3>payment_method (אמצעי תשלום)</h3>
        <table>
          <tr><th>ערך</th><th>תיאור</th></tr>
          <tr><td>check</td><td>המחאה</td></tr>
          <tr><td>invoice</td><td>מס"ב</td></tr>
          <tr><td>transfer</td><td>העברה בנקאית</td></tr>
        </table>
      </div>

      <div class="section">
        <h2>🔗 דיאגרמת קשרים</h2>
        <p>כל הטבלאות הבאות מקושרות לטבלה המרכזית <strong>vendor_requests</strong>:</p>
        <ul>
          <li>vendor_documents</li>
          <li>vendor_quotes</li>
          <li>vendor_receipts</li>
          <li>vendor_ratings</li>
          <li>vendor_status_history</li>
          <li>crm_history</li>
        </ul>
        <p>טבלאות משתמשים מקושרות ל-<strong>auth.users</strong>:</p>
        <ul>
          <li>profiles</li>
          <li>user_roles</li>
          <li>pending_approvals</li>
        </ul>
      </div>

    </body>
    </html>
  `;

  return content;
};

export const downloadDatabaseSchemaDoc = () => {
  const content = generateDatabaseSchemaDoc();
  const blob = new Blob([content], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `מבנה_טבלאות_מסד_נתונים_${new Date().toISOString().split('T')[0]}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
