import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Payload = {
  token?: string;
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let token: string | null | undefined;

    if (req.method === "GET") {
      token = new URL(req.url).searchParams.get("token");
    } else {
      const body = (await req.json().catch(() => ({}))) as Payload;
      token = body.token;
    }

    if (!token) {
      return new Response(JSON.stringify({ error: "קישור לא תקין" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: quote, error: quoteError } = await supabase
      .from("vendor_quotes")
      .select(
        `id, file_path, file_name, description, amount, quote_date, status,
         vendor_submitted, vendor_submitted_at, quote_link_sent_at, created_at,
         vp_approved, procurement_manager_approved, quote_secure_token,
         vendor_requests(vendor_name, vendor_email, company_id)`
      )
      .eq("quote_secure_token", token)
      .single();

    if (quoteError || !quote) {
      console.error("Quote not found:", quoteError);
      return new Response(JSON.stringify({ error: "הקישור לא נמצא" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const start = quote.quote_link_sent_at ?? quote.created_at;
    if (start) {
      const startMs = new Date(start).getTime();
      const expiresMs = startMs + 7 * 24 * 60 * 60 * 1000;
      if (Date.now() > expiresMs) {
        return new Response(JSON.stringify({ error: "פג תוקף הקישור" }), {
          status: 410,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }

    const vendorRequests: any = (quote as any).vendor_requests;
    const vendorName = Array.isArray(vendorRequests)
      ? vendorRequests?.[0]?.vendor_name ?? ""
      : vendorRequests?.vendor_name ?? "";
    const vendorEmail = Array.isArray(vendorRequests)
      ? vendorRequests?.[0]?.vendor_email ?? ""
      : vendorRequests?.vendor_email ?? "";
    const companyId = Array.isArray(vendorRequests)
      ? vendorRequests?.[0]?.company_id ?? ""
      : vendorRequests?.company_id ?? "";

    return new Response(
      JSON.stringify({
        quoteId: quote.id,
        vendorName,
        vendorEmail,
        companyId,
        filePath: quote.file_path,
        fileName: quote.file_name,
        description: quote.description,
        amount: quote.amount,
        quoteDate: quote.quote_date,
        status: quote.status,
        submitted: Boolean(quote.vendor_submitted),
        vendorSubmittedAt: quote.vendor_submitted_at,
        vpApproved: quote.vp_approved,
        procurementManagerApproved: quote.procurement_manager_approved,
        quoteSecureToken: quote.quote_secure_token,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in vendor-quote-details:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
