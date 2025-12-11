import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OTPRequest {
  token: string;
}

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-vendor-otp function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const gmailUser = Deno.env.get("GMAIL_USER");
    const gmailAppPassword = Deno.env.get("GMAIL_APP_PASSWORD");

    if (!gmailUser || !gmailAppPassword) {
      throw new Error("Gmail credentials not configured");
    }

    const { token }: OTPRequest = await req.json();
    console.log("Processing OTP request for token:", token);

    if (!token) {
      console.error("Missing token");
      return new Response(
        JSON.stringify({ error: "Token is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get the vendor request
    const { data: vendorRequest, error: fetchError } = await supabase
      .from("vendor_requests")
      .select("id, vendor_email, vendor_name, expires_at, otp_verified, status")
      .eq("secure_token", token)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching vendor request:", fetchError);
      throw fetchError;
    }

    if (!vendorRequest) {
      console.error("Vendor request not found");
      return new Response(
        JSON.stringify({ error: "Request not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if link has expired
    if (vendorRequest.expires_at && new Date(vendorRequest.expires_at) < new Date()) {
      console.log("Link has expired");
      return new Response(
        JSON.stringify({ error: "expired", message: "הלינק פג תוקף" }),
        { status: 410, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if already verified (for status check)
    if (vendorRequest.otp_verified && vendorRequest.status !== 'resent') {
      console.log("OTP already verified");
      return new Response(
        JSON.stringify({ verified: true }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate new OTP
    const otpCode = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Update the vendor request with OTP
    const { error: updateError } = await supabase
      .from("vendor_requests")
      .update({
        otp_code: otpCode,
        otp_expires_at: otpExpiresAt.toISOString(),
        otp_verified: false,
      })
      .eq("id", vendorRequest.id);

    if (updateError) {
      console.error("Error updating OTP:", updateError);
      throw updateError;
    }

    const emailHtml = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
<meta charset="UTF-8">
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; direction: rtl; text-align: right;">
<div style="margin-bottom: 20px; background-color: #1a2b5f; padding: 20px; border-radius: 8px 8px 0 0; text-align: right;">
<img src="https://www.555.co.il/resources/images/BY737X463.png" alt="ביטוח ישיר" style="max-width: 150px; height: auto;" />
</div>
<h1 style="color: #1a365d; text-align: right;">קוד אימות</h1>
<p style="text-align: right;">שלום ${vendorRequest.vendor_name},</p>
<p style="text-align: right;">קוד האימות שלך להיכנס לטופס הספק הוא:</p>
<div style="background-color: #f0f4f8; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
<span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #2563eb;">${otpCode}</span>
</div>
<p style="color: #718096; text-align: right;">הקוד תקף ל-10 דקות בלבד.</p>
<p style="text-align: right;">אם לא ביקשת קוד זה, התעלם מהודעה זו.</p>
</body>
</html>`;

    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: {
          username: gmailUser,
          password: gmailAppPassword,
        },
      },
    });

    await client.send({
      from: gmailUser,
      to: vendorRequest.vendor_email,
      subject: "קוד אימות לטופס ספק",
      content: "auto",
      html: emailHtml,
    });

    await client.close();

    console.log("OTP email sent successfully via Gmail SMTP");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "קוד אימות נשלח למייל",
        email: vendorRequest.vendor_email.replace(/(.{2})(.*)(@.*)/, "$1***$3") // Mask email
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-vendor-otp:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
