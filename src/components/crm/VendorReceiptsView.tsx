import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  Loader2, 
  FileText, 
  Download, 
  CheckCircle, 
  XCircle, 
  Clock, 
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

interface Receipt {
  id: string;
  vendor_request_id: string;
  file_path: string;
  file_name: string;
  amount: number;
  receipt_date: string;
  description: string | null;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

interface VendorReceiptsViewProps {
  vendorRequestId: string;
  vendorName: string;
  currentUserName: string;
  onUpdate?: () => void;
}

const STATUS_CONFIG = {
  pending: { label: 'ממתין', icon: Clock, color: 'bg-warning text-warning-foreground' },
  approved: { label: 'אושר', icon: CheckCircle, color: 'bg-success text-success-foreground' },
  rejected: { label: 'נדחה', icon: XCircle, color: 'bg-destructive text-destructive-foreground' },
};

export function VendorReceiptsView({ 
  vendorRequestId, 
  vendorName, 
  currentUserName,
  onUpdate 
}: VendorReceiptsViewProps) {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchReceipts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('vendor_receipts')
        .select('*')
        .eq('vendor_request_id', vendorRequestId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReceipts(data as Receipt[]);
    } catch (error) {
      console.error('Error fetching receipts:', error);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן לטעון את הקבלות',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, [vendorRequestId]);

  const handleDownload = async (receipt: Receipt) => {
    try {
      const { data, error } = await supabase.storage
        .from('vendor_documents')
        .download(receipt.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = receipt.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading receipt:', error);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן להוריד את הקובץ',
        variant: 'destructive',
      });
    }
  };

  const handleApprove = async (receipt: Receipt) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('vendor_receipts')
        .update({
          status: 'approved',
          reviewed_by: currentUserName,
          reviewed_at: new Date().toISOString(),
          rejection_reason: null,
        })
        .eq('id', receipt.id);

      if (error) throw error;

      toast({
        title: 'הקבלה אושרה',
        description: `קבלה בסכום ₪${receipt.amount.toLocaleString()} אושרה`,
      });

      fetchReceipts();
      onUpdate?.();
    } catch (error) {
      console.error('Error approving receipt:', error);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן לאשר את הקבלה',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReject = async () => {
    if (!selectedReceipt || !rejectionReason.trim()) {
      toast({
        title: 'שגיאה',
        description: 'יש להזין סיבת דחייה',
        variant: 'destructive',
      });
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('vendor_receipts')
        .update({
          status: 'rejected',
          reviewed_by: currentUserName,
          reviewed_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
        })
        .eq('id', selectedReceipt.id);

      if (error) throw error;

      toast({
        title: 'הקבלה נדחתה',
        description: 'הקבלה נדחתה והספק יקבל הודעה',
      });

      setRejectDialogOpen(false);
      setSelectedReceipt(null);
      setRejectionReason('');
      fetchReceipts();
      onUpdate?.();
    } catch (error) {
      console.error('Error rejecting receipt:', error);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן לדחות את הקבלה',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const totalAmount = receipts.reduce((sum, r) => sum + r.amount, 0);
  const approvedAmount = receipts.filter(r => r.status === 'approved').reduce((sum, r) => sum + r.amount, 0);
  const pendingAmount = receipts.filter(r => r.status === 'pending').reduce((sum, r) => sum + r.amount, 0);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-muted rounded-lg text-center">
          <p className="text-sm text-muted-foreground">סה"כ קבלות</p>
          <p className="text-2xl font-bold">{receipts.length}</p>
          <p className="text-sm text-muted-foreground">₪{totalAmount.toLocaleString()}</p>
        </div>
        <div className="p-4 bg-success/10 rounded-lg text-center">
          <p className="text-sm text-muted-foreground">אושרו</p>
          <p className="text-2xl font-bold text-success">{receipts.filter(r => r.status === 'approved').length}</p>
          <p className="text-sm text-success">₪{approvedAmount.toLocaleString()}</p>
        </div>
        <div className="p-4 bg-warning/10 rounded-lg text-center">
          <p className="text-sm text-muted-foreground">ממתינות</p>
          <p className="text-2xl font-bold text-warning">{receipts.filter(r => r.status === 'pending').length}</p>
          <p className="text-sm text-warning">₪{pendingAmount.toLocaleString()}</p>
        </div>
      </div>

      {/* Refresh button */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={fetchReceipts} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          רענן
        </Button>
      </div>

      {/* Receipts Table */}
      {receipts.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>אין קבלות להצגה</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">קובץ</TableHead>
              <TableHead className="text-right">סכום</TableHead>
              <TableHead className="text-right">תאריך</TableHead>
              <TableHead className="text-right">תיאור</TableHead>
              <TableHead className="text-right">סטטוס</TableHead>
              <TableHead className="text-right">פעולות</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {receipts.map((receipt) => {
              const statusConfig = STATUS_CONFIG[receipt.status];
              const StatusIcon = statusConfig.icon;
              
              return (
                <TableRow key={receipt.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{receipt.file_name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    ₪{receipt.amount.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {format(new Date(receipt.receipt_date), 'dd/MM/yyyy', { locale: he })}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {receipt.description || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusConfig.color}>
                      <StatusIcon className="h-3 w-3 ml-1" />
                      {statusConfig.label}
                    </Badge>
                    {receipt.status === 'rejected' && receipt.rejection_reason && (
                      <p className="text-xs text-destructive mt-1">{receipt.rejection_reason}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(receipt)}
                        title="הורדה"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      {receipt.status === 'pending' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleApprove(receipt)}
                            disabled={isUpdating}
                            className="text-success hover:text-success"
                            title="אשר"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedReceipt(receipt);
                              setRejectDialogOpen(true);
                            }}
                            disabled={isUpdating}
                            className="text-destructive hover:text-destructive"
                            title="דחה"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>דחיית קבלה</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              האם אתה בטוח שברצונך לדחות קבלה זו?
            </p>
            {selectedReceipt && (
              <div className="p-3 bg-muted rounded-lg">
                <p><strong>קובץ:</strong> {selectedReceipt.file_name}</p>
                <p><strong>סכום:</strong> ₪{selectedReceipt.amount.toLocaleString()}</p>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">סיבת הדחייה *</label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="הזן את סיבת הדחייה..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="flex-row-reverse gap-2">
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              ביטול
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={isUpdating || !rejectionReason.trim()}
            >
              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'דחה קבלה'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
