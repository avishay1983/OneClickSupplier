-- Drop the existing storage update policy and create a public one
DROP POLICY IF EXISTS "Authenticated users can update documents" ON storage.objects;

CREATE POLICY "Anyone can update vendor documents" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'vendor_documents')
WITH CHECK (bucket_id = 'vendor_documents');