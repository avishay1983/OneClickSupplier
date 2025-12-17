-- Add rating column to vendor_requests table
ALTER TABLE public.vendor_requests 
ADD COLUMN rating integer DEFAULT NULL CHECK (rating >= 1 AND rating <= 5);