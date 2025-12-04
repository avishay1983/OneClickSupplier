import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Download, ExternalLink, Loader2, User, Building, CreditCard, Phone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { VendorDocument, VendorRequest, DOCUMENT_TYPE_LABELS, PAYMENT_METHOD_LABELS } from '@/types/vendor';
import { toast } from '@/hooks/use-toast';

interface ViewDocumentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendorRequestId: string;
  vendorName: string;
}

export function ViewDocumentsDialog({ 
  open, 
  onOpenChange, 
  vendorRequestId, 
  vendorName 
}: ViewDocumentsDialogProps) {
  const [documents, setDocuments] = useState<VendorDocument[]>([]);
  const [vendorData, setVendorData] = useState<VendorRequest | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && vendorRequestId) {
      fetchData();
    }
  }, [open, vendorRequestId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [docsResponse, vendorResponse] = await Promise.all([
        supabase
          .from('vendor_documents')
          .select('*')
          .eq('vendor_request_id', vendorRequestId),
        supabase
          .from('vendor_requests')
          .select('*')
          .eq('id', vendorRequestId)
          .maybeSingle()
      ]);

      if (docsResponse.error) throw docsResponse.error;
      if (vendorResponse.error) throw vendorResponse.error;

      setDocuments((docsResponse.data as VendorDocument[]) || []);
      setVendorData(vendorResponse.data as VendorRequest);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן לטעון את הנתונים',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openDocument = (filePath: string) => {
    const { data } = supabase.storage
      .from('vendor_documents')
      .getPublicUrl(filePath);
    
    window.open(data.publicUrl, '_blank');
  };

  const downloadDocument = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('vendor_documents')
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן להוריד את הקובץ',
        variant: 'destructive',
      });
    }
  };

  const InfoRow = ({ label, value }: { label: string; value: string | null | undefined }) => (
    value ? (
      <div className="flex justify-between py-2 border-b border-border/50 last:border-0">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}</span>
      </div>
    ) : null
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl">{vendorName}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="documents" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="documents">מסמכים ({documents.length})</TabsTrigger>
              <TabsTrigger value="details">פרטי ספק</TabsTrigger>
            </TabsList>

            <TabsContent value="documents">
              {documents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>לא נמצאו מסמכים עבור ספק זה</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-4 rounded-lg border bg-muted/30"
                    >
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 rounded-lg p-2">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm text-muted-foreground">
                            {DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type}
                          </p>
                          <p className="font-semibold">{doc.file_name}</p>
                          <p className="text-xs text-muted-foreground">
                            הועלה: {new Date(doc.uploaded_at).toLocaleDateString('he-IL')}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDocument(doc.file_path)}
                          className="gap-1"
                        >
                          <ExternalLink className="h-4 w-4" />
                          צפה
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadDocument(doc.file_path, doc.file_name)}
                          className="gap-1"
                        >
                          <Download className="h-4 w-4" />
                          הורד
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="details">
              {vendorData ? (
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Building className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">פרטי חברה</h3>
                    </div>
                    <div className="space-y-1">
                      <InfoRow label="שם הספק" value={vendorData.vendor_name} />
                      <InfoRow label="אימייל" value={vendorData.vendor_email} />
                      <InfoRow label="ח.פ / עוסק מורשה" value={vendorData.company_id} />
                      <InfoRow label="טלפון" value={vendorData.phone} />
                      <InfoRow label="נייד" value={vendorData.mobile} />
                      <InfoRow label="פקס" value={vendorData.fax} />
                    </div>
                  </div>

                  {/* Address */}
                  {(vendorData.street || vendorData.city) && (
                    <div className="rounded-lg border p-4">
                      <h3 className="font-semibold mb-3">כתובת</h3>
                      <div className="space-y-1">
                        <InfoRow label="רחוב" value={vendorData.street} />
                        <InfoRow label="מספר" value={vendorData.street_number} />
                        <InfoRow label="עיר" value={vendorData.city} />
                        <InfoRow label="מיקוד" value={vendorData.postal_code} />
                        <InfoRow label="ת.ד" value={vendorData.po_box} />
                      </div>
                    </div>
                  )}

                  {/* Contacts */}
                  {(vendorData.accounting_contact_name || vendorData.sales_contact_name) && (
                    <div className="rounded-lg border p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Phone className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold">אנשי קשר</h3>
                      </div>
                      <div className="space-y-1">
                        <InfoRow label="איש קשר הנה״ח" value={vendorData.accounting_contact_name} />
                        <InfoRow label="טלפון הנה״ח" value={vendorData.accounting_contact_phone} />
                        <InfoRow label="איש קשר מכירות" value={vendorData.sales_contact_name} />
                        <InfoRow label="טלפון מכירות" value={vendorData.sales_contact_phone} />
                      </div>
                    </div>
                  )}

                  {/* Bank Details */}
                  {vendorData.bank_name && (
                    <div className="rounded-lg border p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <CreditCard className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold">פרטי בנק</h3>
                      </div>
                      <div className="space-y-1">
                        <InfoRow label="שם הבנק" value={vendorData.bank_name} />
                        <InfoRow label="סניף" value={vendorData.bank_branch} />
                        <InfoRow label="מספר חשבון" value={vendorData.bank_account_number} />
                        <InfoRow label="שיטת תשלום" value={vendorData.payment_method ? PAYMENT_METHOD_LABELS[vendorData.payment_method] : null} />
                        <InfoRow label="תנאי תשלום" value={vendorData.payment_terms} />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>לא נמצאו פרטים עבור ספק זה</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
