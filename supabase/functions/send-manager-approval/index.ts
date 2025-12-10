import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendManagerApprovalRequest {
  vendorRequestId: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-manager-approval function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { vendorRequestId }: SendManagerApprovalRequest = await req.json();
    console.log("Processing approval request for vendor:", vendorRequestId);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get vendor request details
    const { data: vendorRequest, error: fetchError } = await supabase
      .from("vendor_requests")
      .select("*")
      .eq("id", vendorRequestId)
      .single();

    if (fetchError || !vendorRequest) {
      console.error("Error fetching vendor request:", fetchError);
      throw new Error("Vendor request not found");
    }

    // Get app settings for email addresses
    const { data: settings } = await supabase
      .from("app_settings")
      .select("setting_key, setting_value");

    const settingsMap: Record<string, string> = {};
    settings?.forEach((s: any) => {
      settingsMap[s.setting_key] = s.setting_value;
    });

    const procurementManagerEmail = settingsMap.car_manager_email;
    const procurementManagerName = settingsMap.car_manager_name || 'מנהל רכש';
    const vpEmail = settingsMap.vp_email;
    const vpName = settingsMap.vp_name || 'סמנכ"ל';

    if (!procurementManagerEmail && !vpEmail) {
      throw new Error("No approval email addresses configured");
    }

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

    // Generate approval tokens
    const procurementToken = crypto.randomUUID();
    const vpToken = crypto.randomUUID();

    // Store tokens in database
    await supabase
      .from("vendor_requests")
      .update({
        approval_email_sent_at: new Date().toISOString(),
      })
      .eq("id", vendorRequestId);

    const baseUrl = Deno.env.get("SUPABASE_URL")!.replace('.supabase.co', '');
    const projectRef = baseUrl.split('//')[1];

    const createApprovalEmail = (role: 'procurement_manager' | 'vp', token: string, recipientName: string) => {
      const approveLink = `https://${projectRef}.supabase.co/functions/v1/handle-manager-approval?action=approve&role=${role}&vendorId=${vendorRequestId}&token=${token}`;
      const rejectLink = `https://${projectRef}.supabase.co/functions/v1/handle-manager-approval?action=reject&role=${role}&vendorId=${vendorRequestId}&token=${token}`;

      return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
<meta charset="UTF-8">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.8; color: #333; direction: rtl; text-align: right; margin: 0; padding: 20px; background-color: #f5f5f5;">
<div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
<div style="background: #1a2b5f; color: white; padding: 20px; text-align: right;">
<img src="https://www.555.co.il/resources/images/BY737X463.png" alt="ביטוח ישיר" style="max-width: 150px; height: auto; margin-bottom: 15px;" />
<h1 style="margin: 0; text-align: center; color: white;">אישור הקמת ספק</h1>
</div>
<div style="padding: 30px;">
<p style="margin: 12px 0;">שלום ${recipientName},</p>
<p style="margin: 12px 0;">ספק חדש השלים את מילוי טופס הקמת הספק ומחכה לאישורך.</p>

<div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
<h3 style="margin: 0 0 15px 0; color: #1a2b5f;">פרטי הספק:</h3>
<table style="width: 100%; border-collapse: collapse;">
<tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>שם הספק:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${vendorRequest.vendor_name}</td></tr>
<tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>מייל:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${vendorRequest.vendor_email}</td></tr>
<tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>ח.פ/ע.מ:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${vendorRequest.company_id || '-'}</td></tr>
<tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>טלפון:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${vendorRequest.phone || vendorRequest.mobile || '-'}</td></tr>
<tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>כתובת:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${vendorRequest.city || ''} ${vendorRequest.street || ''} ${vendorRequest.street_number || ''}</td></tr>
<tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>בנק:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${vendorRequest.bank_name || '-'}</td></tr>
<tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>סניף:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${vendorRequest.bank_branch || '-'}</td></tr>
<tr><td style="padding: 8px 0;"><strong>חשבון:</strong></td><td style="padding: 8px 0;">${vendorRequest.bank_account_number || '-'}</td></tr>
</table>
</div>

<div style="text-align: center; margin: 30px 0;">
<a href="${approveLink}" style="display: inline-block; background: #22c55e; color: white; padding: 14px 40px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 0 10px;">אשר ספק ✓</a>
<a href="${rejectLink}" style="display: inline-block; background: #ef4444; color: white; padding: 14px 40px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 0 10px;">דחה ספק ✗</a>
</div>

<p style="margin-top: 30px; font-size: 12px; color: #666;">הודעה זו נשלחה באופן אוטומטי ממערכת הקמת ספקים.</p>
</div>
</div>
</body>
</html>`;
    };

    // Send email to procurement manager
    if (procurementManagerEmail) {
      console.log("Sending approval email to procurement manager:", procurementManagerEmail, "Name:", procurementManagerName);
      await client.send({
        from: gmailUser,
        to: procurementManagerEmail,
        subject: `אישור הקמת ספק - ${vendorRequest.vendor_name}`,
        content: "auto",
        html: createApprovalEmail('procurement_manager', procurementToken, procurementManagerName),
      });
      console.log("Email sent to procurement manager");
    }

    // Send email to VP
    if (vpEmail) {
      console.log("Sending approval email to VP:", vpEmail, "Name:", vpName);
      await client.send({
        from: gmailUser,
        to: vpEmail,
        subject: `אישור הקמת ספק - ${vendorRequest.vendor_name}`,
        content: "auto",
        html: createApprovalEmail('vp', vpToken, vpName),
      });
      console.log("Email sent to VP");
    }

    await client.close();

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-manager-approval:", error);
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
