-- Add UPDATE policy for vendor_documents bucket
CREATE POLICY "Authenticated users can update documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'vendor_documents')
WITH CHECK (bucket_id = 'vendor_documents');