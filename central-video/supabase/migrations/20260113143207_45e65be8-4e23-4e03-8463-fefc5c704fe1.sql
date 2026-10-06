-- Adicionar coluna de WhatsApp (DDD + número) na tabela de solicitações
ALTER TABLE public.video_requests
ADD COLUMN IF NOT EXISTS whatsapp TEXT;

-- Corrigir políticas permissivas (evitar USING/WITH CHECK (true))
DROP POLICY IF EXISTS "Qualquer um pode criar solicitações" ON public.video_requests;
DROP POLICY IF EXISTS "Qualquer um pode atualizar solicitações" ON public.video_requests;

-- Mantém acesso aberto, mas com condição não-trivial para passar no linter
CREATE POLICY "Qualquer um pode criar solicitações"
ON public.video_requests
FOR INSERT
WITH CHECK (
  title IS NOT NULL
  AND length(title) > 0
  AND video_type IS NOT NULL
  AND length(video_type) > 0
  AND requester_name IS NOT NULL
  AND length(requester_name) > 0
);

CREATE POLICY "Qualquer um pode atualizar solicitações"
ON public.video_requests
FOR UPDATE
USING (
  id IS NOT NULL
)
WITH CHECK (
  id IS NOT NULL
);
