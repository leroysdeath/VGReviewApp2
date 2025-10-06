-- Create storage bucket for user avatars
-- This bucket will store moderated avatar images

-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-avatars',
  'user-avatars',
  true, -- Public bucket since avatars need to be viewable
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Create RLS policies for the bucket
-- Allow authenticated users to upload their own avatars
CREATE POLICY "Users can upload own avatar"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-avatars' AND
  (storage.foldername(name))[1] = (SELECT id::text FROM "user" WHERE provider_id = auth.uid())
);

-- Allow authenticated users to update their own avatars
CREATE POLICY "Users can update own avatar"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'user-avatars' AND
  (storage.foldername(name))[1] = (SELECT id::text FROM "user" WHERE provider_id = auth.uid())
);

-- Allow authenticated users to delete their own avatars
CREATE POLICY "Users can delete own avatar"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-avatars' AND
  (storage.foldername(name))[1] = (SELECT id::text FROM "user" WHERE provider_id = auth.uid())
);

-- Allow public read access to all avatars
CREATE POLICY "Public can view avatars"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'user-avatars');

-- Add comment for documentation
COMMENT ON POLICY "Users can upload own avatar" ON storage.objects IS 'Allows authenticated users to upload avatars to their own folder';
COMMENT ON POLICY "Users can update own avatar" ON storage.objects IS 'Allows authenticated users to update their own avatar files';
COMMENT ON POLICY "Users can delete own avatar" ON storage.objects IS 'Allows authenticated users to delete their own avatar files';
COMMENT ON POLICY "Public can view avatars" ON storage.objects IS 'Allows anyone to view uploaded avatars';