# Screenshot Backfill Guide

**Date:** October 15, 2025
**Purpose:** Backfill IGDB screenshot data for all existing games in the database

---

## Overview

This guide covers the complete process for adding screenshot support to VGReviewApp2, including:
1. Database migration to add the `screenshots` column
2. Backfill script to populate screenshots for existing 185K+ games
3. Update sync scripts to include screenshots for new games

---

## Current State

### What Exists
- ✅ TypeScript types support `screenshots?: string[]` in `Game` interface
- ✅ Frontend code references `game.screenshots` in components
- ✅ IGDB API provides screenshot data via `screenshots.url` field

### What's Missing
- ❌ Physical `screenshots` column in database `game` table
- ❌ Screenshot fetching in sync scripts (`sync-igdb.js`)
- ❌ Screenshot data for existing 185K+ games

---

## Implementation Steps

### Step 1: Apply Database Migration

**Migration File:** `supabase/migrations/20251015_add_screenshots_column.sql`

**What it does:**
- Adds `screenshots TEXT[]` column to `game` table
- Creates index for games with screenshots
- Adds column documentation

**How to apply:**

#### Option A: Supabase CLI (Recommended)
```bash
npx supabase db push
```

#### Option B: Supabase Dashboard
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/migrations/20251015_add_screenshots_column.sql`
3. Execute the SQL

#### Option C: psql Command Line
```bash
psql $DATABASE_URL -f supabase/migrations/20251015_add_screenshots_column.sql
```

**Verify migration:**
```sql
-- Check column exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'game' AND column_name = 'screenshots';

-- Should return: screenshots | ARRAY
```

---

### Step 2: Run Screenshot Backfill

**Script:** `scripts/backfill-screenshots.js`

#### Prerequisites
1. ✅ Migration applied (Step 1 complete)
2. ✅ Netlify dev server running: `netlify dev`
3. ✅ Environment variables set in `.env`

#### Quick Start

```bash
# Test run (see what would be updated, no changes made)
npm run backfill-screenshots:dry

# Process first 100 games (good for initial testing)
node scripts/backfill-screenshots.js --limit 100

# Full backfill (all 185K+ games, takes ~6-8 hours)
npm run backfill-screenshots
```

#### Command Options

| Option | Description | Example |
|--------|-------------|---------|
| `--dry-run`, `-d` | Test mode, no database updates | `--dry-run` |
| `--batch-size N`, `-b` | Games per batch (default: 50) | `--batch-size 100` |
| `--limit N`, `-l` | Max games to process | `--limit 1000` |
| `--delay N` | Delay between batches (ms) | `--delay 200` |
| `--no-resume` | Start from beginning, ignore progress | `--no-resume` |
| `--help`, `-h` | Show help | `--help` |

#### Resume Capability

The script saves progress to `.screenshot-backfill-progress.json`:
- **Interrupted?** Just run again, it resumes automatically
- **Start fresh?** Use `--no-resume` flag
- **Check progress?** Look at the JSON file

```json
{
  "lastProcessedId": 12450,
  "totalProcessed": 5000,
  "totalUpdated": 3247
}
```

#### Performance Estimates

Based on 185K games:

| Scenario | Time Estimate | Games/Hour |
|----------|---------------|------------|
| Default (batch: 50, delay: 100ms) | ~6-8 hours | ~25,000 |
| Fast (batch: 100, delay: 50ms) | ~3-4 hours | ~50,000 |
| Conservative (batch: 25, delay: 200ms) | ~12-16 hours | ~12,500 |

**Recommended:** Start with default settings, monitor for API rate limits

---

### Step 3: Update Sync Scripts

After backfill is complete, update `sync-igdb.js` to fetch screenshots for new games.

**File:** `scripts/sync-igdb.js`

**Changes needed:**

1. **Update IGDB query** (line 208):
```javascript
// OLD (line 208)
requestBody: `fields name, summary, first_release_date, rating, cover.url, genres.name, platforms.name, platforms.id, release_dates.platform, release_dates.status, involved_companies.company.name, updated_at; where updated_at > ${timestamp}; sort updated_at desc; limit ${limit};`

// NEW (add screenshots.url)
requestBody: `fields name, summary, first_release_date, rating, cover.url, screenshots.url, genres.name, platforms.name, platforms.id, release_dates.platform, release_dates.status, involved_companies.company.name, updated_at; where updated_at > ${timestamp}; sort updated_at desc; limit ${limit};`
```

2. **Update gameData object** (line 249+):
```javascript
// Add after pic_url (around line 266)
screenshots: igdbGame.screenshots?.map(s => {
  const imageFile = s.url.split('/').pop();
  const imageId = imageFile.replace('.jpg', '');
  return `https://images.igdb.com/igdb/image/upload/t_screenshot_big/${imageId}.jpg`;
}) || null,
```

**Updated section:**
```javascript
async addGameToDatabase(igdbGame) {
  try {
    const gameData = {
      game_id: igdbGame.id.toString(),
      igdb_id: igdbGame.id,
      name: igdbGame.name,
      slug: igdbGame.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      summary: igdbGame.summary || null,
      description: igdbGame.summary || null,
      release_date: igdbGame.first_release_date
        ? new Date(igdbGame.first_release_date * 1000).toISOString().split('T')[0]
        : null,
      igdb_rating: igdbGame.rating ? Math.round(parseFloat(igdbGame.rating)) : null,
      cover_url: igdbGame.cover?.url
        ? igdbGame.cover.url.replace('t_thumb', 't_cover_big').replace('//', 'https://')
        : null,
      pic_url: igdbGame.cover?.url
        ? igdbGame.cover.url.replace('t_thumb', 't_cover_big').replace('//', 'https://')
        : null,
      // NEW: Add screenshots
      screenshots: igdbGame.screenshots?.map(s => {
        const imageFile = s.url.split('/').pop();
        const imageId = imageFile.replace('.jpg', '');
        return `https://images.igdb.com/igdb/image/upload/t_screenshot_big/${imageId}.jpg`;
      }) || null,
      igdb_link: `https://www.igdb.com/games/${igdbGame.id}`,
      genre: igdbGame.genres?.[0]?.name || null,
      genres: igdbGame.genres?.map(g => g.name) || null,
      developer: igdbGame.involved_companies?.find(c => c.developer)?.company?.name ||
                 igdbGame.involved_companies?.[0]?.company?.name || null,
      publisher: igdbGame.involved_companies?.find(c => c.publisher)?.company?.name ||
                 igdbGame.involved_companies?.[0]?.company?.name || null,
      platforms: igdbGame.platforms?.map(p => p.name) || null,
      release_status: getReleaseStatus(igdbGame),
      is_verified: false,
      view_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('game')
      .insert([gameData]);

    if (error) {
      console.error(`      ❌ Database error:`, error.message);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`      ❌ Error adding game:`, error.message);
    return false;
  }
}
```

---

## Monitoring & Troubleshooting

### Monitor Progress

```bash
# Watch progress file
watch -n 5 cat .screenshot-backfill-progress.json

# Monitor logs
tail -f screenshot-backfill.log  # If you redirect output
```

### Common Issues

#### 1. Netlify Dev Not Running
**Error:** `❌ Netlify dev server is not running`
**Solution:** Run `netlify dev` in another terminal

#### 2. Migration Not Applied
**Error:** `❌ screenshots column does not exist`
**Solution:** Apply migration from Step 1

#### 3. API Rate Limiting
**Symptoms:** Increasing errors, slow responses
**Solution:** Increase `--delay` or decrease `--batch-size`

```bash
# More conservative settings
node scripts/backfill-screenshots.js --batch-size 25 --delay 300
```

#### 4. Database Connection Issues
**Error:** `❌ Supabase connection failed`
**Solution:** Check `.env` file for correct credentials

#### 5. Script Hangs/Crashes
**Solution:** The script saves progress automatically
```bash
# Just run again, it will resume
npm run backfill-screenshots
```

---

## NPM Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "backfill-screenshots": "node scripts/backfill-screenshots.js",
    "backfill-screenshots:dry": "node scripts/backfill-screenshots.js --dry-run",
    "backfill-screenshots:test": "node scripts/backfill-screenshots.js --limit 100",
    "backfill-screenshots:fast": "node scripts/backfill-screenshots.js --batch-size 100 --delay 50"
  }
}
```

---

## Data Quality Checks

After backfill completes, verify data quality:

```sql
-- Total games with screenshots
SELECT COUNT(*) as total_with_screenshots
FROM game
WHERE screenshots IS NOT NULL AND array_length(screenshots, 1) > 0;

-- Average screenshots per game
SELECT AVG(array_length(screenshots, 1)) as avg_screenshots
FROM game
WHERE screenshots IS NOT NULL;

-- Games with most screenshots
SELECT name, array_length(screenshots, 1) as screenshot_count
FROM game
WHERE screenshots IS NOT NULL
ORDER BY screenshot_count DESC
LIMIT 10;

-- Screenshot distribution
SELECT
  array_length(screenshots, 1) as screenshot_count,
  COUNT(*) as game_count
FROM game
WHERE screenshots IS NOT NULL
GROUP BY screenshot_count
ORDER BY screenshot_count;

-- Sample screenshot URLs (verify format)
SELECT name, screenshots[1] as first_screenshot
FROM game
WHERE screenshots IS NOT NULL
LIMIT 5;
```

**Expected Results:**
- ~60-70% of games should have screenshots
- Average 3-8 screenshots per game
- URLs format: `https://images.igdb.com/igdb/image/upload/t_screenshot_big/[id].jpg`

---

## Storage & Performance Considerations

### Storage Impact

| Metric | Estimate |
|--------|----------|
| Games in DB | 185,000 |
| Games with screenshots | ~120,000 (65%) |
| Avg screenshots per game | 5 |
| Avg URL length | 80 bytes |
| Total screenshot data | ~48 MB |

**Conclusion:** Minimal storage impact (< 50 MB)

### Performance Impact

- **Database queries:** No impact (screenshots loaded only when needed)
- **Image loading:** Use lazy loading on frontend (already implemented)
- **IGDB API calls:** No change (screenshots included in existing queries)

---

## Future Maintenance

### Regular Screenshot Updates

Run backfill periodically to update screenshots for games that didn't have them:

```bash
# Monthly update (only processes games without screenshots)
node scripts/backfill-screenshots.js --no-resume
```

### Automated Updates

Consider scheduling as a cron job:
```bash
# Run every Sunday at 3 AM
0 3 * * 0 cd /path/to/project && node scripts/backfill-screenshots.js --no-resume >> logs/screenshot-backfill.log 2>&1
```

---

## Rollback Plan

If you need to remove screenshots:

```sql
-- Remove all screenshot data
UPDATE game SET screenshots = NULL;

-- Or drop the column entirely
ALTER TABLE game DROP COLUMN screenshots;
```

---

## Success Metrics

After completion, you should see:

- ✅ ~120K games with screenshots populated
- ✅ Average 3-8 screenshots per game
- ✅ All screenshot URLs use `t_screenshot_big` quality
- ✅ New games from sync automatically include screenshots
- ✅ Frontend components display screenshot galleries

---

## Support & Questions

- **Script issues:** Check `--help` for all options
- **Database issues:** Verify migration applied correctly
- **API issues:** Check Netlify dev is running and credentials are valid

---

*Last updated: October 15, 2025*
