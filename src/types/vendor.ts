export type VendorStatus = 'pending' | 'with_vendor' | 'submitted' | 'approved' | 'resent' | 'first_review' | 'rejected';

export type CRMVendorStatus = 'active' | 'suspended' | 'closed' | 'vip';

export interface VendorRequest {
  id: string;
  created_at: string;
  updated_at: string;
  secure_token: string;
  status: VendorStatus;
  expires_at: string | null;
  
  // Internal fields (employee only)
  vendor_name: string;
  vendor_email: string;
  expected_spending: number | null;
  quote_received: boolean;
  contract_signed: boolean;
  legal_approved: boolean;
  approver_name: string | null;
  is_consultant: boolean;
  is_sensitive: boolean;
  vendor_type: 'general' | 'claims' | null;
  claims_area: 'home' | 'car' | 'life' | 'health' | null;
  claims_sub_category: string | null;
  handler_name: string | null;
  handler_rejection_reason: string | null;
  
  // Contract signature fields
  requires_contract_signature: boolean;
  requires_vp_approval: boolean;
  contract_file_path: string | null;
  contract_uploaded_at: string | null;
  ceo_signed: boolean;
  ceo_signed_at: string | null;
  ceo_signed_by: string | null;
  procurement_manager_signed: boolean;
  procurement_manager_signed_at: string | null;
  procurement_manager_signed_by: string | null;
  
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
  bank_account_number: string | null;
  
  // Payment
  payment_method: 'check' | 'invoice' | 'transfer' | null;
  payment_terms: string;
  
  // CRM
  crm_status: CRMVendorStatus | null;
}

export interface VendorDocument {
  id: string;
  vendor_request_id: string;
  document_type: 'bookkeeping_cert' | 'tax_cert' | 'bank_confirmation' | 'invoice_screenshot';
  file_name: string;
  file_path: string;
  uploaded_at: string;
  extracted_tags?: {
    bank_number?: string | null;
    branch_number?: string | null;
    account_number?: string | null;
  } | null;
}

export const STATUS_LABELS: Record<VendorStatus, string> = {
  pending: 'ממתין לספק',
  with_vendor: 'ממתין לספק',
  first_review: 'בקרה ראשונה',
  submitted: 'ממתין לאישור מנהלים',
  approved: 'אושר',
  resent: 'נשלח מחדש',
  rejected: 'נדחה',
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

export const VENDOR_TYPE_LABELS: Record<string, string> = {
  general: 'ספק כללי',
  claims: 'ספק תביעות',
};

export const CLAIMS_AREA_LABELS: Record<string, string> = {
  home: 'דירה',
  car: 'רכב',
  life: 'חיים',
  health: 'בריאות',
};

export const CLAIMS_SUB_CATEGORY_LABELS: Record<string, string> = {
  // Car
  garage: 'מוסך',
  appraiser: 'שמאי',
  // Life/Health
  doctor: 'רופא',
  lawyer: 'עורך דין',
  // Home
  plumber: 'שרברב',
  management: 'חברת ניהול',
};

export const CRM_STATUS_LABELS: Record<CRMVendorStatus, string> = {
  active: 'פעיל',
  suspended: 'מושהה',
  closed: 'סגור',
  vip: 'VIP',
};
