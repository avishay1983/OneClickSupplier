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
      return createDataUrlRedirect("error", "שגיאה", "פרמטרים חסרים בבקשה");
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
      return createDataUrlRedirect("error", "שגיאה", "בקשת הספק לא נמצאה");
    }

    const roleLabel = role === 'procurement_manager' ? 'מנהל רכש' : 'סמנכ"ל';
    const approvedField = role === 'procurement_manager' ? 'procurement_manager_approved' : 'vp_approved';
    const approvedAtField = role === 'procurement_manager' ? 'procurement_manager_approved_at' : 'vp_approved_at';
    const approvedByField = role === 'procurement_manager' ? 'procurement_manager_approved_by' : 'vp_approved_by';

    const vendorName = vendorRequest.vendor_name;

    if (vendorRequest[approvedField] !== null) {
      const status = vendorRequest[approvedField] ? 'אושר' : 'נדחה';
      return createDataUrlRedirect(
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
        return createDataUrlRedirect("error", "שגיאה", "לא ניתן לעדכן את האישור");
      }

      console.log(`Vendor ${vendorId} approved by ${role}`);
      return createDataUrlRedirect(
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
        return createDataUrlRedirect("error", "שגיאה", "לא ניתן לעדכן את הדחייה");
      }

      console.log(`Vendor ${vendorId} rejected by ${role}`);
      return createDataUrlRedirect(
        "rejected",
        "נדחה",
        `הספק "${vendorName}" נדחה על ידי ${roleLabel}`
      );
    }

    return createDataUrlRedirect("error", "שגיאה", "פעולה לא תקינה");
  } catch (error: any) {
    console.error("Error in handle-manager-approval:", error);
    return createDataUrlRedirect("error", "שגיאה", "אירעה שגיאה");
  }
};

function createDataUrlRedirect(status: string, title: string, message: string): Response {
  const bgColor = status === "success" ? "#22c55e" : status === "rejected" ? "#ef4444" : status === "info" ? "#3b82f6" : "#ef4444";
  const emoji = status === "success" ? "✓" : status === "rejected" ? "✗" : status === "info" ? "ℹ" : "✗";

  const html = `<!DOCTYPE html>
<html dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
</head>
<body style="margin:0;padding:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#667eea,#764ba2);font-family:Arial,sans-serif">
<div style="background:#fff;border-radius:16px;box-shadow:0 25px 50px rgba(0,0,0,.25);max-width:400px;width:90%;text-align:center;overflow:hidden">
<div style="background:linear-gradient(135deg,#1a2b5f,#2d4a8c);padding:32px 20px;color:#fff">
<h2 style="margin:0 0 8px;font-size:24px">ספק בקליק</h2>
<p style="margin:0;opacity:.8;font-size:14px">מערכת הקמת ספקים</p>
</div>
<div style="margin:-35px auto 20px;width:70px;height:70px;border-radius:50%;background:${bgColor};display:flex;align-items:center;justify-content:center;border:4px solid #fff;box-shadow:0 10px 15px rgba(0,0,0,.1)">
<span style="color:#fff;font-size:32px">${emoji}</span>
</div>
<div style="padding:0 32px 40px">
<h1 style="margin:0 0 16px;font-size:24px;color:#1a2b5f">${title}</h1>
<p style="margin:0;color:#6b7280;font-size:16px;line-height:1.6">${message}</p>
</div>
<div style="background:#f9fafb;padding:16px;font-size:14px;color:#9ca3af;border-top:1px solid #f3f4f6">ניתן לסגור חלון זה</div>
</div>
</body>
</html>`;

  // Encode HTML to base64 for data URL
  const base64Html = btoa(unescape(encodeURIComponent(html)));
  const dataUrl = `data:text/html;base64,${base64Html}`;

  return new Response(null, {
    status: 302,
    headers: {
      "Location": dataUrl,
    },
  });
}

serve(handler);
