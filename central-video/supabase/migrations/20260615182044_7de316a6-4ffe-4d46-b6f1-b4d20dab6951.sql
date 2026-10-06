GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_requests TO anon, authenticated;
GRANT ALL ON public.video_requests TO service_role;
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.video_requests DROP CONSTRAINT IF EXISTS video_requests_status_check;
ALTER TABLE public.video_requests
ADD CONSTRAINT video_requests_status_check
CHECK (status IN ('new', 'progress', 'alteration', 'review', 'completed', 'rejected'));

DROP POLICY IF EXISTS "Authenticated users can create requests" ON public.video_requests;
DROP POLICY IF EXISTS "Captain and admin can update any request" ON public.video_requests;
DROP POLICY IF EXISTS "Crew can update assigned requests" ON public.video_requests;
DROP POLICY IF EXISTS "Crew can view all requests" ON public.video_requests;
DROP POLICY IF EXISTS "Users can view their own requests" ON public.video_requests;
DROP POLICY IF EXISTS "Captain and admin can delete requests" ON public.video_requests;
DROP POLICY IF EXISTS "Solicitações visíveis para todos" ON public.video_requests;
DROP POLICY IF EXISTS "Qualquer um pode criar solicitações" ON public.video_requests;
DROP POLICY IF EXISTS "Qualquer um pode atualizar solicitações" ON public.video_requests;

CREATE POLICY "Public can view video requests"
ON public.video_requests
FOR SELECT
TO anon, authenticated
USING (id IS NOT NULL);

CREATE POLICY "Public can create valid video requests"
ON public.video_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (
  title IS NOT NULL
  AND length(trim(title)) BETWEEN 1 AND 200
  AND video_type IS NOT NULL
  AND length(trim(video_type)) BETWEEN 1 AND 120
  AND requester_name IS NOT NULL
  AND length(trim(requester_name)) BETWEEN 1 AND 120
  AND (description IS NULL OR length(description) <= 3000)
  AND (whatsapp IS NULL OR length(whatsapp) <= 32)
  AND (brand IS NULL OR length(brand) <= 120)
  AND (platform IS NULL OR length(platform) <= 80)
  AND (format IS NULL OR length(format) <= 80)
  AND (orientation IS NULL OR orientation IN ('vertical', 'horizontal'))
  AND status = 'new'
);

CREATE POLICY "Public can update workflow fields"
ON public.video_requests
FOR UPDATE
TO anon, authenticated
USING (id IS NOT NULL)
WITH CHECK (
  id IS NOT NULL
  AND title IS NOT NULL
  AND length(trim(title)) BETWEEN 1 AND 200
  AND video_type IS NOT NULL
  AND length(trim(video_type)) BETWEEN 1 AND 120
  AND requester_name IS NOT NULL
  AND length(trim(requester_name)) BETWEEN 1 AND 120
  AND status IN ('new', 'progress', 'alteration', 'review', 'completed', 'rejected')
);

CREATE POLICY "Public can delete video requests"
ON public.video_requests
FOR DELETE
TO anon, authenticated
USING (id IS NOT NULL);

DROP POLICY IF EXISTS "Crew can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles são visíveis para todos" ON public.profiles;
DROP POLICY IF EXISTS "Profiles são visíveis para todos autenticados" ON public.profiles;

CREATE POLICY "Public can view crew profiles"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (role IN ('capitao', 'tripulante'));