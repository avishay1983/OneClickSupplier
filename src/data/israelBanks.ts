export interface IsraelBank {
  code: string;
  name: string;
  accountDigits: number; // Expected number of digits in account number
}

export const ISRAEL_BANKS: IsraelBank[] = [
  { code: "10", name: "בנק לאומי לישראל", accountDigits: 8 },
  { code: "11", name: "בנק דיסקונט לישראל", accountDigits: 9 },
  { code: "12", name: "בנק הפועלים", accountDigits: 7 },
  { code: "13", name: "בנק אגוד לישראל", accountDigits: 6 },
  { code: "14", name: "בנק אוצר החייל", accountDigits: 7 },
  { code: "17", name: "בנק מרכנתיל דיסקונט", accountDigits: 9 },
  { code: "20", name: "בנק מזרחי טפחות", accountDigits: 6 },
  { code: "31", name: "הבנק הבינלאומי הראשון", accountDigits: 9 },
  { code: "34", name: "בנק ערבי ישראלי", accountDigits: 9 },
  { code: "46", name: "בנק מסד", accountDigits: 9 },
  { code: "52", name: "בנק פועלי אגודת ישראל", accountDigits: 9 },
  { code: "54", name: "בנק ירושלים", accountDigits: 9 },
  { code: "99", name: "בנק ישראל", accountDigits: 9 },
];

export const BANK_NAMES = ISRAEL_BANKS.map(bank => bank.name);

export function getBankByName(name: string): IsraelBank | undefined {
  return ISRAEL_BANKS.find(bank => bank.name === name);
}

export function validateBankBranch(branch: string): boolean {
  const branchDigits = branch.replace(/\D/g, '');
  return /^\d{3,4}$/.test(branchDigits);
}

export function validateBankAccount(accountNumber: string, bankName?: string): { valid: boolean; message?: string } {
  const accountDigits = accountNumber.replace(/\D/g, '');
  
  if (!accountDigits) {
    return { valid: false, message: 'מספר חשבון הוא שדה חובה' };
  }
  
  if (accountDigits.length < 6 || accountDigits.length > 9) {
    return { valid: false, message: 'מספר חשבון חייב להכיל 6-9 ספרות' };
  }
  
  if (bankName) {
    const bank = getBankByName(bankName);
    if (bank && accountDigits.length !== bank.accountDigits) {
      return { 
        valid: false, 
        message: `מספר חשבון ב${bank.name} חייב להכיל ${bank.accountDigits} ספרות` 
      };
    }
  }
  
  return { valid: true };
}
