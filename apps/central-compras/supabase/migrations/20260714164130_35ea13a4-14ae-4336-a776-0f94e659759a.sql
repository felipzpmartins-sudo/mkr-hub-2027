UPDATE auth.users
SET encrypted_password = crypt('12345678', gen_salt('bf')),
    raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"must_reset_password": true}'::jsonb,
    updated_at = now()
WHERE lower(email) = 'assistentecomercialmaker@gmail.com';