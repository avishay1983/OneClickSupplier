import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, AlertTriangle, Settings, LogOut, Loader2, Clock, Users, Building2, FileSignature, Pen } from 'lucide-react';
import { VendorRequestsTable } from '@/components/dashboard/VendorRequestsTable';
import { NewRequestDialog, NewRequestData, BulkVendorData } from '@/components/dashboard/NewRequestDialog';
import { SettingsDialog } from '@/components/dashboard/SettingsDialog';
import { PendingApprovalsDialog } from '@/components/dashboard/PendingApprovalsDialog';
import { VendorRequest } from '@/types/vendor';
import { ContractSigningDialog } from '@/components/dashboard/ContractSigningDialog';
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';

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
  const [pendingSignatures, setPendingSignatures] = useState<VendorRequest[]>([]);
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [selectedContractRequest, setSelectedContractRequest] = useState<VendorRequest | null>(null);

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
          setCurrentUserName(profile?.full_name || user.email || 'משתמש');
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
        if (userEmail === vpEmail) {
          role = 'vp';
        } else if (userEmail === procurementEmail) {
          role = 'procurement';
        }
        setUserManagerRole(role);

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
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const fetchRequests = async () => {
    if (!isSupabaseConfigured || !user || !isApproved) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('vendor_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests((data as VendorRequest[]) || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
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
    if (user && isApproved) {
      fetchRequests();
    }
  }, [user, isApproved]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleCreateRequest = async (data: NewRequestData) => {
    if (!isSupabaseConfigured) {
      toast({
        title: 'שגיאה',
        description: 'יש להפעיל את Lovable Cloud כדי ליצור בקשות',
        variant: 'destructive',
      });
      return;
    }
    
    const secureToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (data.expires_in_days || 7));
    
    // Remove expires_in_days from data as it's not a DB column
    const { expires_in_days, ...dbData } = data;
    
    // Set handler_email to current user's email if handler_name is the current user
    const requestData = {
      ...dbData,
      handler_email: user?.email || null,
    };
    
    const { error } = await supabase
      .from('vendor_requests')
      .insert({
        ...requestData,
        secure_token: secureToken,
        status: 'with_vendor',
        payment_terms: 'שוטף + 60',
        expires_at: expiresAt.toISOString(),
      });

    if (error) throw error;

    // Send email to vendor
    const secureLink = `${window.location.origin}/vendor/${secureToken}`;
    try {
      const { error: emailError } = await supabase.functions.invoke('send-vendor-email', {
        body: {
          vendorName: data.vendor_name,
          vendorEmail: data.vendor_email,
          secureLink,
        },
      });

      if (emailError) {
        console.error('Email error:', emailError);
        toast({
          title: 'הבקשה נוצרה',
          description: 'הבקשה נוצרה אך שליחת המייל נכשלה. ניתן להעתיק את הקישור ידנית.',
          variant: 'default',
        });
      } else {
        toast({
          title: 'הבקשה נוצרה בהצלחה',
          description: 'הקישור המאובטח נשלח לספק במייל',
        });
      }
    } catch (emailErr) {
      console.error('Email send error:', emailErr);
      toast({
        title: 'הבקשה נוצרה',
        description: 'הבקשה נוצרה אך שליחת המייל נכשלה. ניתן להעתיק את הקישור ידנית.',
      });
    }

    fetchRequests();
  };

  const handleBulkCreateRequests = async (vendors: BulkVendorData[]) => {
    if (!isSupabaseConfigured) {
      toast({
        title: 'שגיאה',
        description: 'יש להפעיל את Lovable Cloud כדי ליצור בקשות',
        variant: 'destructive',
      });
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const vendor of vendors) {
      try {
        const secureToken = crypto.randomUUID();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + (vendor.expires_in_days || 7));

        const { error } = await supabase
          .from('vendor_requests')
          .insert({
            vendor_name: vendor.vendor_name,
            vendor_email: vendor.vendor_email,
            secure_token: secureToken,
            status: 'with_vendor',
            payment_terms: 'שוטף + 60',
            expires_at: expiresAt.toISOString(),
            handler_name: vendor.handler_name || currentUserName,
            handler_email: user?.email || null,
            vendor_type: vendor.vendor_type || 'general',
            requires_vp_approval: vendor.requires_vp_approval ?? true,
            requires_contract_signature: true,
          });

        if (error) {
          console.error('Error creating request:', error);
          failCount++;
          continue;
        }

        // Send email to vendor
        const secureLink = `${window.location.origin}/vendor/${secureToken}`;
        try {
          await supabase.functions.invoke('send-vendor-email', {
            body: {
              vendorName: vendor.vendor_name,
              vendorEmail: vendor.vendor_email,
              secureLink,
            },
          });
          successCount++;
        } catch (emailErr) {
          console.error('Email send error:', emailErr);
          successCount++; // Request was created, just email failed
        }
      } catch (err) {
        console.error('Error processing vendor:', err);
        failCount++;
      }
    }

    if (successCount > 0) {
      toast({
        title: 'הבקשות נוצרו בהצלחה',
        description: `${successCount} קישורים נשלחו לספקים${failCount > 0 ? `. ${failCount} נכשלו.` : ''}`,
      });
    } else {
      toast({
        title: 'שגיאה',
        description: 'לא ניתן ליצור את הבקשות',
        variant: 'destructive',
      });
    }

    fetchRequests();
  };

  // Show loading while checking auth or approval
  if (authLoading || checkingApproval) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!user) {
    return null;
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

  return (
    <div className="min-h-screen bg-background">
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
                <h1 className="text-xl font-bold text-white">ספק בקליק</h1>
                <p className="text-sm text-white/70">מערכת הקמת ספקים</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white/70 text-sm hidden sm:inline">
                {user.email}
              </span>
              <Button
                variant="ghost"
                onClick={() => navigate('/crm')}
                className="text-white hover:bg-white/10 gap-2"
              >
                <Building2 className="h-5 w-5" />
                <span className="hidden sm:inline">CRM ספקים</span>
              </Button>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setApprovalsOpen(true)}
                  className="text-white hover:bg-white/10"
                  title="בקשות הרשמה"
                >
                  <Users className="h-5 w-5" />
                </Button>
              )}
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
        {!isSupabaseConfigured && (
          <Alert className="mb-6 border-warning bg-warning/10">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <AlertTitle className="text-warning">נדרשת הגדרת מסד נתונים</AlertTitle>
            <AlertDescription>
              כדי להשתמש במערכת, יש להפעיל את Lovable Cloud דרך לשונית "Cloud" בצד ימין של המסך.
              לאחר ההפעלה, צור טבלה בשם "vendor_requests" עם השדות הנדרשים.
            </AlertDescription>
          </Alert>
        )}

        {/* Pending Signatures Banner for VP/Procurement Manager */}
        {userManagerRole && pendingSignatures.length > 0 && (
          <div className="mb-6 p-6 bg-primary/10 border-2 border-primary rounded-xl animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary rounded-full">
                  <FileSignature className="h-8 w-8 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-primary">
                    {pendingSignatures.length === 1 
                      ? 'יש חוזה אחד ממתין לחתימתך!'
                      : `יש ${pendingSignatures.length} חוזים ממתינים לחתימתך!`
                    }
                  </h3>
                  <p className="text-muted-foreground">
                    לחץ על הכפתור כדי לחתום על החוזה{pendingSignatures.length > 1 ? 'ים' : ''}
                  </p>
                </div>
              </div>
              <Button 
                size="lg"
                className="gap-3 text-lg px-8 py-6 h-auto shadow-lg hover:shadow-xl transition-shadow"
                onClick={() => {
                  setSelectedContractRequest(pendingSignatures[0]);
                  setContractDialogOpen(true);
                }}
              >
                <Pen className="h-6 w-6" />
                חתום עכשיו
              </Button>
            </div>
            {pendingSignatures.length > 1 && (
              <div className="mt-4 pt-4 border-t border-primary/20">
                <p className="text-sm text-muted-foreground mb-2">חוזים ממתינים:</p>
                <div className="flex flex-wrap gap-2">
                  {pendingSignatures.map((req, idx) => (
                    <Button
                      key={req.id}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => {
                        setSelectedContractRequest(req);
                        setContractDialogOpen(true);
                      }}
                    >
                      <FileSignature className="h-4 w-4" />
                      {req.vendor_name}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">בקשות ספקים</h2>
            <p className="text-muted-foreground">צפה ונהל בקשות הקמת ספקים</p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="gap-2" disabled={!isSupabaseConfigured}>
            <Plus className="h-4 w-4" />
            בקשה חדשה
          </Button>
        </div>

        <VendorRequestsTable requests={requests} isLoading={isLoading} currentUserName={currentUserName} />
      </main>

      <NewRequestDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleCreateRequest}
        onBulkSubmit={handleBulkCreateRequests}
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
    </div>
  );
}
