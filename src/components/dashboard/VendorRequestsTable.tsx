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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Copy, FileText, Mail, Loader2, Search, ArrowUpDown, ArrowUp, ArrowDown, Pencil, ClipboardCheck, UserCheck, Info, FileSignature, Check, X, MoreHorizontal, Eye, Send, CheckCircle, SlidersHorizontal } from 'lucide-react';
import { VendorRequest, STATUS_LABELS, VendorStatus, VENDOR_TYPE_LABELS, CLAIMS_AREA_LABELS } from '@/types/vendor';
import { toast } from '@/hooks/use-toast';
import { ViewDocumentsDialog } from './ViewDocumentsDialog';
import { EditRequestDialog } from './EditRequestDialog';
import { ManagerApprovalStatusDialog } from './ManagerApprovalStatusDialog';
import { HandlerApprovalDialog } from './HandlerApprovalDialog';
import { ContractSigningDialog } from './ContractSigningDialog';
import { supabase } from '@/integrations/supabase/client';

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
    case 'rejected':
      return 'destructive';
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
    case 'first_review':
      return 'bg-blue-500 text-white';
    case 'rejected':
      return 'bg-destructive text-destructive-foreground';
    default:
      return '';
  }
};

type SortField = 'vendor_name' | 'created_at' | 'handler_name' | 'status' | 'vendor_type';
type SortDirection = 'asc' | 'desc';

export function VendorRequestsTable({ requests, isLoading, onRefresh, currentUserName }: VendorRequestsTableProps) {
  const [selectedRequest, setSelectedRequest] = useState<VendorRequest | null>(null);
  const [documentsDialogOpen, setDocumentsDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [approvalStatusDialogOpen, setApprovalStatusDialogOpen] = useState(false);
  const [handlerApprovalDialogOpen, setHandlerApprovalDialogOpen] = useState(false);
  const [contractSigningDialogOpen, setContractSigningDialogOpen] = useState(false);
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
              <SelectItem value="with_vendor">ממתין לספק</SelectItem>
              <SelectItem value="first_review">בקרה ראשונה</SelectItem>
              <SelectItem value="submitted">ממתין לאישור</SelectItem>
              <SelectItem value="resent">נשלח מחדש</SelectItem>
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
                    מזמין הספק
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
                <TableHead className="text-right font-semibold">חתימות הצעת מחיר</TableHead>
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
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{request.vendor_name}</span>
                    <span className="text-sm text-muted-foreground ltr text-right">{request.vendor_email}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Badge variant="outline">
                      {VENDOR_TYPE_LABELS[request.vendor_type as keyof typeof VENDOR_TYPE_LABELS] || 'כללי'}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Badge 
                      variant={getStatusVariant(request.status)}
                      className={getStatusClass(request.status)}
                    >
                      {STATUS_LABELS[request.status]}
                    </Badge>
                    {request.status === 'rejected' && request.handler_rejection_reason && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <Info className="h-4 w-4 text-destructive" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs text-right" dir="rtl">
                            <p className="font-medium mb-1">סיבת הדחייה:</p>
                            <p>{request.handler_rejection_reason}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {request.requires_contract_signature ? (
                    <div className="flex flex-wrap gap-1.5">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all ${
                              request.ceo_signed 
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' 
                                : request.status === 'submitted'
                                  ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300 animate-pulse'
                                  : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                            }`}>
                              {request.ceo_signed ? (
                                <Check className="h-3 w-3" />
                              ) : request.status === 'submitted' ? (
                                <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
                              ) : (
                                <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                              )}
                              <span>סמנכ"ל</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" dir="rtl">
                            {request.ceo_signed ? (
                              <p>חתם: {request.ceo_signed_by} בתאריך {request.ceo_signed_at ? new Date(request.ceo_signed_at).toLocaleDateString('he-IL') : ''}</p>
                            ) : (
                              <p>טרם חתם</p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all ${
                              request.procurement_manager_signed 
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' 
                                : request.ceo_signed
                                  ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300 animate-pulse'
                                  : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                            }`}>
                              {request.procurement_manager_signed ? (
                                <Check className="h-3 w-3" />
                              ) : request.ceo_signed ? (
                                <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
                              ) : (
                                <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                              )}
                              <span>מנהל רכש</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" dir="rtl">
                            {request.procurement_manager_signed ? (
                              <p>חתם: {request.procurement_manager_signed_by} בתאריך {request.procurement_manager_signed_at ? new Date(request.procurement_manager_signed_at).toLocaleDateString('he-IL') : ''}</p>
                            ) : (
                              <p>טרם חתם</p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs">לא נדרש</span>
                  )}
                </TableCell>
                <TableCell>
                  {new Date(request.created_at).toLocaleDateString('he-IL')}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {/* Primary action button for first_review */}
                    {request.status === 'first_review' && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => {
                          setSelectedRequest(request);
                          setHandlerApprovalDialogOpen(true);
                        }}
                        className="h-auto min-h-7 px-2 py-1 text-[11px] bg-blue-600 hover:bg-blue-700 text-white animate-pulse whitespace-normal text-right"
                      >
                        <span>ממתין ל{request.handler_name || 'אישור'}</span>
                      </Button>
                    )}
                    
                    {/* Dropdown menu for all actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10 transition-all hover:rotate-90 duration-300"
                        >
                          <SlidersHorizontal className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 text-right">
                        <DropdownMenuItem 
                          onClick={() => viewDocuments(request)}
                          className="gap-3 cursor-pointer"
                        >
                          <Eye className="h-4 w-4 text-primary" />
                          <div className="flex flex-col">
                            <span>צפה במסמכים ובפרטים</span>
                            <span className="text-xs text-muted-foreground">מסמכים, פרטי ספק ותגיות</span>
                          </div>
                        </DropdownMenuItem>
                        
                        {request.status === 'submitted' && (
                          <DropdownMenuItem 
                            onClick={() => {
                              setSelectedRequest(request);
                              setApprovalStatusDialogOpen(true);
                            }}
                            className="gap-3 cursor-pointer"
                          >
                            <ClipboardCheck className="h-4 w-4 text-primary" />
                            <div className="flex flex-col">
                              <span>סטטוס אישור מנהלים</span>
                              <span className="text-xs text-muted-foreground">צפה בשלבי האישור</span>
                            </div>
                          </DropdownMenuItem>
                        )}
                        
                        {request.requires_contract_signature && request.contract_file_path && (
                          <DropdownMenuItem 
                            onClick={() => {
                              setSelectedRequest(request);
                              setContractSigningDialogOpen(true);
                            }}
                            className="gap-3 cursor-pointer"
                          >
                            <FileSignature className={`h-4 w-4 ${
                              request.ceo_signed && request.procurement_manager_signed 
                                ? 'text-success' 
                                : 'text-warning'
                            }`} />
                            <div className="flex flex-col">
                              <span>חתימה על הצעת מחיר</span>
                              <span className="text-xs text-muted-foreground">
                                {request.ceo_signed && request.procurement_manager_signed 
                                  ? 'כל החתימות הושלמו' 
                                  : 'ממתין לחתימות'}
                              </span>
                            </div>
                          </DropdownMenuItem>
                        )}
                        
                        <DropdownMenuSeparator />
                        
                        <DropdownMenuItem 
                          onClick={() => resendEmail(request)}
                          disabled={sendingEmailId === request.id}
                          className="gap-3 cursor-pointer"
                        >
                          {sendingEmailId === request.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4 text-blue-500" />
                          )}
                          <div className="flex flex-col">
                            <span>שלח מייל מחדש</span>
                            <span className="text-xs text-muted-foreground">שלח לינק חדש לספק</span>
                          </div>
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem 
                          onClick={() => {
                            setSelectedRequest(request);
                            setEditDialogOpen(true);
                          }}
                          className="gap-3 cursor-pointer"
                        >
                          <Pencil className="h-4 w-4 text-orange-500" />
                          <div className="flex flex-col">
                            <span>עריכת בקשה</span>
                            <span className="text-xs text-muted-foreground">שנה פרטי בקשה</span>
                          </div>
                        </DropdownMenuItem>

                        {request.status === 'first_review' && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => {
                                setSelectedRequest(request);
                                setHandlerApprovalDialogOpen(true);
                              }}
                              className="gap-3 cursor-pointer bg-blue-50 dark:bg-blue-950"
                            >
                              <CheckCircle className="h-4 w-4 text-blue-600" />
                              <div className="flex flex-col">
                                <span className="font-medium text-blue-700 dark:text-blue-300">אישור מזמין הספק</span>
                                <span className="text-xs text-muted-foreground">אשר, דחה או שלח מחדש</span>
                              </div>
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
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
          <HandlerApprovalDialog
            open={handlerApprovalDialogOpen}
            onOpenChange={setHandlerApprovalDialogOpen}
            vendorRequestId={selectedRequest.id}
            vendorName={selectedRequest.vendor_name}
            vendorEmail={selectedRequest.vendor_email}
            onActionComplete={() => { onRefresh ? onRefresh() : window.location.reload(); }}
          />
          <ContractSigningDialog
            open={contractSigningDialogOpen}
            onOpenChange={setContractSigningDialogOpen}
            vendorRequestId={selectedRequest.id}
            vendorName={selectedRequest.vendor_name}
            onSignComplete={() => { onRefresh ? onRefresh() : window.location.reload(); }}
          />
        </>
      )}

    </>
  );
}