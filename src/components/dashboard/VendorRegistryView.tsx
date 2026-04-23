import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { 
  Search, 
  Edit, 
  History, 
  Loader2,
  Building2,
  Star,
  Pause,
  XCircle,
  CheckCircle,
  Play,
  Receipt,
  SlidersHorizontal,
  ShieldCheck,
  Send,
  FileCheck
} from 'lucide-react';
import { StarRating } from '@/components/crm/StarRating';
import { adminService } from '@/services/admin.service';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface CRMVendor {
  id: string;
  vendor_name: string;
  vendor_email: string;
  company_id: string | null;
  phone: string | null;
  mobile: string | null;
  city: string | null;
  vendor_type: string | null;
  handler_name: string | null;
  handler_email: string | null;
  crm_status: 'active' | 'suspended' | 'closed' | 'vip' | 'security_approved' | null;
  rating: number | null;
  receipts_link_sent_at: string | null;
  secure_token: string;
}

export interface VendorRatingSummary {
  average: number | null;
  userRating: number | null;
  totalRatings: number;
}

const CRM_STATUS_LABELS: Record<string, string> = {
  active: 'פעיל',
  suspended: 'מושהה',
  closed: 'סגור',
  vip: 'VIP',
  security_approved: 'אושר ביטחון',
};

const CRM_STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800 border-green-200',
  suspended: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  closed: 'bg-red-100 text-red-800 border-red-200',
  vip: 'bg-purple-100 text-purple-800 border-purple-200',
  security_approved: 'bg-blue-100 text-blue-800 border-blue-200',
};

const VENDOR_TYPE_LABELS: Record<string, string> = {
  general: 'כללי',
  claims: 'תביעות',
};

interface VendorRegistryViewProps {
  vendors: CRMVendor[];
  vendorRatings: Map<string, VendorRatingSummary>;
  isLoading: boolean;
  isAdmin: boolean;
  currentUserName: string;
  onRefresh: () => void;
  onEdit: (vendor: CRMVendor) => void;
  onViewHistory: (vendor: CRMVendor) => void;
}

export function VendorRegistryView({
  vendors,
  vendorRatings,
  isLoading,
  isAdmin,
  currentUserName,
  onRefresh,
  onEdit,
  onViewHistory
}: VendorRegistryViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showTestVendors, setShowTestVendors] = useState(false);

  const isTestVendor = (vendor: CRMVendor) => {
    const name = vendor.vendor_name.toLowerCase();
    const email = vendor.vendor_email.toLowerCase();
    return name.includes('test') || name.includes('טסט') || 
           email.includes('test') || email.includes('e2e');
  };

  const filteredVendors = vendors.filter((vendor) => {
    if (isTestVendor(vendor) && !(isAdmin && showTestVendors)) {
      return false;
    }

    const matchesSearch =
      vendor.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.vendor_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (vendor.company_id && vendor.company_id.includes(searchTerm));

    const matchesStatus = statusFilter === 'all' || (vendor.crm_status || 'active') === statusFilter;
    const matchesType = typeFilter === 'all' || vendor.vendor_type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const handleStatusChange = async (vendor: CRMVendor, newStatus: any) => {
    try {
      const oldStatus = vendor.crm_status;
      
      const { error: updateError } = await supabase
        .from('vendor_requests')
        .update({ crm_status: newStatus })
        .eq('id', vendor.id);

      if (updateError) throw updateError;

      await supabase.from('crm_history').insert({
        vendor_request_id: vendor.id,
        action: 'status_change',
        field_name: 'crm_status',
        old_value: oldStatus || 'active',
        new_value: newStatus,
        changed_by: currentUserName,
      });

      toast({
        title: 'הסטטוס עודכן',
        description: `הספק עודכן ל${CRM_STATUS_LABELS[newStatus]}`,
      });

      onRefresh();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן לעדכן את הסטטוס',
        variant: 'destructive',
      });
    }
  };

  const handleSendReceiptsLink = async (vendor: CRMVendor) => {
    try {
      await adminService.sendReceiptsLink(vendor.id);
      
      await supabase.from('crm_history').insert({
        vendor_request_id: vendor.id,
        action: 'receipts_link_sent',
        field_name: 'receipts_link_sent_at',
        old_value: vendor.receipts_link_sent_at || null,
        new_value: new Date().toISOString(),
        changed_by: currentUserName,
      });

      toast({
        title: 'הקישור נשלח בהצלחה',
        description: `נשלח קישור להעלאת קבלות ל-${vendor.vendor_email}`,
      });

      onRefresh();
    } catch (error) {
      console.error('Error sending receipts link:', error);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן לשלוח את הקישור',
        variant: 'destructive',
      });
    }
  };

  const handleSendQuoteRequest = async (vendor: CRMVendor) => {
    try {
      const { data: quote, error: quoteError } = await supabase
        .from('vendor_quotes')
        .insert({
          vendor_request_id: vendor.id,
          quote_secure_token: crypto.randomUUID(),
          status: 'pending_vendor'
        })
        .select()
        .single();
        
      if (quoteError) throw quoteError;

      await adminService.sendQuoteRequest({
        quoteId: quote.id,
        vendorEmail: vendor.vendor_email,
        vendorName: vendor.vendor_name,
        handlerName: currentUserName
      });

      toast({
        title: 'בקשת הצעת מחיר נשלחה',
        description: `הודעה נשלחה לספק ${vendor.vendor_name}`,
      });

      onRefresh();
    } catch (error) {
      console.error('Error sending quote request:', error);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן לשלוח בקשה להצעת מחיר',
        variant: 'destructive',
      });
    }
  };

  const handleRatingChange = async (vendor: CRMVendor, newRating: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error: upsertError } = await supabase
        .from('vendor_ratings')
        .upsert({
          vendor_request_id: vendor.id,
          user_id: user.id,
          user_email: user.email || '',
          rating: newRating,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'vendor_request_id,user_id'
        });

      if (upsertError) throw upsertError;

      toast({
        title: 'הדירוג עודכן',
        description: `נתת לספק דירוג של ${newRating} כוכבים`,
      });

      onRefresh();
    } catch (error) {
      console.error('Error updating rating:', error);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <Building2 className="h-8 w-8 text-primary opacity-50" />
              <div className="text-right">
                <p className="text-sm text-muted-foreground">סה"כ ספקים</p>
                <p className="text-2xl font-bold">{vendors.filter(v => !isTestVendor(v)).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row-reverse gap-4 items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="חיפוש לפי שם, אימייל או ח.פ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10 text-right"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] text-right">
                <SelectValue placeholder="סטטוס" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הסטטוסים</SelectItem>
                {Object.entries(CRM_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Vendors Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-right">רשימת ספקים ({filteredVendors.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">פעולות</TableHead>
                    <TableHead className="text-right">סטטוס</TableHead>
                    <TableHead className="text-right">דירוג</TableHead>
                    <TableHead className="text-right">מטפל</TableHead>
                    <TableHead className="text-right">עיר</TableHead>
                    <TableHead className="text-right">שם הספק</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVendors.map((vendor) => (
                    <TableRow key={vendor.id}>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <SlidersHorizontal className="h-5 w-5 text-primary" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="text-right">
                            <DropdownMenuItem onClick={() => onEdit(vendor)}>
                              <Edit className="h-4 w-4 ml-2" /> עריכה
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onViewHistory(vendor)}>
                              <History className="h-4 w-4 ml-2" /> היסטוריה
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(vendor, 'active')}>
                              <CheckCircle className="h-4 w-4 ml-2 text-green-500" /> הפעלה (פעיל)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(vendor, 'security_approved')}>
                              <ShieldCheck className="h-4 w-4 ml-2 text-blue-500" /> אושר ביטחון
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(vendor, 'suspended')}>
                              <Pause className="h-4 w-4 ml-2 text-yellow-500" /> השהייה
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(vendor, 'closed')}>
                              <XCircle className="h-4 w-4 ml-2 text-red-500" /> סגירה
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSendQuoteRequest(vendor)}>
                              <FileCheck className="h-4 w-4 ml-2 text-indigo-500" /> בקש הצעת מחיר
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSendReceiptsLink(vendor)}>
                              <Send className="h-4 w-4 ml-2 text-primary" /> בקש קבלה
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge className={CRM_STATUS_COLORS[vendor.crm_status || 'active']}>
                          {CRM_STATUS_LABELS[vendor.crm_status || 'active']}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {(() => {
                          const summary = vendorRatings.get(vendor.id) || { average: null, userRating: null, totalRatings: 0 };
                          return (
                            <StarRating
                              averageRating={summary.average}
                              userRating={summary.userRating}
                              totalRatings={summary.totalRatings}
                              onRatingChange={(newRating) => handleRatingChange(vendor, newRating)}
                            />
                          );
                        })()}
                      </TableCell>
                      <TableCell className="text-right">{vendor.handler_name || '-'}</TableCell>
                      <TableCell className="text-right">{vendor.city || '-'}</TableCell>
                      <TableCell className="font-medium text-right">
                        <div>
                          <div>{vendor.vendor_name}</div>
                          <div className="text-sm text-muted-foreground">{vendor.vendor_email}</div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
