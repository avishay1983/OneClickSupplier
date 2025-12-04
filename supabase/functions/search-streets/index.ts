import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { city, query } = await req.json();

    if (!city || !query) {
      return new Response(
        JSON.stringify({ error: 'City and query are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Searching streets in ${city} for: ${query}`);

    // Use Nominatim API (OpenStreetMap)
    const searchQuery = `${query}, ${city}, Israel`;
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&addressdetails=1&limit=10&countrycodes=il`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'VendorOnboarding/1.0',
        'Accept-Language': 'he',
      },
    });

    if (!response.ok) {
      console.error('Nominatim API error:', response.status);
      return new Response(
        JSON.stringify({ streets: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    
    // Extract unique street names from results
    const streets = new Set<string>();
    
    for (const result of data) {
      if (result.address?.road) {
        streets.add(result.address.road);
      }
    }

    const streetList = Array.from(streets).slice(0, 8);
    console.log(`Found ${streetList.length} streets`);

    return new Response(
      JSON.stringify({ streets: streetList }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error searching streets:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', streets: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
