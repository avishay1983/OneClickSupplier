import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendApprovalEmailPayload {
  quoteId: string;
  approverEmail: string;
  approverName: string;
  vendorName: string;
  amount: number;
  description: string;
  approvalType: "vp" | "procurement_manager";
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { quoteId, approverEmail, approverName, vendorName, amount, description, approvalType }: SendApprovalEmailPayload = await req.json();

    console.log("Sending approval email:", { quoteId, approverEmail, approvalType });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the quote
    const { data: quote, error: quoteError } = await supabase
      .from("vendor_quotes")
      .select("quote_secure_token, file_path")
      .eq("id", quoteId)
      .single();

    if (quoteError || !quote) {
      console.error("Quote not found:", quoteError);
      throw new Error("Quote not found");
    }

    // Build the approval link
    const baseUrl = Deno.env.get("SITE_URL") || "https://ijyqtemnhlbamxmgjuzp.lovableproject.com";
    const approvalLink = `${baseUrl}/quote-approval/${quote.quote_secure_token}?type=${approvalType}`;

    const approvalTypeName = approvalType === "vp" ? "סמנכ\"ל" : "מנהל רכש";

    const emailHtml = `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <img src="https://ijyqtemnhlbamxmgjuzp.supabase.co/storage/v1/object/public/vendor_documents/bituach-yashir-logo.png" alt="ביטוח ישיר" style="max-width: 200px;" />
        </div>
        
        <h2 style="color: #333; text-align: center;">בקשה לאישור הצעת מחיר</h2>
        
        <p style="color: #666; font-size: 16px; line-height: 1.6;">
          שלום ${approverName},
        </p>
        
        <p style="color: #666; font-size: 16px; line-height: 1.6;">
          הצעת מחיר חדשה ממתינה לאישורך כ${approvalTypeName}:
        </p>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>ספק:</strong> ${vendorName}</p>
          <p style="margin: 5px 0;"><strong>סכום:</strong> ₪${amount?.toLocaleString() || "לא צוין"}</p>
          <p style="margin: 5px 0;"><strong>תיאור:</strong> ${description || "לא צוין"}</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${approvalLink}" style="background-color: #0066cc; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-size: 18px; display: inline-block;">
            צפייה ואישור
          </a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
        
        <p style="color: #999; font-size: 12px; text-align: center;">
          הודעה זו נשלחה באופן אוטומטי ממערכת ניהול ספקים של ביטוח ישיר
        </p>
      </div>
    `;

    const emailResponse = await resend.emails.send({
      from: "ביטוח ישיר <onboarding@resend.dev>",
      to: [approverEmail],
      subject: `בקשה לאישור הצעת מחיר - ${vendorName}`,
      html: emailHtml,
    });

    console.log("Approval email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error sending approval email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
