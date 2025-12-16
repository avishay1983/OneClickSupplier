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
import { Loader2, CheckCircle, XCircle, RotateCcw, Mail, FileText, AlertCircle, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { ViewDocumentsDialog } from './ViewDocumentsDialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface HandlerApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendorRequestId: string | null;
  vendorName: string;
  vendorEmail: string;
  onActionComplete: () => void;
}

interface VendorRequestData {
  requires_contract_signature: boolean | null;
  contract_file_path: string | null;
  expires_at: string | null;
  created_at: string;
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
  const [selectedAction, setSelectedAction] = useState<'approve' | 'reject' | 'resend' | null>(null);
  const [resendReason, setResendReason] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [userName, setUserName] = useState<string | null>(null);
  const [showDocuments, setShowDocuments] = useState(false);
  const [vendorRequestData, setVendorRequestData] = useState<VendorRequestData | null>(null);
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

  // Fetch vendor request data to check contract status and original expiry
  useEffect(() => {
    const fetchVendorRequest = async () => {
      if (!vendorRequestId || !open) return;
      const { data } = await supabase
        .from('vendor_requests')
        .select('requires_contract_signature, contract_file_path, expires_at, created_at')
        .eq('id', vendorRequestId)
        .single();
      if (data) setVendorRequestData(data);
    };
    fetchVendorRequest();
    // Reset states when dialog opens
    setSelectedAction(null);
    setRejectReason('');
    setResendReason('');
  }, [vendorRequestId, open]);

  // Check if approval is blocked due to missing contract
  const requiresContract = vendorRequestData?.requires_contract_signature === true;
  const contractUploaded = !!vendorRequestData?.contract_file_path;
  const canApprove = !requiresContract || contractUploaded;

  const handleApprove = async () => {
    if (!vendorRequestId || !canApprove) return;
    
    setIsLoading(true);
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

      // Send emails with contract to managers for signing
      const { data, error: emailError } = await supabase.functions.invoke('send-manager-approval', {
        body: { vendorRequestId },
      });

      if (emailError) throw emailError;
      if (data && !data.success) throw new Error(data.error);

      toast({
        title: 'הבקשה אושרה',
        description: 'מייל עם הצעת המחיר נשלח למנהל הרכש ולסמנכ"ל לחתימה',
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
    }
  };

  const handleReject = async () => {
    if (!vendorRequestId) return;
    if (!rejectReason.trim()) {
      toast({
        title: 'שגיאה',
        description: 'יש להזין סיבת דחייה',
        variant: 'destructive',
      });
      return;
    }
    
    setIsLoading(true);
    try {
      // Update status to rejected and save reason
      const { error: updateError } = await supabase
        .from('vendor_requests')
        .update({
          status: 'rejected',
          first_review_approved: false,
          first_review_approved_at: new Date().toISOString(),
          first_review_approved_by: userName || 'מטפל',
          handler_rejection_reason: rejectReason,
        })
        .eq('id', vendorRequestId);

      if (updateError) throw updateError;

      // Send rejection email to vendor
      const { error: emailError } = await supabase.functions.invoke('send-vendor-rejection', {
        body: { 
          vendorRequestId,
          reason: rejectReason,
        },
      });

      if (emailError) {
        console.error('Error sending rejection email:', emailError);
      }

      toast({
        title: 'הבקשה נדחתה',
        description: 'הספק יקבל הודעה במייל על הדחייה',
      });
      
      onOpenChange(false);
      onActionComplete();
      setRejectReason('');
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      toast({
        title: 'שגיאה',
        description: error.message || 'לא ניתן לדחות את הבקשה',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
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
    try {
      // Calculate original expiry duration and apply it again
      let expiresAt: string;
      if (vendorRequestData?.expires_at && vendorRequestData?.created_at) {
        const originalDuration = new Date(vendorRequestData.expires_at).getTime() - new Date(vendorRequestData.created_at).getTime();
        expiresAt = new Date(Date.now() + originalDuration).toISOString();
      } else {
        expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      }
      
      const { error: updateError } = await supabase
        .from('vendor_requests')
        .update({
          status: 'resent',
          handler_rejection_reason: resendReason,
          expires_at: expiresAt,
          otp_verified: false,
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
    }
  };

  const handleExecuteAction = () => {
    if (selectedAction === 'approve') handleApprove();
    else if (selectedAction === 'reject') handleReject();
    else if (selectedAction === 'resend') handleResend();
  };

  const getActionButtonText = () => {
    if (isLoading) {
      if (selectedAction === 'approve') return 'מאשר...';
      if (selectedAction === 'reject') return 'דוחה...';
      if (selectedAction === 'resend') return 'שולח...';
    }
    if (selectedAction === 'approve') return 'אשר את הבקשה';
    if (selectedAction === 'reject') return 'דחה את הבקשה';
    if (selectedAction === 'resend') return 'שלח מחדש לספק';
    return 'בחר פעולה';
  };

  const canExecute = () => {
    if (!selectedAction) return false;
    if (selectedAction === 'approve') return canApprove;
    if (selectedAction === 'reject') return rejectReason.trim().length > 0;
    if (selectedAction === 'resend') return resendReason.trim().length > 0;
    return false;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]" dir="rtl">
        <DialogHeader>
          <DialogTitle>בקרה ראשונה - {vendorName}</DialogTitle>
          <DialogDescription>
            בחר פעולה לביצוע על בקשת הספק
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* View Documents Button */}
          <Button 
            onClick={() => setShowDocuments(true)}
            variant="outline"
            className="w-full justify-start gap-3 h-auto py-3"
          >
            <FileText className="h-5 w-5 text-primary" />
            <div className="text-right">
              <div className="font-medium">צפה במסמכים ובפרטים</div>
              <div className="text-sm text-muted-foreground">צפה במסמכים ובפרטים שהספק עדכן</div>
            </div>
          </Button>

          {/* Contract Required Warning */}
          {requiresContract && !contractUploaded && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                לא ניתן לאשר את הבקשה - הספק טרם העלה את הצעת המחיר החתומה
              </AlertDescription>
            </Alert>
          )}

          {/* Action Cards */}
          <div className="space-y-3">
            {/* Approve Card */}
            <div
              onClick={() => canApprove && setSelectedAction('approve')}
              className={cn(
                "p-4 rounded-xl border-2 transition-all",
                canApprove ? "cursor-pointer" : "cursor-not-allowed opacity-50",
                selectedAction === 'approve'
                  ? "border-green-500 bg-green-50 dark:bg-green-950"
                  : canApprove 
                    ? "border-border hover:border-green-300 hover:bg-green-50/50 dark:hover:bg-green-950/50"
                    : "border-muted bg-muted/30"
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "p-2 rounded-full",
                  selectedAction === 'approve' ? "bg-green-200 dark:bg-green-800" : "bg-green-100 dark:bg-green-900"
                )}>
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg">אשר את הבקשה</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {requiresContract 
                      ? 'הצעת המחיר תישלח למנהל רכש ולסמנכ"ל לחתימה דיגיטלית'
                      : 'הבקשה תועבר לאישור מנהל רכש וסמנכ"ל'}
                  </p>
                </div>
                {selectedAction === 'approve' && (
                  <Check className="h-5 w-5 text-green-600" />
                )}
              </div>
            </div>

            {/* Reject Card */}
            <div
              onClick={() => setSelectedAction('reject')}
              className={cn(
                "p-4 rounded-xl border-2 cursor-pointer transition-all",
                selectedAction === 'reject'
                  ? "border-red-500 bg-red-50 dark:bg-red-950"
                  : "border-border hover:border-red-300 hover:bg-red-50/50 dark:hover:bg-red-950/50"
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "p-2 rounded-full",
                  selectedAction === 'reject' ? "bg-red-200 dark:bg-red-800" : "bg-red-100 dark:bg-red-900"
                )}>
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg">דחה את הבקשה</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    הספק יקבל מייל עם הודעה ליצור קשר עם המטפל
                  </p>
                </div>
                {selectedAction === 'reject' && (
                  <Check className="h-5 w-5 text-red-600" />
                )}
              </div>
              
              {/* Reject Reason - Only shown when selected */}
              {selectedAction === 'reject' && (
                <div className="mt-4 space-y-2">
                  <Label htmlFor="rejectReason">סיבת הדחייה (לשימוש פנימי) *</Label>
                  <Textarea
                    id="rejectReason"
                    placeholder="הזן את סיבת הדחייה..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={2}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              )}
            </div>

            {/* Resend Card */}
            <div
              onClick={() => setSelectedAction('resend')}
              className={cn(
                "p-4 rounded-xl border-2 cursor-pointer transition-all",
                selectedAction === 'resend'
                  ? "border-orange-500 bg-orange-50 dark:bg-orange-950"
                  : "border-border hover:border-orange-300 hover:bg-orange-50/50 dark:hover:bg-orange-950/50"
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "p-2 rounded-full",
                  selectedAction === 'resend' ? "bg-orange-200 dark:bg-orange-800" : "bg-orange-100 dark:bg-orange-900"
                )}>
                  <RotateCcw className="h-6 w-6 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg">שלח מחדש לספק</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    הספק יקבל מייל חדש עם אפשרות לערוך ולשלוח שוב
                  </p>
                </div>
                {selectedAction === 'resend' && (
                  <Check className="h-5 w-5 text-orange-600" />
                )}
              </div>
              
              {/* Resend Reason - Only shown when selected */}
              {selectedAction === 'resend' && (
                <div className="mt-4 space-y-2">
                  <Label htmlFor="resendReason">הסבר לספק *</Label>
                  <Textarea
                    id="resendReason"
                    placeholder="הזן הסבר מה הספק צריך לתקן..."
                    value={resendReason}
                    onChange={(e) => setResendReason(e.target.value)}
                    rows={2}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Single Action Button */}
          <Button 
            onClick={handleExecuteAction}
            disabled={!canExecute() || isLoading}
            className={cn(
              "w-full h-12 text-base",
              selectedAction === 'approve' && "bg-green-600 hover:bg-green-700",
              selectedAction === 'reject' && "bg-red-600 hover:bg-red-700",
              selectedAction === 'resend' && "bg-orange-600 hover:bg-orange-700"
            )}
          >
            {isLoading && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
            {getActionButtonText()}
          </Button>
        </div>
      </DialogContent>

      {/* View Documents Dialog */}
      {vendorRequestId && (
        <ViewDocumentsDialog
          open={showDocuments}
          onOpenChange={setShowDocuments}
          vendorRequestId={vendorRequestId}
          vendorName={vendorName}
        />
      )}
    </Dialog>
  );
}
