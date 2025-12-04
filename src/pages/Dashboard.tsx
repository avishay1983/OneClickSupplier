import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Building2, AlertTriangle } from 'lucide-react';
import { VendorRequestsTable } from '@/components/dashboard/VendorRequestsTable';
import { NewRequestDialog, NewRequestData } from '@/components/dashboard/NewRequestDialog';
import { VendorRequest } from '@/types/vendor';
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function Dashboard() {
  const [requests, setRequests] = useState<VendorRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchRequests = async () => {
    if (!isSupabaseConfigured) {
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
    fetchRequests();
  }, []);

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
    
    const { error } = await supabase
      .from('vendor_requests')
      .insert({
        ...dbData,
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary rounded-lg p-2">
                <Building2 className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">מערכת הקמת ספקים</h1>
                <p className="text-sm text-muted-foreground">ניהול בקשות הקמת ספק חדש</p>
              </div>
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

        <VendorRequestsTable requests={requests} isLoading={isLoading} />
      </main>

      <NewRequestDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleCreateRequest}
      />
    </div>
  );
}