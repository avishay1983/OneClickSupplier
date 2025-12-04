-- Create enums for vendor status, payment method, and document type
CREATE TYPE vendor_status AS ENUM ('pending', 'with_vendor', 'submitted', 'approved');
CREATE TYPE payment_method AS ENUM ('check', 'invoice', 'transfer');
CREATE TYPE document_type AS ENUM ('bookkeeping_cert', 'tax_cert', 'bank_confirmation', 'invoice_screenshot');

-- Create vendor_requests table
CREATE TABLE public.vendor_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  secure_token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  status vendor_status NOT NULL DEFAULT 'pending',
  
  -- Internal fields (employee only)
  vendor_name TEXT NOT NULL,
  vendor_email TEXT NOT NULL,
  expected_spending DECIMAL(15,2),
  quote_received BOOLEAN DEFAULT false,
  contract_signed BOOLEAN DEFAULT false,
  legal_approved BOOLEAN DEFAULT false,
  approver_name TEXT,
  is_consultant BOOLEAN DEFAULT false,
  is_sensitive BOOLEAN DEFAULT false,
  
  -- Vendor fields
  company_id TEXT,
  phone TEXT,
  mobile TEXT,
  fax TEXT,
  street TEXT,
  street_number TEXT,
  city TEXT,
  postal_code TEXT,
  po_box TEXT,
  
  -- Contact persons
  accounting_contact_name TEXT,
  accounting_contact_phone TEXT,
  sales_contact_name TEXT,
  sales_contact_phone TEXT,
  
  -- Bank details (sensitive)
  bank_name TEXT,
  bank_branch TEXT,
  bank_account_number TEXT,
  
  -- Payment info
  payment_method payment_method,
  payment_terms TEXT DEFAULT 'שוטף + 60'
);

-- Create vendor_documents table
CREATE TABLE public.vendor_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_request_id UUID NOT NULL REFERENCES public.vendor_requests(id) ON DELETE CASCADE,
  document_type document_type NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vendor_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_documents ENABLE ROW LEVEL SECURITY;

-- Create policies for vendor_requests (public access for now - add auth later)
CREATE POLICY "Allow public read access" ON public.vendor_requests FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.vendor_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.vendor_requests FOR UPDATE USING (true);

-- Create policies for vendor_documents
CREATE POLICY "Allow public read access" ON public.vendor_documents FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.vendor_documents FOR INSERT WITH CHECK (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_vendor_requests_updated_at
  BEFORE UPDATE ON public.vendor_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('vendor_documents', 'vendor_documents', true);

-- Storage policies
CREATE POLICY "Allow public upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'vendor_documents');
CREATE POLICY "Allow public read" ON storage.objects FOR SELECT USING (bucket_id = 'vendor_documents');