import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendApprovalEmailPayload {
  quoteId: string;
  approverEmail: string;
  approverName: string;
  vendorName: string;
  amount: number;
  description: string;
  approvalType: "vp" | "procurement_manager";
}

// Encode string to Base64 for proper UTF-8 handling
function encodeBase64(str: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  return btoa(String.fromCharCode(...data));
}

// Send email via raw SMTP
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

serve(async (req: Request): Promise<Response> => {
  console.log("send-quote-approval-email function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      quoteId,
      approverEmail,
      approverName,
      vendorName,
      amount,
      description,
      approvalType,
    }: SendApprovalEmailPayload = await req.json();

    const normalizedApproverEmail = (approverEmail ?? '').trim().toLowerCase();
    if (!normalizedApproverEmail) {
      throw new Error('Missing approverEmail');
    }

    console.log('Sending approval email:', {
      quoteId,
      approverEmail: normalizedApproverEmail,
      approvalType,
    });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the quote
    const { data: quote, error: quoteError } = await supabase
      .from('vendor_quotes')
      .select('quote_secure_token, file_path')
      .eq('id', quoteId)
      .single();

    if (quoteError || !quote) {
      console.error('Quote not found:', quoteError);
      throw new Error('Quote not found');
    }

    // Get Gmail credentials
    const gmailUser = Deno.env.get("GMAIL_USER");
    const gmailAppPassword = Deno.env.get("GMAIL_APP_PASSWORD");

    if (!gmailUser || !gmailAppPassword) {
      throw new Error("Gmail credentials not configured");
    }

    // Build the approval link
    const baseUrl = 'https://6422d882-b11f-4b09-8a0b-47925031a58e.lovableproject.com';
    const approvalLink = `${baseUrl}/quote-approval/${quote.quote_secure_token}?type=${approvalType}`;

    const approvalTypeName = approvalType === 'vp' ? 'סמנכ"ל' : 'מנהל רכש';

    const emailHtml = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
<meta charset="UTF-8">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.8; color: #333; direction: rtl; text-align: right; margin: 0; padding: 20px; background-color: #f5f5f5;">
<div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
<div style="background: #1a2b5f; color: white; padding: 20px; text-align: right;">
<img src="https://www.555.co.il/resources/images/BY737X463.png" alt="ביטוח ישיר" style="max-width: 150px; height: auto; margin-bottom: 15px;" />
<h1 style="margin: 0; text-align: center; color: white;">בקשה לאישור הצעת מחיר</h1>
</div>
<div style="padding: 30px;">
<p style="margin: 12px 0;">שלום ${approverName},</p>
<p style="margin: 12px 0;">הצעת מחיר חדשה ממתינה לאישורך כ${approvalTypeName}:</p>

<div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
<h3 style="margin: 0 0 15px 0; color: #1a2b5f;">פרטי ההצעה:</h3>
<table style="width: 100%; border-collapse: collapse;">
<tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>ספק:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${vendorName}</td></tr>
<tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>סכום:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">₪${amount?.toLocaleString() || 'לא צוין'}</td></tr>
<tr><td style="padding: 8px 0;"><strong>תיאור:</strong></td><td style="padding: 8px 0;">${description || 'לא צוין'}</td></tr>
</table>
</div>

<div style="background: #f0f9ff; border: 2px solid #0369a1; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
<a href="${approvalLink}" style="display: inline-block; background: #0369a1; color: white; padding: 14px 40px; text-decoration: none; border-radius: 6px; font-weight: bold;">צפייה ואישור</a>
</div>

<p style="margin-top: 30px; font-size: 12px; color: #666;">הודעה זו נשלחה באופן אוטומטי ממערכת ניהול ספקים של ביטוח ישיר</p>
</div>
</div>
</body>
</html>`;

    await sendEmailViaSMTP(
      gmailUser, 
      gmailAppPassword, 
      normalizedApproverEmail, 
      `בקשה לאישור הצעת מחיר - ${vendorName}`, 
      emailHtml
    );

    console.log('Approval email sent successfully via Gmail SMTP');

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending approval email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
