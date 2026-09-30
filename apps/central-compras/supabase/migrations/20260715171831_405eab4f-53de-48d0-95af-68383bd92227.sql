
CREATE POLICY "Stock can insert missing-items attachments"
ON public.attachments FOR INSERT
WITH CHECK (
  public.user_has_role(auth.uid(), 'stock')
  AND EXISTS (
    SELECT 1 FROM public.solicitations s
    WHERE s.id = attachments.solicitation_id
      AND s.request_type = 'internal_requisition'
  )
);

CREATE POLICY "Stock can upload missing-items files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'solicitation-attachments'
  AND public.user_has_role(auth.uid(), 'stock')
  AND EXISTS (
    SELECT 1 FROM public.solicitations s
    WHERE s.id::text = (storage.foldername(objects.name))[1]
      AND s.request_type = 'internal_requisition'
  )
);
