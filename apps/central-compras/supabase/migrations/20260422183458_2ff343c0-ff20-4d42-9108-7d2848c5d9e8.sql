CREATE OR REPLACE FUNCTION public.get_approver_display_name(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT a.name
      FROM public.approvers a
      JOIN auth.users u ON u.email = a.email
      WHERE u.id = _user_id
      LIMIT 1
    ),
    (
      SELECT p.full_name
      FROM public.profiles p
      WHERE p.user_id = _user_id
      LIMIT 1
    ),
    'Aprovador'
  );
$$;