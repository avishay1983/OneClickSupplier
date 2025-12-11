-- Add contract signature workflow fields to vendor_requests
ALTER TABLE public.vendor_requests 
ADD COLUMN requires_contract_signature boolean DEFAULT false,
ADD COLUMN contract_file_path text,
ADD COLUMN contract_uploaded_at timestamp with time zone,
ADD COLUMN ceo_signed boolean DEFAULT false,
ADD COLUMN ceo_signed_at timestamp with time zone,
ADD COLUMN ceo_signed_by text,
ADD COLUMN procurement_manager_signed boolean DEFAULT false,
ADD COLUMN procurement_manager_signed_at timestamp with time zone,
ADD COLUMN procurement_manager_signed_by text;