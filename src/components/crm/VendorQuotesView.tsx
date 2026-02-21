import { useState, useEffect } from 'react';
import { ENDPOINTS, getHeaders } from '@/config/api';
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
import { VendorAutocomplete } from '@/components/ui/vendor-autocomplete';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  Plus,
  FileCheck,
  AlertCircle,
  Send,
  Mail,
  User,
  Settings,
  SlidersHorizontal
} from 'lucide-react';
import { SettingsDialog } from '@/components/dashboard/SettingsDialog';
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
  handler_approved: boolean | null;
  handler_approved_at: string | null;
  handler_approved_by: string | null;
  handler_rejection_reason: string | null;
  vp_approved: boolean | null;
  vp_approved_at: string | null;
  vp_approved_by: string | null;
  vp_rejection_reason: string | null;
  procurement_manager_approved: boolean | null;
  procurement_manager_approved_at: string | null;
  procurement_manager_approved_by: string | null;
  procurement_manager_rejection_reason: string | null;
  vendor_submitted: boolean;
  vendor_submitted_at: string | null;
  quote_link_sent_at: string | null;
  quote_secure_token: string;
  created_at: string;
  submitted_by: string | null;
  vendor_name?: string;
  vendor_email?: string;
  handler_name?: string;
  handler_email?: string;
}

interface VendorOption {
  id: string;
  vendor_name: string;
  vendor_email: string;
  handler_name: string | null;
  handler_email: string | null;
}

interface VendorQuotesViewProps {
  currentUserName: string;
  currentUserEmail?: string;
  isVP: boolean;
  isProcurementManager: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Clock; color: string }> = {
  pending_vendor: { label: 'ממתין לספק', icon: Mail, color: 'bg-gray-100 text-gray-800' },
  pending_handler: { label: 'ממתין למגיש הבקשה', icon: User, color: 'bg-orange-100 text-orange-800' },
  pending_vp: { label: 'ממתין לסמנכ"ל', icon: Clock, color: 'bg-warning text-warning-foreground' },
  pending_procurement: { label: 'ממתין למנהל רכש', icon: AlertCircle, color: 'bg-blue-100 text-blue-800' },
  approved: { label: 'אושר', icon: CheckCircle, color: 'bg-success text-success-foreground' },
  rejected: { label: 'נדחה', icon: XCircle, color: 'bg-destructive text-destructive-foreground' },
};

export function VendorQuotesView({ currentUserName, currentUserEmail, isVP, isProcurementManager }: VendorQuotesViewProps) {
  const [quotes, setQuotes] = useState<VendorQuote[]>([]);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [sendQuoteDialogOpen, setSendQuoteDialogOpen] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  const [resendingQuoteId, setResendingQuoteId] = useState<string | null>(null);

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<VendorQuote | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [rejectType, setRejectType] = useState<'handler' | 'vp' | 'procurement'>('handler');
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [resendingVPQuoteId, setResendingVPQuoteId] = useState<string | null>(null);
  const [resendingProcurementQuoteId, setResendingProcurementQuoteId] = useState<string | null>(null);

  const fetchQuotes = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('vendor_quotes')
        .select(`
          *,
          vendor_requests!inner(vendor_name, vendor_email, handler_name, handler_email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedQuotes = (data || []).map((q: any) => ({
        ...q,
        vendor_name: q.vendor_requests.vendor_name,
        vendor_email: q.vendor_requests.vendor_email,
        handler_name: q.vendor_requests.handler_name,
        handler_email: q.vendor_requests.handler_email,
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
        .select('id, vendor_name, vendor_email, handler_name, handler_email')
        .eq('status', 'approved')
        .order('vendor_name');

      if (error) throw error;

      // Filter out test vendors
      const filteredVendors = (data || []).filter(vendor => {
        const name = vendor.vendor_name.toLowerCase();
        return !name.includes('טסט') && !name.includes('test') && !name.includes('בדיקה');
      });

      setVendors(filteredVendors);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  useEffect(() => {
    fetchQuotes();
    fetchVendors();

    // Subscribe to realtime changes for automatic refresh
    const channel = supabase
      .channel('vendor_quotes_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vendor_quotes',
        },
        () => {
          fetchQuotes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSendQuoteRequest = async () => {
    if (!selectedVendorId) {
      toast({
        title: 'שגיאה',
        description: 'יש לבחור ספק',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);
    try {
      const selectedVendor = vendors.find(v => v.id === selectedVendorId);
      if (!selectedVendor) throw new Error('Vendor not found');

      // Create a quote record first
      const { data: quoteData, error: insertError } = await supabase
        .from('vendor_quotes')
        .insert({
          vendor_request_id: selectedVendorId,
          file_path: '',
          file_name: '',
          submitted_by: currentUserName,
          status: 'pending_vendor',
          vendor_submitted: false,
        })
        .select('id, quote_secure_token')
        .single();

      if (insertError) throw insertError;

      // Send email to vendor
      const { error: emailError } = await supabase.functions.invoke('send-quote-request', {
        body: {
          quoteId: quoteData.id,
          vendorEmail: selectedVendor.vendor_email,
          vendorName: selectedVendor.vendor_name,
          handlerName: currentUserName,
        },
      });

      if (emailError) {
        console.error('Email error:', emailError);
        // Don't throw - the record was created successfully
      }

      toast({
        title: 'הבקשה נשלחה',
        description: `נשלח מייל לספק ${selectedVendor.vendor_name}`,
      });

      setSendQuoteDialogOpen(false);
      setSelectedVendorId('');
      fetchQuotes();
    } catch (error) {
      console.error('Error sending quote request:', error);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן לשלוח את הבקשה',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleResendQuoteRequest = async (quote: VendorQuote) => {
    if (!quote.vendor_email || !quote.vendor_name) {
      toast({
        title: 'שגיאה',
        description: 'חסרים פרטי ספק',
        variant: 'destructive',
      });
      return;
    }

    setResendingQuoteId(quote.id);
    try {
      // Send email to vendor
      const { error: emailError } = await supabase.functions.invoke('send-quote-request', {
        body: {
          quoteId: quote.id,
          vendorEmail: quote.vendor_email,
          vendorName: quote.vendor_name,
          handlerName: currentUserName,
        },
      });

      if (emailError) {
        console.error('Email error:', emailError);
        throw emailError;
      }

      toast({
        title: 'המייל נשלח שוב',
        description: `נשלח מייל חוזר לספק ${quote.vendor_name}`,
      });

      fetchQuotes();
    } catch (error) {
      console.error('Error resending quote request:', error);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן לשלוח את המייל מחדש',
        variant: 'destructive',
      });
    } finally {
      setResendingQuoteId(null);
    }
  };

  const handleDownload = async (quote: VendorQuote) => {
    if (!quote.file_path) {
      toast({
        title: 'שגיאה',
        description: 'אין קובץ להורדה',
        variant: 'destructive',
      });
      return;
    }

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

  const handleHandlerApprove = async (quote: VendorQuote) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('vendor_quotes')
        .update({
          handler_approved: true,
          handler_approved_at: new Date().toISOString(),
          handler_approved_by: currentUserName,
          status: 'pending_vp',
        })
        .eq('id', quote.id);

      if (error) throw error;

      // Get VP email from settings
      const { data: settings } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'vp_email')
        .single();

      let emailState: 'sent' | 'not_configured' | 'failed' = 'sent';
      let emailErrorMessage = '';

      const vpEmail = (settings?.setting_value ?? '').trim();
      if (!vpEmail) {
        emailState = 'not_configured';
      } else {
        const emailRes = await fetch(ENDPOINTS.ADMIN.SEND_QUOTE_APPROVAL_EMAIL, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({
            quoteId: quote.id,
            approverEmail: vpEmail,
            approverName: 'סמנכ"ל',
            vendorName: quote.vendor_name,
            amount: quote.amount,
            description: quote.description,
            approvalType: 'vp',
          }),
        });
        const emailData = await emailRes.json();
        const emailError = !emailRes.ok ? emailData : null;

        if (emailError || (emailData as any)?.success === false) {
          emailState = 'failed';
          emailErrorMessage =
            (emailData as any)?.error?.message || (emailError as any)?.message || '';
          console.error('VP approval email send failed:', { emailError, emailData });
        }
      }

      toast({
        title: 'הצעת המחיר אושרה',
        description:
          emailState === 'sent'
            ? 'נשלח מייל לסמנכ"ל לאישור'
            : emailState === 'not_configured'
              ? 'אושר, אבל אין מייל סמנכ"ל מוגדר בהגדרות'
              : `אושר, אבל המייל לסמנכ"ל לא נשלח${emailErrorMessage ? `: ${emailErrorMessage}` : ''}`,
        ...(emailState === 'sent' ? {} : { variant: 'destructive' as const }),
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

  const handleResendVPEmail = async (quote: VendorQuote) => {
    setResendingVPQuoteId(quote.id);
    try {
      // Get VP email from settings
      const { data: settings } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'vp_email')
        .single();

      if (!settings?.setting_value) {
        toast({
          title: 'שגיאה',
          description: 'לא הוגדרה כתובת מייל לסמנכ"ל בהגדרות',
          variant: 'destructive',
        });
        return;
      }

      // Send email to VP
      const emailRes = await fetch(ENDPOINTS.ADMIN.SEND_QUOTE_APPROVAL_EMAIL, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          quoteId: quote.id,
          approverEmail: settings.setting_value,
          approverName: 'סמנכ"ל',
          vendorName: quote.vendor_name,
          amount: quote.amount,
          description: quote.description,
          approvalType: 'vp',
        }),
      });
      const emailData = await emailRes.json();
      const error = !emailRes.ok ? emailData : null;

      if (error) throw error;
      if ((emailData as any)?.success === false) {
        toast({
          title: 'שגיאה',
          description: (emailData as any)?.error?.message || 'לא ניתן לשלוח את המייל',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'המייל נשלח',
        description: 'נשלח מייל חוזר לסמנכ"ל לאישור',
      });
    } catch (error) {
      console.error('Error resending VP email:', error);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן לשלוח את המייל',
        variant: 'destructive',
      });
    } finally {
      setResendingVPQuoteId(null);
    }
  };

  const handleResendProcurementEmail = async (quote: VendorQuote) => {
    setResendingProcurementQuoteId(quote.id);
    try {
      // Get procurement manager email from settings
      const { data: settings } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'procurement_manager_email')
        .single();

      if (!settings?.setting_value) {
        toast({
          title: 'שגיאה',
          description: 'לא הוגדרה כתובת מייל למנהל רכש בהגדרות',
          variant: 'destructive',
        });
        return;
      }

      // Send email to procurement manager
      const emailRes = await fetch(ENDPOINTS.ADMIN.SEND_QUOTE_APPROVAL_EMAIL, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          quoteId: quote.id,
          approverEmail: settings.setting_value,
          approverName: 'מנהל רכש',
          vendorName: quote.vendor_name,
          amount: quote.amount,
          description: quote.description,
          approvalType: 'procurement_manager',
        }),
      });
      const emailData = await emailRes.json();
      const error = !emailRes.ok ? emailData : null;

      if (error) throw error;
      if ((emailData as any)?.success === false) {
        toast({
          title: 'שגיאה',
          description: (emailData as any)?.error?.message || 'לא ניתן לשלוח את המייל',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'המייל נשלח',
        description: 'נשלח מייל חוזר למנהל רכש לחתימה',
      });
    } catch (error) {
      console.error('Error resending procurement email:', error);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן לשלוח את המייל',
        variant: 'destructive',
      });
    } finally {
      setResendingProcurementQuoteId(null);
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
          status: 'pending_procurement',
        })
        .eq('id', quote.id);

      if (error) throw error;

      // Get procurement manager email from settings
      const { data: settings } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'procurement_manager_email')
        .single();

      if (settings?.setting_value) {
        // Send email to procurement manager
        await fetch(ENDPOINTS.ADMIN.SEND_QUOTE_APPROVAL_EMAIL, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({
            quoteId: quote.id,
            approverEmail: settings.setting_value,
            approverName: 'מנהל רכש',
            vendorName: quote.vendor_name,
            amount: quote.amount,
            description: quote.description,
            approvalType: 'procurement_manager',
          }),
        });
      }

      toast({
        title: 'הצעת המחיר אושרה',
        description: 'נשלח מייל למנהל רכש לאישור סופי',
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
      let updateData: any = { status: 'rejected' };

      if (rejectType === 'handler') {
        updateData = {
          ...updateData,
          handler_approved: false,
          handler_approved_at: new Date().toISOString(),
          handler_approved_by: currentUserName,
          handler_rejection_reason: rejectionReason,
        };
      } else if (rejectType === 'vp') {
        updateData = {
          ...updateData,
          vp_approved: false,
          vp_approved_at: new Date().toISOString(),
          vp_approved_by: currentUserName,
          vp_rejection_reason: rejectionReason,
        };
      } else {
        updateData = {
          ...updateData,
          procurement_manager_approved: false,
          procurement_manager_approved_at: new Date().toISOString(),
          procurement_manager_approved_by: currentUserName,
          procurement_manager_rejection_reason: rejectionReason,
        };
      }

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
    return quote.status || 'pending_vendor';
  };

  // Check if current user is the handler for this quote
  const isHandler = (quote: VendorQuote): boolean => {
    return currentUserEmail === quote.handler_email ||
      currentUserName === quote.handler_name ||
      currentUserName === quote.submitted_by;
  };

  const filteredQuotes = quotes.filter((quote) => {
    const matchesSearch =
      (quote.vendor_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (quote.file_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (quote.description && quote.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const quoteStatus = getQuoteStatus(quote);
    const matchesStatus = statusFilter === 'all' || quoteStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const pendingVendorCount = quotes.filter(q => getQuoteStatus(q) === 'pending_vendor').length;
  const pendingHandlerCount = quotes.filter(q => getQuoteStatus(q) === 'pending_handler').length;
  const pendingVPCount = quotes.filter(q => getQuoteStatus(q) === 'pending_vp').length;
  const pendingProcurementCount = quotes.filter(q => getQuoteStatus(q) === 'pending_procurement').length;
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
    <div className="space-y-6" dir="rtl">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === 'all' ? 'ring-2 ring-primary' : ''}`}
          onClick={() => setStatusFilter('all')}
        >
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">סה"כ</p>
              <p className="text-2xl font-bold">{quotes.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === 'pending_vendor' ? 'ring-2 ring-gray-500' : ''}`}
          onClick={() => setStatusFilter('pending_vendor')}
        >
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">ממתין לספק</p>
              <p className="text-2xl font-bold text-gray-600">{pendingVendorCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === 'pending_handler' ? 'ring-2 ring-orange-500' : ''}`}
          onClick={() => setStatusFilter('pending_handler')}
        >
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">ממתין למגיש</p>
              <p className="text-2xl font-bold text-orange-600">{pendingHandlerCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === 'pending_vp' ? 'ring-2 ring-warning' : ''}`}
          onClick={() => setStatusFilter('pending_vp')}
        >
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">ממתין לסמנכ"ל</p>
              <p className="text-2xl font-bold text-warning">{pendingVPCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === 'pending_procurement' ? 'ring-2 ring-blue-500' : ''}`}
          onClick={() => setStatusFilter('pending_procurement')}
        >
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">ממתין לרכש</p>
              <p className="text-2xl font-bold text-blue-600">{pendingProcurementCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === 'approved' ? 'ring-2 ring-success' : ''}`}
          onClick={() => setStatusFilter('approved')}
        >
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">אושרו</p>
              <p className="text-2xl font-bold text-success">{approvedCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === 'rejected' ? 'ring-2 ring-destructive' : ''}`}
          onClick={() => setStatusFilter('rejected')}
        >
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">נדחו</p>
              <p className="text-2xl font-bold text-destructive">{rejectedCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4" dir="rtl">
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
                <SelectItem value="pending_vendor">ממתין לספק</SelectItem>
                <SelectItem value="pending_handler">ממתין למגיש</SelectItem>
                <SelectItem value="pending_vp">ממתין לסמנכ"ל</SelectItem>
                <SelectItem value="pending_procurement">ממתין למנהל רכש</SelectItem>
                <SelectItem value="approved">אושרו</SelectItem>
                <SelectItem value="rejected">נדחו</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => setSettingsDialogOpen(true)} className="gap-2">
              <Settings className="h-4 w-4" />
              הגדרות
            </Button>
            <Button variant="outline" onClick={fetchQuotes} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              רענן
            </Button>
            <Button onClick={() => setSendQuoteDialogOpen(true)} className="gap-2">
              <Send className="h-4 w-4" />
              שלח בקשה להצעת מחיר
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quotes Table */}
      <Card>
        <CardHeader className="text-right">
          <CardTitle className="text-right">הצעות מחיר ({filteredQuotes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredQuotes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>{quotes.length === 0 ? 'אין הצעות מחיר במערכת' : 'לא נמצאו הצעות התואמות לחיפוש'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto" dir="rtl">
              <Table dir="rtl">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right" style={{ textAlign: 'right' }}>ספק</TableHead>
                    <TableHead className="text-right" style={{ textAlign: 'right' }}>מגיש הבקשה</TableHead>
                    <TableHead className="text-right" style={{ textAlign: 'right' }}>קובץ</TableHead>
                    <TableHead className="text-right" style={{ textAlign: 'right' }}>סכום</TableHead>
                    <TableHead className="text-right" style={{ textAlign: 'right' }}>תאריך</TableHead>
                    <TableHead className="text-right" style={{ textAlign: 'right' }}>סטטוס</TableHead>
                    <TableHead className="text-right" style={{ textAlign: 'right' }}>פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuotes.map((quote) => {
                    const quoteStatus = getQuoteStatus(quote);
                    const statusConfig = STATUS_CONFIG[quoteStatus] || STATUS_CONFIG.pending_vendor;
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
                          <div className="text-sm">
                            {quote.submitted_by || quote.handler_name || '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          {quote.file_path ? (
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm max-w-[150px] truncate">{quote.file_name}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="font-bold">
                          {quote.amount ? `₪${quote.amount.toLocaleString()}` : '-'}
                        </TableCell>
                        <TableCell>
                          {format(new Date(quote.quote_date), 'dd/MM/yyyy', { locale: he })}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusConfig.color}>
                            <StatusIcon className="h-3 w-3 ml-1" />
                            {statusConfig.label}
                          </Badge>
                          {quote.handler_approved && quote.handler_approved_by && (
                            <p className="text-xs text-muted-foreground mt-1">
                              מגיש: {quote.handler_approved_by}
                            </p>
                          )}
                          {quote.vp_approved && quote.vp_approved_by && (
                            <p className="text-xs text-muted-foreground">
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
                              {quote.handler_rejection_reason || quote.vp_rejection_reason || quote.procurement_manager_rejection_reason}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
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
                            <DropdownMenuContent align="start" className="bg-background">
                              {/* Download - always available if file exists */}
                              {quote.file_path && (
                                <DropdownMenuItem onClick={() => handleDownload(quote)}>
                                  <Download className="h-4 w-4 ml-2" />
                                  הורד קובץ
                                </DropdownMenuItem>
                              )}

                              {/* Resend to vendor - for pending_vendor status */}
                              {quoteStatus === 'pending_vendor' && (
                                <DropdownMenuItem
                                  onClick={() => handleResendQuoteRequest(quote)}
                                  disabled={resendingQuoteId === quote.id}
                                >
                                  <Mail className="h-4 w-4 ml-2 text-blue-500" />
                                  שלח שוב לספק
                                </DropdownMenuItem>
                              )}

                              {/* Handler actions - for pending_handler status */}
                              {quoteStatus === 'pending_handler' && isHandler(quote) && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleHandlerApprove(quote)}
                                    disabled={isUpdating}
                                  >
                                    <CheckCircle className="h-4 w-4 ml-2 text-green-500" />
                                    אשר ושלח לסמנכ"ל
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedQuote(quote);
                                      setRejectType('handler');
                                      setRejectDialogOpen(true);
                                    }}
                                    disabled={isUpdating}
                                  >
                                    <XCircle className="h-4 w-4 ml-2 text-red-500" />
                                    דחה הצעה
                                  </DropdownMenuItem>
                                </>
                              )}

                              {/* VP actions - for pending_vp status */}
                              {quoteStatus === 'pending_vp' && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => handleResendVPEmail(quote)}
                                    disabled={resendingVPQuoteId === quote.id}
                                  >
                                    <Mail className="h-4 w-4 ml-2 text-blue-500" />
                                    שלח שוב לסמנכ"ל
                                  </DropdownMenuItem>
                                  {isVP && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={() => handleVPApprove(quote)}
                                        disabled={isUpdating}
                                      >
                                        <CheckCircle className="h-4 w-4 ml-2 text-green-500" />
                                        אשר (סמנכ"ל)
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setSelectedQuote(quote);
                                          setRejectType('vp');
                                          setRejectDialogOpen(true);
                                        }}
                                        disabled={isUpdating}
                                      >
                                        <XCircle className="h-4 w-4 ml-2 text-red-500" />
                                        דחה הצעה
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </>
                              )}

                              {/* Procurement Manager actions - for pending_procurement status */}
                              {quoteStatus === 'pending_procurement' && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => handleResendProcurementEmail(quote)}
                                    disabled={resendingProcurementQuoteId === quote.id}
                                  >
                                    <Mail className="h-4 w-4 ml-2 text-blue-500" />
                                    שלח שוב למנהל רכש
                                  </DropdownMenuItem>
                                  {isProcurementManager && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={() => handleProcurementApprove(quote)}
                                        disabled={isUpdating}
                                      >
                                        <CheckCircle className="h-4 w-4 ml-2 text-green-500" />
                                        אשר (מנהל רכש)
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setSelectedQuote(quote);
                                          setRejectType('procurement');
                                          setRejectDialogOpen(true);
                                        }}
                                        disabled={isUpdating}
                                      >
                                        <XCircle className="h-4 w-4 ml-2 text-red-500" />
                                        דחה הצעה
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      {/* Send Quote Request Dialog */}
      <Dialog open={sendQuoteDialogOpen} onOpenChange={setSendQuoteDialogOpen}>
        <DialogContent className="sm:max-w-[500px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">שליחת בקשה להצעת מחיר</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              בחר ספק לשליחת בקשה להצעת מחיר. הספק יקבל מייל עם לינק להגשת הצעה.
            </p>
            <div className="space-y-2">
              <Label>בחר ספק *</Label>
              <VendorAutocomplete
                value={selectedVendorId}
                onChange={(vendorId) => setSelectedVendorId(vendorId)}
                vendors={vendors}
                placeholder="הקלד שם ספק לחיפוש..."
              />
            </div>
          </div>
          <DialogFooter className="flex-row-reverse gap-2">
            <Button onClick={handleSendQuoteRequest} disabled={isSending || !selectedVendorId}>
              {isSending ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Send className="h-4 w-4 ml-2" />}
              שלח בקשה
            </Button>
            <Button variant="outline" onClick={() => setSendQuoteDialogOpen(false)}>
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

      {/* Settings Dialog */}
      <SettingsDialog
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
      />
    </div>
  );
}
