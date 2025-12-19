import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { CheckCircle, XCircle, Loader2, Download, Trash2 } from "lucide-react";
import SignaturePad from "signature_pad";
import { PDFDocument, rgb } from "pdf-lib";
import { pdfToImage } from "@/utils/pdfToImage";

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
  const [showSignature, setShowSignature] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signaturePadRef = useRef<SignaturePad | null>(null);

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
          .maybeSingle();

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

  // Initialize signature pad when showing signature
  useEffect(() => {
    if (!showSignature || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const container = canvas.parentElement;
    
    if (!container) return;
    
    // Get container dimensions
    const rect = container.getBoundingClientRect();
    
    // Set canvas dimensions
    canvas.width = Math.min(rect.width, 400);
    canvas.height = 200;
    
    // Destroy previous instance if exists
    if (signaturePadRef.current) {
      signaturePadRef.current.off();
    }
    
    // Initialize SignaturePad
    signaturePadRef.current = new SignaturePad(canvas, {
      backgroundColor: 'rgb(255, 255, 255)',
      penColor: 'rgb(0, 0, 100)',
      minWidth: 0.5,
      maxWidth: 2.5,
      throttle: 16,
    });
    
    // Clear to set background
    signaturePadRef.current.clear();
    
    return () => {
      if (signaturePadRef.current) {
        signaturePadRef.current.off();
      }
    };
  }, [showSignature]);

  const clearSignature = () => {
    if (signaturePadRef.current) {
      signaturePadRef.current.clear();
    }
  };

  const handleApproveClick = () => {
    setShowSignature(true);
  };


  const handleApprove = async () => {
    if (!signaturePadRef.current || signaturePadRef.current.isEmpty()) {
      toast.error("יש לחתום לפני האישור");
      return;
    }

    if (!quote?.file_path) {
      toast.error("לא נמצא קובץ הצעת מחיר");
      return;
    }

    setProcessing(true);
    setStatusMessage("מעבד את החתימה...");
    
    try {
      const signatureDataUrl = signaturePadRef.current.toDataURL('image/png');
      
      // Download the PDF
      setStatusMessage("מוריד את הצעת המחיר...");
      const { data: pdfData, error: downloadError } = await supabase.storage
        .from("vendor_documents")
        .download(quote.file_path);

      if (downloadError) throw downloadError;

      const pdfBytes = await pdfData.arrayBuffer();
      
      // Detect signature position using AI (based on PDF image)
      setStatusMessage("מזהה מיקום חתימה...");

      let signaturePosition: { x_percent: number; y_percent: number; found?: boolean } =
        approvalType === "vp"
          ? { x_percent: 10, y_percent: 62, found: false }
          : { x_percent: 40, y_percent: 62, found: false };

      try {
        const pdfFile = new File([pdfData], quote?.file_name || "quote.pdf", {
          type: "application/pdf",
        });

        const img = await pdfToImage(pdfFile);
        if (img?.base64) {
          const imageDataUrl = `data:${img.mimeType};base64,${img.base64}`;

          const { data: positionData, error: positionError } =
            await supabase.functions.invoke("detect-signature-position", {
              body: {
                imageBase64: imageDataUrl,
                signerType: approvalType,
              },
            });

          if (!positionError && positionData?.x_percent != null && positionData?.y_percent != null) {
            signaturePosition = positionData;
          }
        }

        console.log("Signature position:", { approvalType, signaturePosition });
      } catch (aiError) {
        console.error("AI detection failed, using defaults:", aiError);
      }

      // Load PDF and add signature
      setStatusMessage("מוסיף חתימה למסמך...");
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const signatureImage = await pdfDoc.embedPng(signatureDataUrl);
      
      const pages = pdfDoc.getPages();
      const lastPage = pages[pages.length - 1];
      const { width: pageWidth, height: pageHeight } = lastPage.getSize();
      
      // Calculate signature position
      const sigWidth = 100;
      const sigHeight = 40;
      
      // Convert percentages to actual coordinates
      const rawX = (signaturePosition.x_percent / 100) * pageWidth;
      const rawY = (signaturePosition.y_percent / 100) * pageHeight; // y is from bottom

      const xPosition = Math.max(10, Math.min(rawX, pageWidth - sigWidth - 10));
      const yPosition = Math.max(10, Math.min(rawY, pageHeight - sigHeight - 10));
        xPosition, 
        yPosition, 
        pageWidth, 
        pageHeight,
        signerType: approvalType 
      });
      
      // Draw signature
      lastPage.drawImage(signatureImage, {
        x: xPosition,
        y: yPosition,
        width: sigWidth,
        height: sigHeight,
      });
      
      // Add date below signature
      const dateStr = new Date().toLocaleDateString('he-IL');
      lastPage.drawText(dateStr, {
        x: xPosition + sigWidth / 2 - 20,
        y: yPosition - 12,
        size: 8,
        color: rgb(0.3, 0.3, 0.3),
      });

      // Save the modified PDF
      const modifiedPdfBytes = await pdfDoc.save();
      const modifiedPdfBlob = new Blob([new Uint8Array(modifiedPdfBytes)], { type: 'application/pdf' });
      
      // Upload the signed PDF
      setStatusMessage("שומר את המסמך החתום...");
      const { error: uploadError } = await supabase.storage
        .from('vendor_documents')
        .update(quote.file_path, modifiedPdfBlob, {
          cacheControl: '0',
        });

      if (uploadError) throw uploadError;

      // Update database
      setStatusMessage("מעדכן סטטוס...");
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
        setStatusMessage("שולח הודעה למנהל רכש...");
        const { data: settings } = await supabase
          .from("app_settings")
          .select("setting_value")
          .eq("setting_key", "car_manager_email")
          .maybeSingle();

        const { data: nameSettings } = await supabase
          .from("app_settings")
          .select("setting_value")
          .eq("setting_key", "car_manager_name")
          .maybeSingle();

        if (settings?.setting_value) {
          await supabase.functions.invoke("send-quote-approval-email", {
            body: {
              quoteId: quote.id,
              approverEmail: settings.setting_value,
              approverName: nameSettings?.setting_value || "מנהל רכש",
              vendorName: vendorName,
              amount: quote.amount,
              description: quote.description,
              approvalType: "procurement_manager",
            },
          });
        }
      }

      setAlreadyProcessed(true);
      toast.success("ההצעה אושרה והחתימה נוספה בהצלחה!");
    } catch (err: any) {
      console.error('Approval error:', err);
      toast.error(err.message || "שגיאה באישור ההצעה");
    } finally {
      setProcessing(false);
      setStatusMessage("");
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

    const { data } = supabase.storage.from("vendor_documents").getPublicUrl(quote.file_path);

    window.open(`${data.publicUrl}?t=${Date.now()}`, "_blank");
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
              הצעת המחיר כבר טופלה והחתימה נוספה למסמך.
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

        {showSignature ? (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>חתימה דיגיטלית</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                נא לחתום במסגרת להלן. החתימה תוטמע אוטומטית במיקום הנכון ב-PDF (מתחת ל-"{approvalTypeName}")
              </p>
              
              <div className="border-2 border-dashed border-border rounded-lg p-2 bg-white">
                <canvas
                  ref={canvasRef}
                  className="w-full touch-none"
                  style={{ maxWidth: '400px', margin: '0 auto', display: 'block' }}
                />
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={clearSignature}
                  disabled={processing}
                  className="flex-1"
                >
                  <Trash2 className="h-4 w-4 ml-2" />
                  נקה חתימה
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowSignature(false)}
                  disabled={processing}
                  className="flex-1"
                >
                  ביטול
                </Button>
              </div>
              
              {statusMessage && (
                <div className="text-center text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin inline ml-2" />
                  {statusMessage}
                </div>
              )}
              
              <Button
                onClick={handleApprove}
                disabled={processing}
                className="w-full"
                size="lg"
              >
                {processing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 ml-2" />
                    אישור עם חתימה
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ) : !showRejectionForm ? (
          <div className="flex gap-4">
            <Button
              onClick={handleApproveClick}
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
