import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MODELS = {
  fast: 'google/gemini-2.5-flash',
  accurate: 'google/gemini-2.5-pro'
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

async function extractWithModel(imageBase64: string, mimeType: string, model: string, apiKey: string) {
  const startTime = Date.now();
  logOCR('info', `Starting bank OCR extraction`, { model, imageSize: `${Math.round(imageBase64.length / 1024)}KB` });
  
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: `אתה מומחה OCR לחילוץ פרטי בנק מתמונות של מסמכים בנקאיים ישראליים.

סוגי מסמכים שאתה עשוי לקבל:
1. צילום המחאה (צ'ק) - הנתונים מופיעים בקו המקווקו התחתון
2. אישור ניהול חשבון - מסמך רשמי מהבנק עם פרטי החשבון
3. דף חשבון בנק - כולל את פרטי החשבון בכותרת

מיקומים אופייניים לנתונים:
- בהמחאה: הקו המקווקו התחתון מכיל: מספר בנק (2 ספרות), מספר סניף (3-4 ספרות), מספר חשבון (6-9 ספרות)
- באישור ניהול חשבון: טבלה או שורות עם "מספר בנק", "מספר סניף", "מספר חשבון"
- הנתונים יכולים להופיע גם בראש המסמך או בחותמת

קודי בנקים נפוצים בישראל:
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

חלץ את הנתונים הבאים:
1. bank_number - מספר בנק (2 ספרות)
2. branch_number - מספר סניף (3-4 ספרות)
3. account_number - מספר חשבון (6-9 ספרות)

החזר תשובה בפורמט JSON בלבד:
{
  "bank_number": "XX",
  "branch_number": "XXX או XXXX",
  "account_number": "XXXXXX עד XXXXXXXXX",
  "confidence": "high" | "medium" | "low",
  "document_type": "check" | "bank_statement" | "account_confirmation" | "unknown",
  "notes": "הערות על הזיהוי"
}

- אם לא ניתן לזהות שדה מסוים, החזר null עבורו
- אם התמונה מטושטשת, נסה לפענח את המספרים לפי הקשר
- אם התמונה לא מכילה מסמך בנקאי, החזר error`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'סרוק בקפידה את התמונה הבאה וחלץ את פרטי הבנק. בדוק את כל אזורי התמונה, במיוחד את הקו המקווקו התחתון אם זו המחאה.'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType || 'image/jpeg'};base64,${imageBase64}`
              }
            }
          ]
        }
      ],
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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      logOCR('error', `[${requestId}] LOVABLE_API_KEY is not configured`);
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logOCR('info', `[${requestId}] Starting first attempt with fast model`);
    const firstAttemptStart = Date.now();

    // First attempt with fast model
    let response = await extractWithModel(imageBase64, mimeType, MODELS.fast, LOVABLE_API_KEY);
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
    let content = data.choices?.[0]?.message?.content;
    
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
    } catch (parseError) {
      logOCR('error', `[${requestId}] Failed to parse AI response`, { error: parseError instanceof Error ? parseError.message : 'Unknown', rawContent: content.slice(0, 200) });
      return new Response(
        JSON.stringify({ error: 'parse_error', message: 'לא ניתן לעבד את התשובה', raw: content }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const foundBankDetails = hasBankDetails(extracted);
    const detailsFound = {
      bank_number: extracted.bank_number || null,
      branch_number: extracted.branch_number || null,
      account_number: extracted.account_number || null
    };
    
    logOCR('info', `[${requestId}] First attempt extraction results`, {
      foundBankDetails,
      details: detailsFound,
      confidence: extracted.confidence,
      documentType: extracted.document_type,
      notes: extracted.notes
    });

    // If low confidence or no bank details found, retry with more accurate model
    if (!foundBankDetails || extracted.confidence === 'low') {
      logOCR('warn', `[${requestId}] Low confidence or missing bank details - triggering retry`, { 
        reason: !foundBankDetails ? 'no_bank_details' : 'low_confidence' 
      });
      
      try {
        const retryStart = Date.now();
        response = await extractWithModel(imageBase64, mimeType, MODELS.accurate, LOVABLE_API_KEY);
        const retryDuration = Date.now() - retryStart;
        
        if (response.ok) {
          data = await response.json();
          const retryContent = data.choices?.[0]?.message?.content;
          
          if (retryContent) {
            const retryExtracted = parseResponse(retryContent);
            const retryFoundBankDetails = hasBankDetails(retryExtracted);
            
            logOCR('info', `[${requestId}] Retry attempt completed`, {
              duration: `${retryDuration}ms`,
              foundBankDetails: retryFoundBankDetails,
              details: {
                bank_number: retryExtracted.bank_number || null,
                branch_number: retryExtracted.branch_number || null,
                account_number: retryExtracted.account_number || null
              },
              confidence: retryExtracted.confidence
            });
            
            // Use retry result if it found bank details or has higher confidence
            if ((retryFoundBankDetails && !foundBankDetails) ||
                (retryExtracted.confidence === 'high' && extracted.confidence !== 'high')) {
              extracted = retryExtracted;
              extracted.model_used = 'accurate';
              logOCR('success', `[${requestId}] Using retry result - improved extraction`);
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
