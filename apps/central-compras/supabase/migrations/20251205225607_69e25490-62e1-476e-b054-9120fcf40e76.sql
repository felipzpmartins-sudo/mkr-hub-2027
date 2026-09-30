-- RLS para status_history
ALTER TABLE public.status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own status history" ON public.status_history
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.solicitations WHERE id = solicitation_id AND user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can insert status history" ON public.status_history
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);