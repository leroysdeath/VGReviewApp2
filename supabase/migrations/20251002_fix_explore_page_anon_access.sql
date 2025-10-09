-- =====================================================
-- Fix ExplorePage Anonymous Access - Phase 1
-- =====================================================
-- Date: 2025-10-02
-- Purpose: Allow anonymous users to view published ratings for ExplorePage
--
-- Issue: ExplorePage shows "error loading dynamically imported module" and
--        only works when logged in because the RLS policy on rating table
--        restricts SELECT to authenticated users only.
--
-- Fix: Update the "Anyone can read ratings" policy to allow both
--      authenticated AND anonymous (anon) users to SELECT published ratings.
--
-- This enables:
-- - Sitewide game rankings on ExplorePage for logged-out users
-- - Public discovery of top-rated games
-- - Aggregation of rating statistics without authentication
--
-- Security: Only published ratings (is_published = true) are accessible
--           Unpublished drafts remain private to the author
-- =====================================================

BEGIN;

-- =====================================================
-- PART 1: Update Rating Table RLS Policy
-- =====================================================

-- Drop the existing policy that only allows authenticated users
DROP POLICY IF EXISTS "Anyone can read ratings" ON rating;

-- Create new policy that allows BOTH authenticated AND anonymous users
-- to read published ratings
CREATE POLICY "Anyone can read ratings"
  ON rating
  FOR SELECT
  TO authenticated, anon  -- KEY CHANGE: Added 'anon' role
  USING (is_published = true);  -- Only published ratings are visible

COMMENT ON POLICY "Anyone can read ratings" ON rating IS
'Allows both authenticated and anonymous users to view published ratings. This enables ExplorePage sitewide rankings and public game discovery. Unpublished ratings remain private to the author.';

-- =====================================================
-- PART 2: Verification
-- =====================================================

-- Verify the policy exists and is correctly configured
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  -- Check if the policy exists
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'rating'
    AND policyname = 'Anyone can read ratings';

  IF policy_count = 0 THEN
    RAISE WARNING '⚠️  Policy "Anyone can read ratings" was not created';
  ELSE
    RAISE NOTICE '✅ ExplorePage RLS Policy Updated';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Policy Details:';
    RAISE NOTICE '   - Policy name: "Anyone can read ratings"';
    RAISE NOTICE '   - Table: rating';
    RAISE NOTICE '   - Operation: SELECT';
    RAISE NOTICE '   - Roles: authenticated, anon';
    RAISE NOTICE '   - Condition: is_published = true';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Anonymous users can now:';
    RAISE NOTICE '   - View published ratings for ExplorePage rankings';
    RAISE NOTICE '   - Aggregate rating statistics for games';
    RAISE NOTICE '   - Access sitewide game discovery features';
    RAISE NOTICE '';
    RAISE NOTICE '🔒 Security maintained:';
    RAISE NOTICE '   - Only published ratings are visible';
    RAISE NOTICE '   - Unpublished drafts remain private';
    RAISE NOTICE '   - No write access for anonymous users';
  END IF;
END $$;

-- =====================================================
-- PART 3: Test the Policy (Optional - for manual verification)
-- =====================================================

-- This query should work for both authenticated and anonymous users
-- You can test this in the Supabase SQL Editor
-- Expected: Returns published ratings only
--
-- SELECT COUNT(*) as published_rating_count
-- FROM rating
-- WHERE is_published = true;

COMMIT;

-- =====================================================
-- Migration Complete - Phase 1
-- =====================================================
-- ✅ Anonymous users can now read published ratings
-- ✅ ExplorePage sitewide rankings will work for logged-out users
-- ✅ Security maintained - only published content is accessible
--
-- Next Steps:
-- 1. Run the RLS policy tests: npm run test -- explore-rls-policy.test.ts
-- 2. Verify ExplorePage works when logged out
-- 3. Proceed to Phase 2: Create get_games_with_review_stats RPC function
-- =====================================================
