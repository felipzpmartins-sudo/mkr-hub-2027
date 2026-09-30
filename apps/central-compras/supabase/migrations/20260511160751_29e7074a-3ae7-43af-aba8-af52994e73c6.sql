ALTER TABLE public.solicitations
ADD COLUMN IF NOT EXISTS is_urgent boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS urgency_justification text;

CREATE INDEX IF NOT EXISTS idx_solicitations_is_urgent ON public.solicitations(is_urgent) WHERE is_urgent = true;