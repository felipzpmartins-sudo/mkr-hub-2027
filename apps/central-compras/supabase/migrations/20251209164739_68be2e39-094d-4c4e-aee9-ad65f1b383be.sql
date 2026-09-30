-- Criar função segura para verificar roles (evita recursão)
CREATE OR REPLACE FUNCTION public.has_admin_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'super_admin')
  )
$$;

-- Remover política que expõe todos os perfis
DROP POLICY IF EXISTS "Authenticated users can view all profiles names" ON public.profiles;

-- Criar política para admins verem todos os perfis
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.has_admin_role(auth.uid()));

-- Remover política que expõe todos os roles
DROP POLICY IF EXISTS "Anyone can read roles" ON public.user_roles;

-- Criar política para usuários verem apenas seus próprios roles
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Admins podem ver todos os roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.has_admin_role(auth.uid()));