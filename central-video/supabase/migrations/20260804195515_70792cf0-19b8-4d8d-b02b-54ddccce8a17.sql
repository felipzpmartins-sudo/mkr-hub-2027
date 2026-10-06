-- Limpa todas as solicitações de teste para começar do zero
TRUNCATE TABLE public.video_requests CASCADE;

-- Garante que o RLS está ativo
ALTER TABLE public.video_requests ENABLE ROW LEVEL SECURITY;

-- Remove políticas antigas se existirem
DROP POLICY IF EXISTS "Users can see their own requests" ON public.video_requests;
DROP POLICY IF EXISTS "Crew can view all requests" ON public.video_requests;
DROP POLICY IF EXISTS "Captains can manage everything" ON public.video_requests;
DROP POLICY IF EXISTS "Solicitantes can insert" ON public.video_requests;

-- Política: Solicitantes veem apenas os seus, Capitão e Tripulantes veem todos
CREATE POLICY "Users view policy"
ON public.video_requests
FOR SELECT
TO authenticated
USING (
  (auth.uid() = requester_id) OR
  (public.has_role(auth.uid(), 'capitao')) OR
  (public.has_role(auth.uid(), 'tripulante'))
);

-- Política: Qualquer autenticado pode inserir (o trigger set_video_request_requester_id_trg cuida do ID)
CREATE POLICY "Users insert policy"
ON public.video_requests
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Política: Capitão e Tripulantes podem atualizar
CREATE POLICY "Crew update policy"
ON public.video_requests
FOR UPDATE
TO authenticated
USING (
  (public.has_role(auth.uid(), 'capitao')) OR
  (public.has_role(auth.uid(), 'tripulante'))
)
WITH CHECK (
  (public.has_role(auth.uid(), 'capitao')) OR
  (public.has_role(auth.uid(), 'tripulante'))
);

-- Política: Apenas Capitão pode deletar
CREATE POLICY "Captain delete policy"
ON public.video_requests
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'capitao'));

-- Garante permissões de API
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_requests TO authenticated;
GRANT ALL ON public.video_requests TO service_role;
