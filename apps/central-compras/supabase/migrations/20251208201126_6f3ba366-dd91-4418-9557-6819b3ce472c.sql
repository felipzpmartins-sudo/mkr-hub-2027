-- Allow admins to delete solicitations
CREATE POLICY "Admins can delete solicitations" 
ON public.solicitations 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_roles.user_id = auth.uid() 
  AND user_roles.role IN ('admin', 'super_admin')
));

-- Allow users to update their own solicitations (for editing)
CREATE POLICY "Users can update own solicitations" 
ON public.solicitations 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Allow admins to delete quotes when deleting solicitation
CREATE POLICY "Admins can delete quotes" 
ON public.quotes 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_roles.user_id = auth.uid() 
  AND user_roles.role IN ('admin', 'super_admin')
));

-- Allow admins to delete attachments when deleting solicitation
CREATE POLICY "Admins can delete attachments" 
ON public.attachments 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_roles.user_id = auth.uid() 
  AND user_roles.role IN ('admin', 'super_admin')
));