-- Drop the existing update policy and recreate with WITH CHECK
DROP POLICY IF EXISTS "Anyone can update quotes by secure token" ON public.vendor_quotes;

CREATE POLICY "Anyone can update quotes" 
ON public.vendor_quotes 
FOR UPDATE 
USING (true)
WITH CHECK (true);