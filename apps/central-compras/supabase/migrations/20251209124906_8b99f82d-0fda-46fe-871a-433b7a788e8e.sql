-- Drop the existing policy for quotes SELECT
DROP POLICY IF EXISTS "Users can view quotes of own solicitations" ON public.quotes;

-- Create updated policy that includes approvers
CREATE POLICY "Users can view quotes of own solicitations" 
ON public.quotes 
FOR SELECT 
USING (
  (EXISTS ( SELECT 1
   FROM solicitations
  WHERE ((solicitations.id = quotes.solicitation_id) AND (solicitations.user_id = auth.uid())))) 
  OR (EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])))))
  OR (EXISTS ( SELECT 1
   FROM approvers
  WHERE (approvers.email = (auth.jwt() ->> 'email'::text))))
);