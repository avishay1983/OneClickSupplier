import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const handler = async (req: Request): Promise<Response> => {
  console.log("handle-manager-approval function called");

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const role = url.searchParams.get("role");
    const vendorId = url.searchParams.get("vendorId");
    const token = url.searchParams.get("token");

    console.log("Processing:", { action, role, vendorId });

    if (!action || !role || !vendorId) {
      return createHtmlResponse("שגיאה", "פרמטרים חסרים בבקשה", false);
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
      return createHtmlResponse("שגיאה", "בקשת הספק לא נמצאה", false);
    }

    const roleLabel = role === 'procurement_manager' ? 'מנהל רכש' : 'סמנכ"ל';
    const approvedField = role === 'procurement_manager' ? 'procurement_manager_approved' : 'vp_approved';
    const approvedAtField = role === 'procurement_manager' ? 'procurement_manager_approved_at' : 'vp_approved_at';
    const approvedByField = role === 'procurement_manager' ? 'procurement_manager_approved_by' : 'vp_approved_by';

    const vendorName = vendorRequest.vendor_name;

    if (vendorRequest[approvedField] !== null) {
      const status = vendorRequest[approvedField] ? 'אושר' : 'נדחה';
      return createHtmlResponse(
        "כבר טופל",
        `הספק "${vendorName}" כבר ${status} על ידי ${roleLabel}`,
        vendorRequest[approvedField]
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
        return createHtmlResponse("שגיאה", "לא ניתן לעדכן את האישור", false);
      }

      console.log(`Vendor ${vendorId} approved by ${role}`);
      return createHtmlResponse(
        "אושר בהצלחה!",
        `הספק "${vendorName}" אושר על ידי ${roleLabel}`,
        true
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
        return createHtmlResponse("שגיאה", "לא ניתן לעדכן את הדחייה", false);
      }

      console.log(`Vendor ${vendorId} rejected by ${role}`);
      return createHtmlResponse(
        "נדחה",
        `הספק "${vendorName}" נדחה על ידי ${roleLabel}`,
        false
      );
    }

    return createHtmlResponse("שגיאה", "פעולה לא תקינה", false);
  } catch (error: any) {
    console.error("Error in handle-manager-approval:", error);
    return createHtmlResponse("שגיאה", "אירעה שגיאה", false);
  }
};

function createHtmlResponse(title: string, message: string, success: boolean | null): Response {
  let bgColor = '#3b82f6';
  let icon = '\u2714';
  
  if (success === true) {
    bgColor = '#22c55e';
    icon = '\u2714';
  } else if (success === false) {
    bgColor = '#ef4444';
    icon = '\u2718';
  }

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Vendor Approval</title>
<style>
* { box-sizing: border-box; }
body {
  font-family: 'Segoe UI', Arial, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  margin: 0;
  padding: 20px;
  direction: rtl;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
.container {
  max-width: 450px;
  width: 100%;
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  overflow: hidden;
  text-align: center;
}
.header {
  background: linear-gradient(135deg, #1a2b5f 0%, #2d4a8c 100%);
  color: white;
  padding: 30px 20px;
}
.header-logo { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
.header-subtitle { font-size: 14px; opacity: 0.8; }
.icon-wrapper { margin-top: -35px; margin-bottom: 20px; }
.icon {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  background: ${bgColor};
  color: white;
  font-size: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 25px rgba(0,0,0,0.25);
  border: 4px solid white;
}
.content { padding: 10px 30px 40px; }
h1 { color: #1a2b5f; margin: 0 0 15px; font-size: 24px; font-weight: 600; }
.message { color: #555; font-size: 16px; line-height: 1.7; margin: 0; }
.footer { background: #f8f9fa; padding: 15px; font-size: 12px; color: #888; border-top: 1px solid #eee; }
</style>
</head>
<body>
<div class="container">
<div class="header">
<div class="header-logo">ביטוח ישיר</div>
<div class="header-subtitle">מערכת אישור ספקים</div>
</div>
<div class="icon-wrapper">
<div class="icon">${icon}</div>
</div>
<div class="content">
<h1>${title}</h1>
<p class="message">${message}</p>
</div>
<div class="footer">ניתן לסגור חלון זה</div>
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
