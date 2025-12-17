import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, Upload, FileText, CheckCircle, Clock, XCircle, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

interface Receipt {
  id: string;
  file_path: string;
  file_name: string;
  amount: number;
  receipt_date: string;
  description: string | null;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

interface VendorData {
  id: string;
  vendor_name: string;
  status: string;
}

const STATUS_CONFIG = {
  pending: { label: 'ממתין לאישור', icon: Clock, color: 'bg-warning text-warning-foreground' },
  approved: { label: 'אושר', icon: CheckCircle, color: 'bg-success text-success-foreground' },
  rejected: { label: 'נדחה', icon: XCircle, color: 'bg-destructive text-destructive-foreground' },
};

export default function VendorReceipts() {
  const { token } = useParams<{ token: string }>();
  const [vendor, setVendor] = useState<VendorData | null>(null);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [notApproved, setNotApproved] = useState(false);

  // Form state
  const [file, setFile] = useState<File | null>(null);
  const [amount, setAmount] = useState('');
  const [receiptDate, setReceiptDate] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!token) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }

      try {
        // Fetch vendor request by token
        const { data: vendorData, error: vendorError } = await supabase
          .from('vendor_requests')
          .select('id, vendor_name, status')
          .eq('secure_token', token)
          .maybeSingle();

        if (vendorError || !vendorData) {
          setNotFound(true);
          setIsLoading(false);
          return;
        }

        // Check if vendor is approved
        if (vendorData.status !== 'approved') {
          setNotApproved(true);
          setVendor(vendorData);
          setIsLoading(false);
          return;
        }

        setVendor(vendorData);

        // Fetch receipts
        const { data: receiptsData, error: receiptsError } = await supabase
          .from('vendor_receipts')
          .select('*')
          .eq('vendor_request_id', vendorData.id)
          .order('created_at', { ascending: false });

        if (!receiptsError && receiptsData) {
          setReceipts(receiptsData as Receipt[]);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setNotFound(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file || !amount || !receiptDate || !vendor || !token) {
      toast({
        title: 'שגיאה',
        description: 'יש למלא את כל השדות הנדרשים',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Use edge function to upload receipt
      const formData = new FormData();
      formData.append('token', token);
      formData.append('file', file);
      formData.append('amount', amount);
      formData.append('receiptDate', receiptDate);
      if (description) {
        formData.append('description', description);
      }

      const response = await fetch(
        'https://ijyqtemnhlbamxmgjuzp.supabase.co/functions/v1/vendor-receipt-upload',
        {
          method: 'POST',
          body: formData,
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to upload receipt');
      }

      setReceipts([result.receipt as Receipt, ...receipts]);
      
      // Reset form
      setFile(null);
      setAmount('');
      setReceiptDate('');
      setDescription('');
      setShowForm(false);

      toast({
        title: 'הקבלה הועלתה בהצלחה',
        description: 'הקבלה נשלחה לבדיקה',
      });
    } catch (error) {
      console.error('Error uploading receipt:', error);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן להעלות את הקבלה',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownload = async (receipt: Receipt) => {
    try {
      const { data, error } = await supabase.storage
        .from('vendor_documents')
        .download(receipt.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = receipt.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading receipt:', error);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן להוריד את הקובץ',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-6">
            <XCircle className="h-16 w-16 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-bold mb-2">הקישור לא נמצא</h2>
            <p className="text-muted-foreground">
              הקישור אינו תקף. אנא פנה לאיש הקשר שלך בחברה.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (notApproved) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-6">
            <Clock className="h-16 w-16 mx-auto text-warning mb-4" />
            <h2 className="text-xl font-bold mb-2">הבקשה טרם אושרה</h2>
            <p className="text-muted-foreground">
              שלום {vendor?.vendor_name}, בקשתך עדיין בתהליך אישור. תוכל להעלות קבלות לאחר שהבקשה תאושר.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="bg-[#1a2b5f] border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <img 
              src="/images/bituach-yashir-logo.png" 
              alt="ביטוח ישיר" 
              className="h-10 w-auto"
            />
            <div className="border-r border-white/20 pr-4">
              <h1 className="text-xl font-bold text-white">ספק בקליק</h1>
              <p className="text-sm text-white/70">העלאת קבלות</p>
            </div>
          </div>
        </div>
      </header>


      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold">שלום {vendor?.vendor_name}</h2>
          <p className="text-muted-foreground">העלה קבלות להתחשבנות עם ביטוח ישיר</p>
        </div>

        {/* Add New Receipt Button */}
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="mb-6 gap-2">
            <Plus className="h-4 w-4" />
            העלאת קבלה חדשה
          </Button>
        )}

        {/* New Receipt Form */}
        {showForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>העלאת קבלה חדשה</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">סכום הקבלה *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="הזן סכום"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="receiptDate">תאריך הקבלה *</Label>
                    <Input
                      id="receiptDate"
                      type="date"
                      value={receiptDate}
                      onChange={(e) => setReceiptDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">תיאור (אופציונלי)</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="תיאור הקבלה..."
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="file">קובץ הקבלה *</Label>
                  <div className="border-2 border-dashed rounded-lg p-4 text-center">
                    <input
                      id="file"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    {file ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-primary" />
                          <span className="text-sm">{file.name}</span>
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setFile(null)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <label htmlFor="file" className="cursor-pointer">
                        <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">לחץ לבחירת קובץ</p>
                        <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG</p>
                      </label>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    ביטול
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                        מעלה...
                      </>
                    ) : (
                      'העלה קבלה'
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Receipts List */}
        <Card>
          <CardHeader>
            <CardTitle>הקבלות שלי ({receipts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {receipts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>עדיין לא הועלו קבלות</p>
              </div>
            ) : (
              <div className="space-y-4">
                {receipts.map((receipt) => {
                  const statusConfig = STATUS_CONFIG[receipt.status];
                  const StatusIcon = statusConfig.icon;
                  
                  return (
                    <div
                      key={receipt.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <FileText className="h-8 w-8 text-primary" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{receipt.file_name}</span>
                            <Badge className={statusConfig.color}>
                              <StatusIcon className="h-3 w-3 ml-1" />
                              {statusConfig.label}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            סכום: ₪{receipt.amount.toLocaleString()} | 
                            תאריך: {format(new Date(receipt.receipt_date), 'dd/MM/yyyy', { locale: he })}
                            {receipt.description && ` | ${receipt.description}`}
                          </div>
                          {receipt.status === 'rejected' && receipt.rejection_reason && (
                            <p className="text-sm text-destructive mt-1">
                              סיבת הדחייה: {receipt.rejection_reason}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => handleDownload(receipt)}>
                        הורדה
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
