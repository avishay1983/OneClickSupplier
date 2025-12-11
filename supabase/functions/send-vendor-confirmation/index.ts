import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendConfirmationRequest {
  vendorName: string;
  vendorEmail: string;
  statusLink: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { vendorName, vendorEmail, statusLink }: SendConfirmationRequest = await req.json();

    console.log("Sending confirmation email to vendor:", vendorEmail);
    console.log("Status link:", statusLink);

    const gmailUser = Deno.env.get("GMAIL_USER");
    const gmailAppPassword = Deno.env.get("GMAIL_APP_PASSWORD");

    if (!gmailUser || !gmailAppPassword) {
      throw new Error("Gmail credentials not configured");
    }

    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: {
          username: gmailUser,
          password: gmailAppPassword,
        },
      },
    });

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

    await client.send({
      from: gmailUser,
      to: vendorEmail,
      subject: "הפרטים שלך התקבלו - ביטוח ישיר",
      content: "auto",
      html: emailHtml,
    });

    await client.close();

    console.log("Confirmation email sent successfully via Gmail SMTP");

    return new Response(JSON.stringify({ success: true }), {
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
