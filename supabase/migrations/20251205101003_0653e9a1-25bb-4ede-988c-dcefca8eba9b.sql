-- Add extracted_tags column to vendor_documents for storing OCR results
ALTER TABLE public.vendor_documents 
ADD COLUMN extracted_tags jsonb DEFAULT NULL;

-- Add comment to explain the column
COMMENT ON COLUMN public.vendor_documents.extracted_tags IS 'Stores OCR extracted data as tags, e.g., {"bank_number": "12", "branch_number": "456", "account_number": "123456"}';
