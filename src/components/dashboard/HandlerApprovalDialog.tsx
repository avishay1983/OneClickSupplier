import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle, XCircle, RotateCcw, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface HandlerApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendorRequestId: string | null;
  vendorName: string;
  vendorEmail: string;
  onActionComplete: () => void;
}

export function HandlerApprovalDialog({
  open,
  onOpenChange,
  vendorRequestId,
  vendorName,
  vendorEmail,
  onActionComplete,
}: HandlerApprovalDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [action, setAction] = useState<'approve' | 'reject' | 'resend' | null>(null);
  const [resendReason, setResendReason] = useState('');
  const [userName, setUserName] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchUserName = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();
      if (data?.full_name) setUserName(data.full_name);
    };
    fetchUserName();
  }, [user]);

  const handleApprove = async () => {
    if (!vendorRequestId) return;
    
    setIsLoading(true);
    setAction('approve');
    try {
      // Update handler approval and change status to submitted
      const { error: updateError } = await supabase
        .from('vendor_requests')
        .update({
          first_review_approved: true,
          first_review_approved_at: new Date().toISOString(),
          first_review_approved_by: userName || 'מטפל',
          status: 'submitted',
        })
        .eq('id', vendorRequestId);

      if (updateError) throw updateError;

      // Send approval emails to managers
      const { data, error: emailError } = await supabase.functions.invoke('send-manager-approval', {
        body: { vendorRequestId },
      });

      if (emailError) throw emailError;
      if (data && !data.success) throw new Error(data.error);

      toast({
        title: 'הבקשה אושרה',
        description: 'מייל אישור נשלח למנהל הרכש ולסמנכ"ל',
      });
      
      onOpenChange(false);
      onActionComplete();
    } catch (error: any) {
      console.error('Error approving request:', error);
      toast({
        title: 'שגיאה',
        description: error.message || 'לא ניתן לאשר את הבקשה',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setAction(null);
    }
  };

  const handleReject = async () => {
    if (!vendorRequestId) return;
    
    setIsLoading(true);
    setAction('reject');
    try {
      const { error: updateError } = await supabase
        .from('vendor_requests')
        .update({
          first_review_approved: false,
          first_review_approved_at: new Date().toISOString(),
          first_review_approved_by: userName || 'מטפל',
        })
        .eq('id', vendorRequestId);

      if (updateError) throw updateError;

      toast({
        title: 'הבקשה נדחתה',
        description: 'הבקשה נדחתה על ידי המטפל',
      });
      
      onOpenChange(false);
      onActionComplete();
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      toast({
        title: 'שגיאה',
        description: error.message || 'לא ניתן לדחות את הבקשה',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setAction(null);
    }
  };

  const handleResend = async () => {
    if (!vendorRequestId) return;
    if (!resendReason.trim()) {
      toast({
        title: 'שגיאה',
        description: 'יש להזין סיבה לשליחה מחדש',
        variant: 'destructive',
      });
      return;
    }
    
    setIsLoading(true);
    setAction('resend');
    try {
      // Update status to resent and save reason
      const { error: updateError } = await supabase
        .from('vendor_requests')
        .update({
          status: 'resent',
          handler_rejection_reason: resendReason,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('id', vendorRequestId);

      if (updateError) throw updateError;

      // Send email to vendor with reason
      const { error: emailError } = await supabase.functions.invoke('send-vendor-email', {
        body: { 
          vendorRequestId,
          includeReason: true,
          reason: resendReason,
        },
      });

      if (emailError) throw emailError;

      toast({
        title: 'נשלח מחדש',
        description: 'הטופס נשלח מחדש לספק עם ההסבר',
      });
      
      onOpenChange(false);
      onActionComplete();
      setResendReason('');
    } catch (error: any) {
      console.error('Error resending to vendor:', error);
      toast({
        title: 'שגיאה',
        description: error.message || 'לא ניתן לשלוח מחדש',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setAction(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" dir="rtl">
        <DialogHeader>
          <DialogTitle>בקרה ראשונה - {vendorName}</DialogTitle>
          <DialogDescription>
            בחר פעולה לביצוע על בקשת הספק
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Approve Button */}
          <div className="p-4 border rounded-lg bg-success/10 border-success/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-6 w-6 text-success" />
                <div>
                  <h4 className="font-medium">אשר ושלח למנהלים</h4>
                  <p className="text-sm text-muted-foreground">
                    הבקשה תועבר לאישור מנהל רכש וסמנכ"ל
                  </p>
                </div>
              </div>
              <Button 
                onClick={handleApprove}
                disabled={isLoading}
                className="bg-success hover:bg-success/90"
              >
                {action === 'approve' ? (
                  <>
                    <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                    מאשר...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 ml-2" />
                    אשר
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Reject Button */}
          <div className="p-4 border rounded-lg bg-destructive/10 border-destructive/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <XCircle className="h-6 w-6 text-destructive" />
                <div>
                  <h4 className="font-medium">דחה בקשה</h4>
                  <p className="text-sm text-muted-foreground">
                    הבקשה תידחה ולא תועבר למנהלים
                  </p>
                </div>
              </div>
              <Button 
                onClick={handleReject}
                disabled={isLoading}
                variant="destructive"
              >
                {action === 'reject' ? (
                  <>
                    <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                    דוחה...
                  </>
                ) : (
                  'דחה'
                )}
              </Button>
            </div>
          </div>

          {/* Resend to Vendor */}
          <div className="p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-3 mb-4">
              <RotateCcw className="h-6 w-6 text-muted-foreground" />
              <div>
                <h4 className="font-medium">שלח מחדש לספק</h4>
                <p className="text-sm text-muted-foreground">
                  הספק יקבל מייל עם הסבר ויוכל לתקן את הטופס
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="resendReason">סיבה לשליחה מחדש *</Label>
                <Textarea
                  id="resendReason"
                  placeholder="הסבר לספק למה הוא צריך לתקן את הטופס..."
                  value={resendReason}
                  onChange={(e) => setResendReason(e.target.value)}
                  rows={3}
                />
              </div>
              <Button 
                onClick={handleResend}
                disabled={isLoading || !resendReason.trim()}
                variant="outline"
                className="w-full"
              >
                {action === 'resend' ? (
                  <>
                    <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                    שולח...
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-4 w-4 ml-2" />
                    שלח מחדש לספק
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
