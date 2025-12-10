-- Add approval tracking fields for procurement manager and VP
ALTER TABLE public.vendor_requests
ADD COLUMN IF NOT EXISTS procurement_manager_approved boolean DEFAULT null,
ADD COLUMN IF NOT EXISTS procurement_manager_approved_at timestamp with time zone DEFAULT null,
ADD COLUMN IF NOT EXISTS procurement_manager_approved_by text DEFAULT null,
ADD COLUMN IF NOT EXISTS vp_approved boolean DEFAULT null,
ADD COLUMN IF NOT EXISTS vp_approved_at timestamp with time zone DEFAULT null,
ADD COLUMN IF NOT EXISTS vp_approved_by text DEFAULT null,
ADD COLUMN IF NOT EXISTS approval_email_sent_at timestamp with time zone DEFAULT null;