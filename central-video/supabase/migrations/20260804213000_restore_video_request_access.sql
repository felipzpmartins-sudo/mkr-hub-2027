-- Restaura as políticas removidas por engano na migração anterior.
-- requester_id guarda o ID de profiles, por isso a comparação deve usar
-- current_profile_id(auth.uid()), e não auth.uid() diretamente.
ALTER TABLE public.video_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view policy" ON public.video_requests;
DROP POLICY IF EXISTS "Users insert policy" ON public.video_requests;
DROP POLICY IF EXISTS "Crew update policy" ON public.video_requests;
DROP POLICY IF EXISTS "Captain delete policy" ON public.video_requests;
DROP POLICY IF EXISTS "Crew or owner can view requests" ON public.video_requests;
DROP POLICY IF EXISTS "Authenticated can create requests" ON public.video_requests;
DROP POLICY IF EXISTS "Crew or owner can update requests" ON public.video_requests;
DROP POLICY IF EXISTS "Crew or owner can delete requests" ON public.video_requests;

CREATE POLICY "Crew or owner can view requests"
ON public.video_requests FOR SELECT TO authenticated
USING (
  public.is_crew(auth.uid())
  OR requester_id = public.current_profile_id(auth.uid())
);

CREATE POLICY "Authenticated can create requests"
ON public.video_requests FOR INSERT TO authenticated
WITH CHECK (
  title IS NOT NULL
  AND video_type IS NOT NULL
  AND requester_name IS NOT NULL
);

CREATE POLICY "Crew or owner can update requests"
ON public.video_requests FOR UPDATE TO authenticated
USING (
  public.is_crew(auth.uid())
  OR requester_id = public.current_profile_id(auth.uid())
)
WITH CHECK (
  public.is_crew(auth.uid())
  OR requester_id = public.current_profile_id(auth.uid())
);

CREATE POLICY "Crew or owner can delete requests"
ON public.video_requests FOR DELETE TO authenticated
USING (
  public.is_crew(auth.uid())
  OR requester_id = public.current_profile_id(auth.uid())
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_requests TO authenticated;
GRANT ALL ON public.video_requests TO service_role;
