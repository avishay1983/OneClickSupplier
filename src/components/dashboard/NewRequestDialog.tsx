import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { z } from 'zod';
import { 
  Upload, 
  FileSpreadsheet, 
  X, 
  Download, 
  User, 
  Building2, 
  Mail, 
  Clock, 
  Shield, 
  CheckCircle2,
  Users,
  Sparkles,
  Send
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface NewRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: NewRequestData) => Promise<void>;
  onBulkSubmit?: (data: BulkVendorData[]) => Promise<void>;
}

export interface NewRequestData {
  vendor_name: string;
  vendor_email: string;
  expected_spending: number | null;
  quote_received: boolean;
  contract_signed: boolean;
  legal_approved: boolean;
  is_consultant: boolean;
  is_sensitive: boolean;
  expires_in_days: number;
  vendor_type: 'general' | 'claims';
  claims_area: string | null;
  claims_sub_category: string | null;
  handler_name: string;
  handler_email: string;
  requires_contract_signature: boolean;
  requires_vp_approval: boolean;
  skip_manager_approval: boolean;
}

export interface BulkVendorData {
  vendor_name: string;
  vendor_email: string;
  expires_in_days: number;
  handler_name: string;
  vendor_type: 'general' | 'claims';
  requires_vp_approval: boolean;
}

const emailSchema = z.string().email('כתובת אימייל לא תקינה');

export function NewRequestDialog({ open, onOpenChange, onSubmit, onBulkSubmit }: NewRequestDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('single');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Single vendor form
  const [formData, setFormData] = useState<NewRequestData>({
    vendor_name: '',
    vendor_email: '',
    expected_spending: null,
    quote_received: false,
    contract_signed: false,
    legal_approved: false,
    is_consultant: false,
    is_sensitive: false,
    expires_in_days: 7,
    vendor_type: 'general',
    claims_area: null,
    claims_sub_category: null,
    handler_name: '',
    handler_email: '',
    requires_contract_signature: true,
    requires_vp_approval: true,
    skip_manager_approval: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Bulk upload state
  const [bulkVendors, setBulkVendors] = useState<BulkVendorData[]>([]);
  const [bulkExpiresInDays, setBulkExpiresInDays] = useState(7);
  const [bulkRequiresVpApproval, setBulkRequiresVpApproval] = useState(true);
  const [uploadedFileName, setUploadedFileName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate
    if (!formData.vendor_name.trim()) {
      setErrors({ vendor_name: 'שם הספק הוא שדה חובה' });
      return;
    }

    const emailResult = emailSchema.safeParse(formData.vendor_email);
    if (!emailResult.success) {
      setErrors({ vendor_email: 'כתובת אימייל לא תקינה' });
      return;
    }

    // Validate claims area if vendor is claims type
    if (formData.vendor_type === 'claims' && !formData.claims_area) {
      setErrors({ claims_area: 'יש לבחור אזור תביעות' });
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      resetForm();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'שגיאה',
        description: 'אירעה שגיאה ביצירת הבקשה',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      vendor_name: '',
      vendor_email: '',
      expected_spending: null,
      quote_received: false,
      contract_signed: false,
      legal_approved: false,
      is_consultant: false,
      is_sensitive: false,
      expires_in_days: 7,
      vendor_type: 'general',
      claims_area: null,
      claims_sub_category: null,
      handler_name: '',
      handler_email: '',
      requires_contract_signature: true,
      requires_vp_approval: true,
      skip_manager_approval: false,
    });
    setBulkVendors([]);
    setUploadedFileName('');
    setErrors({});
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];
    
    if (!validTypes.includes(file.type) && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls') && !file.name.endsWith('.csv')) {
      toast({
        title: 'שגיאה',
        description: 'יש להעלות קובץ אקסל (xlsx, xls) או CSV',
        variant: 'destructive',
      });
      return;
    }

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];

      // Find header row and column indices
      const headerRow = jsonData[0];
      if (!headerRow) {
        toast({
          title: 'שגיאה',
          description: 'הקובץ ריק',
          variant: 'destructive',
        });
        return;
      }

      // Try to find columns (support Hebrew and English)
      const nameHeaders = ['שם ספק', 'שם הספק', 'vendor_name', 'name', 'שם'];
      const emailHeaders = ['אימייל', 'מייל', 'vendor_email', 'email', 'דוא"ל'];
      const handlerHeaders = ['מזמין הספק', 'מזמין', 'מטפל בתיק', 'מטפל', 'handler_name', 'handler'];
      const typeHeaders = ['סוג ספק', 'סוג', 'vendor_type', 'type'];

      let nameColIndex = -1;
      let emailColIndex = -1;
      let handlerColIndex = -1;
      let typeColIndex = -1;

      headerRow.forEach((header, index) => {
        const lowerHeader = String(header).toLowerCase().trim();
        if (nameHeaders.some(h => lowerHeader.includes(h.toLowerCase()))) {
          nameColIndex = index;
        }
        if (emailHeaders.some(h => lowerHeader.includes(h.toLowerCase()))) {
          emailColIndex = index;
        }
        if (handlerHeaders.some(h => lowerHeader.includes(h.toLowerCase()))) {
          handlerColIndex = index;
        }
        if (typeHeaders.some(h => lowerHeader.includes(h.toLowerCase()))) {
          typeColIndex = index;
        }
      });

      // If not found by header, assume first columns
      if (nameColIndex === -1) nameColIndex = 0;
      if (emailColIndex === -1) emailColIndex = 1;
      if (handlerColIndex === -1) handlerColIndex = 2;
      if (typeColIndex === -1) typeColIndex = 3;

      const vendors: BulkVendorData[] = [];
      const invalidRows: number[] = [];

      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.length === 0) continue;

        const name = String(row[nameColIndex] || '').trim();
        const email = String(row[emailColIndex] || '').trim();
        const handler = String(row[handlerColIndex] || '').trim();
        const typeRaw = String(row[typeColIndex] || '').trim().toLowerCase();
        
        // Map Hebrew vendor type to English
        let vendorType: 'general' | 'claims' = 'general';
        if (typeRaw === 'תביעות' || typeRaw === 'claims') {
          vendorType = 'claims';
        }

        if (!name || !email) continue;

        const emailValidation = emailSchema.safeParse(email);
        if (!emailValidation.success) {
          invalidRows.push(i + 1);
          continue;
        }

        vendors.push({
          vendor_name: name,
          vendor_email: email,
          expires_in_days: bulkExpiresInDays,
          handler_name: handler,
          vendor_type: vendorType,
          requires_vp_approval: bulkRequiresVpApproval,
        });
      }

      if (vendors.length === 0) {
        toast({
          title: 'שגיאה',
          description: 'לא נמצאו ספקים תקינים בקובץ. וודא שיש עמודות "שם ספק" ו"אימייל"',
          variant: 'destructive',
        });
        return;
      }

      setBulkVendors(vendors);
      setUploadedFileName(file.name);

      if (invalidRows.length > 0) {
        toast({
          title: 'אזהרה',
          description: `${invalidRows.length} שורות עם אימייל לא תקין לא נוספו (שורות: ${invalidRows.slice(0, 5).join(', ')}${invalidRows.length > 5 ? '...' : ''})`,
          variant: 'default',
        });
      }

      toast({
        title: 'הקובץ נטען בהצלחה',
        description: `נמצאו ${vendors.length} ספקים`,
      });

    } catch (error) {
      console.error('Error parsing Excel:', error);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן לקרוא את הקובץ',
        variant: 'destructive',
      });
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleBulkSubmit = async () => {
    if (bulkVendors.length === 0) {
      toast({
        title: 'שגיאה',
        description: 'יש להעלות קובץ עם רשימת ספקים',
        variant: 'destructive',
      });
      return;
    }

    if (!onBulkSubmit) {
      toast({
        title: 'שגיאה',
        description: 'פונקציית העלאה קבוצתית לא זמינה',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Update expires_in_days and requires_vp_approval for all vendors
      const vendorsWithExpiry = bulkVendors.map(v => ({
        ...v,
        expires_in_days: bulkExpiresInDays,
        requires_vp_approval: bulkRequiresVpApproval,
      }));
      
      await onBulkSubmit(vendorsWithExpiry);
      resetForm();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'שגיאה',
        description: 'אירעה שגיאה ביצירת הבקשות',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeVendor = (index: number) => {
    setBulkVendors(prev => prev.filter((_, i) => i !== index));
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['שם ספק', 'אימייל', 'מזמין הספק', 'סוג ספק'],
      ['ספק לדוגמא', 'example@vendor.com', 'ישראל ישראלי', 'משרד'],
      ['ספק תביעות לדוגמא', 'claims@vendor.com', 'יוסי כהן', 'תביעות'],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ספקים');
    XLSX.writeFile(wb, 'תבנית_רשימת_ספקים.xlsx');
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 border-0 shadow-2xl" dir="rtl">
        {/* Header with gradient background */}
        <div className="bg-gradient-to-l from-primary via-primary/90 to-accent/80 p-6 rounded-t-lg">
          <DialogHeader>
            <div className="flex items-center gap-4 justify-end">
              <div className="text-right">
                <DialogTitle className="text-2xl text-white font-bold">בקשה חדשה להקמת ספק</DialogTitle>
                <p className="text-white/80 text-sm mt-1">מלא את הפרטים ונשלח קישור לספק</p>
              </div>
              <img 
                src="/images/bituach-yashir-logo.png" 
                alt="ביטוח ישיר" 
                className="h-10 w-auto"
              />
            </div>
          </DialogHeader>
        </div>
        
        <div className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1 rounded-xl h-12">
              <TabsTrigger 
                value="bulk" 
                className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-2 flex-row-reverse transition-all"
              >
                <FileSpreadsheet className="h-4 w-4" />
                העלאה מאקסל
              </TabsTrigger>
              <TabsTrigger 
                value="single" 
                className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-2 flex-row-reverse transition-all"
              >
                <User className="h-4 w-4" />
                ספק בודד
              </TabsTrigger>
            </TabsList>

            <TabsContent value="single" className="mt-6 animate-fade-in">
              <form onSubmit={handleSubmit} className="space-y-5 text-right">
                {/* Handler Section */}
                <div className="bg-gradient-to-r from-accent/5 to-accent/10 rounded-xl p-4 border border-accent/20">
                  <div className="flex items-center gap-2 mb-3 justify-end">
                    <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
                      <User className="h-4 w-4 text-accent" />
                    </div>
                    <Label className="font-semibold text-accent">מזמין הספק</Label>
                  </div>
                  <Input
                    id="handler_name"
                    className="text-right bg-white/80 border-accent/20 focus:border-accent focus:ring-accent/20"
                    value={formData.handler_name}
                    onChange={(e) => setFormData({ ...formData, handler_name: e.target.value })}
                    placeholder="הכנס שם מזמין"
                  />
                </div>

                {/* Vendor Type Section */}
                <div className="bg-gradient-to-r from-brand-purple/5 to-brand-purple/10 rounded-xl p-4 border border-brand-purple/20">
                  <div className="flex items-center gap-2 mb-3 justify-end">
                    <div className="w-8 h-8 rounded-lg bg-brand-purple/20 flex items-center justify-center">
                      <Building2 className="h-4 w-4 text-brand-purple" />
                    </div>
                    <Label className="font-semibold text-brand-purple">סוג ספק</Label>
                  </div>
                  <Select
                    value={formData.vendor_type}
                    onValueChange={(value: 'general' | 'claims') => {
                      setFormData({ 
                        ...formData, 
                        vendor_type: value,
                        claims_area: value === 'general' ? null : formData.claims_area,
                        claims_sub_category: value === 'general' ? null : formData.claims_sub_category
                      });
                    }}
                  >
                    <SelectTrigger className="flex-row-reverse bg-white/80 border-brand-purple/20">
                      <SelectValue placeholder="בחר סוג ספק" className="text-right" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">ספק משרד</SelectItem>
                      <SelectItem value="claims">ספק תביעות</SelectItem>
                    </SelectContent>
                  </Select>

                  {formData.vendor_type === 'claims' && (
                    <div className="mt-3 space-y-3">
                      <Select
                        value={formData.claims_area || ''}
                        onValueChange={(value) => setFormData({ ...formData, claims_area: value, claims_sub_category: null })}
                      >
                        <SelectTrigger className="flex-row-reverse bg-white/80 border-brand-purple/20">
                          <SelectValue placeholder="בחר אזור תביעות" className="text-right" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="home">דירה</SelectItem>
                          <SelectItem value="car">רכב</SelectItem>
                          <SelectItem value="life">חיים</SelectItem>
                          <SelectItem value="health">בריאות</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.claims_area && (
                        <p className="text-sm text-destructive text-right">{errors.claims_area}</p>
                      )}

                      {formData.claims_area === 'car' && (
                        <Select
                          value={formData.claims_sub_category || ''}
                          onValueChange={(value) => setFormData({ ...formData, claims_sub_category: value })}
                        >
                          <SelectTrigger className="flex-row-reverse bg-white/80 border-brand-purple/20">
                            <SelectValue placeholder="בחר סוג ספק רכב" className="text-right" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="garage">מוסך</SelectItem>
                            <SelectItem value="appraiser">שמאי</SelectItem>
                          </SelectContent>
                        </Select>
                      )}

                      {(formData.claims_area === 'life' || formData.claims_area === 'health') && (
                        <Select
                          value={formData.claims_sub_category || ''}
                          onValueChange={(value) => setFormData({ ...formData, claims_sub_category: value })}
                        >
                          <SelectTrigger className="flex-row-reverse bg-white/80 border-brand-purple/20">
                            <SelectValue placeholder={`בחר סוג ספק ${formData.claims_area === 'life' ? 'חיים' : 'בריאות'}`} className="text-right" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="doctor">רופא</SelectItem>
                            <SelectItem value="lawyer">עורך דין</SelectItem>
                          </SelectContent>
                        </Select>
                      )}

                      {formData.claims_area === 'home' && (
                        <Select
                          value={formData.claims_sub_category || ''}
                          onValueChange={(value) => setFormData({ ...formData, claims_sub_category: value })}
                        >
                          <SelectTrigger className="flex-row-reverse bg-white/80 border-brand-purple/20">
                            <SelectValue placeholder="בחר סוג ספק דירה" className="text-right" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="plumber">שרברב</SelectItem>
                            <SelectItem value="management">חברת ניהול</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  )}
                </div>

                {/* Vendor Details Section */}
                <div className="bg-gradient-to-r from-success/5 to-success/10 rounded-xl p-4 border border-success/20">
                  <div className="flex items-center gap-2 mb-3 justify-end">
                    <div className="w-8 h-8 rounded-lg bg-success/20 flex items-center justify-center">
                      <Mail className="h-4 w-4 text-success" />
                    </div>
                    <Label className="font-semibold text-success">פרטי הספק *</Label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Input
                        id="vendor_name"
                        className="text-right bg-white/80 border-success/20 focus:border-success focus:ring-success/20"
                        value={formData.vendor_name}
                        onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                        placeholder="שם הספק"
                      />
                      {errors.vendor_name && (
                        <p className="text-sm text-destructive text-right">{errors.vendor_name}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Input
                        id="vendor_email"
                        type="email"
                        className="text-left bg-white/80 border-success/20 focus:border-success focus:ring-success/20"
                        dir="ltr"
                        value={formData.vendor_email}
                        onChange={(e) => setFormData({ ...formData, vendor_email: e.target.value })}
                        placeholder="vendor@example.com"
                      />
                      {errors.vendor_email && (
                        <p className="text-sm text-destructive text-right">{errors.vendor_email}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Link Expiry Section */}
                <div className="bg-gradient-to-r from-warning/5 to-warning/10 rounded-xl p-4 border border-warning/20">
                  <div className="flex items-center gap-2 mb-3 justify-end">
                    <div className="w-8 h-8 rounded-lg bg-warning/20 flex items-center justify-center">
                      <Clock className="h-4 w-4 text-warning" />
                    </div>
                    <Label className="font-semibold text-warning">תוקף הקישור</Label>
                  </div>
                  <Select
                    value={String(formData.expires_in_days)}
                    onValueChange={(value) => setFormData({ ...formData, expires_in_days: Number(value) })}
                  >
                    <SelectTrigger className="flex-row-reverse bg-white/80 border-warning/20">
                      <SelectValue placeholder="בחר תוקף" className="text-right" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.007">10 דקות</SelectItem>
                      <SelectItem value="3">3 ימים</SelectItem>
                      <SelectItem value="7">7 ימים</SelectItem>
                      <SelectItem value="14">14 ימים</SelectItem>
                      <SelectItem value="30">30 ימים</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Approval Type Section */}
                <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl p-4 border border-primary/20">
                  <div className="flex items-center gap-2 mb-4 justify-end">
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Shield className="h-4 w-4 text-primary" />
                    </div>
                    <Label className="font-semibold text-primary">סוג אישור נדרש</Label>
                  </div>
                  
                  <div className="space-y-3">
                    <label 
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border flex-row-reverse ${
                        formData.skip_manager_approval 
                          ? 'bg-primary/10 border-primary/30 shadow-sm' 
                          : 'bg-white/50 border-transparent hover:bg-white/80'
                      }`}
                    >
                      <Checkbox
                        id="approval_none"
                        checked={formData.skip_manager_approval === true}
                        onCheckedChange={(checked) => 
                          setFormData({ 
                            ...formData, 
                            skip_manager_approval: checked as boolean,
                            requires_vp_approval: checked ? false : formData.requires_vp_approval
                          })
                        }
                      />
                      <div className="flex-1 text-right">
                        <span className="font-medium">ללא צורך באישור מנהל</span>
                        <p className="text-xs text-muted-foreground">הספק יאושר אוטומטית</p>
                      </div>
                    </label>

                    <label
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border flex-row-reverse ${
                        !formData.requires_vp_approval && !formData.skip_manager_approval 
                          ? 'bg-primary/10 border-primary/30 shadow-sm' 
                          : 'bg-white/50 border-transparent hover:bg-white/80'
                      }`}
                    >
                      <Checkbox
                        id="approval_pm_only"
                        checked={!formData.requires_vp_approval && !formData.skip_manager_approval}
                        onCheckedChange={(checked) => 
                          setFormData({ 
                            ...formData, 
                            requires_vp_approval: !(checked as boolean),
                            skip_manager_approval: false
                          })
                        }
                      />
                      <div className="flex-1 text-right">
                        <span className="font-medium">אישור מנהל רכש בלבד</span>
                        <p className="text-xs text-muted-foreground">חתימה אחת נדרשת</p>
                      </div>
                    </label>

                    <label
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border flex-row-reverse ${
                        formData.requires_vp_approval && !formData.skip_manager_approval 
                          ? 'bg-primary/10 border-primary/30 shadow-sm' 
                          : 'bg-white/50 border-transparent hover:bg-white/80'
                      }`}
                    >
                      <Checkbox
                        id="approval_both"
                        checked={formData.requires_vp_approval && !formData.skip_manager_approval}
                        onCheckedChange={(checked) => 
                          setFormData({ 
                            ...formData, 
                            requires_vp_approval: checked as boolean,
                            skip_manager_approval: false
                          })
                        }
                      />
                      <div className="flex-1 text-right">
                        <span className="font-medium">אישור מנהל רכש + סמנכ"ל</span>
                        <p className="text-xs text-muted-foreground">שתי חתימות נדרשות</p>
                      </div>
                    </label>
                  </div>
                </div>

                <DialogFooter className="gap-3 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                    ביטול
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="flex-1 bg-gradient-to-l from-primary to-accent hover:from-primary/90 hover:to-accent/90 gap-2"
                  >
                    <Send className="h-4 w-4" />
                    {isSubmitting ? 'יוצר...' : 'צור בקשה וקבל קישור'}
                  </Button>
                </DialogFooter>
              </form>
            </TabsContent>

            <TabsContent value="bulk" className="mt-6 space-y-5 animate-fade-in" dir="rtl">
              {/* File upload area */}
              <div 
                className="border-2 border-dashed border-primary/30 rounded-xl p-8 text-center hover:border-primary/60 hover:bg-primary/5 transition-all cursor-pointer group"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <FileSpreadsheet className="h-8 w-8 text-primary" />
                </div>
                <p className="text-primary font-medium mb-1">לחץ להעלאת קובץ אקסל</p>
                <p className="text-xs text-muted-foreground">תומך ב: xlsx, xls, csv</p>
              </div>

              {/* Download template button */}
              <Button variant="outline" onClick={downloadTemplate} className="w-full gap-2 h-11">
                <Download className="h-4 w-4" />
                הורד תבנית לדוגמא
              </Button>

              {/* Expiry selection */}
              <div className="bg-gradient-to-r from-warning/5 to-warning/10 rounded-xl p-4 border border-warning/20">
                <div className="flex items-center gap-2 mb-3 justify-end">
                  <div className="w-8 h-8 rounded-lg bg-warning/20 flex items-center justify-center">
                    <Clock className="h-4 w-4 text-warning" />
                  </div>
                  <Label className="font-semibold text-warning">תוקף הקישורים</Label>
                </div>
                <Select
                  value={String(bulkExpiresInDays)}
                  onValueChange={(value) => setBulkExpiresInDays(Number(value))}
                  dir="rtl"
                >
                  <SelectTrigger className="text-right bg-white/80 border-warning/20">
                    <SelectValue placeholder="בחר תוקף" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 ימים</SelectItem>
                    <SelectItem value="7">7 ימים</SelectItem>
                    <SelectItem value="14">14 ימים</SelectItem>
                    <SelectItem value="30">30 ימים</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Approval type selection */}
              <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl p-4 border border-primary/20">
                <div className="flex items-center gap-2 mb-3 justify-end">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Shield className="h-4 w-4 text-primary" />
                  </div>
                  <Label className="font-semibold text-primary">סוג אישור נדרש</Label>
                </div>
                <div className="space-y-2">
                  <label 
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border flex-row-reverse ${
                      !bulkRequiresVpApproval 
                        ? 'bg-primary/10 border-primary/30 shadow-sm' 
                        : 'bg-white/50 border-transparent hover:bg-white/80'
                    }`}
                  >
                    <Checkbox
                      id="bulk-procurement-only"
                      checked={!bulkRequiresVpApproval}
                      onCheckedChange={(checked) => {
                        if (checked) setBulkRequiresVpApproval(false);
                      }}
                    />
                    <span className="font-medium text-right flex-1">אישור מנהל רכש בלבד</span>
                  </label>
                  <label 
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border flex-row-reverse ${
                      bulkRequiresVpApproval 
                        ? 'bg-primary/10 border-primary/30 shadow-sm' 
                        : 'bg-white/50 border-transparent hover:bg-white/80'
                    }`}
                  >
                    <Checkbox
                      id="bulk-requires-vp"
                      checked={bulkRequiresVpApproval}
                      onCheckedChange={(checked) => {
                        if (checked) setBulkRequiresVpApproval(true);
                      }}
                    />
                    <span className="font-medium text-right flex-1">אישור מנהל רכש + סמנכ"ל</span>
                  </label>
                </div>
              </div>

              {/* Uploaded file info and vendor list */}
              {uploadedFileName && (
                <div className="space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between p-4 bg-gradient-to-l from-success/10 to-success/5 rounded-xl border border-success/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5 text-success" />
                      </div>
                      <div>
                        <span className="font-medium block">{uploadedFileName}</span>
                        <span className="text-sm text-muted-foreground">{bulkVendors.length} ספקים נמצאו</span>
                      </div>
                    </div>
                  </div>

                  {/* Vendor list preview */}
                  <div className="border rounded-xl max-h-48 overflow-y-auto bg-white">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 sticky top-0">
                        <tr>
                          <th className="text-right p-3 font-medium">שם ספק</th>
                          <th className="text-right p-3 font-medium">אימייל</th>
                          <th className="w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {bulkVendors.map((vendor, index) => (
                          <tr key={index} className="border-t hover:bg-muted/30 transition-colors">
                            <td className="p-3">{vendor.vendor_name}</td>
                            <td className="p-3 ltr text-right text-muted-foreground">{vendor.vendor_email}</td>
                            <td className="p-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                                onClick={() => removeVendor(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <DialogFooter className="gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                  ביטול
                </Button>
                <Button 
                  onClick={handleBulkSubmit} 
                  disabled={isSubmitting || bulkVendors.length === 0}
                  className="flex-1 bg-gradient-to-l from-primary to-accent hover:from-primary/90 hover:to-accent/90 gap-2"
                >
                  <Users className="h-4 w-4" />
                  {isSubmitting ? 'שולח...' : `שלח ל-${bulkVendors.length} ספקים`}
                </Button>
              </DialogFooter>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
