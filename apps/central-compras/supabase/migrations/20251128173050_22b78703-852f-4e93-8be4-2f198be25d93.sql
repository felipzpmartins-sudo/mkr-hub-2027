-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('user', 'admin');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Security definer function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  
  -- Assign default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Only admins can manage roles"
  ON public.user_roles
  FOR ALL
  USING (public.is_admin(auth.uid()));

-- Add user_id column to solicitations table
ALTER TABLE public.solicitations ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update existing RLS policies for solicitations
DROP POLICY IF EXISTS "Permitir leitura de solicitações" ON public.solicitations;
DROP POLICY IF EXISTS "Permitir inserção de solicitações" ON public.solicitations;
DROP POLICY IF EXISTS "Permitir atualização de solicitações" ON public.solicitations;
DROP POLICY IF EXISTS "Permitir exclusão de solicitações" ON public.solicitations;

CREATE POLICY "Users can view their own solicitations"
  ON public.solicitations
  FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Users can create their own solicitations"
  ON public.solicitations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own solicitations"
  ON public.solicitations
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can update any solicitation"
  ON public.solicitations
  FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete solicitations"
  ON public.solicitations
  FOR DELETE
  USING (public.is_admin(auth.uid()));

-- Update RLS policies for attachments
DROP POLICY IF EXISTS "Permitir leitura de anexos" ON public.attachments;
DROP POLICY IF EXISTS "Permitir inserção de anexos" ON public.attachments;
DROP POLICY IF EXISTS "Permitir atualização de anexos" ON public.attachments;
DROP POLICY IF EXISTS "Permitir exclusão de anexos" ON public.attachments;

CREATE POLICY "Users can view attachments of their solicitations"
  ON public.attachments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.solicitations
      WHERE solicitations.id = attachments.solicitation_id
        AND (solicitations.user_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

CREATE POLICY "Users can create attachments for their solicitations"
  ON public.attachments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.solicitations
      WHERE solicitations.id = attachments.solicitation_id
        AND solicitations.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all attachments"
  ON public.attachments
  FOR ALL
  USING (public.is_admin(auth.uid()));

-- Update RLS policies for status_history
DROP POLICY IF EXISTS "Permitir leitura de histórico" ON public.status_history;
DROP POLICY IF EXISTS "Permitir inserção de histórico" ON public.status_history;

CREATE POLICY "Users can view history of their solicitations"
  ON public.status_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.solicitations
      WHERE solicitations.id = status_history.solicitation_id
        AND (solicitations.user_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

CREATE POLICY "System can insert status history"
  ON public.status_history
  FOR INSERT
  WITH CHECK (true);

-- Add trigger to profiles for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();