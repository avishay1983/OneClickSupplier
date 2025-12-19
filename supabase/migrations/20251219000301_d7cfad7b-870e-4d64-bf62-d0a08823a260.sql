-- Allow anonymous access to vendor_quotes by secure token
CREATE POLICY "Anyone can read quotes by secure token" 
ON public.vendor_quotes 
FOR SELECT 
USING (true);

-- Allow anonymous updates to quotes by secure token (for approval/rejection)
CREATE POLICY "Anyone can update quotes by secure token" 
ON public.vendor_quotes 
FOR UPDATE 
USING (true);

-- Drop the old authenticated-only policies since the new ones are more permissive
DROP POLICY IF EXISTS "Authenticated users can read all quotes" ON public.vendor_quotes;
DROP POLICY IF EXISTS "Authenticated users can update quotes" ON public.vendor_quotes;