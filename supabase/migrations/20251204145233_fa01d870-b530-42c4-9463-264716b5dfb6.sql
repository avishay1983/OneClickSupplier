-- Allow public delete on vendor_documents for replacing files
CREATE POLICY "Allow public delete"
ON public.vendor_documents
FOR DELETE
USING (true);