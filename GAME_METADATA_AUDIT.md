# Game Metadata Audit Guide

## Overview
This guide provides a comprehensive approach to auditing and fixing game metadata issues, particularly cover URLs and other IGDB-synced data that may have become corrupted or outdated.

## 1. Identify Suspect Games

Start by finding patterns of corruption in your database:

### Find Duplicate Cover URLs
```sql
-- Find games with duplicate cover URLs (major red flag)
SELECT cover_url, COUNT(*) as count, STRING_AGG(name, ', ') as games
FROM game
WHERE cover_url IS NOT NULL
GROUP BY cover_url
HAVING COUNT(*) > 1
ORDER BY count DESC;
```

### Check Data Completeness
```sql
-- Find games with suspiciously old or missing data
SELECT COUNT(*) FILTER (WHERE cover_url IS NULL) as missing_covers,
       COUNT(*) FILTER (WHERE summary IS NULL) as missing_summaries,
       COUNT(*) FILTER (WHERE release_date IS NULL) as missing_dates,
       COUNT(*) FILTER (WHERE updated_at < NOW() - INTERVAL '1 year') as stale_data
FROM game;
```

### Spot-Check High-Profile Games
```sql
-- Find high-profile games to spot-check
SELECT name, igdb_id, cover_url, updated_at
FROM game
WHERE name IN ('The Legend of Zelda: Breath of the Wild', 'God of War', 'Halo', 'Mario Kart 8', 'The Witcher 3')
ORDER BY name;
```

## 2. Direct IGDB API Validation

Create a validation script that compares your database with current IGDB data:

```javascript
// scripts/validate-game-metadata.js
const validateGames = async () => {
  // Get sample of games from your DB
  const games = await getGamesFromDB({ limit: 100, orderBy: 'popularity' });

  // Fetch fresh data from IGDB
  for (const game of games) {
    const igdbData = await fetchFromIGDB(game.igdb_id);

    // Compare critical fields
    const issues = [];
    if (igdbData.cover?.id !== extractCoverID(game.cover_url)) {
      issues.push(`Cover mismatch: DB=${game.cover_url} vs IGDB=${igdbData.cover.id}`);
    }
    if (igdbData.name !== game.name) {
      issues.push(`Name mismatch: DB=${game.name} vs IGDB=${igdbData.name}`);
    }
    // Check release dates, platforms, genres, etc.

    if (issues.length > 0) {
      console.log(`Game ${game.name} (${game.igdb_id}):`, issues);
    }
  }
};
```

## 3. Pattern Analysis

Look for systematic issues in your data:

### Cover URL Pattern Analysis
```sql
-- Check cover URL patterns and find duplicates
SELECT
  SUBSTRING(cover_url FROM 'co[a-z0-9]+') as cover_id,
  COUNT(*) as usage_count
FROM game
WHERE cover_url LIKE '%/co%'
GROUP BY cover_id
HAVING COUNT(*) > 1
ORDER BY usage_count DESC;
```

### Cross-Franchise Contamination
```sql
-- Find games with mismatched franchises sharing covers
SELECT g1.name, g1.franchise, g2.name as other_game, g2.franchise as other_franchise
FROM game g1
JOIN game g2 ON g1.cover_url = g2.cover_url
WHERE g1.id < g2.id
  AND g1.franchise IS DISTINCT FROM g2.franchise;
```

## 4. Automated Validation System

Build a systematic validation service:

```typescript
// src/services/gameValidationService.ts
class GameValidationService {
  async validateBatch(gameIds: number[]) {
    const results = {
      coverMismatches: [],
      nameMismatches: [],
      missingData: [],
      duplicateCovers: []
    };

    // Fetch from your DB
    const dbGames = await supabase
      .from('game')
      .select('*')
      .in('igdb_id', gameIds);

    // Fetch fresh from IGDB
    const igdbGames = await this.fetchFromIGDB(gameIds);

    // Compare each field
    for (const dbGame of dbGames) {
      const igdbGame = igdbGames.find(g => g.id === dbGame.igdb_id);

      if (!igdbGame) {
        results.missingData.push(dbGame);
        continue;
      }

      if (igdbGame.cover?.url !== dbGame.cover_url) {
        results.coverMismatches.push({
          game: dbGame.name,
          igdb_id: dbGame.igdb_id,
          dbCover: dbGame.cover_url,
          igdbCover: igdbGame.cover?.url
        });
      }

      // Check for duplicate covers
      const duplicates = await this.findDuplicateCovers(dbGame.cover_url);
      if (duplicates.length > 1) {
        results.duplicateCovers.push({
          cover_url: dbGame.cover_url,
          games: duplicates
        });
      }
    }

    return results;
  }

  async findDuplicateCovers(coverUrl: string) {
    const { data } = await supabase
      .from('game')
      .select('id, name, igdb_id')
      .eq('cover_url', coverUrl);
    return data;
  }
}
```

## 5. Incremental Repair Strategy

### Priority Tiers

Organize games by importance for fixing:

1. **Tier 1**: Popular games (high review count)
2. **Tier 2**: Recently reviewed games
3. **Tier 3**: Games in user collections
4. **Tier 4**: Everything else

### Create Validation Queue

```sql
-- Create validation queue table
CREATE TABLE game_validation_queue (
  game_id INT PRIMARY KEY REFERENCES game(id),
  priority INT NOT NULL,
  last_validated TIMESTAMP,
  validation_status TEXT,
  issues_found JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP
);

-- Populate based on importance
INSERT INTO game_validation_queue (game_id, priority)
SELECT
  g.id,
  CASE
    WHEN COUNT(r.id) > 100 THEN 1  -- Popular games
    WHEN MAX(r.created_at) > NOW() - INTERVAL '30 days' THEN 2  -- Recently reviewed
    WHEN EXISTS (SELECT 1 FROM user_collection WHERE game_id = g.id) THEN 3  -- In collections
    ELSE 4  -- Everything else
  END as priority
FROM game g
LEFT JOIN rating r ON r.game_id = g.id
GROUP BY g.id;
```

### Batch Processing Script

```javascript
// scripts/process-validation-queue.js
async function processValidationQueue() {
  const BATCH_SIZE = 100;
  const RATE_LIMIT_DELAY = 1000; // 1 second between batches

  while (true) {
    // Get next batch from queue
    const { data: batch } = await supabase
      .from('game_validation_queue')
      .select('game_id')
      .is('processed_at', null)
      .order('priority', { ascending: true })
      .limit(BATCH_SIZE);

    if (!batch || batch.length === 0) {
      console.log('Queue empty, validation complete!');
      break;
    }

    // Validate batch
    const gameIds = batch.map(b => b.game_id);
    const validationResults = await validateGames(gameIds);

    // Update queue with results
    for (const result of validationResults) {
      await supabase
        .from('game_validation_queue')
        .update({
          validation_status: result.hasIssues ? 'issues_found' : 'validated',
          issues_found: result.issues,
          processed_at: new Date().toISOString()
        })
        .eq('game_id', result.gameId);

      // Apply fixes if possible
      if (result.fixes) {
        await applyFixes(result.gameId, result.fixes);
      }
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
  }
}
```

## 6. Monitoring & Prevention

### Create Audit System

```sql
-- Create audit log table
CREATE TABLE game_audit_log (
  id SERIAL PRIMARY KEY,
  game_id INT REFERENCES game(id),
  field_changed TEXT,
  old_value TEXT,
  new_value TEXT,
  changed_at TIMESTAMP DEFAULT NOW(),
  change_source TEXT -- 'sync', 'manual', 'validation', etc.
);

-- Create audit trigger
CREATE OR REPLACE FUNCTION audit_game_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Log each changed field
  IF OLD.cover_url IS DISTINCT FROM NEW.cover_url THEN
    INSERT INTO game_audit_log (game_id, field_changed, old_value, new_value, change_source)
    VALUES (NEW.id, 'cover_url', OLD.cover_url, NEW.cover_url, COALESCE(NEW.sync_source, 'manual'));
  END IF;

  IF OLD.name IS DISTINCT FROM NEW.name THEN
    INSERT INTO game_audit_log (game_id, field_changed, old_value, new_value, change_source)
    VALUES (NEW.id, 'name', OLD.name, NEW.name, COALESCE(NEW.sync_source, 'manual'));
  END IF;

  -- Add more fields as needed

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER game_changes_audit
AFTER UPDATE ON game
FOR EACH ROW
EXECUTE FUNCTION audit_game_changes();
```

### Monitoring Queries

```sql
-- Daily validation report
SELECT
  DATE(changed_at) as date,
  field_changed,
  COUNT(*) as changes_count,
  COUNT(DISTINCT game_id) as games_affected
FROM game_audit_log
WHERE changed_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(changed_at), field_changed
ORDER BY date DESC, changes_count DESC;

-- Find recent suspicious changes
SELECT
  g.name,
  gal.field_changed,
  gal.old_value,
  gal.new_value,
  gal.changed_at
FROM game_audit_log gal
JOIN game g ON g.id = gal.game_id
WHERE gal.field_changed = 'cover_url'
  AND gal.new_value IN (
    SELECT new_value
    FROM game_audit_log
    WHERE field_changed = 'cover_url'
    GROUP BY new_value
    HAVING COUNT(*) > 1
  )
ORDER BY gal.changed_at DESC;
```

## 7. Quick Fixes

### Immediate Actions

```sql
-- Remove obvious duplicate covers (keep first occurrence)
UPDATE game g1
SET cover_url = NULL, updated_at = NOW()
WHERE EXISTS (
  SELECT 1 FROM game g2
  WHERE g2.cover_url = g1.cover_url
  AND g2.id < g1.id
  AND (g2.franchise != g1.franchise OR g2.franchise IS NULL OR g1.franchise IS NULL)
);

-- Fix known issues (example for Metroid games)
UPDATE game SET
  cover_url = CASE
    WHEN igdb_id = 471 THEN 'https://images.igdb.com/igdb/image/upload/t_1080p/co3w4w.webp'  -- Metroid Prime
    WHEN igdb_id = 1006 THEN 'https://images.igdb.com/igdb/image/upload/t_1080p/co5osy.webp' -- Super Metroid
    -- Add more known fixes here
  END,
  updated_at = NOW()
WHERE igdb_id IN (471, 1006);

-- Clear caches for fixed games
DELETE FROM games_cache WHERE igdb_id IN (471, 1006);
DELETE FROM search_cache WHERE results::text LIKE '%Metroid%';
```

### Generate Fix Report

```sql
-- Generate report of games needing manual review
SELECT
  g1.name,
  g1.igdb_id,
  g1.cover_url,
  'Duplicate cover with: ' || STRING_AGG(g2.name, ', ') as issue,
  COUNT(g2.id) as duplicate_count
FROM game g1
JOIN game g2 ON g2.cover_url = g1.cover_url AND g2.id != g1.id
GROUP BY g1.id, g1.name, g1.igdb_id, g1.cover_url
ORDER BY COUNT(g2.id) DESC, g1.name;
```

## 8. Prevention Strategies

### Sync Script Improvements

```javascript
// Enhanced sync with validation
async function syncWithValidation(igdbGame) {
  // Validate cover URL before saving
  if (igdbGame.cover?.url) {
    // Check if this cover is already used by a different game
    const existingGame = await supabase
      .from('game')
      .select('id, name, igdb_id')
      .eq('cover_url', igdbGame.cover.url)
      .single();

    if (existingGame && existingGame.igdb_id !== igdbGame.id) {
      console.warn(`Cover collision detected: ${igdbGame.name} and ${existingGame.name} share cover ${igdbGame.cover.url}`);
      // Log to validation queue for manual review
      await logValidationIssue(igdbGame.id, 'cover_collision', {
        conflicting_game: existingGame.name,
        cover_url: igdbGame.cover.url
      });
    }
  }

  // Continue with sync...
}
```

### Regular Maintenance

Create a maintenance schedule:

1. **Daily**: Validate top 100 most-viewed games
2. **Weekly**: Check for new duplicate covers
3. **Monthly**: Full validation of games with recent activity
4. **Quarterly**: Complete database validation

## 9. Manual Review Process

For games that can't be automatically fixed:

1. Generate review list from validation queue
2. Check each game on IGDB website
3. Update database with correct metadata
4. Document patterns for future prevention

## 10. Success Metrics

Track improvement over time:

```sql
-- Validation dashboard query
SELECT
  COUNT(*) FILTER (WHERE cover_url IS NULL) as missing_covers,
  COUNT(*) FILTER (WHERE cover_url IN (
    SELECT cover_url FROM game GROUP BY cover_url HAVING COUNT(*) > 1
  )) as duplicate_covers,
  COUNT(*) FILTER (WHERE updated_at < NOW() - INTERVAL '6 months') as stale_data,
  COUNT(*) as total_games,
  ROUND(100.0 * COUNT(*) FILTER (WHERE cover_url IS NOT NULL) / COUNT(*), 2) as cover_completeness_pct
FROM game;
```

## Conclusion

This audit process should be run regularly to maintain data quality. Start with high-priority games and work through the queue systematically. The key is to:

1. Identify patterns of corruption
2. Fix systematically, not randomly
3. Prevent future issues through validation
4. Monitor for regressions

Remember: Always backup your database before running large-scale updates!