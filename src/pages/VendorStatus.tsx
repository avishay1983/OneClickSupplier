import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Clock, CheckCircle, FileText, Loader2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

type VendorStatus = 'pending' | 'with_vendor' | 'submitted' | 'approved' | 'resent';

interface VendorStatusData {
  vendor_name: string;
  status: VendorStatus;
  created_at: string;
  updated_at: string;
}

// Map internal statuses to vendor-friendly statuses
const getVendorFriendlyStatus = (status: VendorStatus): { label: string; description: string; icon: React.ReactNode; color: string } => {
  switch (status) {
    case 'pending':
    case 'with_vendor':
    case 'resent':
      return {
        label: 'ממתין למילוי פרטים',
        description: 'הבקשה נוצרה וממתינה למילוי הפרטים שלך',
        icon: <Clock className="h-16 w-16" />,
        color: 'text-amber-500'
      };
    case 'submitted':
      return {
        label: 'בבדיקה',
        description: 'הפרטים שלך התקבלו ונמצאים בבדיקה. נעדכן אותך כשהתהליך יושלם.',
        icon: <FileText className="h-16 w-16" />,
        color: 'text-blue-500'
      };
    case 'approved':
      return {
        label: 'אושר',
        description: 'הבקשה אושרה! הקמת הספק הושלמה בהצלחה.',
        icon: <CheckCircle className="h-16 w-16" />,
        color: 'text-green-500'
      };
    default:
      return {
        label: 'לא ידוע',
        description: 'לא ניתן לקבוע את סטטוס הבקשה',
        icon: <AlertCircle className="h-16 w-16" />,
        color: 'text-muted-foreground'
      };
  }
};

export default function VendorStatus() {
  const { token } = useParams<{ token: string }>();
  const [statusData, setStatusData] = useState<VendorStatusData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      if (!token) return;
      
      if (!isSupabaseConfigured) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('vendor_requests')
          .select('vendor_name, status, created_at, updated_at')
          .eq('secure_token', token)
          .maybeSingle();

        if (error) throw error;
        
        if (!data) {
          setNotFound(true);
        } else {
          setStatusData(data as VendorStatusData);
        }
      } catch (error) {
        console.error('Error fetching status:', error);
        setNotFound(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatus();
  }, [token]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-6">
            <AlertCircle className="h-16 w-16 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-bold mb-2">הבקשה לא נמצאה</h2>
            <p className="text-muted-foreground">
              לא ניתן למצוא את הבקשה המבוקשת. אנא פנה לאיש הקשר שלך בחברה.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const friendlyStatus = getVendorFriendlyStatus(statusData!.status);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-[#1a2b5f] border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <img 
              src="/images/bituach-yashir-logo.png" 
              alt="ביטוח ישיר" 
              className="h-10 w-auto"
            />
            <div className="border-r border-white/20 pr-4">
              <h1 className="text-xl font-bold text-white">סטטוס בקשה להקמת ספק</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Status Content */}
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">שלום {statusData?.vendor_name}</CardTitle>
            <p className="text-muted-foreground">להלן סטטוס הבקשה שלך</p>
          </CardHeader>
          <CardContent className="pt-6">
            {/* Status Icon and Label */}
            <div className="text-center mb-8">
              <div className={`mx-auto mb-4 ${friendlyStatus.color}`}>
                {friendlyStatus.icon}
              </div>
              <h3 className="text-2xl font-bold mb-2">{friendlyStatus.label}</h3>
              <p className="text-muted-foreground">{friendlyStatus.description}</p>
            </div>

            {/* Timeline */}
            <div className="border-t pt-6 space-y-4">
              <h4 className="font-semibold text-lg mb-4">היסטוריית הבקשה</h4>
              
              <div className="flex items-start gap-4">
                <div className="w-3 h-3 rounded-full bg-green-500 mt-1.5"></div>
                <div>
                  <p className="font-medium">הבקשה נוצרה</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(statusData!.created_at), 'dd/MM/yyyy בשעה HH:mm', { locale: he })}
                  </p>
                </div>
              </div>

              {statusData!.status === 'submitted' || statusData!.status === 'approved' ? (
                <div className="flex items-start gap-4">
                  <div className="w-3 h-3 rounded-full bg-blue-500 mt-1.5"></div>
                  <div>
                    <p className="font-medium">פרטים הוגשו</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(statusData!.updated_at), 'dd/MM/yyyy בשעה HH:mm', { locale: he })}
                    </p>
                  </div>
                </div>
              ) : null}

              {statusData!.status === 'approved' && (
                <div className="flex items-start gap-4">
                  <div className="w-3 h-3 rounded-full bg-green-500 mt-1.5"></div>
                  <div>
                    <p className="font-medium">הבקשה אושרה</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(statusData!.updated_at), 'dd/MM/yyyy בשעה HH:mm', { locale: he })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          לשאלות נוספות, אנא פנה לאיש הקשר שלך בחברה
        </p>
      </main>
    </div>
  );
}
