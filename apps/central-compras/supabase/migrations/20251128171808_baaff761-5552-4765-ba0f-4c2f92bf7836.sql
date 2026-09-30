-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Criar tipo enum para status
CREATE TYPE request_status AS ENUM (
  'pending',
  'approved',
  'rejected',
  'purchasing',
  'delivered'
);

-- Criar tipo enum para tipo de solicitação
CREATE TYPE request_type AS ENUM (
  'product',
  'flight',
  'custom_material'
);

-- Criar tipo enum para tipo de material personalizado
CREATE TYPE material_type AS ENUM (
  'sticker',
  'banner',
  'folder',
  'flyer',
  'other'
);

-- Criar tabela de solicitações
CREATE TABLE public.solicitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Dados do solicitante
  requester_name TEXT NOT NULL,
  requester_email TEXT NOT NULL,
  
  -- Tipo e descrição
  request_type request_type NOT NULL,
  general_description TEXT,
  
  -- Dados de PRODUTO
  product_name TEXT,
  product_quantity INTEGER,
  product_link TEXT,
  product_observations TEXT,
  
  -- Dados de PASSAGEM
  flight_origin TEXT,
  flight_destination TEXT,
  flight_departure_date DATE,
  flight_return_date DATE,
  flight_time TEXT,
  flight_preferred_airline TEXT,
  flight_estimated_value TEXT,
  flight_search_link TEXT,
  flight_observations TEXT,
  
  -- Dados de MATERIAL PERSONALIZADO
  material_type material_type,
  material_type_other TEXT,
  material_size TEXT,
  material_quantity INTEGER,
  material_purpose TEXT,
  material_observations TEXT,
  
  -- Status e gestão
  status request_status NOT NULL DEFAULT 'pending',
  admin_justification TEXT,
  estimated_arrival_date DATE,
  actual_delivery_date DATE,
  final_order_link TEXT,
  
  -- Índices para busca
  CONSTRAINT valid_product_fields CHECK (
    request_type != 'product' OR (product_name IS NOT NULL AND product_quantity IS NOT NULL)
  ),
  CONSTRAINT valid_flight_fields CHECK (
    request_type != 'flight' OR (flight_origin IS NOT NULL AND flight_destination IS NOT NULL AND flight_departure_date IS NOT NULL)
  ),
  CONSTRAINT valid_material_fields CHECK (
    request_type != 'custom_material' OR (material_type IS NOT NULL AND material_quantity IS NOT NULL)
  )
);

-- Criar tabela de anexos
CREATE TABLE public.attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  solicitation_id UUID NOT NULL REFERENCES public.solicitations(id) ON DELETE CASCADE,
  
  attachment_type TEXT NOT NULL, -- 'product_image', 'flight_screenshot', 'material_art', 'material_reference', 'invoice', 'payment_proof', 'other_document'
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT
);

-- Criar tabela de histórico de status
CREATE TABLE public.status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  solicitation_id UUID NOT NULL REFERENCES public.solicitations(id) ON DELETE CASCADE,
  
  old_status request_status,
  new_status request_status NOT NULL,
  changed_by TEXT NOT NULL,
  notes TEXT
);

-- Habilitar RLS
ALTER TABLE public.solicitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_history ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - Por enquanto permitir todas operações (sistema interno)
-- Depois pode-se adicionar autenticação e controlar por role de usuário
CREATE POLICY "Permitir leitura de solicitações" ON public.solicitations FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de solicitações" ON public.solicitations FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de solicitações" ON public.solicitations FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão de solicitações" ON public.solicitations FOR DELETE USING (true);

CREATE POLICY "Permitir leitura de anexos" ON public.attachments FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de anexos" ON public.attachments FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de anexos" ON public.attachments FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão de anexos" ON public.attachments FOR DELETE USING (true);

CREATE POLICY "Permitir leitura de histórico" ON public.status_history FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de histórico" ON public.status_history FOR INSERT WITH CHECK (true);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_solicitations_updated_at
  BEFORE UPDATE ON public.solicitations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para registrar mudanças de status
CREATE OR REPLACE FUNCTION public.log_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.status_history (solicitation_id, old_status, new_status, changed_by, notes)
    VALUES (NEW.id, OLD.status, NEW.status, 'system', NEW.admin_justification);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_solicitation_status_change
  AFTER UPDATE ON public.solicitations
  FOR EACH ROW
  EXECUTE FUNCTION public.log_status_change();

-- Criar índices para melhor performance
CREATE INDEX idx_solicitations_status ON public.solicitations(status);
CREATE INDEX idx_solicitations_request_type ON public.solicitations(request_type);
CREATE INDEX idx_solicitations_created_at ON public.solicitations(created_at DESC);
CREATE INDEX idx_solicitations_requester_name ON public.solicitations(requester_name);
CREATE INDEX idx_attachments_solicitation_id ON public.attachments(solicitation_id);
CREATE INDEX idx_status_history_solicitation_id ON public.status_history(solicitation_id);

-- Criar bucket de storage para anexos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('solicitation-attachments', 'solicitation-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage
CREATE POLICY "Permitir leitura de anexos" ON storage.objects FOR SELECT USING (bucket_id = 'solicitation-attachments');
CREATE POLICY "Permitir upload de anexos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'solicitation-attachments');
CREATE POLICY "Permitir atualização de anexos" ON storage.objects FOR UPDATE USING (bucket_id = 'solicitation-attachments');
CREATE POLICY "Permitir exclusão de anexos" ON storage.objects FOR DELETE USING (bucket_id = 'solicitation-attachments');