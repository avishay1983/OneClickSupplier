import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, Check, X, RefreshCw, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';

interface PendingApproval {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string | null;
  status: string;
  created_at: string;
  approval_token: string;
}

interface PendingApprovalsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PendingApprovalsDialog({ open, onOpenChange }: PendingApprovalsDialogProps) {
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchApprovals = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('pending_approvals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApprovals(data || []);
    } catch (error) {
      console.error('Error fetching approvals:', error);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן לטעון את הבקשות',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchApprovals();
    }
  }, [open]);

  const handleApproval = async (approval: PendingApproval, action: 'approve' | 'reject') => {
    setProcessingId(approval.id);
    try {
      const supabaseUrl = 'https://ijyqtemnhlbamxmgjuzp.supabase.co';
      const response = await fetch(
        `${supabaseUrl}/functions/v1/approve-user?token=${approval.approval_token}&action=${action}&format=json`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process approval');
      }

      toast({
        title: action === 'approve' ? 'המשתמש אושר' : 'המשתמש נדחה',
        description: action === 'approve' 
          ? `${approval.user_email} יכול כעת להתחבר למערכת`
          : `${approval.user_email} הוסר מהמערכת`,
      });

      // Refresh the list
      fetchApprovals();
    } catch (error: any) {
      console.error('Error processing approval:', error);
      toast({
        title: 'שגיאה',
        description: error.message || 'לא ניתן לעבד את הבקשה',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">ממתין</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">אושר</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">נדחה</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendingCount = approvals.filter(a => a.status === 'pending').length;
  
  const filteredApprovals = approvals.filter(a => {
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    const matchesSearch = searchQuery === '' || 
      a.user_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.user_name && a.user_name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>בקשות הרשמה</span>
            <Button variant="ghost" size="icon" onClick={fetchApprovals} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-4 py-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="חיפוש לפי שם או אימייל..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">סטטוס:</span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">הכל</SelectItem>
                <SelectItem value="pending">ממתין</SelectItem>
                <SelectItem value="approved">אושר</SelectItem>
                <SelectItem value="rejected">נדחה</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredApprovals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {statusFilter === 'all' ? 'אין בקשות הרשמה' : 'אין בקשות בסטטוס זה'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">שם</TableHead>
                  <TableHead className="text-right">אימייל</TableHead>
                  <TableHead className="text-right">תאריך</TableHead>
                  <TableHead className="text-right">סטטוס</TableHead>
                  <TableHead className="text-right">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredApprovals.map((approval) => (
                  <TableRow key={approval.id}>
                    <TableCell className="font-medium">
                      {approval.user_name || 'לא צוין'}
                    </TableCell>
                    <TableCell>{approval.user_email}</TableCell>
                    <TableCell>
                      {format(new Date(approval.created_at), 'dd/MM/yyyy HH:mm')}
                    </TableCell>
                    <TableCell>{getStatusBadge(approval.status)}</TableCell>
                    <TableCell>
                      {approval.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 hover:bg-green-50 hover:text-green-700"
                            onClick={() => handleApproval(approval, 'approve')}
                            disabled={processingId === approval.id}
                          >
                            {processingId === approval.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Check className="h-4 w-4 ml-1" />
                                אשר
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() => handleApproval(approval, 'reject')}
                            disabled={processingId === approval.id}
                          >
                            {processingId === approval.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <X className="h-4 w-4 ml-1" />
                                דחה
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {pendingCount > 0 && (
          <div className="pt-4 border-t text-sm text-muted-foreground">
            {pendingCount} בקשות ממתינות לאישור
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
