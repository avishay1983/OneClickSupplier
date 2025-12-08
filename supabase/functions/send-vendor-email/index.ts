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

    const emailHtml = `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.8; color: #333; direction: rtl; text-align: right; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; border-radius: 8px; }
          .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: white; padding: 30px; border-radius: 0 0 8px 8px; text-align: right; }
          .button-container { text-align: center; margin: 25px 0; }
          .button { display: inline-block; background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; }
          .footer { margin-top: 20px; font-size: 12px; color: #666; text-align: right; }
          p { text-align: right; margin: 12px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header" style="background: #1a2b5f;">
            <div style="text-align: right; margin-bottom: 15px;">
              <img src="https://www.555.co.il/resources/images/BY737X463.png" alt="ביטוח ישיר" style="max-width: 150px; height: auto;" />
            </div>
            <h1 style="margin: 0; text-align: center;">בקשה להקמת ספק</h1>
          </div>
          <div class="content">
            <p>שלום ${vendorName},</p>
            <p>התקבלה בקשה להקמתך כספק במערכת שלנו.</p>
            <p>על מנת להשלים את תהליך ההקמה, אנא לחץ על הכפתור למטה ומלא את הפרטים הנדרשים.</p>
            <p>הקישור הזה הוא אישי ומאובטח. אנא אל תשתף אותו עם אחרים.</p>
            <p>במידה ויש לך שאלות, אנא פנה לאיש הקשר שלך בחברה.</p>
            <div class="button-container"><a href="${secureLink}" class="button">מילוי טופס ספק</a></div>
            <p class="footer">הודעה זו נשלחה באופן אוטומטי ממערכת הקמת ספקים.</p>
          </div>
        </div>
      </body>
      </html>
    `;

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
      subject: "בקשה להקמת ספק - נדרשים פרטים",
      content: "אנא צפה בהודעה זו בתוכנת דוא\"ל התומכת ב-HTML",
      html: emailHtml,
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
