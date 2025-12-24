import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  console.log("vendor-receipt-download function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { token, filePath } = await req.json();

    console.log(`Downloading receipt for token:`, token, `file:`, filePath);

    if (!token || !filePath) {
      return new Response(
        JSON.stringify({ error: "Token and filePath are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate token and get vendor request
    const { data: vendorRequest, error: fetchError } = await supabase
      .from("vendor_requests")
      .select("id, vendor_name, status")
      .eq("secure_token", token)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching vendor request:", fetchError);
      throw fetchError;
    }

    if (!vendorRequest) {
      return new Response(
        JSON.stringify({ error: "not_found", message: "בקשה לא נמצאה" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if vendor is approved
    if (vendorRequest.status !== 'approved') {
      return new Response(
        JSON.stringify({ error: "not_approved", message: "הבקשה טרם אושרה" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify that the file path belongs to this vendor
    if (!filePath.includes(vendorRequest.id)) {
      return new Response(
        JSON.stringify({ error: "unauthorized", message: "אין הרשאה לקובץ זה" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('vendor_documents')
      .download(filePath);

    if (downloadError) {
      console.error("Error downloading file:", downloadError);
      throw downloadError;
    }

    // Convert to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    // Get content type
    const contentType = fileData.type || 'application/octet-stream';

    console.log("File downloaded successfully:", filePath);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: base64,
        contentType 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in vendor-receipt-download:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
