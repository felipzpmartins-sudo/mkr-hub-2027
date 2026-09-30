
ALTER TABLE public.solicitations
  ADD COLUMN IF NOT EXISTS missing_items_note text,
  ADD COLUMN IF NOT EXISTS missing_items_reported_at timestamptz,
  ADD COLUMN IF NOT EXISTS missing_items_reported_by text;
