-- Remover políticas antigas de storage
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own attachments" ON storage.objects;

-- Política de UPLOAD: usuário só pode fazer upload para suas próprias solicitações
-- O path segue o formato: solicitation_id/filename
CREATE POLICY "Users can upload to own solicitations"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'solicitation-attachments' AND
  (
    -- Verificar se o usuário é dono da solicitação (primeiro segmento do path é o solicitation_id)
    EXISTS (
      SELECT 1 FROM public.solicitations
      WHERE id::text = (storage.foldername(name))[1]
      AND user_id = auth.uid()
    )
    OR
    -- Admins podem fazer upload para qualquer solicitação
    public.has_admin_role(auth.uid())
  )
);

-- Política de LEITURA: usuário só pode ver arquivos de suas próprias solicitações
CREATE POLICY "Users can view own solicitation files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'solicitation-attachments' AND
  (
    -- Verificar se o usuário é dono da solicitação
    EXISTS (
      SELECT 1 FROM public.solicitations
      WHERE id::text = (storage.foldername(name))[1]
      AND user_id = auth.uid()
    )
    OR
    -- Admins podem ver todos os arquivos
    public.has_admin_role(auth.uid())
    OR
    -- Approvers podem ver arquivos de solicitações em aprovação
    (
      EXISTS (
        SELECT 1 FROM public.approvers
        WHERE email = (auth.jwt() ->> 'email')
      )
      AND
      EXISTS (
        SELECT 1 FROM public.solicitations
        WHERE id::text = (storage.foldername(name))[1]
        AND approval_status IN ('pending_approval', 'approved_partial', 'approved_released', 'rejected', 'delivered')
      )
    )
  )
);

-- Política de DELETE: apenas admins podem deletar arquivos
CREATE POLICY "Admins can delete files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'solicitation-attachments' AND
  public.has_admin_role(auth.uid())
);