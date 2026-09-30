ALTER TABLE public.solicitations
  ADD COLUMN IF NOT EXISTS is_direct_purchase boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS direct_purchase_supplier text,
  ADD COLUMN IF NOT EXISTS direct_purchase_value numeric,
  ADD COLUMN IF NOT EXISTS direct_purchase_date date;

CREATE INDEX IF NOT EXISTS idx_solicitations_is_direct_purchase
  ON public.solicitations (is_direct_purchase) WHERE is_direct_purchase = true;