import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VendorFormRequest {
  action: 'get' | 'update' | 'submit' | 'upload' | 'delete-document' | 'get-documents';
  token: string;
  data?: any;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("vendor-form-api function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, token, data }: VendorFormRequest = await req.json();
    console.log(`Processing ${action} for token:`, token);

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Token is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate token and get vendor request
    const { data: vendorRequest, error: fetchError } = await supabase
      .from("vendor_requests")
      .select("*")
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

    switch (action) {
      case 'get': {
        // Return vendor request data
        const { data: docs } = await supabase
          .from("vendor_documents")
          .select("*")
          .eq("vendor_request_id", vendorRequest.id);

        return new Response(
          JSON.stringify({ 
            success: true, 
            request: vendorRequest,
            documents: docs || []
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      case 'get-documents': {
        const { data: docs } = await supabase
          .from("vendor_documents")
          .select("*")
          .eq("vendor_request_id", vendorRequest.id);

        return new Response(
          JSON.stringify({ success: true, documents: docs || [] }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      case 'update': {
        // Update vendor request data (partial update)
        const { error: updateError } = await supabase
          .from("vendor_requests")
          .update({
            ...data,
            updated_at: new Date().toISOString(),
          })
          .eq("id", vendorRequest.id);

        if (updateError) {
          console.error("Error updating vendor request:", updateError);
          throw updateError;
        }

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      case 'submit': {
        // Update vendor request with final data and set status to submitted
        const { error: updateError } = await supabase
          .from("vendor_requests")
          .update({
            ...data,
            status: 'submitted',
            updated_at: new Date().toISOString(),
          })
          .eq("id", vendorRequest.id);

        if (updateError) {
          console.error("Error submitting vendor request:", updateError);
          throw updateError;
        }

        // Send approval emails to procurement manager and VP
        try {
          const baseUrl = supabaseUrl.replace('/rest/v1', '');
          const response = await fetch(`${baseUrl}/functions/v1/send-manager-approval`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({ vendorRequestId: vendorRequest.id }),
          });
          
          if (!response.ok) {
            console.error("Failed to send manager approval emails");
          } else {
            console.log("Manager approval emails sent successfully");
          }
        } catch (emailError) {
          console.error("Error sending manager approval emails:", emailError);
          // Don't fail the submission if emails fail
        }

        return new Response(
          JSON.stringify({ success: true, vendorName: vendorRequest.vendor_name, vendorEmail: vendorRequest.vendor_email }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      case 'delete-document': {
        const { documentType, filePath } = data;
        
        // Delete from storage
        const { error: storageError } = await supabase.storage
          .from('vendor_documents')
          .remove([filePath]);

        if (storageError) {
          console.error("Error deleting from storage:", storageError);
        }

        // Delete from database
        const { error: dbError } = await supabase
          .from("vendor_documents")
          .delete()
          .eq("vendor_request_id", vendorRequest.id)
          .eq("document_type", documentType);

        if (dbError) {
          console.error("Error deleting document record:", dbError);
          throw dbError;
        }

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
    }
  } catch (error: any) {
    console.error("Error in vendor-form-api:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
