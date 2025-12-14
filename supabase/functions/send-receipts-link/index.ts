import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper function to encode Hebrew text for email subject
function encodeSubject(text: string): string {
  const base64 = btoa(unescape(encodeURIComponent(text)));
  return `=?UTF-8?B?${base64}?=`;
}

// Helper function to encode content for email body
function encodeBody(text: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(text);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function sendEmail(to: string, subject: string, htmlBody: string): Promise<void> {
  const gmailUser = Deno.env.get("GMAIL_USER");
  const gmailPassword = Deno.env.get("GMAIL_APP_PASSWORD");

  if (!gmailUser || !gmailPassword) {
    throw new Error("Gmail credentials not configured");
  }

  console.log(`[send-receipts-link] Sending email to: ${to}`);

  const conn = await Deno.connectTls({
    hostname: "smtp.gmail.com",
    port: 465,
  });

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  async function sendCommand(command: string): Promise<string> {
    await conn.write(encoder.encode(command + "\r\n"));
    const buffer = new Uint8Array(1024);
    const n = await conn.read(buffer);
    const response = decoder.decode(buffer.subarray(0, n || 0));
    console.log(`[SMTP] ${command.substring(0, 50)}... -> ${response.substring(0, 100)}`);
    return response;
  }

  async function readResponse(): Promise<string> {
    const buffer = new Uint8Array(1024);
    const n = await conn.read(buffer);
    const response = decoder.decode(buffer.subarray(0, n || 0));
    console.log(`[SMTP] Initial response: ${response.substring(0, 100)}`);
    return response;
  }

  try {
    await readResponse();
    await sendCommand(`EHLO smtp.gmail.com`);
    await sendCommand(`AUTH LOGIN`);
    await sendCommand(btoa(gmailUser));
    await sendCommand(btoa(gmailPassword));
    await sendCommand(`MAIL FROM:<${gmailUser}>`);
    await sendCommand(`RCPT TO:<${to}>`);
    await sendCommand(`DATA`);

    const encodedSubject = encodeSubject(subject);
    const encodedBody = encodeBody(htmlBody);
    
    const emailContent = [
      `From: "ספק בקליק - ביטוח ישיר" <${gmailUser}>`,
      `To: ${to}`,
      `Subject: ${encodedSubject}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: base64`,
      ``,
      encodedBody,
      `.`,
    ].join("\r\n");

    await conn.write(encoder.encode(emailContent + "\r\n"));
    
    const buffer = new Uint8Array(1024);
    await conn.read(buffer);
    
    await sendCommand(`QUIT`);
    console.log(`[send-receipts-link] Email sent successfully to ${to}`);
  } finally {
    conn.close();
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { vendorRequestId } = await req.json();
    console.log(`[send-receipts-link] Processing request for vendor: ${vendorRequestId}`);

    if (!vendorRequestId) {
      throw new Error("vendorRequestId is required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch vendor request
    const { data: vendor, error: vendorError } = await supabase
      .from("vendor_requests")
      .select("id, vendor_name, vendor_email, secure_token, status, receipts_link_sent_at")
      .eq("id", vendorRequestId)
      .single();

    if (vendorError || !vendor) {
      console.error("[send-receipts-link] Vendor not found:", vendorError);
      throw new Error("Vendor request not found");
    }

    console.log(`[send-receipts-link] Found vendor: ${vendor.vendor_name}, status: ${vendor.status}`);

    // Check if already sent
    if (vendor.receipts_link_sent_at) {
      console.log("[send-receipts-link] Link already sent, skipping");
      return new Response(
        JSON.stringify({ success: true, message: "Link already sent" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if approved
    if (vendor.status !== "approved") {
      console.log("[send-receipts-link] Vendor not approved, skipping");
      return new Response(
        JSON.stringify({ success: false, message: "Vendor not approved yet" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build receipts link
    const baseUrl = req.headers.get("origin") || "https://vendor-click.lovable.app";
    const receiptsLink = `${baseUrl}/vendor-receipts/${vendor.secure_token}`;

    console.log(`[send-receipts-link] Receipts link: ${receiptsLink}`);

    // Send email
    const htmlBody = `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.8; direction: rtl; text-align: right; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: bold; color: #1a2b5f; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 10px; }
          .button { display: inline-block; background: #1a2b5f; color: white !important; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">ספק בקליק - ביטוח ישיר</div>
          </div>
          <div class="content">
            <h2 style="text-align: right;">שלום ${vendor.vendor_name},</h2>
            <p style="text-align: right;">
              שמחים לבשר לך שבקשתך להצטרף כספק של ביטוח ישיר <strong>אושרה!</strong>
            </p>
            <p style="text-align: right;">
              מעתה תוכל להעלות קבלות להתחשבנות דרך הקישור הבא:
            </p>
            <p style="text-align: center;">
              <a href="${receiptsLink}" class="button">העלאת קבלות</a>
            </p>
            <p style="text-align: right;">
              שמור על קישור זה - תוכל להשתמש בו בכל פעם שתרצה להעלות קבלות חדשות.
            </p>
          </div>
          <div class="footer">
            <p>© ביטוח ישיר - כל הזכויות שמורות</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendEmail(
      vendor.vendor_email,
      "בקשתך אושרה - העלאת קבלות לביטוח ישיר",
      htmlBody
    );

    // Update receipts_link_sent_at
    await supabase
      .from("vendor_requests")
      .update({ receipts_link_sent_at: new Date().toISOString() })
      .eq("id", vendorRequestId);

    console.log("[send-receipts-link] Successfully sent receipts link email");

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("[send-receipts-link] Error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
