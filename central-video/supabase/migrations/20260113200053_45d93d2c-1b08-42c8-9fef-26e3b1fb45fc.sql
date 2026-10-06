-- Add deadline column to video_requests table
ALTER TABLE public.video_requests 
ADD COLUMN deadline DATE;