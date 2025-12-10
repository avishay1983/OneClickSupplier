import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// Convert string to HTML entities to avoid encoding issues
function toHtmlEntities(str: string): string {
  return str.split('').map(char => {
    const code = char.charCodeAt(0);
    // Convert non-ASCII characters to HTML entities
    if (code > 127) {
      return `&#${code};`;
    }
    return char;
  }).join('');
}

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
      return createHtmlResponse(
        toHtmlEntities("שגיאה"), 
        toHtmlEntities("פרמטרים חסרים בבקשה"), 
        false
      );
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
      return createHtmlResponse(
        toHtmlEntities("שגיאה"), 
        toHtmlEntities("בקשת הספק לא נמצאה"), 
        false
      );
    }

    const roleLabel = role === 'procurement_manager' 
      ? toHtmlEntities('מנהל רכש') 
      : toHtmlEntities('סמנכ"ל');
    const approvedField = role === 'procurement_manager' ? 'procurement_manager_approved' : 'vp_approved';
    const approvedAtField = role === 'procurement_manager' ? 'procurement_manager_approved_at' : 'vp_approved_at';
    const approvedByField = role === 'procurement_manager' ? 'procurement_manager_approved_by' : 'vp_approved_by';

    // Check if already processed
    if (vendorRequest[approvedField] !== null) {
      const status = vendorRequest[approvedField] 
        ? toHtmlEntities('אושר') 
        : toHtmlEntities('נדחה');
      return createHtmlResponse(
        toHtmlEntities("כבר טופל"),
        `${toHtmlEntities("הספק")} "${toHtmlEntities(vendorRequest.vendor_name)}" ${toHtmlEntities("כבר")} ${status} ${toHtmlEntities("על ידי")} ${roleLabel}`,
        vendorRequest[approvedField]
      );
    }

    if (action === 'approve') {
      const { error: updateError } = await supabase
        .from("vendor_requests")
        .update({
          [approvedField]: true,
          [approvedAtField]: new Date().toISOString(),
          [approvedByField]: role === 'procurement_manager' ? 'מנהל רכש' : 'סמנכ"ל',
        })
        .eq("id", vendorId);

      if (updateError) {
        console.error("Error updating approval:", updateError);
        return createHtmlResponse(
          toHtmlEntities("שגיאה"), 
          toHtmlEntities("לא ניתן לעדכן את האישור"), 
          false
        );
      }

      console.log(`Vendor ${vendorId} approved by ${role}`);
      return createHtmlResponse(
        toHtmlEntities("אושר בהצלחה!"),
        `${toHtmlEntities("הספק")} "${toHtmlEntities(vendorRequest.vendor_name)}" ${toHtmlEntities("אושר על ידי")} ${roleLabel}`,
        true
      );
    } else if (action === 'reject') {
      const { error: updateError } = await supabase
        .from("vendor_requests")
        .update({
          [approvedField]: false,
          [approvedAtField]: new Date().toISOString(),
          [approvedByField]: role === 'procurement_manager' ? 'מנהל רכש' : 'סמנכ"ל',
        })
        .eq("id", vendorId);

      if (updateError) {
        console.error("Error updating rejection:", updateError);
        return createHtmlResponse(
          toHtmlEntities("שגיאה"), 
          toHtmlEntities("לא ניתן לעדכן את הדחייה"), 
          false
        );
      }

      console.log(`Vendor ${vendorId} rejected by ${role}`);
      return createHtmlResponse(
        toHtmlEntities("נדחה"),
        `${toHtmlEntities("הספק")} "${toHtmlEntities(vendorRequest.vendor_name)}" ${toHtmlEntities("נדחה על ידי")} ${roleLabel}`,
        false
      );
    }

    return createHtmlResponse(
      toHtmlEntities("שגיאה"), 
      toHtmlEntities("פעולה לא תקינה"), 
      false
    );
  } catch (error: any) {
    console.error("Error in handle-manager-approval:", error);
    return createHtmlResponse(
      toHtmlEntities("שגיאה"), 
      toHtmlEntities(error.message || "אירעה שגיאה"), 
      false
    );
  }
};

function createHtmlResponse(title: string, message: string, success: boolean | null): Response {
  // success: true = approved (green), false = rejected (red), null = info/already processed (blue)
  let bgColor = '#3b82f6'; // blue for info
  let icon = '&#10004;'; // checkmark
  
  if (success === true) {
    bgColor = '#22c55e'; // green
    icon = '&#10004;';
  } else if (success === false) {
    bgColor = '#ef4444'; // red
    icon = '&#10008;';
  }

  // Use a simple approach - return Uint8Array with BOM
  const htmlContent = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
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
<div class="header-logo">&#1489;&#1497;&#1496;&#1493;&#1495; &#1497;&#1513;&#1497;&#1512;</div>
<div class="header-subtitle">&#1502;&#1506;&#1512;&#1499;&#1514; &#1488;&#1497;&#1513;&#1493;&#1512; &#1505;&#1508;&#1511;&#1497;&#1501;</div>
</div>
<div class="icon-wrapper">
<div class="icon">${icon}</div>
</div>
<div class="content">
<h1>${title}</h1>
<p class="message">${message}</p>
</div>
<div class="footer">&#1504;&#1497;&#1514;&#1503; &#1500;&#1505;&#1490;&#1493;&#1512; &#1495;&#1500;&#1493;&#1503; &#1494;&#1492;</div>
</div>
</body>
</html>`;

  const headers = new Headers();
  headers.set("Content-Type", "text/html; charset=utf-8");
  
  return new Response(htmlContent, {
    status: 200,
    headers: headers,
  });
}

serve(handler);
