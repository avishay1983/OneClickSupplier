import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [masterOtpCode, setMasterOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      fetchSettings();
    }
  }, [open]);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('app_settings' as any)
        .select('setting_value')
        .eq('setting_key', 'master_otp_code')
        .single();

      if (error) throw error;
      setMasterOtpCode((data as any)?.setting_value || '');
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!masterOtpCode.trim()) {
      toast({
        title: 'שגיאה',
        description: 'יש להזין קוד ברירת מחדל',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('app_settings' as any)
        .update({ setting_value: masterOtpCode.trim() })
        .eq('setting_key', 'master_otp_code');

      if (error) throw error;

      toast({
        title: 'ההגדרות נשמרו',
        description: 'קוד ברירת המחדל עודכן בהצלחה',
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן לשמור את ההגדרות',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]" dir="rtl">
        <DialogHeader>
          <DialogTitle>הגדרות מערכת</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="masterOtp">קוד OTP ברירת מחדל</Label>
            <Input
              id="masterOtp"
              value={masterOtpCode}
              onChange={(e) => setMasterOtpCode(e.target.value)}
              placeholder="הזן קוד ברירת מחדל"
              disabled={isLoading}
              className="text-right"
            />
            <p className="text-sm text-muted-foreground">
              קוד זה יעבוד תמיד לפתיחת טפסי ספקים, בנוסף לקוד שנשלח במייל
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            ביטול
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'שומר...' : 'שמור'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
