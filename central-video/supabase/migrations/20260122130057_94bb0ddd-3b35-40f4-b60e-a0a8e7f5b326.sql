-- Allow Captain and Admin to delete video requests
CREATE POLICY "Captain and admin can delete requests" 
ON public.video_requests 
FOR DELETE 
USING (has_role(auth.uid(), 'capitao'::app_role) OR has_role(auth.uid(), 'admin'::app_role));