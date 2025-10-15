-- Migration: Add screenshots column to game table
-- Date: 2025-10-15
-- Purpose: Store IGDB screenshot URLs for games

-- Add screenshots column as TEXT array
ALTER TABLE game ADD COLUMN IF NOT EXISTS screenshots TEXT[];

-- Add comment for documentation
COMMENT ON COLUMN game.screenshots IS 'Array of IGDB screenshot URLs (t_screenshot_big quality)';

-- Create index for games with screenshots (useful for filtering/analytics)
CREATE INDEX IF NOT EXISTS idx_game_has_screenshots ON game((screenshots IS NOT NULL AND array_length(screenshots, 1) > 0));

-- Log migration
DO $$
BEGIN
  RAISE NOTICE 'Migration completed: Added screenshots column to game table';
  RAISE NOTICE 'Column type: TEXT[]';
  RAISE NOTICE 'Nullable: Yes';
  RAISE NOTICE 'Default: NULL';
END $$;
