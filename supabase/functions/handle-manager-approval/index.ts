import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// Hebrew text as HTML entities - no Hebrew characters in source file
const HEBREW = {
  error: '&#1513;&#1490;&#1497;&#1488;&#1492;',
  missingParams: '&#1508;&#1512;&#1502;&#1496;&#1512;&#1497;&#1501; &#1495;&#1505;&#1512;&#1497;&#1501; &#1489;&#1489;&#1511;&#1513;&#1492;',
  vendorNotFound: '&#1489;&#1511;&#1513;&#1514; &#1492;&#1505;&#1508;&#1511; &#1500;&#1488; &#1504;&#1502;&#1510;&#1488;&#1492;',
  procurementManager: '&#1502;&#1504;&#1492;&#1500; &#1512;&#1499;&#1513;',
  procurementManagerDb: '\u05DE\u05E0\u05D4\u05DC \u05E8\u05DB\u05E9',
  vp: '&#1505;&#1502;&#1504;&#1499;"&#1500;',
  vpDb: '\u05E1\u05DE\u05E0\u05DB"\u05DC',
  approved: '&#1488;&#1493;&#1513;&#1512;',
  rejected: '&#1504;&#1491;&#1495;&#1492;',
  alreadyProcessed: '&#1499;&#1489;&#1512; &#1496;&#1493;&#1508;&#1500;',
  theVendor: '&#1492;&#1505;&#1508;&#1511;',
  already: '&#1499;&#1489;&#1512;',
  by: '&#1506;&#1500; &#1497;&#1491;&#1497;',
  cannotUpdateApproval: '&#1500;&#1488; &#1504;&#1497;&#1514;&#1503; &#1500;&#1506;&#1491;&#1499;&#1503; &#1488;&#1514; &#1492;&#1488;&#1497;&#1513;&#1493;&#1512;',
  approvedSuccessfully: '&#1488;&#1493;&#1513;&#1512; &#1489;&#1492;&#1510;&#1500;&#1495;&#1492;!',
  approvedBy: '&#1488;&#1493;&#1513;&#1512; &#1506;&#1500; &#1497;&#1491;&#1497;',
  cannotUpdateRejection: '&#1500;&#1488; &#1504;&#1497;&#1514;&#1503; &#1500;&#1506;&#1491;&#1499;&#1503; &#1488;&#1514; &#1492;&#1491;&#1495;&#1497;&#1497;&#1492;',
  rejectedBy: '&#1504;&#1491;&#1495;&#1492; &#1506;&#1500; &#1497;&#1491;&#1497;',
  invalidAction: '&#1508;&#1506;&#1493;&#1500;&#1492; &#1500;&#1488; &#1514;&#1511;&#1497;&#1504;&#1492;',
  errorOccurred: '&#1488;&#1497;&#1512;&#1506;&#1492; &#1513;&#1490;&#1497;&#1488;&#1492;',
  bituachYashir: '&#1489;&#1497;&#1496;&#1493;&#1495; &#1497;&#1513;&#1497;&#1512;',
  vendorApprovalSystem: '&#1502;&#1506;&#1512;&#1499;&#1514; &#1488;&#1497;&#1513;&#1493;&#1512; &#1505;&#1508;&#1511;&#1497;&#1501;',
  canCloseWindow: '&#1504;&#1497;&#1514;&#1503; &#1500;&#1505;&#1490;&#1493;&#1512; &#1495;&#1500;&#1493;&#1503; &#1494;&#1492;',
};

function toHtmlEntities(str: string): string {
  return str.split('').map(char => {
    const code = char.charCodeAt(0);
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
      return createHtmlResponse(HEBREW.error, HEBREW.missingParams, false);
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
      return createHtmlResponse(HEBREW.error, HEBREW.vendorNotFound, false);
    }

    const roleLabel = role === 'procurement_manager' ? HEBREW.procurementManager : HEBREW.vp;
    const roleLabelForDb = role === 'procurement_manager' ? HEBREW.procurementManagerDb : HEBREW.vpDb;
    const approvedField = role === 'procurement_manager' ? 'procurement_manager_approved' : 'vp_approved';
    const approvedAtField = role === 'procurement_manager' ? 'procurement_manager_approved_at' : 'vp_approved_at';
    const approvedByField = role === 'procurement_manager' ? 'procurement_manager_approved_by' : 'vp_approved_by';

    const vendorNameEncoded = toHtmlEntities(vendorRequest.vendor_name);

    if (vendorRequest[approvedField] !== null) {
      const status = vendorRequest[approvedField] ? HEBREW.approved : HEBREW.rejected;
      return createHtmlResponse(
        HEBREW.alreadyProcessed,
        `${HEBREW.theVendor} "${vendorNameEncoded}" ${HEBREW.already} ${status} ${HEBREW.by} ${roleLabel}`,
        vendorRequest[approvedField]
      );
    }

    if (action === 'approve') {
      const { error: updateError } = await supabase
        .from("vendor_requests")
        .update({
          [approvedField]: true,
          [approvedAtField]: new Date().toISOString(),
          [approvedByField]: roleLabelForDb,
        })
        .eq("id", vendorId);

      if (updateError) {
        console.error("Error updating approval:", updateError);
        return createHtmlResponse(HEBREW.error, HEBREW.cannotUpdateApproval, false);
      }

      console.log(`Vendor ${vendorId} approved by ${role}`);
      return createHtmlResponse(
        HEBREW.approvedSuccessfully,
        `${HEBREW.theVendor} "${vendorNameEncoded}" ${HEBREW.approvedBy} ${roleLabel}`,
        true
      );
    } else if (action === 'reject') {
      const { error: updateError } = await supabase
        .from("vendor_requests")
        .update({
          [approvedField]: false,
          [approvedAtField]: new Date().toISOString(),
          [approvedByField]: roleLabelForDb,
        })
        .eq("id", vendorId);

      if (updateError) {
        console.error("Error updating rejection:", updateError);
        return createHtmlResponse(HEBREW.error, HEBREW.cannotUpdateRejection, false);
      }

      console.log(`Vendor ${vendorId} rejected by ${role}`);
      return createHtmlResponse(
        HEBREW.rejected,
        `${HEBREW.theVendor} "${vendorNameEncoded}" ${HEBREW.rejectedBy} ${roleLabel}`,
        false
      );
    }

    return createHtmlResponse(HEBREW.error, HEBREW.invalidAction, false);
  } catch (error: any) {
    console.error("Error in handle-manager-approval:", error);
    return createHtmlResponse(HEBREW.error, HEBREW.errorOccurred, false);
  }
};

function createHtmlResponse(title: string, message: string, success: boolean | null): Response {
  let bgColor = '#3b82f6';
  let icon = '&#10004;';
  
  if (success === true) {
    bgColor = '#22c55e';
    icon = '&#10004;';
  } else if (success === false) {
    bgColor = '#ef4444';
    icon = '&#10008;';
  }

  const htmlContent = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
<meta charset="UTF-8">
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
<div class="header-logo">${HEBREW.bituachYashir}</div>
<div class="header-subtitle">${HEBREW.vendorApprovalSystem}</div>
</div>
<div class="icon-wrapper">
<div class="icon">${icon}</div>
</div>
<div class="content">
<h1>${title}</h1>
<p class="message">${message}</p>
</div>
<div class="footer">${HEBREW.canCloseWindow}</div>
</div>
</body>
</html>`;

  return new Response(htmlContent, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}

serve(handler);
