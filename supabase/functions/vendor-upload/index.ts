import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  console.log("vendor-upload function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const formData = await req.formData();
    const token = formData.get("token") as string;
    const documentType = formData.get("documentType") as string;
    const file = formData.get("file") as File;
    const extractedTags = formData.get("extractedTags") as string | null;

    console.log(`Uploading ${documentType} for token:`, token);

    if (!token || !documentType || !file) {
      return new Response(
        JSON.stringify({ error: "Token, documentType and file are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate token and get vendor request
    const { data: vendorRequest, error: fetchError } = await supabase
      .from("vendor_requests")
      .select("id, expires_at")
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

    // Check if link has expired
    if (vendorRequest.expires_at && new Date(vendorRequest.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "expired", message: "הלינק פג תוקף" }),
        { status: 410, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Delete existing document of same type
    const { data: existingDocs } = await supabase
      .from("vendor_documents")
      .select("file_path")
      .eq("vendor_request_id", vendorRequest.id)
      .eq("document_type", documentType);

    if (existingDocs && existingDocs.length > 0) {
      // Delete from storage
      const filePaths = existingDocs.map(doc => doc.file_path);
      await supabase.storage.from('vendor_documents').remove(filePaths);
      
      // Delete from database
      await supabase
        .from("vendor_documents")
        .delete()
        .eq("vendor_request_id", vendorRequest.id)
        .eq("document_type", documentType);
    }

    // Upload new file - handle contract uploads separately
    const fileExt = file.name.split('.').pop();
    let filePath: string;
    
    if (documentType === 'contract') {
      filePath = `contracts/${vendorRequest.id}/contract_${Date.now()}.${fileExt}`;
    } else {
      filePath = `${vendorRequest.id}/${documentType}_${Date.now()}.${fileExt}`;
    }
    
    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from('vendor_documents')
      .upload(filePath, arrayBuffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Error uploading file:", uploadError);
      throw uploadError;
    }

    // For contract uploads, update the vendor_requests table
    if (documentType === 'contract') {
      const { error: updateError } = await supabase
        .from("vendor_requests")
        .update({
          contract_file_path: filePath,
          contract_uploaded_at: new Date().toISOString(),
        })
        .eq("id", vendorRequest.id);

      if (updateError) {
        console.error("Error updating contract path:", updateError);
        throw updateError;
      }
    } else {
      // Create document record for non-contract documents
      const documentData: any = {
        vendor_request_id: vendorRequest.id,
        document_type: documentType,
        file_name: file.name,
        file_path: filePath,
      };

      if (extractedTags) {
        try {
          documentData.extracted_tags = JSON.parse(extractedTags);
        } catch (e) {
          console.error("Error parsing extracted tags:", e);
        }
      }

      const { error: insertError } = await supabase
        .from("vendor_documents")
        .insert(documentData);

      if (insertError) {
        console.error("Error inserting document record:", insertError);
        throw insertError;
      }
    }

    console.log("File uploaded successfully:", filePath);

    return new Response(
      JSON.stringify({ success: true, filePath }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

    return new Response(
      JSON.stringify({ success: true, filePath }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in vendor-upload:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
