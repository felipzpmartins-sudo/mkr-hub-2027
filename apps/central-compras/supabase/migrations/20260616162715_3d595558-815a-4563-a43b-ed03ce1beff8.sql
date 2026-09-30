ALTER TABLE public.solicitations DROP CONSTRAINT IF EXISTS solicitations_request_type_check;
ALTER TABLE public.solicitations ADD CONSTRAINT solicitations_request_type_check
  CHECK (request_type = ANY (ARRAY['product'::text,'flight'::text,'personalized_material'::text,'accommodation'::text,'apostilas'::text,'internal_requisition'::text]));

ALTER TABLE public.solicitations
  ADD COLUMN IF NOT EXISTS requisition_date date,
  ADD COLUMN IF NOT EXISTS return_deadline date,
  ADD COLUMN IF NOT EXISTS usage_purpose text,
  ADD COLUMN IF NOT EXISTS requesting_sector text,
  ADD COLUMN IF NOT EXISTS responsibility_accepted boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS requester_signature_name text,
  ADD COLUMN IF NOT EXISTS requester_signature_data text,
  ADD COLUMN IF NOT EXISTS manager_signature_name text,
  ADD COLUMN IF NOT EXISTS manager_signature_data text,
  ADD COLUMN IF NOT EXISTS returned_at timestamptz,
  ADD COLUMN IF NOT EXISTS return_overdue_notified_at timestamptz;