-- Tabela de perfis (tripulação e solicitantes)
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'solicitante' CHECK (role IN ('capitao', 'tripulante', 'solicitante')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de solicitações de vídeo
CREATE TABLE public.video_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  video_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'progress', 'alteration', 'completed', 'rejected')),
  requester_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  requester_name TEXT NOT NULL,
  assigned_to UUID[] DEFAULT '{}',
  assigned_names TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_requests ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles
CREATE POLICY "Profiles são visíveis para todos autenticados" 
ON public.profiles FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Usuários podem atualizar seu próprio perfil" 
ON public.profiles FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir seu próprio perfil" 
ON public.profiles FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Políticas para video_requests (permitir todas operações para autenticados)
CREATE POLICY "Solicitações são visíveis para todos autenticados" 
ON public.video_requests FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Usuários podem criar solicitações" 
ON public.video_requests FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Capitão e tripulação podem atualizar solicitações" 
ON public.video_requests FOR UPDATE 
TO authenticated
USING (true);

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers para updated_at
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_video_requests_updated_at
BEFORE UPDATE ON public.video_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar Realtime para video_requests
ALTER TABLE public.video_requests REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_requests;

-- Inserir tripulação inicial (sem user_id por enquanto)
INSERT INTO public.profiles (name, role) VALUES 
  ('Guilherme', 'capitao'),
  ('Richard', 'tripulante'),
  ('Mah', 'tripulante'),
  ('Jade', 'tripulante');