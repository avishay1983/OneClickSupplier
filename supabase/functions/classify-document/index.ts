import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Document type labels in Hebrew for the prompt
const DOCUMENT_TYPE_DESCRIPTIONS: Record<string, string> = {
  'bookkeeping_cert': 'אישור ניהול ספרים - מסמך רשמי מרשויות המס המאשר כי העסק מנהל ספרים כחוק',
  'tax_cert': 'אישור ניכוי מס במקור - מסמך רשמי מרשויות המס לגבי ניכוי מס',
  'bank_confirmation': 'צילום המחאה או אישור בנק - מסמך המציג פרטי חשבון בנק, המחאה מבוטלת או אישור מהבנק',
  'invoice_screenshot': 'צילום חשבונית - חשבונית מס או קבלה עסקית',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, expectedType } = await req.json();
    
    if (!imageBase64) {
      console.error('[classify-document] Missing imageBase64');
      return new Response(
        JSON.stringify({ error: 'חסר תמונת המסמך' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      console.error('[classify-document] OPENAI_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'שגיאת תצורה בשרת' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[classify-document] Classifying document, expected type: ${expectedType}`);

    const prompt = `אתה מומחה לזיהוי וסיווג מסמכים עסקיים בעברית. 
נתח את התמונה וקבע איזה סוג מסמך זה.

סוגי המסמכים האפשריים:
1. bookkeeping_cert - אישור ניהול ספרים: מסמך רשמי מרשות המסים המאשר שהעסק מנהל ספרים כדין. בדרך כלל מכיל את הכותרת "אישור ניהול פנקסי חשבונות" או דומה.
2. tax_cert - אישור ניכוי מס במקור: מסמך רשמי מרשות המסים לגבי שיעור ניכוי המס במקור. בדרך כלל מכיל "אישור על ניכוי מס במקור" או "פטור מניכוי מס".
3. bank_confirmation - צילום המחאה או אישור בנק: המחאה (צ'ק), אישור פרטי חשבון מהבנק, או כל מסמך המציג מספר חשבון בנק וסניף.
4. invoice_screenshot - צילום חשבונית: חשבונית מס, חשבונית עסקה, קבלה. מכיל פרטי עסקה, סכומים, מע"מ.
5. unknown - לא ניתן לזהות או לא אחד מהסוגים הנ"ל.

החזר תשובה בפורמט JSON בלבד:
{
  "detected_type": "הסוג שזוהה (אחד מ: bookkeeping_cert, tax_cert, bank_confirmation, invoice_screenshot, unknown)",
  "confidence": "high/medium/low",
  "detected_type_hebrew": "שם הסוג בעברית",
  "reason": "הסבר קצר למה זה הסוג הזה"
}`;

    // Extract base64 data from data URL if present
    let imageData = imageBase64;
    let mimeType = 'image/jpeg';
    if (imageBase64.startsWith('data:')) {
      const matches = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        mimeType = matches[1];
        imageData = matches[2];
      }
    }

    const imageUrl = imageBase64.startsWith('data:')
      ? imageBase64
      : `data:${mimeType};base64,${imageData}`;

    // OpenAI API (vision)
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0.1,
        max_tokens: 800,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[classify-document] OpenAI API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'שגיאה בזיהוי המסמך', skip_validation: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || '';

    console.log('[classify-document] AI response:', content);

    // Parse JSON from response
    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('[classify-document] Failed to parse AI response:', parseError);
      return new Response(
        JSON.stringify({ error: 'שגיאה בעיבוד התשובה', skip_validation: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const detectedType = result.detected_type;
    const isMatch = detectedType === expectedType;
    const expectedTypeHebrew = expectedType ? DOCUMENT_TYPE_DESCRIPTIONS[expectedType]?.split(' - ')[0] || expectedType : '';

    console.log(`[classify-document] Detected: ${detectedType}, Expected: ${expectedType}, Match: ${isMatch}`);

    return new Response(
      JSON.stringify({
        detected_type: detectedType,
        detected_type_hebrew: result.detected_type_hebrew,
        expected_type: expectedType,
        expected_type_hebrew: expectedTypeHebrew,
        is_match: isMatch,
        confidence: result.confidence,
        reason: result.reason,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[classify-document] Error:', error);
    return new Response(
      JSON.stringify({ error: 'שגיאה בזיהוי המסמך', skip_validation: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
