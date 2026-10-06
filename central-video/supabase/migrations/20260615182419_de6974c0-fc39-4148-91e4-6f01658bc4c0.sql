DROP POLICY IF EXISTS "Authenticated users can upload materials" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to video-materials" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete from video-materials" ON storage.objects;
DROP POLICY IF EXISTS "Crew can delete materials" ON storage.objects;

CREATE POLICY "Public can upload video materials"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'video-materials');

CREATE POLICY "Public can remove video materials"
ON storage.objects
FOR DELETE
TO anon, authenticated
USING (bucket_id = 'video-materials');