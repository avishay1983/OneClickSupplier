import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  console.log("approve-user function called");

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    const action = url.searchParams.get("action");
    const format = url.searchParams.get("format"); // 'json' for API calls

    if (!token || !action) {
      if (format === "json") {
        return new Response(JSON.stringify({ success: false, error: "Missing parameters" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      return new Response(createHtmlResponse("שגיאה", "פרמטרים חסרים", false), {
        status: 400,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    if (action !== "approve" && action !== "reject") {
      if (format === "json") {
        return new Response(JSON.stringify({ success: false, error: "Invalid action" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      return new Response(createHtmlResponse("שגיאה", "פעולה לא תקינה", false), {
        status: 400,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find the pending approval
    const { data: approval, error: fetchError } = await supabase
      .from("pending_approvals")
      .select("*")
      .eq("approval_token", token)
      .eq("status", "pending")
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching approval:", fetchError);
      if (format === "json") {
        return new Response(JSON.stringify({ success: false, error: "System error" }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      return new Response(createHtmlResponse("שגיאה", "שגיאת מערכת", false), {
        status: 500,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    if (!approval) {
      if (format === "json") {
        return new Response(JSON.stringify({ success: false, error: "Request not found or already processed" }), {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      return new Response(createHtmlResponse("שגיאה", "הבקשה לא נמצאה או כבר טופלה", false), {
        status: 404,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    if (action === "approve") {
      // Update profile to approved
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          is_approved: true,
          approved_at: new Date().toISOString(),
        })
        .eq("id", approval.user_id);

      if (profileError) {
        console.error("Error updating profile:", profileError);
        if (format === "json") {
          return new Response(JSON.stringify({ success: false, error: "Error updating profile" }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
        return new Response(createHtmlResponse("שגיאה", "שגיאה בעדכון הפרופיל", false), {
          status: 500,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }

      // Update pending approval status
      await supabase
        .from("pending_approvals")
        .update({ status: "approved" })
        .eq("id", approval.id);

      console.log("User approved:", approval.user_email);

      if (format === "json") {
        return new Response(JSON.stringify({ success: true, message: "User approved" }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      return new Response(
        createHtmlResponse(
          "הרישום אושר!",
          `המשתמש ${approval.user_name || approval.user_email} אושר בהצלחה וכעת יכול להתחבר למערכת.`,
          true
        ),
        {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }
      );
    } else {
      // Reject - update status and optionally delete user
      await supabase
        .from("pending_approvals")
        .update({ status: "rejected" })
        .eq("id", approval.id);

      // Delete the user from auth
      const { error: deleteError } = await supabase.auth.admin.deleteUser(approval.user_id);
      if (deleteError) {
        console.error("Error deleting user:", deleteError);
      }

      console.log("User rejected:", approval.user_email);

      if (format === "json") {
        return new Response(JSON.stringify({ success: true, message: "User rejected" }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      return new Response(
        createHtmlResponse(
          "הרישום נדחה",
          `הרישום של ${approval.user_name || approval.user_email} נדחה והמשתמש הוסר מהמערכת.`,
          true
        ),
        {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }
      );
    }
  } catch (error: any) {
    console.error("Error in approve-user:", error);
    return new Response(createHtmlResponse("שגיאה", error.message, false), {
      status: 500,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
};

function createHtmlResponse(title: string, message: string, success: boolean): string {
  const bgColor = success ? "#22c55e" : "#ef4444";
  const icon = success ? "✓" : "✗";

  return `
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: Arial, sans-serif;
          background: linear-gradient(135deg, #1a2b5f 0%, #2d4a8c 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          direction: rtl;
        }
        .card {
          background: white;
          border-radius: 16px;
          padding: 40px;
          max-width: 500px;
          width: 100%;
          text-align: center;
          box-shadow: 0 20px 40px rgba(0,0,0,0.2);
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
          margin: 0 auto 24px;
        }
        h1 {
          color: #1a2b5f;
          margin-bottom: 16px;
          font-size: 28px;
        }
        p {
          color: #666;
          font-size: 16px;
          line-height: 1.6;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="icon">${icon}</div>
        <h1>${title}</h1>
        <p>${message}</p>
      </div>
    </body>
    </html>
  `;
}

serve(handler);
