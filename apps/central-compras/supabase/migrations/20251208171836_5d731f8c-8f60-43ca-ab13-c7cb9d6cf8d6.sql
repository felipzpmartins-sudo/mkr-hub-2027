-- Atualizar a policy de INSERT em quotes para permitir que admins também possam inserir
DROP POLICY IF EXISTS "Users can upload quotes for own solicitations" ON public.quotes;

CREATE POLICY "Users and admins can upload quotes" 
ON public.quotes 
FOR INSERT 
WITH CHECK (
  (EXISTS (
    SELECT 1 FROM solicitations
    WHERE solicitations.id = quotes.solicitation_id 
    AND solicitations.user_id = auth.uid()
  ))
  OR
  (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('admin', 'super_admin')
  ))
);