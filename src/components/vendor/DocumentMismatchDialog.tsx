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
import { AlertTriangle } from 'lucide-react';

interface DocumentMismatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expectedType: string;
  detectedType: string;
  reason?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DocumentMismatchDialog({
  open,
  onOpenChange,
  expectedType,
  detectedType,
  reason,
  onConfirm,
  onCancel,
}: DocumentMismatchDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent dir="rtl" className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-warning">
            <AlertTriangle className="h-5 w-5" />
            המסמך לא תואם לסוג הנדרש
          </AlertDialogTitle>
          <AlertDialogDescription className="text-right space-y-3">
            <p>
              העלית מסמך לשדה <strong>"{expectedType}"</strong>, אבל המערכת זיהתה שזה נראה כמו <strong>"{detectedType}"</strong>.
            </p>
            {reason && (
              <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
                {reason}
              </p>
            )}
            <p>האם אתה בטוח שזה המסמך הנכון?</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row-reverse gap-2 sm:flex-row-reverse">
          <AlertDialogCancel onClick={onCancel}>
            לא, אעלה מסמך אחר
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            כן, זה המסמך הנכון
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
