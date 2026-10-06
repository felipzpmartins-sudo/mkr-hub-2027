
-- 1) Bloquear self-promotion via profiles
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND role = 'solicitante');

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND role = (SELECT p.role FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1)
);

-- 2) Storage: somente autenticados podem inserir/deletar no bucket video-materials
DROP POLICY IF EXISTS "Public can upload video materials" ON storage.objects;
CREATE POLICY "Authenticated can upload video materials"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'video-materials' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Public can remove video materials" ON storage.objects;
CREATE POLICY "Authenticated can remove video materials"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'video-materials' AND auth.uid() IS NOT NULL);

-- 3) Não expor e-mails da tripulação para visitantes anônimos
DROP POLICY IF EXISTS "Public can view crew profiles" ON public.profiles;
CREATE POLICY "Authenticated can view crew profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (role IN ('capitao', 'tripulante'));
