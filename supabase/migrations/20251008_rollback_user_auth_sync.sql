-- Migration: Rollback User Auth Sync (Emergency Fix)
-- Date: 2025-10-08
-- Description: Rollback the broken user_auth_sync migration that caused system-wide database failures

-- ============================================================================
-- EMERGENCY ROLLBACK: Drop broken triggers and functions
-- ============================================================================

-- Drop triggers first (if they exist)
DROP TRIGGER IF EXISTS on_auth_user_metadata_updated ON auth.users;
DROP TRIGGER IF EXISTS on_user_profile_updated ON public.user;

-- Drop functions
DROP FUNCTION IF EXISTS public.sync_auth_user_metadata();
DROP FUNCTION IF EXISTS public.sync_user_to_auth_metadata();

-- Revoke permissions (in case they were granted)
REVOKE EXECUTE ON FUNCTION public.sync_auth_user_metadata() FROM authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.sync_user_to_auth_metadata() FROM authenticated, service_role;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify triggers are removed
DO $$
DECLARE
  trigger_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO trigger_count
  FROM information_schema.triggers
  WHERE trigger_name IN ('on_auth_user_metadata_updated', 'on_user_profile_updated');

  IF trigger_count = 0 THEN
    RAISE NOTICE '✅ Rollback successful - all triggers removed';
  ELSE
    RAISE WARNING '⚠️ Rollback incomplete - % triggers still exist', trigger_count;
  END IF;
END $$;

-- Log rollback
DO $$
BEGIN
  RAISE NOTICE '🔄 Migration 20251008_rollback_user_auth_sync completed';
  RAISE NOTICE '   - Removed broken triggers';
  RAISE NOTICE '   - Removed broken functions';
  RAISE NOTICE '   - System should be restored to working state';
END $$;
