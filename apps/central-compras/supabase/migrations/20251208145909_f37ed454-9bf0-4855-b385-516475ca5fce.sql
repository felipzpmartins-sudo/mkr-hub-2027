-- Criar tabela de aprovadores (lista fixa de emails)
CREATE TABLE public.approvers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Inserir os 4 aprovadores
INSERT INTO public.approvers (email, name) VALUES
  ('juliana@empresa.com', 'Juliana'),
  ('alberto@empresa.com', 'Alberto'),
  ('rafael@empresa.com', 'Rafael'),
  ('priscila@empresa.com', 'Priscila');

-- Tabela de orçamentos (3 obrigatórios por solicitação)
CREATE TABLE public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitation_id uuid NOT NULL REFERENCES public.solicitations(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_name text NOT NULL,
  supplier_name text,
  value numeric,
  uploaded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Tabela de aprovações
CREATE TABLE public.approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitation_id uuid NOT NULL REFERENCES public.solicitations(id) ON DELETE CASCADE,
  approver_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  justification text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(solicitation_id, approver_id)
);

-- Tabela para recibos numerados (integração Sankhya)
CREATE TABLE public.receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitation_id uuid NOT NULL REFERENCES public.solicitations(id) ON DELETE CASCADE,
  receipt_number serial UNIQUE,
  invoice_file_path text,
  invoice_file_name text,
  observations text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Adicionar novos campos à tabela solicitations
ALTER TABLE public.solicitations 
ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'pending_quotes' 
  CHECK (approval_status IN ('pending_quotes', 'pending_approval', 'approved_partial', 'approved_released', 'rejected', 'delivered')),
ADD COLUMN IF NOT EXISTS approved_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS released_at timestamptz,
ADD COLUMN IF NOT EXISTS delivery_observations text,
ADD COLUMN IF NOT EXISTS invoice_uploaded_at timestamptz;

-- Habilitar RLS em todas as novas tabelas
ALTER TABLE public.approvers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

-- Políticas para approvers (leitura pública para autenticados)
CREATE POLICY "Anyone authenticated can view approvers"
ON public.approvers FOR SELECT
TO authenticated
USING (true);

-- Políticas para quotes
CREATE POLICY "Users can view quotes of own solicitations"
ON public.quotes FOR SELECT
USING (
  EXISTS (SELECT 1 FROM solicitations WHERE solicitations.id = quotes.solicitation_id AND solicitations.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('admin', 'super_admin', 'approver'))
);

CREATE POLICY "Users can upload quotes for own solicitations"
ON public.quotes FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM solicitations WHERE solicitations.id = quotes.solicitation_id AND solicitations.user_id = auth.uid())
);

-- Políticas para approvals
CREATE POLICY "Approvers can view approvals"
ON public.approvals FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM approvers WHERE approvers.email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  OR EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('admin', 'super_admin'))
  OR EXISTS (SELECT 1 FROM solicitations WHERE solicitations.id = approvals.solicitation_id AND solicitations.user_id = auth.uid())
);

CREATE POLICY "Approvers can insert approvals"
ON public.approvals FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM approvers WHERE approvers.email = (SELECT email FROM auth.users WHERE id = auth.uid()))
);

CREATE POLICY "Approvers can update own approvals"
ON public.approvals FOR UPDATE
USING (approver_id = auth.uid());

-- Políticas para receipts
CREATE POLICY "Super admins can manage receipts"
ON public.receipts FOR ALL
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'super_admin')
);

CREATE POLICY "Users can view receipts of own solicitations"
ON public.receipts FOR SELECT
USING (
  EXISTS (SELECT 1 FROM solicitations WHERE solicitations.id = receipts.solicitation_id AND solicitations.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('admin', 'super_admin'))
);

-- Função para contar aprovações e atualizar status
CREATE OR REPLACE FUNCTION public.update_approval_count()
RETURNS TRIGGER AS $$
DECLARE
  approval_count integer;
  rejection_count integer;
BEGIN
  -- Contar aprovações
  SELECT COUNT(*) INTO approval_count
  FROM public.approvals
  WHERE solicitation_id = NEW.solicitation_id AND status = 'approved';
  
  -- Contar rejeições
  SELECT COUNT(*) INTO rejection_count
  FROM public.approvals
  WHERE solicitation_id = NEW.solicitation_id AND status = 'rejected';
  
  -- Atualizar solicitação
  UPDATE public.solicitations
  SET 
    approved_count = approval_count,
    approval_status = CASE
      WHEN rejection_count > 0 THEN 'rejected'
      WHEN approval_count >= 2 THEN 'approved_released'
      WHEN approval_count = 1 THEN 'approved_partial'
      ELSE 'pending_approval'
    END,
    released_at = CASE WHEN approval_count >= 2 THEN now() ELSE released_at END
  WHERE id = NEW.solicitation_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para atualizar contagem de aprovações
CREATE TRIGGER on_approval_change
AFTER INSERT OR UPDATE ON public.approvals
FOR EACH ROW EXECUTE FUNCTION public.update_approval_count();

-- Função para verificar se tem 3 orçamentos
CREATE OR REPLACE FUNCTION public.check_quotes_count()
RETURNS TRIGGER AS $$
DECLARE
  quote_count integer;
BEGIN
  SELECT COUNT(*) INTO quote_count
  FROM public.quotes
  WHERE solicitation_id = NEW.solicitation_id;
  
  IF quote_count >= 3 THEN
    UPDATE public.solicitations
    SET approval_status = 'pending_approval'
    WHERE id = NEW.solicitation_id AND approval_status = 'pending_quotes';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para verificar orçamentos
CREATE TRIGGER on_quote_insert
AFTER INSERT ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.check_quotes_count();

-- Habilitar realtime para as novas tabelas
ALTER PUBLICATION supabase_realtime ADD TABLE public.approvals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quotes;