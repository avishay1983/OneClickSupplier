// Test data fixtures for E2E tests

export const testVendor = {
  name: 'ספק טסט אוטומטי',
  email: 'vendor-test@example.com',
  companyId: '123456789',
  mobile: '0547502437',
  phone: '0547961666',
  city: 'ירושלים',
  street: 'יפו',
  streetNumber: '1',
  postalCode: '9100000',
  bankName: 'בנק הפועלים',
  bankBranch: '545',
  bankAccount: '123456789',
  accountingContactName: 'איש קשר חשבות',
  accountingContactPhone: '0501234567',
  salesContactName: 'איש קשר מכירות', 
  salesContactPhone: '0509876543',
  paymentMethod: 'transfer' as const,
  paymentTerms: 'שוטף + 60',
};

export const testDashboardUser = {
  email: 'test@example.com',
  password: 'testpassword123',
  fullName: 'משתמש טסט',
};

export const testHandler = {
  name: 'מטפל טסט',
  email: 'handler-test@example.com',
};

export const masterOtpCode = '111111';

export const testDocuments = {
  bookkeepingCert: 'fixtures/bookkeeping-cert.pdf',
  taxCert: 'fixtures/tax-cert.pdf',
  bankConfirmation: 'fixtures/bank-confirmation.png',
  invoiceScreenshot: 'fixtures/invoice-screenshot.png',
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
