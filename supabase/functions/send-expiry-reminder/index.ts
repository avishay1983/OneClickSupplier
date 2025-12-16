import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Encode subject for email with Hebrew support
function encodeSubject(text: string): string {
  const encoded = btoa(unescape(encodeURIComponent(text)));
  return `=?UTF-8?B?${encoded}?=`;
}

// Encode body content to binary string for base64
function encodeBody(text: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  let binary = '';
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return binary;
}

async function sendReminderEmail(
  to: string,
  vendorName: string,
  formLink: string,
  hoursRemaining: number
): Promise<void> {
  const gmailUser = Deno.env.get("GMAIL_USER");
  const gmailPassword = Deno.env.get("GMAIL_APP_PASSWORD");

  if (!gmailUser || !gmailPassword) {
    throw new Error("Gmail credentials not configured");
  }

  const timeText = hoursRemaining <= 24 
    ? `${Math.round(hoursRemaining)} שעות` 
    : `${Math.round(hoursRemaining / 24)} ימים`;

  const subject = encodeSubject(`תזכורת: הקישור לטופס הספק יפוג בעוד ${timeText}`);

  const htmlBody = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
</head>
<body style="font-family: Arial, sans-serif; direction: rtl; text-align: right; padding: 20px; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="display: inline-flex; align-items: center; gap: 8px;">
        <div style="display: flex; flex-direction: column; color: #202A65; font-weight: 900; font-size: 24px; line-height: 1.2;">
          <span>ביטוח</span>
          <span>ישיר</span>
        </div>
        <div style="position: relative; width: 40px; height: 45px;">
          <div style="position: absolute; width: 10px; height: 10px; border-radius: 50%; background-color: #FF2D55; left: 0; top: 0;"></div>
          <div style="position: absolute; width: 10px; height: 10px; border-radius: 50%; background-color: #FF2D55; right: 0; top: 0;"></div>
          <div style="position: absolute; width: 10px; height: 10px; border-radius: 50%; background-color: #FF2D55; left: 50%; top: 50%; transform: translate(-50%, -50%);"></div>
          <div style="position: absolute; width: 10px; height: 10px; border-radius: 50%; background-color: #FF2D55; left: 0; bottom: 0;"></div>
          <div style="position: absolute; width: 10px; height: 10px; border-radius: 50%; background-color: #FF2D55; right: 0; bottom: 0;"></div>
        </div>
      </div>
    </div>
    
    <div style="background-color: #FFF3CD; border: 1px solid #FFECB5; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
      <p style="margin: 0; color: #856404; font-weight: bold; text-align: right;">
        ⚠️ שים לב: הקישור לטופס יפוג בעוד ${timeText}
      </p>
    </div>
    
    <p style="color: #333; font-size: 16px; line-height: 1.8; text-align: right;">שלום ${vendorName},</p>
    
    <p style="color: #333; font-size: 16px; line-height: 1.8; text-align: right;">
      זוהי תזכורת שהקישור למילוי פרטי הספק שלך עומד לפוג.
    </p>
    
    <p style="color: #333; font-size: 16px; line-height: 1.8; text-align: right;">
      אנא מלא את הטופס בהקדם האפשרי כדי להשלים את תהליך הרישום.
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${formLink}" style="display: inline-block; background-color: #FF2D55; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
        מלא את הטופס עכשיו
      </a>
    </div>
    
    <p style="color: #666; font-size: 14px; line-height: 1.6; text-align: right;">
      אם הקישור פג תוקף, יש לפנות למטפל בתהליך לקבלת קישור חדש.
    </p>
    
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
    
    <p style="color: #999; font-size: 12px; text-align: center;">
      מערכת ספק בקליק - ביטוח ישיר
    </p>
  </div>
</body>
</html>
  `;

  const boundary = "boundary_" + Date.now();
  const emailContent = [
    `From: ${gmailUser}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    "",
    btoa(encodeBody(htmlBody)),
    "",
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
    const buffer = new Uint8Array(1024);
    const n = await conn.read(buffer);
    return decoder.decode(buffer.subarray(0, n || 0));
  }

  async function readResponse(): Promise<string> {
    const buffer = new Uint8Array(1024);
    const n = await conn.read(buffer);
    return decoder.decode(buffer.subarray(0, n || 0));
  }

  try {
    await readResponse();
    await sendCommand("EHLO localhost");
    await sendCommand("AUTH LOGIN");
    await sendCommand(btoa(gmailUser));
    await sendCommand(btoa(gmailPassword));
    await sendCommand(`MAIL FROM:<${gmailUser}>`);
    await sendCommand(`RCPT TO:<${to}>`);
    await sendCommand("DATA");
    await conn.write(encoder.encode(emailContent + "\r\n.\r\n"));
    await readResponse();
    await sendCommand("QUIT");
  } finally {
    conn.close();
  }
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-expiry-reminder function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get reminder threshold from settings (default 24 hours)
    const { data: settingsData } = await supabase
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "expiry_reminder_hours")
      .maybeSingle();

    const reminderHours = settingsData?.setting_value 
      ? parseInt(settingsData.setting_value) 
      : 24;

    // Find vendor requests that:
    // 1. Expire within the reminder threshold
    // 2. Haven't had a reminder sent yet
    // 3. Status is still with_vendor or resent (vendor hasn't submitted)
    const now = new Date();
    const reminderThreshold = new Date(now.getTime() + reminderHours * 60 * 60 * 1000);

    const { data: expiringRequests, error: fetchError } = await supabase
      .from("vendor_requests")
      .select("id, vendor_name, vendor_email, secure_token, expires_at")
      .in("status", ["with_vendor", "resent"])
      .is("expiry_reminder_sent_at", null)
      .not("expires_at", "is", null)
      .lte("expires_at", reminderThreshold.toISOString())
      .gt("expires_at", now.toISOString());

    if (fetchError) {
      console.error("Error fetching expiring requests:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${expiringRequests?.length || 0} requests expiring within ${reminderHours} hours`);

    let sentCount = 0;
    let errorCount = 0;

    for (const request of expiringRequests || []) {
      try {
        const expiresAt = new Date(request.expires_at);
        const hoursRemaining = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);
        
        // Build the form link
        const baseUrl = Deno.env.get("PUBLIC_APP_URL") || "https://ijyqtemnhlbamxmgjuzp.lovableproject.com";
        const formLink = `${baseUrl}/vendor/${request.secure_token}`;

        console.log(`Sending reminder to ${request.vendor_email} for ${request.vendor_name}, expires in ${hoursRemaining.toFixed(1)} hours`);

        await sendReminderEmail(
          request.vendor_email,
          request.vendor_name,
          formLink,
          hoursRemaining
        );

        // Mark reminder as sent
        await supabase
          .from("vendor_requests")
          .update({ expiry_reminder_sent_at: now.toISOString() })
          .eq("id", request.id);

        sentCount++;
        console.log(`Reminder sent successfully to ${request.vendor_email}`);
      } catch (emailError) {
        console.error(`Failed to send reminder to ${request.vendor_email}:`, emailError);
        errorCount++;
      }
    }

    console.log(`Completed: ${sentCount} reminders sent, ${errorCount} errors`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: sentCount, 
        errors: errorCount,
        checked: expiringRequests?.length || 0
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-expiry-reminder:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
