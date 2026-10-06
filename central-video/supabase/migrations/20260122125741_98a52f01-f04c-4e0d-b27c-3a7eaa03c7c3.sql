-- Tornar o bucket video-materials público para permitir download
UPDATE storage.buckets 
SET public = true 
WHERE id = 'video-materials';

-- Criar política para permitir leitura pública dos arquivos
CREATE POLICY "Public read access for video materials"
ON storage.objects
FOR SELECT
USING (bucket_id = 'video-materials');

-- Política para upload autenticado
CREATE POLICY "Authenticated users can upload to video-materials"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'video-materials' 
  AND auth.uid() IS NOT NULL
);

-- Política para usuários autenticados deletarem seus uploads
CREATE POLICY "Authenticated users can delete from video-materials"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'video-materials' 
  AND auth.uid() IS NOT NULL
);