-- Adicionar coluna para registrar reprovação especial (veto) e justificativa
ALTER TABLE public.solicitations
  ADD COLUMN IF NOT EXISTS veto_by uuid,
  ADD COLUMN IF NOT EXISTS veto_reason text,
  ADD COLUMN IF NOT EXISTS veto_at timestamptz,
  ADD COLUMN IF NOT EXISTS veto_count integer NOT NULL DEFAULT 0;

-- Função que retorna se o usuário atual é veto-aprovador (Rafael ou Alberto)
CREATE OR REPLACE FUNCTION public.is_veto_approver(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE u.id = _user_id
      AND lower(u.email) IN ('ceo@makergrupo.com.br', 'controller@makergrupo.com.br')
  );
$$;

-- Permitir que veto-aprovadores atualizem solicitações para registrar veto
CREATE POLICY "Veto approvers can update solicitations"
ON public.solicitations
FOR UPDATE
USING (public.is_veto_approver(auth.uid()))
WITH CHECK (public.is_veto_approver(auth.uid()));