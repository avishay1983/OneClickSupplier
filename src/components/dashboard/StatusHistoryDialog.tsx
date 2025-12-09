import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Clock, FileText, CheckCircle } from 'lucide-react';
import { STATUS_LABELS, VendorStatus } from '@/types/vendor';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

interface StatusHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendorName: string;
  status: VendorStatus;
  createdAt: string;
  updatedAt: string;
}

export function StatusHistoryDialog({
  open,
  onOpenChange,
  vendorName,
  status,
  createdAt,
  updatedAt,
}: StatusHistoryDialogProps) {
  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), 'dd/MM/yyyy בשעה HH:mm', { locale: he });
  };

  const getStatusInfo = (currentStatus: VendorStatus) => {
    switch (currentStatus) {
      case 'pending':
      case 'with_vendor':
      case 'resent':
        return {
          label: 'ממתין למילוי פרטים',
          icon: <Clock className="h-4 w-4" />,
          color: 'text-amber-500',
          bgColor: 'bg-amber-500'
        };
      case 'submitted':
        return {
          label: 'בבדיקה',
          icon: <FileText className="h-4 w-4" />,
          color: 'text-blue-500',
          bgColor: 'bg-blue-500'
        };
      case 'approved':
        return {
          label: 'אושר',
          icon: <CheckCircle className="h-4 w-4" />,
          color: 'text-green-500',
          bgColor: 'bg-green-500'
        };
      default:
        return {
          label: STATUS_LABELS[currentStatus] || currentStatus,
          icon: <Clock className="h-4 w-4" />,
          color: 'text-muted-foreground',
          bgColor: 'bg-muted-foreground'
        };
    }
  };

  const currentStatusInfo = getStatusInfo(status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">היסטוריית בקשה - {vendorName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Current Status */}
          <div className="text-center p-4 rounded-lg bg-muted/50 border">
            <div className={`mx-auto mb-2 ${currentStatusInfo.color}`}>
              {currentStatusInfo.icon}
            </div>
            <p className="font-semibold">{currentStatusInfo.label}</p>
          </div>

          {/* Timeline */}
          <div className="border-t pt-4 space-y-4">
            <h4 className="font-semibold text-sm mb-4">היסטוריית הבקשה</h4>
            
            {/* Created */}
            <div className="flex items-start gap-4">
              <div className="w-3 h-3 rounded-full bg-green-500 mt-1.5 flex-shrink-0"></div>
              <div>
                <p className="font-medium">הבקשה נוצרה</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(createdAt)}
                </p>
              </div>
            </div>

            {/* Submitted */}
            {(status === 'submitted' || status === 'approved') && (
              <div className="flex items-start gap-4">
                <div className="w-3 h-3 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>
                <div>
                  <p className="font-medium">פרטים הוגשו</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(updatedAt)}
                  </p>
                </div>
              </div>
            )}

            {/* Approved */}
            {status === 'approved' && (
              <div className="flex items-start gap-4">
                <div className="w-3 h-3 rounded-full bg-green-500 mt-1.5 flex-shrink-0"></div>
                <div>
                  <p className="font-medium">הבקשה אושרה</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(updatedAt)}
                  </p>
                </div>
              </div>
            )}

            {/* Resent */}
            {status === 'resent' && (
              <div className="flex items-start gap-4">
                <div className="w-3 h-3 rounded-full bg-amber-500 mt-1.5 flex-shrink-0"></div>
                <div>
                  <p className="font-medium">הטופס נשלח מחדש</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(updatedAt)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
