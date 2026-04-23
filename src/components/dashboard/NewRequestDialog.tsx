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
  X, 
  User, 
  Mail, 
  Shield, 
  CheckCircle2,
  Send,
  Loader2
} from 'lucide-react';
import { APP_CONFIG } from '@/config/appConfig';

interface NewRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: NewRequestData) => Promise<void>;
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


const emailSchema = z.string().email('כתובת אימייל לא תקינה');

export function NewRequestDialog({ open, onOpenChange, onSubmit }: NewRequestDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    expires_in_days: APP_CONFIG.DEFAULT_LINK_EXPIRY_DAYS,
    vendor_type: APP_CONFIG.DEFAULT_VENDOR_TYPE,
    claims_area: null,
    claims_sub_category: null,
    handler_name: '',
    handler_email: '',
    requires_contract_signature: true,
    requires_vp_approval: true,
    skip_manager_approval: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});


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
      expires_in_days: APP_CONFIG.DEFAULT_LINK_EXPIRY_DAYS,
      vendor_type: APP_CONFIG.DEFAULT_VENDOR_TYPE,
      claims_area: null,
      claims_sub_category: null,
      handler_name: '',
      handler_email: '',
      requires_contract_signature: true,
      requires_vp_approval: true,
      skip_manager_approval: false,
    });
    setErrors({});
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
            <div className="w-full flex items-center gap-4 justify-start">
              <img
                src="/images/bituach-yashir-logo.png"
                alt="ביטוח ישיר"
                className="h-10 w-auto"
              />
              <div className="text-right">
                <DialogTitle className="text-2xl text-white font-bold">בקשה חדשה להקמת ספק</DialogTitle>
                <p className="text-white/80 text-sm mt-1">מלא את הפרטים ונשלח קישור לספק</p>
              </div>
            </div>
          </DialogHeader>
        </div>
        
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5 text-right animate-fade-in">
            {/* Handler Section */}
            <div className="bg-gradient-to-r from-accent/5 to-accent/10 rounded-xl p-4 border border-accent/20">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center order-first">
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

            {/* Vendor Details Section */}
            <div className="bg-gradient-to-r from-success/5 to-success/10 rounded-xl p-4 border border-success/20">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-success/20 flex items-center justify-center order-first">
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

            {/* Approval Type Section */}
            <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl p-4 border border-primary/20">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center order-first">
                  <Shield className="h-4 w-4 text-primary" />
                </div>
                <Label className="font-semibold text-primary">סוג אישור נדרש</Label>
              </div>
              
              <div className="space-y-3">
                <label
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border ${
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

                <label
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border ${
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
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border ${
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
              </div>
            </div>

            <DialogFooter className="gap-3 pt-4 border-t">
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="flex-1 bg-gradient-to-l from-primary to-accent hover:from-primary/90 hover:to-accent/90 gap-2"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {isSubmitting ? 'יוצר...' : 'צור בקשה וקבל קישור'}
              </Button>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                ביטול
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
