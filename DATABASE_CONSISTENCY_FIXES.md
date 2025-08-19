# Database Consistency Fixes for ReviewPage Links

## Overview

This document outlines the recommended solutions for fixing data consistency issues between the `rating` and `game` tables that are causing broken ReviewPage links.

## Problem Analysis

Our investigation revealed critical data consistency issues:

1. **57% Missing Game Records**: 4 out of 7 reviews have no corresponding game table entries
2. **IGDB ID Mismatches**: Some reviews have `rating.igdb_id` that doesn't match `game.igdb_id` for the same game
3. **Broken Link Chain**: URL generation uses `rating.igdb_id` but ReviewPage queries expect matching game records

### Example Issues Found:
- Review #5: `rating.igdb_id = 1022` vs `game.igdb_id = 2983`
- Review #4: `rating.igdb_id = 45142` vs `game.igdb_id = 50982`  
- Reviews #3, #6, #7: Missing game table records entirely

## Recommended Solutions

### Fix 3: Resolve IGDB ID Mismatches

**Objective**: Align `rating.igdb_id` with `game.igdb_id` for consistency.

#### Step 1: Analyze Current Mismatches
```sql
-- Check all current mismatches
SELECT 
  r.id as rating_id,
  r.user_id,
  r.igdb_id as rating_igdb_id,
  g.id as game_id,
  g.igdb_id as game_igdb_id,
  g.name as game_name,
  'MISMATCH' as issue_type
FROM rating r
JOIN game g ON r.game_id = g.id  
WHERE r.igdb_id != g.igdb_id
ORDER BY r.id;
```

#### Step 2: Choose Resolution Strategy

**Option A: Update rating.igdb_id to match game.igdb_id (Recommended)**
```sql
-- Update rating table to use game table's IGDB ID
UPDATE rating 
SET igdb_id = game.igdb_id,
    updated_at = NOW()
FROM game 
WHERE rating.game_id = game.id 
  AND rating.igdb_id != game.igdb_id;

-- Verify the fix
SELECT COUNT(*) as fixed_mismatches
FROM rating r
JOIN game g ON r.game_id = g.id  
WHERE r.igdb_id = g.igdb_id;
```

**Option B: Update game.igdb_id to match rating.igdb_id**
```sql
-- Only use if rating table is more authoritative
UPDATE game 
SET igdb_id = rating.igdb_id,
    updated_at = NOW()
FROM rating 
WHERE game.id = rating.game_id 
  AND game.igdb_id != rating.igdb_id;
```

#### Step 3: Add Constraint to Prevent Future Mismatches
```sql
-- Create a function to validate IGDB ID consistency
CREATE OR REPLACE FUNCTION validate_rating_igdb_consistency()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.game_id IS NOT NULL THEN
    -- Check if game exists and IGDB IDs match
    IF NOT EXISTS (
      SELECT 1 FROM game 
      WHERE id = NEW.game_id 
      AND igdb_id = NEW.igdb_id
    ) THEN
      RAISE EXCEPTION 'Rating IGDB ID % does not match game IGDB ID for game_id %', 
        NEW.igdb_id, NEW.game_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce consistency
DROP TRIGGER IF EXISTS rating_igdb_consistency_trigger ON rating;
CREATE TRIGGER rating_igdb_consistency_trigger
  BEFORE INSERT OR UPDATE ON rating
  FOR EACH ROW
  EXECUTE FUNCTION validate_rating_igdb_consistency();
```

### Fix 4: Create Missing Game Records

**Objective**: Backfill missing game table entries for orphaned reviews.

#### Step 1: Identify Orphaned Reviews
```sql
-- Find reviews without corresponding game records
SELECT 
  r.id as rating_id,
  r.user_id,
  r.game_id as rating_game_id,
  r.igdb_id,
  'MISSING_GAME' as issue_type
FROM rating r
LEFT JOIN game g ON r.game_id = g.id
WHERE g.id IS NULL
ORDER BY r.id;
```

#### Step 2: Create Placeholder Game Records
```sql
-- Create minimal game records for orphaned reviews
INSERT INTO game (
  igdb_id, 
  name, 
  game_id, 
  created_at, 
  updated_at,
  is_verified
)
SELECT DISTINCT 
  r.igdb_id,
  'Game #' || r.igdb_id as name,
  r.igdb_id::text as game_id,
  NOW() as created_at,
  NOW() as updated_at,
  false as is_verified
FROM rating r
LEFT JOIN game g ON r.game_id = g.id
WHERE g.id IS NULL 
  AND r.igdb_id IS NOT NULL
ON CONFLICT (igdb_id) DO NOTHING;
```

#### Step 3: Update Rating Records to Reference New Games
```sql
-- Update rating.game_id to point to the newly created game records
UPDATE rating 
SET game_id = game.id,
    updated_at = NOW()
FROM game 
WHERE rating.igdb_id = game.igdb_id 
  AND rating.game_id != game.id
  AND NOT EXISTS (
    SELECT 1 FROM game g2 WHERE g2.id = rating.game_id
  );
```

#### Step 4: Verify the Fix
```sql
-- Check that all reviews now have corresponding game records
SELECT 
  COUNT(*) as total_reviews,
  COUNT(g.id) as reviews_with_games,
  COUNT(*) - COUNT(g.id) as orphaned_reviews,
  ROUND(100.0 * COUNT(g.id) / COUNT(*), 2) as coverage_percent
FROM rating r
LEFT JOIN game g ON r.game_id = g.id;
```

## Implementation Plan

### Phase 1: Backup and Analysis (Required)
1. **Create backups** of `rating` and `game` tables
2. **Run analysis queries** to document current state
3. **Test fixes on staging environment** first

### Phase 2: Data Consistency Fixes
1. **Execute Fix 3**: Resolve IGDB ID mismatches
2. **Execute Fix 4**: Create missing game records
3. **Verify all reviews** now have valid game relationships

### Phase 3: Prevention Measures
1. **Add database constraints** to prevent future inconsistencies
2. **Update application logic** to ensure proper game creation
3. **Add monitoring** to detect consistency issues

## Backup Commands

```sql
-- Backup current state
CREATE TABLE rating_backup_$(date +%Y%m%d) AS SELECT * FROM rating;
CREATE TABLE game_backup_$(date +%Y%m%d) AS SELECT * FROM game;

-- Verify backups
SELECT COUNT(*) FROM rating_backup_$(date +%Y%m%d);
SELECT COUNT(*) FROM game_backup_$(date +%Y%m%d);
```

## Testing Strategy

### Before Fixes
```sql
-- Document current broken links
SELECT 
  '/review/' || r.user_id || '/' || r.igdb_id as broken_url,
  CASE 
    WHEN g.id IS NULL THEN 'MISSING_GAME'
    WHEN r.igdb_id != g.igdb_id THEN 'IGDB_MISMATCH'
    ELSE 'OK'
  END as issue_type
FROM rating r
LEFT JOIN game g ON r.game_id = g.id
WHERE g.id IS NULL OR r.igdb_id != g.igdb_id;
```

### After Fixes
```sql
-- Verify all links should work
SELECT 
  '/review/' || r.user_id || '/' || r.igdb_id as working_url,
  g.name as game_name,
  'FIXED' as status
FROM rating r
JOIN game g ON r.game_id = g.id
WHERE r.igdb_id = g.igdb_id
ORDER BY r.id;
```

## Monitoring

Add this query to your monitoring dashboard:
```sql
-- Daily consistency check
SELECT 
  COUNT(*) as total_reviews,
  COUNT(CASE WHEN g.id IS NULL THEN 1 END) as missing_games,
  COUNT(CASE WHEN r.igdb_id != g.igdb_id THEN 1 END) as igdb_mismatches,
  CURRENT_DATE as check_date
FROM rating r
LEFT JOIN game g ON r.game_id = g.id;
```

## Risk Assessment

- **Low Risk**: These fixes only add missing data and align existing data
- **Reversible**: Backups allow complete rollback if needed
- **Application Impact**: Minimal - application code already handles missing games gracefully

## Success Criteria

1. ✅ All reviews have corresponding game table entries
2. ✅ All `rating.igdb_id` values match their `game.igdb_id` counterparts
3. ✅ ReviewPage links work for all reviews on ResponsiveLandingPage
4. ✅ No 404 errors when clicking review cards

## Next Steps

1. **Schedule maintenance window** for database fixes
2. **Execute backup commands** 
3. **Run Fix 3 and Fix 4** in sequence
4. **Test ReviewPage links** functionality
5. **Deploy application fixes** (already implemented)
6. **Monitor for new consistency issues**

---

*For questions or assistance with implementation, refer to the specific SQL commands above or consult the database administrator.*