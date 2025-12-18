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
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f4; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); overflow: hidden;">
                <!-- Header with Logo -->
                <tr>
                  <td style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 30px 40px; text-align: center;">
                    <img src="https://ijyqtemnhlbamxmgjuzp.lovableproject.com/images/bituach-yashir-logo-dark.png" alt="ביטוח ישיר" style="max-width: 180px; height: auto;" />
                  </td>
                </tr>
                
                <!-- Main Content -->
                <tr>
                  <td style="padding: 40px;">
                    <h1 style="color: #1e3a8a; font-size: 24px; font-weight: bold; margin: 0 0 25px 0; text-align: center;">
                      בקשה להצעת מחיר
                    </h1>
                    
                    <p style="color: #374151; font-size: 16px; line-height: 1.8; margin: 0 0 15px 0;">
                      שלום <strong>${vendorName}</strong>,
                    </p>
                    
                    <p style="color: #374151; font-size: 16px; line-height: 1.8; margin: 0 0 15px 0;">
                      <strong>${handlerName}</strong> מבקש/ת ממך להגיש הצעת מחיר.
                    </p>
                    
                    <p style="color: #374151; font-size: 16px; line-height: 1.8; margin: 0 0 30px 0;">
                      לחץ על הכפתור למטה כדי להגיש את הצעת המחיר שלך:
                    </p>
                    
                    <!-- CTA Button -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center">
                          <a href="${quoteLink}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1e3a8a 100%); color: #ffffff; font-size: 18px; font-weight: bold; text-decoration: none; padding: 16px 48px; border-radius: 8px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);">
                            הגש הצעת מחיר
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="color: #6b7280; font-size: 14px; text-align: center; margin: 25px 0 0 0;">
                      ⏰ לינק זה תקף לשבוע אחד
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8fafc; padding: 25px 40px; border-top: 1px solid #e5e7eb;">
                    <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
                      הודעה זו נשלחה באופן אוטומטי ממערכת ניהול ספקים של ביטוח ישיר
                    </p>
                    <p style="color: #9ca3af; font-size: 11px; text-align: center; margin: 10px 0 0 0;">
                      © ${new Date().getFullYear()} ביטוח ישיר - כל הזכויות שמורות
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
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
