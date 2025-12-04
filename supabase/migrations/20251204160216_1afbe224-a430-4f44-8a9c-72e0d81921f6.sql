-- Add expiration and OTP columns to vendor_requests
ALTER TABLE public.vendor_requests
ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '7 days'),
ADD COLUMN otp_code VARCHAR(6),
ADD COLUMN otp_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN otp_verified BOOLEAN DEFAULT false;

-- Update existing rows to have an expiration date
UPDATE public.vendor_requests 
SET expires_at = created_at + interval '7 days' 
WHERE expires_at IS NULL;