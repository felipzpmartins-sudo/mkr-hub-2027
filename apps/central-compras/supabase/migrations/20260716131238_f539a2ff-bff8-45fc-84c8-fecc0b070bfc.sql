
-- Allow requester to view questions on their own solicitation
DROP POLICY IF EXISTS "View questions" ON public.approver_questions;
CREATE POLICY "View questions"
ON public.approver_questions
FOR SELECT
TO authenticated
USING (
  auth.uid() = approver_id
  OR has_admin_role(auth.uid())
  OR user_has_role(auth.uid(), 'approver')
  OR user_has_role(auth.uid(), 'requisition_approver')
  OR EXISTS (SELECT 1 FROM public.approvers a WHERE lower(a.email) = lower((auth.jwt() ->> 'email')))
  OR EXISTS (SELECT 1 FROM public.solicitations s WHERE s.id = solicitation_id AND s.user_id = auth.uid())
);

-- Allow requester to answer questions on their own solicitation
CREATE POLICY "Requester can answer questions"
ON public.approver_questions
FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.solicitations s WHERE s.id = solicitation_id AND s.user_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.solicitations s WHERE s.id = solicitation_id AND s.user_id = auth.uid())
);
