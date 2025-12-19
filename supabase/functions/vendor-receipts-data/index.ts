import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();
    
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Fetching vendor receipts data for token:', token);

    // Fetch vendor request by token
    const { data: vendorData, error: vendorError } = await supabase
      .from('vendor_requests')
      .select('id, vendor_name, status')
      .eq('secure_token', token)
      .maybeSingle();

    if (vendorError) {
      console.error('Database error:', vendorError);
      return new Response(
        JSON.stringify({ error: 'Database error', details: vendorError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!vendorData) {
      console.log('No vendor request found for token');
      return new Response(
        JSON.stringify({ error: 'not_found', message: 'הבקשה לא נמצאה' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Found vendor request:', vendorData.vendor_name, 'status:', vendorData.status);

    // Fetch receipts for this vendor
    const { data: receiptsData, error: receiptsError } = await supabase
      .from('vendor_receipts')
      .select('*')
      .eq('vendor_request_id', vendorData.id)
      .order('created_at', { ascending: false });

    if (receiptsError) {
      console.error('Error fetching receipts:', receiptsError);
      return new Response(
        JSON.stringify({ error: 'Database error', details: receiptsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        vendor: vendorData,
        receipts: receiptsData || []
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in vendor-receipts-data:', error);
    return new Response(
      JSON.stringify({ error: 'server_error', message: error instanceof Error ? error.message : 'שגיאה בשרת' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
