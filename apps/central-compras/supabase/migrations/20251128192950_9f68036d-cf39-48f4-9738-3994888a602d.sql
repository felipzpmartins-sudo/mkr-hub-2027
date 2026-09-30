-- Grant admin role to LUÍS FELIPE MARTINS SOARES
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'admin'
FROM public.profiles
WHERE full_name = 'LUÍS FELIPE MARTINS SOARES'
ON CONFLICT (user_id, role) DO NOTHING;