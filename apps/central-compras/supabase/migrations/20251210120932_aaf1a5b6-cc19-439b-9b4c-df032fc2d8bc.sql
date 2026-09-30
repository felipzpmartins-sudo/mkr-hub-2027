-- Add invoice number and file columns to solicitations table
ALTER TABLE public.solicitations
ADD COLUMN IF NOT EXISTS invoice_number TEXT,
ADD COLUMN IF NOT EXISTS invoice_file_path TEXT,
ADD COLUMN IF NOT EXISTS invoice_file_name TEXT;