import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RejectionRequest {
  vendorRequestId: string;
  reason: string;
}

// Base64 encoding function
function encodeBase64(str: string): string {
  return btoa(unescape(encodeURIComponent(str)));
}

// Send email via raw SMTP
async function sendEmailViaSMTP(
  gmailUser: string,
  gmailPassword: string,
  to: string,
  subject: string,
  htmlContent: string
): Promise<void> {
  const conn = await Deno.connect({
    hostname: "smtp.gmail.com",
    port: 465,
    transport: "tcp",
  });

  const tlsConn = await Deno.startTls(conn, { hostname: "smtp.gmail.com" });
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  async function send(data: string): Promise<void> {
    await tlsConn.write(encoder.encode(data + "\r\n"));
  }

  async function read(): Promise<string> {
    const buffer = new Uint8Array(1024);
    const n = await tlsConn.read(buffer);
    return decoder.decode(buffer.subarray(0, n || 0));
  }

  await read(); // Read greeting
  await send(`EHLO localhost`);
  await read();
  await send(`AUTH LOGIN`);
  await read();
  await send(encodeBase64(gmailUser));
  await read();
  await send(encodeBase64(gmailPassword));
  await read();
  await send(`MAIL FROM:<${gmailUser}>`);
  await read();
  await send(`RCPT TO:<${to}>`);
  await read();
  await send(`DATA`);
  await read();

  const boundary = "----=_Part_" + Date.now();
  const emailContent = [
    `From: =?UTF-8?B?${encodeBase64("ביטוח ישיר")}?= <${gmailUser}>`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${encodeBase64(subject)}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    encodeBase64(htmlContent),
    ``,
    `--${boundary}--`,
    `.`,
  ].join("\r\n");

  await send(emailContent);
  await read();
  await send(`QUIT`);
  tlsConn.close();
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-vendor-rejection function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const gmailUser = Deno.env.get("GMAIL_USER")!;
    const gmailPassword = Deno.env.get("GMAIL_APP_PASSWORD")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { vendorRequestId, reason }: RejectionRequest = await req.json();
    console.log("Sending rejection email for request:", vendorRequestId);

    // Get vendor request details
    const { data: vendorRequest, error: fetchError } = await supabase
      .from("vendor_requests")
      .select("vendor_name, vendor_email, secure_token, handler_name")
      .eq("id", vendorRequestId)
      .single();

    if (fetchError || !vendorRequest) {
      console.error("Error fetching vendor request:", fetchError);
      throw new Error("Vendor request not found");
    }

    const statusUrl = `${Deno.env.get('FRONTEND_URL') || 'https://oneclicksupplier.onrender.com'}/vendor-status/${vendorRequest.secure_token}`;
    const handlerName = vendorRequest.handler_name || "הנציג המטפל בתיק";

    const emailHtml = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; direction: rtl;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #1a2b5f; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
      <h1 style="color: white; margin: 0; font-size: 24px;">ביטוח ישיר</h1>
      <p style="color: #93c5fd; margin: 5px 0 0 0; font-size: 14px;">מערכת הקמת ספקים</p>
    </div>
    
    <div style="background-color: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <h2 style="color: #dc2626; margin-top: 0; text-align: right;">בקשתך להקמה כספק נדחתה</h2>
      
      <p style="text-align: right; color: #374151; line-height: 1.6;">
        שלום ${vendorRequest.vendor_name},
      </p>
      
      <p style="text-align: right; color: #374151; line-height: 1.6;">
        אנו מצטערים להודיע כי בקשתך להקמה כספק בביטוח ישיר נדחתה.
      </p>
      
      <div style="background-color: #f3f4f6; border: 1px solid #d1d5db; border-radius: 8px; padding: 15px; margin: 20px 0;">
        <p style="text-align: right; color: #374151; line-height: 1.6; margin: 0;">
          לקבלת הסבר על סיבת הדחייה, אנא פנה ל<strong>${handlerName}</strong> - הנציג המטפל בתיק שלך.
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 30px;">
        <a href="${statusUrl}" style="display: inline-block; background-color: #1a2b5f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          צפה בסטטוס הבקשה
        </a>
      </div>
      
      <p style="text-align: right; color: #6b7280; font-size: 14px; margin-top: 30px;">
        בברכה,<br>
        צוות ביטוח ישיר
      </p>
    </div>
    
    <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
      <p>© ${new Date().getFullYear()} ביטוח ישיר. כל הזכויות שמורות.</p>
    </div>
  </div>
</body>
</html>
`;

    await sendEmailViaSMTP(
      gmailUser,
      gmailPassword,
      vendorRequest.vendor_email,
      "בקשתך להקמה כספק נדחתה - ביטוח ישיר",
      emailHtml
    );

    console.log("Rejection email sent successfully to:", vendorRequest.vendor_email);

    return new Response(
      JSON.stringify({ success: true, message: "Rejection email sent" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-vendor-rejection:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
