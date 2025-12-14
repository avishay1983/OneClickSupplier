-- Add requires_vp_approval column to vendor_requests
-- When true: both procurement manager AND VP must approve
-- When false: only procurement manager approval is needed
ALTER TABLE public.vendor_requests 
ADD COLUMN requires_vp_approval boolean NOT NULL DEFAULT true;