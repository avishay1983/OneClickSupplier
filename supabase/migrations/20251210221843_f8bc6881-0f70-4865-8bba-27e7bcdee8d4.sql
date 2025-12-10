-- Fix security issues: Remove overly permissive "Anyone can" policies

-- 1. Drop the problematic policies on vendor_requests
DROP POLICY IF EXISTS "Anyone can read vendor request by token" ON public.vendor_requests;
DROP POLICY IF EXISTS "Anyone can update vendor request" ON public.vendor_requests;

-- 2. Drop the problematic policies on vendor_documents  
DROP POLICY IF EXISTS "Anyone can read documents" ON public.vendor_documents;
DROP POLICY IF EXISTS "Anyone can insert documents" ON public.vendor_documents;
DROP POLICY IF EXISTS "Anyone can delete documents" ON public.vendor_documents;

-- 3. Fix pending_approvals - users should only see their own pending approvals
DROP POLICY IF EXISTS "Authenticated users can view pending approvals" ON public.pending_approvals;
DROP POLICY IF EXISTS "Authenticated users can update pending approvals" ON public.pending_approvals;

-- Create proper policy for pending_approvals - users can only view their own
CREATE POLICY "Users can view their own pending approval"
ON public.pending_approvals
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins (via edge functions with service role) can manage all approvals
-- Regular users can only update their own pending approval status
CREATE POLICY "Users can update their own pending approval"
ON public.pending_approvals
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);