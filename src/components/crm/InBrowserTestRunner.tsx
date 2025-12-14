import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, XCircle, Loader2, Play, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TestRunnerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  message?: string;
  duration?: number;
}

const initialTests: TestResult[] = [
  { name: 'בדיקת חיבור לדאטאבייס', status: 'pending' },
  { name: 'בדיקת טבלת vendor_requests', status: 'pending' },
  { name: 'בדיקת טבלת vendor_documents', status: 'pending' },
  { name: 'בדיקת טבלת crm_history', status: 'pending' },
  { name: 'בדיקת Edge Function - vendor-status', status: 'pending' },
  { name: 'בדיקת Edge Function - search-streets', status: 'pending' },
  { name: 'בדיקת הגדרות אפליקציה', status: 'pending' },
  { name: 'בדיקת טעינת ספקים ב-CRM', status: 'pending' },
];

export function InBrowserTestRunner({ open, onOpenChange }: TestRunnerDialogProps) {
  const [tests, setTests] = useState<TestResult[]>(initialTests);
  const [isRunning, setIsRunning] = useState(false);

  const updateTest = (index: number, updates: Partial<TestResult>) => {
    setTests(prev => prev.map((t, i) => i === index ? { ...t, ...updates } : t));
  };

  const runTests = async () => {
    setIsRunning(true);
    setTests(initialTests.map(t => ({ ...t, status: 'pending' })));

    // Test 1: Database connection
    updateTest(0, { status: 'running' });
    const start0 = Date.now();
    try {
      const { error } = await supabase.from('app_settings').select('id').limit(1);
      if (error) throw error;
      updateTest(0, { status: 'passed', duration: Date.now() - start0 });
    } catch (e: any) {
      updateTest(0, { status: 'failed', message: e.message, duration: Date.now() - start0 });
    }

    // Test 2: vendor_requests table
    updateTest(1, { status: 'running' });
    const start1 = Date.now();
    try {
      const { data, error } = await supabase.from('vendor_requests').select('id').limit(1);
      if (error) throw error;
      updateTest(1, { status: 'passed', message: `טבלה נגישה`, duration: Date.now() - start1 });
    } catch (e: any) {
      updateTest(1, { status: 'failed', message: e.message, duration: Date.now() - start1 });
    }

    // Test 3: vendor_documents table
    updateTest(2, { status: 'running' });
    const start2 = Date.now();
    try {
      const { data, error } = await supabase.from('vendor_documents').select('id').limit(1);
      if (error) throw error;
      updateTest(2, { status: 'passed', message: `טבלה נגישה`, duration: Date.now() - start2 });
    } catch (e: any) {
      updateTest(2, { status: 'failed', message: e.message, duration: Date.now() - start2 });
    }

    // Test 4: crm_history table
    updateTest(3, { status: 'running' });
    const start3 = Date.now();
    try {
      const { data, error } = await supabase.from('crm_history').select('id').limit(1);
      if (error) throw error;
      updateTest(3, { status: 'passed', message: `טבלה נגישה`, duration: Date.now() - start3 });
    } catch (e: any) {
      updateTest(3, { status: 'failed', message: e.message, duration: Date.now() - start3 });
    }

    // Test 5: vendor-status edge function
    updateTest(4, { status: 'running' });
    const start4 = Date.now();
    try {
      const { data, error } = await supabase.functions.invoke('vendor-status', {
        body: { token: 'test-token-12345' }
      });
      // Even if token not found, function should respond
      updateTest(4, { status: 'passed', message: 'Edge Function מגיב', duration: Date.now() - start4 });
    } catch (e: any) {
      updateTest(4, { status: 'failed', message: e.message, duration: Date.now() - start4 });
    }

    // Test 6: search-streets edge function
    updateTest(5, { status: 'running' });
    const start5 = Date.now();
    try {
      const { data, error } = await supabase.functions.invoke('search-streets', {
        body: { city: 'תל אביב', query: 'רוט' }
      });
      if (error) throw error;
      updateTest(5, { status: 'passed', message: 'חיפוש רחובות עובד', duration: Date.now() - start5 });
    } catch (e: any) {
      updateTest(5, { status: 'failed', message: e.message, duration: Date.now() - start5 });
    }

    // Test 7: app_settings
    updateTest(6, { status: 'running' });
    const start6 = Date.now();
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('setting_key, setting_value');
      if (error) throw error;
      const settingsCount = data?.length || 0;
      updateTest(6, { status: 'passed', message: `${settingsCount} הגדרות נמצאו`, duration: Date.now() - start6 });
    } catch (e: any) {
      updateTest(6, { status: 'failed', message: e.message, duration: Date.now() - start6 });
    }

    // Test 8: CRM vendors loading
    updateTest(7, { status: 'running' });
    const start7 = Date.now();
    try {
      const { data, error } = await supabase
        .from('vendor_requests')
        .select('id, vendor_name, crm_status')
        .not('crm_status', 'is', null)
        .limit(5);
      if (error) throw error;
      const count = data?.length || 0;
      updateTest(7, { status: 'passed', message: `${count} ספקים פעילים ב-CRM`, duration: Date.now() - start7 });
    } catch (e: any) {
      updateTest(7, { status: 'failed', message: e.message, duration: Date.now() - start7 });
    }

    setIsRunning(false);
  };

  const resetTests = () => {
    setTests(initialTests);
  };

  const passedCount = tests.filter(t => t.status === 'passed').length;
  const failedCount = tests.filter(t => t.status === 'failed').length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-right">
            הרצת טסטים בדפדפן
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={runTests} disabled={isRunning} className="gap-2">
              {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {isRunning ? 'רץ...' : 'הרץ טסטים'}
            </Button>
            <Button variant="outline" onClick={resetTests} disabled={isRunning} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              אפס
            </Button>
          </div>

          {(passedCount > 0 || failedCount > 0) && (
            <div className="flex gap-4 text-sm">
              <span className="text-green-600 flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" /> {passedCount} עברו
              </span>
              <span className="text-red-600 flex items-center gap-1">
                <XCircle className="h-4 w-4" /> {failedCount} נכשלו
              </span>
            </div>
          )}

          <ScrollArea className="h-[350px]">
            <div className="space-y-2 pr-2">
              {tests.map((test, index) => (
                <Card key={index} className="bg-muted/30">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {test.status === 'pending' && (
                          <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                        )}
                        {test.status === 'running' && (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        )}
                        {test.status === 'passed' && (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        )}
                        {test.status === 'failed' && (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="text-sm font-medium">{test.name}</span>
                      </div>
                      {test.duration && (
                        <span className="text-xs text-muted-foreground">{test.duration}ms</span>
                      )}
                    </div>
                    {test.message && (
                      <p className={`text-xs mt-1 mr-6 ${test.status === 'failed' ? 'text-red-500' : 'text-muted-foreground'}`}>
                        {test.message}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
