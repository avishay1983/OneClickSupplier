-- Add handler field to vendor_requests table
ALTER TABLE public.vendor_requests 
ADD COLUMN handler_name text;