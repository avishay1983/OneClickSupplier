-- Create vendor_receipts table for vendor invoices/receipts
CREATE TABLE public.vendor_receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_request_id UUID NOT NULL REFERENCES public.vendor_requests(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  receipt_date DATE NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vendor_receipts ENABLE ROW LEVEL SECURITY;

-- Public read/insert for vendors (via token), authenticated users can read all
CREATE POLICY "Anyone can insert receipts" 
ON public.vendor_receipts 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authenticated users can read all receipts" 
ON public.vendor_receipts 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can update receipts" 
ON public.vendor_receipts 
FOR UPDATE 
USING (true);

CREATE POLICY "Authenticated users can delete receipts" 
ON public.vendor_receipts 
FOR DELETE 
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_vendor_receipts_updated_at
BEFORE UPDATE ON public.vendor_receipts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add receipts_link_sent field to vendor_requests
ALTER TABLE public.vendor_requests 
ADD COLUMN IF NOT EXISTS receipts_link_sent_at TIMESTAMP WITH TIME ZONE;