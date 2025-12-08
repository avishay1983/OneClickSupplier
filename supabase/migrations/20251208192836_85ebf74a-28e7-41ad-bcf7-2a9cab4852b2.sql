-- Add vendor type column (general or claims)
ALTER TABLE public.vendor_requests 
ADD COLUMN IF NOT EXISTS vendor_type text DEFAULT 'general';

-- Add claims area column (only relevant when vendor_type = 'claims')
ALTER TABLE public.vendor_requests 
ADD COLUMN IF NOT EXISTS claims_area text DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.vendor_requests.vendor_type IS 'Type of vendor: general or claims';
COMMENT ON COLUMN public.vendor_requests.claims_area IS 'Claims area when vendor_type is claims: home, car, life, health';