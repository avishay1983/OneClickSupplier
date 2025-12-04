import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { z } from 'zod';

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
  approver_name: string;
  is_consultant: boolean;
  is_sensitive: boolean;
}

const emailSchema = z.string().email('כתובת אימייל לא תקינה');

export function NewRequestDialog({ open, onOpenChange, onSubmit }: NewRequestDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<NewRequestData>({
    vendor_name: '',
    vendor_email: '',
    expected_spending: null,
    quote_received: false,
    contract_signed: false,
    legal_approved: false,
    approver_name: '',
    is_consultant: false,
    is_sensitive: false,
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
      setFormData({
        vendor_name: '',
        vendor_email: '',
        expected_spending: null,
        quote_received: false,
        contract_signed: false,
        legal_approved: false,
        approver_name: '',
        is_consultant: false,
        is_sensitive: false,
      });
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">בקשה חדשה להקמת ספק</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="vendor_name">שם הספק *</Label>
              <Input
                id="vendor_name"
                value={formData.vendor_name}
                onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                placeholder="הכנס שם ספק"
              />
              {errors.vendor_name && (
                <p className="text-sm text-destructive">{errors.vendor_name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendor_email">אימייל הספק *</Label>
              <Input
                id="vendor_email"
                type="email"
                className="ltr text-right"
                value={formData.vendor_email}
                onChange={(e) => setFormData({ ...formData, vendor_email: e.target.value })}
                placeholder="vendor@example.com"
              />
              {errors.vendor_email && (
                <p className="text-sm text-destructive">{errors.vendor_email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="expected_spending">סכום הוצאה צפויה (₪)</Label>
              <Input
                id="expected_spending"
                type="number"
                value={formData.expected_spending || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  expected_spending: e.target.value ? Number(e.target.value) : null 
                })}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="approver_name">שם המאשר</Label>
              <Input
                id="approver_name"
                value={formData.approver_name}
                onChange={(e) => setFormData({ ...formData, approver_name: e.target.value })}
                placeholder="הכנס שם מאשר"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="quote_received"
                  checked={formData.quote_received}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, quote_received: checked as boolean })
                  }
                />
                <Label htmlFor="quote_received" className="cursor-pointer">קיימת הצעת מחיר</Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="contract_signed"
                  checked={formData.contract_signed}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, contract_signed: checked as boolean })
                  }
                />
                <Label htmlFor="contract_signed" className="cursor-pointer">קיים הסכם</Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="legal_approved"
                  checked={formData.legal_approved}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, legal_approved: checked as boolean })
                  }
                />
                <Label htmlFor="legal_approved" className="cursor-pointer">אושר משפטית</Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="is_consultant"
                  checked={formData.is_consultant}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, is_consultant: checked as boolean })
                  }
                />
                <Label htmlFor="is_consultant" className="cursor-pointer">ספק יועץ</Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="is_sensitive"
                  checked={formData.is_sensitive}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, is_sensitive: checked as boolean })
                  }
                />
                <Label htmlFor="is_sensitive" className="cursor-pointer">ספק רגיש</Label>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              ביטול
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'יוצר...' : 'צור בקשה וקבל קישור'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
