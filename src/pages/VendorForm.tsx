import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
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
import { BankMismatchDialog } from '@/components/vendor/BankMismatchDialog';
import { CheckCircle, AlertCircle, Clock, Mail, Loader2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { VendorRequest, VendorDocument, DOCUMENT_TYPE_LABELS, PAYMENT_METHOD_LABELS } from '@/types/vendor';
import { validateBankBranch, validateBankAccount, getBankByName, BANK_NAMES } from '@/data/israelBanks';
import { getBranchesByBank } from '@/data/bankBranches';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { pdfToImage, isPdfFile } from '@/utils/pdfToImage';

type DocumentType = 'bookkeeping_cert' | 'tax_cert' | 'bank_confirmation' | 'invoice_screenshot';

interface ExtractedBankData {
  bank_number: string | null;
  branch_number: string | null;
  account_number: string | null;
  confidence?: string;
  notes?: string;
  error?: string;
}

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
  const [linkExpired, setLinkExpired] = useState(false);
  
  // OTP verification states
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  
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

  // OCR states
  const [extractedBankData, setExtractedBankData] = useState<ExtractedBankData | null>(null);
  const [showMismatchDialog, setShowMismatchDialog] = useState(false);
  const [isExtractingOcr, setIsExtractingOcr] = useState(false);
  const [pendingBankFile, setPendingBankFile] = useState<File | null>(null);

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
  
  // Map bank code to name for comparison
  const BANK_CODE_MAP: Record<string, string> = {
    '10': 'בנק לאומי',
    '11': 'בנק דיסקונט',
    '12': 'בנק הפועלים',
    '13': 'בנק אגוד',
    '14': 'בנק אוצר החייל',
    '17': 'בנק מרכנתיל',
    '20': 'בנק מזרחי טפחות',
    '31': 'בנק הבינלאומי',
    '46': 'בנק מסד',
    '52': 'בנק פועלי אגודת ישראל',
    '54': 'בנק ירושלים',
  };

  const getBankCodeFromName = (name: string): string | null => {
    const entry = Object.entries(BANK_CODE_MAP).find(([, bankName]) => bankName === name);
    return entry ? entry[0] : null;
  };

  // OCR extraction function - accepts base64 image data directly
  const extractBankDetailsFromBase64 = useCallback(async (base64: string, mimeType: string) => {
    setIsExtractingOcr(true);
    try {
      const { data, error } = await supabase.functions.invoke('extract-bank-details', {
        body: { imageBase64: base64, mimeType },
      });

      if (error) throw error;

      if (data?.error) {
        console.log('OCR error:', data.error);
        toast({
          title: 'לא ניתן לחלץ נתונים',
          description: data.message || 'הקובץ אינו מכיל מסמך בנקאי מזוהה',
          variant: 'destructive',
        });
        return null;
      }

      if (data?.extracted) {
        console.log('Extracted bank data:', data.extracted);
        return data.extracted as ExtractedBankData;
      }

      return null;
    } catch (err) {
      console.error('OCR extraction error:', err);
      toast({
        title: 'שגיאה בחילוץ נתונים',
        description: 'לא ניתן לעבד את הקובץ',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsExtractingOcr(false);
    }
  }, []);


  // Check for mismatches between form data and extracted data
  const checkBankMismatch = useCallback((extracted: ExtractedBankData): boolean => {
    const formBankCode = getBankCodeFromName(formData.bank_name);
    
    // Check bank number
    if (extracted.bank_number && formBankCode && extracted.bank_number !== formBankCode) {
      return true;
    }
    // Check branch
    if (extracted.branch_number && formData.bank_branch && extracted.branch_number !== formData.bank_branch) {
      return true;
    }
    // Check account
    if (extracted.account_number && formData.bank_account_number && extracted.account_number !== formData.bank_account_number) {
      return true;
    }
    return false;
  }, [formData.bank_name, formData.bank_branch, formData.bank_account_number]);

  // Handle bank document file selection with OCR
  const handleBankFileSelect = useCallback(async (file: File) => {
    setPendingBankFile(file);
    
    const isImage = file.type.startsWith('image/');
    const isPdf = isPdfFile(file);
    
    // Only run OCR for image files and PDFs
    if (!isImage && !isPdf) {
      // For DOC files, just accept without OCR
      setFiles(prev => ({ ...prev, bank_confirmation: file }));
      setPendingBankFile(null);
      return;
    }

    let imageData: { base64: string; mimeType: string } | null = null;
    
    if (isPdf) {
      // Convert PDF to image first
      toast({
        title: 'ממיר PDF לתמונה...',
        description: 'אנא המתן',
      });
      imageData = await pdfToImage(file);
      if (!imageData) {
        toast({
          title: 'לא ניתן לעבד את ה-PDF',
          description: 'הקובץ יישמר ללא חילוץ נתונים',
          variant: 'destructive',
        });
        setFiles(prev => ({ ...prev, bank_confirmation: file }));
        setPendingBankFile(null);
        return;
      }
    } else {
      // Convert image file to base64
      const reader = new FileReader();
      imageData = await new Promise<{ base64: string; mimeType: string } | null>((resolve) => {
        reader.onload = () => {
          const result = reader.result as string;
          const base64Data = result.split(',')[1];
          resolve({ base64: base64Data, mimeType: file.type });
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      });
    }

    if (!imageData) {
      setFiles(prev => ({ ...prev, bank_confirmation: file }));
      setPendingBankFile(null);
      return;
    }

    const extracted = await extractBankDetailsFromBase64(imageData.base64, imageData.mimeType);
    
    if (extracted && !extracted.error) {
      setExtractedBankData(extracted);
      
      // Check if form has bank data filled
      const hasFormData = formData.bank_name || formData.bank_branch || formData.bank_account_number;
      
      if (hasFormData && checkBankMismatch(extracted)) {
        // Show mismatch dialog
        setShowMismatchDialog(true);
      } else {
        // No mismatch or no form data yet - accept file
        setFiles(prev => ({ ...prev, bank_confirmation: file }));
        setPendingBankFile(null);
        
        if (!hasFormData) {
          toast({
            title: 'נתוני בנק זוהו',
            description: 'הנתונים ישמרו עם המסמך',
          });
        }
      }
    } else {
      // OCR failed or returned error - still accept the file
      setFiles(prev => ({ ...prev, bank_confirmation: file }));
      setPendingBankFile(null);
    }
  }, [extractBankDetailsFromBase64, checkBankMismatch, formData.bank_name, formData.bank_branch, formData.bank_account_number]);

  // Handle mismatch dialog actions
  const handleCorrectData = () => {
    setShowMismatchDialog(false);
    setPendingBankFile(null);
    setExtractedBankData(null);
    toast({
      title: 'נא לתקן את הנתונים',
      description: 'תקן את פרטי הבנק בטופס ולאחר מכן העלה את הקובץ שוב',
    });
  };

  const handleContinueWithMismatch = () => {
    if (pendingBankFile) {
      setFiles(prev => ({ ...prev, bank_confirmation: pendingBankFile }));
    }
    setShowMismatchDialog(false);
    setPendingBankFile(null);
    toast({
      title: 'הקובץ הועלה',
      description: 'הקובץ נשמר למרות אי-ההתאמה',
    });
  };

  const sendOtp = async () => {
    if (!token) return;
    
    setIsSendingOtp(true);
    setOtpError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('send-vendor-otp', {
        body: { token },
      });
      
      if (error) throw error;
      
      if (data?.error) {
        if (data.error === 'expired') {
          setLinkExpired(true);
        } else {
          setOtpError(data.message || 'שגיאה בשליחת קוד אימות');
        }
        return;
      }
      
      setOtpSent(true);
      setMaskedEmail(data.maskedEmail);
      toast({
        title: 'קוד אימות נשלח',
        description: `קוד אימות נשלח לכתובת ${data.maskedEmail}`,
      });
    } catch (error) {
      console.error('Error sending OTP:', error);
      setOtpError('שגיאה בשליחת קוד אימות');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const verifyOtp = async () => {
    if (!token || otpValue.length !== 6) return;
    
    setIsVerifyingOtp(true);
    setOtpError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('verify-vendor-otp', {
        body: { token, otp: otpValue },
      });
      
      if (error) throw error;
      
      if (data?.error) {
        if (data.error === 'expired') {
          setLinkExpired(true);
        } else if (data.error === 'otp_expired') {
          setOtpError('קוד האימות פג תוקף, יש לבקש קוד חדש');
          setOtpSent(false);
          setOtpValue('');
        } else if (data.error === 'invalid_otp') {
          setOtpError('קוד אימות שגוי');
          setOtpValue('');
        } else {
          setOtpError(data.message || 'שגיאה באימות');
        }
        return;
      }
      
      setOtpVerified(true);
      toast({
        title: 'אימות הצליח',
        description: 'ניתן להמשיך למילוי הטופס',
      });
    } catch (error) {
      console.error('Error verifying OTP:', error);
      setOtpError('שגיאה באימות');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

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
        } else {
          // Check if link has expired
          if (data.expires_at && new Date(data.expires_at) < new Date()) {
            setLinkExpired(true);
            setIsLoading(false);
            return;
          }
          
          // Check if OTP already verified
          if (data.otp_verified) {
            setOtpVerified(true);
          }
          
          if (data.status === 'submitted' || data.status === 'approved') {
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
            // Prepare extracted tags for bank_confirmation document
            const documentInsert: Record<string, unknown> = {
              vendor_request_id: request.id,
              document_type: docType,
              file_name: file.name,
              file_path: filePath,
            };
            
            // Add extracted tags if this is bank_confirmation and we have extracted data
            if (docType === 'bank_confirmation' && extractedBankData && !extractedBankData.error) {
              documentInsert.extracted_tags = {
                bank_number: extractedBankData.bank_number,
                branch_number: extractedBankData.branch_number,
                account_number: extractedBankData.account_number,
              };
            }
            
            // Save document record
            await supabase.from('vendor_documents').insert(documentInsert);
          }
        }
      }

      // Send confirmation email with status link
      const statusLink = `${window.location.origin}/vendor-status/${token}`;
      try {
        await supabase.functions.invoke('send-vendor-confirmation', {
          body: {
            vendorName: request.vendor_name,
            vendorEmail: request.vendor_email,
            statusLink: statusLink,
          },
        });
        console.log('Confirmation email sent successfully');
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
        // Don't fail the submission if email fails
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
    const statusLink = `/vendor-status/${token}`;
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-6">
            <CheckCircle className="h-16 w-16 mx-auto text-success mb-4" />
            <h2 className="text-xl font-bold mb-2">הטופס נשלח בהצלחה!</h2>
            <p className="text-muted-foreground mb-4">
              תודה על מילוי הטופס. הפרטים שלך נקלטו במערכת ויטופלו בהקדם.
            </p>
            <p className="text-muted-foreground mb-4">
              שלחנו לך מייל עם לינק למעקב אחר סטטוס הבקשה.
            </p>
            <a 
              href={statusLink}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
            >
              מעקב סטטוס הבקשה
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (linkExpired) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-6">
            <AlertCircle className="h-16 w-16 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-bold mb-2">הקישור פג תוקף</h2>
            <p className="text-muted-foreground">
              הקישור אינו תקף יותר. אנא פנה לאיש הקשר שלך בחברה לקבלת קישור חדש.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // OTP Verification Screen
  if (!otpVerified) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <img 
                src="/images/bituach-yashir-logo.png" 
                alt="ביטוח ישיר" 
                className="h-12 w-auto mx-auto"
              />
            </div>
            <CardTitle className="text-xl">אימות זהות</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {!otpSent ? (
              <>
                <div className="text-center">
                  <Mail className="h-12 w-12 mx-auto text-primary mb-4" />
                  <p className="text-muted-foreground mb-2">
                    שלום {request?.vendor_name},
                  </p>
                  <p className="text-muted-foreground">
                    על מנת להמשיך למילוי הטופס, יש לאמת את כתובת המייל שלך.
                  </p>
                </div>
                <Button
                  onClick={sendOtp}
                  disabled={isSendingOtp}
                  className="w-full"
                >
                  {isSendingOtp ? 'שולח...' : 'שלח קוד אימות'}
                </Button>
              </>
            ) : (
              <>
                <div className="text-center">
                  <p className="text-muted-foreground mb-2">
                    קוד אימות נשלח לכתובת
                  </p>
                  <p className="font-medium text-foreground ltr">
                    {maskedEmail}
                  </p>
                </div>
                <div className="flex justify-center" dir="ltr">
                  <InputOTP
                    maxLength={6}
                    value={otpValue}
                    onChange={setOtpValue}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                {otpError && (
                  <p className="text-sm text-destructive text-center">{otpError}</p>
                )}
                <Button
                  onClick={verifyOtp}
                  disabled={isVerifyingOtp || otpValue.length !== 6}
                  className="w-full"
                >
                  {isVerifyingOtp ? 'מאמת...' : 'אמת קוד'}
                </Button>
                <Button
                  variant="ghost"
                  onClick={sendOtp}
                  disabled={isSendingOtp}
                  className="w-full"
                >
                  {isSendingOtp ? 'שולח...' : 'שלח קוד חדש'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-[#1a2b5f] border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img 
                src="/images/bituach-yashir-logo.png" 
                alt="ביטוח ישיר" 
                className="h-10 w-auto"
              />
              <div className="border-r border-white/20 pr-4">
                <h1 className="text-xl font-bold text-white">טופס הקמת ספק</h1>
              </div>
            </div>
            {request?.expires_at && (
              <div className="flex items-center gap-2 text-white/80 text-sm">
                <Clock className="h-4 w-4" />
                <div className="text-left">
                  <span>תוקף הקישור: {format(new Date(request.expires_at), 'dd/MM/yyyy', { locale: he })}</span>
                  <p className="text-xs text-white/60">לאחר תאריך זה הקישור לא יהיה זמין</p>
                </div>
              </div>
            )}
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
                  {docType === 'bank_confirmation' ? (
                    <div className="relative">
                      <FileUploadZone
                        label={DOCUMENT_TYPE_LABELS[docType]}
                        documentType={docType}
                        selectedFile={files[docType]}
                        onFileSelect={handleBankFileSelect}
                        onRemove={() => {
                          setFiles({ ...files, [docType]: null });
                          setExtractedBankData(null);
                        }}
                        existingDocument={existingDocuments[docType]}
                      />
                      {isExtractingOcr && (
                        <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
                          <div className="flex items-center gap-2 text-primary">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span className="text-sm">מחלץ נתוני בנק...</span>
                          </div>
                        </div>
                      )}
                      {extractedBankData && !extractedBankData.error && files[docType] && (
                        <p className="text-xs text-success mt-1">✓ נתוני בנק זוהו מהמסמך</p>
                      )}
                    </div>
                  ) : (
                    <FileUploadZone
                      label={DOCUMENT_TYPE_LABELS[docType]}
                      documentType={docType}
                      selectedFile={files[docType]}
                      onFileSelect={(file) => setFiles({ ...files, [docType]: file })}
                      onRemove={() => setFiles({ ...files, [docType]: null })}
                      existingDocument={existingDocuments[docType]}
                    />
                  )}
                  {errors[docType] && <p className="text-sm text-destructive mt-1">{errors[docType]}</p>}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end">
            <Button type="submit" size="lg" disabled={isSubmitting || isExtractingOcr}>
              {isSubmitting ? 'שולח...' : 'שלח טופס'}
            </Button>
          </div>
        </form>

        {/* Bank Mismatch Dialog */}
        <BankMismatchDialog
          open={showMismatchDialog}
          onOpenChange={setShowMismatchDialog}
          extractedData={extractedBankData}
          formData={{
            bank_name: formData.bank_name,
            bank_branch: formData.bank_branch,
            bank_account_number: formData.bank_account_number,
          }}
          onCorrect={handleCorrectData}
          onContinue={handleContinueWithMismatch}
        />
      </main>
    </div>
  );
}