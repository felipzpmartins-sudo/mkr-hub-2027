-- Adicionar colunas que faltam na tabela solicitations
ALTER TABLE public.solicitations 
ADD COLUMN IF NOT EXISTS product_observations text,
ADD COLUMN IF NOT EXISTS flight_time text,
ADD COLUMN IF NOT EXISTS flight_search_link text,
ADD COLUMN IF NOT EXISTS flight_observations text,
ADD COLUMN IF NOT EXISTS material_type_other text,
ADD COLUMN IF NOT EXISTS material_size text,
ADD COLUMN IF NOT EXISTS material_observations text;

-- Adicionar colunas que faltam na tabela attachments
ALTER TABLE public.attachments 
ADD COLUMN IF NOT EXISTS file_name text NOT NULL DEFAULT 'arquivo',
ADD COLUMN IF NOT EXISTS attachment_type text NOT NULL DEFAULT 'general',
ADD COLUMN IF NOT EXISTS file_size bigint,
ADD COLUMN IF NOT EXISTS mime_type text;

-- Remover o default após adicionar a coluna
ALTER TABLE public.attachments ALTER COLUMN file_name DROP DEFAULT;
ALTER TABLE public.attachments ALTER COLUMN attachment_type DROP DEFAULT;

-- Criar função para criar perfil automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'Usuário'));
  RETURN NEW;
END;
$$;

-- Criar trigger para novos usuários
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Criar bucket de storage para anexos
INSERT INTO storage.buckets (id, name, public)
VALUES ('solicitation-attachments', 'solicitation-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- RLS para profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS para user_roles (apenas admins podem ver/modificar)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read roles" ON public.user_roles
FOR SELECT USING (true);

CREATE POLICY "Service role can insert roles" ON public.user_roles
FOR INSERT WITH CHECK (true);

-- RLS para solicitations
ALTER TABLE public.solicitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own solicitations" ON public.solicitations
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own solicitations" ON public.solicitations
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all solicitations" ON public.solicitations
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can update all solicitations" ON public.solicitations
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- RLS para attachments
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view attachments of own solicitations" ON public.attachments
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.solicitations WHERE id = solicitation_id AND user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Users can create attachments for own solicitations" ON public.attachments
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.solicitations WHERE id = solicitation_id AND user_id = auth.uid())
);

-- Storage policies
CREATE POLICY "Authenticated users can upload" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'solicitation-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Users can view own attachments" ON storage.objects
FOR SELECT USING (bucket_id = 'solicitation-attachments' AND auth.role() = 'authenticated');