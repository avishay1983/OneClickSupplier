import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MODELS = {
  fast: 'gemini-2.0-flash',
  accurate: 'gemini-2.5-pro-preview-05-06'
};

// Minimum fields threshold for retry
const MIN_FIELDS_THRESHOLD = 3;

// Google Gemini API endpoint
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

function logOCR(level: 'info' | 'warn' | 'error' | 'success', message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '📋 [OCR-INFO]',
    warn: '⚠️ [OCR-WARN]',
    error: '❌ [OCR-ERROR]',
    success: '✅ [OCR-SUCCESS]'
  }[level];
  
  if (data) {
    console.log(`${prefix} ${timestamp} - ${message}`, JSON.stringify(data, null, 2));
  } else {
    console.log(`${prefix} ${timestamp} - ${message}`);
  }
}

// Clean extracted values - remove unwanted characters
function cleanValue(value: string | null | undefined): string | null {
  if (!value || value === 'null' || value === '') return null;
  return value.toString().trim();
}

// Clean numeric values - keep only digits
function cleanNumericValue(value: string | null | undefined): string | null {
  if (!value || value === 'null' || value === '') return null;
  const cleaned = value.toString().replace(/[^0-9]/g, '');
  return cleaned.length > 0 ? cleaned : null;
}

// Clean phone number - format Israeli phone
function cleanPhoneNumber(value: string | null | undefined): string | null {
  if (!value || value === 'null' || value === '') return null;
  let cleaned = value.toString().replace(/[^0-9]/g, '');
  // Add leading 0 if missing for Israeli numbers
  if (cleaned.length === 9 && !cleaned.startsWith('0')) {
    cleaned = '0' + cleaned;
  }
  return cleaned.length >= 9 && cleaned.length <= 10 ? cleaned : null;
}

// Clean and validate extracted data
function cleanExtractedData(extracted: any): any {
  const cleaned = { ...extracted };
  
  // Clean company ID (9 digits)
  if (cleaned.company_id) {
    const id = cleanNumericValue(cleaned.company_id);
    cleaned.company_id = id && id.length >= 8 && id.length <= 9 ? id.padStart(9, '0') : null;
  }
  
  // Clean company name
  cleaned.company_name = cleanValue(cleaned.company_name);
  
  // Clean phone numbers
  cleaned.phone = cleanPhoneNumber(cleaned.phone);
  cleaned.mobile = cleanPhoneNumber(cleaned.mobile);
  if (cleaned.mobile && !cleaned.mobile.startsWith('05')) {
    // If mobile doesn't start with 05, check if it's actually a landline
    if (cleaned.mobile.startsWith('0') && !cleaned.mobile.startsWith('05')) {
      // Swap if it looks like a landline
      if (!cleaned.phone) {
        cleaned.phone = cleaned.mobile;
        cleaned.mobile = null;
      }
    }
  }
  cleaned.fax = cleanPhoneNumber(cleaned.fax);
  
  // Clean email
  if (cleaned.email) {
    cleaned.email = cleanValue(cleaned.email);
    // Basic email validation
    if (cleaned.email && !cleaned.email.includes('@')) {
      cleaned.email = null;
    }
  }
  
  // Clean address fields
  cleaned.city = cleanValue(cleaned.city);
  cleaned.street = cleanValue(cleaned.street);
  cleaned.street_number = cleanValue(cleaned.street_number);
  
  // Clean postal code (7 digits)
  if (cleaned.postal_code) {
    const postal = cleanNumericValue(cleaned.postal_code);
    cleaned.postal_code = postal && postal.length === 7 ? postal : null;
  }
  
  // Clean bank details
  if (cleaned.bank_number) {
    const bankNum = cleanNumericValue(cleaned.bank_number);
    // Valid Israeli bank numbers are 2 digits (10-99)
    cleaned.bank_number = bankNum && bankNum.length <= 2 ? bankNum.padStart(2, '0') : null;
  }
  
  if (cleaned.branch_number) {
    const branchNum = cleanNumericValue(cleaned.branch_number);
    // Branch numbers are 3-4 digits
    cleaned.branch_number = branchNum && branchNum.length >= 3 && branchNum.length <= 4 ? branchNum : null;
  }
  
  if (cleaned.account_number) {
    const accountNum = cleanNumericValue(cleaned.account_number);
    // Account numbers are 6-9 digits
    cleaned.account_number = accountNum && accountNum.length >= 6 && accountNum.length <= 9 ? accountNum : null;
  }
  
  return cleaned;
}

function getSystemPrompt(documentType: string): string {
  const basePrompt = `אתה מומחה OCR מקצועי לחילוץ נתונים מתמונות של מסמכים עסקיים ישראליים.
בצע סריקה יסודית של כל התמונה - מכל הכיוונים ובכל האזורים.

הנחיות קריטיות:
- סרוק את כל אזורי התמונה: כותרת, גוף, תחתית, פינות, וחותמות
- קרא טקסט בעברית מימין לשמאל
- אם הטקסט מטושטש, נסה לפענח לפי הקשר ומיקום
- שים לב לפורמטים ישראליים סטנדרטיים

שדות לחילוץ:
1. company_id - ח.פ / ע.מ / עוסק מורשה (9 ספרות)
2. company_name - שם החברה או העסק
3. phone - טלפון קווי (מתחיל ב-0, לא ב-05)
4. mobile - טלפון נייד (מתחיל ב-05, 10 ספרות)
5. fax - מספר פקס
6. email - כתובת אימייל
7. city - עיר/יישוב
8. street - שם רחוב (ללא מספר)
9. street_number - מספר בית
10. postal_code - מיקוד (7 ספרות)
11. bank_number - מספר בנק (2 ספרות): 10=לאומי, 11=דיסקונט, 12=פועלים, 20=מזרחי טפחות, 31=בינלאומי
12. branch_number - מספר סניף (3-4 ספרות)
13. account_number - מספר חשבון (6-9 ספרות)`;

  const documentSpecificInstructions: Record<string, string> = {
    bookkeeping_cert: `
    
מסמך זה הוא אישור ניהול ספרים/הנהלת חשבונות.
מיקומים אופייניים לנתונים:
- כותרת המסמך: שם העסק, ח.פ/ע.מ
- גוף המסמך: כתובת מלאה (עיר, רחוב, מספר)
- חותמת/תחתית: מספרי טלפון, פקס, אימייל
- ייתכן לוגו עם פרטי התקשרות`,
    
    tax_cert: `
    
מסמך זה הוא אישור ניכוי מס במקור / פטור ממס.
מיקומים אופייניים לנתונים:
- ראש המסמך: פרטי הנישום (שם, ח.פ/ע.מ)
- טבלה או שורות: כתובת, פרטי התקשרות
- ייתכנו פרטי בנק לצורך החזרי מס`,
    
    bank_confirmation: `
    
מסמך זה הוא אישור ניהול חשבון בנק / צילום המחאה.
מיקומים אופייניים לנתונים:
- בהמחאה (צ'ק): הקו המקווקו התחתון מכיל מספר בנק, סניף, וחשבון
- באישור בנק: טבלה עם פרטי החשבון
- שם בעל החשבון והעסק בראש המסמך
- ייתכנו פרטי כתובת של הסניף (אל תבלבל עם כתובת העסק)`,
    
    invoice_screenshot: `
    
מסמך זה הוא צילום חשבונית / קבלה.
מיקומים אופייניים לנתונים:
- כותרת: שם העסק, לוגו, ח.פ/ע.מ
- תחתית או צד: כתובת, טלפון, פקס, אימייל
- ייתכנו פרטי בנק להעברה`
  };

  const specificInstructions = documentSpecificInstructions[documentType] || '';

  return `${basePrompt}${specificInstructions}

החזר תשובה בפורמט JSON בלבד (ללא טקסט נוסף):
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
  "notes": "הערות על איכות הזיהוי או בעיות"
}`;
}

async function extractWithModel(imageBase64: string, mimeType: string, documentType: string, model: string, apiKey: string) {
  const startTime = Date.now();
  logOCR('info', `Starting OCR extraction`, { model, documentType, imageSize: `${Math.round(imageBase64.length / 1024)}KB` });
  
  const systemPrompt = getSystemPrompt(documentType);
  const userPrompt = `סרוק בזהירות את התמונה הבאה (סוג מסמך: ${documentType}) וחלץ את כל הנתונים העסקיים. בדוק כל פינה ואזור בתמונה. אם חלק מהטקסט מטושטש, נסה לפענח לפי הקשר.`;
  
  // Google Gemini API format
  const response = await fetch(`${GEMINI_API_URL}/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: systemPrompt + '\n\n' + userPrompt },
            {
              inline_data: {
                mime_type: mimeType || 'image/jpeg',
                data: imageBase64
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 2048,
      }
    }),
  });

  return response;
}

function parseResponse(content: string) {
  let jsonStr = content;
  // Remove markdown code blocks if present
  if (jsonStr.includes('```json')) {
    jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  } else if (jsonStr.includes('```')) {
    jsonStr = jsonStr.replace(/```\n?/g, '');
  }
  return JSON.parse(jsonStr.trim());
}

function countExtractedFields(extracted: any): number {
  const fields = ['company_id', 'company_name', 'phone', 'mobile', 'fax', 'email', 
                  'city', 'street', 'street_number', 'postal_code', 
                  'bank_number', 'branch_number', 'account_number'];
  return fields.filter(f => extracted[f] && extracted[f] !== null && extracted[f] !== '').length;
}

function getExtractedFieldNames(extracted: any): string[] {
  const fields = ['company_id', 'company_name', 'phone', 'mobile', 'fax', 'email', 
                  'city', 'street', 'street_number', 'postal_code', 
                  'bank_number', 'branch_number', 'account_number'];
  return fields.filter(f => extracted[f] && extracted[f] !== null && extracted[f] !== '');
}

// Check if retry is needed based on confidence and field count
function shouldRetry(extracted: any, fieldsFound: number): { shouldRetry: boolean; reason: string } {
  if (extracted.confidence === 'low') {
    return { shouldRetry: true, reason: 'low_confidence' };
  }
  if (fieldsFound < MIN_FIELDS_THRESHOLD) {
    return { shouldRetry: true, reason: 'insufficient_fields' };
  }
  if (extracted.confidence === 'medium' && fieldsFound < 5) {
    return { shouldRetry: true, reason: 'medium_confidence_few_fields' };
  }
  return { shouldRetry: false, reason: '' };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, mimeType, documentType } = await req.json();
    const requestId = crypto.randomUUID().slice(0, 8);
    
    logOCR('info', `[${requestId}] New OCR request received`, { documentType, mimeType, hasImage: !!imageBase64 });
    
    if (!imageBase64) {
      logOCR('error', `[${requestId}] Missing image data`);
      return new Response(
        JSON.stringify({ error: 'Missing image data' }),
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

    logOCR('info', `[${requestId}] Starting first attempt with fast model`);
    const firstAttemptStart = Date.now();

    // First attempt with fast model
    let response = await extractWithModel(imageBase64, mimeType, documentType, MODELS.fast, GOOGLE_GEMINI_API_KEY);
    const firstAttemptDuration = Date.now() - firstAttemptStart;

    if (!response.ok) {
      const errorText = await response.text();
      logOCR('error', `[${requestId}] AI gateway error`, { status: response.status, error: errorText, duration: `${firstAttemptDuration}ms` });
      
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
        JSON.stringify({ error: 'ai_error', message: 'שגיאה בעיבוד התמונה' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let data = await response.json();
    // Google Gemini response format
    let content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!content) {
      logOCR('error', `[${requestId}] No content in AI response`, { duration: `${firstAttemptDuration}ms` });
      return new Response(
        JSON.stringify({ error: 'no_response', message: 'לא התקבלה תשובה מהמערכת' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logOCR('info', `[${requestId}] First attempt completed`, { duration: `${firstAttemptDuration}ms`, responseLength: content.length });

    let extracted;
    try {
      extracted = parseResponse(content);
      // Clean the extracted data
      extracted = cleanExtractedData(extracted);
    } catch (parseError) {
      logOCR('error', `[${requestId}] Failed to parse AI response`, { error: parseError instanceof Error ? parseError.message : 'Unknown', rawContent: content.slice(0, 200) });
      return new Response(
        JSON.stringify({ error: 'parse_error', message: 'לא ניתן לעבד את התשובה', raw: content }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fieldsFound = countExtractedFields(extracted);
    const extractedFieldsList = getExtractedFieldNames(extracted);
    
    logOCR('info', `[${requestId}] First attempt extraction results`, {
      fieldsFound,
      fields: extractedFieldsList,
      confidence: extracted.confidence,
      notes: extracted.notes
    });

    // Check if retry is needed
    const retryCheck = shouldRetry(extracted, fieldsFound);
    
    if (retryCheck.shouldRetry) {
      logOCR('warn', `[${requestId}] Triggering retry`, { reason: retryCheck.reason });
      
      try {
        const retryStart = Date.now();
        response = await extractWithModel(imageBase64, mimeType, documentType, MODELS.accurate, GOOGLE_GEMINI_API_KEY);
        const retryDuration = Date.now() - retryStart;
        
        if (response.ok) {
          data = await response.json();
          // Google Gemini response format
          const retryContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
          
          if (retryContent) {
            let retryExtracted = parseResponse(retryContent);
            // Clean the retry extracted data
            retryExtracted = cleanExtractedData(retryExtracted);
            
            const retryFieldsFound = countExtractedFields(retryExtracted);
            const retryFieldsList = getExtractedFieldNames(retryExtracted);
            
            logOCR('info', `[${requestId}] Retry attempt completed`, {
              duration: `${retryDuration}ms`,
              fieldsFound: retryFieldsFound,
              fields: retryFieldsList,
              confidence: retryExtracted.confidence
            });
            
            // Use retry result if it found more fields or has higher confidence
            const shouldUseRetry = 
              retryFieldsFound > fieldsFound ||
              (retryExtracted.confidence === 'high' && extracted.confidence !== 'high') ||
              (retryExtracted.confidence === 'medium' && extracted.confidence === 'low');
            
            if (shouldUseRetry) {
              extracted = retryExtracted;
              extracted.model_used = 'accurate';
              logOCR('success', `[${requestId}] Using retry result`, { 
                improvement: retryFieldsFound - fieldsFound,
                confidenceChange: `${extracted.confidence} -> ${retryExtracted.confidence}`
              });
            } else {
              extracted.model_used = 'fast';
              logOCR('info', `[${requestId}] Keeping first attempt - retry did not improve`);
            }
          }
        } else {
          logOCR('warn', `[${requestId}] Retry attempt failed`, { status: response.status });
          extracted.model_used = 'fast';
        }
      } catch (retryError) {
        logOCR('error', `[${requestId}] Retry exception`, { error: retryError instanceof Error ? retryError.message : 'Unknown' });
        extracted.model_used = 'fast';
      }
    } else {
      extracted.model_used = 'fast';
    }

    const totalDuration = Date.now() - firstAttemptStart;
    const finalFieldsFound = countExtractedFields(extracted);
    
    logOCR('success', `[${requestId}] OCR completed`, {
      totalDuration: `${totalDuration}ms`,
      modelUsed: extracted.model_used,
      fieldsExtracted: finalFieldsFound,
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
