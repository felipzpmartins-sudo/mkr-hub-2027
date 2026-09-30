
DROP POLICY IF EXISTS "View questions" ON public.approver_questions;
CREATE POLICY "View questions"
ON public.approver_questions
FOR SELECT
USING (
  auth.uid() = approver_id
  OR public.has_admin_role(auth.uid())
  OR public.user_has_role(auth.uid(), 'approver')
  OR public.user_has_role(auth.uid(), 'requisition_approver')
  OR EXISTS (
    SELECT 1 FROM public.approvers a
    JOIN auth.users u ON u.email = a.email
    WHERE u.id = auth.uid()
  )
);
