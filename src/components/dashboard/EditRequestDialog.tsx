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
import { Loader2, Check } from 'lucide-react';
import { format } from 'date-fns';

interface EditRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: VendorRequest | null;
  onSuccess: () => void;
  currentUserName?: string;
}

export function EditRequestDialog({ open, onOpenChange, request, onSuccess, currentUserName }: EditRequestDialogProps) {
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
  
  // Approval workflow state
  const [approvalData, setApprovalData] = useState({
    first_review_approved: false,
    first_review_approved_at: null as string | null,
    first_review_approved_by: null as string | null,
    first_signature_approved: false,
    first_signature_approved_at: null as string | null,
    first_signature_approved_by: null as string | null,
    second_signature_approved: false,
    second_signature_approved_at: null as string | null,
    second_signature_approved_by: null as string | null,
  });
  const [approvingStep, setApprovingStep] = useState<string | null>(null);

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
      
      // Load approval workflow data
      setApprovalData({
        first_review_approved: (request as any).first_review_approved || false,
        first_review_approved_at: (request as any).first_review_approved_at || null,
        first_review_approved_by: (request as any).first_review_approved_by || null,
        first_signature_approved: (request as any).first_signature_approved || false,
        first_signature_approved_at: (request as any).first_signature_approved_at || null,
        first_signature_approved_by: (request as any).first_signature_approved_by || null,
        second_signature_approved: (request as any).second_signature_approved || false,
        second_signature_approved_at: (request as any).second_signature_approved_at || null,
        second_signature_approved_by: (request as any).second_signature_approved_by || null,
      });
      
      setErrors({});
    }
  }, [request]);

  const handleApprove = async (step: 'first_review' | 'first_signature' | 'second_signature') => {
    if (!request) return;
    
    setApprovingStep(step);
    try {
      const now = new Date().toISOString();
      const approverName = currentUserName || 'משתמש';
      
      const updateData: any = {};
      
      if (step === 'first_review') {
        updateData.first_review_approved = true;
        updateData.first_review_approved_at = now;
        updateData.first_review_approved_by = approverName;
      } else if (step === 'first_signature') {
        updateData.first_signature_approved = true;
        updateData.first_signature_approved_at = now;
        updateData.first_signature_approved_by = approverName;
      } else if (step === 'second_signature') {
        updateData.second_signature_approved = true;
        updateData.second_signature_approved_at = now;
        updateData.second_signature_approved_by = approverName;
        // Also update status to approved when all steps are complete
        updateData.status = 'approved';
      }
      
      const { error } = await supabase
        .from('vendor_requests')
        .update(updateData)
        .eq('id', request.id);
      
      if (error) throw error;
      
      // Update local state
      if (step === 'first_review') {
        setApprovalData(prev => ({
          ...prev,
          first_review_approved: true,
          first_review_approved_at: now,
          first_review_approved_by: approverName,
        }));
      } else if (step === 'first_signature') {
        setApprovalData(prev => ({
          ...prev,
          first_signature_approved: true,
          first_signature_approved_at: now,
          first_signature_approved_by: approverName,
        }));
      } else if (step === 'second_signature') {
        setApprovalData(prev => ({
          ...prev,
          second_signature_approved: true,
          second_signature_approved_at: now,
          second_signature_approved_by: approverName,
        }));
      }
      
      toast({
        title: 'אושר בהצלחה',
        description: step === 'second_signature' ? 'הבקשה אושרה סופית' : 'השלב אושר בהצלחה',
      });
      
      onSuccess();
    } catch (error: any) {
      console.error('Error approving step:', error);
      toast({
        title: 'שגיאה',
        description: error.message || 'אירעה שגיאה באישור',
        variant: 'destructive',
      });
    } finally {
      setApprovingStep(null);
    }
  };

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

  const formatApprovalDate = (dateString: string | null) => {
    if (!dateString) return '';
    return format(new Date(dateString), 'dd/MM/yyyy HH:mm');
  };

  const isSubmittedStatus = request?.status === 'submitted';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl">עריכת בקשת ספק</DialogTitle>
        </DialogHeader>
        
        {/* Approval Workflow Section - Only for submitted status */}
        {isSubmittedStatus && (
          <div className="border rounded-lg p-4 mb-4 bg-muted/30">
            <h3 className="font-semibold text-lg mb-4 text-right">תהליך אישור</h3>
            <div className="space-y-4">
              {/* First Review */}
              <div className="flex items-center justify-between gap-4 p-3 border rounded-md bg-background">
                <div className="flex-1 text-right">
                  <div className="font-medium">בקרה ראשונה</div>
                  {approvalData.first_review_approved && (
                    <div className="text-sm text-muted-foreground">
                      אושר ע"י {approvalData.first_review_approved_by} בתאריך {formatApprovalDate(approvalData.first_review_approved_at)}
                    </div>
                  )}
                </div>
                {approvalData.first_review_approved ? (
                  <Button variant="outline" disabled className="gap-2 bg-green-50 border-green-200 text-green-700">
                    <Check className="h-4 w-4" />
                    אושר
                  </Button>
                ) : (
                  <Button 
                    onClick={() => handleApprove('first_review')}
                    disabled={approvingStep !== null}
                  >
                    {approvingStep === 'first_review' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'אישור'
                    )}
                  </Button>
                )}
              </div>

              {/* First Signature */}
              <div className="flex items-center justify-between gap-4 p-3 border rounded-md bg-background">
                <div className="flex-1 text-right">
                  <div className="font-medium">חתימה ראשונה</div>
                  {approvalData.first_signature_approved && (
                    <div className="text-sm text-muted-foreground">
                      אושר ע"י {approvalData.first_signature_approved_by} בתאריך {formatApprovalDate(approvalData.first_signature_approved_at)}
                    </div>
                  )}
                </div>
                {approvalData.first_signature_approved ? (
                  <Button variant="outline" disabled className="gap-2 bg-green-50 border-green-200 text-green-700">
                    <Check className="h-4 w-4" />
                    אושר
                  </Button>
                ) : (
                  <Button 
                    onClick={() => handleApprove('first_signature')}
                    disabled={approvingStep !== null || !approvalData.first_review_approved}
                    variant={!approvalData.first_review_approved ? 'outline' : 'default'}
                  >
                    {approvingStep === 'first_signature' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'אישור'
                    )}
                  </Button>
                )}
              </div>

              {/* Second Signature */}
              <div className="flex items-center justify-between gap-4 p-3 border rounded-md bg-background">
                <div className="flex-1 text-right">
                  <div className="font-medium">חתימה שניה</div>
                  {approvalData.second_signature_approved && (
                    <div className="text-sm text-muted-foreground">
                      אושר ע"י {approvalData.second_signature_approved_by} בתאריך {formatApprovalDate(approvalData.second_signature_approved_at)}
                    </div>
                  )}
                </div>
                {approvalData.second_signature_approved ? (
                  <Button variant="outline" disabled className="gap-2 bg-green-50 border-green-200 text-green-700">
                    <Check className="h-4 w-4" />
                    אושר
                  </Button>
                ) : (
                  <Button 
                    onClick={() => handleApprove('second_signature')}
                    disabled={approvingStep !== null || !approvalData.first_signature_approved}
                    variant={!approvalData.first_signature_approved ? 'outline' : 'default'}
                  >
                    {approvingStep === 'second_signature' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'אישור'
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
        
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