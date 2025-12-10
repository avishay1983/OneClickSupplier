import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Copy, ExternalLink, FileText, Mail, Loader2, Search, ArrowUpDown, ArrowUp, ArrowDown, History, Trash2, Pencil, ClipboardCheck } from 'lucide-react';
import { VendorRequest, STATUS_LABELS, VendorStatus, VENDOR_TYPE_LABELS, CLAIMS_AREA_LABELS, CLAIMS_SUB_CATEGORY_LABELS } from '@/types/vendor';
import { toast } from '@/hooks/use-toast';
import { ViewDocumentsDialog } from './ViewDocumentsDialog';
import { StatusHistoryDialog } from './StatusHistoryDialog';
import { EditRequestDialog } from './EditRequestDialog';
import { ManagerApprovalStatusDialog } from './ManagerApprovalStatusDialog';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface VendorRequestsTableProps {
  requests: VendorRequest[];
  isLoading: boolean;
  onRefresh?: () => void;
  currentUserName?: string;
}

const getStatusVariant = (status: VendorStatus) => {
  switch (status) {
    case 'pending':
      return 'secondary';
    case 'with_vendor':
      return 'default';
    case 'submitted':
      return 'outline';
    case 'approved':
      return 'default';
    default:
      return 'secondary';
  }
};

const getStatusClass = (status: VendorStatus) => {
  switch (status) {
    case 'approved':
      return 'bg-success text-success-foreground';
    case 'submitted':
      return 'bg-warning text-warning-foreground';
    default:
      return '';
  }
};

type SortField = 'vendor_name' | 'created_at' | 'handler_name' | 'status' | 'vendor_type';
type SortDirection = 'asc' | 'desc';

export function VendorRequestsTable({ requests, isLoading, onRefresh, currentUserName }: VendorRequestsTableProps) {
  const [selectedRequest, setSelectedRequest] = useState<VendorRequest | null>(null);
  const [documentsDialogOpen, setDocumentsDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [approvalStatusDialogOpen, setApprovalStatusDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [handlerFilter, setHandlerFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Get unique handler names for filter dropdown
  const uniqueHandlers = Array.from(new Set(requests.map(r => r.handler_name).filter(Boolean))) as string[];

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 mr-1 opacity-50" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4 mr-1" />
      : <ArrowDown className="h-4 w-4 mr-1" />;
  };

  const filteredAndSortedRequests = requests
    .filter(request => {
      let matchesStatus = statusFilter === 'all' || request.status === statusFilter;
      
      // Handle approval stage filters for submitted status
      if (statusFilter === 'waiting_review') {
        matchesStatus = request.status === 'submitted' && !(request as any).first_review_approved;
      } else if (statusFilter === 'review_approved') {
        matchesStatus = request.status === 'submitted' && (request as any).first_review_approved && !(request as any).first_signature_approved;
      } else if (statusFilter === 'first_approved') {
        matchesStatus = request.status === 'submitted' && (request as any).first_signature_approved && !(request as any).second_signature_approved;
      } else if (statusFilter === 'second_approved') {
        matchesStatus = request.status === 'submitted' && (request as any).second_signature_approved;
      }
      
      const matchesHandler = handlerFilter === 'all' || request.handler_name === handlerFilter;
      const matchesSearch = searchQuery === '' || 
        request.vendor_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.vendor_name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesHandler && matchesSearch;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortField === 'vendor_name') {
        comparison = a.vendor_name.localeCompare(b.vendor_name, 'he');
      } else if (sortField === 'handler_name') {
        comparison = (a.handler_name || '').localeCompare(b.handler_name || '', 'he');
      } else if (sortField === 'created_at') {
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortField === 'status') {
        comparison = a.status.localeCompare(b.status, 'he');
      } else if (sortField === 'vendor_type') {
        comparison = (a.vendor_type || '').localeCompare(b.vendor_type || '', 'he');
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

  const copyLink = (token: string) => {
    const link = `${window.location.origin}/vendor/${token}`;
    navigator.clipboard.writeText(link);
    toast({
      title: 'הקישור הועתק',
      description: 'הקישור המאובטח הועתק ללוח',
    });
  };

  const openVendorForm = (token: string) => {
    window.open(`/vendor/${token}`, '_blank');
  };

  const viewDocuments = (request: VendorRequest) => {
    setSelectedRequest(request);
    setDocumentsDialogOpen(true);
  };

  const resendEmail = async (request: VendorRequest) => {
    setSendingEmailId(request.id);
    try {
      const secureLink = `${window.location.origin}/vendor/${request.secure_token}`;
      
      // First send the email
      const { data, error } = await supabase.functions.invoke('send-vendor-email', {
        body: {
          vendorName: request.vendor_name,
          vendorEmail: request.vendor_email,
          secureLink,
        },
      });

      if (error) throw error;
      if (data && !data.success) throw new Error(data.error || 'Failed to send email');

      // Only update status if email was sent successfully - also reset OTP and extend expiration
      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + 7);
      
      const { error: updateError } = await supabase
        .from('vendor_requests')
        .update({ 
          status: 'resent',
          otp_verified: false,
          otp_code: null,
          expires_at: newExpiresAt.toISOString(),
        })
        .eq('id', request.id);

      if (updateError) {
        console.error('Status update error:', updateError);
      }

      toast({
        title: 'המייל נשלח בהצלחה',
        description: `הקישור נשלח ל-${request.vendor_email} - הטופס זמין לעריכה`,
      });

      // Refresh the page to show updated status
      window.location.reload();
    } catch (error: any) {
      console.error('Error resending email:', error);
      toast({
        title: 'שגיאה בשליחת המייל',
        description: error.message || 'לא ניתן לשלוח את המייל',
        variant: 'destructive',
      });
    } finally {
      setSendingEmailId(null);
    }
  };

  const deleteRequest = async () => {
    if (!selectedRequest) return;
    
    setDeletingId(selectedRequest.id);
    try {
      // First delete related documents
      const { error: docsError } = await supabase
        .from('vendor_documents')
        .delete()
        .eq('vendor_request_id', selectedRequest.id);

      if (docsError) {
        console.error('Error deleting documents:', docsError);
      }

      // Delete status history
      const { error: historyError } = await supabase
        .from('vendor_status_history')
        .delete()
        .eq('vendor_request_id', selectedRequest.id);

      if (historyError) {
        console.error('Error deleting status history:', historyError);
      }

      // Delete the vendor request
      const { error } = await supabase
        .from('vendor_requests')
        .delete()
        .eq('id', selectedRequest.id);

      if (error) throw error;

      toast({
        title: 'הבקשה נמחקה',
        description: `הבקשה של ${selectedRequest.vendor_name} נמחקה בהצלחה`,
      });

      window.location.reload();
    } catch (error: any) {
      console.error('Error deleting request:', error);
      toast({
        title: 'שגיאה במחיקה',
        description: error.message || 'לא ניתן למחוק את הבקשה',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
      setDeleteDialogOpen(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }


  return (
    <>
      <div className="flex items-center gap-4 mb-4 flex-wrap">
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
          <span className="text-sm text-muted-foreground">מטפל:</span>
          <Select value={handlerFilter} onValueChange={setHandlerFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">הכל</SelectItem>
              {uniqueHandlers.map((handler) => (
                <SelectItem key={handler} value={handler}>{handler}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">סטטוס:</span>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">הכל</SelectItem>
              <SelectItem value="pending">ממתין</SelectItem>
              <SelectItem value="with_vendor">אצל הספק</SelectItem>
              <SelectItem value="resent">נשלח מחדש</SelectItem>
              <SelectItem value="waiting_review">ממתין לבקרה</SelectItem>
              <SelectItem value="review_approved">בקרה ✓</SelectItem>
              <SelectItem value="first_approved">אישור 1 ✓</SelectItem>
              <SelectItem value="second_approved">אישור 2 ✓</SelectItem>
              <SelectItem value="approved">אושר</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        {filteredAndSortedRequests.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {requests.length === 0 ? (
              <>
                <p>אין בקשות ספקים עדיין</p>
                <p className="text-sm mt-1">לחץ על "בקשה חדשה" כדי להתחיל</p>
              </>
            ) : (
              <p>לא נמצאו בקשות התואמות לחיפוש</p>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-right font-semibold">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                    onClick={() => handleSort('handler_name')}
                  >
                    {getSortIcon('handler_name')}
                    מטפל בתהליך
                  </Button>
                </TableHead>
                <TableHead className="text-right font-semibold">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                    onClick={() => handleSort('vendor_name')}
                  >
                    {getSortIcon('vendor_name')}
                    שם הספק
                  </Button>
                </TableHead>
                <TableHead className="text-right font-semibold">אימייל</TableHead>
                <TableHead className="text-right font-semibold">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                    onClick={() => handleSort('vendor_type')}
                  >
                    {getSortIcon('vendor_type')}
                    סוג ספק
                  </Button>
                </TableHead>
                <TableHead className="text-right font-semibold">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                    onClick={() => handleSort('status')}
                  >
                    {getSortIcon('status')}
                    סטטוס
                  </Button>
                </TableHead>
                <TableHead className="text-right font-semibold">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                    onClick={() => handleSort('created_at')}
                  >
                    {getSortIcon('created_at')}
                    תאריך יצירה
                  </Button>
                </TableHead>
                <TableHead className="text-right font-semibold">פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedRequests.map((request) => (
              <TableRow key={request.id} className="hover:bg-muted/30 transition-colors">
                <TableCell>{request.handler_name || '-'}</TableCell>
                <TableCell className="font-medium">{request.vendor_name}</TableCell>
                <TableCell className="ltr text-right">{request.vendor_email}</TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Badge variant="outline">
                      {VENDOR_TYPE_LABELS[request.vendor_type as keyof typeof VENDOR_TYPE_LABELS] || 'כללי'}
                    </Badge>
                    {request.claims_sub_category && (
                      <span className="text-xs text-muted-foreground">
                        {CLAIMS_SUB_CATEGORY_LABELS[request.claims_sub_category] || request.claims_sub_category}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {request.status === 'submitted' ? (
                    (request as any).second_signature_approved ? (
                      <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700">אישור 2 ✓</Badge>
                    ) : (request as any).first_signature_approved ? (
                      <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700">אישור 1 ✓</Badge>
                    ) : (request as any).first_review_approved ? (
                      <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700">בקרה ✓</Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">ממתין לבקרה</Badge>
                    )
                  ) : (
                    <Badge 
                      variant={getStatusVariant(request.status)}
                      className={getStatusClass(request.status)}
                    >
                      {STATUS_LABELS[request.status]}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {new Date(request.created_at).toLocaleDateString('he-IL')}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {request.status === 'submitted' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedRequest(request);
                          setApprovalStatusDialogOpen(true);
                        }}
                        title="סטטוס אישור מנהלים"
                        className="text-primary"
                      >
                        <ClipboardCheck className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedRequest(request);
                        setHistoryDialogOpen(true);
                      }}
                      title="היסטוריית סטטוס"
                    >
                      <History className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => viewDocuments(request)}
                      title="צפה במסמכים"
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => resendEmail(request)}
                      disabled={sendingEmailId === request.id}
                      title="שלח מייל שוב"
                    >
                      {sendingEmailId === request.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Mail className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openVendorForm(request.secure_token)}
                      title="פתח טופס"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedRequest(request);
                        setEditDialogOpen(true);
                      }}
                      title="עריכת בקשה"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedRequest(request);
                        setDeleteDialogOpen(true);
                      }}
                      disabled={deletingId === request.id}
                      title="מחק בקשה"
                      className="text-destructive hover:text-destructive"
                    >
                      {deletingId === request.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {selectedRequest && (
        <>
          <ViewDocumentsDialog
            open={documentsDialogOpen}
            onOpenChange={setDocumentsDialogOpen}
            vendorRequestId={selectedRequest.id}
            vendorName={selectedRequest.vendor_name}
          />
          <StatusHistoryDialog
            open={historyDialogOpen}
            onOpenChange={setHistoryDialogOpen}
            vendorName={selectedRequest.vendor_name}
            status={selectedRequest.status}
            createdAt={selectedRequest.created_at}
            updatedAt={selectedRequest.updated_at}
          />
          <EditRequestDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            request={selectedRequest}
            onSuccess={() => { onRefresh ? onRefresh() : window.location.reload(); }}
            currentUserName={currentUserName}
          />
          <ManagerApprovalStatusDialog
            open={approvalStatusDialogOpen}
            onOpenChange={setApprovalStatusDialogOpen}
            vendorRequestId={selectedRequest.id}
            vendorName={selectedRequest.vendor_name}
          />
        </>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right">מחיקת בקשה</AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              האם אתה בטוח שברצונך למחוק את הבקשה של "{selectedRequest?.vendor_name}"?
              <br />
              פעולה זו לא ניתנת לביטול ותמחק גם את כל המסמכים הקשורים.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteRequest}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}