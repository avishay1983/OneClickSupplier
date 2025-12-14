import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MODELS = {
  fast: 'google/gemini-2.5-flash',
  accurate: 'google/gemini-2.5-pro'
};

async function extractWithModel(imageBase64: string, mimeType: string, model: string, apiKey: string) {
  console.log(`Attempting bank OCR with model: ${model}`);
  
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
    
    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'Missing image data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing OCR request for bank document...');

    // First attempt with fast model
    let response = await extractWithModel(imageBase64, mimeType, MODELS.fast, LOVABLE_API_KEY);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
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
      console.error('No content in AI response');
      return new Response(
        JSON.stringify({ error: 'no_response', message: 'לא התקבלה תשובה מהמערכת' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('First attempt AI response:', content);

    let extracted;
    try {
      extracted = parseResponse(content);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return new Response(
        JSON.stringify({ error: 'parse_error', message: 'לא ניתן לעבד את התשובה', raw: content }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const foundBankDetails = hasBankDetails(extracted);
    console.log(`First attempt - found bank details: ${foundBankDetails}, confidence: ${extracted.confidence}`);

    // If low confidence or no bank details found, retry with more accurate model
    if (!foundBankDetails || extracted.confidence === 'low') {
      console.log('No bank details or low confidence - retrying with accurate model...');
      
      try {
        response = await extractWithModel(imageBase64, mimeType, MODELS.accurate, LOVABLE_API_KEY);
        
        if (response.ok) {
          data = await response.json();
          const retryContent = data.choices?.[0]?.message?.content;
          
          if (retryContent) {
            console.log('Retry AI response:', retryContent);
            const retryExtracted = parseResponse(retryContent);
            const retryFoundBankDetails = hasBankDetails(retryExtracted);
            
            console.log(`Retry - found bank details: ${retryFoundBankDetails}, confidence: ${retryExtracted.confidence}`);
            
            // Use retry result if it found bank details or has higher confidence
            if ((retryFoundBankDetails && !foundBankDetails) ||
                (retryExtracted.confidence === 'high' && extracted.confidence !== 'high')) {
              extracted = retryExtracted;
              extracted.model_used = 'accurate';
              console.log('Using retry result');
            } else {
              extracted.model_used = 'fast';
            }
          }
        }
      } catch (retryError) {
        console.error('Retry failed:', retryError);
        extracted.model_used = 'fast';
      }
    } else {
      extracted.model_used = 'fast';
    }

    console.log('Final extracted bank details:', extracted);

    return new Response(
      JSON.stringify({ success: true, extracted }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in extract-bank-details:', error);
    return new Response(
      JSON.stringify({ error: 'server_error', message: error instanceof Error ? error.message : 'שגיאה בשרת' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
