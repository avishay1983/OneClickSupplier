import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

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
          .success-icon { text-align: center; font-size: 48px; margin-bottom: 16px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header" style="background: #1a2b5f;">
            <div style="text-align: right; margin-bottom: 15px;">
              <img src="https://www.555.co.il/resources/images/BY737X463.png" alt="ביטוח ישיר" style="max-width: 150px; height: auto;" />
            </div>
            <h1 style="margin: 0; text-align: center;">הפרטים התקבלו בהצלחה</h1>
          </div>
          <div class="content">
            <div class="success-icon">✅</div>
            <p>שלום ${vendorName},</p>
            <p>תודה על מילוי טופס הקמת הספק! הפרטים שלך התקבלו בהצלחה ונמצאים כעת בבדיקה.</p>
            <p>תוכל לעקוב אחר סטטוס הבקשה שלך בכל עת באמצעות הלינק הבא:</p>
            <div class="button-container"><a href="${statusLink}" class="button">מעקב סטטוס הבקשה</a></div>
            <p>נעדכן אותך במייל כאשר הבקשה תאושר.</p>
            <p class="footer">הודעה זו נשלחה באופן אוטומטי ממערכת הקמת ספקים.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "מערכת הקמת ספקים <onboarding@resend.dev>",
        to: [vendorEmail],
        subject: "הפרטים שלך התקבלו - ביטוח ישיר",
        html: emailHtml,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error("Resend API error:", data);
      throw new Error(data.message || "Failed to send email");
    }

    console.log("Confirmation email sent successfully:", data);

    return new Response(JSON.stringify({ success: true, data }), {
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
