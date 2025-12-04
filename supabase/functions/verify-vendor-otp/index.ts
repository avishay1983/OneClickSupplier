import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyOTPRequest {
  token: string;
  otp: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("verify-vendor-otp function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { token, otp }: VerifyOTPRequest = await req.json();
    console.log("Verifying OTP for token:", token);

    if (!token || !otp) {
      return new Response(
        JSON.stringify({ error: "Token and OTP are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get the vendor request
    const { data: vendorRequest, error: fetchError } = await supabase
      .from("vendor_requests")
      .select("id, otp_code, otp_expires_at, expires_at")
      .eq("secure_token", token)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching vendor request:", fetchError);
      throw fetchError;
    }

    if (!vendorRequest) {
      return new Response(
        JSON.stringify({ error: "Request not found" }),
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

    // Check if OTP has expired
    if (vendorRequest.otp_expires_at && new Date(vendorRequest.otp_expires_at) < new Date()) {
      console.log("OTP has expired");
      return new Response(
        JSON.stringify({ error: "otp_expired", message: "קוד האימות פג תוקף, יש לבקש קוד חדש" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify OTP
    if (vendorRequest.otp_code !== otp) {
      console.log("Invalid OTP provided");
      return new Response(
        JSON.stringify({ error: "invalid_otp", message: "קוד אימות שגוי" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Mark as verified and clear OTP
    const { error: updateError } = await supabase
      .from("vendor_requests")
      .update({
        otp_verified: true,
        otp_code: null,
        otp_expires_at: null,
      })
      .eq("id", vendorRequest.id);

    if (updateError) {
      console.error("Error updating verification status:", updateError);
      throw updateError;
    }

    console.log("OTP verified successfully");

    return new Response(
      JSON.stringify({ success: true, message: "אימות בוצע בהצלחה" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in verify-vendor-otp:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
