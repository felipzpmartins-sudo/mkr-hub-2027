
DROP POLICY IF EXISTS "Service role can insert roles" ON public.user_roles;

CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_admin_role(auth.uid()));

CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_admin_role(auth.uid()))
WITH CHECK (public.has_admin_role(auth.uid()));

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_admin_role(auth.uid()));

CREATE POLICY "Users can update own solicitation files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'solicitation-attachments'
  AND (
    EXISTS (
      SELECT 1 FROM public.solicitations
      WHERE solicitations.id::text = (storage.foldername(objects.name))[1]
        AND solicitations.user_id = auth.uid()
    )
    OR public.has_admin_role(auth.uid())
  )
)
WITH CHECK (
  bucket_id = 'solicitation-attachments'
  AND (
    EXISTS (
      SELECT 1 FROM public.solicitations
      WHERE solicitations.id::text = (storage.foldername(objects.name))[1]
        AND solicitations.user_id = auth.uid()
    )
    OR public.has_admin_role(auth.uid())
  )
);

ALTER PUBLICATION supabase_realtime DROP TABLE public.quotes;
ALTER PUBLICATION supabase_realtime DROP TABLE public.approvals;

ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;
