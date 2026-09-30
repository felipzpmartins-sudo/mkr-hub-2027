-- Adicionar policy para aprovadores verem solicitações que estão pendentes de aprovação
CREATE POLICY "Approvers can view solicitations pending approval" 
ON public.solicitations 
FOR SELECT 
USING (
  approval_status IN ('pending_approval', 'approved_partial', 'approved_released', 'rejected', 'delivered')
  AND EXISTS (
    SELECT 1 FROM approvers
    WHERE approvers.email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);