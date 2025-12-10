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

    // Get vendor request
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

    // Check if already processed
    if (vendorRequest[approvedField] !== null) {
      const status = vendorRequest[approvedField] ? 'אושר' : 'נדחה';
      return createHtmlResponse(
        "כבר טופל",
        `הספק "${vendorRequest.vendor_name}" כבר ${status} על ידי ${roleLabel}`,
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
        `הספק "${vendorRequest.vendor_name}" אושר על ידי ${roleLabel}`,
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
        `הספק "${vendorRequest.vendor_name}" נדחה על ידי ${roleLabel}`,
        false
      );
    }

    return createHtmlResponse("שגיאה", "פעולה לא תקינה", false);
  } catch (error: any) {
    console.error("Error in handle-manager-approval:", error);
    return createHtmlResponse("שגיאה", error.message, false);
  }
};

function createHtmlResponse(title: string, message: string, success: boolean): Response {
  const bgColor = success ? '#22c55e' : '#ef4444';
  const icon = success ? '✓' : '✗';

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} - ביטוח ישיר</title>
<style>
body {
  font-family: Arial, sans-serif;
  background: #f5f5f5;
  margin: 0;
  padding: 20px;
  direction: rtl;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
.container {
  max-width: 500px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
  overflow: hidden;
  text-align: center;
}
.header {
  background: #1a2b5f;
  color: white;
  padding: 30px;
}
.header img {
  max-width: 120px;
  margin-bottom: 15px;
}
.icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: ${bgColor};
  color: white;
  font-size: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: -40px auto 20px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.2);
}
.content {
  padding: 30px;
}
h1 {
  color: #1a2b5f;
  margin: 0 0 15px;
}
p {
  color: #666;
  font-size: 16px;
  line-height: 1.6;
}
</style>
</head>
<body>
<div class="container">
<div class="header">
<img src="https://www.555.co.il/resources/images/BY737X463.png" alt="ביטוח ישיר" />
</div>
<div class="icon">${icon}</div>
<div class="content">
<h1>${title}</h1>
<p>${message}</p>
</div>
</div>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

serve(handler);
