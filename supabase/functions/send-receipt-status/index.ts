import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendReceiptStatusRequest {
  vendorName: string;
  vendorEmail: string;
  receiptAmount: number;
  receiptDate: string;
  status: 'approved' | 'rejected';
  rejectionReason?: string;
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
    const body: SendReceiptStatusRequest = await req.json();
    const { vendorName, vendorEmail, receiptAmount, receiptDate, status, rejectionReason } = body;

    if (!vendorName || !vendorEmail || !receiptAmount || !receiptDate || !status) {
      throw new Error("Missing required fields");
    }

    const gmailUser = Deno.env.get("GMAIL_USER");
    const gmailAppPassword = Deno.env.get("GMAIL_APP_PASSWORD");

    if (!gmailUser || !gmailAppPassword) {
      throw new Error("Gmail credentials not configured");
    }

    console.log(`Sending receipt ${status} email to vendor:`, vendorEmail);

    const formattedAmount = `₪${receiptAmount.toLocaleString()}`;
    const formattedDate = new Date(receiptDate).toLocaleDateString('he-IL');

    let emailHtml: string;
    let subject: string;

    if (status === 'approved') {
      subject = "קבלה אושרה לתשלום - ביטוח ישיר";
      emailHtml = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
<meta charset="UTF-8">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.8; color: #333; direction: rtl; text-align: right; margin: 0; padding: 20px; background-color: #f5f5f5;">
<div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
<div style="background: #1a2b5f; color: white; padding: 20px; text-align: right;">
<img src="https://www.555.co.il/resources/images/BY737X463.png" alt="ביטוח ישיר" style="max-width: 150px; height: auto; margin-bottom: 15px;" />
<h1 style="margin: 0; text-align: center; color: white;">קבלה אושרה ✅</h1>
</div>
<div style="padding: 30px;">
<div style="background: linear-gradient(135deg, #dcfce7 0%, #f0fdf4 100%); border-radius: 12px; padding: 20px; margin-bottom: 20px; text-align: center;">
<div style="font-size: 40px; margin-bottom: 10px;">✨</div>
<p style="margin: 0; font-size: 18px; color: #16a34a; font-weight: bold;">הקבלה שלך אושרה לתשלום!</p>
</div>
<p style="margin: 12px 0;">שלום ${vendorName},</p>
<p style="margin: 12px 0;">אנו שמחים לעדכן אותך כי הקבלה שהגשת <strong style="color: #16a34a;">אושרה לתשלום</strong>.</p>
<div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 20px 0; border-right: 4px solid #16a34a;">
<p style="margin: 4px 0;"><strong>פרטי הקבלה:</strong></p>
<p style="margin: 4px 0;">סכום: <strong>${formattedAmount}</strong></p>
<p style="margin: 4px 0;">תאריך קבלה: <strong>${formattedDate}</strong></p>
</div>
<p style="margin: 12px 0;">התשלום יבוצע בהתאם לתנאי התשלום שנקבעו.</p>
<div style="border-top: 1px solid #e2e8f0; margin-top: 25px; padding-top: 20px;">
<p style="margin: 0; font-size: 12px; color: #94a3b8;">הודעה זו נשלחה באופן אוטומטי ממערכת ספק בקליק.</p>
</div>
</div>
</div>
</body>
</html>`;
    } else {
      subject = "קבלה נדחתה - ביטוח ישיר";
      emailHtml = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
<meta charset="UTF-8">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.8; color: #333; direction: rtl; text-align: right; margin: 0; padding: 20px; background-color: #f5f5f5;">
<div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
<div style="background: #1a2b5f; color: white; padding: 20px; text-align: right;">
<img src="https://www.555.co.il/resources/images/BY737X463.png" alt="ביטוח ישיר" style="max-width: 150px; height: auto; margin-bottom: 15px;" />
<h1 style="margin: 0; text-align: center; color: white;">קבלה נדחתה ❌</h1>
</div>
<div style="padding: 30px;">
<div style="background: linear-gradient(135deg, #fee2e2 0%, #fef2f2 100%); border-radius: 12px; padding: 20px; margin-bottom: 20px; text-align: center;">
<div style="font-size: 40px; margin-bottom: 10px;">📋</div>
<p style="margin: 0; font-size: 18px; color: #dc2626; font-weight: bold;">הקבלה שהגשת נדחתה</p>
</div>
<p style="margin: 12px 0;">שלום ${vendorName},</p>
<p style="margin: 12px 0;">לצערנו, הקבלה שהגשת <strong style="color: #dc2626;">נדחתה</strong>.</p>
<div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 20px 0; border-right: 4px solid #dc2626;">
<p style="margin: 4px 0;"><strong>פרטי הקבלה:</strong></p>
<p style="margin: 4px 0;">סכום: <strong>${formattedAmount}</strong></p>
<p style="margin: 4px 0;">תאריך קבלה: <strong>${formattedDate}</strong></p>
${rejectionReason ? `<p style="margin: 12px 0 4px 0;"><strong>סיבת הדחייה:</strong></p><p style="margin: 4px 0; color: #dc2626;">${rejectionReason}</p>` : ''}
</div>
<p style="margin: 12px 0;">אנא צור קשר עם המטפל בתיק לבירור או להגשת קבלה מתוקנת.</p>
<div style="border-top: 1px solid #e2e8f0; margin-top: 25px; padding-top: 20px;">
<p style="margin: 0; font-size: 12px; color: #94a3b8;">הודעה זו נשלחה באופן אוטומטי ממערכת ספק בקליק.</p>
</div>
</div>
</div>
</body>
</html>`;
    }

    await sendEmailViaSMTP(gmailUser, gmailAppPassword, vendorEmail, subject, emailHtml);

    console.log(`Receipt ${status} email sent successfully to:`, vendorEmail);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending receipt status email:", error);
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
