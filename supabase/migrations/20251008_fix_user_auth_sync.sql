-- Migration: Fix User ID 1 Data Sync and Prevent Future Desync
-- Date: 2025-10-08
-- Description: Syncs user table data from auth.users for user ID 1 and creates triggers to prevent future desynchronization

-- ============================================================================
-- PART 1: Sync User ID 1 Data from auth.users to user table
-- ============================================================================

-- This updates user ID 1's avatar_url from auth.users.raw_user_meta_data
-- The avatar was uploaded but never synced to the user table, causing cascading failures
UPDATE "user"
SET
  avatar_url = (
    SELECT raw_user_meta_data->>'avatar_url'
    FROM auth.users
    WHERE id = (SELECT provider_id FROM "user" WHERE id = 1)
  ),
  name = COALESCE(
    name,
    (SELECT raw_user_meta_data->>'name' FROM auth.users WHERE id = (SELECT provider_id FROM "user" WHERE id = 1))
  ),
  username = COALESCE(
    username,
    (SELECT raw_user_meta_data->>'username' FROM auth.users WHERE id = (SELECT provider_id FROM "user" WHERE id = 1))
  ),
  updated_at = NOW()
WHERE id = 1;

-- Verify the sync worked
DO $$
DECLARE
  user_avatar TEXT;
  auth_avatar TEXT;
BEGIN
  SELECT avatar_url INTO user_avatar FROM "user" WHERE id = 1;
  SELECT raw_user_meta_data->>'avatar_url' INTO auth_avatar
  FROM auth.users
  WHERE id = (SELECT provider_id FROM "user" WHERE id = 1);

  IF user_avatar IS NOT NULL AND user_avatar != '' THEN
    RAISE NOTICE 'User ID 1 avatar sync successful: % characters', LENGTH(user_avatar);
  ELSE
    RAISE WARNING 'User ID 1 avatar sync may have failed - avatar is empty';
  END IF;
END $$;

-- ============================================================================
-- PART 2: Create Trigger Function to Auto-Sync auth.users → user table
-- ============================================================================

-- Function to sync auth.users metadata changes to user table
CREATE OR REPLACE FUNCTION public.sync_auth_user_metadata()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update user table when auth.users.raw_user_meta_data changes
  UPDATE public.user
  SET
    avatar_url = COALESCE(NEW.raw_user_meta_data->>'avatar_url', avatar_url),
    name = COALESCE(NEW.raw_user_meta_data->>'name', name),
    username = COALESCE(NEW.raw_user_meta_data->>'username', username),
    updated_at = NOW()
  WHERE provider_id = NEW.id;

  RETURN NEW;
END;
$$;

-- Drop trigger if it exists (for re-running migration)
DROP TRIGGER IF EXISTS on_auth_user_metadata_updated ON auth.users;

-- Create trigger on auth.users to sync metadata changes
CREATE TRIGGER on_auth_user_metadata_updated
  AFTER UPDATE OF raw_user_meta_data ON auth.users
  FOR EACH ROW
  WHEN (OLD.raw_user_meta_data IS DISTINCT FROM NEW.raw_user_meta_data)
  EXECUTE FUNCTION public.sync_auth_user_metadata();

-- ============================================================================
-- PART 3: Create Trigger to Sync user table → auth.users (bidirectional)
-- ============================================================================

-- Function to sync user table changes back to auth.users metadata
CREATE OR REPLACE FUNCTION public.sync_user_to_auth_metadata()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update auth.users.raw_user_meta_data when user table changes
  UPDATE auth.users
  SET
    raw_user_meta_data = jsonb_set(
      jsonb_set(
        jsonb_set(
          COALESCE(raw_user_meta_data, '{}'::jsonb),
          '{avatar_url}',
          to_jsonb(NEW.avatar_url),
          true
        ),
        '{name}',
        to_jsonb(NEW.name),
        true
      ),
      '{username}',
      to_jsonb(NEW.username),
      true
    ),
    updated_at = NOW()
  WHERE id = NEW.provider_id;

  RETURN NEW;
END;
$$;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS on_user_profile_updated ON public.user;

-- Create trigger on user table to sync changes back to auth.users
CREATE TRIGGER on_user_profile_updated
  AFTER UPDATE OF avatar_url, name, username ON public.user
  FOR EACH ROW
  WHEN (
    OLD.avatar_url IS DISTINCT FROM NEW.avatar_url OR
    OLD.name IS DISTINCT FROM NEW.name OR
    OLD.username IS DISTINCT FROM NEW.username
  )
  EXECUTE FUNCTION public.sync_user_to_auth_metadata();

-- ============================================================================
-- PART 4: Grant Necessary Permissions
-- ============================================================================

-- Grant execute permissions on sync functions
GRANT EXECUTE ON FUNCTION public.sync_auth_user_metadata() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sync_user_to_auth_metadata() TO authenticated, service_role;

-- ============================================================================
-- VERIFICATION & LOGGING
-- ============================================================================

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 20251008_fix_user_auth_sync completed successfully';
  RAISE NOTICE '   - User ID 1 data synced from auth.users';
  RAISE NOTICE '   - Bidirectional sync triggers created';
  RAISE NOTICE '   - Future desync prevented';
END $$;

-- Create a comment on the migration
COMMENT ON FUNCTION public.sync_auth_user_metadata() IS
  'Automatically syncs auth.users.raw_user_meta_data changes to user table. Created 2025-10-08 to fix user ID 1 desync issue.';

COMMENT ON FUNCTION public.sync_user_to_auth_metadata() IS
  'Automatically syncs user table profile changes back to auth.users.raw_user_meta_data. Created 2025-10-08 for bidirectional sync.';
