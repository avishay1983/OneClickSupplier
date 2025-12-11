import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendApprovalEmailRequest {
  userId: string;
  userEmail: string;
  userName: string;
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
  console.log("send-approval-request function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const gmailUser = Deno.env.get("GMAIL_USER");
    const gmailAppPassword = Deno.env.get("GMAIL_APP_PASSWORD");
    const adminEmail = Deno.env.get("ADMIN_EMAIL");

    if (!gmailUser || !gmailAppPassword) {
      throw new Error("Gmail credentials not configured");
    }

    if (!adminEmail) {
      throw new Error("ADMIN_EMAIL not configured");
    }

    const { userId, userEmail, userName }: SendApprovalEmailRequest = await req.json();
    console.log("Processing approval request for:", userEmail, "userId:", userId);

    const { data: approval, error: approvalError } = await supabase
      .from("pending_approvals")
      .select("approval_token")
      .eq("status", "pending")
      .or(`user_id.eq.${userId},user_email.ilike.${userEmail}`)
      .maybeSingle();

    if (approvalError) {
      console.error("Error fetching approval:", approvalError);
      throw approvalError;
    }

    if (!approval) {
      console.log("No pending approval found for user:", userId, userEmail);
      return new Response(
        JSON.stringify({ success: false, message: "No pending approval found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const approveLink = `${supabaseUrl}/functions/v1/approve-user?token=${approval.approval_token}&action=approve`;
    const rejectLink = `${supabaseUrl}/functions/v1/approve-user?token=${approval.approval_token}&action=reject`;

    const emailHtml = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
<meta charset="UTF-8">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.8; color: #333; direction: rtl; text-align: right; margin: 0; padding: 20px; background-color: #f5f5f5;">
<div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
<div style="background: #1a2b5f; color: white; padding: 30px; text-align: center;">
<h1 style="margin: 0; font-size: 24px;">בקשת הרשמה חדשה</h1>
</div>
<div style="padding: 30px;">
<p style="margin: 12px 0;">שלום,</p>
<p style="margin: 12px 0;">התקבלה בקשת הרשמה חדשה למערכת הקמת ספקים:</p>
<div style="background: #f0f4f8; padding: 15px; border-radius: 8px; margin: 20px 0;">
<p style="margin: 8px 0;"><strong>שם:</strong> ${userName || 'לא צוין'}</p>
<p style="margin: 8px 0;"><strong>אימייל:</strong> ${userEmail}</p>
</div>
<p style="margin: 12px 0;">לחץ על אחד הכפתורים למטה לאישור או דחייה:</p>
<div style="text-align: center; margin: 25px 0;">
<a href="${approveLink}" style="display: inline-block; background: #22c55e; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 0 10px;">אשר רישום</a>
<a href="${rejectLink}" style="display: inline-block; background: #ef4444; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 0 10px;">דחה רישום</a>
</div>
<p style="color: #666; font-size: 12px; margin-top: 30px;">הודעה זו נשלחה באופן אוטומטי ממערכת הקמת ספקים.</p>
</div>
</div>
</body>
</html>`;

    const adminEmails = [adminEmail, "avishay.elankry@gmail.com"];
    console.log("Sending approval email to:", adminEmails);

    const subjectText = `בקשת הרשמה חדשה - ${userName || userEmail}`;

    for (const email of adminEmails) {
      try {
        await sendEmailViaSMTP(gmailUser, gmailAppPassword, email, subjectText, emailHtml);
        console.log("Approval email sent to:", email);
      } catch (sendError) {
        console.error("Error sending to", email, ":", sendError);
      }
    }

    console.log("All approval emails sent successfully via raw SMTP");

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error sending approval email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
