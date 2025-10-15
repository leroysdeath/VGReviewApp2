-- =====================================================
-- FIX LEROYSDEATH AVATAR URL
-- Replace corrupted 41KB avatar_url with temporary placeholder
-- =====================================================

-- First, let's see what's currently there (first 200 chars only)
SELECT
  username,
  LEFT(avatar_url, 200) as avatar_preview,
  LENGTH(avatar_url) as avatar_length
FROM "user"
WHERE username = 'leroysdeath';

-- Option 1: Set to NULL (will use default avatar in UI)
UPDATE "user"
SET avatar_url = NULL
WHERE username = 'leroysdeath';

-- Option 2: Set to a default avatar image URL (uncomment to use this instead)
-- UPDATE "user"
-- SET avatar_url = 'https://api.dicebear.com/7.x/avataaars/svg?seed=leroysdeath'
-- WHERE username = 'leroysdeath';

-- Option 3: Use a generic gaming avatar (uncomment to use this instead)
-- UPDATE "user"
-- SET avatar_url = 'https://ui-avatars.com/api/?name=leroysdeath&background=4F46E5&color=fff&size=200'
-- WHERE username = 'leroysdeath';

-- Verify the fix
SELECT
  username,
  avatar_url,
  LENGTH(avatar_url) as new_length,
  updated_at
FROM "user"
WHERE username = 'leroysdeath';
