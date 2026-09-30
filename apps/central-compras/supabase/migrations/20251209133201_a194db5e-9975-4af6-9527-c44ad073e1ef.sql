-- Permitir que usuários autenticados vejam nomes de perfis de outros usuários
CREATE POLICY "Authenticated users can view all profiles names" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL);