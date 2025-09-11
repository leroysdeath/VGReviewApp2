-- Script to refresh Ninja Gaiden: Ragebound (IGDB ID: 325580) data
-- This will delete the existing incomplete record so the app can re-fetch with complete data

-- First, show current state
SELECT 
  id,
  igdb_id,
  name,
  CASE WHEN summary IS NOT NULL THEN 'Has summary' ELSE 'NO SUMMARY' END as summary_status,
  CASE WHEN description IS NOT NULL THEN 'Has description' ELSE 'NO DESCRIPTION' END as description_status,
  CASE WHEN developer IS NOT NULL THEN developer ELSE 'NO DEVELOPER' END as developer,
  CASE WHEN publisher IS NOT NULL THEN publisher ELSE 'NO PUBLISHER' END as publisher,
  CASE WHEN platforms IS NOT NULL THEN array_length(platforms, 1)::text || ' platforms' ELSE 'NO PLATFORMS' END as platforms,
  CASE WHEN release_date IS NOT NULL THEN release_date::text ELSE 'NO RELEASE DATE' END as release_date,
  CASE WHEN screenshots IS NOT NULL THEN array_length(screenshots, 1)::text || ' screenshots' ELSE 'NO SCREENSHOTS' END as screenshots
FROM game 
WHERE igdb_id = 325580;

-- Delete the game record (will cascade to related records if any)
DELETE FROM game WHERE igdb_id = 325580;

-- Confirm deletion
SELECT 'Game with IGDB ID 325580 has been deleted. The app will re-fetch complete data on next access.' as status;