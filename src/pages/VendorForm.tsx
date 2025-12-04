import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileUploadZone } from '@/components/vendor/FileUploadZone';
import { CityAutocomplete } from '@/components/ui/city-autocomplete';
import { StreetAutocomplete } from '@/components/ui/street-autocomplete';
import { BankAutocomplete } from '@/components/ui/bank-autocomplete';
import { BranchAutocomplete } from '@/components/ui/branch-autocomplete';
import { Building2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { VendorRequest, VendorDocument, DOCUMENT_TYPE_LABELS, PAYMENT_METHOD_LABELS } from '@/types/vendor';
import { validateBankBranch, validateBankAccount, getBankByName, BANK_NAMES } from '@/data/israelBanks';
import { getBranchesByBank } from '@/data/bankBranches';

type DocumentType = 'bookkeeping_cert' | 'tax_cert' | 'bank_confirmation' | 'invoice_screenshot';

interface ExistingDocument {
  file_name: string;
  file_path: string;
}

export default function VendorForm() {
  const { token } = useParams<{ token: string }>();
  const [request, setRequest] = useState<VendorRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const [files, setFiles] = useState<Record<DocumentType, File | null>>({
    bookkeeping_cert: null,
    tax_cert: null,
    bank_confirmation: null,
    invoice_screenshot: null,
  });

  const [existingDocuments, setExistingDocuments] = useState<Record<DocumentType, ExistingDocument | null>>({
    bookkeeping_cert: null,
    tax_cert: null,
    bank_confirmation: null,
    invoice_screenshot: null,
  });

  const [formData, setFormData] = useState({
    company_id: '',
    phone: '',
    mobile: '',
    street: '',
    street_number: '',
    city: '',
    postal_code: '',
    po_box: '',
    accounting_contact_name: '',
    accounting_contact_phone: '',
    sales_contact_name: '',
    sales_contact_phone: '',
    bank_name: '',
    bank_branch: '',
    bank_account_number: '',
    payment_method: '' as 'check' | 'invoice' | 'transfer' | '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchRequest = async () => {
      if (!token) return;
      
      if (!isSupabaseConfigured) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('vendor_requests')
          .select('*')
          .eq('secure_token', token)
          .maybeSingle();

        if (error) throw error;
        
        if (!data) {
          setNotFound(true);
        } else if (data.status === 'submitted' || data.status === 'approved') {
          // Only show success for submitted/approved - resent status allows editing
          setSubmitted(true);
          setRequest(data as VendorRequest);
        } else {
          setRequest(data as VendorRequest);
          // Pre-fill form with existing data
          setFormData({
            company_id: data.company_id || '',
            phone: data.phone || '',
            mobile: data.mobile || '',
            street: data.street || '',
            street_number: data.street_number || '',
            city: data.city || '',
            postal_code: data.postal_code || '',
            po_box: data.po_box || '',
            accounting_contact_name: data.accounting_contact_name || '',
            accounting_contact_phone: data.accounting_contact_phone || '',
            sales_contact_name: data.sales_contact_name || '',
            sales_contact_phone: data.sales_contact_phone || '',
            bank_name: data.bank_name || '',
            bank_branch: data.bank_branch || '',
            bank_account_number: data.bank_account_number || '',
            payment_method: data.payment_method || '',
          });

          // Fetch existing documents
          const { data: docs, error: docsError } = await supabase
            .from('vendor_documents')
            .select('*')
            .eq('vendor_request_id', data.id);

          if (!docsError && docs) {
            const existingDocs: Record<DocumentType, ExistingDocument | null> = {
              bookkeeping_cert: null,
              tax_cert: null,
              bank_confirmation: null,
              invoice_screenshot: null,
            };
            docs.forEach((doc: VendorDocument) => {
              existingDocs[doc.document_type as DocumentType] = {
                file_name: doc.file_name,
                file_path: doc.file_path,
              };
            });
            setExistingDocuments(existingDocs);
          }
        }
      } catch (error) {
        console.error('Error fetching request:', error);
        setNotFound(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRequest();
  }, [token]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.company_id.trim()) {
      newErrors.company_id = 'ח.פ / עוסק מורשה הוא שדה חובה';
    } else {
      const companyIdDigits = formData.company_id.replace(/\D/g, '');
      if (!/^\d{9}$/.test(companyIdDigits)) {
        newErrors.company_id = 'ח.פ / עוסק מורשה חייב להכיל 9 ספרות';
      }
    }

    if (!formData.mobile.trim()) {
      newErrors.mobile = 'טלפון נייד הוא שדה חובה';
    } else {
      const mobileDigits = formData.mobile.replace(/\D/g, '');
      if (!/^05\d{8}$/.test(mobileDigits)) {
        newErrors.mobile = 'מספר נייד לא תקין (10 ספרות, מתחיל ב-05)';
      }
    }

    // Address validation: either street or po_box, city is always required
    const hasStreet = formData.street.trim();
    const hasPOBox = formData.po_box.trim();
    
    if (!hasStreet && !hasPOBox) {
      newErrors.address = 'יש למלא רחוב או ת.ד';
    }
    
    if (!formData.city.trim()) {
      newErrors.city = 'עיר היא שדה חובה';
    }

    if (!formData.bank_name.trim()) {
      newErrors.bank_name = 'שם הבנק הוא שדה חובה';
    } else if (!BANK_NAMES.includes(formData.bank_name)) {
      newErrors.bank_name = 'יש לבחור בנק מהרשימה';
    }

    if (!formData.bank_branch.trim()) {
      newErrors.bank_branch = 'מספר סניף הוא שדה חובה';
    } else if (!validateBankBranch(formData.bank_branch)) {
      newErrors.bank_branch = 'מספר סניף חייב להכיל 3-4 ספרות';
    } else if (formData.bank_name) {
      const branches = getBranchesByBank(formData.bank_name);
      const branchExists = branches.some(b => b.code === formData.bank_branch);
      if (branches.length > 0 && !branchExists) {
        newErrors.bank_branch = `סניף ${formData.bank_branch} לא נמצא ברשימת הסניפים של ${formData.bank_name}`;
      }
    }

    const accountValidation = validateBankAccount(formData.bank_account_number, formData.bank_name);
    if (!accountValidation.valid) {
      newErrors.bank_account_number = accountValidation.message || 'מספר חשבון לא תקין';
    }

    if (!formData.payment_method) {
      newErrors.payment_method = 'יש לבחור שיטת תשלום';
    }

    // Check required files - allow existing documents or new uploads
    const requiredDocs: DocumentType[] = ['bookkeeping_cert', 'tax_cert', 'bank_confirmation', 'invoice_screenshot'];
    requiredDocs.forEach(doc => {
      if (!files[doc] && !existingDocuments[doc]) {
        newErrors[doc] = `יש להעלות ${DOCUMENT_TYPE_LABELS[doc]}`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !request) return;

    setIsSubmitting(true);
    try {
      // Update vendor request
      const { error: updateError } = await supabase
        .from('vendor_requests')
        .update({
          ...formData,
          status: 'submitted',
          updated_at: new Date().toISOString(),
        })
        .eq('id', request.id);

      if (updateError) throw updateError;

      // Upload files - only process new files
      for (const [docType, file] of Object.entries(files)) {
        if (file) {
          const existingDoc = existingDocuments[docType as DocumentType];
          
          // Delete existing file and record if replacing
          if (existingDoc) {
            await supabase.storage
              .from('vendor_documents')
              .remove([existingDoc.file_path]);
            
            await supabase
              .from('vendor_documents')
              .delete()
              .eq('vendor_request_id', request.id)
              .eq('document_type', docType);
          }
          
          const filePath = `${request.id}/${docType}/${file.name}`;
          
          const { error: uploadError } = await supabase.storage
            .from('vendor_documents')
            .upload(filePath, file);

          if (uploadError) {
            console.error('Upload error:', uploadError);
          } else {
            // Save document record
            await supabase.from('vendor_documents').insert({
              vendor_request_id: request.id,
              document_type: docType,
              file_name: file.name,
              file_path: filePath,
            });
          }
        }
      }

      setSubmitted(true);
      toast({
        title: 'הטופס נשלח בהצלחה',
        description: 'פרטי הספק נקלטו במערכת',
      });
    } catch (error) {
      console.error('Submit error:', error);
      toast({
        title: 'שגיאה',
        description: 'אירעה שגיאה בשליחת הטופס',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-6">
            <AlertCircle className="h-16 w-16 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-bold mb-2">הקישור לא נמצא</h2>
            <p className="text-muted-foreground">
              הקישור אינו תקף או שפג תוקפו. אנא פנה לאיש הקשר שלך בחברה.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-6">
            <CheckCircle className="h-16 w-16 mx-auto text-success mb-4" />
            <h2 className="text-xl font-bold mb-2">הטופס נשלח בהצלחה!</h2>
            <p className="text-muted-foreground">
              תודה על מילוי הטופס. הפרטים שלך נקלטו במערכת ויטופלו בהקדם.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="bg-primary rounded-lg p-2">
              <Building2 className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">טופס הקמת ספק</h1>
              <p className="text-sm text-muted-foreground">{request?.vendor_name}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Form */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>פרטי הספק</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>שם הספק</Label>
                <Input value={request?.vendor_name || ''} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>אימייל</Label>
                <Input value={request?.vendor_email || ''} disabled className="bg-muted ltr text-right" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company_id">ח.פ / עוסק מורשה *</Label>
                <Input
                  id="company_id"
                  value={formData.company_id}
                  onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                  placeholder="הכנס מספר ח.פ או עוסק מורשה"
                />
                {errors.company_id && <p className="text-sm text-destructive">{errors.company_id}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">טלפון</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="טלפון"
                  className="ltr text-right"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mobile">נייד *</Label>
                <Input
                  id="mobile"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  placeholder="טלפון נייד"
                  className="ltr text-right"
                />
                {errors.mobile && <p className="text-sm text-destructive">{errors.mobile}</p>}
              </div>
            </CardContent>
          </Card>

          {/* Address */}
          <Card>
            <CardHeader>
              <CardTitle>כתובת</CardTitle>
              <p className="text-sm text-muted-foreground">יש למלא רחוב או ת.ד, עיר היא שדה חובה</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {errors.address && <p className="text-sm text-destructive">{errors.address}</p>}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="city">עיר *</Label>
                  <CityAutocomplete
                    id="city"
                    value={formData.city}
                    onChange={(value) => setFormData({ ...formData, city: value })}
                    placeholder="הקלד שם עיר"
                  />
                  {errors.city && <p className="text-sm text-destructive">{errors.city}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="street">רחוב</Label>
                  <StreetAutocomplete
                    id="street"
                    value={formData.street}
                    onChange={(value) => setFormData({ ...formData, street: value })}
                    city={formData.city}
                    placeholder="שם הרחוב"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="street_number">מספר</Label>
                  <Input
                    id="street_number"
                    value={formData.street_number}
                    onChange={(e) => setFormData({ ...formData, street_number: e.target.value })}
                    placeholder="מספר בית"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postal_code">מיקוד</Label>
                  <Input
                    id="postal_code"
                    value={formData.postal_code}
                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                    placeholder="מיקוד"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="po_box">ת.ד</Label>
                  <Input
                    id="po_box"
                    value={formData.po_box}
                    onChange={(e) => setFormData({ ...formData, po_box: e.target.value })}
                    placeholder="תא דואר"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contacts */}
          <Card>
            <CardHeader>
              <CardTitle>אנשי קשר</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-medium mb-3">איש קשר הנהלת חשבונות</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="accounting_contact_name">שם</Label>
                    <Input
                      id="accounting_contact_name"
                      value={formData.accounting_contact_name}
                      onChange={(e) => setFormData({ ...formData, accounting_contact_name: e.target.value })}
                      placeholder="שם איש קשר"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accounting_contact_phone">טלפון</Label>
                    <Input
                      id="accounting_contact_phone"
                      value={formData.accounting_contact_phone}
                      onChange={(e) => setFormData({ ...formData, accounting_contact_phone: e.target.value })}
                      placeholder="טלפון"
                      className="ltr text-right"
                    />
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-3">איש קשר מכירות / רכש</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="sales_contact_name">שם</Label>
                    <Input
                      id="sales_contact_name"
                      value={formData.sales_contact_name}
                      onChange={(e) => setFormData({ ...formData, sales_contact_name: e.target.value })}
                      placeholder="שם איש קשר"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sales_contact_phone">טלפון</Label>
                    <Input
                      id="sales_contact_phone"
                      value={formData.sales_contact_phone}
                      onChange={(e) => setFormData({ ...formData, sales_contact_phone: e.target.value })}
                      placeholder="טלפון"
                      className="ltr text-right"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bank Details */}
          <Card>
            <CardHeader>
              <CardTitle>פרטי בנק</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="bank_name">שם הבנק *</Label>
                <BankAutocomplete
                  id="bank_name"
                  value={formData.bank_name}
                  onChange={(value) => setFormData({ ...formData, bank_name: value, bank_branch: '', bank_account_number: '' })}
                  placeholder="בחר בנק"
                />
                {errors.bank_name && <p className="text-sm text-destructive">{errors.bank_name}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank_branch">סניף *</Label>
                <BranchAutocomplete
                  id="bank_branch"
                  value={formData.bank_branch}
                  onChange={(value) => {
                    setFormData({ ...formData, bank_branch: value });
                    // Real-time validation
                    if (value && formData.bank_name) {
                      const branches = getBranchesByBank(formData.bank_name);
                      const branchExists = branches.some(b => b.code === value);
                      if (branches.length > 0 && !branchExists) {
                        setErrors(prev => ({ ...prev, bank_branch: `סניף ${value} לא נמצא ברשימת הסניפים` }));
                      } else {
                        setErrors(prev => {
                          const { bank_branch, ...rest } = prev;
                          return rest;
                        });
                      }
                    }
                  }}
                  bankName={formData.bank_name}
                  placeholder="בחר או הקלד מספר סניף"
                />
                {formData.bank_name && (
                  <p className="text-xs text-muted-foreground">
                    {getBranchesByBank(formData.bank_name).length} סניפים זמינים עבור {formData.bank_name}
                  </p>
                )}
                {errors.bank_branch && <p className="text-sm text-destructive">{errors.bank_branch}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank_account_number">מספר חשבון *</Label>
                <Input
                  id="bank_account_number"
                  value={formData.bank_account_number}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, ''); // Only allow digits
                    setFormData({ ...formData, bank_account_number: value });
                    // Real-time validation
                    if (value && formData.bank_name) {
                      const validation = validateBankAccount(value, formData.bank_name);
                      if (!validation.valid) {
                        setErrors(prev => ({ ...prev, bank_account_number: validation.message || '' }));
                      } else {
                        setErrors(prev => {
                          const { bank_account_number, ...rest } = prev;
                          return rest;
                        });
                      }
                    }
                  }}
                  placeholder={formData.bank_name ? `${getBankByName(formData.bank_name)?.accountDigits || '6-9'} ספרות` : 'מספר חשבון'}
                  className="ltr text-right"
                  maxLength={9}
                />
                {formData.bank_name && getBankByName(formData.bank_name) && (
                  <p className="text-xs text-muted-foreground">
                    {getBankByName(formData.bank_name)?.accountDigits} ספרות נדרשות עבור {formData.bank_name}
                  </p>
                )}
                {errors.bank_account_number && <p className="text-sm text-destructive">{errors.bank_account_number}</p>}
              </div>
            </CardContent>
          </Card>

          {/* Payment */}
          <Card>
            <CardHeader>
              <CardTitle>תנאי תשלום</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="payment_method">שיטת תשלום *</Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(value: 'check' | 'invoice' | 'transfer') => 
                    setFormData({ ...formData, payment_method: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר שיטת תשלום" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.payment_method && <p className="text-sm text-destructive">{errors.payment_method}</p>}
              </div>
              <div className="space-y-2">
                <Label>תנאי תשלום</Label>
                <Input value="שוטף + 60" disabled className="bg-muted" />
              </div>
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader>
              <CardTitle>מסמכים נדרשים</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {(Object.keys(DOCUMENT_TYPE_LABELS) as DocumentType[]).map((docType) => (
                <div key={docType}>
                  <FileUploadZone
                    label={DOCUMENT_TYPE_LABELS[docType]}
                    documentType={docType}
                    selectedFile={files[docType]}
                    onFileSelect={(file) => setFiles({ ...files, [docType]: file })}
                    onRemove={() => setFiles({ ...files, [docType]: null })}
                    existingDocument={existingDocuments[docType]}
                  />
                  {errors[docType] && <p className="text-sm text-destructive mt-1">{errors[docType]}</p>}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end">
            <Button type="submit" size="lg" disabled={isSubmitting}>
              {isSubmitting ? 'שולח...' : 'שלח טופס'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}