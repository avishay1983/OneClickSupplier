import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Download, ExternalLink, Loader2, User, Building, CreditCard, Phone, Copy, Check, Scan } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { VendorDocument, VendorRequest, DOCUMENT_TYPE_LABELS, PAYMENT_METHOD_LABELS } from '@/types/vendor';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface ExtractedTags {
  bank_number?: string | null;
  branch_number?: string | null;
  account_number?: string | null;
}

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
  const [copiedField, setCopiedField] = useState<string | null>(null);
  

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
    
    // Remove any download parameter to force inline viewing
    const viewUrl = data.publicUrl.split('?')[0];
    window.open(viewUrl, '_blank');
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

  const copyToClipboard = async (value: string, fieldKey: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(fieldKey);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      toast({
        title: 'שגיאה',
        description: 'לא ניתן להעתיק',
        variant: 'destructive',
      });
    }
  };

  const InfoRow = ({ label, value, fieldKey }: { label: string; value: string | null | undefined; fieldKey: string }) => (
    value ? (
      <div 
        className="flex justify-between py-2 border-b border-border/50 last:border-0 cursor-pointer hover:bg-muted/50 rounded px-2 -mx-2 transition-colors group"
        onClick={() => copyToClipboard(value, fieldKey)}
        title="לחץ להעתקה"
      >
        <div className="flex items-center gap-2">
          <span className="font-medium" dir="ltr">{value}</span>
          {copiedField === fieldKey ? (
            <Check className="h-3 w-3 text-success" />
          ) : (
            <Copy className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
        <span className="text-muted-foreground">{label}</span>
      </div>
    ) : null
  );

  const OcrTagsBadges = ({ tags }: { tags: ExtractedTags }) => (
    <div className="flex flex-wrap gap-2 justify-end">
      {tags.bank_number && (
        <Badge variant="secondary" className="gap-1 text-xs">
          <span className="text-muted-foreground">בנק:</span>
          <span className="font-mono font-bold">{tags.bank_number}</span>
        </Badge>
      )}
      {tags.branch_number && (
        <Badge variant="secondary" className="gap-1 text-xs">
          <span className="text-muted-foreground">סניף:</span>
          <span className="font-mono font-bold">{tags.branch_number}</span>
        </Badge>
      )}
      {tags.account_number && (
        <Badge variant="secondary" className="gap-1 text-xs">
          <span className="text-muted-foreground">חשבון:</span>
          <span className="font-mono font-bold">{tags.account_number}</span>
        </Badge>
      )}
    </div>
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
              <TabsTrigger value="documents">
                מסמכים ({documents.length + (vendorData?.contract_file_path ? 1 : 0)})
              </TabsTrigger>
              <TabsTrigger value="details">פרטי ספק</TabsTrigger>
            </TabsList>

            <TabsContent value="documents">
              {/* Contract File Section */}
              {vendorData?.requires_contract_signature && vendorData?.contract_file_path && (
                <div className="mb-4">
                  <div className="rounded-lg border-2 border-primary bg-primary/5 p-4">
                    <div className="flex flex-row-reverse items-center justify-between gap-3">
                      <div className="flex flex-row-reverse items-center gap-3 flex-1 min-w-0">
                        <div className="bg-primary rounded-lg p-2 shrink-0">
                          <FileText className="h-5 w-5 text-primary-foreground" />
                        </div>
                        <div className="text-right min-w-0">
                          <Badge className="mb-1">חוזה חתום</Badge>
                          <p className="font-semibold truncate">
                            {vendorData.contract_file_path.split('/').pop() || 'contract.pdf'}
                          </p>
                          {vendorData.contract_uploaded_at && (
                            <p className="text-xs text-muted-foreground">
                              הועלה: {new Date(vendorData.contract_uploaded_at).toLocaleDateString('he-IL')}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDocument(vendorData.contract_file_path!)}
                          className="gap-1"
                        >
                          <ExternalLink className="h-4 w-4" />
                          <span className="hidden sm:inline">צפה</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadDocument(
                            vendorData.contract_file_path!,
                            vendorData.contract_file_path!.split('/').pop() || 'contract.pdf'
                          )}
                          className="gap-1"
                        >
                          <Download className="h-4 w-4" />
                          <span className="hidden sm:inline">הורד</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Other Documents */}
              {documents.length === 0 && !vendorData?.contract_file_path ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>לא נמצאו מסמכים עבור ספק זה</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc) => {
                    const extractedTags = doc.extracted_tags as ExtractedTags | null;
                    const hasExtractedData = extractedTags && (
                      extractedTags.bank_number || 
                      extractedTags.branch_number || 
                      extractedTags.account_number
                    );
                    
                    return (
                      <div
                        key={doc.id}
                        className="rounded-lg border bg-muted/30 p-4"
                      >
                        <div className="flex flex-row-reverse items-center justify-between gap-3">
                          {/* Document info */}
                          <div className="flex flex-row-reverse items-center gap-3 flex-1 min-w-0">
                            <div className="bg-primary/10 rounded-lg p-2 shrink-0">
                              <FileText className="h-5 w-5 text-primary" />
                            </div>
                            <div className="text-right min-w-0">
                              <p className="font-medium text-sm text-muted-foreground">
                                {DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type}
                              </p>
                              <p className="font-semibold truncate">{doc.file_name}</p>
                              <p className="text-xs text-muted-foreground">
                                הועלה: {new Date(doc.uploaded_at).toLocaleDateString('he-IL')}
                              </p>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2 shrink-0">
                            {/* OCR popup button */}
                            {hasExtractedData && (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1 border-success/50 text-success hover:bg-success/10"
                                  >
                                    <Scan className="h-4 w-4" />
                                    <span className="hidden sm:inline">תגיות</span>
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto" dir="rtl" align="end">
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-success text-sm font-medium">
                                      <Scan className="h-4 w-4" />
                                      <span>נתונים שחולצו</span>
                                    </div>
                                    <OcrTagsBadges tags={extractedTags} />
                                  </div>
                                </PopoverContent>
                              </Popover>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openDocument(doc.file_path)}
                              className="gap-1"
                            >
                              <ExternalLink className="h-4 w-4" />
                              <span className="hidden sm:inline">צפה</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadDocument(doc.file_path, doc.file_name)}
                              className="gap-1"
                            >
                              <Download className="h-4 w-4" />
                              <span className="hidden sm:inline">הורד</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="details">
              {vendorData ? (
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center justify-end gap-2 mb-3">
                      <h3 className="font-semibold">פרטי חברה</h3>
                      <Building className="h-5 w-5 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <InfoRow label="שם הספק" value={vendorData.vendor_name} fieldKey="vendor_name" />
                      <InfoRow label="אימייל" value={vendorData.vendor_email} fieldKey="vendor_email" />
                      <InfoRow label="ח.פ / עוסק מורשה" value={vendorData.company_id} fieldKey="company_id" />
                      <InfoRow label="טלפון" value={vendorData.phone} fieldKey="phone" />
                      <InfoRow label="נייד" value={vendorData.mobile} fieldKey="mobile" />
                      <InfoRow label="פקס" value={vendorData.fax} fieldKey="fax" />
                    </div>
                  </div>

                  {/* Address */}
                  {(vendorData.street || vendorData.city) && (
                    <div className="rounded-lg border p-4">
                      <h3 className="font-semibold mb-3 text-right w-full">כתובת</h3>
                      <div className="space-y-1">
                        <InfoRow label="רחוב" value={vendorData.street} fieldKey="street" />
                        <InfoRow label="מספר" value={vendorData.street_number} fieldKey="street_number" />
                        <InfoRow label="עיר" value={vendorData.city} fieldKey="city" />
                        <InfoRow label="מיקוד" value={vendorData.postal_code} fieldKey="postal_code" />
                        <InfoRow label="ת.ד" value={vendorData.po_box} fieldKey="po_box" />
                      </div>
                    </div>
                  )}

                  {/* Contacts */}
                  {(vendorData.accounting_contact_name || vendorData.sales_contact_name) && (
                    <div className="rounded-lg border p-4">
                      <div className="flex items-center justify-end gap-2 mb-3">
                        <h3 className="font-semibold">אנשי קשר</h3>
                        <Phone className="h-5 w-5 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <InfoRow label="איש קשר הנה״ח" value={vendorData.accounting_contact_name} fieldKey="accounting_contact_name" />
                        <InfoRow label="טלפון הנה״ח" value={vendorData.accounting_contact_phone} fieldKey="accounting_contact_phone" />
                        <InfoRow label="איש קשר מכירות" value={vendorData.sales_contact_name} fieldKey="sales_contact_name" />
                        <InfoRow label="טלפון מכירות" value={vendorData.sales_contact_phone} fieldKey="sales_contact_phone" />
                      </div>
                    </div>
                  )}

                  {/* Bank Details */}
                  {vendorData.bank_name && (
                    <div className="rounded-lg border p-4">
                      <div className="flex items-center justify-end gap-2 mb-3">
                        <h3 className="font-semibold">פרטי בנק</h3>
                        <CreditCard className="h-5 w-5 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <InfoRow label="שם הבנק" value={vendorData.bank_name} fieldKey="bank_name" />
                        <InfoRow label="סניף" value={vendorData.bank_branch} fieldKey="bank_branch" />
                        <InfoRow label="מספר חשבון" value={vendorData.bank_account_number} fieldKey="bank_account_number" />
                        <InfoRow label="שיטת תשלום" value={vendorData.payment_method ? PAYMENT_METHOD_LABELS[vendorData.payment_method] : null} fieldKey="payment_method" />
                        <InfoRow label="תנאי תשלום" value={vendorData.payment_terms} fieldKey="payment_terms" />
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
