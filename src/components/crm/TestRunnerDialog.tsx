import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, Terminal, CheckCircle2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useState } from 'react';

interface TestRunnerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const commands = [
  {
    title: 'התקנת דפדפנים (פעם ראשונה בלבד)',
    command: 'npx playwright install',
    description: 'מתקין את דפדפני הטסט של Playwright',
  },
  {
    title: 'הרצת כל הטסטים',
    command: 'npx playwright test',
    description: 'מריץ את כל הטסטים ברקע',
  },
  {
    title: 'הרצה עם ממשק גרפי',
    command: 'npx playwright test --ui',
    description: 'פותח ממשק אינטראקטיבי לצפייה בטסטים',
  },
  {
    title: 'הרצה עם דפדפן פתוח',
    command: 'npx playwright test --headed',
    description: 'מריץ טסטים עם דפדפן גלוי',
  },
  {
    title: 'הצגת דוח תוצאות',
    command: 'npx playwright show-report',
    description: 'פותח דוח HTML עם תוצאות הטסטים',
  },
];

export function TestRunnerDialog({ open, onOpenChange }: TestRunnerDialogProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      toast({
        title: 'הועתק!',
        description: 'הפקודה הועתקה ללוח',
      });
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (error) {
      toast({
        title: 'שגיאה',
        description: 'לא ניתן להעתיק',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-right">
            <Terminal className="h-5 w-5" />
            הרצת טסטים אוטומטיים
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            להרצת הטסטים, פתח טרמינל בתיקיית הפרויקט והרץ את הפקודות הבאות:
          </p>

          <div className="space-y-3">
            {commands.map((cmd, index) => (
              <Card key={index} className="bg-muted/50">
                <CardHeader className="py-3 pb-1">
                  <CardTitle className="text-sm font-medium">{cmd.title}</CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                  <div className="flex items-center justify-between gap-2">
                    <code className="flex-1 bg-background px-3 py-2 rounded text-sm font-mono text-left" dir="ltr">
                      {cmd.command}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(cmd.command, index)}
                      className="shrink-0"
                    >
                      {copiedIndex === index ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{cmd.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="py-4">
              <h4 className="font-medium text-sm mb-2">קבצי הטסט:</h4>
              <ul className="text-sm text-muted-foreground space-y-1" dir="ltr">
                <li>• e2e/vendor-onboarding.spec.ts - טסט מלא של תהליך הקמת ספק</li>
                <li>• e2e/fixtures/test-data.ts - נתוני טסט</li>
                <li>• e2e/helpers/test-utils.ts - פונקציות עזר</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}