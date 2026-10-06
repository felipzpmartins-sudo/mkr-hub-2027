-- Remove as políticas conflitantes criadas na última migração
-- (elas usavam user_roles, que está praticamente vazio, e comparavam auth.uid() com requester_id,
--  que na verdade é o id do perfil — causando comportamento intermitente)
DROP POLICY IF EXISTS "Users view policy" ON public.video_requests;
DROP POLICY IF EXISTS "Users insert policy" ON public.video_requests;
DROP POLICY IF EXISTS "Crew update policy" ON public.video_requests;
DROP POLICY IF EXISTS "Captain delete policy" ON public.video_requests;

-- Permite que cada usuário leia o próprio perfil (necessário para o app saber o papel/nome)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_requests TO authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.video_requests TO service_role;
