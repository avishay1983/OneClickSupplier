import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileUploadZone } from '@/components/vendor/FileUploadZone';
import { CityAutocomplete } from '@/components/ui/city-autocomplete';
import { StreetAutocomplete } from '@/components/ui/street-autocomplete';
import { BankAutocomplete } from '@/components/ui/bank-autocomplete';
import { BranchAutocomplete } from '@/components/ui/branch-autocomplete';
import { BankMismatchDialog, getBankNameFromCode } from '@/components/vendor/BankMismatchDialog';
import { CheckCircle, AlertCircle, Clock, Mail, Loader2, Upload, FileText, ArrowLeft, ArrowRight } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { VendorRequest, VendorDocument, DOCUMENT_TYPE_LABELS, PAYMENT_METHOD_LABELS } from '@/types/vendor';
import { validateBankBranch, validateBankAccount, getBankByName, BANK_NAMES, ISRAEL_BANKS } from '@/data/israelBanks';
import { getBranchesByBank } from '@/data/bankBranches';
import { ISRAEL_CITIES } from '@/data/israelCities';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { pdfToImage, isPdfFile } from '@/utils/pdfToImage';
import mammoth from 'mammoth';

interface OcrValidationWarning {
  field: string;
  fieldLabel: string;
  extractedValue: string;
  message: string;
}

type DocumentType = 'bookkeeping_cert' | 'tax_cert' | 'bank_confirmation' | 'invoice_screenshot';

interface ExtractedBankData {
  bank_number: string | null;
  branch_number: string | null;
  account_number: string | null;
  confidence?: string;
  notes?: string;
  error?: string;
}

interface ExtractedDocumentData {
  company_id?: string | null;
  company_name?: string | null;
  phone?: string | null;
  mobile?: string | null;
  fax?: string | null;
  email?: string | null;
  city?: string | null;
  street?: string | null;
  street_number?: string | null;
  postal_code?: string | null;
  bank_number?: string | null;
  branch_number?: string | null;
  account_number?: string | null;
  confidence?: string;
  notes?: string;
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
  
  // Step state: 1 = upload documents, 2 = fill form
  const [currentStep, setCurrentStep] = useState(1);
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  
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

  // Contract file state
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [isUploadingContract, setIsUploadingContract] = useState(false);

  // OCR states
  const [extractedBankData, setExtractedBankData] = useState<ExtractedBankData | null>(null);
  const [showMismatchDialog, setShowMismatchDialog] = useState(false);
  const [isExtractingOcr, setIsExtractingOcr] = useState(false);
  const [pendingBankFile, setPendingBankFile] = useState<File | null>(null);
  const [ocrValidationWarnings, setOcrValidationWarnings] = useState<OcrValidationWarning[]>([]);

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
    try {
      const { data, error } = await supabase.functions.invoke('extract-bank-details', {
        body: { imageBase64: base64, mimeType },
      });

      if (error) throw error;

      if (data?.error) {
        console.log('OCR error:', data.error);
        return null;
      }

      if (data?.extracted) {
        console.log('Extracted bank data:', data.extracted);
        return data.extracted as ExtractedBankData;
      }

      return null;
    } catch (err) {
      console.error('OCR extraction error:', err);
      return null;
    }
  }, []);

  // OCR extraction function for all document data
  const extractDocumentDataFromBase64 = useCallback(async (base64: string, mimeType: string, documentType: string): Promise<ExtractedDocumentData | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('extract-document-data', {
        body: { imageBase64: base64, mimeType, documentType },
      });

      if (error) throw error;

      if (data?.error) {
        console.log('OCR error:', data.error);
        return null;
      }

      if (data?.extracted) {
        console.log(`Extracted data from ${documentType}:`, data.extracted);
        return data.extracted as ExtractedDocumentData;
      }

      return null;
    } catch (err) {
      console.error('OCR extraction error:', err);
      return null;
    }
  }, []);

  // Check if file is DOC or DOCX
  const isWordFile = (file: File): boolean => {
    return file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
           file.type === 'application/msword' ||
           file.name.toLowerCase().endsWith('.docx') ||
           file.name.toLowerCase().endsWith('.doc');
  };

  // Extract text from DOCX file
  const extractTextFromDocx = async (file: File): Promise<string | null> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    } catch (error) {
      console.error('Error extracting text from DOCX:', error);
      return null;
    }
  };

  // Extract document data from text content
  const extractDocumentDataFromText = useCallback(async (textContent: string, documentType: string): Promise<ExtractedDocumentData | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('extract-document-text', {
        body: { textContent, documentType },
      });

      if (error) throw error;

      if (data?.error) {
        console.log('Text extraction error:', data.error);
        return null;
      }

      if (data?.extracted) {
        console.log(`Extracted data from text (${documentType}):`, data.extracted);
        return data.extracted as ExtractedDocumentData;
      }

      return null;
    } catch (err) {
      console.error('Text extraction error:', err);
      return null;
    }
  }, []);

  // Validate OCR extracted data against available options
  const validateOcrData = useCallback(async (data: Partial<typeof formData>): Promise<OcrValidationWarning[]> => {
    const warnings: OcrValidationWarning[] = [];
    
    // Validate city
    if (data.city) {
      const cityExists = ISRAEL_CITIES.some(
        city => city === data.city || city.includes(data.city!) || data.city!.includes(city)
      );
      if (!cityExists) {
        warnings.push({
          field: 'city',
          fieldLabel: 'עיר',
          extractedValue: data.city,
          message: `העיר "${data.city}" לא נמצאה ברשימת הערים. יש לבחור עיר מהרשימה.`
        });
      }
    }
    
    // Validate street exists in the city
    if (data.street && data.city) {
      const cityExists = ISRAEL_CITIES.includes(data.city);
      if (cityExists) {
        try {
          const { data: streetData } = await supabase.functions.invoke('search-streets', {
            body: { city: data.city, query: data.street },
          });
          
          if (streetData?.streets && Array.isArray(streetData.streets)) {
            const streetExists = streetData.streets.some(
              (s: string) => s === data.street || s.includes(data.street!) || data.street!.includes(s)
            );
            if (!streetExists && streetData.streets.length === 0) {
              warnings.push({
                field: 'street',
                fieldLabel: 'רחוב',
                extractedValue: data.street,
                message: `הרחוב "${data.street}" לא נמצא בעיר ${data.city}. יש לבחור רחוב מהרשימה.`
              });
            }
          }
        } catch (error) {
          console.error('Street validation error:', error);
        }
      }
    }
    
    // Validate bank name
    if (data.bank_name) {
      const bankExists = BANK_NAMES.some(
        name => name === data.bank_name || name.includes(data.bank_name!) || data.bank_name!.includes(name)
      );
      if (!bankExists) {
        warnings.push({
          field: 'bank_name',
          fieldLabel: 'בנק',
          extractedValue: data.bank_name,
          message: `הבנק "${data.bank_name}" לא נמצא ברשימת הבנקים. יש לבחור בנק מהרשימה.`
        });
      }
    }
    
    // Validate bank branch format
    if (data.bank_branch) {
      if (!validateBankBranch(data.bank_branch)) {
        warnings.push({
          field: 'bank_branch',
          fieldLabel: 'סניף',
          extractedValue: data.bank_branch,
          message: `מספר הסניף "${data.bank_branch}" אינו תקין. מספר סניף חייב להכיל 3-4 ספרות.`
        });
      }
    }
    
    // Validate bank account if bank is selected
    if (data.bank_account_number && data.bank_name) {
      const accountValidation = validateBankAccount(data.bank_account_number, data.bank_name);
      if (!accountValidation.valid) {
        warnings.push({
          field: 'bank_account_number',
          fieldLabel: 'מספר חשבון',
          extractedValue: data.bank_account_number,
          message: accountValidation.message || 'מספר החשבון אינו תקין'
        });
      }
    }
    
    // Validate mobile phone format
    if (data.mobile) {
      const mobileRegex = /^05\d{8}$/;
      if (!mobileRegex.test(data.mobile.replace(/[-\s]/g, ''))) {
        warnings.push({
          field: 'mobile',
          fieldLabel: 'טלפון נייד',
          extractedValue: data.mobile,
          message: `מספר הנייד "${data.mobile}" אינו תקין. מספר נייד חייב להתחיל ב-05 ולהכיל 10 ספרות.`
        });
      }
    }
    
    // Validate company ID (9 digits)
    if (data.company_id) {
      const companyIdClean = data.company_id.replace(/\D/g, '');
      if (companyIdClean.length !== 9) {
        warnings.push({
          field: 'company_id',
          fieldLabel: 'ח.פ / עוסק מורשה',
          extractedValue: data.company_id,
          message: `מספר ח.פ/עוסק מורשה "${data.company_id}" אינו תקין. חייב להכיל 9 ספרות.`
        });
      }
    }
    
    return warnings;
  }, []);

  // Helper to check if a field has a validation warning
  const hasFieldWarning = useCallback((fieldName: string): boolean => {
    return ocrValidationWarnings.some(w => w.field === fieldName);
  }, [ocrValidationWarnings]);

  // Helper to get field warning message
  const getFieldWarning = useCallback((fieldName: string): string | null => {
    const warning = ocrValidationWarnings.find(w => w.field === fieldName);
    return warning?.message || null;
  }, [ocrValidationWarnings]);

  // Clear warning for a specific field when user edits it
  const clearFieldWarning = useCallback((fieldName: string) => {
    setOcrValidationWarnings(prev => prev.filter(w => w.field !== fieldName));
  }, []);

  // Process OCR on any document file
  const processOcrOnDocument = async (file: File, documentType: string): Promise<ExtractedDocumentData | null> => {
    const isImage = file.type.startsWith('image/');
    const isPdf = isPdfFile(file);
    const isWord = isWordFile(file);
    
    // Handle DOCX files by extracting text and sending to AI
    if (isWord) {
      const textContent = await extractTextFromDocx(file);
      if (!textContent) {
        console.log('Could not extract text from DOCX');
        return null;
      }
      return await extractDocumentDataFromText(textContent, documentType);
    }
    
    if (!isImage && !isPdf) {
      return null;
    }

    let imageData: { base64: string; mimeType: string } | null = null;
    
    if (isPdf) {
      imageData = await pdfToImage(file);
      if (!imageData) return null;
    } else {
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

    if (!imageData) return null;

    return await extractDocumentDataFromBase64(imageData.base64, imageData.mimeType, documentType);
  };

  // Process OCR on bank confirmation file (legacy function for step 2)
  const processOcrOnBankFile = async (file: File): Promise<ExtractedBankData | null> => {
    const isImage = file.type.startsWith('image/');
    const isPdf = isPdfFile(file);
    
    if (!isImage && !isPdf) {
      return null;
    }

    let imageData: { base64: string; mimeType: string } | null = null;
    
    if (isPdf) {
      imageData = await pdfToImage(file);
      if (!imageData) return null;
    } else {
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

    if (!imageData) return null;

    return await extractBankDetailsFromBase64(imageData.base64, imageData.mimeType);
  };

  // Check for mismatches between form data and extracted data
  const checkBankMismatch = useCallback((extracted: ExtractedBankData): boolean => {
    const formBankCode = getBankCodeFromName(formData.bank_name);
    
    if (extracted.bank_number && formBankCode && extracted.bank_number !== formBankCode) {
      return true;
    }
    if (extracted.branch_number && formData.bank_branch && extracted.branch_number !== formData.bank_branch) {
      return true;
    }
    if (extracted.account_number && formData.bank_account_number && extracted.account_number !== formData.bank_account_number) {
      return true;
    }
    return false;
  }, [formData.bank_name, formData.bank_branch, formData.bank_account_number]);

  // Handle bank document file selection with OCR (for step 2)
  const handleBankFileSelect = useCallback(async (file: File) => {
    setPendingBankFile(file);
    
    const isImage = file.type.startsWith('image/');
    const isPdf = isPdfFile(file);
    
    if (!isImage && !isPdf) {
      setFiles(prev => ({ ...prev, bank_confirmation: file }));
      setPendingBankFile(null);
      return;
    }

    setIsExtractingOcr(true);
    
    let imageData: { base64: string; mimeType: string } | null = null;
    
    if (isPdf) {
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
        setIsExtractingOcr(false);
        return;
      }
    } else {
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
      setIsExtractingOcr(false);
      return;
    }

    const extracted = await extractBankDetailsFromBase64(imageData.base64, imageData.mimeType);
    setIsExtractingOcr(false);
    
    const hasFormData = formData.bank_name || formData.bank_branch || formData.bank_account_number;
    
    if (extracted && !extracted.error) {
      setExtractedBankData(extracted);
      
      const noDataExtracted = !extracted.bank_number && !extracted.branch_number && !extracted.account_number;
      
      if (noDataExtracted && hasFormData) {
        setShowMismatchDialog(true);
      } else if (hasFormData && checkBankMismatch(extracted)) {
        setShowMismatchDialog(true);
      } else {
        setFiles(prev => ({ ...prev, bank_confirmation: file }));
        setPendingBankFile(null);
        
        if (!hasFormData && !noDataExtracted) {
          toast({
            title: 'נתוני בנק זוהו',
            description: 'הנתונים ישמרו עם המסמך',
          });
        } else if (noDataExtracted) {
          toast({
            title: 'לא זוהו נתוני בנק',
            description: 'הקובץ הועלה אך לא ניתן היה לחלץ פרטי חשבון',
            variant: 'destructive',
          });
        }
      }
    } else {
      if (hasFormData) {
        setExtractedBankData({ bank_number: null, branch_number: null, account_number: null });
        setShowMismatchDialog(true);
      } else {
        setFiles(prev => ({ ...prev, bank_confirmation: file }));
        setPendingBankFile(null);
      }
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

  // Auto-fill form with extracted bank data
  const handleAutoFillFromDocument = () => {
    if (extractedBankData) {
      const updates: Partial<typeof formData> = {};
      
      if (extractedBankData.bank_number) {
        const bankName = getBankNameFromCode(extractedBankData.bank_number);
        if (bankName) {
          updates.bank_name = bankName;
        }
      }
      
      if (extractedBankData.branch_number) {
        updates.bank_branch = extractedBankData.branch_number;
      }
      
      if (extractedBankData.account_number) {
        updates.bank_account_number = extractedBankData.account_number;
      }
      
      setFormData(prev => ({ ...prev, ...updates }));
      
      if (pendingBankFile) {
        setFiles(prev => ({ ...prev, bank_confirmation: pendingBankFile }));
      }
      
      setShowMismatchDialog(false);
      setPendingBankFile(null);
      
      toast({
        title: 'הנתונים עודכנו',
        description: 'פרטי הבנק עודכנו בהתאם למסמך שהועלה',
      });
    }
  };

  // Handle proceeding from step 1 to step 2 with OCR on all documents
  const handleProceedToForm = async () => {
    // Validate all documents are uploaded
    const requiredDocs: DocumentType[] = ['bookkeeping_cert', 'tax_cert', 'bank_confirmation', 'invoice_screenshot'];
    const missingDocs = requiredDocs.filter(doc => !files[doc] && !existingDocuments[doc]);
    
    if (missingDocs.length > 0) {
      toast({
        title: 'מסמכים חסרים',
        description: `יש להעלות את כל המסמכים הנדרשים לפני מעבר לשלב הבא`,
        variant: 'destructive',
      });
      return;
    }

    setIsProcessingOcr(true);
    
    try {
      toast({
        title: 'מעבד מסמכים...',
        description: 'מחלץ נתונים מכל המסמכים שהועלו',
      });

      // Process OCR on all new files
      const ocrPromises: Promise<{ docType: DocumentType; data: ExtractedDocumentData | null }>[] = [];
      
      for (const docType of requiredDocs) {
        const file = files[docType];
        if (file) {
          ocrPromises.push(
            processOcrOnDocument(file, docType).then(data => ({ docType, data }))
          );
        }
      }

      const ocrResults = await Promise.all(ocrPromises);
      
      console.log('OCR Results:', ocrResults);
      
      // Merge all extracted data - later documents override earlier ones for same fields
      const mergedData: Partial<typeof formData> = {};
      let extractedFieldsCount = 0;
      
      for (const { docType, data } of ocrResults) {
        console.log(`Processing OCR result for ${docType}:`, data);
        if (!data) continue;
        
        // Company ID
        if (data.company_id && !mergedData.company_id) {
          mergedData.company_id = data.company_id;
          extractedFieldsCount++;
        }
        
        // Phone numbers
        if (data.phone && !mergedData.phone) {
          mergedData.phone = data.phone;
          extractedFieldsCount++;
        }
        if (data.mobile && !mergedData.mobile) {
          mergedData.mobile = data.mobile;
          extractedFieldsCount++;
        }
        
        // Address
        if (data.city && !mergedData.city) {
          mergedData.city = data.city;
          extractedFieldsCount++;
        }
        if (data.street && !mergedData.street) {
          mergedData.street = data.street;
          extractedFieldsCount++;
        }
        if (data.street_number && !mergedData.street_number) {
          mergedData.street_number = data.street_number;
          extractedFieldsCount++;
        }
        if (data.postal_code && !mergedData.postal_code) {
          mergedData.postal_code = data.postal_code;
          extractedFieldsCount++;
        }
        
        // Bank details (prefer from bank_confirmation document)
        if (docType === 'bank_confirmation' || !mergedData.bank_name) {
          if (data.bank_number) {
            const bankName = getBankNameFromCode(data.bank_number);
            if (bankName) {
              mergedData.bank_name = bankName;
              extractedFieldsCount++;
            }
          }
        }
        if (docType === 'bank_confirmation' || !mergedData.bank_branch) {
          if (data.branch_number) {
            mergedData.bank_branch = data.branch_number;
            extractedFieldsCount++;
          }
        }
        if (docType === 'bank_confirmation' || !mergedData.bank_account_number) {
          if (data.account_number) {
            mergedData.bank_account_number = data.account_number;
            extractedFieldsCount++;
          }
        }
        
        // Store bank data for extracted tags
        if (docType === 'bank_confirmation' && (data.bank_number || data.branch_number || data.account_number)) {
          setExtractedBankData({
            bank_number: data.bank_number || null,
            branch_number: data.branch_number || null,
            account_number: data.account_number || null,
            confidence: data.confidence,
          });
        }
      }
      
      console.log('Merged OCR data:', mergedData);
      console.log('Extracted fields count:', extractedFieldsCount);
      
      // Apply merged data to form - OCR data from NEW files overrides existing values
      const finalUpdates: Partial<typeof formData> = {};
      
      // For newly uploaded documents, allow OCR data to override existing form values
      if (mergedData.company_id) finalUpdates.company_id = mergedData.company_id;
      if (mergedData.phone) finalUpdates.phone = mergedData.phone;
      if (mergedData.mobile) finalUpdates.mobile = mergedData.mobile;
      if (mergedData.city) finalUpdates.city = mergedData.city;
      if (mergedData.street) finalUpdates.street = mergedData.street;
      if (mergedData.street_number) finalUpdates.street_number = mergedData.street_number;
      if (mergedData.postal_code) finalUpdates.postal_code = mergedData.postal_code;
      if (mergedData.bank_name) finalUpdates.bank_name = mergedData.bank_name;
      if (mergedData.bank_branch) finalUpdates.bank_branch = mergedData.bank_branch;
      if (mergedData.bank_account_number) finalUpdates.bank_account_number = mergedData.bank_account_number;
      
      console.log('Final updates to apply:', finalUpdates);
      console.log('Current formData before update:', formData);
      
      // Validate OCR data before applying
      const warnings = await validateOcrData(finalUpdates);
      setOcrValidationWarnings(warnings);
      
      // Also set errors state for immediate visual feedback (red border)
      if (warnings.length > 0) {
        const newErrors: Record<string, string> = {};
        warnings.forEach(warning => {
          newErrors[warning.field] = warning.message;
        });
        setErrors(prev => ({ ...prev, ...newErrors }));
        
        console.log('OCR validation warnings:', warnings);
        // Show warnings in toast
        toast({
          title: 'שים לב - נתונים לא תקינים',
          description: `נמצאו ${warnings.length} בעיות בנתונים שחולצו. יש לתקן לפני השליחה.`,
          variant: 'destructive',
        });
      }
      
      const appliedFieldsCount = Object.keys(finalUpdates).length;
      
      if (appliedFieldsCount > 0) {
        setFormData(prev => {
          const newData = { ...prev, ...finalUpdates };
          console.log('New formData after update:', newData);
          return newData;
        });
        
        if (warnings.length === 0) {
          toast({
            title: 'נתונים זוהו והוזנו',
            description: `${appliedFieldsCount} שדות מולאו אוטומטית מהמסמכים שהועלו`,
          });
        }
      } else if (extractedFieldsCount > 0) {
        toast({
          title: 'נתונים זוהו',
          description: 'הנתונים שזוהו כבר קיימים בטופס',
        });
      } else {
        toast({
          title: 'לא זוהו נתונים',
          description: 'לא ניתן היה לחלץ נתונים מהמסמכים - יש למלא ידנית',
          variant: 'destructive',
        });
      }
      
      setCurrentStep(2);
    } catch (error) {
      console.error('OCR processing error:', error);
      toast({
        title: 'שגיאה בעיבוד המסמכים',
        description: 'ניתן להמשיך למילוי הטופס ידנית',
        variant: 'destructive',
      });
      setCurrentStep(2);
    } finally {
      setIsProcessingOcr(false);
    }
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
        // Use vendor-form-api edge function (uses service role, bypasses RLS)
        const { data: response, error } = await supabase.functions.invoke('vendor-form-api', {
          body: { action: 'get', token },
        });

        if (error) throw error;
        
        if (response?.error === 'not_found') {
          setNotFound(true);
          setIsLoading(false);
          return;
        }
        
        if (response?.error === 'expired') {
          setLinkExpired(true);
          setIsLoading(false);
          return;
        }
        
        if (!response?.request) {
          setNotFound(true);
          setIsLoading(false);
          return;
        }
        
        const data = response.request;
        const docs = response.documents || [];
        
        // OTP is verified only if previously verified AND status is not 'resent'
        // When status is 'resent', vendor must re-verify via OTP
        if (data.otp_verified && data.status !== 'resent') {
          setOtpVerified(true);
        }
        
        if (data.status === 'submitted' || data.status === 'approved' || data.status === 'first_review') {
          setSubmitted(true);
          setRequest(data as VendorRequest);
        } else {
          setRequest(data as VendorRequest);
          
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

          if (docs.length > 0) {
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

    const hasStreet = formData.street.trim();
    const hasPOBox = formData.po_box.trim();
    
    if (!hasStreet && !hasPOBox) {
      newErrors.address = 'יש למלא רחוב או ת.ד';
    }
    
    if (!formData.city.trim()) {
      newErrors.city = 'עיר היא שדה חובה';
    } else if (!ISRAEL_CITIES.includes(formData.city)) {
      newErrors.city = `העיר "${formData.city}" לא נמצאה ברשימת הערים. יש לבחור עיר מהרשימה.`;
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !request || !token) return;

    setIsSubmitting(true);
    try {
      // Upload all new files first using vendor-upload edge function
      for (const [docType, file] of Object.entries(files)) {
        if (file) {
          const uploadFormData = new FormData();
          uploadFormData.append('token', token);
          uploadFormData.append('documentType', docType);
          uploadFormData.append('file', file);
          
          if (docType === 'bank_confirmation' && extractedBankData && !extractedBankData.error) {
            uploadFormData.append('extractedTags', JSON.stringify({
              bank_number: extractedBankData.bank_number,
              branch_number: extractedBankData.branch_number,
              account_number: extractedBankData.account_number,
            }));
          }
          
          const response = await fetch(
            `https://ijyqtemnhlbamxmgjuzp.supabase.co/functions/v1/vendor-upload`,
            {
              method: 'POST',
              body: uploadFormData,
            }
          );
          
          if (!response.ok) {
            console.error('Upload error for', docType);
          }
        }
      }

      // Submit the form using vendor-form-api edge function
      const { data: response, error } = await supabase.functions.invoke('vendor-form-api', {
        body: { 
          action: 'submit', 
          token,
          data: formData 
        },
      });

      if (error) throw error;
      
      if (response?.error) {
        throw new Error(response.message || 'שגיאה בשליחת הטופס');
      }

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

  // Count uploaded documents
  const uploadedDocsCount = Object.entries(files).filter(([_, file]) => file !== null).length +
    Object.entries(existingDocuments).filter(([key, doc]) => doc !== null && !files[key as DocumentType]).length;
  const totalDocs = 4;

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

  // Contract upload handler - uses Edge Function for unauthenticated vendor access
  const handleContractUpload = async () => {
    if (!contractFile || !token || !request) return;
    
    setIsUploadingContract(true);
    try {
      const formData = new FormData();
      formData.append('token', token);
      formData.append('documentType', 'contract');
      formData.append('file', contractFile);

      const response = await fetch(
        `https://ijyqtemnhlbamxmgjuzp.supabase.co/functions/v1/vendor-upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }
      
      // The Edge Function already updates contract_file_path
      
      toast({
        title: 'החוזה הועלה בהצלחה',
        description: 'החוזה נשמר במערכת וממתין לחתימות',
      });
      
      setContractFile(null);
      // Reload to show updated state
      window.location.reload();
    } catch (error) {
      console.error('Contract upload error:', error);
      toast({
        title: 'שגיאה בהעלאת החוזה',
        description: 'אנא נסה שוב',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingContract(false);
    }
  };

  if (submitted) {
    const statusLink = `/vendor-status/${token}`;
    const needsContractUpload = request?.requires_contract_signature && !request?.contract_file_path;
    const contractUploaded = request?.requires_contract_signature && request?.contract_file_path;
    
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-6">
            <CheckCircle className="h-16 w-16 mx-auto text-success mb-4" />
            <h2 className="text-xl font-bold mb-2">הטופס נשלח בהצלחה!</h2>
            <p className="text-muted-foreground mb-4">
              תודה על מילוי הטופס. הפרטים שלך נקלטו במערכת ויטופלו בהקדם.
            </p>
            
            {needsContractUpload && (
              <div className="mt-6 p-4 bg-warning/10 border border-warning/30 rounded-lg text-right">
                <h3 className="font-medium mb-2 flex items-center gap-2 justify-end">
                  <Upload className="h-4 w-4" />
                  נדרשת העלאת חוזה חתום
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  יש להעלות את ההסכם החתום מצדך. לאחר ההעלאה, מנכ"ל ומנהל הרכש יחתמו על המסמך.
                </p>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setContractFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="contract-upload"
                />
                {contractFile ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-sm truncate">{contractFile.name}</span>
                      <Button variant="ghost" size="sm" onClick={() => setContractFile(null)}>
                        ✕
                      </Button>
                    </div>
                    <Button onClick={handleContractUpload} disabled={isUploadingContract} className="w-full">
                      {isUploadingContract ? (
                        <><Loader2 className="h-4 w-4 ml-2 animate-spin" />מעלה...</>
                      ) : (
                        'העלה חוזה'
                      )}
                    </Button>
                  </div>
                ) : (
                  <label htmlFor="contract-upload">
                    <Button variant="outline" className="w-full" asChild>
                      <span>בחר קובץ PDF</span>
                    </Button>
                  </label>
                )}
              </div>
            )}
            
            {contractUploaded && (
              <div className="mt-6 p-4 bg-success/10 border border-success/30 rounded-lg">
                <CheckCircle className="h-8 w-8 mx-auto text-success mb-2" />
                <p className="font-medium">החוזה הועלה בהצלחה</p>
                <p className="text-sm text-muted-foreground">ממתין לחתימות מנכ"ל ומנהל רכש</p>
              </div>
            )}
            
            {(!request?.requires_contract_signature || contractUploaded) && (
              <>
                <p className="text-muted-foreground mb-4 mt-4">
                  שלחנו לך מייל עם לינק למעקב אחר סטטוס הבקשה.
                </p>
                <a 
                  href={statusLink}
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                >
                  מעקב סטטוס הבקשה
                </a>
              </>
            )}
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

      {/* Step Indicator */}
      <div className="bg-muted/50 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-center gap-4">
            <div className={`flex items-center gap-2 ${currentStep === 1 ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 1 ? 'bg-primary text-primary-foreground' : currentStep > 1 ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                {currentStep > 1 ? <CheckCircle className="h-5 w-5" /> : <Upload className="h-4 w-4" />}
              </div>
              <span>שלב 1: העלאת מסמכים</span>
            </div>
            <div className="w-16 h-0.5 bg-border" />
            <div className={`flex items-center gap-2 ${currentStep === 2 ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                <FileText className="h-4 w-4" />
              </div>
              <span>שלב 2: מילוי פרטים</span>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {currentStep === 1 ? (
          /* Step 1: Upload Documents */
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  העלאת מסמכים נדרשים
                </CardTitle>
                <CardDescription>
                  שלום {request?.vendor_name}, אנא העלה את כל המסמכים הנדרשים. לאחר העלאת המסמכים, המערכת תחלץ אוטומטית את פרטי הבנק מהמסמכים ותמלא עבורך את הטופס.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
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
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">התקדמות העלאה</span>
                    <span className="text-sm text-muted-foreground">{uploadedDocsCount} מתוך {totalDocs} מסמכים</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${(uploadedDocsCount / totalDocs) * 100}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button
                size="lg"
                onClick={handleProceedToForm}
                disabled={isProcessingOcr || uploadedDocsCount < totalDocs}
              >
                {isProcessingOcr ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    מעבד מסמכים...
                  </>
                ) : (
                  <>
                    המשך למילוי פרטים
                    <ArrowLeft className="h-4 w-4 mr-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          /* Step 2: Fill Form */
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
                    onChange={(e) => {
                      setFormData({ ...formData, company_id: e.target.value });
                      clearFieldWarning('company_id');
                    }}
                    placeholder="הכנס מספר ח.פ או עוסק מורשה"
                    className={(hasFieldWarning('company_id') || errors.company_id) ? 'border-destructive' : ''}
                  />
                  {/* Show only one error message - prefer validation error over OCR warning */}
                  {errors.company_id ? (
                    <p className="text-sm text-destructive">{errors.company_id}</p>
                  ) : hasFieldWarning('company_id') ? (
                    <p className="text-sm text-destructive">{getFieldWarning('company_id')}</p>
                  ) : null}
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
                    onChange={(e) => {
                      setFormData({ ...formData, mobile: e.target.value });
                      clearFieldWarning('mobile');
                      // Clear mobile error when user edits
                      setErrors(prev => {
                        const { mobile, ...rest } = prev;
                        return rest;
                      });
                    }}
                    placeholder="טלפון נייד"
                    className={`ltr text-right ${(hasFieldWarning('mobile') || errors.mobile) ? 'border-destructive' : ''}`}
                  />
                  {/* Show only one error message - prefer validation error over OCR warning */}
                  {errors.mobile ? (
                    <p className="text-sm text-destructive">{errors.mobile}</p>
                  ) : hasFieldWarning('mobile') ? (
                    <p className="text-sm text-destructive">{getFieldWarning('mobile')}</p>
                  ) : null}
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
                    <div className={(hasFieldWarning('city') || errors.city) ? 'rounded-md border border-destructive' : ''}>
                      <CityAutocomplete
                        id="city"
                        value={formData.city}
                        onChange={(value) => {
                          setFormData({ ...formData, city: value });
                          clearFieldWarning('city');
                          // Clear city error when user edits
                          setErrors(prev => {
                            const { city, ...rest } = prev;
                            return rest;
                          });
                        }}
                        placeholder="הקלד שם עיר"
                      />
                    </div>
                    {/* Show only one error message - prefer validation error over OCR warning */}
                    {errors.city ? (
                      <p className="text-sm text-destructive">{errors.city}</p>
                    ) : hasFieldWarning('city') ? (
                      <p className="text-sm text-destructive">{getFieldWarning('city')}</p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="street">
                      רחוב {!formData.po_box.trim() && <span className="text-destructive">*</span>}
                    </Label>
                    <div className={(hasFieldWarning('street') || errors.street || errors.address) ? 'rounded-md border border-destructive' : ''}>
                      <StreetAutocomplete
                        id="street"
                        value={formData.street}
                        onChange={(value) => {
                          setFormData({ ...formData, street: value });
                          clearFieldWarning('street');
                          // Clear address error when user edits street
                          setErrors(prev => {
                            const { address, street, ...rest } = prev;
                            return rest;
                          });
                        }}
                        city={formData.city}
                        placeholder="שם הרחוב"
                      />
                    </div>
                    {/* Show only one error message */}
                    {errors.address ? (
                      <p className="text-sm text-destructive">{errors.address}</p>
                    ) : hasFieldWarning('street') ? (
                      <p className="text-sm text-destructive">{getFieldWarning('street')}</p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="street_number">מספר</Label>
                    <Input
                      id="street_number"
                      value={formData.street_number}
                      onChange={(e) => setFormData({ ...formData, street_number: e.target.value })}
                      placeholder="מספר בניין"
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
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="po_box">
                      ת.ד {!formData.street.trim() && <span className="text-destructive">*</span>}
                    </Label>
                    <Input
                      id="po_box"
                      value={formData.po_box}
                      onChange={(e) => {
                        setFormData({ ...formData, po_box: e.target.value });
                        // Clear address error when user edits po_box
                        setErrors(prev => {
                          const { address, ...rest } = prev;
                          return rest;
                        });
                      }}
                      placeholder="תיבת דואר"
                      className={errors.address && !formData.street.trim() ? 'border-destructive' : ''}
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
                  <h4 className="font-medium mb-3">איש קשר בהנהלת חשבונות</h4>
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
                {extractedBankData && (extractedBankData.bank_number || extractedBankData.branch_number || extractedBankData.account_number) && (
                  <CardDescription className="text-success">
                    ✓ פרטי הבנק הוזנו אוטומטית מהמסמך שהועלה
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="bank_name">שם הבנק *</Label>
                  <div className={(hasFieldWarning('bank_name') || errors.bank_name) ? 'rounded-md border border-destructive' : ''}>
                    <BankAutocomplete
                      id="bank_name"
                      value={formData.bank_name}
                      onChange={(value) => {
                        setFormData({ ...formData, bank_name: value, bank_branch: '', bank_account_number: '' });
                        clearFieldWarning('bank_name');
                        // Clear all bank-related errors when bank name changes
                        setErrors(prev => {
                          const { bank_name, bank_branch, bank_account_number, ...rest } = prev;
                          return rest;
                        });
                      }}
                      placeholder="בחר בנק"
                    />
                  </div>
                  {/* Show only one error message - prefer validation error over OCR warning */}
                  {errors.bank_name ? (
                    <p className="text-sm text-destructive">{errors.bank_name}</p>
                  ) : hasFieldWarning('bank_name') ? (
                    <p className="text-sm text-destructive">{getFieldWarning('bank_name')}</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bank_branch">סניף *</Label>
                  <div className={(hasFieldWarning('bank_branch') || errors.bank_branch) ? 'rounded-md border border-destructive' : ''}>
                    <BranchAutocomplete
                      id="bank_branch"
                      value={formData.bank_branch}
                      onChange={(value) => {
                        setFormData({ ...formData, bank_branch: value });
                        clearFieldWarning('bank_branch');
                        // Clear error first, then validate
                        setErrors(prev => {
                          const { bank_branch, ...rest } = prev;
                          return rest;
                        });
                        // Validate only if needed
                        if (value && formData.bank_name) {
                          const branches = getBranchesByBank(formData.bank_name);
                          const branchExists = branches.some(b => b.code === value);
                          if (branches.length > 0 && !branchExists) {
                            setErrors(prev => ({ ...prev, bank_branch: `סניף ${value} לא נמצא ברשימת הסניפים` }));
                          }
                        }
                      }}
                      bankName={formData.bank_name}
                      placeholder="בחר או הקלד מספר סניף"
                    />
                  </div>
                  {formData.bank_name && (
                    <p className="text-xs text-muted-foreground">
                      {getBranchesByBank(formData.bank_name).length} סניפים זמינים עבור {formData.bank_name}
                    </p>
                  )}
                  {/* Show only one error message - prefer validation error over OCR warning */}
                  {errors.bank_branch ? (
                    <p className="text-sm text-destructive">{errors.bank_branch}</p>
                  ) : hasFieldWarning('bank_branch') ? (
                    <p className="text-sm text-destructive">{getFieldWarning('bank_branch')}</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bank_account_number">מספר חשבון *</Label>
                  <Input
                    id="bank_account_number"
                    value={formData.bank_account_number}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      setFormData({ ...formData, bank_account_number: value });
                      clearFieldWarning('bank_account_number');
                      // Clear any existing error immediately when user starts editing
                      setErrors(prev => {
                        const { bank_account_number, ...rest } = prev;
                        return rest;
                      });
                      // Only validate if we have a value and bank name
                      if (value && formData.bank_name) {
                        const validation = validateBankAccount(value, formData.bank_name);
                        if (!validation.valid) {
                          setErrors(prev => ({ ...prev, bank_account_number: validation.message || '' }));
                        }
                      }
                    }}
                    placeholder={formData.bank_name ? `${getBankByName(formData.bank_name)?.accountDigits || '6-9'} ספרות` : 'מספר חשבון'}
                    className={`ltr text-right ${(hasFieldWarning('bank_account_number') || errors.bank_account_number) ? 'border-destructive' : ''}`}
                    maxLength={9}
                  />
                  {formData.bank_name && getBankByName(formData.bank_name) && (
                    <p className="text-xs text-muted-foreground">
                      {getBankByName(formData.bank_name)?.accountDigits} ספרות נדרשות עבור {formData.bank_name}
                    </p>
                  )}
                  {/* Show only one error message - prefer validation error over OCR warning */}
                  {errors.bank_account_number ? (
                    <p className="text-sm text-destructive">{errors.bank_account_number}</p>
                  ) : hasFieldWarning('bank_account_number') ? (
                    <p className="text-sm text-destructive">{getFieldWarning('bank_account_number')}</p>
                  ) : null}
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
                    onValueChange={(value: 'check' | 'invoice' | 'transfer') => {
                      setFormData({ ...formData, payment_method: value });
                      // Clear payment_method error when user selects
                      setErrors(prev => {
                        const { payment_method, ...rest } = prev;
                        return rest;
                      });
                    }}
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

            {/* Documents Summary */}
            <Card>
              <CardHeader>
                <CardTitle>מסמכים שהועלו</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 md:grid-cols-2">
                  {(Object.keys(DOCUMENT_TYPE_LABELS) as DocumentType[]).map((docType) => {
                    const file = files[docType];
                    const existingDoc = existingDocuments[docType];
                    const hasDoc = file || existingDoc;
                    return (
                      <div key={docType} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                        {hasDoc ? (
                          <CheckCircle className="h-4 w-4 text-success" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-destructive" />
                        )}
                        <span className="text-sm">{DOCUMENT_TYPE_LABELS[docType]}</span>
                        {hasDoc && (
                          <span className="text-xs text-muted-foreground mr-auto">
                            {file?.name || existingDoc?.file_name}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {/* Option to replace bank document in step 2 */}
                <div className="mt-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label className="text-sm">החלפת אישור בנק (אופציונלי)</Label>
                    <div className="relative">
                      <FileUploadZone
                        label="אישור בנק / צ'ק"
                        documentType="bank_confirmation"
                        selectedFile={files.bank_confirmation}
                        onFileSelect={handleBankFileSelect}
                        onRemove={() => {
                          setFiles({ ...files, bank_confirmation: null });
                          setExtractedBankData(null);
                        }}
                        existingDocument={existingDocuments.bank_confirmation}
                      />
                      {isExtractingOcr && (
                        <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
                          <div className="flex items-center gap-2 text-primary">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span className="text-sm">מחלץ נתוני בנק...</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(1)}
              >
                <ArrowRight className="h-4 w-4 ml-2" />
                חזרה לשלב הקודם
              </Button>
              <Button type="submit" size="lg" disabled={isSubmitting || isExtractingOcr}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                    שולח טופס...
                  </>
                ) : 'שלח טופס'}
              </Button>
            </div>
          </form>
        )}

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
          onAutoFill={handleAutoFillFromDocument}
        />
      </main>
    </div>
  );
}
