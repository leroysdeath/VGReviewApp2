-- Migration: Update screenshot URLs to use high-quality templates
-- Date: 2024-12-19
-- Purpose: Upgrade all screenshot URLs to use t_1080p_2x template and WebP format
--          Frontend will dynamically switch to t_720p for mobile devices

-- Step 1: Backup current screenshots (create a temp table for safety)
CREATE TEMP TABLE screenshots_backup AS
SELECT
    id,
    name,
    screenshots
FROM game
WHERE screenshots IS NOT NULL;

-- Log the backup
DO $$
BEGIN
    RAISE NOTICE 'Backed up % games with screenshots', (SELECT COUNT(*) FROM screenshots_backup);
END $$;

-- Step 2: Update all screenshot URLs to use t_1080p_2x and WebP format
UPDATE game
SET screenshots = ARRAY(
    SELECT
        REGEXP_REPLACE(
            REGEXP_REPLACE(url, '\.(jpg|jpeg|png)$', '.webp', 'g'),  -- Convert to WebP
            't_[^/]+',  -- Match any existing template
            't_1080p_2x',  -- Replace with high-quality template
            'g'
        )
    FROM UNNEST(screenshots) AS url
)
WHERE screenshots IS NOT NULL
  AND ARRAY_LENGTH(screenshots, 1) > 0;

-- Step 3: Verify the update
DO $$
DECLARE
    total_updated INTEGER;
    sample_url TEXT;
BEGIN
    -- Count updated games
    SELECT COUNT(*) INTO total_updated
    FROM game
    WHERE screenshots IS NOT NULL
      AND screenshots::text LIKE '%t_1080p_2x%';

    -- Get a sample URL to verify format
    SELECT screenshots[1] INTO sample_url
    FROM game
    WHERE screenshots IS NOT NULL
      AND ARRAY_LENGTH(screenshots, 1) > 0
    LIMIT 1;

    RAISE NOTICE 'Updated % games with screenshots', total_updated;
    RAISE NOTICE 'Sample updated URL: %', sample_url;

    -- Check if any URLs don't have the new template
    IF EXISTS (
        SELECT 1
        FROM game, UNNEST(screenshots) AS url
        WHERE screenshots IS NOT NULL
          AND url NOT LIKE '%t_1080p_2x%'
        LIMIT 1
    ) THEN
        RAISE WARNING 'Some URLs may not have been updated correctly';
    END IF;
END $$;

-- Step 4: Add comment for future reference
COMMENT ON COLUMN game.screenshots IS
'Array of screenshot URLs from IGDB. Uses t_1080p_2x (3840x2160) template with WebP format. Frontend dynamically switches to t_720p for mobile devices.';

-- Step 5: Log migration statistics
DO $$
DECLARE
    stats RECORD;
BEGIN
    SELECT
        COUNT(*) as total_games,
        SUM(ARRAY_LENGTH(screenshots, 1)) as total_screenshots,
        COUNT(CASE WHEN screenshots::text LIKE '%t_1080p_2x%' THEN 1 END) as games_with_new_format,
        COUNT(CASE WHEN screenshots::text LIKE '%.webp%' THEN 1 END) as games_with_webp
    INTO stats
    FROM game
    WHERE screenshots IS NOT NULL;

    RAISE NOTICE 'Migration Statistics:';
    RAISE NOTICE '  Total games with screenshots: %', stats.total_games;
    RAISE NOTICE '  Total screenshots: %', stats.total_screenshots;
    RAISE NOTICE '  Games with t_1080p_2x: %', stats.games_with_new_format;
    RAISE NOTICE '  Games with WebP format: %', stats.games_with_webp;
END $$;

-- Cleanup temp table
DROP TABLE IF EXISTS screenshots_backup;