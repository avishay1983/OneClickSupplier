-- Create enum for CRM vendor status
CREATE TYPE public.crm_vendor_status AS ENUM ('active', 'suspended', 'closed', 'vip');

-- Add CRM status column to vendor_requests
ALTER TABLE public.vendor_requests 
ADD COLUMN crm_status crm_vendor_status DEFAULT 'active';

-- Create CRM history table for tracking changes
CREATE TABLE public.crm_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_request_id UUID NOT NULL REFERENCES public.vendor_requests(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,
  changed_by TEXT,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on crm_history
ALTER TABLE public.crm_history ENABLE ROW LEVEL SECURITY;

-- Policies for crm_history
CREATE POLICY "Authenticated users can read CRM history"
ON public.crm_history
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert CRM history"
ON public.crm_history
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_crm_history_vendor_request_id ON public.crm_history(vendor_request_id);
CREATE INDEX idx_crm_history_changed_at ON public.crm_history(changed_at DESC);