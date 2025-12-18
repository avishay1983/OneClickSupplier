import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
  Upload,
  Plus,
  FileCheck,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

interface VendorQuote {
  id: string;
  vendor_request_id: string;
  file_path: string;
  file_name: string;
  description: string | null;
  amount: number | null;
  quote_date: string;
  status: string;
  vp_approved: boolean | null;
  vp_approved_at: string | null;
  vp_approved_by: string | null;
  vp_rejection_reason: string | null;
  procurement_manager_approved: boolean | null;
  procurement_manager_approved_at: string | null;
  procurement_manager_approved_by: string | null;
  procurement_manager_rejection_reason: string | null;
  created_at: string;
  submitted_by: string | null;
  vendor_name?: string;
  vendor_email?: string;
}

interface VendorOption {
  id: string;
  vendor_name: string;
  vendor_email: string;
}

interface VendorQuotesViewProps {
  currentUserName: string;
  isVP: boolean;
  isProcurementManager: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Clock; color: string }> = {
  pending: { label: 'ממתין לאישור סמנכ"ל', icon: Clock, color: 'bg-warning text-warning-foreground' },
  vp_approved: { label: 'אושר סמנכ"ל - ממתין למנהל רכש', icon: AlertCircle, color: 'bg-blue-100 text-blue-800' },
  approved: { label: 'אושר', icon: CheckCircle, color: 'bg-success text-success-foreground' },
  rejected: { label: 'נדחה', icon: XCircle, color: 'bg-destructive text-destructive-foreground' },
};

export function VendorQuotesView({ currentUserName, isVP, isProcurementManager }: VendorQuotesViewProps) {
  const [quotes, setQuotes] = useState<VendorQuote[]>([]);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState<string>('');
  const [quoteFile, setQuoteFile] = useState<File | null>(null);
  const [quoteDescription, setQuoteDescription] = useState('');
  const [quoteAmount, setQuoteAmount] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<VendorQuote | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [rejectType, setRejectType] = useState<'vp' | 'procurement'>('vp');

  const fetchQuotes = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('vendor_quotes')
        .select(`
          *,
          vendor_requests!inner(vendor_name, vendor_email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const formattedQuotes = (data || []).map((q: any) => ({
        ...q,
        vendor_name: q.vendor_requests.vendor_name,
        vendor_email: q.vendor_requests.vendor_email,
      }));
      
      setQuotes(formattedQuotes);
    } catch (error) {
      console.error('Error fetching quotes:', error);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן לטעון את הצעות המחיר',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchVendors = async () => {
    try {
      const { data, error } = await supabase
        .from('vendor_requests')
        .select('id, vendor_name, vendor_email')
        .eq('status', 'approved')
        .order('vendor_name');

      if (error) throw error;
      setVendors(data || []);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  useEffect(() => {
    fetchQuotes();
    fetchVendors();
  }, []);

  const handleUpload = async () => {
    if (!selectedVendorId || !quoteFile) {
      toast({
        title: 'שגיאה',
        description: 'יש לבחור ספק ולהעלות קובץ',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = quoteFile.name.split('.').pop();
      const fileName = `quotes/${selectedVendorId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('vendor_documents')
        .upload(fileName, quoteFile);

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase
        .from('vendor_quotes')
        .insert({
          vendor_request_id: selectedVendorId,
          file_path: fileName,
          file_name: quoteFile.name,
          description: quoteDescription || null,
          amount: quoteAmount ? parseFloat(quoteAmount) : null,
          submitted_by: currentUserName,
          status: 'pending',
        });

      if (insertError) throw insertError;

      toast({
        title: 'הצעת המחיר הועלתה',
        description: 'הצעת המחיר נשלחה לאישור סמנכ"ל',
      });

      setUploadDialogOpen(false);
      setSelectedVendorId('');
      setQuoteFile(null);
      setQuoteDescription('');
      setQuoteAmount('');
      fetchQuotes();
    } catch (error) {
      console.error('Error uploading quote:', error);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן להעלות את הצעת המחיר',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (quote: VendorQuote) => {
    try {
      const { data, error } = await supabase.storage
        .from('vendor_documents')
        .download(quote.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = quote.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading quote:', error);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן להוריד את הקובץ',
        variant: 'destructive',
      });
    }
  };

  const handleVPApprove = async (quote: VendorQuote) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('vendor_quotes')
        .update({
          vp_approved: true,
          vp_approved_at: new Date().toISOString(),
          vp_approved_by: currentUserName,
          status: 'vp_approved',
        })
        .eq('id', quote.id);

      if (error) throw error;

      toast({
        title: 'הצעת המחיר אושרה',
        description: 'ההצעה ממתינה כעת לאישור מנהל רכש',
      });

      fetchQuotes();
    } catch (error) {
      console.error('Error approving quote:', error);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן לאשר את ההצעה',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleProcurementApprove = async (quote: VendorQuote) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('vendor_quotes')
        .update({
          procurement_manager_approved: true,
          procurement_manager_approved_at: new Date().toISOString(),
          procurement_manager_approved_by: currentUserName,
          status: 'approved',
        })
        .eq('id', quote.id);

      if (error) throw error;

      toast({
        title: 'הצעת המחיר אושרה סופית',
        description: 'ההצעה אושרה על ידי מנהל רכש',
      });

      fetchQuotes();
    } catch (error) {
      console.error('Error approving quote:', error);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן לאשר את ההצעה',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReject = async () => {
    if (!selectedQuote || !rejectionReason.trim()) {
      toast({
        title: 'שגיאה',
        description: 'יש להזין סיבת דחייה',
        variant: 'destructive',
      });
      return;
    }

    setIsUpdating(true);
    try {
      const updateData = rejectType === 'vp' 
        ? {
            vp_approved: false,
            vp_approved_at: new Date().toISOString(),
            vp_approved_by: currentUserName,
            vp_rejection_reason: rejectionReason,
            status: 'rejected',
          }
        : {
            procurement_manager_approved: false,
            procurement_manager_approved_at: new Date().toISOString(),
            procurement_manager_approved_by: currentUserName,
            procurement_manager_rejection_reason: rejectionReason,
            status: 'rejected',
          };

      const { error } = await supabase
        .from('vendor_quotes')
        .update(updateData)
        .eq('id', selectedQuote.id);

      if (error) throw error;

      toast({
        title: 'הצעת המחיר נדחתה',
        description: 'ההצעה נדחתה',
      });

      setRejectDialogOpen(false);
      setSelectedQuote(null);
      setRejectionReason('');
      fetchQuotes();
    } catch (error) {
      console.error('Error rejecting quote:', error);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן לדחות את ההצעה',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getQuoteStatus = (quote: VendorQuote): string => {
    if (quote.status === 'rejected') return 'rejected';
    if (quote.procurement_manager_approved) return 'approved';
    if (quote.vp_approved) return 'vp_approved';
    return 'pending';
  };

  const filteredQuotes = quotes.filter((quote) => {
    const matchesSearch =
      (quote.vendor_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      quote.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (quote.description && quote.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const quoteStatus = getQuoteStatus(quote);
    const matchesStatus = statusFilter === 'all' || quoteStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const pendingCount = quotes.filter(q => getQuoteStatus(q) === 'pending').length;
  const vpApprovedCount = quotes.filter(q => getQuoteStatus(q) === 'vp_approved').length;
  const approvedCount = quotes.filter(q => getQuoteStatus(q) === 'approved').length;
  const rejectedCount = quotes.filter(q => getQuoteStatus(q) === 'rejected').length;

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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === 'all' ? 'ring-2 ring-primary' : ''}`}
          onClick={() => setStatusFilter('all')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">סה"כ הצעות</p>
                <p className="text-2xl font-bold">{quotes.length}</p>
              </div>
              <FileCheck className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === 'pending' ? 'ring-2 ring-warning' : ''}`}
          onClick={() => setStatusFilter('pending')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">ממתין לסמנכ"ל</p>
                <p className="text-2xl font-bold text-warning">{pendingCount}</p>
              </div>
              <Clock className="h-8 w-8 text-warning opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === 'vp_approved' ? 'ring-2 ring-blue-500' : ''}`}
          onClick={() => setStatusFilter('vp_approved')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">ממתין למנהל רכש</p>
                <p className="text-2xl font-bold text-blue-600">{vpApprovedCount}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === 'approved' ? 'ring-2 ring-success' : ''}`}
          onClick={() => setStatusFilter('approved')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">אושרו</p>
                <p className="text-2xl font-bold text-success">{approvedCount}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-success opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === 'rejected' ? 'ring-2 ring-destructive' : ''}`}
          onClick={() => setStatusFilter('rejected')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">נדחו</p>
                <p className="text-2xl font-bold text-destructive">{rejectedCount}</p>
              </div>
              <XCircle className="h-8 w-8 text-destructive opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Upload Button */}
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
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="סטטוס" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל ההצעות</SelectItem>
                <SelectItem value="pending">ממתין לסמנכ"ל</SelectItem>
                <SelectItem value="vp_approved">ממתין למנהל רכש</SelectItem>
                <SelectItem value="approved">אושרו</SelectItem>
                <SelectItem value="rejected">נדחו</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchQuotes} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              רענן
            </Button>
            <Button onClick={() => setUploadDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              העלאת הצעת מחיר
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quotes Table */}
      <Card>
        <CardHeader>
          <CardTitle>הצעות מחיר ({filteredQuotes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredQuotes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>{quotes.length === 0 ? 'אין הצעות מחיר במערכת' : 'לא נמצאו הצעות התואמות לחיפוש'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">ספק</TableHead>
                    <TableHead className="text-right">קובץ</TableHead>
                    <TableHead className="text-right">סכום</TableHead>
                    <TableHead className="text-right">תאריך</TableHead>
                    <TableHead className="text-right">תיאור</TableHead>
                    <TableHead className="text-right">סטטוס</TableHead>
                    <TableHead className="text-right">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuotes.map((quote) => {
                    const quoteStatus = getQuoteStatus(quote);
                    const statusConfig = STATUS_CONFIG[quoteStatus] || STATUS_CONFIG.pending;
                    const StatusIcon = statusConfig.icon;
                    
                    return (
                      <TableRow key={quote.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{quote.vendor_name}</div>
                            <div className="text-sm text-muted-foreground">{quote.vendor_email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm max-w-[150px] truncate">{quote.file_name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-bold">
                          {quote.amount ? `₪${quote.amount.toLocaleString()}` : '-'}
                        </TableCell>
                        <TableCell>
                          {format(new Date(quote.quote_date), 'dd/MM/yyyy', { locale: he })}
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate">
                          {quote.description || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusConfig.color}>
                            <StatusIcon className="h-3 w-3 ml-1" />
                            {statusConfig.label}
                          </Badge>
                          {quote.vp_approved && quote.vp_approved_by && (
                            <p className="text-xs text-muted-foreground mt-1">
                              סמנכ"ל: {quote.vp_approved_by}
                            </p>
                          )}
                          {quote.procurement_manager_approved && quote.procurement_manager_approved_by && (
                            <p className="text-xs text-muted-foreground">
                              מנהל רכש: {quote.procurement_manager_approved_by}
                            </p>
                          )}
                          {quoteStatus === 'rejected' && (
                            <p className="text-xs text-destructive mt-1">
                              {quote.vp_rejection_reason || quote.procurement_manager_rejection_reason}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownload(quote)}
                              title="הורדה"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            
                            {/* VP Approval buttons */}
                            {quoteStatus === 'pending' && isVP && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleVPApprove(quote)}
                                  disabled={isUpdating}
                                  className="text-success hover:text-success hover:bg-success/10"
                                  title="אשר (סמנכל)"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedQuote(quote);
                                    setRejectType('vp');
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
                            
                            {/* Procurement Manager Approval buttons */}
                            {quoteStatus === 'vp_approved' && isProcurementManager && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleProcurementApprove(quote)}
                                  disabled={isUpdating}
                                  className="text-success hover:text-success hover:bg-success/10"
                                  title="אשר (מנהל רכש)"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedQuote(quote);
                                    setRejectType('procurement');
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

      {/* Upload Quote Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-[500px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">העלאת הצעת מחיר חדשה</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>בחר ספק *</Label>
              <Select value={selectedVendorId} onValueChange={setSelectedVendorId}>
                <SelectTrigger>
                  <SelectValue placeholder="בחר ספק..." />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.vendor_name} ({vendor.vendor_email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>קובץ הצעת מחיר *</Label>
              <Input
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={(e) => setQuoteFile(e.target.files?.[0] || null)}
              />
            </div>
            <div className="space-y-2">
              <Label>סכום (אופציונלי)</Label>
              <Input
                type="number"
                placeholder="הזן סכום..."
                value={quoteAmount}
                onChange={(e) => setQuoteAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>תיאור (אופציונלי)</Label>
              <Textarea
                placeholder="הזן תיאור להצעה..."
                value={quoteDescription}
                onChange={(e) => setQuoteDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="flex-row-reverse gap-2">
            <Button onClick={handleUpload} disabled={isUploading || !selectedVendorId || !quoteFile}>
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Upload className="h-4 w-4 ml-2" />}
              העלה הצעה
            </Button>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
              ביטול
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-[400px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">דחיית הצעת מחיר</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label>סיבת הדחייה *</Label>
            <Textarea
              placeholder="הזן את סיבת הדחייה..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter className="flex-row-reverse gap-2">
            <Button 
              variant="destructive" 
              onClick={handleReject} 
              disabled={isUpdating || !rejectionReason.trim()}
            >
              {isUpdating && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              דחה הצעה
            </Button>
            <Button variant="outline" onClick={() => {
              setRejectDialogOpen(false);
              setRejectionReason('');
            }}>
              ביטול
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
