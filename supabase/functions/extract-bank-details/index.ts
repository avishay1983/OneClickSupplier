import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MODELS = {
  fast: 'gemini-2.5-flash',
  accurate: 'gemini-2.5-flash',
};

function logOCR(level: 'info' | 'warn' | 'error' | 'success', message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '📋 [BANK-OCR-INFO]',
    warn: '⚠️ [BANK-OCR-WARN]',
    error: '❌ [BANK-OCR-ERROR]',
    success: '✅ [BANK-OCR-SUCCESS]'
  }[level];
  
  if (data) {
    console.log(`${prefix} ${timestamp} - ${message}`, JSON.stringify(data, null, 2));
  } else {
    console.log(`${prefix} ${timestamp} - ${message}`);
  }
}

// Clean numeric values - keep only digits
function cleanNumericValue(value: string | null | undefined): string | null {
  if (!value || value === 'null' || value === '') return null;
  const cleaned = value.toString().replace(/[^0-9]/g, '');
  return cleaned.length > 0 ? cleaned : null;
}

// Clean and validate bank details
function cleanBankData(extracted: any): any {
  const cleaned = { ...extracted };
  
  // Clean bank number (2 digits)
  if (cleaned.bank_number) {
    const bankNum = cleanNumericValue(cleaned.bank_number);
    if (bankNum && bankNum.length <= 2) {
      cleaned.bank_number = bankNum.padStart(2, '0');
    } else {
      cleaned.bank_number = null;
    }
  }
  
  // Clean branch number (3-4 digits)
  if (cleaned.branch_number) {
    const branchNum = cleanNumericValue(cleaned.branch_number);
    if (branchNum && branchNum.length >= 3 && branchNum.length <= 4) {
      cleaned.branch_number = branchNum;
    } else {
      cleaned.branch_number = null;
    }
  }
  
  // Clean account number (6-9 digits)
  if (cleaned.account_number) {
    const accountNum = cleanNumericValue(cleaned.account_number);
    if (accountNum && accountNum.length >= 6 && accountNum.length <= 9) {
      cleaned.account_number = accountNum;
    } else {
      cleaned.account_number = null;
    }
  }
  
  return cleaned;
}

const SYSTEM_PROMPT = `אתה מומחה OCR מקצועי לחילוץ פרטי בנק מתמונות של מסמכים בנקאיים ישראליים.
בצע סריקה יסודית של כל התמונה.

סוגי מסמכים נפוצים:
1. המחאה (צ'ק) - המספרים בקו המקווקו התחתון בסדר: מספר המחאה, מספר סניף, מספר בנק, מספר חשבון
2. אישור ניהול חשבון - מסמך רשמי מהבנק עם טבלה/שורות של פרטי החשבון
3. דף חשבון בנק - פרטי החשבון בכותרת העמוד

מיקומים לחיפוש:
- בהמחאה: הקו המקווקו התחתון (MICR line) - קרא משמאל לימין
- באישור בנק: חפש "מספר בנק", "מספר סניף", "מספר חשבון"
- בראש מסמכים: לוגו בנק, שם סניף

קודי בנקים בישראל:
- 10 = בנק לאומי
- 11 = בנק דיסקונט
- 12 = בנק הפועלים
- 13 = בנק אגוד
- 14 = בנק אוצר החייל
- 17 = בנק מרכנתיל דיסקונט
- 20 = בנק מזרחי טפחות
- 31 = בנק הבינלאומי
- 46 = בנק מסד
- 52 = בנק פועלי אגודת ישראל
- 54 = בנק ירושלים

חלץ:
1. bank_number - מספר בנק (2 ספרות)
2. branch_number - מספר סניף (3-4 ספרות)
3. account_number - מספר חשבון (6-9 ספרות)

החזר JSON בלבד:
{
  "bank_number": "XX או null",
  "branch_number": "XXX או XXXX או null",
  "account_number": "XXXXXX עד XXXXXXXXX או null",
  "confidence": "high" | "medium" | "low",
  "document_type": "check" | "bank_statement" | "account_confirmation" | "unknown",
  "notes": "הערות"
}

אם התמונה מטושטשת, נסה לפענח. אם אין מסמך בנקאי, החזר error.`;

async function extractWithModel(imageBase64: string, mimeType: string, model: string, apiKey: string) {
  const startTime = Date.now();
  logOCR('info', `Starting bank OCR extraction`, { model, imageSize: `${Math.round(imageBase64.length / 1024)}KB` });
  
  const userPrompt = 'סרוק בקפידה את התמונה וחלץ את פרטי הבנק. בדוק את כל האזורים, במיוחד את הקו המקווקו התחתון אם זו המחאה, או טבלאות אם זה אישור בנק.';
  
  // Gemini API format
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: SYSTEM_PROMPT + '\n\n' + userPrompt },
          {
            inline_data: {
              mime_type: mimeType || 'image/jpeg',
              data: imageBase64
            }
          }
        ]
      }],
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

function hasBankDetails(extracted: any): boolean {
  return !!(extracted.bank_number || extracted.branch_number || extracted.account_number);
}

function countBankFields(extracted: any): number {
  let count = 0;
  if (extracted.bank_number) count++;
  if (extracted.branch_number) count++;
  if (extracted.account_number) count++;
  return count;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, mimeType } = await req.json();
    const requestId = crypto.randomUUID().slice(0, 8);
    
    logOCR('info', `[${requestId}] New bank OCR request received`, { mimeType, hasImage: !!imageBase64 });
    
    if (!imageBase64) {
      logOCR('error', `[${requestId}] Missing image data`);
      return new Response(
        JSON.stringify({ error: 'Missing image data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      logOCR('error', `[${requestId}] GOOGLE_GEMINI_API_KEY is not configured`);
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logOCR('info', `[${requestId}] Starting first attempt with fast model`);
    const firstAttemptStart = Date.now();

    // First attempt with fast model
    let response = await extractWithModel(imageBase64, mimeType, MODELS.fast, GEMINI_API_KEY);
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
      
      return new Response(
        JSON.stringify({ error: 'ai_error', message: 'שגיאה בעיבוד התמונה' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let data = await response.json();
    let content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
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
      extracted = cleanBankData(extracted);
    } catch (parseError) {
      logOCR('error', `[${requestId}] Failed to parse AI response`, { error: parseError instanceof Error ? parseError.message : 'Unknown', rawContent: content.slice(0, 200) });
      return new Response(
        JSON.stringify({ error: 'parse_error', message: 'לא ניתן לעבד את התשובה', raw: content }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const foundBankDetails = hasBankDetails(extracted);
    const bankFieldsCount = countBankFields(extracted);
    const detailsFound = {
      bank_number: extracted.bank_number || null,
      branch_number: extracted.branch_number || null,
      account_number: extracted.account_number || null
    };
    
    logOCR('info', `[${requestId}] First attempt extraction results`, {
      foundBankDetails,
      bankFieldsCount,
      details: detailsFound,
      confidence: extracted.confidence,
      documentType: extracted.document_type,
      notes: extracted.notes
    });

    // Determine if retry is needed
    const needsRetry = 
      !foundBankDetails || 
      extracted.confidence === 'low' ||
      (extracted.confidence === 'medium' && bankFieldsCount < 3);

    if (needsRetry) {
      logOCR('warn', `[${requestId}] Triggering retry`, { 
        reason: !foundBankDetails ? 'no_bank_details' : 
                extracted.confidence === 'low' ? 'low_confidence' : 
                'medium_confidence_incomplete'
      });
      
      try {
        const retryStart = Date.now();
        response = await extractWithModel(imageBase64, mimeType, MODELS.accurate, GEMINI_API_KEY);
        const retryDuration = Date.now() - retryStart;
        
        if (response.ok) {
          data = await response.json();
          const retryContent = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          
          if (retryContent) {
            let retryExtracted = parseResponse(retryContent);
            retryExtracted = cleanBankData(retryExtracted);
            
            const retryFoundBankDetails = hasBankDetails(retryExtracted);
            const retryBankFieldsCount = countBankFields(retryExtracted);
            
            logOCR('info', `[${requestId}] Retry attempt completed`, {
              duration: `${retryDuration}ms`,
              foundBankDetails: retryFoundBankDetails,
              bankFieldsCount: retryBankFieldsCount,
              details: {
                bank_number: retryExtracted.bank_number || null,
                branch_number: retryExtracted.branch_number || null,
                account_number: retryExtracted.account_number || null
              },
              confidence: retryExtracted.confidence
            });
            
            // Use retry result if it found more bank details or has higher confidence
            const shouldUseRetry = 
              (retryFoundBankDetails && !foundBankDetails) ||
              retryBankFieldsCount > bankFieldsCount ||
              (retryExtracted.confidence === 'high' && extracted.confidence !== 'high') ||
              (retryExtracted.confidence === 'medium' && extracted.confidence === 'low');
            
            if (shouldUseRetry) {
              extracted = retryExtracted;
              extracted.model_used = 'accurate';
              logOCR('success', `[${requestId}] Using retry result`, {
                fieldsImprovement: retryBankFieldsCount - bankFieldsCount,
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
    
    logOCR('success', `[${requestId}] Bank OCR completed`, {
      totalDuration: `${totalDuration}ms`,
      modelUsed: extracted.model_used,
      foundBankDetails: hasBankDetails(extracted),
      bankFieldsCount: countBankFields(extracted),
      confidence: extracted.confidence,
      finalDetails: {
        bank_number: extracted.bank_number || null,
        branch_number: extracted.branch_number || null,
        account_number: extracted.account_number || null
      }
    });

    return new Response(
      JSON.stringify({ success: true, extracted }),
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
