import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload, CheckCircle, Loader2, FileText } from "lucide-react";

const VendorQuoteSubmit = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [vendorName, setVendorName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const checkToken = async () => {
      if (!token) {
        setError("קישור לא תקין");
        setLoading(false);
        return;
      }

      try {
        const { data: quote, error: quoteError } = await supabase
          .from("vendor_quotes")
          .select("*, vendor_requests(vendor_name)")
          .eq("quote_secure_token", token)
          .single();

        if (quoteError || !quote) {
          setError("הקישור לא נמצא או שפג תוקפו");
          setLoading(false);
          return;
        }

        if (quote.vendor_submitted) {
          setSubmitted(true);
        }

        setVendorName(quote.vendor_requests?.vendor_name || "");
        setLoading(false);
      } catch (err) {
        setError("שגיאה בטעינת הנתונים");
        setLoading(false);
      }
    };

    checkToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      toast.error("יש להעלות קובץ הצעת מחיר");
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("token", token || "");
      formData.append("file", file);
      formData.append("amount", amount);
      formData.append("description", description);

      const response = await fetch(
        "https://ijyqtemnhlbamxmgjuzp.supabase.co/functions/v1/vendor-quote-submit",
        {
          method: "POST",
          body: formData,
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "שגיאה בשליחת ההצעה");
      }

      setSubmitted(true);
      toast.success("הצעת המחיר נשלחה בהצלחה!");
    } catch (err: any) {
      toast.error(err.message || "שגיאה בשליחת ההצעה");
    } finally {
      setSubmitting(false);
    }
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

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">הצעת המחיר נשלחה!</h2>
            <p className="text-muted-foreground">
              תודה רבה. הצעת המחיר שלך התקבלה ותעבור לבדיקה.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4" dir="rtl">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <img
            src="/images/bituach-yashir-logo.png"
            alt="ביטוח ישיר"
            className="h-16 mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold">הגשת הצעת מחיר</h1>
          {vendorName && (
            <p className="text-muted-foreground mt-2">ספק: {vendorName}</p>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>פרטי הצעת המחיר</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="file">קובץ הצעת מחיר *</Label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
                  <input
                    type="file"
                    id="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <label htmlFor="file" className="cursor-pointer">
                    {file ? (
                      <div className="flex items-center justify-center gap-2">
                        <FileText className="h-8 w-8 text-primary" />
                        <span>{file.name}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="h-8 w-8 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          לחץ להעלאת קובץ
                        </span>
                        <span className="text-sm text-muted-foreground">
                          PDF, Word, Excel או תמונה
                        </span>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">סכום (₪)</Label>
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="הזן את סכום ההצעה"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">תיאור / הערות</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="תיאור ההצעה או הערות נוספות"
                  rows={4}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={submitting || !file}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    שולח...
                  </>
                ) : (
                  "שלח הצעת מחיר"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VendorQuoteSubmit;
