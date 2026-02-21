import { useState, useEffect } from 'react';
import { ENDPOINTS, getHeaders } from '@/config/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileSignature, Pen, Calendar, Building2, User, Clock, CheckCircle2, AlertCircle, FileText, DollarSign, Mail, Loader2 } from 'lucide-react';
import { VendorRequest } from '@/types/vendor';
import { ContractSigningDialog } from './ContractSigningDialog';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface VendorQuote {
  id: string;
  vendor_request_id: string;
  file_path: string;
  file_name: string;
  description: string | null;
  amount: number | null;
  quote_date: string;
  status: string;
  quote_secure_token: string;
  created_at: string;
  vendor_name?: string;
  vendor_email?: string;
  handler_name?: string;
}

interface ManagerSignaturesViewProps {
  role: 'vp' | 'procurement';
  managerName: string;
  pendingSignatures: VendorRequest[];
  onRefresh: () => void;
}

export function ManagerSignaturesView({ role, managerName, pendingSignatures, onRefresh }: ManagerSignaturesViewProps) {
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<VendorRequest | null>(null);
  const [pendingQuotes, setPendingQuotes] = useState<VendorQuote[]>([]);
  const [isLoadingQuotes, setIsLoadingQuotes] = useState(true);
  const [resendingQuoteId, setResendingQuoteId] = useState<string | null>(null);

  const roleName = role === 'vp' ? 'סמנכ"ל' : 'מנהל רכש';

  // Fetch pending quotes for this role
  useEffect(() => {
    const fetchPendingQuotes = async () => {
      setIsLoadingQuotes(true);
      try {
        const statusFilter = role === 'vp' ? 'pending_vp' : 'pending_procurement';

        const { data, error } = await supabase
          .from('vendor_quotes')
          .select(`
            *,
            vendor_requests!inner(vendor_name, vendor_email, handler_name)
          `)
          .eq('status', statusFilter)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const formattedQuotes = (data || []).map((q: any) => ({
          ...q,
          vendor_name: q.vendor_requests.vendor_name,
          vendor_email: q.vendor_requests.vendor_email,
          handler_name: q.vendor_requests.handler_name,
        }));

        setPendingQuotes(formattedQuotes);
      } catch (error) {
        console.error('Error fetching pending quotes:', error);
      } finally {
        setIsLoadingQuotes(false);
      }
    };

    fetchPendingQuotes();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('manager_quotes_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vendor_quotes',
        },
        () => {
          fetchPendingQuotes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [role]);

  const handleSign = (request: VendorRequest) => {
    setSelectedRequest(request);
    setContractDialogOpen(true);
  };

  const handleResendQuoteEmail = async (quote: VendorQuote) => {
    setResendingQuoteId(quote.id);
    try {
      const settingKey = role === 'vp' ? 'vp_email' : 'procurement_manager_email';
      const { data: settings } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', settingKey)
        .single();

      if (!settings?.setting_value) {
        toast({
          title: 'שגיאה',
          description: `לא הוגדרה כתובת מייל ל${roleName} בהגדרות`,
          variant: 'destructive',
        });
        return;
      }

      const res = await fetch(ENDPOINTS.ADMIN.SEND_QUOTE_APPROVAL_EMAIL, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          quoteId: quote.id,
          approverEmail: settings.setting_value,
          approverName: roleName,
          vendorName: quote.vendor_name,
          amount: quote.amount,
          description: quote.description,
          approvalType: role === 'vp' ? 'vp' : 'procurement_manager',
        }),
      });

      if (!res.ok) throw new Error('Failed to send email');

      toast({
        title: 'המייל נשלח',
        description: 'נשלח מייל חוזר לחתימה',
      });
    } catch (error) {
      console.error('Error resending quote email:', error);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן לשלוח את המייל',
        variant: 'destructive',
      });
    } finally {
      setResendingQuoteId(null);
    }
  };

  const openQuoteForSigning = (quote: VendorQuote) => {
    const approvalType = role === 'vp' ? 'vp' : 'procurement_manager';
    const url = `/quote-approval/${quote.quote_secure_token}?type=${approvalType}`;
    window.open(url, '_blank');
  };

  const totalPending = pendingSignatures.length + pendingQuotes.length;

  // Count urgent contracts (over 3 days)
  const urgentContracts = pendingSignatures.filter(r => {
    const created = new Date(r.created_at);
    const daysDiff = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff > 3;
  }).length;

  // Count urgent quotes (over 3 days)
  const urgentQuotes = pendingQuotes.filter(q => {
    const created = new Date(q.created_at);
    const daysDiff = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff > 3;
  }).length;

  const totalUrgent = urgentContracts + urgentQuotes;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Welcome Header */}
      <div className="bg-gradient-to-l from-primary/20 via-primary/10 to-transparent rounded-2xl p-8 border border-primary/20">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-primary rounded-2xl shadow-lg">
            <FileSignature className="h-10 w-10 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">שלום, {managerName}</h1>
            <p className="text-muted-foreground text-lg mt-1">
              {totalPending === 0
                ? 'אין פריטים ממתינים לחתימתך'
                : totalPending === 1
                  ? 'יש פריט אחד ממתין לחתימתך'
                  : `יש ${totalPending} פריטים ממתינים לחתימתך`
              }
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 dark:text-orange-400">חוזים ממתינים</p>
                <p className="text-3xl font-bold text-orange-700 dark:text-orange-300">{pendingSignatures.length}</p>
              </div>
              <FileSignature className="h-10 w-10 text-orange-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 dark:text-blue-400">הצעות מחיר ממתינות</p>
                <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">{pendingQuotes.length}</p>
              </div>
              <FileText className="h-10 w-10 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 dark:text-red-400">דחוף (מעל 3 ימים)</p>
                <p className="text-3xl font-bold text-red-700 dark:text-red-300">{totalUrgent}</p>
              </div>
              <AlertCircle className="h-10 w-10 text-red-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 dark:text-green-400">התפקיד שלך</p>
                <p className="text-xl font-bold text-green-700 dark:text-green-300">{roleName}</p>
              </div>
              <User className="h-10 w-10 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Quotes Section */}
      {pendingQuotes.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-500" />
            הצעות מחיר ממתינות לחתימה
          </h2>

          <div className="grid gap-4">
            {pendingQuotes.map((quote) => {
              const created = new Date(quote.created_at);
              const daysDiff = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24));
              const isUrgent = daysDiff > 3;

              return (
                <Card
                  key={quote.id}
                  className={`overflow-hidden transition-all hover:shadow-lg ${isUrgent
                      ? 'border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-950/20'
                      : 'border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/10'
                    }`}
                >
                  <CardContent className="p-0">
                    <div className="flex items-center gap-4 p-6">
                      {/* Icon */}
                      <div className={`p-3 rounded-xl ${isUrgent
                          ? 'bg-red-100 dark:bg-red-900/50'
                          : 'bg-blue-100 dark:bg-blue-900/50'
                        }`}>
                        <FileText className={`h-8 w-8 ${isUrgent
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-blue-600 dark:text-blue-400'
                          }`} />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-semibold truncate">{quote.vendor_name}</h3>
                          {isUrgent && (
                            <Badge variant="destructive" className="text-xs animate-pulse">
                              דחוף מאוד
                            </Badge>
                          )}
                          <Badge variant="secondary" className={`text-xs ${isUrgent
                              ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                            }`}>
                            הצעת מחיר
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                          {quote.amount && (
                            <span className="flex items-center gap-1 font-medium text-foreground">
                              <DollarSign className="h-4 w-4" />
                              ₪{quote.amount.toLocaleString()}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {quote.handler_name || 'לא צוין'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {format(created, 'dd/MM/yyyy', { locale: he })}
                          </span>
                          {daysDiff > 0 && (
                            <span>
                              לפני {daysDiff} {daysDiff === 1 ? 'יום' : 'ימים'}
                            </span>
                          )}
                        </div>
                        {quote.description && (
                          <p className="text-sm text-muted-foreground mt-1 truncate">{quote.description}</p>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResendQuoteEmail(quote)}
                          disabled={resendingQuoteId === quote.id}
                          className="gap-1"
                        >
                          {resendingQuoteId === quote.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Mail className="h-4 w-4" />
                          )}
                          שלח שוב
                        </Button>
                        <Button
                          size="lg"
                          onClick={() => openQuoteForSigning(quote)}
                          className="gap-2 shadow-md hover:shadow-lg transition-all min-w-[140px]"
                        >
                          <Pen className="h-5 w-5" />
                          לחתימה
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Pending Contracts Section */}
      {pendingSignatures.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-primary" />
            חוזים ממתינים לחתימה
          </h2>

          <div className="grid gap-4">
            {pendingSignatures.map((request) => {
              const created = new Date(request.created_at);
              const daysDiff = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24));
              const isUrgent = daysDiff > 3;

              return (
                <Card
                  key={request.id}
                  className={`overflow-hidden transition-all hover:shadow-lg ${isUrgent ? 'border-orange-300 dark:border-orange-700 bg-orange-50/50 dark:bg-orange-950/20' : ''
                    }`}
                >
                  <CardContent className="p-0">
                    <div className="flex items-center gap-4 p-6">
                      {/* Icon */}
                      <div className={`p-3 rounded-xl ${isUrgent
                          ? 'bg-orange-100 dark:bg-orange-900/50'
                          : 'bg-primary/10'
                        }`}>
                        <Building2 className={`h-8 w-8 ${isUrgent
                            ? 'text-orange-600 dark:text-orange-400'
                            : 'text-primary'
                          }`} />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-semibold truncate">{request.vendor_name}</h3>
                          {isUrgent && (
                            <Badge variant="destructive" className="text-xs animate-pulse">
                              דחוף
                            </Badge>
                          )}
                          {request.requires_vp_approval && role === 'procurement' && (
                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                              <CheckCircle2 className="h-3 w-3 ml-1" />
                              סמנכ"ל חתם
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {request.handler_name || 'לא צוין מטפל'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {format(created, 'dd/MM/yyyy', { locale: he })}
                          </span>
                          {daysDiff > 0 && (
                            <span className={`${isUrgent ? 'text-orange-600 dark:text-orange-400 font-medium' : ''}`}>
                              לפני {daysDiff} {daysDiff === 1 ? 'יום' : 'ימים'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action Button */}
                      <Button
                        size="lg"
                        onClick={() => handleSign(request)}
                        className="gap-2 shadow-md hover:shadow-lg transition-all min-w-[140px]"
                      >
                        <Pen className="h-5 w-5" />
                        לחתימה
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {totalPending === 0 && !isLoadingQuotes && (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <CheckCircle2 className="h-16 w-16 mx-auto text-green-500 mb-4" />
            <h3 className="text-xl font-semibold text-foreground">הכל מעודכן!</h3>
            <p className="text-muted-foreground mt-2">
              אין פריטים הממתינים לחתימתך כרגע
            </p>
          </CardContent>
        </Card>
      )}

      {/* Loading State for Quotes */}
      {isLoadingQuotes && pendingSignatures.length === 0 && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      <ContractSigningDialog
        open={contractDialogOpen}
        onOpenChange={setContractDialogOpen}
        vendorRequestId={selectedRequest?.id || null}
        vendorName={selectedRequest?.vendor_name || ''}
        onSignComplete={() => {
          onRefresh();
          setContractDialogOpen(false);
          setSelectedRequest(null);
        }}
      />
    </div>
  );
}
