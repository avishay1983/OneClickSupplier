-- Add field to track expiry reminder
ALTER TABLE public.vendor_requests 
ADD COLUMN IF NOT EXISTS expiry_reminder_sent_at timestamp with time zone;