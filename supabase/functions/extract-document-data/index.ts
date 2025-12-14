import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MODELS = {
  fast: 'google/gemini-2.5-flash',
  accurate: 'google/gemini-2.5-pro'
};

async function extractWithModel(imageBase64: string, mimeType: string, documentType: string, model: string, apiKey: string) {
  console.log(`Attempting OCR with model: ${model}`);
  
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
          content: `אתה מומחה OCR לחילוץ נתונים מתמונות של מסמכים עסקיים ישראליים.
עליך לסרוק את כל התמונה בקפידה ולחלץ כל נתון שתמצא מהרשימה הבאה:

שדות לחילוץ:
1. company_id - ח.פ / עוסק מורשה (9 ספרות, לפעמים מופיע כ "ע.מ" או "ח.פ")
2. company_name - שם החברה / העסק (בדרך כלל בראש המסמך)
3. phone - מספר טלפון קווי (מתחיל ב-0, 9-10 ספרות)
4. mobile - מספר טלפון נייד (מתחיל ב-05, 10 ספרות)
5. fax - מספר פקס (דומה לטלפון, לפעמים מסומן כ"פקס")
6. email - כתובת אימייל (מכיל @)
7. city - עיר (שם יישוב בישראל)
8. street - שם רחוב (ללא מספר)
9. street_number - מספר בית/בניין
10. postal_code - מיקוד (7 ספרות)
11. bank_number - מספר בנק (2 ספרות, למשל 12 = פועלים, 10 = לאומי, 11 = דיסקונט, 20 = מזרחי)
12. branch_number - מספר סניף בנק (3-4 ספרות)
13. account_number - מספר חשבון בנק (6-9 ספרות)

הנחיות חשובות:
- סרוק את כל אזורי התמונה: כותרת, גוף, תחתית, ופינות
- שים לב לקו מקווקו בהמחאות - מספרי הבנק מופיעים שם
- במסמכי אישור ניהול חשבון, הנתונים מופיעים בטבלה או בשורות
- אם אתה רואה טקסט מטושטש, נסה לפענח אותו לפי הקשר
- ח.פ/עוסק מורשה יכול להופיע גם בתחתית המסמך או בחותמת

החזר תשובה בפורמט JSON בלבד:
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
  "fields_found": ["רשימת השדות שנמצאו"],
  "notes": "הערות על איכות התמונה או בעיות בזיהוי"
}`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `סרוק בקפידה את התמונה הבאה (סוג מסמך: ${documentType}) וחלץ את כל הנתונים העסקיים שתמצא. בדוק את כל אזורי התמונה.`
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

function countExtractedFields(extracted: any): number {
  const fields = ['company_id', 'company_name', 'phone', 'mobile', 'fax', 'email', 
                  'city', 'street', 'street_number', 'postal_code', 
                  'bank_number', 'branch_number', 'account_number'];
  return fields.filter(f => extracted[f] && extracted[f] !== null && extracted[f] !== '').length;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, mimeType, documentType } = await req.json();
    
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

    console.log(`Processing OCR request for document type: ${documentType}...`);

    // First attempt with fast model
    let response = await extractWithModel(imageBase64, mimeType, documentType, MODELS.fast, LOVABLE_API_KEY);

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

    const fieldsFound = countExtractedFields(extracted);
    console.log(`First attempt found ${fieldsFound} fields, confidence: ${extracted.confidence}`);

    // If low confidence or few fields found, retry with more accurate model
    if (extracted.confidence === 'low' || fieldsFound < 2) {
      console.log('Low confidence or few fields - retrying with accurate model...');
      
      try {
        response = await extractWithModel(imageBase64, mimeType, documentType, MODELS.accurate, LOVABLE_API_KEY);
        
        if (response.ok) {
          data = await response.json();
          const retryContent = data.choices?.[0]?.message?.content;
          
          if (retryContent) {
            console.log('Retry AI response:', retryContent);
            const retryExtracted = parseResponse(retryContent);
            const retryFieldsFound = countExtractedFields(retryExtracted);
            
            console.log(`Retry found ${retryFieldsFound} fields, confidence: ${retryExtracted.confidence}`);
            
            // Use retry result if it found more fields or has higher confidence
            if (retryFieldsFound > fieldsFound || 
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
        // Continue with first result
        extracted.model_used = 'fast';
      }
    } else {
      extracted.model_used = 'fast';
    }

    console.log('Final extracted document data:', extracted);

    return new Response(
      JSON.stringify({ success: true, extracted, documentType }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in extract-document-data:', error);
    return new Response(
      JSON.stringify({ error: 'server_error', message: error instanceof Error ? error.message : 'שגיאה בשרת' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
