
DROP POLICY IF EXISTS "Stock can view internal requisition files" ON storage.objects;
CREATE POLICY "Stock can view internal requisition files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'solicitation-attachments'
  AND (
    public.user_has_role(auth.uid(), 'stock')
    OR public.user_has_role(auth.uid(), 'requisition_approver')
  )
  AND EXISTS (
    SELECT 1 FROM public.solicitations s
    WHERE s.id::text = (storage.foldername(objects.name))[1]
      AND s.request_type = 'internal_requisition'
  )
);
