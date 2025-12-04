import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Building2 } from 'lucide-react';
import { VendorRequestsTable } from '@/components/dashboard/VendorRequestsTable';
import { NewRequestDialog, NewRequestData } from '@/components/dashboard/NewRequestDialog';
import { VendorRequest } from '@/types/vendor';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export default function Dashboard() {
  const [requests, setRequests] = useState<VendorRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('vendor_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
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
    const secureToken = crypto.randomUUID();
    
    const { error } = await supabase
      .from('vendor_requests')
      .insert({
        ...data,
        secure_token: secureToken,
        status: 'with_vendor',
        payment_terms: 'שוטף + 60',
      });

    if (error) throw error;

    toast({
      title: 'הבקשה נוצרה בהצלחה',
      description: 'הקישור המאובטח מוכן לשליחה לספק',
    });

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
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">בקשות ספקים</h2>
            <p className="text-muted-foreground">צפה ונהל בקשות הקמת ספקים</p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
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