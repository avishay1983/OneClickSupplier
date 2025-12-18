import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendQuoteRequestPayload {
  quoteId: string;
  vendorEmail: string;
  vendorName: string;
  handlerName: string;
}

function encodeBase64(str: string): string {
  return btoa(unescape(encodeURIComponent(str)));
}

async function sendEmailViaSMTP(
  gmailUser: string,
  gmailPassword: string,
  to: string,
  subject: string,
  htmlContent: string
): Promise<void> {
  const conn = await Deno.connect({ hostname: "smtp.gmail.com", port: 465 });
  const tlsConn = await Deno.startTls(conn, { hostname: "smtp.gmail.com" });

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  async function sendCommand(command: string): Promise<string> {
    await tlsConn.write(encoder.encode(command + "\r\n"));
    const buffer = new Uint8Array(1024);
    const n = await tlsConn.read(buffer);
    return decoder.decode(buffer.subarray(0, n || 0));
  }

  await sendCommand("");
  await sendCommand("EHLO smtp.gmail.com");
  await sendCommand("AUTH LOGIN");
  await sendCommand(btoa(gmailUser));
  await sendCommand(btoa(gmailPassword));
  await sendCommand(`MAIL FROM:<${gmailUser}>`);
  await sendCommand(`RCPT TO:<${to}>`);
  await sendCommand("DATA");

  const boundary = "----=_Part_" + Math.random().toString(36).substring(2);
  
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
    `.`
  ].join("\r\n");

  await tlsConn.write(encoder.encode(emailContent + "\r\n"));
  
  const buffer = new Uint8Array(1024);
  await tlsConn.read(buffer);

  await sendCommand("QUIT");
  tlsConn.close();
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { quoteId, vendorEmail, vendorName, handlerName }: SendQuoteRequestPayload = await req.json();

    console.log("Sending quote request to vendor:", { quoteId, vendorEmail, vendorName });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the quote with its secure token
    const { data: quote, error: quoteError } = await supabase
      .from("vendor_quotes")
      .select("quote_secure_token, vendor_request_id")
      .eq("id", quoteId)
      .single();

    if (quoteError || !quote) {
      console.error("Quote not found:", quoteError);
      throw new Error("Quote not found");
    }

    // Update quote_link_sent_at
    await supabase
      .from("vendor_quotes")
      .update({ quote_link_sent_at: new Date().toISOString() })
      .eq("id", quoteId);

    // Build the quote submission link
    const baseUrl = Deno.env.get("SITE_URL") || "https://ijyqtemnhlbamxmgjuzp.lovableproject.com";
    const quoteLink = `${baseUrl}/vendor-quote/${quote.quote_secure_token}`;

    const emailHtml = `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <img src="https://ijyqtemnhlbamxmgjuzp.supabase.co/storage/v1/object/public/vendor_documents/bituach-yashir-logo.png" alt="ביטוח ישיר" style="max-width: 200px;" />
        </div>
        
        <h2 style="color: #333; text-align: center;">בקשה להצעת מחיר</h2>
        
        <p style="color: #666; font-size: 16px; line-height: 1.6;">
          שלום ${vendorName},
        </p>
        
        <p style="color: #666; font-size: 16px; line-height: 1.6;">
          ${handlerName} מבקש/ת ממך להגיש הצעת מחיר.
        </p>
        
        <p style="color: #666; font-size: 16px; line-height: 1.6;">
          לחץ על הכפתור למטה כדי להגיש את הצעת המחיר שלך:
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${quoteLink}" style="background-color: #0066cc; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-size: 18px; display: inline-block;">
            הגש הצעת מחיר
          </a>
        </div>
        
        <p style="color: #999; font-size: 14px; text-align: center;">
          לינק זה תקף לשבוע אחד.
        </p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
        
        <p style="color: #999; font-size: 12px; text-align: center;">
          הודעה זו נשלחה באופן אוטומטי ממערכת ניהול ספקים של ביטוח ישיר
        </p>
      </div>
    `;

    // Get Gmail credentials
    const gmailUser = Deno.env.get("GMAIL_USER");
    const gmailPassword = Deno.env.get("GMAIL_APP_PASSWORD");

    if (!gmailUser || !gmailPassword) {
      throw new Error("Gmail credentials not configured");
    }

    await sendEmailViaSMTP(
      gmailUser,
      gmailPassword,
      vendorEmail,
      "בקשה להגשת הצעת מחיר - ביטוח ישיר",
      emailHtml
    );

    console.log("Email sent successfully via Gmail SMTP");

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error sending quote request:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
