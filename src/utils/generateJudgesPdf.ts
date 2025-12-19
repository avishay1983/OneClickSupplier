import jsPDF from 'jspdf';

export const generateJudgesPdf = () => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Hebrew text needs to be reversed for jsPDF
  const reverseHebrew = (text: string) => {
    return text.split('').reverse().join('');
  };

  // Add custom font support would be needed for proper Hebrew
  // For now, we'll create an HTML-based PDF download

  const htmlContent = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <title>ספק בקליק - תשובות לשופטים</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Heebo', Arial, sans-serif;
      direction: rtl;
      padding: 40px;
      line-height: 1.8;
      color: #1a1a2e;
      background: #fff;
    }
    
    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #3b82f6;
    }
    
    .header h1 {
      color: #1e40af;
      font-size: 32px;
      margin-bottom: 10px;
    }
    
    .header .subtitle {
      color: #64748b;
      font-size: 18px;
    }
    
    .section {
      margin-bottom: 35px;
      page-break-inside: avoid;
    }
    
    .section h2 {
      color: #1e40af;
      font-size: 22px;
      margin-bottom: 15px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e2e8f0;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .section h2 .emoji {
      font-size: 24px;
    }
    
    .section h3 {
      color: #334155;
      font-size: 16px;
      margin: 15px 0 10px 0;
    }
    
    .section p {
      color: #475569;
      margin-bottom: 12px;
      text-align: justify;
    }
    
    .highlight-box {
      background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
      border-right: 4px solid #3b82f6;
      padding: 20px;
      border-radius: 8px;
      margin: 15px 0;
    }
    
    .highlight-box.success {
      background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
      border-right-color: #22c55e;
    }
    
    .highlight-box.warning {
      background: linear-gradient(135deg, #fefce8 0%, #fef9c3 100%);
      border-right-color: #eab308;
    }
    
    ul {
      padding-right: 25px;
      margin: 10px 0;
    }
    
    li {
      color: #475569;
      margin-bottom: 8px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
      font-size: 14px;
    }
    
    th, td {
      border: 1px solid #e2e8f0;
      padding: 12px;
      text-align: right;
    }
    
    th {
      background: #f1f5f9;
      color: #1e40af;
      font-weight: 600;
    }
    
    tr:nth-child(even) {
      background: #f8fafc;
    }
    
    .tech-diagram {
      background: #1e293b;
      color: #e2e8f0;
      padding: 20px;
      border-radius: 8px;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      direction: ltr;
      text-align: left;
      white-space: pre;
      overflow-x: auto;
      margin: 15px 0;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      margin: 20px 0;
    }
    
    .stat-card {
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      color: white;
      padding: 20px;
      border-radius: 12px;
      text-align: center;
    }
    
    .stat-card .number {
      font-size: 36px;
      font-weight: 700;
    }
    
    .stat-card .label {
      font-size: 14px;
      opacity: 0.9;
    }
    
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e2e8f0;
      text-align: center;
      color: #64748b;
    }
    
    .badge {
      display: inline-block;
      background: #dbeafe;
      color: #1e40af;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 13px;
      margin: 2px;
    }
    
    .badge.ai {
      background: #f3e8ff;
      color: #7c3aed;
    }
    
    .badge.success {
      background: #dcfce7;
      color: #16a34a;
    }
    
    @media print {
      body {
        padding: 20px;
      }
      .section {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>

<div class="header">
  <h1>🚀 ספק בקליק</h1>
  <div class="subtitle">מערכת דיגיטלית לקליטת ספקים בחברות ביטוח</div>
  <div style="margin-top: 10px;">
    <span class="badge">React</span>
    <span class="badge">Supabase</span>
    <span class="badge ai">Google Gemini AI</span>
    <span class="badge success">Production Ready</span>
  </div>
</div>

<div class="section">
  <h2><span class="emoji">🎯</span> מטרת האפליקציה</h2>
  
  <p><strong>"ספק בקליק"</strong> נועדה לפתור אתגר עסקי קריטי בארגונים גדולים: תהליך קליטת ספקים ארוך, ידני ומועד לטעויות.</p>
  
  <div class="highlight-box warning">
    <h3>הבעיה שזיהינו:</h3>
    <ul>
      <li>תהליך קליטת ספק ממוצע בחברות ביטוח אורך <strong>2-4 שבועות</strong></li>
      <li>מסמכים מועברים באימייל, נאבדים, או מגיעים בפורמטים לא תקינים</li>
      <li>העתקה ידנית של נתונים מאישורי ניהול ספרים ואישורי מס במקור לטבלאות</li>
      <li>מעקב אחר אישורי מנהלים מבוצע בטלפונים ותזכורות ידניות</li>
      <li>אין נראות לספק לגבי מצב הבקשה שלו</li>
    </ul>
  </div>
  
  <div class="highlight-box success">
    <h3>הפתרון שלנו:</h3>
    <p>מערכת <strong>End-to-End דיגיטלית</strong> שמצמצמת את תהליך קליטת הספק ל-<strong>24-48 שעות</strong> בלבד:</p>
    <ul>
      <li><strong>חילוץ אוטומטי של נתונים</strong> מכל מסמך באמצעות AI</li>
      <li><strong>תהליך אישורים דיגיטלי</strong> עם חתימות אלקטרוניות</li>
      <li><strong>שקיפות מלאה</strong> לספק על מצב הבקשה</li>
      <li><strong>מערכת CRM משולבת</strong> לניהול ספקים מאושרים</li>
    </ul>
  </div>
  
  <div class="stats-grid">
    <div class="stat-card">
      <div class="number">90%</div>
      <div class="label">חיסכון בזמן</div>
    </div>
    <div class="stat-card">
      <div class="number">0</div>
      <div class="label">הקלדה ידנית</div>
    </div>
    <div class="stat-card">
      <div class="number">100%</div>
      <div class="label">דיגיטלי</div>
    </div>
  </div>
</div>

<div class="section">
  <h2><span class="emoji">👥</span> קהל היעד</h2>
  
  <h3>קהל ראשי - מחלקת רכש בחברות ביטוח:</h3>
  <table>
    <tr>
      <th>תפקיד</th>
      <th>שימוש במערכת</th>
    </tr>
    <tr>
      <td><strong>מטפלי רכש</strong></td>
      <td>יצירת בקשות, מעקב סטטוסים, אישור ראשוני</td>
    </tr>
    <tr>
      <td><strong>מנהל רכש</strong></td>
      <td>אישור וחתימה דיגיטלית על כל ספק</td>
    </tr>
    <tr>
      <td><strong>סמנכ"ל כספים</strong></td>
      <td>אישור ספקים מעל סף מסוים</td>
    </tr>
    <tr>
      <td><strong>מנהל CRM</strong></td>
      <td>ניהול ספקים פעילים, דירוג, העלאת קבלות</td>
    </tr>
  </table>
  
  <h3>קהל משני - ספקים חיצוניים:</h3>
  <ul>
    <li><strong>ספקים כלליים</strong> - ספקי שירותים ומוצרים</li>
    <li><strong>ספקי תביעות</strong> - מוסכים, שמאים, רופאים, עורכי דין</li>
  </ul>
  
  <div class="highlight-box">
    <strong>יתרון ייחודי:</strong> המערכת מותאמת <strong>במיוחד לשוק הישראלי</strong> - תמיכה בח.פ./ע.מ., בנקים ישראליים, ערים ורחובות מ-OpenStreetMap, וטפסים בעברית.
  </div>
</div>

<div class="section">
  <h2><span class="emoji">🔧</span> הסבר טכני על היישום</h2>
  
  <h3>ארכיטקטורה:</h3>
  <div class="tech-diagram">┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)                  │
│  • Dashboard עובדים  • טופס ספקים  • CRM  • מצגת מערכת      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│               SUPABASE EDGE FUNCTIONS (Deno)                │
│  • 18 Edge Functions לטיפול בלוגיקה עסקית                  │
│  • אימות OTP  • שליחת מיילים  • חילוץ מסמכים              │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
       ┌──────────┐   ┌──────────────┐  ┌─────────────┐
       │ PostgreSQL│   │ Google Gemini│  │  Gmail SMTP │
       │    DB     │   │   AI (OCR)   │  │   Service   │
       └──────────┘   └──────────────┘  └─────────────┘</div>

  <h3>יכולות AI מתקדמות:</h3>
  <table>
    <tr>
      <th>יכולת</th>
      <th>טכנולוגיה</th>
      <th>תפקיד</th>
    </tr>
    <tr>
      <td><strong>OCR חכם</strong></td>
      <td>Gemini 2.5 Flash</td>
      <td>חילוץ נתונים מתמונות מסמכים</td>
    </tr>
    <tr>
      <td><strong>זיהוי מסמכים</strong></td>
      <td>Gemini Vision</td>
      <td>סיווג אוטומטי של סוג המסמך</td>
    </tr>
    <tr>
      <td><strong>חילוץ פרטי בנק</strong></td>
      <td>Gemini + Regex</td>
      <td>זיהוי בנק, סניף וחשבון</td>
    </tr>
    <tr>
      <td><strong>מיקום חתימה</strong></td>
      <td>Gemini Vision</td>
      <td>איתור מיקום חתימה בחוזה</td>
    </tr>
  </table>
  
  <h3>אבטחה:</h3>
  <ul>
    <li><strong>Row Level Security (RLS)</strong> על כל הטבלאות</li>
    <li><strong>Secure Tokens</strong> לגישה של ספקים</li>
    <li><strong>OTP Verification</strong> לאימות ספקים</li>
    <li><strong>App Password</strong> לשליחת מיילים</li>
  </ul>
</div>

<div class="section">
  <h2><span class="emoji">📋</span> שיטת העבודה</h2>
  
  <h3>מתודולוגיה: Agile + AI-Assisted Development</h3>
  
  <table>
    <tr>
      <th>שלב</th>
      <th>תיאור</th>
      <th>כלים</th>
    </tr>
    <tr>
      <td><strong>1. אפיון</strong></td>
      <td>הבנת צרכי המשתמש ותהליכים קיימים</td>
      <td>ראיונות, מחקר שוק</td>
    </tr>
    <tr>
      <td><strong>2. עיצוב</strong></td>
      <td>UI/UX מותאם RTL עם עברית</td>
      <td>Figma, shadcn/ui</td>
    </tr>
    <tr>
      <td><strong>3. פיתוח</strong></td>
      <td>פיתוח מהיר עם Lovable AI</td>
      <td>React, Supabase, Deno</td>
    </tr>
    <tr>
      <td><strong>4. בדיקות</strong></td>
      <td>בדיקות E2E ותרחישים אמיתיים</td>
      <td>בדיקות ידניות + לוגים</td>
    </tr>
    <tr>
      <td><strong>5. Deploy</strong></td>
      <td>פריסה רציפה עם Lovable</td>
      <td>Lovable Cloud</td>
    </tr>
  </table>
  
  <div class="highlight-box">
    <h3>עקרונות מנחים:</h3>
    <ul>
      <li><strong>User-First</strong> - כל פיצ'ר נבנה מנקודת מבט המשתמש</li>
      <li><strong>Mobile-Friendly</strong> - ספקים יכולים למלא טפסים מהנייד</li>
      <li><strong>Zero Training</strong> - ממשק אינטואיטיבי שלא דורש הדרכה</li>
      <li><strong>Real-Time Feedback</strong> - הספק רואה את מצב הבקשה בזמן אמת</li>
    </ul>
  </div>
</div>

<div class="section">
  <h2><span class="emoji">🔗</span> לינק לאפליקציה</h2>
  
  <div class="highlight-box success">
    <p style="font-size: 18px; text-align: center;">
      <strong>קישור ראשי:</strong><br>
      <code style="background: #fff; padding: 8px 16px; border-radius: 6px; font-size: 16px;">
        https://bituach-yashir.lovable.app
      </code>
    </p>
  </div>
  
  <h3>נקודות כניסה לבדיקה:</h3>
  <table>
    <tr>
      <th>ממשק</th>
      <th>נתיב</th>
      <th>תיאור</th>
    </tr>
    <tr>
      <td><strong>דף הבית</strong></td>
      <td>/</td>
      <td>מבוא למערכת</td>
    </tr>
    <tr>
      <td><strong>מצגת</strong></td>
      <td>/presentation</td>
      <td>הצגת המערכת לשופטים</td>
    </tr>
    <tr>
      <td><strong>תיעוד טכני</strong></td>
      <td>/documentation</td>
      <td>תיעוד API מלא</td>
    </tr>
    <tr>
      <td><strong>Dashboard</strong></td>
      <td>/dashboard</td>
      <td>ממשק עובדים (דורש הרשמה)</td>
    </tr>
  </table>
</div>

<div class="section">
  <h2><span class="emoji">💡</span> מה מייחד אותנו?</h2>
  
  <div class="stats-grid">
    <div class="stat-card" style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);">
      <div class="number">90%</div>
      <div class="label">חיסכון בזמן</div>
    </div>
    <div class="stat-card" style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);">
      <div class="number">AI</div>
      <div class="label">ישראלי מותאם</div>
    </div>
    <div class="stat-card" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
      <div class="number">0</div>
      <div class="label">נייר</div>
    </div>
  </div>
  
  <ul style="font-size: 16px;">
    <li><strong>חיסכון של 90% בזמן</strong> - מ-3 שבועות ל-48 שעות</li>
    <li><strong>AI ישראלי</strong> - מותאם לח.פ., בנקים ישראליים, ערים</li>
    <li><strong>Zero Paper</strong> - תהליך דיגיטלי מקצה לקצה</li>
    <li><strong>Real-Time Tracking</strong> - שקיפות מלאה לכל הצדדים</li>
    <li><strong>Enterprise Ready</strong> - מוכן להטמעה בארגון גדול</li>
  </ul>
</div>

<div class="footer">
  <p><strong>ספק בקליק</strong> - מערכת ניהול ספקים חכמה</p>
  <p>נבנה עם ❤️ באמצעות Lovable, React, Supabase & Google Gemini AI</p>
  <p style="margin-top: 10px; font-size: 12px;">תאריך: ${new Date().toLocaleDateString('he-IL')}</p>
</div>

</body>
</html>
  `;

  return htmlContent;
};

export const downloadJudgesPdf = () => {
  const htmlContent = generateJudgesPdf();
  
  // Create a new window with the HTML content
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Wait for content to load then trigger print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 500);
    };
  }
};
