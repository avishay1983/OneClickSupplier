export interface BankBranch {
  code: string;
  name: string;
  city: string;
}

export interface BankBranchesData {
  [bankName: string]: BankBranch[];
}

export const BANK_BRANCHES: BankBranchesData = {
  "בנק לאומי לישראל": [
    { code: "800", name: "סניף ראשי תל אביב", city: "תל אביב" },
    { code: "804", name: "דיזנגוף", city: "תל אביב" },
    { code: "813", name: "רוטשילד", city: "תל אביב" },
    { code: "860", name: "רמת אביב", city: "תל אביב" },
    { code: "903", name: "ירושלים ראשי", city: "ירושלים" },
    { code: "912", name: "מלכי ישראל", city: "ירושלים" },
    { code: "690", name: "חיפה ראשי", city: "חיפה" },
    { code: "680", name: "הדר הכרמל", city: "חיפה" },
    { code: "729", name: "באר שבע", city: "באר שבע" },
    { code: "754", name: "נתניה", city: "נתניה" },
    { code: "765", name: "פתח תקווה", city: "פתח תקווה" },
    { code: "770", name: "ראשון לציון", city: "ראשון לציון" },
    { code: "780", name: "חולון", city: "חולון" },
    { code: "785", name: "בת ים", city: "בת ים" },
    { code: "790", name: "רמת גן", city: "רמת גן" },
    { code: "795", name: "בני ברק", city: "בני ברק" },
    { code: "720", name: "אשדוד", city: "אשדוד" },
    { code: "725", name: "אשקלון", city: "אשקלון" },
  ],
  "בנק הפועלים": [
    { code: "532", name: "סניף ראשי תל אביב", city: "תל אביב" },
    { code: "567", name: "דיזנגוף סנטר", city: "תל אביב" },
    { code: "575", name: "רוטשילד", city: "תל אביב" },
    { code: "610", name: "רמת אביב", city: "תל אביב" },
    { code: "400", name: "ירושלים ראשי", city: "ירושלים" },
    { code: "428", name: "קניון מלחה", city: "ירושלים" },
    { code: "700", name: "חיפה ראשי", city: "חיפה" },
    { code: "720", name: "קריון", city: "קריית ביאליק" },
    { code: "180", name: "באר שבע", city: "באר שבע" },
    { code: "635", name: "נתניה", city: "נתניה" },
    { code: "655", name: "פתח תקווה", city: "פתח תקווה" },
    { code: "665", name: "ראשון לציון", city: "ראשון לציון" },
    { code: "670", name: "חולון", city: "חולון" },
    { code: "580", name: "רמת גן", city: "רמת גן" },
    { code: "590", name: "בני ברק", city: "בני ברק" },
    { code: "150", name: "אשדוד", city: "אשדוד" },
    { code: "160", name: "אשקלון", city: "אשקלון" },
    { code: "640", name: "הרצליה", city: "הרצליה" },
  ],
  "בנק דיסקונט לישראל": [
    { code: "001", name: "סניף ראשי תל אביב", city: "תל אביב" },
    { code: "019", name: "דיזנגוף", city: "תל אביב" },
    { code: "026", name: "רמת אביב", city: "תל אביב" },
    { code: "050", name: "ירושלים ראשי", city: "ירושלים" },
    { code: "057", name: "תלפיות", city: "ירושלים" },
    { code: "100", name: "חיפה ראשי", city: "חיפה" },
    { code: "150", name: "באר שבע", city: "באר שבע" },
    { code: "035", name: "נתניה", city: "נתניה" },
    { code: "040", name: "פתח תקווה", city: "פתח תקווה" },
    { code: "045", name: "ראשון לציון", city: "ראשון לציון" },
    { code: "030", name: "רמת גן", city: "רמת גן" },
    { code: "155", name: "אשדוד", city: "אשדוד" },
    { code: "160", name: "אשקלון", city: "אשקלון" },
  ],
  "בנק מזרחי טפחות": [
    { code: "400", name: "סניף ראשי תל אביב", city: "תל אביב" },
    { code: "418", name: "דיזנגוף", city: "תל אביב" },
    { code: "426", name: "רמת אביב", city: "תל אביב" },
    { code: "450", name: "ירושלים ראשי", city: "ירושלים" },
    { code: "458", name: "גבעת שאול", city: "ירושלים" },
    { code: "500", name: "חיפה ראשי", city: "חיפה" },
    { code: "550", name: "באר שבע", city: "באר שבע" },
    { code: "470", name: "נתניה", city: "נתניה" },
    { code: "475", name: "פתח תקווה", city: "פתח תקווה" },
    { code: "480", name: "ראשון לציון", city: "ראשון לציון" },
    { code: "485", name: "רמת גן", city: "רמת גן" },
    { code: "490", name: "בני ברק", city: "בני ברק" },
    { code: "560", name: "אשדוד", city: "אשדוד" },
  ],
  "הבנק הבינלאומי הראשון": [
    { code: "001", name: "סניף ראשי תל אביב", city: "תל אביב" },
    { code: "012", name: "דיזנגוף", city: "תל אביב" },
    { code: "050", name: "ירושלים", city: "ירושלים" },
    { code: "100", name: "חיפה", city: "חיפה" },
    { code: "150", name: "באר שבע", city: "באר שבע" },
    { code: "030", name: "נתניה", city: "נתניה" },
    { code: "035", name: "ראשון לציון", city: "ראשון לציון" },
    { code: "040", name: "רמת גן", city: "רמת גן" },
  ],
  "בנק מרכנתיל דיסקונט": [
    { code: "601", name: "סניף ראשי תל אביב", city: "תל אביב" },
    { code: "612", name: "ירושלים", city: "ירושלים" },
    { code: "620", name: "חיפה", city: "חיפה" },
    { code: "630", name: "באר שבע", city: "באר שבע" },
    { code: "605", name: "נתניה", city: "נתניה" },
    { code: "608", name: "ראשון לציון", city: "ראשון לציון" },
  ],
  "בנק אוצר החייל": [
    { code: "001", name: "סניף ראשי תל אביב", city: "תל אביב" },
    { code: "015", name: "ירושלים", city: "ירושלים" },
    { code: "030", name: "חיפה", city: "חיפה" },
    { code: "045", name: "באר שבע", city: "באר שבע" },
    { code: "020", name: "נתניה", city: "נתניה" },
    { code: "025", name: "פתח תקווה", city: "פתח תקווה" },
  ],
  "בנק ירושלים": [
    { code: "001", name: "סניף ראשי ירושלים", city: "ירושלים" },
    { code: "010", name: "תל אביב", city: "תל אביב" },
    { code: "020", name: "בני ברק", city: "בני ברק" },
    { code: "025", name: "אשדוד", city: "אשדוד" },
    { code: "030", name: "פתח תקווה", city: "פתח תקווה" },
  ],
  "בנק אגוד לישראל": [
    { code: "001", name: "סניף ראשי תל אביב", city: "תל אביב" },
    { code: "005", name: "ירושלים", city: "ירושלים" },
    { code: "010", name: "חיפה", city: "חיפה" },
  ],
  "בנק פועלי אגודת ישראל": [
    { code: "001", name: "סניף ראשי בני ברק", city: "בני ברק" },
    { code: "010", name: "ירושלים", city: "ירושלים" },
    { code: "015", name: "תל אביב", city: "תל אביב" },
    { code: "020", name: "אשדוד", city: "אשדוד" },
  ],
  "בנק מסד": [
    { code: "001", name: "סניף ראשי תל אביב", city: "תל אביב" },
    { code: "005", name: "ירושלים", city: "ירושלים" },
  ],
  "בנק ערבי ישראלי": [
    { code: "001", name: "סניף ראשי נצרת", city: "נצרת" },
    { code: "010", name: "חיפה", city: "חיפה" },
    { code: "015", name: "תל אביב-יפו", city: "תל אביב" },
  ],
  "בנק ישראל": [
    { code: "001", name: "סניף ראשי ירושלים", city: "ירושלים" },
  ],
};

export function getBranchesByBank(bankName: string): BankBranch[] {
  return BANK_BRANCHES[bankName] || [];
}

export function formatBranchDisplay(branch: BankBranch): string {
  return `${branch.code} - ${branch.name} (${branch.city})`;
}
