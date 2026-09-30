-- Remover política que expõe todos os approvers
DROP POLICY IF EXISTS "Anyone authenticated can view approvers" ON public.approvers;

-- Criar política restritiva: apenas admins e os próprios approvers podem ver
CREATE POLICY "Admins and approvers can view approvers"
ON public.approvers
FOR SELECT
USING (
  has_admin_role(auth.uid()) OR 
  email = (auth.jwt() ->> 'email')
);