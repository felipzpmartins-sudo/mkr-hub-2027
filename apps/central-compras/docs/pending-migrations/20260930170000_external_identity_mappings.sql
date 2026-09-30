-- NÃO EXECUTADA. Preparação de identidade externa (sem SSO/OIDC). Não armazena senhas/tokens.
CREATE TABLE IF NOT EXISTS public.external_identity_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_key text NOT NULL DEFAULT 'central_compras',
  provider text NOT NULL,
  issuer text NOT NULL,
  subject text NOT NULL,
  auth_user_id uuid NOT NULL REFERENCES auth.users(id),
  external_email text NULL,
  external_name text NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked')),
  linked_by uuid NULL,
  linked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT external_identity_mappings_provider_issuer_subject_key UNIQUE (provider, issuer, subject)
);
CREATE INDEX IF NOT EXISTS idx_external_identity_mappings_auth_user_id ON public.external_identity_mappings (auth_user_id);
CREATE INDEX IF NOT EXISTS idx_external_identity_mappings_system_key ON public.external_identity_mappings (system_key);

GRANT SELECT, INSERT, UPDATE ON public.external_identity_mappings TO authenticated;
GRANT ALL ON public.external_identity_mappings TO service_role;

-- Helper: somente role 'admin' (has_admin_role existente também inclui super_admin).
CREATE OR REPLACE FUNCTION public.is_identity_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin')
$$;
REVOKE EXECUTE ON FUNCTION public.is_identity_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_identity_admin(uuid) TO authenticated;

ALTER TABLE public.external_identity_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can list external identity mappings" ON public.external_identity_mappings
  FOR SELECT TO authenticated USING (public.is_identity_admin(auth.uid()));
CREATE POLICY "Admins can create external identity mappings" ON public.external_identity_mappings
  FOR INSERT TO authenticated WITH CHECK (public.is_identity_admin(auth.uid()));
CREATE POLICY "Admins can update or revoke external identity mappings" ON public.external_identity_mappings
  FOR UPDATE TO authenticated USING (public.is_identity_admin(auth.uid())) WITH CHECK (public.is_identity_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.set_external_identity_mappings_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER trg_external_identity_mappings_updated_at BEFORE UPDATE ON public.external_identity_mappings
  FOR EACH ROW EXECUTE FUNCTION public.set_external_identity_mappings_updated_at();

-- RPC para a tela admin: nome/e-mail atuais sem leitura de auth.users pelo cliente.
-- Restrita a admin (is_identity_admin); não altera políticas existentes.
CREATE OR REPLACE FUNCTION public.list_identity_users()
RETURNS TABLE (auth_user_id uuid, full_name text, email text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_identity_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT u.id, p.full_name, u.email::text
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.user_id = u.id
    ORDER BY p.full_name NULLS LAST;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.list_identity_users() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_identity_users() TO authenticated;
