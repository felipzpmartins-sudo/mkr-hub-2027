-- Create profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create user_roles table
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'moderator', 'user')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (user_id, role)
);

-- Create solicitations table
CREATE TABLE solicitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  requester_name TEXT NOT NULL,
  requester_email TEXT,
  requester_phone TEXT NOT NULL,
  request_type TEXT NOT NULL CHECK (request_type IN ('product', 'flight', 'personalized_material')),
  general_description TEXT,
  status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'purchasing', 'delivered')),
  admin_justification TEXT,
  estimated_arrival_date DATE,
  actual_delivery_date DATE,
  final_order_link TEXT,
  product_name TEXT,
  product_quantity INTEGER,
  product_link TEXT,
  product_photo_or_print TEXT,
  flight_origin TEXT,
  flight_destination TEXT,
  flight_departure_date DATE,
  flight_return_date DATE,
  flight_preferred_airline TEXT,
  flight_estimated_value DECIMAL(10,2),
  flight_proof_attachment TEXT,
  material_type TEXT,
  material_dimensions TEXT,
  material_quantity INTEGER,
  material_purpose TEXT,
  material_art_files TEXT,
  material_visual_references TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create attachments table
CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitation_id UUID REFERENCES solicitations(id) ON DELETE CASCADE NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create status_history table
CREATE TABLE status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitation_id UUID REFERENCES solicitations(id) ON DELETE CASCADE NOT NULL,
  old_status TEXT CHECK (old_status IN ('pending', 'approved', 'rejected', 'purchasing', 'delivered')),
  new_status TEXT NOT NULL CHECK (new_status IN ('pending', 'approved', 'rejected', 'purchasing', 'delivered')),
  changed_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  justification TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_history ENABLE ROW LEVEL SECURITY;