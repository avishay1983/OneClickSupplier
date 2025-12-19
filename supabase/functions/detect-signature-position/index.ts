import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DetectSignatureRequest {
  imageBase64: string;
  signerType: 'vp' | 'procurement_manager';
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
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this document image and find the signature area for "${signerLabel}".
                
The document has signature lines at the bottom with labels in Hebrew:
- "סמנכ"ל" (VP) - usually on the LEFT side
- "מנהל רכש" (Procurement Manager) - usually in the CENTER
- "הספק" (Vendor) - usually on the RIGHT side

I need to place a signature for "${signerLabel}".

Return ONLY a JSON object with the signature position as percentages of the page dimensions:
{
  "x_percent": <number between 0-100 representing horizontal position from left>,
  "y_percent": <number between 0-100 representing vertical position from top>,
  "found": <boolean>
}

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
                    description: "Vertical position as percentage from top (0-100)" 
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
        vp: { x_percent: 10, y_percent: 62, found: false },
        procurement_manager: { x_percent: 40, y_percent: 62, found: false }
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
      console.log('Detected position:', position);
      
      return new Response(
        JSON.stringify(position),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fallback: try to parse from content
    const content = data.choices?.[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const position = JSON.parse(jsonMatch[0]);
      console.log('Parsed position from content:', position);
      
      return new Response(
        JSON.stringify(position),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Default fallback positions
    const defaultPositions = {
      vp: { x_percent: 10, y_percent: 62, found: false },
      procurement_manager: { x_percent: 40, y_percent: 62, found: false }
    };

    console.log('Using default position for:', signerType);
    return new Response(
      JSON.stringify(defaultPositions[signerType]),
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
