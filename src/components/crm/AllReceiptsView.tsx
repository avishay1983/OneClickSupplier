import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Search,
  Receipt,
  DollarSign,
  TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

interface ReceiptWithVendor {
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
  vendor_name: string;
  vendor_email: string;
}

interface AllReceiptsViewProps {
  currentUserName: string;
}

const STATUS_CONFIG = {
  pending: { label: 'ממתין לאישור', icon: Clock, color: 'bg-warning text-warning-foreground' },
  approved: { label: 'אושר', icon: CheckCircle, color: 'bg-success text-success-foreground' },
  rejected: { label: 'נדחה', icon: XCircle, color: 'bg-destructive text-destructive-foreground' },
};

export function AllReceiptsView({ currentUserName }: AllReceiptsViewProps) {
  const [receipts, setReceipts] = useState<ReceiptWithVendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptWithVendor | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchReceipts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('vendor_receipts')
        .select(`
          *,
          vendor_requests!inner(vendor_name, vendor_email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const formattedReceipts = (data || []).map((r: any) => ({
        ...r,
        vendor_name: r.vendor_requests.vendor_name,
        vendor_email: r.vendor_requests.vendor_email,
      }));
      
      setReceipts(formattedReceipts);
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
  }, []);

  const handleDownload = async (receipt: ReceiptWithVendor) => {
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

  const handleApprove = async (receipt: ReceiptWithVendor) => {
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
        description: `קבלה בסכום ₪${receipt.amount.toLocaleString()} מספק ${receipt.vendor_name} אושרה`,
      });

      fetchReceipts();
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
        description: 'הקבלה נדחתה בהצלחה',
      });

      setRejectDialogOpen(false);
      setSelectedReceipt(null);
      setRejectionReason('');
      fetchReceipts();
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

  const filteredReceipts = receipts.filter((receipt) => {
    const matchesSearch =
      receipt.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (receipt.description && receipt.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || receipt.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalAmount = receipts.reduce((sum, r) => sum + r.amount, 0);
  const approvedAmount = receipts.filter(r => r.status === 'approved').reduce((sum, r) => sum + r.amount, 0);
  const pendingAmount = receipts.filter(r => r.status === 'pending').reduce((sum, r) => sum + r.amount, 0);
  const pendingCount = receipts.filter(r => r.status === 'pending').length;

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">סה"כ קבלות</p>
                <p className="text-2xl font-bold">{receipts.length}</p>
                <p className="text-sm text-muted-foreground">₪{totalAmount.toLocaleString()}</p>
              </div>
              <Receipt className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-warning">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">ממתינות לאישור</p>
                <p className="text-2xl font-bold text-warning">{pendingCount}</p>
                <p className="text-sm text-warning">₪{pendingAmount.toLocaleString()}</p>
              </div>
              <Clock className="h-8 w-8 text-warning opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">אושרו</p>
                <p className="text-2xl font-bold text-success">
                  {receipts.filter(r => r.status === 'approved').length}
                </p>
                <p className="text-sm text-success">₪{approvedAmount.toLocaleString()}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-success opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">נדחו</p>
                <p className="text-2xl font-bold text-destructive">
                  {receipts.filter(r => r.status === 'rejected').length}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-destructive opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="חיפוש לפי שם ספק, קובץ או תיאור..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="סטטוס" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הקבלות</SelectItem>
                <SelectItem value="pending">ממתינות לאישור</SelectItem>
                <SelectItem value="approved">אושרו</SelectItem>
                <SelectItem value="rejected">נדחו</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchReceipts} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              רענן
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Receipts Table */}
      <Card>
        <CardHeader>
          <CardTitle>קבלות ספקים ({filteredReceipts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredReceipts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>{receipts.length === 0 ? 'אין קבלות במערכת' : 'לא נמצאו קבלות התואמות לחיפוש'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">ספק</TableHead>
                    <TableHead className="text-right">קובץ</TableHead>
                    <TableHead className="text-right">סכום</TableHead>
                    <TableHead className="text-right">תאריך קבלה</TableHead>
                    <TableHead className="text-right">תיאור</TableHead>
                    <TableHead className="text-right">סטטוס</TableHead>
                    <TableHead className="text-right">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReceipts.map((receipt) => {
                    const statusConfig = STATUS_CONFIG[receipt.status];
                    const StatusIcon = statusConfig.icon;
                    
                    return (
                      <TableRow key={receipt.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{receipt.vendor_name}</div>
                            <div className="text-sm text-muted-foreground">{receipt.vendor_email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm max-w-[150px] truncate">{receipt.file_name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-bold">
                          ₪{receipt.amount.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {format(new Date(receipt.receipt_date), 'dd/MM/yyyy', { locale: he })}
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate">
                          {receipt.description || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusConfig.color}>
                            <StatusIcon className="h-3 w-3 ml-1" />
                            {statusConfig.label}
                          </Badge>
                          {receipt.reviewed_by && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {receipt.reviewed_by} • {format(new Date(receipt.reviewed_at!), 'dd/MM HH:mm', { locale: he })}
                            </p>
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
                                  className="text-success hover:text-success hover:bg-success/10"
                                  title="אשר תשלום"
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
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
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
            </div>
          )}
        </CardContent>
      </Card>

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
              <div className="p-3 bg-muted rounded-lg space-y-1">
                <p><strong>ספק:</strong> {selectedReceipt.vendor_name}</p>
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
