import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, CheckCircle2, XCircle, Clock, Mail, UserCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface ManagerApprovalStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendorRequestId: string | null;
  vendorName: string;
}

interface ApprovalStatus {
  handler_approved: boolean | null;
  handler_approved_at: string | null;
  handler_approved_by: string | null;
  procurement_manager_approved: boolean | null;
  procurement_manager_approved_at: string | null;
  procurement_manager_approved_by: string | null;
  vp_approved: boolean | null;
  vp_approved_at: string | null;
  vp_approved_by: string | null;
  approval_email_sent_at: string | null;
  requires_vp_approval: boolean;
}

export function ManagerApprovalStatusDialog({
  open,
  onOpenChange,
  vendorRequestId,
  vendorName,
}: ManagerApprovalStatusDialogProps) {
  const [status, setStatus] = useState<ApprovalStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sendingTarget, setSendingTarget] = useState<'all' | 'procurement_manager' | 'vp' | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchUserName = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      if (data?.full_name) setUserName(data.full_name);
    };
    fetchUserName();
  }, [user]);

  useEffect(() => {
    if (open && vendorRequestId) {
      fetchStatus();
    }
  }, [open, vendorRequestId]);

  const fetchStatus = async () => {
    if (!vendorRequestId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('vendor_requests')
        .select('first_review_approved, first_review_approved_at, first_review_approved_by, procurement_manager_approved, procurement_manager_approved_at, procurement_manager_approved_by, vp_approved, vp_approved_at, vp_approved_by, approval_email_sent_at, requires_vp_approval')
        .eq('id', vendorRequestId)
        .single();

      if (error) throw error;
      setStatus({
        handler_approved: data.first_review_approved,
        handler_approved_at: data.first_review_approved_at,
        handler_approved_by: data.first_review_approved_by,
        procurement_manager_approved: data.procurement_manager_approved,
        procurement_manager_approved_at: data.procurement_manager_approved_at,
        procurement_manager_approved_by: data.procurement_manager_approved_by,
        vp_approved: data.vp_approved,
        vp_approved_at: data.vp_approved_at,
        vp_approved_by: data.vp_approved_by,
        approval_email_sent_at: data.approval_email_sent_at,
        requires_vp_approval: data.requires_vp_approval ?? true,
      });
    } catch (error) {
      console.error('Error fetching approval status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleHandlerApproval = async () => {
    if (!vendorRequestId) return;
    
    setIsApproving(true);
    try {
      // Update handler approval
      const { error: updateError } = await supabase
        .from('vendor_requests')
        .update({
          first_review_approved: true,
          first_review_approved_at: new Date().toISOString(),
          first_review_approved_by: userName || 'מטפל',
        })
        .eq('id', vendorRequestId);

      if (updateError) throw updateError;

      // Send approval emails to managers
      const { data, error: emailError } = await supabase.functions.invoke('send-manager-approval', {
        body: { vendorRequestId },
      });

      if (emailError) throw emailError;
      if (data && !data.success) throw new Error(data.error);

      const approvalTargets = status?.requires_vp_approval ? 'למנהל הרכש ולסמנכ"ל' : 'למנהל הרכש';

      toast({
        title: 'הבקשה אושרה',
        description: `מייל אישור נשלח ${approvalTargets}`,
      });
      
      fetchStatus();
    } catch (error: any) {
      console.error('Error approving request:', error);
      toast({
        title: 'שגיאה',
        description: error.message || 'לא ניתן לאשר את הבקשה',
        variant: 'destructive',
      });
    } finally {
      setIsApproving(false);
    }
  };

  const sendApprovalEmails = async (targetRole?: 'procurement_manager' | 'vp', forceResend?: boolean) => {
    if (!vendorRequestId) return;
    
    setSendingTarget(targetRole || 'all');
    try {
      const { data, error } = await supabase.functions.invoke('send-manager-approval', {
        body: { vendorRequestId, targetRole, forceResend },
      });

      if (error) throw error;
      if (data && !data.success) throw new Error(data.error);

      const targetLabel = targetRole === 'procurement_manager' ? 'למנהל הרכש' : 
                          targetRole === 'vp' ? 'לסמנכ"ל' : 'למנהל הרכש ולסמנכ"ל';

      if (data.emailsSent === 0) {
        toast({
          title: 'לא נשלחו מיילים',
          description: 'כל המנהלים כבר אישרו או דחו את הבקשה',
        });
      } else {
        toast({
          title: 'המייל נשלח',
          description: `בקשת האישור נשלחה ${targetLabel}`,
        });
      }
      
      fetchStatus();
    } catch (error: any) {
      console.error('Error sending approval emails:', error);
      toast({
        title: 'שגיאה בשליחת המייל',
        description: error.message || 'לא ניתן לשלוח את המייל',
        variant: 'destructive',
      });
    } finally {
      setSendingTarget(null);
    }
  };

  const renderApprovalStatus = (
    label: string,
    role: 'procurement_manager' | 'vp',
    approved: boolean | null,
    approvedAt: string | null,
    approvedBy: string | null
  ) => {
    let statusBadge;
    let statusIcon;

    if (approved === null) {
      statusBadge = <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />ממתין לאישור</Badge>;
      statusIcon = <Clock className="h-8 w-8 text-muted-foreground" />;
    } else if (approved) {
      statusBadge = <Badge className="bg-success text-success-foreground gap-1"><CheckCircle2 className="h-3 w-3" />אושר</Badge>;
      statusIcon = <CheckCircle2 className="h-8 w-8 text-success" />;
    } else {
      statusBadge = <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />נדחה</Badge>;
      statusIcon = <XCircle className="h-8 w-8 text-destructive" />;
    }

    return (
      <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
        <div className="flex items-center gap-4">
          {statusIcon}
          <div>
            <h4 className="font-medium">{label}</h4>
            {approvedAt && (
              <p className="text-sm text-muted-foreground">
                {new Date(approvedAt).toLocaleDateString('he-IL')} בשעה {new Date(approvedAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
            {approvedBy && (
              <p className="text-sm text-muted-foreground">
                על ידי: {approvedBy}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {statusBadge}
          {status?.handler_approved && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => sendApprovalEmails(role, true)}
              disabled={sendingTarget !== null}
              title={`שלח מייל ל${label}`}
            >
              {sendingTarget === role ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>סטטוס אישור - {vendorName}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchStatus}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : status ? (
          <div className="space-y-4 py-4">
            {/* Handler Approval Step */}
            <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
              <div className="flex items-center gap-4">
                {status.handler_approved ? (
                  <CheckCircle2 className="h-8 w-8 text-success" />
                ) : (
                  <Clock className="h-8 w-8 text-muted-foreground" />
                )}
                <div>
                  <h4 className="font-medium">אישור מטפל בבקשה</h4>
                  {status.handler_approved_at && (
                    <p className="text-sm text-muted-foreground">
                      {new Date(status.handler_approved_at).toLocaleDateString('he-IL')} בשעה {new Date(status.handler_approved_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                  {status.handler_approved_by && (
                    <p className="text-sm text-muted-foreground">
                      על ידי: {status.handler_approved_by}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {status.handler_approved ? (
                  <Badge className="bg-success text-success-foreground gap-1">
                    <CheckCircle2 className="h-3 w-3" />אושר
                  </Badge>
                ) : (
                  <Button
                    onClick={handleHandlerApproval}
                    disabled={isApproving}
                    size="sm"
                  >
                    {isApproving ? (
                      <>
                        <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                        מאשר...
                      </>
                    ) : (
                      <>
                        <UserCheck className="h-4 w-4 ml-2" />
                        אשר ושלח למנהלים
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Manager Approvals - only show after handler approval */}
            {status.handler_approved && (
              <>
                {status.approval_email_sent_at && (
                  <p className="text-sm text-muted-foreground text-center">
                    מייל אישור נשלח בתאריך: {new Date(status.approval_email_sent_at).toLocaleDateString('he-IL')}
                  </p>
                )}
                
                {renderApprovalStatus(
                  'מנהל רכש',
                  'procurement_manager',
                  status.procurement_manager_approved,
                  status.procurement_manager_approved_at,
                  status.procurement_manager_approved_by
                )}
                
                {/* Only show VP approval if requires_vp_approval is true */}
                {status.requires_vp_approval && renderApprovalStatus(
                  'סמנכ"ל',
                  'vp',
                  status.vp_approved,
                  status.vp_approved_at,
                  status.vp_approved_by
                )}

                {/* Show resend button based on approval requirements */}
                {status.requires_vp_approval ? (
                  (status.procurement_manager_approved === null || status.vp_approved === null) && (
                    <Button
                      onClick={() => sendApprovalEmails()}
                      disabled={sendingTarget !== null}
                      className="w-full mt-4"
                      variant="outline"
                    >
                      {sendingTarget === 'all' ? (
                        <>
                          <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                          שולח...
                        </>
                      ) : (
                        <>
                          <Mail className="h-4 w-4 ml-2" />
                          שלח מייל לכל הממתינים
                        </>
                      )}
                    </Button>
                  )
                ) : (
                  status.procurement_manager_approved === null && (
                    <Button
                      onClick={() => sendApprovalEmails('procurement_manager')}
                      disabled={sendingTarget !== null}
                      className="w-full mt-4"
                      variant="outline"
                    >
                      {sendingTarget === 'procurement_manager' ? (
                        <>
                          <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                          שולח...
                        </>
                      ) : (
                        <>
                          <Mail className="h-4 w-4 ml-2" />
                          שלח מייל למנהל הרכש
                        </>
                      )}
                    </Button>
                  )
                )}
              </>
            )}

            {!status.handler_approved && (
              <p className="text-sm text-muted-foreground text-center border-t pt-4">
                {status.requires_vp_approval 
                  ? 'יש לאשר את הבקשה כדי לשלוח מייל למנהל הרכש ולסמנכ"ל'
                  : 'יש לאשר את הבקשה כדי לשלוח מייל למנהל הרכש'}
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            לא ניתן לטעון את סטטוס האישור
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
