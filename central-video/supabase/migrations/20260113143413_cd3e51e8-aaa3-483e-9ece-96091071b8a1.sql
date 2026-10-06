-- Permitir que qualquer pessoa visualize perfis (necessário para listar tripulantes no dropdown)
DROP POLICY IF EXISTS "Profiles são visíveis para todos autenticados" ON public.profiles;

CREATE POLICY "Profiles são visíveis para todos"
ON public.profiles
FOR SELECT
USING (true);
