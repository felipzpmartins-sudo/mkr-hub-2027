-- Permitir que aprovadores (incluindo veto approvers) registrem entradas no histórico
-- para que reprovações fiquem auditadas com quem, quando e motivo.
CREATE POLICY "Approvers can insert status history"
ON public.status_history
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.approvers
    WHERE approvers.email = (auth.jwt() ->> 'email')
  )
  OR public.is_veto_approver(auth.uid())
);

-- Permitir que aprovadores visualizem o histórico das solicitações que podem analisar
CREATE POLICY "Approvers can view status history"
ON public.status_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.approvers
    WHERE approvers.email = (auth.jwt() ->> 'email')
  )
  OR public.is_veto_approver(auth.uid())
);