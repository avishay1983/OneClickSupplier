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
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AppSettings {
  master_otp_code: string;
  car_manager_email: string;
  car_manager_name: string;
  vp_email: string;
  vp_name: string;
  procurement_manager_email: string;
  procurement_manager_name: string;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [settings, setSettings] = useState<AppSettings>({
    master_otp_code: '',
    car_manager_email: '',
    car_manager_name: '',
    vp_email: '',
    vp_name: '',
    procurement_manager_email: '',
    procurement_manager_name: '',
  });
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
        .select('setting_key, setting_value');

      if (error) throw error;
      
      const settingsMap: AppSettings = {
        master_otp_code: '',
        car_manager_email: '',
        car_manager_name: '',
        vp_email: '',
        vp_name: '',
        procurement_manager_email: '',
        procurement_manager_name: '',
      };
      
      (data as any[])?.forEach((item: any) => {
        if (item.setting_key in settingsMap) {
          settingsMap[item.setting_key as keyof AppSettings] = item.setting_value;
        }
      });
      
      setSettings(settingsMap);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings.master_otp_code.trim()) {
      toast({
        title: 'שגיאה',
        description: 'יש להזין קוד ברירת מחדל',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      // Update or insert each setting
      const settingsToSave = [
        { key: 'master_otp_code', value: settings.master_otp_code.trim() },
        { key: 'car_manager_email', value: settings.car_manager_email.trim() },
        { key: 'car_manager_name', value: settings.car_manager_name.trim() },
        { key: 'vp_email', value: settings.vp_email.trim() },
        { key: 'vp_name', value: settings.vp_name.trim() },
        { key: 'procurement_manager_email', value: settings.procurement_manager_email.trim() },
        { key: 'procurement_manager_name', value: settings.procurement_manager_name.trim() },
      ];

      for (const setting of settingsToSave) {
        const { error } = await supabase
          .from('app_settings' as any)
          .upsert(
            { setting_key: setting.key, setting_value: setting.value },
            { onConflict: 'setting_key' }
          );

        if (error) throw error;
      }

      toast({
        title: 'ההגדרות נשמרו',
        description: 'ההגדרות עודכנו בהצלחה',
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

  const updateSetting = (key: keyof AppSettings, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" dir="rtl">
        <DialogHeader>
          <DialogTitle>הגדרות מערכת</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* OTP Settings */}
          <div className="space-y-2">
            <Label htmlFor="masterOtp">קוד OTP ברירת מחדל</Label>
            <Input
              id="masterOtp"
              value={settings.master_otp_code}
              onChange={(e) => updateSetting('master_otp_code', e.target.value)}
              placeholder="הזן קוד ברירת מחדל"
              disabled={isLoading}
              className="text-right"
            />
            <p className="text-sm text-muted-foreground">
              קוד זה יעבוד תמיד לפתיחת טפסי ספקים, בנוסף לקוד שנשלח במייל
            </p>
          </div>

          <Separator />

          {/* Approval Emails */}
          <div className="space-y-4">
            <h3 className="font-medium">כתובות מייל לאישור הקמת ספק</h3>
            
            <div className="space-y-2">
              <Label htmlFor="carManagerName">שם מנהל רכש</Label>
              <Input
                id="carManagerName"
                value={settings.car_manager_name}
                onChange={(e) => updateSetting('car_manager_name', e.target.value)}
                placeholder="הזן שם מנהל רכש"
                disabled={isLoading}
                className="text-right"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="carManagerEmail">מייל מנהל רכש</Label>
              <Input
                id="carManagerEmail"
                type="email"
                value={settings.car_manager_email}
                onChange={(e) => updateSetting('car_manager_email', e.target.value)}
                placeholder="הזן כתובת מייל"
                disabled={isLoading}
                className="text-right"
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vpName">שם סמנכ"ל</Label>
              <Input
                id="vpName"
                value={settings.vp_name}
                onChange={(e) => updateSetting('vp_name', e.target.value)}
                placeholder="הזן שם סמנכ״ל"
                disabled={isLoading}
                className="text-right"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vpEmail">מייל סמנכ"ל</Label>
              <Input
                id="vpEmail"
                type="email"
                value={settings.vp_email}
                onChange={(e) => updateSetting('vp_email', e.target.value)}
                placeholder="הזן כתובת מייל"
                disabled={isLoading}
                className="text-right"
                dir="ltr"
              />
            </div>

            <Separator className="my-4" />

            <h3 className="font-medium">כתובות מייל לאישור הצעות מחיר</h3>

            <div className="space-y-2">
              <Label htmlFor="procurementManagerName">שם מנהל רכש (הצעות מחיר)</Label>
              <Input
                id="procurementManagerName"
                value={settings.procurement_manager_name}
                onChange={(e) => updateSetting('procurement_manager_name', e.target.value)}
                placeholder="הזן שם מנהל רכש"
                disabled={isLoading}
                className="text-right"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="procurementManagerEmail">מייל מנהל רכש (הצעות מחיר)</Label>
              <Input
                id="procurementManagerEmail"
                type="email"
                value={settings.procurement_manager_email}
                onChange={(e) => updateSetting('procurement_manager_email', e.target.value)}
                placeholder="הזן כתובת מייל"
                disabled={isLoading}
                className="text-right"
                dir="ltr"
              />
            </div>

            <p className="text-sm text-muted-foreground">
              כתובות אלו יקבלו מייל עם כל פרטי הספק לאחר שליחת הטופס
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
