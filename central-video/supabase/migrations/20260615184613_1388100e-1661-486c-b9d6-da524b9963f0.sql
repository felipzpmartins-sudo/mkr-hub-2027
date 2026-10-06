
-- Helper: is the current user a crew member (capitao or tripulante)?
CREATE OR REPLACE FUNCTION public.is_crew(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id
      AND role IN ('capitao', 'tripulante')
  )
$$;

-- Helper: get profile id for the current auth user
CREATE OR REPLACE FUNCTION public.current_profile_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.is_crew(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_profile_id(uuid) TO authenticated;

-- Drop old open policies on video_requests
DROP POLICY IF EXISTS "Public can view video requests" ON public.video_requests;
DROP POLICY IF EXISTS "Public can create valid video requests" ON public.video_requests;
DROP POLICY IF EXISTS "Public can update workflow fields" ON public.video_requests;
DROP POLICY IF EXISTS "Public can delete video requests" ON public.video_requests;

-- Revoke anon access; only authenticated users from now on
REVOKE ALL ON public.video_requests FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_requests TO authenticated;
GRANT ALL ON public.video_requests TO service_role;

-- SELECT: crew sees all, client sees only their own
CREATE POLICY "Crew or owner can view requests"
ON public.video_requests FOR SELECT
TO authenticated
USING (
  public.is_crew(auth.uid())
  OR requester_id = public.current_profile_id(auth.uid())
);

-- INSERT: any authenticated user can create; trigger fills requester_id
CREATE POLICY "Authenticated can create requests"
ON public.video_requests FOR INSERT
TO authenticated
WITH CHECK (
  title IS NOT NULL
  AND video_type IS NOT NULL
  AND requester_name IS NOT NULL
);

-- UPDATE: crew can update anything; client only their own
CREATE POLICY "Crew or owner can update requests"
ON public.video_requests FOR UPDATE
TO authenticated
USING (
  public.is_crew(auth.uid())
  OR requester_id = public.current_profile_id(auth.uid())
)
WITH CHECK (
  public.is_crew(auth.uid())
  OR requester_id = public.current_profile_id(auth.uid())
);

-- DELETE: crew can delete anything; client only their own
CREATE POLICY "Crew or owner can delete requests"
ON public.video_requests FOR DELETE
TO authenticated
USING (
  public.is_crew(auth.uid())
  OR requester_id = public.current_profile_id(auth.uid())
);

-- Backfill: link the existing orphan request (requester_id NULL) to a captain so it stays visible to crew only
-- (nothing to do; crew sees it regardless via is_crew())
