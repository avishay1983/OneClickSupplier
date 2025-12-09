-- Add approval workflow columns to vendor_requests
ALTER TABLE public.vendor_requests
ADD COLUMN first_review_approved BOOLEAN DEFAULT FALSE,
ADD COLUMN first_review_approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN first_review_approved_by TEXT,
ADD COLUMN first_signature_approved BOOLEAN DEFAULT FALSE,
ADD COLUMN first_signature_approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN first_signature_approved_by TEXT,
ADD COLUMN second_signature_approved BOOLEAN DEFAULT FALSE,
ADD COLUMN second_signature_approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN second_signature_approved_by TEXT;