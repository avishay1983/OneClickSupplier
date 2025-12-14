// Test data fixtures for E2E tests

export const testVendor = {
  name: 'חברת דמה בע"מ',
  email: 'demo.vendor@test-automation.local',
  companyId: '512345678',
  mobile: '0501234567',
  phone: '031234567',
  city: 'תל אביב - יפו',
  street: 'רוטשילד',
  streetNumber: '10',
  postalCode: '6578901',
  bankName: 'בנק הפועלים',
  bankBranch: '612',
  bankAccount: '123456',
  accountingContactName: 'יוסי חשבון',
  accountingContactPhone: '0521111111',
  salesContactName: 'דנה מכירות',
  salesContactPhone: '0522222222',
  paymentMethod: 'transfer' as const,
  paymentTerms: 'שוטף + 60',
};

export const testDashboardUser = {
  email: 'admin.test@automation.local',
  password: 'TestPassword123!',
  fullName: 'מנהל טסט אוטומטי',
};

export const testHandler = {
  name: 'מטפל טסט',
  email: 'handler.test@automation.local',
};

export const testManagers = {
  procurementManager: {
    name: 'מנהל רכש טסט',
    email: 'procurement.test@automation.local',
  },
  vp: {
    name: 'סמנכל טסט',
    email: 'vp.test@automation.local',
  },
};

export const masterOtpCode = '111111';

export const testDocuments = {
  bookkeepingCert: 'e2e/fixtures/bookkeeping-cert.pdf',
  taxCert: 'e2e/fixtures/tax-cert.pdf',
  bankConfirmation: 'e2e/fixtures/bank-confirmation.png',
  invoiceScreenshot: 'e2e/fixtures/invoice-screenshot.png',
};

// Status mappings for verification
export const vendorStatuses = {
  pending: 'ממתין לספק',
  withVendor: 'ממתין לספק',
  submitted: 'נשלח',
  firstReview: 'בקרה ראשונה',
  approved: 'אושר',
  resent: 'נשלח מחדש',
  rejected: 'נדחה',
};

export const crmStatuses = {
  active: 'פעיל',
  suspended: 'מושהה',
  closed: 'סגור',
  vip: 'VIP',
};

// Expected form field mappings
export const formFields = {
  companyId: 'company_id',
  vendorName: 'vendor_name',
  email: 'vendor_email',
  mobile: 'mobile',
  phone: 'phone',
  city: 'city',
  street: 'street',
  streetNumber: 'street_number',
  postalCode: 'postal_code',
  bankName: 'bank_name',
  bankBranch: 'bank_branch',
  bankAccount: 'bank_account_number',
};

// API endpoints for verification
export const apiEndpoints = {
  vendorFormApi: '/functions/v1/vendor-form-api',
  verifyOtp: '/functions/v1/verify-vendor-otp',
  sendOtp: '/functions/v1/send-vendor-otp',
  vendorUpload: '/functions/v1/vendor-upload',
  vendorStatus: '/functions/v1/vendor-status',
};
