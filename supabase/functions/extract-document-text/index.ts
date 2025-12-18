import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Google Gemini API endpoint
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

function logOCR(level: 'info' | 'warn' | 'error' | 'success', message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '📋 [TEXT-OCR-INFO]',
    warn: '⚠️ [TEXT-OCR-WARN]',
    error: '❌ [TEXT-OCR-ERROR]',
    success: '✅ [TEXT-OCR-SUCCESS]'
  }[level];
  
  if (data) {
    console.log(`${prefix} ${timestamp} - ${message}`, JSON.stringify(data, null, 2));
  } else {
    console.log(`${prefix} ${timestamp} - ${message}`);
  }
}

// Clean numeric values
function cleanNumericValue(value: string | null | undefined): string | null {
  if (!value || value === 'null' || value === '') return null;
  const cleaned = value.toString().replace(/[^0-9]/g, '');
  return cleaned.length > 0 ? cleaned : null;
}

// Clean phone number
function cleanPhoneNumber(value: string | null | undefined): string | null {
  if (!value || value === 'null' || value === '') return null;
  let cleaned = value.toString().replace(/[^0-9]/g, '');
  if (cleaned.length === 9 && !cleaned.startsWith('0')) {
    cleaned = '0' + cleaned;
  }
  return cleaned.length >= 9 && cleaned.length <= 10 ? cleaned : null;
}

// Clean extracted data
function cleanExtractedData(extracted: any): any {
  const cleaned = { ...extracted };
  
  // Company ID
  if (cleaned.company_id) {
    const id = cleanNumericValue(cleaned.company_id);
    cleaned.company_id = id && id.length >= 8 && id.length <= 9 ? id.padStart(9, '0') : null;
  }
  
  // Phone numbers
  cleaned.phone = cleanPhoneNumber(cleaned.phone);
  cleaned.mobile = cleanPhoneNumber(cleaned.mobile);
  if (cleaned.mobile && !cleaned.mobile.startsWith('05')) {
    if (cleaned.mobile.startsWith('0') && !cleaned.mobile.startsWith('05')) {
      if (!cleaned.phone) {
        cleaned.phone = cleaned.mobile;
        cleaned.mobile = null;
      }
    }
  }
  cleaned.fax = cleanPhoneNumber(cleaned.fax);
  
  // Email validation
  if (cleaned.email && !cleaned.email.includes('@')) {
    cleaned.email = null;
  }
  
  // Postal code
  if (cleaned.postal_code) {
    const postal = cleanNumericValue(cleaned.postal_code);
    cleaned.postal_code = postal && postal.length === 7 ? postal : null;
  }
  
  // Bank details
  if (cleaned.bank_number) {
    const bankNum = cleanNumericValue(cleaned.bank_number);
    cleaned.bank_number = bankNum && bankNum.length <= 2 ? bankNum.padStart(2, '0') : null;
  }
  
  if (cleaned.branch_number) {
    const branchNum = cleanNumericValue(cleaned.branch_number);
    cleaned.branch_number = branchNum && branchNum.length >= 3 && branchNum.length <= 4 ? branchNum : null;
  }
  
  if (cleaned.account_number) {
    const accountNum = cleanNumericValue(cleaned.account_number);
    cleaned.account_number = accountNum && accountNum.length >= 6 && accountNum.length <= 9 ? accountNum : null;
  }
  
  return cleaned;
}

const SYSTEM_PROMPT = `אתה מומחה לחילוץ נתונים ממסמכים עסקיים ישראליים.
חלץ את כל הנתונים שתמצא בטקסט מבין הרשימה הבאה:

1. company_id - ח.פ / עוסק מורשה (9 ספרות)
2. company_name - שם החברה / העסק
3. phone - מספר טלפון קווי (מתחיל ב-0, לא ב-05)
4. mobile - מספר טלפון נייד (מתחיל ב-05, 10 ספרות)
5. fax - מספר פקס
6. email - כתובת אימייל
7. city - עיר
8. street - שם רחוב
9. street_number - מספר בית/בניין
10. postal_code - מיקוד (7 ספרות)
11. bank_number - מספר בנק (2 ספרות):
    - לאומי = 10
    - דיסקונט = 11
    - פועלים / הפועלים = 12
    - אגוד = 13
    - אוצר החייל = 14
    - מרכנתיל = 17
    - מזרחי טפחות / מזרחי / טפחות = 20
    - הבינלאומי / בינלאומי = 31
    - מסד = 46
    - פועלי אגודת ישראל = 52
    - ירושלים = 54
12. branch_number - מספר סניף (3-4 ספרות)
13. account_number - מספר חשבון בנק (6-9 ספרות)

חשוב: אם אתה רואה שם בנק בטקסט, המר אותו למספר הבנק המתאים!

החזר JSON בלבד:
{
  "company_id": "value או null",
  "company_name": "value או null",
  "phone": "value או null",
  "mobile": "value או null",
  "fax": "value או null",
  "email": "value או null",
  "city": "value או null",
  "street": "value או null",
  "street_number": "value או null",
  "postal_code": "value או null",
  "bank_number": "value או null",
  "branch_number": "value או null",
  "account_number": "value או null",
  "confidence": "high" | "medium" | "low",
  "notes": "הערות אם יש"
}`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { textContent, documentType } = await req.json();
    const requestId = crypto.randomUUID().slice(0, 8);
    
    logOCR('info', `[${requestId}] New text extraction request`, { documentType, textLength: textContent?.length });
    
    if (!textContent) {
      return new Response(
        JSON.stringify({ error: 'Missing text content' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const GOOGLE_GEMINI_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    if (!GOOGLE_GEMINI_API_KEY) {
      logOCR('error', `[${requestId}] GOOGLE_GEMINI_API_KEY is not configured`);
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logOCR('info', `[${requestId}] Processing text extraction...`);

    const userPrompt = `חלץ את כל הנתונים העסקיים שתמצא בטקסט הבא (סוג מסמך: ${documentType}):\n\n${textContent}`;

    // Google Gemini API format
    const response = await fetch(`${GEMINI_API_URL}/gemini-2.5-flash:generateContent?key=${GOOGLE_GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: SYSTEM_PROMPT + '\n\n' + userPrompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2048,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logOCR('error', `[${requestId}] Gemini API error`, { status: response.status, error: errorText });
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'rate_limit', message: 'יותר מדי בקשות, נסה שוב בעוד מספר שניות' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'payment_required', message: 'שגיאת שירות OCR' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'ai_error', message: 'שגיאה בעיבוד הטקסט' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    // Google Gemini response format
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!content) {
      logOCR('error', `[${requestId}] No content in AI response`);
      return new Response(
        JSON.stringify({ error: 'no_response', message: 'לא התקבלה תשובה מהמערכת' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logOCR('info', `[${requestId}] AI response received`, { contentLength: content.length });

    // Parse JSON from the response
    let extracted;
    try {
      let jsonStr = content;
      if (jsonStr.includes('```json')) {
        jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (jsonStr.includes('```')) {
        jsonStr = jsonStr.replace(/```\n?/g, '');
      }
      extracted = JSON.parse(jsonStr.trim());
      
      // Clean the extracted data
      extracted = cleanExtractedData(extracted);
    } catch (parseError) {
      logOCR('error', `[${requestId}] Failed to parse AI response`, { error: parseError });
      return new Response(
        JSON.stringify({ error: 'parse_error', message: 'לא ניתן לעבד את התשובה', raw: content }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logOCR('success', `[${requestId}] Text extraction completed`, { 
      confidence: extracted.confidence,
      documentType 
    });

    return new Response(
      JSON.stringify({ success: true, extracted, documentType }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logOCR('error', 'Unexpected server error', { error: error instanceof Error ? error.message : 'Unknown' });
    return new Response(
      JSON.stringify({ error: 'server_error', message: error instanceof Error ? error.message : 'שגיאה בשרת' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
