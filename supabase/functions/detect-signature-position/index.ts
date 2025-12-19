import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DetectSignatureRequest {
  imageBase64: string;
  signerType: 'vp' | 'procurement_manager';
}

function normalizePosition(
  input: any,
  signerType: DetectSignatureRequest["signerType"],
): { x_percent: number; y_percent: number; found: boolean } {
  const fallback =
    signerType === "vp"
      ? { x_percent: 12, y_percent: 62, found: false }
      : { x_percent: 44, y_percent: 62, found: false };

  const rawX = Number(input?.x_percent);
  const rawY = Number(input?.y_percent);
  const found = Boolean(input?.found);

  let x = Number.isFinite(rawX) ? rawX : fallback.x_percent;
  let y = Number.isFinite(rawY) ? rawY : fallback.y_percent;

  x = Math.max(0, Math.min(100, x));
  y = Math.max(0, Math.min(100, y));

  // Prevent common RTL confusion: ensure VP is left third and Procurement Manager is middle.
  if (signerType === "vp" && x > 30) x = fallback.x_percent;
  if (signerType === "procurement_manager" && (x < 30 || x > 70)) x = fallback.x_percent;

  return { x_percent: x, y_percent: y, found };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, signerType }: DetectSignatureRequest = await req.json();
    
    console.log('Detecting signature position for:', signerType);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const signerLabel = signerType === 'vp' ? 'סמנכ"ל' : 'מנהל רכש';
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this document image and find the signature area for "${signerLabel}".

The document has signature lines with labels in Hebrew. IMPORTANT: x_percent is measured from the LEFT edge of the image (even though Hebrew is RTL):
- "סמנכ\"ל" (VP) - leftmost line
- "מנהל רכש" (Procurement Manager) - middle line
- "הספק" (Vendor) - rightmost line

I need to place a signature for "${signerLabel}".

Return ONLY a JSON object with the signature position as percentages of the page dimensions:
{
  "x_percent": <number between 0-100 representing horizontal position from left>,
  "y_percent": <number between 0-100 representing vertical position from bottom>,
  "found": <boolean>
}

x_percent/y_percent should represent the BOTTOM-LEFT placement point of the signature image (not the center).
The signature should be placed ABOVE the signature line, not on top of the label text.
If you can identify the signature area, set found=true. If not visible, estimate based on typical positions.`
              },
              {
                type: "image_url",
                image_url: {
                  url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/png;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_signature_position",
              description: "Report the detected signature position",
              parameters: {
                type: "object",
                properties: {
                  x_percent: { 
                    type: "number", 
                    description: "Horizontal position as percentage from left (0-100)" 
                  },
                  y_percent: { 
                    type: "number", 
                    description: "Vertical position as percentage from bottom (0-100)" 
                  },
                  found: { 
                    type: "boolean", 
                    description: "Whether the signature area was found" 
                  }
                },
                required: ["x_percent", "y_percent", "found"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "report_signature_position" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      // Return default positions if AI fails
      const defaultPositions = {
        vp: { x_percent: 12, y_percent: 62, found: false },
        procurement_manager: { x_percent: 44, y_percent: 62, found: false }
      };
      
      return new Response(
        JSON.stringify(defaultPositions[signerType]),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('AI response:', JSON.stringify(data, null, 2));

    // Extract the tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall && toolCall.function?.arguments) {
      const position = JSON.parse(toolCall.function.arguments);
      const normalized = normalizePosition(position, signerType);
      console.log('Detected position (raw):', position);
      console.log('Detected position (normalized):', normalized);

      return new Response(
        JSON.stringify(normalized),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fallback: try to parse from content
    const content = data.choices?.[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const position = JSON.parse(jsonMatch[0]);
      const normalized = normalizePosition(position, signerType);
      console.log('Parsed position from content (raw):', position);
      console.log('Parsed position from content (normalized):', normalized);

      return new Response(
        JSON.stringify(normalized),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Default fallback positions
    const defaultPositions = {
      vp: { x_percent: 12, y_percent: 62, found: false },
      procurement_manager: { x_percent: 44, y_percent: 62, found: false }
    };

    console.log('Using default position for:', signerType);
    return new Response(
      JSON.stringify(normalizePosition(defaultPositions[signerType], signerType)),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error detecting signature position:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
