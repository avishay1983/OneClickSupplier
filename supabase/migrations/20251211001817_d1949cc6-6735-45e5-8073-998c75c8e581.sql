-- Add new status 'first_review' to vendor_status enum
ALTER TYPE vendor_status ADD VALUE IF NOT EXISTS 'first_review' AFTER 'submitted';

-- Add rejection reason field for handler
ALTER TABLE public.vendor_requests 
ADD COLUMN IF NOT EXISTS handler_rejection_reason TEXT;