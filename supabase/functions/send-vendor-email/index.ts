import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendVendorEmailRequest {
  vendorName: string;
  vendorEmail: string;
  secureLink: string;
}

// Helper function to encode subject line for UTF-8
function encodeSubject(subject: string): string {
  const bytes = new TextEncoder().encode(subject);
  const binary = Array.from(bytes).map(b => String.fromCharCode(b)).join('');
  const encoded = btoa(binary);
  return `=?UTF-8?B?${encoded}?=`;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { vendorName, vendorEmail, secureLink }: SendVendorEmailRequest = await req.json();

    console.log("Sending email to vendor:", vendorEmail);
    console.log("Secure link:", secureLink);

    const gmailUser = Deno.env.get("GMAIL_USER");
    const gmailPassword = Deno.env.get("GMAIL_APP_PASSWORD");

    if (!gmailUser || !gmailPassword) {
      throw new Error("Gmail credentials not configured");
    }

    const emailHtml = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.8; color: #333; direction: rtl; text-align: right; margin: 0; padding: 20px; background-color: #f5f5f5;">
<div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
<div style="background: #1a2b5f; color: white; padding: 20px; text-align: right;">
<img src="https://www.555.co.il/resources/images/BY737X463.png" alt="ביטוח ישיר" style="max-width: 150px; height: auto; margin-bottom: 15px;" />
<h1 style="margin: 0; text-align: center; color: white;">בקשה להקמת ספק</h1>
</div>
<div style="padding: 30px;">
<p style="margin: 12px 0;">שלום ${vendorName},</p>
<p style="margin: 12px 0;">התקבלה בקשה להקמתך כספק במערכת שלנו.</p>
<p style="margin: 12px 0;">על מנת להשלים את תהליך ההקמה, אנא לחץ על הכפתור למטה ומלא את הפרטים הנדרשים.</p>
<p style="margin: 12px 0;">הקישור הזה הוא אישי ומאובטח. אנא אל תשתף אותו עם אחרים.</p>
<p style="margin: 12px 0;">במידה ויש לך שאלות, אנא פנה לאיש הקשר שלך בחברה.</p>
<div style="text-align: center; margin: 25px 0;">
<a href="${secureLink}" style="display: inline-block; background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold;">מילוי טופס ספק</a>
</div>
<p style="margin-top: 30px; font-size: 12px; color: #666;">הודעה זו נשלחה באופן אוטומטי ממערכת הקמת ספקים.</p>
</div>
</div>
</body>
</html>`;

    console.log("Sending email via Gmail SMTP...");

    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: {
          username: gmailUser,
          password: gmailPassword,
        },
      },
    });

    await client.send({
      from: gmailUser,
      to: vendorEmail,
      subject: encodeSubject("בקשה להקמת ספק - נדרשים פרטים"),
      html: emailHtml,
      headers: {
        "Content-Type": "text/html; charset=UTF-8",
      },
    });

    await client.close();

    console.log("Email sent successfully via Gmail SMTP");

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
