DROP POLICY IF EXISTS "Approvers can create their questions" ON public.approver_questions;
DROP POLICY IF EXISTS "View questions" ON public.approver_questions;

CREATE POLICY "Approvers can create their questions"
ON public.approver_questions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = approver_id
  AND EXISTS (
    SELECT 1
    FROM public.approvers a
    WHERE lower(a.email) = lower(auth.jwt() ->> 'email')
  )
);

CREATE POLICY "View questions"
ON public.approver_questions
FOR SELECT
TO authenticated
USING (
  auth.uid() = approver_id
  OR public.has_admin_role(auth.uid())
  OR public.user_has_role(auth.uid(), 'approver')
  OR public.user_has_role(auth.uid(), 'requisition_approver')
  OR EXISTS (
    SELECT 1
    FROM public.approvers a
    WHERE lower(a.email) = lower(auth.jwt() ->> 'email')
  )
);