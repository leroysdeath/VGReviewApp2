-- Storage bucket configuration for user avatars
-- Note: The 'user-uploads' bucket already exists and will be used for avatars

-- Ensure the existing user-uploads bucket has correct settings
UPDATE storage.buckets
SET
  file_size_limit = 5242880, -- 5MB limit
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']::text[]
WHERE id = 'user-uploads';

-- Note: Storage RLS policies must be configured via Supabase Dashboard
-- or using Supabase Management API, not via SQL migrations.
--
-- Recommended bucket settings:
-- 1. Enable RLS on the bucket
-- 2. Public access for viewing (since avatars need to be viewable)
-- 3. Authenticated users can upload/update/delete files in their own user ID folder
--
-- Example RLS policies to configure in Supabase Dashboard:
-- INSERT policy: (storage.foldername(name))[1] = (SELECT id::text FROM "user" WHERE provider_id = auth.uid())
-- UPDATE policy: (storage.foldername(name))[1] = (SELECT id::text FROM "user" WHERE provider_id = auth.uid())
-- DELETE policy: (storage.foldername(name))[1] = (SELECT id::text FROM "user" WHERE provider_id = auth.uid())
-- SELECT policy: true (public read access)