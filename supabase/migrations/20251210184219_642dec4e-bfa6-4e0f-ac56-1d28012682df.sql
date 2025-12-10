-- Add claims_sub_category column to vendor_requests table
ALTER TABLE public.vendor_requests
ADD COLUMN claims_sub_category text NULL;

-- Add comment to describe the column
COMMENT ON COLUMN public.vendor_requests.claims_sub_category IS 'Sub-category for claims vendors: garage/appraiser (car), doctor/lawyer (life/health), plumber/management (home)';