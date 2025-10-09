-- Check total games and cover_url status
SELECT 
  COUNT(*) as total_games,
  COUNT(cover_url) as games_with_covers,
  COUNT(*) - COUNT(cover_url) as games_missing_covers,
  ROUND(100.0 * COUNT(cover_url) / COUNT(*), 2) as percent_with_covers
FROM game;

-- Sample games WITH cover_url (working)
SELECT id, igdb_id, name, 
  CASE 
    WHEN cover_url IS NULL THEN 'NULL'
    WHEN cover_url LIKE 'http%' THEN 'Full URL'
    WHEN cover_url LIKE '//%' THEN 'Protocol-relative'
    ELSE 'Other: ' || SUBSTRING(cover_url, 1, 50)
  END as cover_url_type,
  LENGTH(cover_url) as url_length
FROM game 
WHERE cover_url IS NOT NULL 
ORDER BY RANDOM() 
LIMIT 5;

-- Sample games WITHOUT cover_url (broken)
SELECT id, igdb_id, name, cover_url,
  created_at, updated_at
FROM game 
WHERE cover_url IS NULL 
ORDER BY RANDOM() 
LIMIT 10;

-- Check for patterns in missing covers
SELECT 
  EXTRACT(YEAR FROM created_at) as year_created,
  COUNT(*) as total,
  COUNT(cover_url) as with_covers,
  COUNT(*) - COUNT(cover_url) as missing_covers
FROM game
GROUP BY EXTRACT(YEAR FROM created_at)
ORDER BY year_created DESC;
