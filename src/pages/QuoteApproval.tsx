import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { CheckCircle, XCircle, Loader2, Download, FileText } from "lucide-react";

const QuoteApproval = () => {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const approvalType = searchParams.get("type") as "vp" | "procurement_manager";
  
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [quote, setQuote] = useState<any>(null);
  const [vendorName, setVendorName] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectionForm, setShowRejectionForm] = useState(false);
  const [alreadyProcessed, setAlreadyProcessed] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadQuote = async () => {
      if (!token) {
        setError("קישור לא תקין");
        setLoading(false);
        return;
      }

      try {
        const { data, error: quoteError } = await supabase
          .from("vendor_quotes")
          .select("*, vendor_requests(vendor_name, vendor_email)")
          .eq("quote_secure_token", token)
          .single();

        if (quoteError || !data) {
          setError("הקישור לא נמצא או שפג תוקפו");
          setLoading(false);
          return;
        }

        // Check if already processed based on approval type
        if (approvalType === "vp" && data.vp_approved !== null) {
          setAlreadyProcessed(true);
        }
        if (approvalType === "procurement_manager" && data.procurement_manager_approved !== null) {
          setAlreadyProcessed(true);
        }

        setQuote(data);
        setVendorName(data.vendor_requests?.vendor_name || "");
        setLoading(false);
      } catch (err) {
        setError("שגיאה בטעינת הנתונים");
        setLoading(false);
      }
    };

    loadQuote();
  }, [token, approvalType]);

  const handleApprove = async () => {
    setProcessing(true);
    try {
      const updateData: any = {};
      const now = new Date().toISOString();

      if (approvalType === "vp") {
        updateData.vp_approved = true;
        updateData.vp_approved_at = now;
        updateData.status = "pending_procurement";
      } else if (approvalType === "procurement_manager") {
        updateData.procurement_manager_approved = true;
        updateData.procurement_manager_approved_at = now;
        updateData.status = "approved";
      }

      const { error: updateError } = await supabase
        .from("vendor_quotes")
        .update(updateData)
        .eq("id", quote.id);

      if (updateError) throw updateError;

      // If VP approved, send email to procurement manager
      if (approvalType === "vp") {
        // Get procurement manager email from settings
        const { data: settings } = await supabase
          .from("app_settings")
          .select("setting_value")
          .eq("setting_key", "procurement_manager_email")
          .single();

        if (settings?.setting_value) {
          await supabase.functions.invoke("send-quote-approval-email", {
            body: {
              quoteId: quote.id,
              approverEmail: settings.setting_value,
              approverName: "מנהל רכש",
              vendorName: vendorName,
              amount: quote.amount,
              description: quote.description,
              approvalType: "procurement_manager",
            },
          });
        }
      }

      setAlreadyProcessed(true);
      toast.success("ההצעה אושרה בהצלחה!");
    } catch (err: any) {
      toast.error(err.message || "שגיאה באישור ההצעה");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error("יש להזין סיבת דחייה");
      return;
    }

    setProcessing(true);
    try {
      const updateData: any = { status: "rejected" };

      if (approvalType === "vp") {
        updateData.vp_approved = false;
        updateData.vp_rejection_reason = rejectionReason;
      } else if (approvalType === "procurement_manager") {
        updateData.procurement_manager_approved = false;
        updateData.procurement_manager_rejection_reason = rejectionReason;
      }

      const { error: updateError } = await supabase
        .from("vendor_quotes")
        .update(updateData)
        .eq("id", quote.id);

      if (updateError) throw updateError;

      setAlreadyProcessed(true);
      toast.success("ההצעה נדחתה");
    } catch (err: any) {
      toast.error(err.message || "שגיאה בדחיית ההצעה");
    } finally {
      setProcessing(false);
    }
  };

  const downloadQuote = async () => {
    if (!quote?.file_path) return;

    const { data } = supabase.storage
      .from("vendor_documents")
      .getPublicUrl(quote.file_path);

    window.open(data.publicUrl, "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive text-lg">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (alreadyProcessed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">הפעולה בוצעה!</h2>
            <p className="text-muted-foreground">
              הצעת המחיר כבר טופלה.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const approvalTypeName = approvalType === "vp" ? "סמנכ\"ל" : "מנהל רכש";

  return (
    <div className="min-h-screen bg-background p-4" dir="rtl">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <img
            src="/images/bituach-yashir-logo.png"
            alt="ביטוח ישיר"
            className="h-16 mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold">אישור הצעת מחיר - {approvalTypeName}</h1>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>פרטי הצעת המחיר</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">ספק</Label>
                <p className="font-medium">{vendorName}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">סכום</Label>
                <p className="font-medium">
                  {quote?.amount ? `₪${quote.amount.toLocaleString()}` : "לא צוין"}
                </p>
              </div>
              <div className="col-span-2">
                <Label className="text-muted-foreground">תיאור</Label>
                <p className="font-medium">{quote?.description || "לא צוין"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">תאריך הגשה</Label>
                <p className="font-medium">
                  {quote?.vendor_submitted_at
                    ? new Date(quote.vendor_submitted_at).toLocaleDateString("he-IL")
                    : "-"}
                </p>
              </div>
            </div>

            {quote?.file_path && (
              <Button variant="outline" onClick={downloadQuote} className="w-full">
                <Download className="h-4 w-4 ml-2" />
                הורד קובץ הצעת מחיר
              </Button>
            )}
          </CardContent>
        </Card>

        {!showRejectionForm ? (
          <div className="flex gap-4">
            <Button
              onClick={handleApprove}
              disabled={processing}
              className="flex-1"
              size="lg"
            >
              {processing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 ml-2" />
                  אישור
                </>
              )}
            </Button>
            <Button
              variant="destructive"
              onClick={() => setShowRejectionForm(true)}
              disabled={processing}
              className="flex-1"
              size="lg"
            >
              <XCircle className="h-4 w-4 ml-2" />
              דחייה
            </Button>
          </div>
        ) : (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rejection">סיבת הדחייה</Label>
                <Textarea
                  id="rejection"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="נא לציין את סיבת הדחייה..."
                  rows={4}
                />
              </div>
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => setShowRejectionForm(false)}
                  disabled={processing}
                  className="flex-1"
                >
                  ביטול
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={processing}
                  className="flex-1"
                >
                  {processing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "אישור דחייה"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default QuoteApproval;
