-- =====================================================
-- Add Release Status to Game Table
-- =====================================================
-- Date: 2025-10-03
-- Purpose: Add release_status field to track whether a game has been released
--
-- Background:
-- IGDB tracks release status through release_dates.status codes:
-- - 0 = Released
-- - 1 = Alpha (in development)
-- - 2 = Beta (in development)
-- - 3 = Early Access (playable, in development)
-- - 4 = Offline (was available, now offline)
-- - 5 = Cancelled
-- - 6 = Rumored
-- - 7 = Delisted
--
-- This field enables:
-- - Filtering released vs unreleased games
-- - Deprioritizing rumored/cancelled games in search
-- - Better game discovery and sorting
--
-- Values:
-- - 'released': Game has been released or is in active development (status 0,1,2,3)
-- - 'unreleased': Game is only cancelled/rumored/offline (status 4,5,6,7)
-- - NULL: Unknown (no release_dates data from IGDB)
-- =====================================================

BEGIN;

-- Add release_status column to game table
ALTER TABLE game
ADD COLUMN IF NOT EXISTS release_status TEXT;

-- Add comment explaining the field
COMMENT ON COLUMN game.release_status IS
'Release status from IGDB: "released" (available or in development), "unreleased" (cancelled/rumored), NULL (unknown). Used for filtering and prioritization.';

-- Create index for filtering by release status
CREATE INDEX IF NOT EXISTS idx_game_release_status
ON game(release_status)
WHERE release_status IS NOT NULL;

-- Verify the column was added
DO $$
DECLARE
  column_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'game'
    AND column_name = 'release_status'
  ) INTO column_exists;

  IF column_exists THEN
    RAISE NOTICE '✅ release_status column added to game table';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Column Details:';
    RAISE NOTICE '   - Type: TEXT';
    RAISE NOTICE '   - Values: "released", "unreleased", NULL';
    RAISE NOTICE '   - Indexed: Yes (for fast filtering)';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 Use Cases:';
    RAISE NOTICE '   - Filter out cancelled/rumored games';
    RAISE NOTICE '   - Prioritize released games in search';
    RAISE NOTICE '   - Support future release status filters';
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '   1. Update sync script to populate release_status';
    RAISE NOTICE '   2. Backfill existing games with IGDB data';
    RAISE NOTICE '   3. Add release_status to IGDB service transformations';
  ELSE
    RAISE WARNING '⚠️  Failed to add release_status column';
  END IF;
END $$;

COMMIT;

-- =====================================================
-- Migration Complete
-- =====================================================
-- ✅ release_status column added to game table
-- ✅ Index created for efficient filtering
-- ⏳ Next: Update sync script and IGDB services
-- =====================================================
