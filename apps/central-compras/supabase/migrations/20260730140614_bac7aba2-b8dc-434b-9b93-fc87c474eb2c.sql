ALTER TABLE public.solicitations DROP CONSTRAINT IF EXISTS solicitations_request_type_check;
ALTER TABLE public.solicitations ADD CONSTRAINT solicitations_request_type_check
  CHECK (request_type = ANY (ARRAY['product'::text,'flight'::text,'personalized_material'::text,'accommodation'::text,'apostilas'::text,'internal_requisition'::text,'cleaning_product'::text]));