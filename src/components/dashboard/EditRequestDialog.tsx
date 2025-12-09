import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { VendorRequest } from '@/types/vendor';
import { Loader2 } from 'lucide-react';

interface EditRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: VendorRequest | null;
  onSuccess: () => void;
}

export function EditRequestDialog({ open, onOpenChange, request, onSuccess }: EditRequestDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    vendor_name: '',
    vendor_email: '',
    expected_spending: null as number | null,
    quote_received: false,
    contract_signed: false,
    legal_approved: false,
    approver_name: '',
    is_consultant: false,
    is_sensitive: false,
    vendor_type: 'general' as 'general' | 'claims',
    claims_area: null as string | null,
    handler_name: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (request) {
      setFormData({
        vendor_name: request.vendor_name || '',
        vendor_email: request.vendor_email || '',
        expected_spending: request.expected_spending || null,
        quote_received: request.quote_received || false,
        contract_signed: request.contract_signed || false,
        legal_approved: request.legal_approved || false,
        approver_name: request.approver_name || '',
        is_consultant: request.is_consultant || false,
        is_sensitive: request.is_sensitive || false,
        vendor_type: (request.vendor_type as 'general' | 'claims') || 'general',
        claims_area: request.claims_area || null,
        handler_name: request.handler_name || '',
      });
      setErrors({});
    }
  }, [request]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request) return;

    setErrors({});

    // Validate
    if (!formData.vendor_name.trim()) {
      setErrors({ vendor_name: 'שם הספק הוא שדה חובה' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.vendor_email)) {
      setErrors({ vendor_email: 'כתובת אימייל לא תקינה' });
      return;
    }

    if (formData.vendor_type === 'claims' && !formData.claims_area) {
      setErrors({ claims_area: 'יש לבחור אזור תביעות' });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('vendor_requests')
        .update({
          vendor_name: formData.vendor_name,
          vendor_email: formData.vendor_email,
          expected_spending: formData.expected_spending,
          quote_received: formData.quote_received,
          contract_signed: formData.contract_signed,
          legal_approved: formData.legal_approved,
          approver_name: formData.approver_name,
          is_consultant: formData.is_consultant,
          is_sensitive: formData.is_sensitive,
          vendor_type: formData.vendor_type,
          claims_area: formData.claims_area,
          handler_name: formData.handler_name,
        })
        .eq('id', request.id);

      if (error) throw error;

      toast({
        title: 'הבקשה עודכנה',
        description: 'פרטי הבקשה עודכנו בהצלחה',
      });
      
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating request:', error);
      toast({
        title: 'שגיאה',
        description: error.message || 'אירעה שגיאה בעדכון הבקשה',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl">עריכת בקשת ספק</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit_handler_name" className="block text-right">מטפל בתהליך</Label>
              <Input
                id="edit_handler_name"
                className="text-right"
                value={formData.handler_name}
                onChange={(e) => setFormData({ ...formData, handler_name: e.target.value })}
                placeholder="הכנס שם מטפל"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_vendor_name" className="block text-right">שם הספק *</Label>
              <Input
                id="edit_vendor_name"
                className="text-right"
                value={formData.vendor_name}
                onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                placeholder="הכנס שם ספק"
              />
              {errors.vendor_name && (
                <p className="text-sm text-destructive text-right">{errors.vendor_name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_vendor_email" className="block text-right">אימייל הספק *</Label>
              <Input
                id="edit_vendor_email"
                type="email"
                className="text-right"
                dir="ltr"
                value={formData.vendor_email}
                onChange={(e) => setFormData({ ...formData, vendor_email: e.target.value })}
                placeholder="vendor@example.com"
              />
              {errors.vendor_email && (
                <p className="text-sm text-destructive text-right">{errors.vendor_email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_expected_spending" className="block text-right">סכום הוצאה צפויה (₪)</Label>
              <Input
                id="edit_expected_spending"
                type="number"
                className="text-right"
                value={formData.expected_spending || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  expected_spending: e.target.value ? Number(e.target.value) : null 
                })}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_approver_name" className="block text-right">שם המאשר</Label>
              <Input
                id="edit_approver_name"
                className="text-right"
                value={formData.approver_name}
                onChange={(e) => setFormData({ ...formData, approver_name: e.target.value })}
                placeholder="הכנס שם מאשר"
              />
            </div>

            <div className="space-y-2">
              <Label className="block text-right">סוג ספק</Label>
              <Select
                value={formData.vendor_type}
                onValueChange={(value: 'general' | 'claims') => {
                  setFormData({ 
                    ...formData, 
                    vendor_type: value,
                    claims_area: value === 'general' ? null : formData.claims_area
                  });
                }}
              >
                <SelectTrigger className="flex-row-reverse">
                  <SelectValue placeholder="בחר סוג ספק" className="text-right" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">ספק כללי</SelectItem>
                  <SelectItem value="claims">ספק תביעות</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.vendor_type === 'claims' && (
              <div className="space-y-2">
                <Label className="block text-right">אזור תביעות *</Label>
                <Select
                  value={formData.claims_area || ''}
                  onValueChange={(value) => setFormData({ ...formData, claims_area: value })}
                >
                  <SelectTrigger className="flex-row-reverse">
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
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 justify-end">
                <Label htmlFor="edit_quote_received" className="cursor-pointer">קיימת הצעת מחיר</Label>
                <Checkbox
                  id="edit_quote_received"
                  checked={formData.quote_received}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, quote_received: checked as boolean })
                  }
                />
              </div>

              <div className="flex items-center gap-2 justify-end">
                <Label htmlFor="edit_contract_signed" className="cursor-pointer">קיים הסכם</Label>
                <Checkbox
                  id="edit_contract_signed"
                  checked={formData.contract_signed}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, contract_signed: checked as boolean })
                  }
                />
              </div>

              <div className="flex items-center gap-2 justify-end">
                <Label htmlFor="edit_legal_approved" className="cursor-pointer">אישור משפטית</Label>
                <Checkbox
                  id="edit_legal_approved"
                  checked={formData.legal_approved}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, legal_approved: checked as boolean })
                  }
                />
              </div>

              <div className="flex items-center gap-2 justify-end">
                <Label htmlFor="edit_is_consultant" className="cursor-pointer">יועץ</Label>
                <Checkbox
                  id="edit_is_consultant"
                  checked={formData.is_consultant}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_consultant: checked as boolean })
                  }
                />
              </div>

              <div className="flex items-center gap-2 justify-end">
                <Label htmlFor="edit_is_sensitive" className="cursor-pointer">ספק רגיש</Label>
                <Checkbox
                  id="edit_is_sensitive"
                  checked={formData.is_sensitive}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_sensitive: checked as boolean })
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              ביטול
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  מעדכן...
                </>
              ) : (
                'עדכן בקשה'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
