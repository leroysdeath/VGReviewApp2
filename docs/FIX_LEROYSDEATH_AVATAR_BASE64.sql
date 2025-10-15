-- FIX: Remove base64-encoded avatar from leroysdeath user metadata
--
-- PROBLEM: The user's JWT token is 56KB because avatar_url contains a base64-encoded PNG
-- This causes HTTP 400 errors because the Authorization header exceeds server limits
--
-- SOLUTION: Remove the base64 avatar from auth metadata
-- The database avatar_url in the public.user table will still work fine

-- Step 1: Remove the base64 avatar from auth metadata
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data - 'avatar_url'
WHERE id = '8c06387a-5ee0-413e-bd94-b8cb29610d9d';

-- Step 2: Verify the fix
SELECT
  id,
  email,
  raw_user_meta_data,
  LENGTH(raw_user_meta_data::text) as metadata_size
FROM auth.users
WHERE id = '8c06387a-5ee0-413e-bd94-b8cb29610d9d';

-- Expected result: metadata_size should be small (< 500 bytes)

-- Step 3: Check the database avatar (this is separate and will still work)
SELECT
  id,
  username,
  avatar_url,
  LENGTH(avatar_url) as avatar_url_length
FROM "user"
WHERE id = 1;

-- NOTE: After running this SQL, the user MUST:
-- 1. Sign out completely from the app
-- 2. Clear browser localStorage (or clear all site data)
-- 3. Sign back in
--
-- This will generate a new JWT token without the massive base64 image
-- and all API requests should work normally!

-- OPTIONAL: If you want to set a proper avatar URL instead of removing it
-- Uncomment the following and replace with actual image URL:
/*
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  raw_user_meta_data,
  '{avatar_url}',
  '"https://example.com/path/to/avatar.png"'::jsonb
)
WHERE id = '8c06387a-5ee0-413e-bd94-b8cb29610d9d';
*/
