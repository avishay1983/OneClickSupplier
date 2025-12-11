import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface HandlerNotificationRequest {
  handlerEmail: string;
  handlerName: string;
  vendorName: string;
  vendorId: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-handler-notification function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { handlerEmail, handlerName, vendorName, vendorId }: HandlerNotificationRequest = await req.json();

    console.log(`Sending notification to handler: ${handlerEmail} for vendor: ${vendorName}`);

    if (!handlerEmail) {
      console.log("No handler email provided, skipping notification");
      return new Response(
        JSON.stringify({ success: true, message: "No handler email to notify" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const gmailUser = Deno.env.get("GMAIL_USER");
    const gmailPassword = Deno.env.get("GMAIL_APP_PASSWORD");

    if (!gmailUser || !gmailPassword) {
      console.error("Gmail credentials not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

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

    const dashboardUrl = "https://ijyqtemnhlbamxmgjuzp.lovable.app/";

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #1a2b5f 0%, #2d4a8c 100%); padding: 30px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">ביטוח ישיר</h1>
                    <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0 0; font-size: 14px;">מערכת הקמת ספקים</p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <p style="font-size: 18px; color: #333333; margin: 0 0 20px 0; text-align: right;">
                      שלום ${handlerName || 'מטפל/ת'},
                    </p>
                    
                    <div style="background-color: #e8f4fd; border-right: 4px solid #1a2b5f; padding: 20px; margin: 20px 0; border-radius: 4px;">
                      <p style="font-size: 16px; color: #333333; margin: 0; text-align: right; font-weight: bold;">
                        ספק <span style="color: #1a2b5f;">${vendorName}</span> שלח את טופס הפרטים שלו
                      </p>
                      <p style="font-size: 14px; color: #666666; margin: 10px 0 0 0; text-align: right;">
                        הבקשה ממתינה לבדיקה ואישור ראשוני במערכת
                      </p>
                    </div>
                    
                    <p style="font-size: 14px; color: #666666; margin: 20px 0; text-align: right;">
                      אנא היכנס/י למערכת כדי לבדוק את הפרטים ולהחליט האם לאשר, לדחות, או לשלוח מחדש לספק.
                    </p>
                    
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding: 20px 0;">
                          <a href="${dashboardUrl}" 
                             style="display: inline-block; background: linear-gradient(135deg, #1a2b5f 0%, #2d4a8c 100%); color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 6px; font-size: 16px; font-weight: bold;">
                            כניסה למערכת
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8f9fa; padding: 20px 30px; border-top: 1px solid #e9ecef;">
                    <p style="font-size: 12px; color: #999999; margin: 0; text-align: center;">
                      הודעה זו נשלחה אוטומטית ממערכת הקמת ספקים של ביטוח ישיר
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    await client.send({
      from: gmailUser,
      to: handlerEmail,
      subject: `ספק חדש ממתין לבדיקה: ${vendorName}`,
      content: "auto",
      html: htmlContent,
    });

    await client.close();

    console.log("Handler notification email sent successfully");

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-handler-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
