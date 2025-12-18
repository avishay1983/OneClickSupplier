import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const formData = await req.formData();
    const token = formData.get("token") as string;
    const file = formData.get("file") as File;
    const amount = formData.get("amount") as string;
    const description = formData.get("description") as string;

    console.log("Vendor quote submission:", { token, amount, description, fileName: file?.name });

    if (!token) {
      throw new Error("Missing token");
    }

    // Get the quote by token
    const { data: quote, error: quoteError } = await supabase
      .from("vendor_quotes")
      .select("*, vendor_requests(vendor_name, vendor_email, handler_name, handler_email)")
      .eq("quote_secure_token", token)
      .single();

    if (quoteError || !quote) {
      console.error("Quote not found:", quoteError);
      throw new Error("Quote not found or expired");
    }

    if (quote.vendor_submitted) {
      throw new Error("Quote already submitted");
    }

    let filePath = quote.file_path;
    let fileName = quote.file_name;

    // Upload file if provided
    if (file) {
      const fileExt = file.name.split(".").pop();
      const newFileName = `quote_${quote.id}_${Date.now()}.${fileExt}`;
      filePath = `quotes/${newFileName}`;

      const { error: uploadError } = await supabase.storage
        .from("vendor_documents")
        .upload(filePath, file, {
          contentType: file.type,
          upsert: true,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw new Error("Failed to upload file");
      }

      fileName = file.name;
    }

    // Update the quote
    const { error: updateError } = await supabase
      .from("vendor_quotes")
      .update({
        file_path: filePath,
        file_name: fileName,
        amount: amount ? parseFloat(amount) : null,
        description: description || null,
        vendor_submitted: true,
        vendor_submitted_at: new Date().toISOString(),
        status: "pending_handler",
      })
      .eq("id", quote.id);

    if (updateError) {
      console.error("Update error:", updateError);
      throw new Error("Failed to update quote");
    }

    console.log("Quote submitted successfully:", quote.id);

    return new Response(
      JSON.stringify({ success: true, message: "הצעת המחיר נשלחה בהצלחה" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in vendor-quote-submit:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
