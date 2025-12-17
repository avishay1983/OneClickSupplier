import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendConfirmationRequest {
  vendorName?: string;
  vendorEmail?: string;
  statusLink?: string;
  // New fields for approval notification
  vendorRequestId?: string;
  sendReceiptsLink?: boolean;
}

// Encode string to Base64 for proper UTF-8 handling
function encodeBase64(str: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  return btoa(String.fromCharCode(...data));
}

// Send email via raw SMTP with proper UTF-8 encoding
async function sendEmailViaSMTP(
  gmailUser: string,
  gmailPassword: string,
  to: string,
  subject: string,
  htmlContent: string
): Promise<void> {
  const subjectBase64 = encodeBase64(subject);
  const encodedSubject = `=?UTF-8?B?${subjectBase64}?=`;

  const boundary = "----=_Part_" + Date.now();
  const rawEmail = [
    `From: ${gmailUser}`,
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
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
  ].join("\r\n");

  const conn = await Deno.connectTls({
    hostname: "smtp.gmail.com",
    port: 465,
  });

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  async function sendCommand(cmd: string): Promise<string> {
    await conn.write(encoder.encode(cmd + "\r\n"));
    const buf = new Uint8Array(4096);
    const n = await conn.read(buf);
    return decoder.decode(buf.subarray(0, n || 0));
  }

  async function readResponse(): Promise<string> {
    const buf = new Uint8Array(4096);
    const n = await conn.read(buf);
    return decoder.decode(buf.subarray(0, n || 0));
  }

  await readResponse();
  await sendCommand(`EHLO ${gmailUser.split('@')[1]}`);
  await sendCommand("AUTH LOGIN");
  await sendCommand(btoa(gmailUser));
  await sendCommand(btoa(gmailPassword));
  await sendCommand(`MAIL FROM:<${gmailUser}>`);
  await sendCommand(`RCPT TO:<${to}>`);
  await sendCommand("DATA");
  await conn.write(encoder.encode(rawEmail + "\r\n.\r\n"));
  await readResponse();
  await sendCommand("QUIT");
  conn.close();
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: SendConfirmationRequest = await req.json();
    
    const gmailUser = Deno.env.get("GMAIL_USER");
    const gmailAppPassword = Deno.env.get("GMAIL_APP_PASSWORD");

    if (!gmailUser || !gmailAppPassword) {
      throw new Error("Gmail credentials not configured");
    }

    // Check if this is an approval notification request
    if (body.vendorRequestId && body.sendReceiptsLink) {
      console.log("Sending approval notification to vendor for request:", body.vendorRequestId);
      
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Fetch vendor request data
      const { data: vendorRequest, error: fetchError } = await supabase
        .from("vendor_requests")
        .select("vendor_name, vendor_email, secure_token")
        .eq("id", body.vendorRequestId)
        .single();

      if (fetchError || !vendorRequest) {
        console.error("Error fetching vendor request:", fetchError);
        throw new Error("Vendor request not found");
      }

      const baseUrl = "https://6422d882-b11f-4b09-8a0b-47925031a58e.lovableproject.com";
      const receiptsLink = `${baseUrl}/vendor-receipts/${vendorRequest.secure_token}`;
      const statusLink = `${baseUrl}/vendor-status/${vendorRequest.secure_token}`;

      const approvalEmailHtml = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
<meta charset="UTF-8">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.8; color: #333; direction: rtl; text-align: right; margin: 0; padding: 20px; background-color: #f5f5f5;">
<div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
<div style="background: #1a2b5f; color: white; padding: 20px; text-align: right;">
<img src="https://www.555.co.il/resources/images/BY737X463.png" alt="ביטוח ישיר" style="max-width: 150px; height: auto; margin-bottom: 15px;" />
<h1 style="margin: 0; text-align: center; color: white;">ברוכים הבאים למשפחה! 🌟</h1>
</div>
<div style="padding: 30px;">
<div style="background: linear-gradient(135deg, #e0f2fe 0%, #f0fdf4 100%); border-radius: 12px; padding: 20px; margin-bottom: 20px; text-align: center;">
<div style="font-size: 40px; margin-bottom: 10px;">✨</div>
<p style="margin: 0; font-size: 18px; color: #1e40af; font-weight: bold;">שמחים שהצטרפת אלינו!</p>
<p style="margin: 8px 0 0 0; color: #475569;">אנחנו מתרגשים לקבל אותך כחלק מצוות הספקים שלנו</p>
</div>
<p style="margin: 12px 0;">שלום ${vendorRequest.vendor_name},</p>
<p style="margin: 12px 0;">בקשתך להצטרף כספק של ביטוח ישיר <strong style="color: #16a34a;">אושרה בהצלחה!</strong></p>
<p style="margin: 12px 0;">מעתה תוכל להעלות קבלות להתחשבנות דרך הקישור הבא:</p>
<div style="text-align: center; margin: 25px 0;">
<a href="${receiptsLink}" style="display: inline-block; background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); color: white; padding: 14px 35px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(22, 163, 74, 0.3);">📄 העלאת קבלות</a>
</div>
<p style="margin: 12px 0; color: #64748b; font-size: 14px;">שמור על קישור זה - תוכל להשתמש בו בכל פעם שתרצה להעלות קבלות חדשות.</p>
<div style="border-top: 1px solid #e2e8f0; margin-top: 25px; padding-top: 20px;">
<p style="margin: 0; font-size: 12px; color: #94a3b8;">הודעה זו נשלחה באופן אוטומטי ממערכת ספק בקליק.</p>
</div>
</div>
</div>
</body>
</html>`;

      await sendEmailViaSMTP(gmailUser, gmailAppPassword, vendorRequest.vendor_email, "בקשתך אושרה - ברוכים הבאים לביטוח ישיר!", approvalEmailHtml);

      // Update receipts_link_sent_at
      await supabase
        .from("vendor_requests")
        .update({ receipts_link_sent_at: new Date().toISOString() })
        .eq("id", body.vendorRequestId);

      console.log("Approval notification email sent successfully to:", vendorRequest.vendor_email);

      return new Response(JSON.stringify({ success: true, type: 'approval' }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Original flow: form submission confirmation
    const { vendorName, vendorEmail, statusLink } = body;

    if (!vendorName || !vendorEmail || !statusLink) {
      throw new Error("Missing required fields: vendorName, vendorEmail, statusLink");
    }

    console.log("Sending form submission confirmation to vendor:", vendorEmail);
    console.log("Status link:", statusLink);

    const emailHtml = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
<meta charset="UTF-8">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.8; color: #333; direction: rtl; text-align: right; margin: 0; padding: 20px; background-color: #f5f5f5;">
<div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
<div style="background: #1a2b5f; color: white; padding: 20px; text-align: right;">
<img src="https://www.555.co.il/resources/images/BY737X463.png" alt="ביטוח ישיר" style="max-width: 150px; height: auto; margin-bottom: 15px;" />
<h1 style="margin: 0; text-align: center; color: white;">הפרטים התקבלו בהצלחה</h1>
</div>
<div style="padding: 30px;">
<div style="text-align: center; font-size: 48px; margin-bottom: 16px;">✅</div>
<p style="margin: 12px 0;">שלום ${vendorName},</p>
<p style="margin: 12px 0;">תודה על מילוי טופס הקמת הספק! הפרטים שלך התקבלו בהצלחה ונמצאים כעת בבדיקה.</p>
<p style="margin: 12px 0;">תוכל לעקוב אחר סטטוס הבקשה שלך בכל עת באמצעות הלינק הבא:</p>
<div style="text-align: center; margin: 25px 0;">
<a href="${statusLink}" style="display: inline-block; background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold;">מעקב סטטוס הבקשה</a>
</div>
<p style="margin: 12px 0;">נעדכן אותך במייל כאשר הבקשה תאושר.</p>
<p style="margin-top: 30px; font-size: 12px; color: #666;">הודעה זו נשלחה באופן אוטומטי ממערכת הקמת ספקים.</p>
</div>
</div>
</body>
</html>`;

    await sendEmailViaSMTP(gmailUser, gmailAppPassword, vendorEmail, "הפרטים שלך התקבלו - ביטוח ישיר", emailHtml);

    console.log("Confirmation email sent successfully via raw SMTP");

    return new Response(JSON.stringify({ success: true, type: 'submission' }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending confirmation email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
