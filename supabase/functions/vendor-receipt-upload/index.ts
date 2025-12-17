import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  console.log("vendor-receipt-upload function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const formData = await req.formData();
    const token = formData.get("token") as string;
    const file = formData.get("file") as File;
    const amount = formData.get("amount") as string;
    const receiptDate = formData.get("receiptDate") as string;
    const description = formData.get("description") as string | null;

    console.log(`Uploading receipt for token:`, token);

    if (!token || !file || !amount || !receiptDate) {
      return new Response(
        JSON.stringify({ error: "Token, file, amount and receiptDate are required" }),
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

    // Upload file - use safe filename (no Hebrew characters)
    const fileExt = file.name.split('.').pop();
    const safeFileName = `receipt_${Date.now()}.${fileExt}`;
    const filePath = `receipts/${vendorRequest.id}/${safeFileName}`;
    
    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from('vendor_documents')
      .upload(filePath, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Error uploading file:", uploadError);
      throw uploadError;
    }

    // Insert receipt record
    const { data: receiptData, error: insertError } = await supabase
      .from("vendor_receipts")
      .insert({
        vendor_request_id: vendorRequest.id,
        file_path: filePath,
        file_name: file.name,
        amount: parseFloat(amount),
        receipt_date: receiptDate,
        description: description || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting receipt record:", insertError);
      // Try to clean up uploaded file
      await supabase.storage.from('vendor_documents').remove([filePath]);
      throw insertError;
    }

    console.log("Receipt uploaded successfully:", filePath);

    return new Response(
      JSON.stringify({ success: true, receipt: receiptData }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in vendor-receipt-upload:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
