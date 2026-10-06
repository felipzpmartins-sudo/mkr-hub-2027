-- Criar bucket para materiais de vídeo
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('video-materials', 'video-materials', false, 524288000);

-- Adicionar coluna para armazenar URLs dos arquivos na tabela video_requests
ALTER TABLE public.video_requests
ADD COLUMN attachments JSONB DEFAULT '[]'::jsonb;

-- Políticas de storage para o bucket
CREATE POLICY "Qualquer um pode fazer upload de materiais"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'video-materials');

CREATE POLICY "Qualquer um pode ver materiais"
ON storage.objects FOR SELECT
USING (bucket_id = 'video-materials');

CREATE POLICY "Qualquer um pode deletar seus materiais"
ON storage.objects FOR DELETE
USING (bucket_id = 'video-materials');