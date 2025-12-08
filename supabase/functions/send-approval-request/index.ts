import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendApprovalEmailRequest {
  userId: string;
  userEmail: string;
  userName: string;
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
    const gmailPassword = Deno.env.get("GMAIL_APP_PASSWORD");
    const adminEmail = Deno.env.get("ADMIN_EMAIL");

    if (!gmailUser || !gmailPassword) {
      throw new Error("Gmail credentials not configured");
    }

    if (!adminEmail) {
      throw new Error("ADMIN_EMAIL not configured");
    }

    const { userId, userEmail, userName }: SendApprovalEmailRequest = await req.json();
    console.log("Processing approval request for:", userEmail, "userId:", userId);

    // Get the approval token - search by user_id OR user_email (case-insensitive)
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

    // Build approval links
    const approveLink = `${supabaseUrl}/functions/v1/approve-user?token=${approval.approval_token}&action=approve`;
    const rejectLink = `${supabaseUrl}/functions/v1/approve-user?token=${approval.approval_token}&action=reject`;

    const emailHtml = `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.8; color: #333; direction: rtl; text-align: right; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; border-radius: 8px; }
          .header { background: #1a2b5f; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: white; padding: 30px; border-radius: 0 0 8px 8px; text-align: right; }
          .button-container { text-align: center; margin: 25px 0; }
          .button { display: inline-block; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 0 10px; }
          .approve { background: #22c55e; color: white; }
          .reject { background: #ef4444; color: white; }
          .info-box { background: #f0f4f8; padding: 15px; border-radius: 8px; margin: 20px 0; }
          p { text-align: right; margin: 12px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">בקשת הרשמה חדשה</h1>
          </div>
          <div class="content">
            <p>שלום,</p>
            <p>התקבלה בקשת הרשמה חדשה למערכת הקמת ספקים:</p>
            
            <div class="info-box">
              <p><strong>שם:</strong> ${userName || 'לא צוין'}</p>
              <p><strong>אימייל:</strong> ${userEmail}</p>
            </div>
            
            <p>לחץ על אחד הכפתורים למטה לאישור או דחייה:</p>
            
            <div class="button-container">
              <a href="${approveLink}" class="button approve">אשר רישום</a>
              <a href="${rejectLink}" class="button reject">דחה רישום</a>
            </div>
            
            <p style="color: #666; font-size: 12px;">הודעה זו נשלחה באופן אוטומטי ממערכת הקמת ספקים.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send to both admin emails
    const adminEmails = [adminEmail, "avishay.elankry@gmail.com"];
    console.log("Sending approval email to:", adminEmails);

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

    // Send to each admin email
    for (const email of adminEmails) {
      await client.send({
        from: gmailUser,
        to: email,
        subject: `בקשת הרשמה חדשה - ${userName || userEmail}`,
        content: "אנא צפה בהודעה זו בתוכנת דוא\"ל התומכת ב-HTML",
        html: emailHtml,
      });
      console.log("Approval email sent to:", email);
    }

    await client.close();

    console.log("All approval emails sent successfully via Gmail SMTP");

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
