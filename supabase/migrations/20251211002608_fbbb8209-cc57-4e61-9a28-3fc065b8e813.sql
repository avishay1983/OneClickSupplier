-- Add handler_email column to vendor_requests
ALTER TABLE public.vendor_requests ADD COLUMN IF NOT EXISTS handler_email text;