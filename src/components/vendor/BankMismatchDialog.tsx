import { AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { BANK_NAMES } from '@/data/israelBanks';

interface ExtractedBankData {
  bank_number: string | null;
  branch_number: string | null;
  account_number: string | null;
  confidence?: string;
  notes?: string;
}

interface FormBankData {
  bank_name: string;
  bank_branch: string;
  bank_account_number: string;
}

interface BankMismatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  extractedData: ExtractedBankData | null;
  formData: FormBankData;
  onCorrect: () => void;
  onContinue: () => void;
  onAutoFill: () => void;
}

// Map bank code to bank name
export const BANK_CODE_MAP: Record<string, string> = {
  '10': 'בנק לאומי',
  '11': 'בנק דיסקונט',
  '12': 'בנק הפועלים',
  '13': 'בנק אגוד',
  '14': 'בנק אוצר החייל',
  '17': 'בנק מרכנתיל',
  '20': 'בנק מזרחי טפחות',
  '31': 'בנק הבינלאומי',
  '46': 'בנק מסד',
  '52': 'בנק פועלי אגודת ישראל',
  '54': 'בנק ירושלים',
};

export function getBankNameFromCode(code: string | null): string | null {
  if (!code) return null;
  return BANK_CODE_MAP[code] || `בנק מספר ${code}`;
}

function getBankCodeFromName(name: string): string | null {
  const entry = Object.entries(BANK_CODE_MAP).find(([, bankName]) => bankName === name);
  return entry ? entry[0] : null;
}

export function BankMismatchDialog({
  open,
  onOpenChange,
  extractedData,
  formData,
  onCorrect,
  onContinue,
  onAutoFill,
}: BankMismatchDialogProps) {
  if (!extractedData) return null;

  // Check if no data was extracted at all
  const noDataExtracted = !extractedData.bank_number && !extractedData.branch_number && !extractedData.account_number;

  const mismatches: { field: string; formValue: string; extractedValue: string }[] = [];

  // Check bank number
  const formBankCode = getBankCodeFromName(formData.bank_name);
  if (extractedData.bank_number && formBankCode && extractedData.bank_number !== formBankCode) {
    mismatches.push({
      field: 'מספר בנק',
      formValue: `${formData.bank_name} (${formBankCode})`,
      extractedValue: `${getBankNameFromCode(extractedData.bank_number)} (${extractedData.bank_number})`,
    });
  }

  // Check branch number
  if (extractedData.branch_number && formData.bank_branch && extractedData.branch_number !== formData.bank_branch) {
    mismatches.push({
      field: 'מספר סניף',
      formValue: formData.bank_branch,
      extractedValue: extractedData.branch_number,
    });
  }

  // Check account number
  if (extractedData.account_number && formData.bank_account_number && extractedData.account_number !== formData.bank_account_number) {
    mismatches.push({
      field: 'מספר חשבון',
      formValue: formData.bank_account_number,
      extractedValue: extractedData.account_number,
    });
  }

  // Check if we have any extracted data to auto-fill
  const hasExtractedData = extractedData.bank_number || extractedData.branch_number || extractedData.account_number;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-warning">
            <AlertTriangle className="h-5 w-5" />
            {noDataExtracted ? 'לא זוהו פרטי בנק במסמך' : 'זוהתה אי התאמה בפרטי הבנק'}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-right space-y-4">
            {noDataExtracted ? (
              <p>
                לא הצלחנו לזהות פרטי חשבון בנק בקובץ שהועלה. 
                אנא ודא שהקובץ מכיל מסמך בנקאי ברור עם פרטי החשבון.
              </p>
            ) : (
              <>
                <p>
                  הנתונים שחולצו מהמסמך שונים מהנתונים שהוזנו בטופס:
                </p>
                <div className="bg-muted rounded-lg p-4 space-y-3">
                  {mismatches.map((m, i) => (
                    <div key={i} className="border-b border-border pb-2 last:border-0 last:pb-0">
                      <p className="font-medium text-sm">{m.field}:</p>
                      <div className="grid grid-cols-2 gap-2 mt-1 text-sm">
                        <div>
                          <span className="text-muted-foreground">בטופס: </span>
                          <span className="text-destructive font-medium">{m.formValue}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">במסמך: </span>
                          <span className="text-success font-medium">{m.extractedValue}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {extractedData.confidence && (
                  <p className="text-xs text-muted-foreground">
                    רמת ביטחון בזיהוי: {
                      extractedData.confidence === 'high' ? 'גבוהה' :
                      extractedData.confidence === 'medium' ? 'בינונית' : 'נמוכה'
                    }
                  </p>
                )}
                {extractedData.notes && (
                  <p className="text-xs text-muted-foreground">
                    הערות: {extractedData.notes}
                  </p>
                )}
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row-reverse gap-2 sm:flex-row-reverse flex-wrap">
          {noDataExtracted ? (
            <>
              <AlertDialogAction onClick={onCorrect} className="bg-primary">
                העלה קובץ אחר
              </AlertDialogAction>
              <AlertDialogCancel onClick={onContinue}>
                המשך בכל זאת
              </AlertDialogCancel>
            </>
          ) : (
            <>
              {hasExtractedData && (
                <AlertDialogAction onClick={onAutoFill} className="bg-success hover:bg-success/90">
                  עדכן לפי המסמך
                </AlertDialogAction>
              )}
              <AlertDialogAction onClick={onCorrect} className="bg-primary">
                תקן ידנית
              </AlertDialogAction>
              <AlertDialogCancel onClick={onContinue}>
                המשך למרות האי-התאמה
              </AlertDialogCancel>
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
