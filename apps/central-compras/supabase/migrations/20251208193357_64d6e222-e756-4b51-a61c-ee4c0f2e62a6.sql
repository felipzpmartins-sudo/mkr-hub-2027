-- Remover policy problemática que acessa auth.users diretamente
DROP POLICY IF EXISTS "Approvers can view solicitations pending approval" ON public.solicitations;

-- Recriar policy usando approvers.email comparado com auth.jwt()
CREATE POLICY "Approvers can view solicitations pending approval" 
ON public.solicitations 
FOR SELECT 
USING (
  approval_status IN ('pending_approval', 'approved_partial', 'approved_released', 'rejected', 'delivered')
  AND EXISTS (
    SELECT 1 FROM approvers
    WHERE approvers.email = auth.jwt() ->> 'email'
  )
);