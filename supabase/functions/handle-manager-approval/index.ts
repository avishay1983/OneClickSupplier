import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const handler = async (req: Request): Promise<Response> => {
  console.log("handle-manager-approval function called");

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const role = url.searchParams.get("role");
    const vendorId = url.searchParams.get("vendorId");

    console.log("Processing:", { action, role, vendorId });

    if (!action || !role || !vendorId) {
      return createHtmlResponse("error", "שגיאה", "פרמטרים חסרים בבקשה");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: vendorRequest, error: fetchError } = await supabase
      .from("vendor_requests")
      .select("*")
      .eq("id", vendorId)
      .single();

    if (fetchError || !vendorRequest) {
      console.error("Error fetching vendor request:", fetchError);
      return createHtmlResponse("error", "שגיאה", "בקשת הספק לא נמצאה");
    }

    const roleLabel = role === 'procurement_manager' ? 'מנהל רכש' : 'סמנכ"ל';
    const approvedField = role === 'procurement_manager' ? 'procurement_manager_approved' : 'vp_approved';
    const approvedAtField = role === 'procurement_manager' ? 'procurement_manager_approved_at' : 'vp_approved_at';
    const approvedByField = role === 'procurement_manager' ? 'procurement_manager_approved_by' : 'vp_approved_by';

    const vendorName = vendorRequest.vendor_name;

    if (vendorRequest[approvedField] !== null) {
      const status = vendorRequest[approvedField] ? 'אושר' : 'נדחה';
      return createHtmlResponse(
        "already_handled",
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
        return createHtmlResponse("error", "שגיאה", "לא ניתן לעדכן את האישור");
      }

      console.log(`Vendor ${vendorId} approved by ${role}`);
      return createHtmlResponse(
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
        return createHtmlResponse("error", "שגיאה", "לא ניתן לעדכן את הדחייה");
      }

      console.log(`Vendor ${vendorId} rejected by ${role}`);
      return createHtmlResponse(
        "rejected",
        "נדחה",
        `הספק "${vendorName}" נדחה על ידי ${roleLabel}`
      );
    }

    return createHtmlResponse("error", "שגיאה", "פעולה לא תקינה");
  } catch (error: any) {
    console.error("Error in handle-manager-approval:", error);
    return createHtmlResponse("error", "שגיאה", "אירעה שגיאה");
  }
};

function createHtmlResponse(status: string, title: string, message: string): Response {
  const iconSvg = status === "success" 
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`
    : status === "rejected"
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`
    : status === "already_handled"
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;

  const bgColor = status === "success" 
    ? "#22c55e" 
    : status === "rejected" 
    ? "#ef4444" 
    : status === "already_handled"
    ? "#3b82f6"
    : "#ef4444";

  const html = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - ספק בקליק</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .card {
      max-width: 400px;
      width: 100%;
      background: white;
      border-radius: 16px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      overflow: hidden;
      text-align: center;
    }
    .header {
      background: linear-gradient(135deg, #1a2b5f 0%, #2d4a8c 100%);
      padding: 32px 20px;
      color: white;
    }
    .header h2 {
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 8px;
    }
    .header p {
      font-size: 14px;
      opacity: 0.8;
    }
    .icon-wrapper {
      margin-top: -35px;
      margin-bottom: 20px;
    }
    .icon {
      width: 70px;
      height: 70px;
      border-radius: 50%;
      background: ${bgColor};
      display: inline-flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
      border: 4px solid white;
    }
    .content {
      padding: 0 32px 40px;
    }
    .content h1 {
      font-size: 24px;
      font-weight: 600;
      color: #1a2b5f;
      margin-bottom: 16px;
    }
    .content p {
      color: #6b7280;
      font-size: 16px;
      line-height: 1.6;
    }
    .footer {
      background: #f9fafb;
      padding: 16px;
      font-size: 14px;
      color: #9ca3af;
      border-top: 1px solid #f3f4f6;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h2>ספק בקליק</h2>
      <p>מערכת הקמת ספקים</p>
    </div>
    <div class="icon-wrapper">
      <div class="icon">
        ${iconSvg}
      </div>
    </div>
    <div class="content">
      <h1>${title}</h1>
      <p>${message}</p>
    </div>
    <div class="footer">
      ניתן לסגור חלון זה
    </div>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}

serve(handler);
