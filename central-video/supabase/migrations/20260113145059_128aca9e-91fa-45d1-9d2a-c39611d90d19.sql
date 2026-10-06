-- Adicionar coluna de email na tabela video_requests
ALTER TABLE public.video_requests 
ADD COLUMN email text;