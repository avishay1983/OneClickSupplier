import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, AlertTriangle, Settings, LogOut, Loader2, Clock, Users, Building2, FileSignature, Pen, Eye, UserCircle, LayoutGrid, Receipt } from 'lucide-react';
import { VendorRequestsTable } from '@/components/dashboard/VendorRequestsTable';
import { NewRequestDialog, NewRequestData } from '@/components/dashboard/NewRequestDialog';
import { SettingsDialog } from '@/components/dashboard/SettingsDialog';
import { PendingApprovalsDialog } from '@/components/dashboard/PendingApprovalsDialog';
import { ManagerSignaturesView } from '@/components/dashboard/ManagerSignaturesView';
import { VendorRequest } from '@/types/vendor';
import { ContractSigningDialog } from '@/components/dashboard/ContractSigningDialog';
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { adminService } from '@/services/admin.service';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VendorRegistryView, CRMVendor, VendorRatingSummary } from '@/components/dashboard/VendorRegistryView';
import { VendorQuotesView } from '@/components/crm/VendorQuotesView';
import { AllReceiptsView } from '@/components/crm/AllReceiptsView';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

export default function Dashboard() {
  const { user, isLoading: authLoading, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<VendorRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [approvalsOpen, setApprovalsOpen] = useState(false);
  const [isApproved, setIsApproved] = useState<boolean | null>(null);
  const [checkingApproval, setCheckingApproval] = useState(true);
  const [resendingApproval, setResendingApproval] = useState(false);
  const [currentUserName, setCurrentUserName] = useState<string>('');
  const [userManagerRole, setUserManagerRole] = useState<'vp' | 'procurement' | null>(null);
  const [userManagerName, setUserManagerName] = useState<string>('');
  const [pendingSignatures, setPendingSignatures] = useState<VendorRequest[]>([]);
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [selectedContractRequest, setSelectedContractRequest] = useState<VendorRequest | null>(null);
  const [showAllRequests, setShowAllRequests] = useState(false); // For admin toggle
  const [viewMode, setViewMode] = useState<'manager' | 'regular'>('manager'); // Manager view toggle
  const [pendingReceiptsCount, setPendingReceiptsCount] = useState(0);
  const [activeTab, setActiveTab] = useState('onboarding');
  const [pendingQuotesCount, setPendingQuotesCount] = useState(0);

  // CRM/Registry State
  const [vendors, setVendors] = useState<CRMVendor[]>([]);
  const [vendorRatings, setVendorRatings] = useState<Map<string, VendorRatingSummary>>(new Map());
  const [isVendorsLoading, setIsVendorsLoading] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<CRMVendor | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<CRMVendor>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Check if user is approved and get user name
  useEffect(() => {
    const checkApproval = async () => {
      if (!user) {
        setCheckingApproval(false);
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('is_approved, full_name')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error checking approval:', error);
          setIsApproved(false);
        } else {
          setIsApproved(profile?.is_approved ?? false);
          // Prioritize full_name from profile, then metadata, then generic 'משתמש'
          // Avoid using user.email as it's not a name.
          setCurrentUserName(profile?.full_name || user.user_metadata?.full_name || 'משתמש');
        }
      } catch (error) {
        console.error('Error checking approval:', error);
        setIsApproved(false);
      } finally {
        setCheckingApproval(false);
      }
    };

    if (user && !authLoading) {
      checkApproval();
    }
  }, [user, authLoading]);

  // Check if user is VP or Procurement Manager and find pending signatures
  useEffect(() => {
    const checkManagerRole = async () => {
      if (!user || !requests.length) return;

      try {
        const { data: settings } = await supabase
          .from('app_settings')
          .select('setting_key, setting_value');

        const settingsMap: Record<string, string> = {};
        settings?.forEach((s) => {
          settingsMap[s.setting_key] = s.setting_value;
        });

        const vpEmail = settingsMap.vp_email?.toLowerCase().trim();
        const procurementEmail = settingsMap.car_manager_email?.toLowerCase().trim();
        const userEmail = user.email?.toLowerCase().trim();

        let role: 'vp' | 'procurement' | null = null;
        let managerName = '';
        if (userEmail === vpEmail) {
          role = 'vp';
          managerName = settingsMap.vp_name || 'סמנכ"ל';
        } else if (userEmail === procurementEmail) {
          role = 'procurement';
          managerName = settingsMap.car_manager_name || 'מנהל רכש';
        }
        setUserManagerRole(role);
        setUserManagerName(managerName);

        // Find requests pending this user's signature
        if (role) {
          const pendingForSignature = requests.filter(req => {
            // Must have contract uploaded
            if (!req.contract_file_path) return false;

            if (role === 'vp') {
              // VP needs to sign and hasn't signed yet
              return req.requires_vp_approval && !req.ceo_signed;
            } else if (role === 'procurement') {
              // Procurement needs to sign
              // If VP approval required, VP must have signed first
              if (req.requires_vp_approval && !req.ceo_signed) return false;
              return !req.procurement_manager_signed;
            }
            return false;
          });
          setPendingSignatures(pendingForSignature);

          // Find quotes pending this user's signature
          const statusFilter = role === 'vp' ? 'pending_vp' : 'pending_procurement';
          const { count: quoteCount, error: quoteError } = await supabase
            .from('vendor_quotes')
            .select('*', { count: 'exact', head: true })
            .eq('status', statusFilter);

          if (!quoteError && quoteCount !== null) {
            setPendingQuotesCount(quoteCount);
          }
        }
      } catch (error) {
        console.error('Error checking manager role:', error);
      }
    };

    checkManagerRole();
  }, [user, requests]);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const fetchRequests = async () => {
    if (!isSupabaseConfigured || !user || !isApproved) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Use the new Admin Service
      const data = await adminService.getRequests();
      setRequests(data);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן לטעון את הבקשות מהשרת החדש',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && isApproved) {
      fetchRequests();
      fetchVendors();
    }
  }, [user, isApproved]);

  const fetchVendors = async () => {
    if (!isSupabaseConfigured || !user || !isApproved) return;
    setIsVendorsLoading(true);
    try {
      const { data, error } = await supabase
        .from('vendor_requests')
        .select('*')
        .eq('status', 'approved')
        .eq('procurement_manager_signed', true)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setVendors((data as CRMVendor[]) || []);

      const { data: ratingsData } = await supabase.from('vendor_ratings').select('*');
      const ratingsMap = new Map<string, VendorRatingSummary>();
      
      data?.forEach(v => {
        const vendorRatings = (ratingsData || []).filter(r => r.vendor_request_id === v.id);
        const userRating = vendorRatings.find(r => r.user_id === user?.id)?.rating || null;
        const totalRatings = vendorRatings.length;
        const average = totalRatings > 0 ? vendorRatings.reduce((sum, r) => sum + r.rating, 0) / totalRatings : null;
        ratingsMap.set(v.id, { average, userRating, totalRatings });
      });
      setVendorRatings(ratingsMap);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    } finally {
      setIsVendorsLoading(false);
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
      setHistory(data || []);
    } catch (error) {
      console.error('Error fetching history:', error);
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

  const handleSaveEdit = async () => {
    if (!selectedVendor || !editForm) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from('vendor_requests').update(editForm).eq('id', selectedVendor.id);
      if (error) throw error;
      toast({ title: 'השינויים נשמרו' });
      setEditDialogOpen(false);
      fetchVendors();
    } catch (error) {
      console.error('Error saving:', error);
      toast({ title: 'שגיאה', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  // Fetch pending receipts count
  useEffect(() => {
    const fetchPendingReceiptsCount = async () => {
      if (!user || !isApproved) return;

      try {
        const { count, error } = await supabase
          .from('vendor_receipts')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');

        if (!error && count !== null) {
          setPendingReceiptsCount(count);
        }
      } catch (error) {
        console.error('Error fetching pending receipts count:', error);
      }
    };

    fetchPendingReceiptsCount();
  }, [user, isApproved]);

  // Filter requests based on user role and toggle
  const filteredRequests = requests.filter(request => {
    // Only show requests that are NOT fully approved in the onboarding tab
    if (request.status === 'approved') return false;

    // If admin and showing all requests, return all non-approved
    if (isAdmin && showAllRequests) {
      return true;
    }
    // Otherwise show only requests where user is the handler
    return request.handler_email === user?.email ||
      request.handler_name === currentUserName;
  });

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleCreateRequest = async (data: NewRequestData) => {
    if (false) {
      // Temporary disable the check for cleanup
    }

    try {
      // Use the new Admin Service
      await adminService.createRequest({
        ...data,
        // Ensure handler_name is not an email. Prioritize provided name, then currentUserName.
        handler_name: data.handler_name || (currentUserName && !currentUserName.includes('@') ? currentUserName : (user?.user_metadata?.full_name || 'נציג')),
        handler_email: user?.email
      });

      toast({
        title: 'הבקשה נוצרה בהצלחה',
        description: 'הקישור המאובטח נשלח לספק במייל',
      });

      fetchRequests();
    } catch (error: any) {
      console.error('Error creating request:', error);
      toast({
        title: 'שגיאה',
        description: error.message || 'לא ניתן ליצור את הבקשה',
        variant: 'destructive',
      });
    }
  };



  // Show loading while checking auth or approval
  if (authLoading || checkingApproval) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show loading while redirecting to auth
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleResendApprovalRequest = async () => {
    if (!user) return;

    setResendingApproval(true);
    try {
      const { error } = await supabase.functions.invoke('send-approval-request', {
        body: {
          userId: user.id,
          userEmail: user.email,
          userName: user.user_metadata?.full_name || '',
        },
      });

      if (error) throw error;

      toast({
        title: 'הבקשה נשלחה',
        description: 'בקשת האישור נשלחה שוב למנהל המערכת',
      });
    } catch (error) {
      console.error('Error resending approval:', error);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן לשלוח את הבקשה מחדש',
        variant: 'destructive',
      });
    } finally {
      setResendingApproval(false);
    }
  };

  // Show pending approval message
  if (!isApproved) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-6">
            <Clock className="h-16 w-16 mx-auto text-warning mb-4" />
            <h2 className="text-xl font-bold mb-2">ממתין לאישור</h2>
            <p className="text-muted-foreground mb-4">
              ההרשמה שלך ממתינה לאישור מנהל המערכת.
              <br />
              תקבל הודעה כשהרישום יאושר.
            </p>
            <div className="flex flex-col gap-3">
              <Button
                variant="default"
                onClick={handleResendApprovalRequest}
                disabled={resendingApproval}
                className="gap-2"
              >
                {resendingApproval ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    שולח...
                  </>
                ) : (
                  'שלח בקשת אישור שוב'
                )}
              </Button>
              <Button variant="outline" onClick={handleSignOut} className="gap-2">
                <LogOut className="h-4 w-4" />
                התנתק
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Determine if we should show manager view
  const showManagerView = userManagerRole && viewMode === 'manager';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary border-b border-primary/20 shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img
                src="/images/bituach-yashir-logo.png"
                alt="ביטוח ישיר"
                className="h-10 w-auto"
              />
              <div className="border-r border-white/20 pr-4">
                <h1 className="text-xl font-bold text-white">ספק בקליק</h1>
                <p className="text-sm text-white/70">מערכת הקמת ספקים</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white/70 text-sm hidden sm:inline">
                {user.email}
              </span>

              {/* Manager View Toggle */}
              {userManagerRole && (
                <ToggleGroup
                  type="single"
                  size="sm"
                  variant="outline"
                  value={viewMode}
                  onValueChange={(value) => {
                    if (value) setViewMode(value as 'manager' | 'regular');
                  }}
                  className="bg-white/10 rounded-lg p-0.5"
                >
                  <ToggleGroupItem
                    value="manager"
                    className="gap-1.5 text-white data-[state=on]:bg-white data-[state=on]:text-[#1a2b5f] hover:bg-white/20 text-xs px-2"
                  >
                    <FileSignature className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">חתימות</span>
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="regular"
                    className="gap-1.5 text-white data-[state=on]:bg-white data-[state=on]:text-[#1a2b5f] hover:bg-white/20 text-xs px-2"
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">ניהול ספקים</span>
                  </ToggleGroupItem>
                </ToggleGroup>
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setApprovalsOpen(true)}
                className="text-white hover:bg-white/10"
                title="בקשות הרשמה"
              >
                <Users className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSettingsOpen(true)}
                className="text-white hover:bg-white/10"
              >
                <Settings className="h-5 w-5" />
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

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">

        {/* Role-Based Content Rendering */}
        {showManagerView && userManagerRole ? (
          <div className="space-y-6 animate-in fade-in duration-500">
            <ManagerSignaturesView
              role={userManagerRole}
              managerName={userManagerName}
              pendingSignatures={pendingSignatures}
              onRefresh={fetchRequests}
            />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir="rtl">
            <TabsList className="mb-8 grid grid-cols-4 w-full max-w-2xl mx-auto">
              <TabsTrigger value="onboarding" className="gap-2">
                <Plus className="h-4 w-4" />
                בקשות הקמה
              </TabsTrigger>
              <TabsTrigger value="registry" className="gap-2">
                <Building2 className="h-4 w-4" />
                מאגר ספקים
              </TabsTrigger>
              <TabsTrigger value="quotes" className="gap-2">
                <FileSignature className="h-4 w-4" />
                הצעות מחיר
              </TabsTrigger>
              <TabsTrigger value="receipts" className="gap-2 relative">
                <Receipt className="h-4 w-4" />
                קבלות
                {pendingReceiptsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-destructive text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center">
                    {pendingReceiptsCount}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="onboarding" className="animate-in fade-in duration-500">
              {/* Pending Signatures Banner for VP/Procurement Manager (when in regular view) */}
              {userManagerRole && (pendingSignatures.length > 0 || pendingQuotesCount > 0) && (
                <div className="mb-6 p-4 bg-primary/10 border border-primary/30 rounded-lg">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <FileSignature className="h-5 w-5 text-primary" />
                      <span className="text-sm font-medium">
                        {(pendingSignatures.length + pendingQuotesCount) === 1
                          ? 'יש פריט אחד ממתין לחתימתך'
                          : `יש ${pendingSignatures.length + pendingQuotesCount} פריטים ממתינים לחתימתך`
                        }
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      onClick={() => setViewMode('manager')}
                    >
                      <Eye className="h-4 w-4" />
                      עבור לתצוגת חתימות
                    </Button>
                  </div>
                </div>
              )}

              <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-2xl font-semibold">בקשות ספקים בהקמה</h2>
                  <p className="text-muted-foreground">
                    {isAdmin && showAllRequests
                      ? 'צפה בכל הבקשות החדשות במערכת'
                      : 'נהל את תהליך ההקמה של הספקים שלך'}
                  </p>
                </div>
                <div className="flex items-center gap-4 flex-wrap justify-end">
                  {isAdmin && (
                    <ToggleGroup
                      type="single"
                      size="sm"
                      variant="outline"
                      value={showAllRequests ? 'all' : 'mine'}
                      onValueChange={(value) => {
                        if (!value) return;
                        setShowAllRequests(value === 'all');
                      }}
                      className="flex-row-reverse bg-muted/50 rounded-lg p-1"
                    >
                      <ToggleGroupItem value="mine" className="gap-2 whitespace-nowrap">
                        <UserCircle className="h-4 w-4" />
                        הבקשות שלי
                      </ToggleGroupItem>
                      <ToggleGroupItem value="all" className="gap-2 whitespace-nowrap">
                        <Eye className="h-4 w-4" />
                        כל הבקשות
                      </ToggleGroupItem>
                    </ToggleGroup>
                  )}
                  <Button onClick={() => setDialogOpen(true)} className="gap-2" disabled={!isSupabaseConfigured}>
                    <Plus className="h-4 w-4" />
                    בקשה חדשה
                  </Button>
                </div>
              </div>

              <VendorRequestsTable 
                requests={filteredRequests} 
                isLoading={isLoading} 
                currentUserName={currentUserName} 
                onRefresh={fetchRequests}
              />
            </TabsContent>

            <TabsContent value="registry" className="animate-in fade-in duration-300">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold">מאגר ספקים מאושרים</h2>
                <p className="text-muted-foreground">ניהול שוטף, שינוי סטטוסים ודירוג ספקים פעילים</p>
              </div>
              <VendorRegistryView
                vendors={vendors}
                vendorRatings={vendorRatings}
                isLoading={isVendorsLoading}
                isAdmin={isAdmin}
                currentUserName={currentUserName}
                onRefresh={fetchVendors}
                onEdit={handleEdit}
                onViewHistory={handleViewHistory}
              />
            </TabsContent>

            <TabsContent value="quotes" className="animate-in fade-in duration-300">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold">ניהול הצעות מחיר</h2>
                <p className="text-muted-foreground">מעקב ובקרה אחר הצעות מחיר ואישורי מנהלים</p>
              </div>
              <VendorQuotesView 
                currentUserName={currentUserName} 
                currentUserEmail={user?.email}
                isVP={userManagerRole === 'vp' || isAdmin}
                isProcurementManager={userManagerRole === 'procurement' || isAdmin}
              />
            </TabsContent>

            <TabsContent value="receipts" className="animate-in fade-in duration-300">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold">קבלות ותשלומים</h2>
                <p className="text-muted-foreground">ריכוז כל הקבלות שהתקבלו מהספקים השונים</p>
              </div>
              <AllReceiptsView currentUserName={currentUserName} />
            </TabsContent>
          </Tabs>
        )}
      </main>

      <NewRequestDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleCreateRequest}
      />

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />

      <PendingApprovalsDialog
        open={approvalsOpen}
        onOpenChange={setApprovalsOpen}
      />

      <ContractSigningDialog
        open={contractDialogOpen}
        onOpenChange={setContractDialogOpen}
        vendorRequestId={selectedContractRequest?.id || null}
        vendorName={selectedContractRequest?.vendor_name || ''}
        onSignComplete={() => {
          fetchRequests();
          setContractDialogOpen(false);
        }}
      />

      {/* Edit Vendor Dialog (Migrated from CRM) */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>עריכת פרטי ספק - {selectedVendor?.vendor_name}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>שם הספק</Label>
              <Input value={editForm.vendor_name || ''} onChange={e => setEditForm({...editForm, vendor_name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>אימייל</Label>
              <Input value={editForm.vendor_email || ''} onChange={e => setEditForm({...editForm, vendor_email: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>ח.פ / ע.מ</Label>
              <Input value={editForm.company_id || ''} onChange={e => setEditForm({...editForm, company_id: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>עיר</Label>
              <Input value={editForm.city || ''} onChange={e => setEditForm({...editForm, city: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>ביטול</Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? <Loader2 className="animate-spin h-4 w-4 ml-2" /> : 'שמור שינויים'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog (Migrated from CRM) */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]" dir="rtl">
          <DialogHeader>
            <DialogTitle>היסטוריית שינויים - {selectedVendor?.vendor_name}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[400px] pr-4">
            {historyLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="animate-spin h-6 w-6 text-primary" /></div>
            ) : history.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">אין היסטוריית שינויים</div>
            ) : (
              <div className="space-y-4">
                {history.map((item) => (
                  <Card key={item.id}>
                    <CardContent className="pt-4 text-right">
                      <p className="font-medium">{item.action === 'status_change' ? 'שינוי סטטוס' : 'עדכון שדה'}</p>
                      <p className="text-sm text-muted-foreground">שדה: {item.field_name}</p>
                      <div className="flex gap-2 mt-2 text-sm">
                        <Badge variant="outline" className="bg-red-50">מ: {item.old_value}</Badge>
                        <Badge variant="outline" className="bg-green-50">ל: {item.new_value}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">{format(new Date(item.changed_at), 'dd/MM/yyyy HH:mm', { locale: he })}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
