CREATE POLICY "Approvers can view attachments" ON public.attachments
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.approvers WHERE email = (auth.jwt() ->> 'email'))
  AND EXISTS (
    SELECT 1 FROM public.solicitations s
    WHERE s.id = attachments.solicitation_id
      AND s.approval_status IN ('pending_approval','approved_partial','approved_released','rejected','delivered')
  )
);