-- Permitir acesso anônimo para testes (temporário)
DROP POLICY IF EXISTS "Solicitações são visíveis para todos autenticados" ON public.video_requests;
DROP POLICY IF EXISTS "Usuários podem criar solicitações" ON public.video_requests;
DROP POLICY IF EXISTS "Capitão e tripulação podem atualizar solicitações" ON public.video_requests;

-- Criar políticas que permitem acesso público (para testes)
CREATE POLICY "Solicitações visíveis para todos" 
ON public.video_requests FOR SELECT 
USING (true);

CREATE POLICY "Qualquer um pode criar solicitações" 
ON public.video_requests FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Qualquer um pode atualizar solicitações" 
ON public.video_requests FOR UPDATE 
USING (true);