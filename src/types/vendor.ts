export type VendorStatus = 'pending' | 'with_vendor' | 'submitted' | 'approved';

export interface VendorRequest {
  id: string;
  created_at: string;
  updated_at: string;
  secure_token: string;
  status: VendorStatus;
  
  // Internal fields (employee only)
  vendor_name: string;
  vendor_email: string;
  expected_spending: number | null;
  has_quote: boolean;
  has_agreement: boolean;
  legal_approved: boolean;
  approver_name: string | null;
  is_consultant: boolean;
  is_sensitive: boolean;
  
  // Vendor fields
  company_id: string | null;
  phone: string | null;
  mobile: string | null;
  fax: string | null;
  street: string | null;
  street_number: string | null;
  city: string | null;
  postal_code: string | null;
  po_box: string | null;
  
  // Contact people
  accounting_contact_name: string | null;
  accounting_contact_phone: string | null;
  sales_contact_name: string | null;
  sales_contact_phone: string | null;
  
  // Bank details
  bank_name: string | null;
  bank_branch: string | null;
  bank_account: string | null;
  
  // Payment
  payment_method: 'check' | 'invoice' | 'transfer' | null;
  payment_terms: string;
}

export interface VendorDocument {
  id: string;
  vendor_request_id: string;
  document_type: 'bookkeeping_cert' | 'tax_cert' | 'bank_confirmation' | 'invoice_screenshot';
  file_name: string;
  file_path: string;
  uploaded_at: string;
}

export const STATUS_LABELS: Record<VendorStatus, string> = {
  pending: 'ממתין',
  with_vendor: 'אצל הספק',
  submitted: 'הוגש',
  approved: 'אושר',
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  check: 'המחאה',
  invoice: 'מס"ב',
  transfer: 'העברה בנקאית',
};

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  bookkeeping_cert: 'אישור ניהול ספרים',
  tax_cert: 'אישור ניכוי מס במקור',
  bank_confirmation: 'צילום המחאה / אישור בנק',
  invoice_screenshot: 'צילום חשבונית',
};