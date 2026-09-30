DROP POLICY IF EXISTS "Approvers can view attachments" ON public.attachments;
CREATE POLICY "Approvers can view attachments" ON public.attachments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.approvers
    WHERE lower(approvers.email) = lower(auth.jwt() ->> 'email')
  )
  AND EXISTS (
    SELECT 1 FROM public.solicitations s
    WHERE s.id = attachments.solicitation_id
      AND s.approval_status = ANY (ARRAY['pending_approval','approved_partial','approved_released','rejected','delivered'])
  )
);

DROP POLICY IF EXISTS "Users can view own solicitation files" ON storage.objects;
CREATE POLICY "Users can view own solicitation files" ON storage.objects
FOR SELECT
USING (
  bucket_id = 'solicitation-attachments'
  AND (
    EXISTS (
      SELECT 1 FROM public.solicitations
      WHERE solicitations.id::text = (storage.foldername(objects.name))[1]
        AND solicitations.user_id = auth.uid()
    )
    OR public.has_admin_role(auth.uid())
    OR (
      EXISTS (SELECT 1 FROM public.approvers WHERE lower(approvers.email) = lower(auth.jwt() ->> 'email'))
      AND EXISTS (
        SELECT 1 FROM public.solicitations
        WHERE solicitations.id::text = (storage.foldername(objects.name))[1]
          AND solicitations.approval_status = ANY (ARRAY['pending_approval','approved_partial','approved_released','rejected','delivered'])
      )
    )
    OR (
      (public.user_has_role(auth.uid(), 'stock') OR public.user_has_role(auth.uid(), 'requisition_approver'))
      AND EXISTS (
        SELECT 1 FROM public.solicitations s
        WHERE s.id::text = (storage.foldername(objects.name))[1]
          AND s.request_type = 'internal_requisition'
      )
    )
  )
);