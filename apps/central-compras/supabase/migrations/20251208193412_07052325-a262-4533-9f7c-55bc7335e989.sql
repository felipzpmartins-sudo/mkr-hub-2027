-- Corrigir policies que acessam auth.users diretamente

-- Corrigir policies de approvals
DROP POLICY IF EXISTS "Approvers can insert approvals" ON public.approvals;
DROP POLICY IF EXISTS "Approvers can view approvals" ON public.approvals;

-- Recriar policy de insert usando auth.jwt()
CREATE POLICY "Approvers can insert approvals" 
ON public.approvals 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM approvers
    WHERE approvers.email = auth.jwt() ->> 'email'
  )
);

-- Recriar policy de view usando auth.jwt()
CREATE POLICY "Approvers can view approvals" 
ON public.approvals 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM approvers
    WHERE approvers.email = auth.jwt() ->> 'email'
  )
  OR EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('admin', 'super_admin')
  )
  OR EXISTS (
    SELECT 1 FROM solicitations
    WHERE solicitations.id = approvals.solicitation_id 
    AND solicitations.user_id = auth.uid()
  )
);