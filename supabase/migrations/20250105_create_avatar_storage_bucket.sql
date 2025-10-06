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