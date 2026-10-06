-- Add platform, format and orientation columns to video_requests table
ALTER TABLE public.video_requests 
ADD COLUMN platform text,
ADD COLUMN format text,
ADD COLUMN orientation text;