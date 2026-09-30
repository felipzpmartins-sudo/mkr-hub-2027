-- Add accommodation (hospedagem) fields to solicitations table
ALTER TABLE public.solicitations
ADD COLUMN IF NOT EXISTS accommodation_requester_cpf TEXT,
ADD COLUMN IF NOT EXISTS accommodation_requester_birth_date DATE,
ADD COLUMN IF NOT EXISTS accommodation_destination_city TEXT,
ADD COLUMN IF NOT EXISTS accommodation_destination_state TEXT,
ADD COLUMN IF NOT EXISTS accommodation_guests_count INTEGER,
ADD COLUMN IF NOT EXISTS accommodation_guests_data JSONB,
ADD COLUMN IF NOT EXISTS accommodation_check_in DATE,
ADD COLUMN IF NOT EXISTS accommodation_check_out DATE,
ADD COLUMN IF NOT EXISTS accommodation_travel_reason TEXT,
ADD COLUMN IF NOT EXISTS accommodation_event_address TEXT,
ADD COLUMN IF NOT EXISTS accommodation_selected_hotel TEXT,
ADD COLUMN IF NOT EXISTS accommodation_hotel_address TEXT,
ADD COLUMN IF NOT EXISTS accommodation_hotel_contact TEXT,
ADD COLUMN IF NOT EXISTS accommodation_admin_observation TEXT;