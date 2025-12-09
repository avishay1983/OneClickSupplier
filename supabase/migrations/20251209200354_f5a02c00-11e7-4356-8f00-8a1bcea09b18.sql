-- Create status history table
CREATE TABLE public.vendor_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_request_id UUID NOT NULL REFERENCES public.vendor_requests(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  changed_by TEXT
);

-- Enable RLS
ALTER TABLE public.vendor_status_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can read status history" 
ON public.vendor_status_history 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert status history" 
ON public.vendor_status_history 
FOR INSERT 
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_vendor_status_history_request_id ON public.vendor_status_history(vendor_request_id);

-- Create trigger function to log status changes
CREATE OR REPLACE FUNCTION public.log_vendor_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.vendor_status_history (vendor_request_id, old_status, new_status)
    VALUES (NEW.id, OLD.status::text, NEW.status::text);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger
CREATE TRIGGER vendor_status_change_trigger
AFTER UPDATE ON public.vendor_requests
FOR EACH ROW
EXECUTE FUNCTION public.log_vendor_status_change();