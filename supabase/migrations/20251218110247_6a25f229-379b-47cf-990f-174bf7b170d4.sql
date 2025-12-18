-- Create vendor_quotes table for price quote submissions
CREATE TABLE public.vendor_quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_request_id UUID NOT NULL REFERENCES public.vendor_requests(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  description TEXT,
  amount NUMERIC,
  quote_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  
  -- VP approval
  vp_approved BOOLEAN DEFAULT NULL,
  vp_approved_at TIMESTAMP WITH TIME ZONE,
  vp_approved_by TEXT,
  vp_rejection_reason TEXT,
  
  -- Procurement manager approval
  procurement_manager_approved BOOLEAN DEFAULT NULL,
  procurement_manager_approved_at TIMESTAMP WITH TIME ZONE,
  procurement_manager_approved_by TEXT,
  procurement_manager_rejection_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  submitted_by TEXT
);

-- Enable RLS
ALTER TABLE public.vendor_quotes ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can read all quotes"
ON public.vendor_quotes
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert quotes"
ON public.vendor_quotes
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update quotes"
ON public.vendor_quotes
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete quotes"
ON public.vendor_quotes
FOR DELETE
TO authenticated
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_vendor_quotes_updated_at
BEFORE UPDATE ON public.vendor_quotes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();