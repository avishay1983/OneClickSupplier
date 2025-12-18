-- Add handler approval fields to vendor_quotes
ALTER TABLE public.vendor_quotes 
ADD COLUMN IF NOT EXISTS handler_approved boolean DEFAULT NULL,
ADD COLUMN IF NOT EXISTS handler_approved_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS handler_approved_by text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS handler_rejection_reason text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS vendor_submitted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS vendor_submitted_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS quote_link_sent_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS quote_secure_token uuid DEFAULT gen_random_uuid();

-- Create index for token lookups
CREATE INDEX IF NOT EXISTS idx_vendor_quotes_secure_token ON public.vendor_quotes(quote_secure_token);