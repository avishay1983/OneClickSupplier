-- Drop the restrictive policy
DROP POLICY IF EXISTS "Users can view their own pending approval" ON public.pending_approvals;

-- Create a new policy that allows all authenticated users to read all pending approvals
CREATE POLICY "Authenticated users can read all pending approvals"
ON public.pending_approvals
FOR SELECT
USING (true);

-- Also allow authenticated users to update any pending approval (for admin approval flow)
DROP POLICY IF EXISTS "Users can update their own pending approval" ON public.pending_approvals;

CREATE POLICY "Authenticated users can update all pending approvals"
ON public.pending_approvals
FOR UPDATE
USING (true);