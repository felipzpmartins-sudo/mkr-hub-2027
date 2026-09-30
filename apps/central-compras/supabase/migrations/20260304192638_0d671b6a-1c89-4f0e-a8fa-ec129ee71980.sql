CREATE OR REPLACE FUNCTION public.check_quotes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  quote_count integer;
BEGIN
  SELECT COUNT(*) INTO quote_count
  FROM public.quotes
  WHERE solicitation_id = NEW.solicitation_id;
  
  IF quote_count >= 1 THEN
    UPDATE public.solicitations
    SET approval_status = 'pending_approval'
    WHERE id = NEW.solicitation_id
      AND approval_status = 'pending_quotes';
  END IF;
  
  RETURN NEW;
END;
$function$;

UPDATE public.solicitations s
SET approval_status = 'pending_approval'
WHERE s.approval_status = 'pending_quotes'
  AND EXISTS (
    SELECT 1
    FROM public.quotes q
    WHERE q.solicitation_id = s.id
  );