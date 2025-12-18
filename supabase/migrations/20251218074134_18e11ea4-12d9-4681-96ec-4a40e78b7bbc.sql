-- Create vendor_ratings table for multiple user ratings per vendor
CREATE TABLE public.vendor_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_request_id UUID NOT NULL REFERENCES public.vendor_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(vendor_request_id, user_id)
);

-- Enable RLS
ALTER TABLE public.vendor_ratings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can read all ratings"
ON public.vendor_ratings
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert their own ratings"
ON public.vendor_ratings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ratings"
ON public.vendor_ratings
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ratings"
ON public.vendor_ratings
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_vendor_ratings_updated_at
BEFORE UPDATE ON public.vendor_ratings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();