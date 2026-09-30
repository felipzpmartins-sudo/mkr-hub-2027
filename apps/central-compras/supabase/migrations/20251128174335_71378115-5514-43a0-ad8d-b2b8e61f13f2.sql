-- Update trigger to automatically give admin role to Luís Felipe
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  
  -- Assign default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  -- Auto-assign admin role if user is Luís Felipe
  IF LOWER(COALESCE(NEW.raw_user_meta_data->>'full_name', '')) LIKE '%luís felipe%' OR 
     LOWER(COALESCE(NEW.raw_user_meta_data->>'full_name', '')) LIKE '%luis felipe%' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;