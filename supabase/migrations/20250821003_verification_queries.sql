-- =====================================================
-- Verification Queries for Data Integrity Fixes
-- =====================================================
-- Run these queries AFTER applying the previous migrations
-- to verify all issues have been resolved

-- 1. Check for any remaining orphaned rating records
SELECT 
  'ORPHANED RATINGS' as check_type,
  COUNT(*) as orphaned_count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ PASS'
    ELSE '❌ FAIL - Still have orphaned records'
  END as status
FROM rating r
WHERE NOT EXISTS (SELECT 1 FROM game WHERE id = r.game_id);

-- 2. Check for any remaining orphaned game_progress records  
SELECT 
  'ORPHANED GAME_PROGRESS' as check_type,
  COUNT(*) as orphaned_count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ PASS'
    ELSE '❌ FAIL - Still have orphaned records'
  END as status
FROM game_progress gp
WHERE NOT EXISTS (SELECT 1 FROM game WHERE id = gp.game_id);

-- 3. Verify foreign key constraints exist
SELECT 
  'FOREIGN KEY CONSTRAINTS' as check_type,
  COUNT(*) as constraint_count,
  CASE 
    WHEN COUNT(*) >= 4 THEN '✅ PASS - FK constraints added'
    ELSE '❌ FAIL - Missing FK constraints'
  END as status
FROM information_schema.table_constraints 
WHERE constraint_type = 'FOREIGN KEY' 
AND table_schema = 'public'
AND table_name IN ('rating', 'game_progress');

-- 4. Verify data integrity - all rating records should have valid references
SELECT 
  'RATING DATA INTEGRITY' as check_type,
  COUNT(*) as total_ratings,
  COUNT(g.id) as valid_game_refs,
  COUNT(u.id) as valid_user_refs,
  CASE 
    WHEN COUNT(*) = COUNT(g.id) AND COUNT(*) = COUNT(u.id) 
    THEN '✅ PASS - All references valid'
    ELSE '❌ FAIL - Invalid references found'
  END as status
FROM rating r
LEFT JOIN game g ON r.game_id = g.id
LEFT JOIN "user" u ON r.user_id = u.id;

-- 5. Verify game_progress data integrity
SELECT 
  'GAME_PROGRESS DATA INTEGRITY' as check_type,
  COUNT(*) as total_progress,
  COUNT(g.id) as valid_game_refs,
  COUNT(u.id) as valid_user_refs,
  CASE 
    WHEN COUNT(*) = COUNT(g.id) AND COUNT(*) = COUNT(u.id) 
    THEN '✅ PASS - All references valid'
    ELSE '❌ FAIL - Invalid references found'
  END as status
FROM game_progress gp
LEFT JOIN game g ON gp.game_id = g.id
LEFT JOIN "user" u ON gp.user_id = u.id;

-- 6. Show sample of corrected records for verification
SELECT 
  'SAMPLE CORRECTED RECORDS' as check_type,
  r.id as rating_id,
  r.game_id as database_game_id,
  g.igdb_id,
  g.name as game_name,
  'Rating record now correctly references database ID' as verification
FROM rating r
JOIN game g ON r.game_id = g.id
WHERE g.igdb_id IN (116, 222095, 305152, 338616)
LIMIT 5;

-- 7. Final summary report
SELECT 
  'FINAL SUMMARY' as check_type,
  (SELECT COUNT(*) FROM rating WHERE NOT EXISTS (SELECT 1 FROM game WHERE id = rating.game_id)) as orphaned_ratings,
  (SELECT COUNT(*) FROM game_progress WHERE NOT EXISTS (SELECT 1 FROM game WHERE id = game_progress.game_id)) as orphaned_progress,
  (SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'public' AND table_name IN ('rating', 'game_progress')) as fk_constraints,
  CASE 
    WHEN (SELECT COUNT(*) FROM rating WHERE NOT EXISTS (SELECT 1 FROM game WHERE id = rating.game_id)) = 0
    AND (SELECT COUNT(*) FROM game_progress WHERE NOT EXISTS (SELECT 1 FROM game WHERE id = game_progress.game_id)) = 0
    AND (SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'public' AND table_name IN ('rating', 'game_progress')) >= 4
    THEN '🎉 ALL ISSUES RESOLVED - Database integrity restored!'
    ELSE '⚠️ ISSUES REMAIN - Check individual queries above'
  END as overall_status;