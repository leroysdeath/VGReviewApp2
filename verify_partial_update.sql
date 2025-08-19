-- Verification Script for Partial Updates
-- This script helps verify the current state and what will be updated

-- 1. Check current values for ONLY the columns we're updating
-- This shows what data currently exists in the 8 target columns
SELECT 
    id,
    name,
    -- The 8 columns we're updating
    CASE WHEN summary IS NULL THEN 'NULL' ELSE 'EXISTS (' || LENGTH(summary)::text || ' chars)' END as summary_status,
    slug,
    CASE WHEN cover_url IS NULL THEN 'NULL' ELSE 'EXISTS' END as cover_url_status,
    COALESCE(array_length(screenshots, 1), 0) as screenshot_count,
    COALESCE(developer, 'NULL') as developer,
    COALESCE(publisher, 'NULL') as publisher,
    COALESCE(array_length(platforms, 1), 0) as platform_count,
    CASE WHEN igdb_link IS NULL THEN 'NULL' ELSE 'EXISTS' END as igdb_link_status
FROM game
WHERE id IN (55056, 4152, 305152, 116, 338616, 45142, 222095)
ORDER BY id;

-- 2. Safety check: Verify these IDs exist in the database
SELECT 
    id,
    name,
    CASE WHEN id IN (55056, 4152, 305152, 116, 338616, 45142, 222095) THEN '✓ WILL UPDATE' ELSE '✗ NOT IN LIST' END as update_status
FROM game
WHERE id IN (55056, 4152, 305152, 116, 338616, 45142, 222095)
ORDER BY id;

-- 3. Count non-null values in update columns (to see what already has data)
SELECT 
    COUNT(*) as total_games,
    COUNT(summary) as has_summary,
    COUNT(slug) as has_slug,
    COUNT(cover_url) as has_cover_url,
    COUNT(CASE WHEN array_length(screenshots, 1) > 0 THEN 1 END) as has_screenshots,
    COUNT(developer) as has_developer,
    COUNT(publisher) as has_publisher,
    COUNT(CASE WHEN array_length(platforms, 1) > 0 THEN 1 END) as has_platforms,
    COUNT(igdb_link) as has_igdb_link
FROM game
WHERE id IN (55056, 4152, 305152, 116, 338616, 45142, 222095);

-- 4. Show ALL columns for reference (to verify other columns won't be touched)
-- This query shows column names without data
SELECT 
    column_name,
    data_type,
    CASE 
        WHEN column_name IN ('summary', 'slug', 'cover_url', 'screenshots', 'developer', 'publisher', 'platforms', 'igdb_link') 
        THEN '⚠️ WILL BE UPDATED'
        ELSE '✓ PRESERVED'
    END as update_status
FROM information_schema.columns
WHERE table_name = 'game'
    AND table_schema = 'public'
ORDER BY 
    CASE 
        WHEN column_name IN ('summary', 'slug', 'cover_url', 'screenshots', 'developer', 'publisher', 'platforms', 'igdb_link') 
        THEN 0 
        ELSE 1 
    END,
    ordinal_position;

-- 5. Example of the EXACT UPDATE pattern that will be used
-- This is just for demonstration, DO NOT RUN this
/*
-- This is the EXACT pattern the script will use:
UPDATE game 
SET 
    summary = $1,        -- Only these 8 columns
    slug = $2,
    cover_url = $3,
    screenshots = $4,
    developer = $5,
    publisher = $6,
    platforms = $7,
    igdb_link = $8
WHERE id = $9;          -- Target specific row by ID

-- All other columns (name, release_date, genre, etc.) remain UNTOUCHED
*/

-- 6. Backup command (optional - create backup of current values)
-- Uncomment and run if you want to save current values before update
/*
CREATE TABLE game_backup_before_partial_update AS
SELECT 
    id,
    name,
    summary,
    slug,
    cover_url,
    screenshots,
    developer,
    publisher,
    platforms,
    igdb_link,
    NOW() as backup_timestamp
FROM game
WHERE id IN (55056, 4152, 305152, 116, 338616, 45142, 222095);
*/