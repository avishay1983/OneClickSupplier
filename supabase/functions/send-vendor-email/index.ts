import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendVendorEmailRequest {
  vendorName?: string;
  vendorEmail?: string;
  secureLink?: string;
  vendorRequestId?: string;
  includeReason?: boolean;
  reason?: string;
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
    const requestData: SendVendorEmailRequest = await req.json();

    let vendorName = requestData.vendorName;
    let vendorEmail = requestData.vendorEmail;
    let secureLink = requestData.secureLink;
    const includeReason = requestData.includeReason || false;
    const reason = requestData.reason || '';

    if (requestData.vendorRequestId && (!vendorName || !vendorEmail || !secureLink)) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { data: vendorRequest, error } = await supabase
        .from("vendor_requests")
        .select("vendor_name, vendor_email, secure_token")
        .eq("id", requestData.vendorRequestId)
        .single();

      if (error || !vendorRequest) {
        throw new Error("Vendor request not found");
      }

      vendorName = vendorRequest.vendor_name;
      vendorEmail = vendorRequest.vendor_email;
      secureLink = `${Deno.env.get('FRONTEND_URL') || 'https://oneclicksupplier.onrender.com'}/vendor/${vendorRequest.secure_token}`;
    }

    if (!vendorName || !vendorEmail || !secureLink) {
      throw new Error("Missing required parameters");
    }

    console.log("Sending email to vendor:", vendorEmail);
    console.log("Secure link:", secureLink);
    console.log("Include reason:", includeReason);

    const gmailUser = Deno.env.get("GMAIL_USER");
    const gmailAppPassword = Deno.env.get("GMAIL_APP_PASSWORD");

    if (!gmailUser || !gmailAppPassword) {
      throw new Error("Gmail credentials not configured");
    }

    const reasonSection = includeReason && reason ? `
<div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 15px; margin: 20px 0;">
<p style="margin: 0 0 10px 0; font-weight: bold; color: #92400e;">הערה מהמטפל:</p>
<p style="margin: 0; color: #78350f;">${reason}</p>
</div>
<p style="margin: 12px 0;">אנא תקן את הפרטים בטופס ושלח מחדש.</p>` : '';

    const emailHtml = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
<meta charset="UTF-8">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.8; color: #333; direction: rtl; text-align: right; margin: 0; padding: 20px; background-color: #f5f5f5;">
<div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
<div style="background: #1a2b5f; color: white; padding: 20px; text-align: right;">
<img src="https://www.555.co.il/resources/images/BY737X463.png" alt="ביטוח ישיר" style="max-width: 150px; height: auto; margin-bottom: 15px;" />
<h1 style="margin: 0; text-align: center; color: white;">${includeReason ? 'נדרשים תיקונים בטופס' : 'בקשה להקמת ספק'}</h1>
</div>
<div style="padding: 30px;">
<p style="margin: 12px 0;">שלום ${vendorName},</p>
${includeReason ? `
<p style="margin: 12px 0;">הטופס שהגשת נבדק ונמצאו פרטים שדורשים תיקון.</p>
${reasonSection}
` : `
<p style="margin: 12px 0;">התקבלה בקשה להקמתך כספק במערכת שלנו.</p>
<p style="margin: 12px 0;">על מנת להשלים את תהליך ההקמה, אנא לחץ על הכפתור למטה ומלא את הפרטים הנדרשים.</p>
`}
<p style="margin: 12px 0;">הקישור הזה הוא אישי ומאובטח. אנא אל תשתף אותו עם אחרים.</p>
<p style="margin: 12px 0;">במידה ויש לך שאלות, אנא פנה לאיש הקשר שלך בחברה.</p>
<div style="text-align: center; margin: 25px 0;">
<a href="${secureLink}" style="display: inline-block; background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold;">${includeReason ? 'עדכון טופס ספק' : 'מילוי טופס ספק'}</a>
</div>
<p style="margin-top: 30px; font-size: 12px; color: #666;">הודעה זו נשלחה באופן אוטומטי ממערכת הקמת ספקים.</p>
</div>
</div>
</body>
</html>`;

    const subject = includeReason ? "נדרשים תיקונים בטופס הספק" : "בקשה להקמת ספק - נדרשים פרטים";

    await sendEmailViaSMTP(gmailUser, gmailAppPassword, vendorEmail, subject, emailHtml);

    console.log("Email sent successfully via raw SMTP");

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending vendor email:", error);
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
