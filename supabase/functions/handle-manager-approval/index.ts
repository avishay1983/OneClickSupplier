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
  const baseUrl = "https://6422d882-b11f-4b09-8a0b-47925031a58e.lovableproject.com";
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
