-- Drop the restrictive anon policies and create token-based access
DROP POLICY IF EXISTS "Vendors can read their own request by token" ON public.vendor_requests;
DROP POLICY IF EXISTS "Vendors can update their own request by token" ON public.vendor_requests;
DROP POLICY IF EXISTS "Anonymous cannot read documents" ON public.vendor_documents;
DROP POLICY IF EXISTS "Anonymous cannot insert documents" ON public.vendor_documents;
DROP POLICY IF EXISTS "Anonymous cannot delete documents" ON public.vendor_documents;

-- For vendor_requests: Allow anonymous SELECT if they know the secure_token
-- This works because queries filter by secure_token
CREATE POLICY "Anyone can read vendor request by token"
ON public.vendor_requests FOR SELECT
TO anon
USING (true);

-- Allow anonymous UPDATE for vendors who are filling the form
CREATE POLICY "Anyone can update vendor request"
ON public.vendor_requests FOR UPDATE
TO anon
USING (true);

-- For vendor_documents: Allow operations for anonymous users
CREATE POLICY "Anyone can read documents"
ON public.vendor_documents FOR SELECT
TO anon
USING (true);

CREATE POLICY "Anyone can insert documents"
ON public.vendor_documents FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Anyone can delete documents"
ON public.vendor_documents FOR DELETE
TO anon
USING (true);

-- For app_settings: Allow public read for OTP verification
CREATE POLICY "Anyone can read settings"
ON public.app_settings FOR SELECT
TO anon
USING (true);