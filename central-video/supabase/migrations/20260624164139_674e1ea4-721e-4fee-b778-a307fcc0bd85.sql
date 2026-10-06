CREATE OR REPLACE FUNCTION public.set_video_request_requester_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.requester_id IS NULL AND auth.uid() IS NOT NULL THEN
    NEW.requester_id := public.current_profile_id(auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_video_request_requester_id_trg ON public.video_requests;
CREATE TRIGGER set_video_request_requester_id_trg
BEFORE INSERT ON public.video_requests
FOR EACH ROW EXECUTE FUNCTION public.set_video_request_requester_id();