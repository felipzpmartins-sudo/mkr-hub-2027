-- Enable realtime for solicitations table
ALTER TABLE public.solicitations REPLICA IDENTITY FULL;

-- Add solicitations to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.solicitations;