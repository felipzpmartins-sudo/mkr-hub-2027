
CREATE TABLE public.solicitation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitation_id uuid NOT NULL REFERENCES public.solicitations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  channel text NOT NULL CHECK (channel IN ('user','internal')),
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX solicitation_messages_sol_idx ON public.solicitation_messages(solicitation_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.solicitation_messages TO authenticated;
GRANT ALL ON public.solicitation_messages TO service_role;

ALTER TABLE public.solicitation_messages ENABLE ROW LEVEL SECURITY;

-- Helper: is user an approver-type (approver, requisition_approver, or in approvers table) or admin
-- Reuse existing helpers inline in policies.

-- SELECT
CREATE POLICY "View messages"
ON public.solicitation_messages
FOR SELECT
TO authenticated
USING (
  CASE channel
    WHEN 'user' THEN (
      has_admin_role(auth.uid())
      OR user_has_role(auth.uid(), 'approver')
      OR user_has_role(auth.uid(), 'requisition_approver')
      OR EXISTS (SELECT 1 FROM public.approvers a WHERE lower(a.email) = lower((auth.jwt() ->> 'email')))
      OR EXISTS (SELECT 1 FROM public.solicitations s WHERE s.id = solicitation_id AND s.user_id = auth.uid())
    )
    WHEN 'internal' THEN (
      has_admin_role(auth.uid())
      OR user_has_role(auth.uid(), 'approver')
      OR user_has_role(auth.uid(), 'requisition_approver')
      OR EXISTS (SELECT 1 FROM public.approvers a WHERE lower(a.email) = lower((auth.jwt() ->> 'email')))
    )
    ELSE false
  END
);

-- INSERT: sender must be self; requester can only post on 'user' channel; approvers/admins on both
CREATE POLICY "Send messages"
ON public.solicitation_messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND (
    (channel = 'user' AND (
      has_admin_role(auth.uid())
      OR user_has_role(auth.uid(), 'approver')
      OR user_has_role(auth.uid(), 'requisition_approver')
      OR EXISTS (SELECT 1 FROM public.approvers a WHERE lower(a.email) = lower((auth.jwt() ->> 'email')))
      OR EXISTS (SELECT 1 FROM public.solicitations s WHERE s.id = solicitation_id AND s.user_id = auth.uid())
    ))
    OR
    (channel = 'internal' AND (
      has_admin_role(auth.uid())
      OR user_has_role(auth.uid(), 'approver')
      OR user_has_role(auth.uid(), 'requisition_approver')
      OR EXISTS (SELECT 1 FROM public.approvers a WHERE lower(a.email) = lower((auth.jwt() ->> 'email')))
    ))
  )
);

-- DELETE: sender or admin
CREATE POLICY "Delete own messages"
ON public.solicitation_messages
FOR DELETE
TO authenticated
USING (sender_id = auth.uid() OR has_admin_role(auth.uid()));
