
ALTER TABLE public.solicitations
  ADD COLUMN IF NOT EXISTS stock_status text,
  ADD COLUMN IF NOT EXISTS picked_up_by text,
  ADD COLUMN IF NOT EXISTS picked_up_at timestamptz,
  ADD COLUMN IF NOT EXISTS allocation_location text,
  ADD COLUMN IF NOT EXISTS allocation_location_other text,
  ADD COLUMN IF NOT EXISTS approver_observation text;

CREATE OR REPLACE FUNCTION public.user_has_role(_user_id uuid, _role text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

DROP POLICY IF EXISTS "Requisition approvers can view internal requisitions" ON public.solicitations;
CREATE POLICY "Requisition approvers can view internal requisitions"
ON public.solicitations FOR SELECT TO authenticated
USING (request_type = 'internal_requisition' AND public.user_has_role(auth.uid(), 'requisition_approver'));

DROP POLICY IF EXISTS "Requisition approvers can update internal requisitions" ON public.solicitations;
CREATE POLICY "Requisition approvers can update internal requisitions"
ON public.solicitations FOR UPDATE TO authenticated
USING (request_type = 'internal_requisition' AND public.user_has_role(auth.uid(), 'requisition_approver'))
WITH CHECK (request_type = 'internal_requisition' AND public.user_has_role(auth.uid(), 'requisition_approver'));

DROP POLICY IF EXISTS "Stock users can view approved internal requisitions" ON public.solicitations;
CREATE POLICY "Stock users can view approved internal requisitions"
ON public.solicitations FOR SELECT TO authenticated
USING (request_type = 'internal_requisition' AND public.user_has_role(auth.uid(), 'stock')
       AND approval_status IN ('approved_released','approved_partial','delivered'));

DROP POLICY IF EXISTS "Stock users can update approved internal requisitions" ON public.solicitations;
CREATE POLICY "Stock users can update approved internal requisitions"
ON public.solicitations FOR UPDATE TO authenticated
USING (request_type = 'internal_requisition' AND public.user_has_role(auth.uid(), 'stock')
       AND approval_status IN ('approved_released','approved_partial'))
WITH CHECK (request_type = 'internal_requisition' AND public.user_has_role(auth.uid(), 'stock'));

DROP POLICY IF EXISTS "Requisition approvers can insert approvals" ON public.approvals;
CREATE POLICY "Requisition approvers can insert approvals"
ON public.approvals FOR INSERT TO authenticated
WITH CHECK (
  public.user_has_role(auth.uid(), 'requisition_approver')
  AND approver_id = auth.uid()
  AND EXISTS (SELECT 1 FROM public.solicitations s WHERE s.id = solicitation_id AND s.request_type = 'internal_requisition')
);

DROP POLICY IF EXISTS "Requisition approvers can view approvals" ON public.approvals;
CREATE POLICY "Requisition approvers can view approvals"
ON public.approvals FOR SELECT TO authenticated
USING (
  public.user_has_role(auth.uid(), 'requisition_approver')
  AND EXISTS (SELECT 1 FROM public.solicitations s WHERE s.id = solicitation_id AND s.request_type = 'internal_requisition')
);

DROP POLICY IF EXISTS "Requisition approvers and stock can view profiles" ON public.profiles;
CREATE POLICY "Requisition approvers and stock can view profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.user_has_role(auth.uid(), 'requisition_approver') OR public.user_has_role(auth.uid(), 'stock'));

CREATE OR REPLACE FUNCTION public.update_approval_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE
  approval_count integer;
  rejection_count integer;
  req_type text;
  is_req_approver boolean;
BEGIN
  SELECT COUNT(*) INTO approval_count FROM public.approvals
   WHERE solicitation_id = NEW.solicitation_id AND status = 'approved';
  SELECT COUNT(*) INTO rejection_count FROM public.approvals
   WHERE solicitation_id = NEW.solicitation_id AND status = 'rejected';
  SELECT request_type INTO req_type FROM public.solicitations WHERE id = NEW.solicitation_id;

  is_req_approver := public.user_has_role(NEW.approver_id, 'requisition_approver');

  UPDATE public.solicitations
  SET
    approved_count = approval_count,
    approval_status = CASE
      WHEN rejection_count > 0 THEN 'rejected'
      WHEN req_type = 'internal_requisition' AND is_req_approver AND approval_count >= 1 THEN 'approved_released'
      WHEN approval_count >= 2 THEN 'approved_released'
      WHEN approval_count = 1 THEN 'approved_partial'
      ELSE 'pending_approval'
    END,
    released_at = CASE
      WHEN (req_type = 'internal_requisition' AND is_req_approver AND approval_count >= 1)
        OR approval_count >= 2 THEN now()
      ELSE released_at
    END,
    stock_status = CASE
      WHEN req_type = 'internal_requisition'
        AND ((is_req_approver AND approval_count >= 1) OR approval_count >= 2)
        AND stock_status IS NULL
      THEN 'pending_pickup'
      ELSE stock_status
    END
  WHERE id = NEW.solicitation_id;

  RETURN NEW;
END;
$function$;
