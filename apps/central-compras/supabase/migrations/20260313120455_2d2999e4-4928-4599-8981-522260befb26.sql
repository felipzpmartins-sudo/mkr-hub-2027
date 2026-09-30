
-- Add items_list JSONB column to solicitations for multi-item requests
ALTER TABLE public.solicitations ADD COLUMN IF NOT EXISTS items_list jsonb DEFAULT NULL;

-- Update request_type constraint to include 'apostilas'
-- First drop existing constraint if any, then add new one
DO $$
BEGIN
  -- Try to drop existing constraint
  BEGIN
    ALTER TABLE public.solicitations DROP CONSTRAINT IF EXISTS solicitations_request_type_check;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  -- Add updated constraint
  ALTER TABLE public.solicitations ADD CONSTRAINT solicitations_request_type_check 
    CHECK (request_type IN ('product', 'flight', 'personalized_material', 'accommodation', 'apostilas'));
END $$;
