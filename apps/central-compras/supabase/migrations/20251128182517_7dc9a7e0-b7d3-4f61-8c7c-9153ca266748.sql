-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Create solicitations table
CREATE TABLE public.solicitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  requester_name TEXT NOT NULL,
  requester_email TEXT,
  requester_phone TEXT,
  request_type TEXT NOT NULL CHECK (request_type IN ('product', 'flight', 'custom_material')),
  general_description TEXT,
  product_name TEXT,
  product_quantity INTEGER,
  product_link TEXT,
  product_observations TEXT,
  flight_origin TEXT,
  flight_destination TEXT,
  flight_departure_date DATE,
  flight_return_date DATE,
  flight_time TEXT,
  flight_preferred_airline TEXT,
  flight_estimated_value TEXT,
  flight_search_link TEXT,
  flight_observations TEXT,
  material_type TEXT CHECK (material_type IN ('sticker', 'banner', 'folder', 'flyer', 'other')),
  material_type_other TEXT,
  material_size TEXT,
  material_quantity INTEGER,
  material_purpose TEXT,
  material_observations TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'purchasing', 'delivered')),
  admin_justification TEXT,
  estimated_arrival_date DATE,
  actual_delivery_date DATE,
  final_order_link TEXT
);

-- Create attachments table
CREATE TABLE public.attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  solicitation_id UUID NOT NULL REFERENCES public.solicitations(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  attachment_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create status_history table
CREATE TABLE public.status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  solicitation_id UUID NOT NULL REFERENCES public.solicitations(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- RLS Policies for solicitations
CREATE POLICY "Users can view their own solicitations"
  ON public.solicitations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all solicitations"
  ON public.solicitations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Users can insert their own solicitations"
  ON public.solicitations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own solicitations"
  ON public.solicitations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can update all solicitations"
  ON public.solicitations FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- RLS Policies for attachments
CREATE POLICY "Users can view attachments of their solicitations"
  ON public.attachments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.solicitations
    WHERE solicitations.id = attachments.solicitation_id
    AND solicitations.user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all attachments"
  ON public.attachments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Users can insert attachments for their solicitations"
  ON public.attachments FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.solicitations
    WHERE solicitations.id = attachments.solicitation_id
    AND solicitations.user_id = auth.uid()
  ));

-- RLS Policies for status_history
CREATE POLICY "Users can view history of their solicitations"
  ON public.status_history FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.solicitations
    WHERE solicitations.id = status_history.solicitation_id
    AND solicitations.user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all history"
  ON public.status_history FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "System can insert status history"
  ON public.status_history FOR INSERT
  WITH CHECK (true);

-- Create functions
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_solicitations_updated_at
  BEFORE UPDATE ON public.solicitations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to track status changes
CREATE OR REPLACE FUNCTION public.track_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.status_history (solicitation_id, old_status, new_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_solicitation_status_change
  AFTER UPDATE ON public.solicitations
  FOR EACH ROW
  EXECUTE FUNCTION public.track_status_change();

-- Create storage bucket for attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('solicitation-attachments', 'solicitation-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload attachments for their solicitations"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'solicitation-attachments' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can view attachments of their solicitations"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'solicitation-attachments');

CREATE POLICY "Admins can view all attachments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'solicitation-attachments' AND
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Enable realtime for solicitations
ALTER PUBLICATION supabase_realtime ADD TABLE public.solicitations;