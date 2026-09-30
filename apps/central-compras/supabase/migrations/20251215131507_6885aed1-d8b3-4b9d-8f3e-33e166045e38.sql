-- Drop the existing constraint and add a new one with accommodation
ALTER TABLE public.solicitations DROP CONSTRAINT IF EXISTS solicitations_request_type_check;

ALTER TABLE public.solicitations ADD CONSTRAINT solicitations_request_type_check 
CHECK (request_type IN ('product', 'flight', 'personalized_material', 'accommodation'));