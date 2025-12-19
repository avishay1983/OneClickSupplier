-- Add signature fields to vendor_quotes for VP and procurement manager
ALTER TABLE public.vendor_quotes
ADD COLUMN IF NOT EXISTS vp_signature_data TEXT,
ADD COLUMN IF NOT EXISTS procurement_manager_signature_data TEXT;