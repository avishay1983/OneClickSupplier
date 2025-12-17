-- Add new status 'security_approved' to crm_vendor_status enum
ALTER TYPE public.crm_vendor_status ADD VALUE IF NOT EXISTS 'security_approved';