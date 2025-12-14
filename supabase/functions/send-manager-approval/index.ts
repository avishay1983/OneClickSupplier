import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendManagerApprovalRequest {
  vendorRequestId: string;
  targetRole?: 'procurement_manager' | 'vp';
  forceResend?: boolean;
}

// Encode string to Base64 for proper UTF-8 handling
function encodeBase64(str: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  return btoa(String.fromCharCode(...data));
}

// Send email via raw SMTP with PDF attachment
async function sendEmailViaSMTP(
  gmailUser: string,
  gmailPassword: string,
  to: string,
  subject: string,
  htmlContent: string,
  attachment?: { filename: string; content: Uint8Array } | null
): Promise<void> {
  const subjectBase64 = encodeBase64(subject);
  const encodedSubject = `=?UTF-8?B?${subjectBase64}?=`;

  const boundary = "----=_Part_" + Date.now();
  
  let rawEmail: string;
  
  if (attachment) {
    // Email with attachment
    const attachmentBase64 = btoa(String.fromCharCode(...attachment.content));
    rawEmail = [
      `From: ${gmailUser}`,
      `To: ${to}`,
      `Subject: ${encodedSubject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: base64`,
      ``,
      encodeBase64(htmlContent),
      ``,
      `--${boundary}`,
      `Content-Type: application/pdf; name="${attachment.filename}"`,
      `Content-Disposition: attachment; filename="${attachment.filename}"`,
      `Content-Transfer-Encoding: base64`,
      ``,
      attachmentBase64,
      ``,
      `--${boundary}--`,
    ].join("\r\n");
  } else {
    // Email without attachment
    rawEmail = [
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
  }

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
  console.log("send-manager-approval function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { vendorRequestId, targetRole, forceResend }: SendManagerApprovalRequest = await req.json();
    console.log("Processing approval request for vendor:", vendorRequestId, "Target role:", targetRole || 'all', "Force resend:", forceResend);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: vendorRequest, error: fetchError } = await supabase
      .from("vendor_requests")
      .select("*")
      .eq("id", vendorRequestId)
      .single();

    if (fetchError || !vendorRequest) {
      console.error("Error fetching vendor request:", fetchError);
      throw new Error("Vendor request not found");
    }

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

    // Download contract PDF if exists
    let contractAttachment: { filename: string; content: Uint8Array } | null = null;
    
    if (vendorRequest.requires_contract_signature && vendorRequest.contract_file_path) {
      console.log("Downloading contract file:", vendorRequest.contract_file_path);
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("vendor_documents")
        .download(vendorRequest.contract_file_path);
      
      if (downloadError) {
        console.error("Error downloading contract:", downloadError);
      } else if (fileData) {
        const arrayBuffer = await fileData.arrayBuffer();
        contractAttachment = {
          filename: `contract_${vendorRequest.vendor_name}.pdf`,
          content: new Uint8Array(arrayBuffer),
        };
        console.log("Contract file downloaded successfully");
      }
    }

    await supabase
      .from("vendor_requests")
      .update({
        approval_email_sent_at: new Date().toISOString(),
      })
      .eq("id", vendorRequestId);

    // Get the app URL for signing link
    const appUrl = "https://6422d882-b11f-4b09-8a0b-47925031a58e.lovableproject.com";

    const createApprovalEmail = (role: 'procurement_manager' | 'vp', recipientName: string, hasContract: boolean) => {
      const signingLink = appUrl;
      
      // Different content based on whether contract signature is required
      const actionSection = hasContract 
        ? `<div style="background: #f0f9ff; border: 2px solid #0369a1; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
            <h3 style="margin: 0 0 15px 0; color: #0369a1;">נדרשת חתימה דיגיטלית</h3>
            <p style="margin: 10px 0; color: #333;">החוזה מצורף למייל זה.</p>
            <p style="margin: 10px 0; color: #333;">אנא פתח את הקובץ המצורף, חתום עליו דיגיטלית, וצרף את הקובץ החתום במערכת.</p>
            <a href="${signingLink}" style="display: inline-block; background: #0369a1; color: white; padding: 14px 40px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 15px;">היכנס למערכת לחתימה</a>
          </div>`
        : `<div style="background: #f0fdf4; border: 2px solid #16a34a; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
            <p style="margin: 10px 0; color: #333;">אנא היכנס למערכת לאישור הבקשה.</p>
            <a href="${signingLink}" style="display: inline-block; background: #16a34a; color: white; padding: 14px 40px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 15px;">היכנס למערכת</a>
          </div>`;

      return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
<meta charset="UTF-8">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.8; color: #333; direction: rtl; text-align: right; margin: 0; padding: 20px; background-color: #f5f5f5;">
<div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
<div style="background: #1a2b5f; color: white; padding: 20px; text-align: right;">
<img src="https://www.555.co.il/resources/images/BY737X463.png" alt="ביטוח ישיר" style="max-width: 150px; height: auto; margin-bottom: 15px;" />
<h1 style="margin: 0; text-align: center; color: white;">${hasContract ? 'חוזה לחתימה - הקמת ספק' : 'אישור הקמת ספק'}</h1>
</div>
<div style="padding: 30px;">
<p style="margin: 12px 0;">שלום ${recipientName},</p>
<p style="margin: 12px 0;">${hasContract ? 'ספק חדש דורש את חתימתך על החוזה המצורף.' : 'ספק חדש השלים את מילוי טופס הקמת הספק ומחכה לאישורך.'}</p>
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
${actionSection}
<p style="margin-top: 30px; font-size: 12px; color: #666;">הודעה זו נשלחה באופן אוטומטי ממערכת הקמת ספקים.</p>
</div>
</div>
</body>
</html>`;
    };

    let emailsSent = 0;
    const hasContract = !!contractAttachment;
    const requiresVpApproval = vendorRequest.requires_vp_approval !== false;

    // Procurement manager email is only sent AFTER VP has signed (ceo_signed = true) IF VP approval is required
    // This check is for contracts requiring signature
    const vpHasSigned = vendorRequest.ceo_signed === true;
    
    // If VP approval is not required, we can send to procurement manager immediately
    // If VP approval is required, we need VP to sign first (for contracts)
    const canSendToProcurement = !requiresVpApproval || !hasContract || vpHasSigned;
    
    const shouldSendToProcurement = targetRole === 'procurement_manager' 
      ? (forceResend || (vendorRequest.procurement_manager_approved === null && vendorRequest.procurement_manager_signed !== true)) && procurementManagerEmail && canSendToProcurement
      : (!targetRole && procurementManagerEmail && vendorRequest.procurement_manager_approved === null && vendorRequest.procurement_manager_signed !== true && canSendToProcurement);
    
    if (shouldSendToProcurement) {
      const procurementEmailHtml = createApprovalEmail('procurement_manager', procurementManagerName, hasContract);
      await sendEmailViaSMTP(gmailUser, gmailAppPassword, procurementManagerEmail, 
        hasContract ? `חוזה לחתימה - ${vendorRequest.vendor_name}` : `אישור הקמת ספק - ${vendorRequest.vendor_name}`, 
        procurementEmailHtml, 
        contractAttachment
      );
      console.log("Email sent to procurement manager");
      emailsSent++;
    } else {
      console.log("Skipping procurement manager - condition not met (canSendToProcurement:", canSendToProcurement, ")");
    }

    // Only send to VP if VP approval is required
    const shouldSendToVp = requiresVpApproval && (targetRole === 'vp'
      ? (forceResend || (vendorRequest.vp_approved === null && vendorRequest.ceo_signed !== true)) && vpEmail
      : (!targetRole && vpEmail && vendorRequest.vp_approved === null && vendorRequest.ceo_signed !== true));
    
    if (shouldSendToVp) {
      const vpEmailHtml = createApprovalEmail('vp', vpName, hasContract);
      await sendEmailViaSMTP(gmailUser, gmailAppPassword, vpEmail, 
        hasContract ? `חוזה לחתימה - ${vendorRequest.vendor_name}` : `אישור הקמת ספק - ${vendorRequest.vendor_name}`, 
        vpEmailHtml, 
        contractAttachment
      );
      console.log("Email sent to VP");
      emailsSent++;
    } else {
      console.log("Skipping VP - condition not met (requiresVpApproval:", requiresVpApproval, ")");
    }

    return new Response(JSON.stringify({ success: true, emailsSent }), {
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