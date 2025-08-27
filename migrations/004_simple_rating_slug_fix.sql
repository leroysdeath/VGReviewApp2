-- Migration: Simple rating slug fix - one record at a time
-- Date: 2025-08-27
-- Purpose: Test individual updates to identify the issue

-- Test 1: Try to update just one NULL record (ID 4)
UPDATE rating 
SET slug = 'the-legend-of-zelda-ocarina-of-time-master-quest'
WHERE id = 4;

-- Test 2: Try to update just one mismatched record (ID 1) 
UPDATE rating 
SET slug = 'age-of-empires-ii-definitive-edition'
WHERE id = 1;

-- Verify these two specific updates
SELECT 
  id, 
  game_id, 
  slug,
  CASE 
    WHEN id = 4 AND slug = 'the-legend-of-zelda-ocarina-of-time-master-quest' THEN 'FIXED'
    WHEN id = 1 AND slug = 'age-of-empires-ii-definitive-edition' THEN 'FIXED'
    ELSE 'NOT_FIXED'
  END as status
FROM rating 
WHERE id IN (1, 4)
ORDER BY id;