-- Add approval fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN is_approved boolean NOT NULL DEFAULT false,
ADD COLUMN approved_at timestamp with time zone,
ADD COLUMN approved_by uuid;

-- Create pending_approvals table to track approval requests
CREATE TABLE public.pending_approvals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  user_email text NOT NULL,
  user_name text,
  approval_token uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- Enable RLS
ALTER TABLE public.pending_approvals ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can view pending approvals
CREATE POLICY "Authenticated users can view pending approvals"
ON public.pending_approvals FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can update pending approvals"
ON public.pending_approvals FOR UPDATE
TO authenticated
USING (true);

-- Update handle_new_user function to create pending approval
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Insert into profiles (not approved by default)
  INSERT INTO public.profiles (id, full_name, is_approved)
  VALUES (new.id, new.raw_user_meta_data ->> 'full_name', false);
  
  -- Create pending approval record
  INSERT INTO public.pending_approvals (user_id, user_email, user_name)
  VALUES (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  
  RETURN new;
END;
$$;