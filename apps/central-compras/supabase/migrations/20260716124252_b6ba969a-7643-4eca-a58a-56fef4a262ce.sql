CREATE OR REPLACE FUNCTION public.update_approval_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  approval_count integer;
  rejection_count integer;
  req_type text;
BEGIN
  SELECT COUNT(*) INTO approval_count FROM public.approvals
   WHERE solicitation_id = NEW.solicitation_id AND status = 'approved';
  SELECT COUNT(*) INTO rejection_count FROM public.approvals
   WHERE solicitation_id = NEW.solicitation_id AND status = 'rejected';
  SELECT request_type INTO req_type FROM public.solicitations WHERE id = NEW.solicitation_id;

  UPDATE public.solicitations
  SET
    approved_count = approval_count,
    approval_status = CASE
      WHEN rejection_count > 0 THEN 'rejected'
      WHEN req_type = 'internal_requisition' AND approval_count >= 1 THEN 'approved_released'
      WHEN approval_count >= 2 THEN 'approved_released'
      WHEN approval_count = 1 THEN 'approved_partial'
      ELSE 'pending_approval'
    END,
    released_at = CASE
      WHEN (req_type = 'internal_requisition' AND approval_count >= 1)
        OR approval_count >= 2 THEN COALESCE(released_at, now())
      ELSE released_at
    END,
    stock_status = CASE
      WHEN req_type = 'internal_requisition'
        AND approval_count >= 1
        AND stock_status IS NULL
      THEN 'pending_pickup'
      ELSE stock_status
    END
  WHERE id = NEW.solicitation_id;

  RETURN NEW;
END;
$function$;

-- Backfill existing internal requisitions that already have 1 approval
UPDATE public.solicitations s
SET
  approval_status = 'approved_released',
  released_at = COALESCE(s.released_at, now()),
  stock_status = COALESCE(s.stock_status, 'pending_pickup')
WHERE s.request_type = 'internal_requisition'
  AND s.approval_status IN ('approved_partial', 'pending_approval')
  AND (SELECT COUNT(*) FROM public.approvals a WHERE a.solicitation_id = s.id AND a.status = 'approved') >= 1
  AND NOT EXISTS (SELECT 1 FROM public.approvals a WHERE a.solicitation_id = s.id AND a.status = 'rejected');