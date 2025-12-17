import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowRight, 
  Search, 
  Edit, 
  History, 
  MoreHorizontal, 
  Loader2,
  Building2,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Users,
  Star,
  Pause,
  XCircle,
  CheckCircle,
  Settings,
  LogOut,
  
  Play,
  Receipt
} from 'lucide-react';

import { InBrowserTestRunner } from '@/components/crm/InBrowserTestRunner';
import { AllReceiptsView } from '@/components/crm/AllReceiptsView';
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

interface CRMVendor {
  id: string;
  vendor_name: string;
  vendor_email: string;
  company_id: string | null;
  phone: string | null;
  mobile: string | null;
  fax: string | null;
  city: string | null;
  street: string | null;
  street_number: string | null;
  postal_code: string | null;
  po_box: string | null;
  accounting_contact_name: string | null;
  accounting_contact_phone: string | null;
  sales_contact_name: string | null;
  sales_contact_phone: string | null;
  bank_name: string | null;
  bank_branch: string | null;
  bank_account_number: string | null;
  payment_method: string | null;
  payment_terms: string | null;
  vendor_type: string | null;
  claims_area: string | null;
  claims_sub_category: string | null;
  handler_name: string | null;
  handler_email: string | null;
  expected_spending: number | null;
  quote_received: boolean | null;
  contract_signed: boolean | null;
  legal_approved: boolean | null;
  is_consultant: boolean | null;
  is_sensitive: boolean | null;
  approver_name: string | null;
  crm_status: 'active' | 'suspended' | 'closed' | 'vip' | null;
  created_at: string;
  updated_at: string;
}

interface CRMHistoryItem {
  id: string;
  action: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  changed_by: string | null;
  changed_at: string;
}

const CRM_STATUS_LABELS: Record<string, string> = {
  active: 'פעיל',
  suspended: 'מושהה',
  closed: 'סגור',
  vip: 'VIP',
};

const CRM_STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800 border-green-200',
  suspended: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  closed: 'bg-red-100 text-red-800 border-red-200',
  vip: 'bg-purple-100 text-purple-800 border-purple-200',
};

const VENDOR_TYPE_LABELS: Record<string, string> = {
  general: 'כללי',
  claims: 'תביעות',
};

const CLAIMS_AREA_LABELS: Record<string, string> = {
  home: 'דירה',
  car: 'רכב',
  life: 'חיים',
  health: 'בריאות',
};

const CLAIMS_SUB_CATEGORY_LABELS: Record<string, string> = {
  garage: 'מוסך',
  appraiser: 'שמאי',
  doctor: 'רופא',
  lawyer: 'עורך דין',
  plumber: 'שרברב',
  management: 'חברת ניהול',
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  check: 'המחאה',
  invoice: 'מס"ב',
  transfer: 'העברה בנקאית',
};

export default function CRM() {
  const { user, isLoading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  
  const [vendors, setVendors] = useState<CRMVendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string>('vendors');
  
  const [selectedVendor, setSelectedVendor] = useState<CRMVendor | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  
  const [inBrowserTestOpen, setInBrowserTestOpen] = useState(false);
  const [history, setHistory] = useState<CRMHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  
  const [editForm, setEditForm] = useState<Partial<CRMVendor>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [currentUserName, setCurrentUserName] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const getUserName = async () => {
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .maybeSingle();
        setCurrentUserName(profile?.full_name || user.email || 'משתמש');
      }
    };
    getUserName();
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchVendors();
    }
  }, [user]);

  const fetchVendors = async () => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('vendor_requests')
        .select('*')
        .eq('status', 'approved')
        .eq('vp_approved', true)
        .eq('procurement_manager_approved', true)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setVendors((data as CRMVendor[]) || []);
    } catch (error) {
      console.error('Error fetching vendors:', error);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן לטעון את רשימת הספקים',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHistory = async (vendorId: string) => {
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from('crm_history')
        .select('*')
        .eq('vendor_request_id', vendorId)
        .order('changed_at', { ascending: false });

      if (error) throw error;
      setHistory((data as CRMHistoryItem[]) || []);
    } catch (error) {
      console.error('Error fetching history:', error);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן לטעון את ההיסטוריה',
        variant: 'destructive',
      });
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleEdit = (vendor: CRMVendor) => {
    setSelectedVendor(vendor);
    setEditForm({ ...vendor });
    setEditDialogOpen(true);
  };

  const handleViewHistory = async (vendor: CRMVendor) => {
    setSelectedVendor(vendor);
    setHistoryDialogOpen(true);
    await fetchHistory(vendor.id);
  };

  const handleStatusChange = async (vendor: CRMVendor, newStatus: 'active' | 'suspended' | 'closed' | 'vip') => {
    try {
      const oldStatus = vendor.crm_status;
      
      const { error: updateError } = await supabase
        .from('vendor_requests')
        .update({ crm_status: newStatus })
        .eq('id', vendor.id);

      if (updateError) throw updateError;

      // Log the change
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

      fetchVendors();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן לעדכן את הסטטוס',
        variant: 'destructive',
      });
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedVendor || !editForm) return;

    setIsSaving(true);
    try {
      // Find changed fields
      const changes: { field: string; oldValue: string | null; newValue: string | null }[] = [];
      
      const fieldsToTrack = [
        'vendor_name', 'vendor_email', 'company_id', 'phone', 'mobile', 'fax',
        'city', 'street', 'street_number', 'postal_code', 'po_box',
        'accounting_contact_name', 'accounting_contact_phone',
        'sales_contact_name', 'sales_contact_phone',
        'bank_name', 'bank_branch', 'bank_account_number',
        'payment_method', 'payment_terms',
        'handler_name', 'handler_email', 'vendor_type', 'claims_area', 'claims_sub_category',
        'expected_spending', 'approver_name', 'quote_received', 'contract_signed',
        'legal_approved', 'is_consultant', 'is_sensitive'
      ];

      for (const field of fieldsToTrack) {
        const oldVal = selectedVendor[field as keyof CRMVendor];
        const newVal = editForm[field as keyof CRMVendor];
        if (oldVal !== newVal) {
          changes.push({
            field,
            oldValue: oldVal as string | null,
            newValue: newVal as string | null,
          });
        }
      }

      // Update vendor
      const { error: updateError } = await supabase
        .from('vendor_requests')
        .update(editForm)
        .eq('id', selectedVendor.id);

      if (updateError) throw updateError;

      // Log changes
      for (const change of changes) {
        await supabase.from('crm_history').insert({
          vendor_request_id: selectedVendor.id,
          action: 'field_update',
          field_name: change.field,
          old_value: change.oldValue,
          new_value: change.newValue,
          changed_by: currentUserName,
        });
      }

      toast({
        title: 'השינויים נשמרו',
        description: `${changes.length} שדות עודכנו`,
      });

      setEditDialogOpen(false);
      fetchVendors();
    } catch (error) {
      console.error('Error saving:', error);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן לשמור את השינויים',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const filteredVendors = vendors.filter((vendor) => {
    const matchesSearch =
      vendor.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.vendor_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (vendor.company_id && vendor.company_id.includes(searchTerm));

    const matchesStatus = statusFilter === 'all' || (vendor.crm_status || 'active') === statusFilter;
    const matchesType = typeFilter === 'all' || vendor.vendor_type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="bg-[#1a2b5f] border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img 
                src="/images/bituach-yashir-logo.png" 
                alt="ביטוח ישיר" 
                className="h-10 w-auto"
              />
              <div className="border-r border-white/20 pr-4">
                <h1 className="text-xl font-bold text-white">מערכת CRM ספקים</h1>
                <p className="text-sm text-white/70">ניהול ספקים מאושרים</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={() => setInBrowserTestOpen(true)}
                className="text-white hover:bg-white/10 gap-2"
              >
              <Play className="h-4 w-4" />
                טסטים
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate('/')}
                className="text-white hover:bg-white/10 gap-2"
              >
                <ArrowRight className="h-4 w-4" />
                חזרה לדשבורד
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSignOut}
                className="text-white hover:bg-white/10"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="vendors" className="gap-2">
              <Building2 className="h-4 w-4" />
              ספקים
            </TabsTrigger>
            <TabsTrigger value="receipts" className="gap-2">
              <Receipt className="h-4 w-4" />
              קבלות ספקים
            </TabsTrigger>
          </TabsList>

          <TabsContent value="vendors">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6" dir="rtl">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between flex-row-reverse">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">סה"כ ספקים</p>
                      <p className="text-2xl font-bold">{vendors.length}</p>
                    </div>
                    <Building2 className="h-8 w-8 text-primary opacity-50" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between flex-row-reverse">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">ספקים פעילים</p>
                      <p className="text-2xl font-bold text-green-600">
                        {vendors.filter(v => (v.crm_status || 'active') === 'active').length}
                      </p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-500 opacity-50" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between flex-row-reverse">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">ספקי VIP</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {vendors.filter(v => v.crm_status === 'vip').length}
                      </p>
                    </div>
                    <Star className="h-8 w-8 text-purple-500 opacity-50" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between flex-row-reverse">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">ספקים מושהים</p>
                      <p className="text-2xl font-bold text-yellow-600">
                        {vendors.filter(v => v.crm_status === 'suspended').length}
                      </p>
                    </div>
                    <Pause className="h-8 w-8 text-yellow-500 opacity-50" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row-reverse gap-4">
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
                      <SelectItem value="active">פעיל</SelectItem>
                      <SelectItem value="vip">VIP</SelectItem>
                      <SelectItem value="suspended">מושהה</SelectItem>
                      <SelectItem value="closed">סגור</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[180px] text-right">
                      <SelectValue placeholder="סוג ספק" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">כל הסוגים</SelectItem>
                      <SelectItem value="general">כללי</SelectItem>
                      <SelectItem value="claims">תביעות</SelectItem>
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
                ) : filteredVendors.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {vendors.length === 0 ? 'אין ספקים מאושרים במערכת' : 'לא נמצאו ספקים התואמים לחיפוש'}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right">שם הספק</TableHead>
                          <TableHead className="text-right">ח.פ</TableHead>
                          <TableHead className="text-right">סוג</TableHead>
                          <TableHead className="text-right">טלפון</TableHead>
                          <TableHead className="text-right">עיר</TableHead>
                          <TableHead className="text-right">מטפל</TableHead>
                          <TableHead className="text-right">סטטוס</TableHead>
                          <TableHead className="text-right">פעולות</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredVendors.map((vendor) => (
                          <TableRow key={vendor.id}>
                            <TableCell className="font-medium text-right">
                              <div>
                                <div>{vendor.vendor_name}</div>
                                <div className="text-sm text-muted-foreground">{vendor.vendor_email}</div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">{vendor.company_id || '-'}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant="outline">
                                {VENDOR_TYPE_LABELS[vendor.vendor_type || 'general'] || 'כללי'}
                              </Badge>
                            </TableCell>
                            <TableCell dir="ltr" className="text-right">
                              {vendor.phone || vendor.mobile || '-'}
                            </TableCell>
                            <TableCell className="text-right">{vendor.city || '-'}</TableCell>
                            <TableCell className="text-right">{vendor.handler_name || '-'}</TableCell>
                            <TableCell className="text-right">
                              <Badge className={CRM_STATUS_COLORS[vendor.crm_status || 'active']}>
                                {CRM_STATUS_LABELS[vendor.crm_status || 'active']}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEdit(vendor)}>
                                    <Edit className="h-4 w-4 ml-2" />
                                    עריכה
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleViewHistory(vendor)}>
                                    <History className="h-4 w-4 ml-2" />
                                    היסטוריה
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleStatusChange(vendor, 'active')}>
                                    <CheckCircle className="h-4 w-4 ml-2 text-green-500" />
                                    סמן כפעיל
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleStatusChange(vendor, 'vip')}>
                                    <Star className="h-4 w-4 ml-2 text-purple-500" />
                                    סמן כ-VIP
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleStatusChange(vendor, 'suspended')}>
                                    <Pause className="h-4 w-4 ml-2 text-yellow-500" />
                                    השהה ספק
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleStatusChange(vendor, 'closed')}>
                                    <XCircle className="h-4 w-4 ml-2 text-red-500" />
                                    סגור ספק
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="receipts">
            <AllReceiptsView currentUserName={currentUserName} />
          </TabsContent>
        </Tabs>
      </main>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>עריכת פרטי ספק - {selectedVendor?.vendor_name}</DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="basic">פרטים בסיסיים</TabsTrigger>
              <TabsTrigger value="creation">פרטי הקמה</TabsTrigger>
              <TabsTrigger value="address">כתובת</TabsTrigger>
              <TabsTrigger value="contacts">אנשי קשר</TabsTrigger>
              <TabsTrigger value="bank">פרטי בנק</TabsTrigger>
              <TabsTrigger value="accounting">הנהלת חשבונות</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>שם הספק</Label>
                  <Input
                    value={editForm.vendor_name || ''}
                    onChange={(e) => setEditForm({ ...editForm, vendor_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>אימייל</Label>
                  <Input
                    type="email"
                    dir="ltr"
                    value={editForm.vendor_email || ''}
                    onChange={(e) => setEditForm({ ...editForm, vendor_email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>ח.פ / ע.מ</Label>
                  <Input
                    value={editForm.company_id || ''}
                    onChange={(e) => setEditForm({ ...editForm, company_id: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>טלפון</Label>
                  <Input
                    dir="ltr"
                    value={editForm.phone || ''}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>נייד</Label>
                  <Input
                    dir="ltr"
                    value={editForm.mobile || ''}
                    onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>פקס</Label>
                  <Input
                    dir="ltr"
                    value={editForm.fax || ''}
                    onChange={(e) => setEditForm({ ...editForm, fax: e.target.value })}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="creation" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>מטפל בתהליך</Label>
                  <Input
                    value={editForm.handler_name || ''}
                    onChange={(e) => setEditForm({ ...editForm, handler_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>אימייל מטפל</Label>
                  <Input
                    dir="ltr"
                    value={editForm.handler_email || ''}
                    onChange={(e) => setEditForm({ ...editForm, handler_email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>סוג ספק</Label>
                  <Select 
                    value={editForm.vendor_type || 'general'} 
                    onValueChange={(value) => setEditForm({ ...editForm, vendor_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">כללי</SelectItem>
                      <SelectItem value="claims">תביעות</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {editForm.vendor_type === 'claims' && (
                  <>
                    <div className="space-y-2">
                      <Label>תחום תביעות</Label>
                      <Select 
                        value={editForm.claims_area || ''} 
                        onValueChange={(value) => setEditForm({ ...editForm, claims_area: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="בחר תחום" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="home">דירה</SelectItem>
                          <SelectItem value="car">רכב</SelectItem>
                          <SelectItem value="life">חיים</SelectItem>
                          <SelectItem value="health">בריאות</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>תת קטגוריה</Label>
                      <Input
                        value={editForm.claims_sub_category || ''}
                        onChange={(e) => setEditForm({ ...editForm, claims_sub_category: e.target.value })}
                      />
                    </div>
                  </>
                )}
                <div className="space-y-2">
                  <Label>סכום הוצאה צפויה (₪)</Label>
                  <Input
                    type="number"
                    dir="ltr"
                    value={editForm.expected_spending || ''}
                    onChange={(e) => setEditForm({ ...editForm, expected_spending: Number(e.target.value) || null })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>שם מאשר</Label>
                  <Input
                    value={editForm.approver_name || ''}
                    onChange={(e) => setEditForm({ ...editForm, approver_name: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="border rounded-lg p-4 mt-4">
                <h4 className="font-medium mb-4">סטטוסים</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editForm.quote_received || false}
                      onChange={(e) => setEditForm({ ...editForm, quote_received: e.target.checked })}
                      className="h-4 w-4"
                    />
                    <Label className="cursor-pointer">קיימת הצעת מחיר</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editForm.contract_signed || false}
                      onChange={(e) => setEditForm({ ...editForm, contract_signed: e.target.checked })}
                      className="h-4 w-4"
                    />
                    <Label className="cursor-pointer">קיים הסכם</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editForm.legal_approved || false}
                      onChange={(e) => setEditForm({ ...editForm, legal_approved: e.target.checked })}
                      className="h-4 w-4"
                    />
                    <Label className="cursor-pointer">אושר משפטית</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editForm.is_consultant || false}
                      onChange={(e) => setEditForm({ ...editForm, is_consultant: e.target.checked })}
                      className="h-4 w-4"
                    />
                    <Label className="cursor-pointer">ספק יועץ</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editForm.is_sensitive || false}
                      onChange={(e) => setEditForm({ ...editForm, is_sensitive: e.target.checked })}
                      className="h-4 w-4"
                    />
                    <Label className="cursor-pointer">ספק רגיש</Label>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="address" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>עיר</Label>
                  <Input
                    value={editForm.city || ''}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>רחוב</Label>
                  <Input
                    value={editForm.street || ''}
                    onChange={(e) => setEditForm({ ...editForm, street: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>מספר בית</Label>
                  <Input
                    value={editForm.street_number || ''}
                    onChange={(e) => setEditForm({ ...editForm, street_number: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>מיקוד</Label>
                  <Input
                    value={editForm.postal_code || ''}
                    onChange={(e) => setEditForm({ ...editForm, postal_code: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>ת.ד</Label>
                  <Input
                    value={editForm.po_box || ''}
                    onChange={(e) => setEditForm({ ...editForm, po_box: e.target.value })}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="contacts" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>איש קשר הנהלת חשבונות</Label>
                  <Input
                    value={editForm.accounting_contact_name || ''}
                    onChange={(e) => setEditForm({ ...editForm, accounting_contact_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>טלפון הנהלת חשבונות</Label>
                  <Input
                    dir="ltr"
                    value={editForm.accounting_contact_phone || ''}
                    onChange={(e) => setEditForm({ ...editForm, accounting_contact_phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>איש קשר מכירות/רכש</Label>
                  <Input
                    value={editForm.sales_contact_name || ''}
                    onChange={(e) => setEditForm({ ...editForm, sales_contact_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>טלפון מכירות/רכש</Label>
                  <Input
                    dir="ltr"
                    value={editForm.sales_contact_phone || ''}
                    onChange={(e) => setEditForm({ ...editForm, sales_contact_phone: e.target.value })}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="bank" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>שם הבנק</Label>
                  <Input
                    value={editForm.bank_name || ''}
                    onChange={(e) => setEditForm({ ...editForm, bank_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>סניף</Label>
                  <Input
                    value={editForm.bank_branch || ''}
                    onChange={(e) => setEditForm({ ...editForm, bank_branch: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>מספר חשבון</Label>
                  <Input
                    dir="ltr"
                    value={editForm.bank_account_number || ''}
                    onChange={(e) => setEditForm({ ...editForm, bank_account_number: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>אמצעי תשלום</Label>
                  <Select 
                    value={editForm.payment_method || ''} 
                    onValueChange={(value) => setEditForm({ ...editForm, payment_method: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="בחר אמצעי תשלום" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="check">המחאה</SelectItem>
                      <SelectItem value="invoice">מס"ב</SelectItem>
                      <SelectItem value="transfer">העברה בנקאית</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>תנאי תשלום</Label>
                  <Input
                    value={editForm.payment_terms || ''}
                    onChange={(e) => setEditForm({ ...editForm, payment_terms: e.target.value })}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="accounting" className="space-y-4 mt-4">
              <div className="bg-muted/50 rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-lg mb-2">פרטי חשבון להעברה ל-SAP</h4>
                <p className="text-sm text-muted-foreground">מידע זה ישמש להקמת הספק במערכת SAP הנהלת חשבונות</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 p-3 bg-card border rounded-lg">
                  <Label className="text-xs text-muted-foreground">שם הספק</Label>
                  <p className="font-medium">{selectedVendor?.vendor_name || '-'}</p>
                </div>
                <div className="space-y-1 p-3 bg-card border rounded-lg">
                  <Label className="text-xs text-muted-foreground">ח.פ / ע.מ</Label>
                  <p className="font-medium">{selectedVendor?.company_id || '-'}</p>
                </div>
                <div className="space-y-1 p-3 bg-card border rounded-lg">
                  <Label className="text-xs text-muted-foreground">אימייל</Label>
                  <p className="font-medium" dir="ltr">{selectedVendor?.vendor_email || '-'}</p>
                </div>
                <div className="space-y-1 p-3 bg-card border rounded-lg">
                  <Label className="text-xs text-muted-foreground">טלפון</Label>
                  <p className="font-medium" dir="ltr">{selectedVendor?.phone || selectedVendor?.mobile || '-'}</p>
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <h5 className="font-medium mb-3">כתובת למשלוח</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1 p-3 bg-card border rounded-lg">
                    <Label className="text-xs text-muted-foreground">עיר</Label>
                    <p className="font-medium">{selectedVendor?.city || '-'}</p>
                  </div>
                  <div className="space-y-1 p-3 bg-card border rounded-lg">
                    <Label className="text-xs text-muted-foreground">רחוב ומספר</Label>
                    <p className="font-medium">
                      {selectedVendor?.street 
                        ? `${selectedVendor.street} ${selectedVendor.street_number || ''}`.trim()
                        : selectedVendor?.po_box ? `ת.ד ${selectedVendor.po_box}` : '-'}
                    </p>
                  </div>
                  <div className="space-y-1 p-3 bg-card border rounded-lg">
                    <Label className="text-xs text-muted-foreground">מיקוד</Label>
                    <p className="font-medium">{selectedVendor?.postal_code || '-'}</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <h5 className="font-medium mb-3">פרטי בנק</h5>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1 p-3 bg-card border rounded-lg">
                    <Label className="text-xs text-muted-foreground">בנק</Label>
                    <p className="font-medium">{selectedVendor?.bank_name || '-'}</p>
                  </div>
                  <div className="space-y-1 p-3 bg-card border rounded-lg">
                    <Label className="text-xs text-muted-foreground">סניף</Label>
                    <p className="font-medium">{selectedVendor?.bank_branch || '-'}</p>
                  </div>
                  <div className="space-y-1 p-3 bg-card border rounded-lg">
                    <Label className="text-xs text-muted-foreground">מספר חשבון</Label>
                    <p className="font-medium" dir="ltr">{selectedVendor?.bank_account_number || '-'}</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <h5 className="font-medium mb-3">פרטי תשלום</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1 p-3 bg-card border rounded-lg">
                    <Label className="text-xs text-muted-foreground">אמצעי תשלום</Label>
                    <p className="font-medium">{PAYMENT_METHOD_LABELS[selectedVendor?.payment_method || ''] || '-'}</p>
                  </div>
                  <div className="space-y-1 p-3 bg-card border rounded-lg">
                    <Label className="text-xs text-muted-foreground">תנאי תשלום</Label>
                    <p className="font-medium">{selectedVendor?.payment_terms || 'שוטף + 60'}</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <h5 className="font-medium mb-3">איש קשר הנהלת חשבונות</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1 p-3 bg-card border rounded-lg">
                    <Label className="text-xs text-muted-foreground">שם</Label>
                    <p className="font-medium">{selectedVendor?.accounting_contact_name || '-'}</p>
                  </div>
                  <div className="space-y-1 p-3 bg-card border rounded-lg">
                    <Label className="text-xs text-muted-foreground">טלפון</Label>
                    <p className="font-medium" dir="ltr">{selectedVendor?.accounting_contact_phone || '-'}</p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              ביטול
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  שומר...
                </>
              ) : (
                'שמור שינויים'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]" dir="rtl">
          <DialogHeader>
            <DialogTitle>היסטוריית שינויים - {selectedVendor?.vendor_name}</DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="h-[400px] pr-4">
            {historyLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                אין היסטוריית שינויים
              </div>
            ) : (
              <div className="space-y-4">
                {history.map((item) => (
                  <Card key={item.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">
                            {item.action === 'status_change' ? 'שינוי סטטוס' : 'עדכון שדה'}
                          </p>
                          {item.field_name && (
                            <p className="text-sm text-muted-foreground mt-1">
                              שדה: {item.field_name}
                            </p>
                          )}
                          <div className="flex gap-2 mt-2 text-sm">
                            {item.old_value && (
                              <Badge variant="outline" className="bg-red-50">
                                מ: {item.old_value}
                              </Badge>
                            )}
                            {item.new_value && (
                              <Badge variant="outline" className="bg-green-50">
                                ל: {item.new_value}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-left text-sm text-muted-foreground">
                          <p>{item.changed_by || 'לא ידוע'}</p>
                          <p>{format(new Date(item.changed_at), 'dd/MM/yyyy HH:mm', { locale: he })}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      
      {/* In-Browser Test Runner */}
      <InBrowserTestRunner
        open={inBrowserTestOpen}
        onOpenChange={setInBrowserTestOpen}
      />
    </div>
  );
}
