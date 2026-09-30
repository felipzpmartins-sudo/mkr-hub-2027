
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_role_check
  CHECK (role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'approver'::text, 'user'::text, 'requisition_approver'::text, 'stock'::text]));

INSERT INTO public.user_roles (user_id, role)
VALUES ('1aa040f0-3275-4a28-9aff-35a7fb811590', 'stock')
ON CONFLICT (user_id, role) DO NOTHING;

ALTER TABLE public.solicitations
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_to_type text,
  ADD COLUMN IF NOT EXISTS delivered_to_name text,
  ADD COLUMN IF NOT EXISTS returned_at timestamptz,
  ADD COLUMN IF NOT EXISTS returned_received_by text,
  ADD COLUMN IF NOT EXISTS returned_condition text,
  ADD COLUMN IF NOT EXISTS returned_notes text;

CREATE TABLE IF NOT EXISTS public.stock_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitation_id uuid NOT NULL REFERENCES public.solicitations(id) ON DELETE CASCADE,
  action text NOT NULL,
  performed_by uuid REFERENCES auth.users(id),
  performed_by_name text,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.stock_activity_log TO authenticated;
GRANT ALL ON public.stock_activity_log TO service_role;

ALTER TABLE public.stock_activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Stock and admins can view activity log" ON public.stock_activity_log;
CREATE POLICY "Stock and admins can view activity log"
  ON public.stock_activity_log FOR SELECT
  TO authenticated
  USING (
    public.user_has_role(auth.uid(), 'stock')
    OR public.has_admin_role(auth.uid())
    OR public.user_has_role(auth.uid(), 'requisition_approver')
  );

DROP POLICY IF EXISTS "Stock and admins can insert activity log" ON public.stock_activity_log;
CREATE POLICY "Stock and admins can insert activity log"
  ON public.stock_activity_log FOR INSERT
  TO authenticated
  WITH CHECK (
    public.user_has_role(auth.uid(), 'stock')
    OR public.has_admin_role(auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_stock_activity_solicitation ON public.stock_activity_log(solicitation_id);
