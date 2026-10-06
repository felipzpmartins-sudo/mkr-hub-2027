-- Adicionar coluna para material finalizado (deliverables) na tabela video_requests
ALTER TABLE public.video_requests
ADD COLUMN IF NOT EXISTS deliverables JSONB DEFAULT '[]'::jsonb;

-- Adicionar status 'review' para aguardando aprovação do capitão
-- (o status já é TEXT, então podemos usar 'review' diretamente)