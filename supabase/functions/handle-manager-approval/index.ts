import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// Helper function to encode Hebrew text for email subject
function encodeSubject(text: string): string {
  const base64 = btoa(unescape(encodeURIComponent(text)));
  return `=?UTF-8?B?${base64}?=`;
}

// Helper function to encode content for email body
function encodeBody(text: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(text);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Send email via raw SMTP with proper UTF-8 encoding
async function sendEmailViaSMTP(
  to: string,
  subject: string,
  htmlContent: string
): Promise<void> {
  const gmailUser = Deno.env.get("GMAIL_USER");
  const gmailPassword = Deno.env.get("GMAIL_APP_PASSWORD");

  if (!gmailUser || !gmailPassword) {
    throw new Error("Gmail credentials not configured");
  }

  const encodedSubject = encodeSubject(subject);
  const encodedBody = encodeBody(htmlContent);

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

  try {
    await readResponse();
    await sendCommand(`EHLO smtp.gmail.com`);
    await sendCommand("AUTH LOGIN");
    await sendCommand(btoa(gmailUser));
    await sendCommand(btoa(gmailPassword));
    await sendCommand(`MAIL FROM:<${gmailUser}>`);
    await sendCommand(`RCPT TO:<${to}>`);
    await sendCommand("DATA");

    const emailContent = [
      `From: "ספק בקליק - ביטוח ישיר" <${gmailUser}>`,
      `To: ${to}`,
      `Subject: ${encodedSubject}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: base64`,
      ``,
      encodedBody,
      `.`,
    ].join("\r\n");

    await conn.write(encoder.encode(emailContent + "\r\n"));
    await readResponse();
    await sendCommand("QUIT");
  } finally {
    conn.close();
  }
}

// Send approval notification email to vendor with receipts link
async function sendVendorApprovalEmail(vendor: any): Promise<void> {
  const baseUrl = Deno.env.get('FRONTEND_URL') || "https://oneclicksupplier.onrender.com";
  const receiptsLink = `${baseUrl}/vendor-receipts/${vendor.secure_token}`;
  const statusLink = `${baseUrl}/vendor-status/${vendor.secure_token}`;

  const htmlBody = `
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.8; direction: rtl; text-align: right; background-color: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: #1a2b5f; color: white; padding: 20px; text-align: center; }
        .logo { font-size: 24px; font-weight: bold; }
        .content { padding: 30px; }
        .success-icon { text-align: center; font-size: 48px; margin-bottom: 16px; }
        .button { display: inline-block; background: #1a2b5f; color: white !important; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px 5px; }
        .button-secondary { background: #2563eb; }
        .footer { text-align: center; margin-top: 20px; padding: 20px; color: #666; font-size: 12px; border-top: 1px solid #eee; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">ספק בקליק - ביטוח ישיר</div>
          <h1 style="margin: 10px 0 0 0; font-size: 20px;">בקשתך אושרה!</h1>
        </div>
        <div class="content">
          <div class="success-icon">✅</div>
          <p style="text-align: right; margin: 12px 0;">שלום ${vendor.vendor_name},</p>
          <p style="text-align: right; margin: 12px 0;">
            שמחים לבשר לך שבקשתך להצטרף כספק של ביטוח ישיר <strong>אושרה בהצלחה!</strong>
          </p>
          <p style="text-align: right; margin: 12px 0;">
            מעתה תוכל להעלות קבלות להתחשבנות דרך הקישור הבא:
          </p>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${receiptsLink}" class="button">העלאת קבלות</a>
            <a href="${statusLink}" class="button button-secondary">מעקב סטטוס</a>
          </div>
          <p style="text-align: right; margin: 12px 0;">
            שמור על קישור זה - תוכל להשתמש בו בכל פעם שתרצה להעלות קבלות חדשות.
          </p>
        </div>
        <div class="footer">
          <p>© ביטוח ישיר - כל הזכויות שמורות</p>
          <p>הודעה זו נשלחה באופן אוטומטי ממערכת הקמת ספקים.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmailViaSMTP(
    vendor.vendor_email,
    "בקשתך אושרה - ברוכים הבאים לביטוח ישיר!",
    htmlBody
  );

  // Update receipts_link_sent_at
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  await supabase
    .from("vendor_requests")
    .update({ receipts_link_sent_at: new Date().toISOString() })
    .eq("id", vendor.id);
}

const handler = async (req: Request): Promise<Response> => {
  console.log("handle-manager-approval function called");

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const role = url.searchParams.get("role");
    const vendorId = url.searchParams.get("vendorId");

    console.log("Processing:", { action, role, vendorId });

    if (!action || !role || !vendorId) {
      return createRedirectToApp("error", "שגיאה", "פרמטרים חסרים בבקשה");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: vendorRequest, error: fetchError } = await supabase
      .from("vendor_requests")
      .select("*")
      .eq("id", vendorId)
      .maybeSingle();

    if (fetchError || !vendorRequest) {
      console.error("Error fetching vendor request:", fetchError);
      return createRedirectToApp("error", "שגיאה", "בקשת הספק לא נמצאה");
    }

    const roleLabel = role === 'procurement_manager' ? 'מנהל רכש' : 'סמנכ"ל';
    const approvedField = role === 'procurement_manager' ? 'procurement_manager_approved' : 'vp_approved';
    const approvedAtField = role === 'procurement_manager' ? 'procurement_manager_approved_at' : 'vp_approved_at';
    const approvedByField = role === 'procurement_manager' ? 'procurement_manager_approved_by' : 'vp_approved_by';

    const vendorName = vendorRequest.vendor_name;

    if (vendorRequest[approvedField] !== null) {
      const status = vendorRequest[approvedField] ? 'אושר' : 'נדחה';
      return createRedirectToApp(
        "info",
        "כבר טופל",
        `הספק "${vendorName}" כבר ${status} על ידי ${roleLabel}`
      );
    }

    if (action === 'approve') {
      const { error: updateError } = await supabase
        .from("vendor_requests")
        .update({
          [approvedField]: true,
          [approvedAtField]: new Date().toISOString(),
          [approvedByField]: roleLabel,
        })
        .eq("id", vendorId);

      if (updateError) {
        console.error("Error updating approval:", updateError);
        return createRedirectToApp("error", "שגיאה", "לא ניתן לעדכן את האישור");
      }

      // Check if approval is complete based on requires_vp_approval setting
      const requiresVpApproval = vendorRequest.requires_vp_approval !== false;
      const procurementApproved = role === 'procurement_manager' ? true : vendorRequest.procurement_manager_approved === true;
      const vpApproved = role === 'vp' ? true : vendorRequest.vp_approved === true;

      // If VP approval is not required, only check procurement manager approval
      // If VP approval is required, check both
      const isFullyApproved = requiresVpApproval
        ? (procurementApproved && vpApproved)
        : procurementApproved;

      if (isFullyApproved) {
        // Update status to approved
        const { error: statusError } = await supabase
          .from("vendor_requests")
          .update({ status: 'approved' })
          .eq("id", vendorId);

        if (statusError) {
          console.error("Error updating status to approved:", statusError);
        } else {
          console.log(`Vendor ${vendorId} status updated to approved (all required approvals complete)`);

          // Send approval notification email to vendor with receipts link
          try {
            await sendVendorApprovalEmail(vendorRequest);
            console.log(`Approval email with receipts link sent to vendor ${vendorRequest.vendor_email}`);
          } catch (emailError) {
            console.error("Error sending approval email to vendor:", emailError);
            // Don't fail the approval if email fails
          }
        }
      }

      console.log(`Vendor ${vendorId} approved by ${role}`);
      return createRedirectToApp(
        "success",
        "אושר בהצלחה!",
        `הספק "${vendorName}" אושר על ידי ${roleLabel}`
      );
    } else if (action === 'reject') {
      const { error: updateError } = await supabase
        .from("vendor_requests")
        .update({
          [approvedField]: false,
          [approvedAtField]: new Date().toISOString(),
          [approvedByField]: roleLabel,
        })
        .eq("id", vendorId);

      if (updateError) {
        console.error("Error updating rejection:", updateError);
        return createRedirectToApp("error", "שגיאה", "לא ניתן לעדכן את הדחייה");
      }

      console.log(`Vendor ${vendorId} rejected by ${role}`);
      return createRedirectToApp(
        "rejected",
        "נדחה",
        `הספק "${vendorName}" נדחה על ידי ${roleLabel}`
      );
    }

    return createRedirectToApp("error", "שגיאה", "פעולה לא תקינה");
  } catch (error: any) {
    console.error("Error in handle-manager-approval:", error);
    return createRedirectToApp("error", "שגיאה", "אירעה שגיאה");
  }
};

function createRedirectToApp(status: string, title: string, message: string): Response {
  // Redirect to the React app's manager approval result page
  const baseUrl = Deno.env.get('FRONTEND_URL') || "https://oneclicksupplier.onrender.com";
  const params = new URLSearchParams({
    status,
    title,
    message
  });

  return new Response(null, {
    status: 302,
    headers: {
      "Location": `${baseUrl}/manager-approval-result?${params.toString()}`,
    },
  });
}

serve(handler);
