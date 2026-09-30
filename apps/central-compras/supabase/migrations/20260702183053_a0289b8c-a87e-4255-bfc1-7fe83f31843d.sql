
CREATE TABLE public.approver_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  solicitation_id UUID NOT NULL REFERENCES public.solicitations(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT,
  answered_by UUID REFERENCES auth.users(id),
  answered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_approver_questions_solicitation ON public.approver_questions(solicitation_id);
CREATE INDEX idx_approver_questions_pending ON public.approver_questions(solicitation_id) WHERE answer IS NULL;

GRANT SELECT, INSERT, UPDATE ON public.approver_questions TO authenticated;
GRANT ALL ON public.approver_questions TO service_role;

ALTER TABLE public.approver_questions ENABLE ROW LEVEL SECURITY;

-- Aprovador pode criar sua pergunta
CREATE POLICY "Approvers can create their questions"
ON public.approver_questions FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = approver_id
  AND EXISTS (SELECT 1 FROM public.approvers a JOIN auth.users u ON u.email = a.email WHERE u.id = auth.uid())
);

-- Aprovadores veem todas as perguntas das solicitações que analisam; admins veem tudo; solicitante vê as suas
CREATE POLICY "View questions"
ON public.approver_questions FOR SELECT
TO authenticated
USING (
  auth.uid() = approver_id
  OR public.has_admin_role(auth.uid())
  OR EXISTS (SELECT 1 FROM public.approvers a JOIN auth.users u ON u.email = a.email WHERE u.id = auth.uid())
);

-- Admins podem responder (update); aprovador pode editar sua própria pergunta antes de ser respondida
CREATE POLICY "Admins can answer questions"
ON public.approver_questions FOR UPDATE
TO authenticated
USING (public.has_admin_role(auth.uid()))
WITH CHECK (public.has_admin_role(auth.uid()));

CREATE POLICY "Approvers can edit unanswered questions"
ON public.approver_questions FOR UPDATE
TO authenticated
USING (auth.uid() = approver_id AND answer IS NULL)
WITH CHECK (auth.uid() = approver_id);
