-- Grant admin role to lf473418@gmail.com
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'lf473418@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;