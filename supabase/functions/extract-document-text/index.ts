import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { textContent, documentType } = await req.json();
    
    if (!textContent) {
      return new Response(
        JSON.stringify({ error: 'Missing text content' }),
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

    console.log(`Processing text extraction request for document type: ${documentType}...`);
    console.log('Text content length:', textContent.length);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `אתה מומחה לחילוץ נתונים ממסמכים עסקיים ישראליים.
חלץ את כל הנתונים שתמצא בטקסט מבין הרשימה הבאה:

1. company_id - ח.פ / עוסק מורשה (9 ספרות)
2. company_name - שם החברה / העסק
3. phone - מספר טלפון (קווי)
4. mobile - מספר טלפון נייד (מתחיל ב-05)
5. fax - מספר פקס
6. email - כתובת אימייל
7. city - עיר
8. street - שם רחוב
9. street_number - מספר בית/בניין
10. postal_code - מיקוד
11. bank_number - מספר בנק (2 ספרות). השתמש בטבלת המיפוי הבאה:
    - בנק לאומי / לאומי = 10
    - בנק דיסקונט / דיסקונט = 11
    - בנק הפועלים / פועלים / הפועלים = 12
    - בנק אגוד = 13
    - בנק אוצר החייל = 14
    - בנק מרכנתיל = 17
    - בנק מזרחי טפחות / מזרחי / טפחות = 20
    - בנק הבינלאומי / הבינלאומי = 31
    - בנק מסד = 46
    - בנק פועלי אגודת ישראל = 52
    - בנק ירושלים = 54
12. branch_number - מספר סניף (3-4 ספרות)
13. account_number - מספר חשבון בנק (6-9 ספרות)

חשוב מאוד: אם אתה רואה שם בנק בטקסט, תמיד המר אותו למספר הבנק המתאים לפי הטבלה למעלה!

החזר את התשובה בפורמט JSON בלבד, ללא טקסט נוסף:
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
}

- אם לא ניתן לזהות שדה מסוים, החזר null עבורו.
- שים לב לפורמטים ישראליים: ח.פ בדרך כלל 9 ספרות, נייד מתחיל ב-05, טלפון קווי בדרך כלל מתחיל ב-0.`
          },
          {
            role: 'user',
            content: `חלץ את כל הנתונים העסקיים שתמצא בטקסט הבא (סוג מסמך: ${documentType}):\n\n${textContent}`
          }
        ],
      }),
    });

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
        JSON.stringify({ error: 'ai_error', message: 'שגיאה בעיבוד הטקסט' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error('No content in AI response');
      return new Response(
        JSON.stringify({ error: 'no_response', message: 'לא התקבלה תשובה מהמערכת' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('AI response:', content);

    // Parse JSON from the response (handle markdown code blocks if present)
    let extracted;
    try {
      let jsonStr = content;
      // Remove markdown code blocks if present
      if (jsonStr.includes('```json')) {
        jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (jsonStr.includes('```')) {
        jsonStr = jsonStr.replace(/```\n?/g, '');
      }
      extracted = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return new Response(
        JSON.stringify({ error: 'parse_error', message: 'לא ניתן לעבד את התשובה', raw: content }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Extracted document data:', extracted);

    return new Response(
      JSON.stringify({ success: true, extracted, documentType }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in extract-document-text:', error);
    return new Response(
      JSON.stringify({ error: 'server_error', message: error instanceof Error ? error.message : 'שגיאה בשרת' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
