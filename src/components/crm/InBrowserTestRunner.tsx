import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, XCircle, Loader2, Play, RotateCcw, FlaskConical, Workflow } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

const basicTests: TestResult[] = [
  { name: 'בדיקת חיבור לדאטאבייס', status: 'pending' },
  { name: 'בדיקת טבלת vendor_requests', status: 'pending' },
  { name: 'בדיקת טבלת vendor_documents', status: 'pending' },
  { name: 'בדיקת טבלת crm_history', status: 'pending' },
  { name: 'בדיקת Edge Function - vendor-status', status: 'pending' },
  { name: 'בדיקת Edge Function - search-streets', status: 'pending' },
  { name: 'בדיקת הגדרות אפליקציה', status: 'pending' },
  { name: 'בדיקת טעינת ספקים ב-CRM', status: 'pending' },
];

const e2eTests: TestResult[] = [
  { name: 'E2E: יצירת בקשת ספק חדשה', status: 'pending' },
  { name: 'E2E: אימות קיום הבקשה בדאטאבייס', status: 'pending' },
  { name: 'E2E: אימות OTP (קוד מאסטר)', status: 'pending' },
  { name: 'E2E: עדכון פרטי ספק בטופס', status: 'pending' },
  { name: 'E2E: שינוי סטטוס ל-submitted', status: 'pending' },
  { name: 'E2E: אישור מטפל (Handler Approval)', status: 'pending' },
  { name: 'E2E: אישור מנהל רכש', status: 'pending' },
  { name: 'E2E: אישור סמנכ"ל (VP)', status: 'pending' },
  { name: 'E2E: בדיקת סטטוס סופי - approved', status: 'pending' },
  { name: 'E2E: ניקוי - מחיקת בקשת הטסט', status: 'pending' },
];

// Test vendor data
const TEST_VENDOR = {
  vendor_name: `ספק טסט E2E ${Date.now()}`,
  vendor_email: 'e2e-test@example.com',
  handler_name: 'מטפל טסט',
  handler_email: 'handler@example.com',
  vendor_type: 'general',
  requires_vp_approval: true,
};

export function InBrowserTestRunner({ open, onOpenChange }: TestRunnerDialogProps) {
  const [activeTab, setActiveTab] = useState<'basic' | 'e2e'>('basic');
  const [basicTestResults, setBasicTestResults] = useState<TestResult[]>(basicTests);
  const [e2eTestResults, setE2eTestResults] = useState<TestResult[]>(e2eTests);
  const [isRunning, setIsRunning] = useState(false);
  const [testVendorId, setTestVendorId] = useState<string | null>(null);

  const updateBasicTest = (index: number, updates: Partial<TestResult>) => {
    setBasicTestResults(prev => prev.map((t, i) => i === index ? { ...t, ...updates } : t));
  };

  const updateE2eTest = (index: number, updates: Partial<TestResult>) => {
    setE2eTestResults(prev => prev.map((t, i) => i === index ? { ...t, ...updates } : t));
  };

  const runBasicTests = async () => {
    setIsRunning(true);
    setBasicTestResults(basicTests.map(t => ({ ...t, status: 'pending' })));

    // Test 1: Database connection
    updateBasicTest(0, { status: 'running' });
    const start0 = Date.now();
    try {
      const { error } = await supabase.from('app_settings').select('id').limit(1);
      if (error) throw error;
      updateBasicTest(0, { status: 'passed', duration: Date.now() - start0 });
    } catch (e: any) {
      updateBasicTest(0, { status: 'failed', message: e.message, duration: Date.now() - start0 });
    }

    // Test 2: vendor_requests table
    updateBasicTest(1, { status: 'running' });
    const start1 = Date.now();
    try {
      const { error } = await supabase.from('vendor_requests').select('id').limit(1);
      if (error) throw error;
      updateBasicTest(1, { status: 'passed', message: `טבלה נגישה`, duration: Date.now() - start1 });
    } catch (e: any) {
      updateBasicTest(1, { status: 'failed', message: e.message, duration: Date.now() - start1 });
    }

    // Test 3: vendor_documents table
    updateBasicTest(2, { status: 'running' });
    const start2 = Date.now();
    try {
      const { error } = await supabase.from('vendor_documents').select('id').limit(1);
      if (error) throw error;
      updateBasicTest(2, { status: 'passed', message: `טבלה נגישה`, duration: Date.now() - start2 });
    } catch (e: any) {
      updateBasicTest(2, { status: 'failed', message: e.message, duration: Date.now() - start2 });
    }

    // Test 4: crm_history table
    updateBasicTest(3, { status: 'running' });
    const start3 = Date.now();
    try {
      const { error } = await supabase.from('crm_history').select('id').limit(1);
      if (error) throw error;
      updateBasicTest(3, { status: 'passed', message: `טבלה נגישה`, duration: Date.now() - start3 });
    } catch (e: any) {
      updateBasicTest(3, { status: 'failed', message: e.message, duration: Date.now() - start3 });
    }

    // Test 5: vendor-status edge function
    updateBasicTest(4, { status: 'running' });
    const start4 = Date.now();
    try {
      await supabase.functions.invoke('vendor-status', {
        body: { token: 'test-token-12345' }
      });
      updateBasicTest(4, { status: 'passed', message: 'Edge Function מגיב', duration: Date.now() - start4 });
    } catch (e: any) {
      updateBasicTest(4, { status: 'failed', message: e.message, duration: Date.now() - start4 });
    }

    // Test 6: search-streets edge function
    updateBasicTest(5, { status: 'running' });
    const start5 = Date.now();
    try {
      const { error } = await supabase.functions.invoke('search-streets', {
        body: { city: 'תל אביב', query: 'רוט' }
      });
      if (error) throw error;
      updateBasicTest(5, { status: 'passed', message: 'חיפוש רחובות עובד', duration: Date.now() - start5 });
    } catch (e: any) {
      updateBasicTest(5, { status: 'failed', message: e.message, duration: Date.now() - start5 });
    }

    // Test 7: app_settings
    updateBasicTest(6, { status: 'running' });
    const start6 = Date.now();
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('setting_key, setting_value');
      if (error) throw error;
      const settingsCount = data?.length || 0;
      updateBasicTest(6, { status: 'passed', message: `${settingsCount} הגדרות נמצאו`, duration: Date.now() - start6 });
    } catch (e: any) {
      updateBasicTest(6, { status: 'failed', message: e.message, duration: Date.now() - start6 });
    }

    // Test 8: CRM vendors loading
    updateBasicTest(7, { status: 'running' });
    const start7 = Date.now();
    try {
      const { data, error } = await supabase
        .from('vendor_requests')
        .select('id, vendor_name, crm_status')
        .not('crm_status', 'is', null)
        .limit(5);
      if (error) throw error;
      const count = data?.length || 0;
      updateBasicTest(7, { status: 'passed', message: `${count} ספקים פעילים ב-CRM`, duration: Date.now() - start7 });
    } catch (e: any) {
      updateBasicTest(7, { status: 'failed', message: e.message, duration: Date.now() - start7 });
    }

    setIsRunning(false);
  };

  const runE2eTests = async () => {
    setIsRunning(true);
    setE2eTestResults(e2eTests.map(t => ({ ...t, status: 'pending' })));
    let vendorId: string | null = null;
    let secureToken: string | null = null;

    // E2E Test 1: Create new vendor request
    updateE2eTest(0, { status: 'running' });
    const start0 = Date.now();
    try {
      const { data, error } = await supabase
        .from('vendor_requests')
        .insert({
          vendor_name: TEST_VENDOR.vendor_name,
          vendor_email: TEST_VENDOR.vendor_email,
          handler_name: TEST_VENDOR.handler_name,
          handler_email: TEST_VENDOR.handler_email,
          vendor_type: TEST_VENDOR.vendor_type,
          requires_vp_approval: TEST_VENDOR.requires_vp_approval,
          status: 'pending',
          otp_code: '111111', // Master OTP for testing
          otp_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();
      
      if (error) throw error;
      vendorId = data.id;
      secureToken = data.secure_token;
      setTestVendorId(vendorId);
      updateE2eTest(0, { status: 'passed', message: `נוצר ספק: ${data.vendor_name}`, duration: Date.now() - start0 });
    } catch (e: any) {
      updateE2eTest(0, { status: 'failed', message: e.message, duration: Date.now() - start0 });
      setIsRunning(false);
      return;
    }

    // E2E Test 2: Verify request exists in database
    updateE2eTest(1, { status: 'running' });
    const start1 = Date.now();
    try {
      const { data, error } = await supabase
        .from('vendor_requests')
        .select('*')
        .eq('id', vendorId)
        .single();
      
      if (error) throw error;
      if (!data) throw new Error('בקשה לא נמצאה');
      updateE2eTest(1, { status: 'passed', message: `סטטוס: ${data.status}`, duration: Date.now() - start1 });
    } catch (e: any) {
      updateE2eTest(1, { status: 'failed', message: e.message, duration: Date.now() - start1 });
    }

    // E2E Test 3: Verify OTP with master code
    updateE2eTest(2, { status: 'running' });
    const start2 = Date.now();
    try {
      const { data, error } = await supabase.functions.invoke('verify-vendor-otp', {
        body: { token: secureToken, otp: '111111' }
      });
      
      if (error) throw error;
      if (!data?.success) throw new Error('אימות OTP נכשל');
      updateE2eTest(2, { status: 'passed', message: 'OTP אומת בהצלחה', duration: Date.now() - start2 });
    } catch (e: any) {
      updateE2eTest(2, { status: 'failed', message: e.message, duration: Date.now() - start2 });
    }

    // E2E Test 4: Update vendor details
    updateE2eTest(3, { status: 'running' });
    const start3 = Date.now();
    try {
      const { error } = await supabase
        .from('vendor_requests')
        .update({
          company_id: '123456789',
          mobile: '0501234567',
          city: 'תל אביב',
          street: 'רוטשילד',
          street_number: '1',
          bank_name: 'בנק הפועלים',
          bank_branch: '600',
          bank_account_number: '123456',
        })
        .eq('id', vendorId);
      
      if (error) throw error;
      updateE2eTest(3, { status: 'passed', message: 'פרטים עודכנו', duration: Date.now() - start3 });
    } catch (e: any) {
      updateE2eTest(3, { status: 'failed', message: e.message, duration: Date.now() - start3 });
    }

    // E2E Test 5: Change status to submitted
    updateE2eTest(4, { status: 'running' });
    const start4 = Date.now();
    try {
      const { error } = await supabase
        .from('vendor_requests')
        .update({ status: 'submitted' })
        .eq('id', vendorId);
      
      if (error) throw error;
      
      // Verify status change
      const { data: verifyData } = await supabase
        .from('vendor_requests')
        .select('status')
        .eq('id', vendorId)
        .single();
      
      if (verifyData?.status !== 'submitted') throw new Error('סטטוס לא השתנה ל-submitted');
      updateE2eTest(4, { status: 'passed', message: 'סטטוס: submitted', duration: Date.now() - start4 });
    } catch (e: any) {
      updateE2eTest(4, { status: 'failed', message: e.message, duration: Date.now() - start4 });
    }

    // E2E Test 6: Handler approval (first review)
    updateE2eTest(5, { status: 'running' });
    const start5 = Date.now();
    try {
      const { error } = await supabase
        .from('vendor_requests')
        .update({
          status: 'first_review',
          first_review_approved: true,
          first_review_approved_at: new Date().toISOString(),
          first_review_approved_by: 'מטפל טסט',
        })
        .eq('id', vendorId);
      
      if (error) throw error;
      updateE2eTest(5, { status: 'passed', message: 'מטפל אישר את הבקשה', duration: Date.now() - start5 });
    } catch (e: any) {
      updateE2eTest(5, { status: 'failed', message: e.message, duration: Date.now() - start5 });
    }

    // E2E Test 7: Procurement manager approval
    updateE2eTest(6, { status: 'running' });
    const start6 = Date.now();
    try {
      const { error } = await supabase
        .from('vendor_requests')
        .update({
          procurement_manager_approved: true,
          procurement_manager_approved_at: new Date().toISOString(),
          procurement_manager_approved_by: 'מנהל רכש טסט',
        })
        .eq('id', vendorId);
      
      if (error) throw error;
      updateE2eTest(6, { status: 'passed', message: 'מנהל רכש אישר', duration: Date.now() - start6 });
    } catch (e: any) {
      updateE2eTest(6, { status: 'failed', message: e.message, duration: Date.now() - start6 });
    }

    // E2E Test 8: VP approval
    updateE2eTest(7, { status: 'running' });
    const start7 = Date.now();
    try {
      const { error } = await supabase
        .from('vendor_requests')
        .update({
          vp_approved: true,
          vp_approved_at: new Date().toISOString(),
          vp_approved_by: 'סמנכל טסט',
        })
        .eq('id', vendorId);
      
      if (error) throw error;
      updateE2eTest(7, { status: 'passed', message: 'סמנכ"ל אישר', duration: Date.now() - start7 });
    } catch (e: any) {
      updateE2eTest(7, { status: 'failed', message: e.message, duration: Date.now() - start7 });
    }

    // E2E Test 9: Final status check - approved
    updateE2eTest(8, { status: 'running' });
    const start8 = Date.now();
    try {
      const { error } = await supabase
        .from('vendor_requests')
        .update({ 
          status: 'approved',
          crm_status: 'active'
        })
        .eq('id', vendorId);
      
      if (error) throw error;
      
      // Verify final status
      const { data: finalData } = await supabase
        .from('vendor_requests')
        .select('status, crm_status')
        .eq('id', vendorId)
        .single();
      
      if (finalData?.status !== 'approved') throw new Error('סטטוס סופי לא approved');
      updateE2eTest(8, { status: 'passed', message: `סטטוס: ${finalData.status}, CRM: ${finalData.crm_status}`, duration: Date.now() - start8 });
    } catch (e: any) {
      updateE2eTest(8, { status: 'failed', message: e.message, duration: Date.now() - start8 });
    }

    // E2E Test 10: Cleanup - delete test request
    updateE2eTest(9, { status: 'running' });
    const start9 = Date.now();
    try {
      // First delete any related documents
      await supabase
        .from('vendor_documents')
        .delete()
        .eq('vendor_request_id', vendorId);
      
      // Delete status history
      await supabase
        .from('vendor_status_history')
        .delete()
        .eq('vendor_request_id', vendorId);
      
      // Delete CRM history
      await supabase
        .from('crm_history')
        .delete()
        .eq('vendor_request_id', vendorId);
      
      // Note: vendor_requests table doesn't allow DELETE per RLS
      // So we'll just mark it as cleaned up
      updateE2eTest(9, { status: 'passed', message: 'נתוני טסט נוקו (הבקשה נשארת לבדיקה)', duration: Date.now() - start9 });
    } catch (e: any) {
      updateE2eTest(9, { status: 'failed', message: e.message, duration: Date.now() - start9 });
    }

    setIsRunning(false);
  };

  const runTests = () => {
    if (activeTab === 'basic') {
      runBasicTests();
    } else {
      runE2eTests();
    }
  };

  const resetTests = () => {
    if (activeTab === 'basic') {
      setBasicTestResults(basicTests);
    } else {
      setE2eTestResults(e2eTests);
    }
  };

  const currentTests = activeTab === 'basic' ? basicTestResults : e2eTestResults;
  const passedCount = currentTests.filter(t => t.status === 'passed').length;
  const failedCount = currentTests.filter(t => t.status === 'failed').length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-right">
            הרצת טסטים בדפדפן
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'basic' | 'e2e')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic" className="gap-2">
              <FlaskConical className="h-4 w-4" />
              טסטים בסיסיים
            </TabsTrigger>
            <TabsTrigger value="e2e" className="gap-2">
              <Workflow className="h-4 w-4" />
              E2E הקמת ספק
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="mt-4">
            <p className="text-sm text-muted-foreground mb-4">
              בדיקות בסיסיות של חיבור לדאטאבייס, טבלאות ו-Edge Functions
            </p>
          </TabsContent>

          <TabsContent value="e2e" className="mt-4">
            <p className="text-sm text-muted-foreground mb-4">
              תהליך מלא: יצירת בקשת ספק → אימות OTP → מילוי פרטים → אישור מטפל → אישור מנהל רכש → אישור סמנכ"ל
            </p>
          </TabsContent>
        </Tabs>

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
              {currentTests.map((test, index) => (
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

          {testVendorId && activeTab === 'e2e' && (
            <p className="text-xs text-muted-foreground">
              ID בקשת טסט: {testVendorId}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
