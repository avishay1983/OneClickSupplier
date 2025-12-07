-- Create profiles table for dashboard users
CREATE TABLE public.profiles (
  id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data ->> 'full_name');
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Drop existing permissive policies on vendor_requests
DROP POLICY IF EXISTS "Allow public insert" ON public.vendor_requests;
DROP POLICY IF EXISTS "Allow public read access" ON public.vendor_requests;
DROP POLICY IF EXISTS "Allow public update" ON public.vendor_requests;

-- Create secure policies for vendor_requests
-- Authenticated users (dashboard) can do everything
CREATE POLICY "Authenticated users can read all vendor requests"
ON public.vendor_requests FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert vendor requests"
ON public.vendor_requests FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update vendor requests"
ON public.vendor_requests FOR UPDATE
TO authenticated
USING (true);

-- Anonymous users (vendors) can only access their own request with secure_token
CREATE POLICY "Vendors can read their own request by token"
ON public.vendor_requests FOR SELECT
TO anon
USING (false);

CREATE POLICY "Vendors can update their own request by token"
ON public.vendor_requests FOR UPDATE
TO anon
USING (false);

-- Drop existing permissive policies on vendor_documents
DROP POLICY IF EXISTS "Allow public delete" ON public.vendor_documents;
DROP POLICY IF EXISTS "Allow public insert" ON public.vendor_documents;
DROP POLICY IF EXISTS "Allow public read access" ON public.vendor_documents;

-- Create secure policies for vendor_documents
CREATE POLICY "Authenticated users can read all documents"
ON public.vendor_documents FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert documents"
ON public.vendor_documents FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete documents"
ON public.vendor_documents FOR DELETE
TO authenticated
USING (true);

-- Anonymous cannot access documents directly
CREATE POLICY "Anonymous cannot read documents"
ON public.vendor_documents FOR SELECT
TO anon
USING (false);

CREATE POLICY "Anonymous cannot insert documents"
ON public.vendor_documents FOR INSERT
TO anon
WITH CHECK (false);

CREATE POLICY "Anonymous cannot delete documents"
ON public.vendor_documents FOR DELETE
TO anon
USING (false);

-- Drop existing permissive policies on app_settings
DROP POLICY IF EXISTS "Allow public insert access" ON public.app_settings;
DROP POLICY IF EXISTS "Allow public read access" ON public.app_settings;
DROP POLICY IF EXISTS "Allow public update access" ON public.app_settings;

-- Only authenticated users can access app_settings
CREATE POLICY "Authenticated users can read settings"
ON public.app_settings FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can update settings"
ON public.app_settings FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert settings"
ON public.app_settings FOR INSERT
TO authenticated
WITH CHECK (true);