import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { STATUS_LABELS, VendorStatus } from '@/types/vendor';

interface StatusHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendorRequestId: string;
  vendorName: string;
}

interface StatusHistoryEntry {
  id: string;
  old_status: string | null;
  new_status: string;
  changed_at: string;
  changed_by: string | null;
}

export function StatusHistoryDialog({
  open,
  onOpenChange,
  vendorRequestId,
  vendorName,
}: StatusHistoryDialogProps) {
  const [history, setHistory] = useState<StatusHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (open && vendorRequestId) {
      fetchHistory();
    }
  }, [open, vendorRequestId]);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('vendor_status_history')
        .select('*')
        .eq('vendor_request_id', vendorRequestId)
        .order('changed_at', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error fetching status history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusLabel = (status: string | null): string => {
    if (!status) return '-';
    return STATUS_LABELS[status as VendorStatus] || status;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">היסטוריית סטטוס - {vendorName}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>אין היסטוריית שינויי סטטוס</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {history.map((entry, index) => (
              <div
                key={entry.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">
                      {getStatusLabel(entry.old_status)}
                    </span>
                    <span className="text-muted-foreground">←</span>
                    <span className="font-medium">
                      {getStatusLabel(entry.new_status)}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(entry.changed_at).toLocaleString('he-IL', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                  {history.length - index}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
