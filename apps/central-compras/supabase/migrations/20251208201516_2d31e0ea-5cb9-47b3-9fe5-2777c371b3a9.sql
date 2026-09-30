-- Add selected_quote_id column to approvals table
ALTER TABLE public.approvals 
ADD COLUMN selected_quote_id uuid REFERENCES public.quotes(id) ON DELETE SET NULL;