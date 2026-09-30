-- Drop the existing approver policy for solicitations
DROP POLICY IF EXISTS "Approvers can view solicitations pending approval" ON public.solicitations;

-- Create updated policy that allows approvers to view solicitations in approval-related statuses
CREATE POLICY "Approvers can view solicitations pending approval" 
ON public.solicitations 
FOR SELECT 
USING (
  (approval_status IN ('pending_approval', 'approved_partial', 'approved_released', 'rejected', 'delivered')) 
  AND (EXISTS ( 
    SELECT 1 FROM approvers 
    WHERE approvers.email = (auth.jwt() ->> 'email'::text)
  ))
);