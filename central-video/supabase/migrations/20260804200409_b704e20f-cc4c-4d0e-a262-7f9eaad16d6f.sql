-- 1) Stop exposing crew emails to every authenticated user
DROP POLICY IF EXISTS "Authenticated can view crew profiles" ON public.profiles;

CREATE OR REPLACE VIEW public.crew_members
WITH (security_invoker = off) AS
SELECT id, name, role
FROM public.profiles
WHERE role IN ('capitao', 'tripulante');

REVOKE ALL ON public.crew_members FROM anon;
GRANT SELECT ON public.crew_members TO authenticated;
GRANT ALL ON public.crew_members TO service_role;

-- 2) Restrict storage deletes to the uploader or crew
DROP POLICY IF EXISTS "Authenticated can remove video materials" ON storage.objects;

CREATE POLICY "Owner or crew can remove video materials"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'video-materials'
  AND (owner = auth.uid() OR public.is_crew(auth.uid()))
);
