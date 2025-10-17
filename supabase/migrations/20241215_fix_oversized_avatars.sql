-- Migration: Fix oversized Base64 avatars breaking authentication
-- Date: 2024-12-15
-- Issue: Large Base64-encoded avatars (some over 3MB) stored in database
--        are breaking JWT tokens and preventing user login

-- Step 1: Identify affected users
CREATE TEMP TABLE affected_users AS
SELECT
    provider_id,
    name,
    email,
    LENGTH(avatar_url) as avatar_size
FROM "user"
WHERE avatar_url LIKE 'data:image%'
AND LENGTH(avatar_url) > 50000;

-- Log affected users for reference
DO $$
BEGIN
    RAISE NOTICE 'Found % users with oversized avatars', (SELECT COUNT(*) FROM affected_users);
    RAISE NOTICE 'Largest avatar: % bytes', (SELECT MAX(avatar_size) FROM affected_users);
END $$;

-- Step 2: Clear oversized Base64 avatars
-- These will need to be re-uploaded using the new storage system
UPDATE "user"
SET
    avatar_url = NULL,
    updated_at = NOW()
WHERE avatar_url LIKE 'data:image%'
AND LENGTH(avatar_url) > 50000;

-- Step 3: Add constraint comment for future reference
COMMENT ON COLUMN "user".avatar_url IS
'URL to user avatar image. Should be an external URL (Supabase Storage or CDN), not Base64 data. Max recommended length: 500 characters for URL paths.';

-- Step 4: Create notification records for affected users (optional)
-- Uncomment if you have a notification system
/*
INSERT INTO notification (user_id, type, message, created_at)
SELECT
    u.id,
    'system',
    'Your profile picture was removed due to a technical issue. Please re-upload your avatar in Settings.',
    NOW()
FROM "user" u
INNER JOIN affected_users au ON u.provider_id = au.provider_id;
*/

-- Step 5: Log migration completion
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO updated_count FROM affected_users;
    RAISE NOTICE 'Migration complete. Cleared % oversized avatars.', updated_count;

    -- Optional: Insert into migration log table if you have one
    -- INSERT INTO migration_log (name, affected_records, executed_at)
    -- VALUES ('fix_oversized_avatars', updated_count, NOW());
END $$;

-- Cleanup
DROP TABLE IF EXISTS affected_users;

-- Future prevention: Consider adding a check constraint
-- Note: This would prevent ANY Base64 data, so only add after full migration
-- ALTER TABLE "user"
-- ADD CONSTRAINT avatar_url_not_base64
-- CHECK (avatar_url IS NULL OR avatar_url NOT LIKE 'data:image%');