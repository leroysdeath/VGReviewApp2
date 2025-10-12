# Comprehensive Database Backfill Plan

## Problem Statement
Your original database scrape used `category = (0,4,8,9,10,11)` and `version_parent = null` filters, which excluded:
- **Category 1**: DLC/Add-ons (~20,000+ games)
- **Category 2**: Expansions (~3,000+ games)
- **Category 3**: Bundles (~2,000+ games)
- **Category 5**: Mods (~1,000+ games)
- **Category 6**: Episodes (~500+ games)
- **Category 7**: Seasons (~200+ games)
- **Category 12**: Forks (~100+ games)
- **Category 13**: Packs (~500+ games)
- **Category 14**: Updates (~1,000+ games)
- **All version_parent games**: Special editions, remasters, re-releases

**Estimated Missing**: 25,000-45,000 games

## Current Database Status
- **Current**: ~185,000 games
- **After Backfill**: ~210,000-230,000 games
- **IGDB Total**: ~300,000+ games (we'll get most relevant ones)

---

## Strategy: Category-by-Category Backfill

Instead of syncing by date (which only gets recently updated games), we'll sync by **category** to fill the gaps.

### Why This Works
1. **Complete Coverage**: Gets ALL games in each category, not just recent ones
2. **Rate Limit Safe**: Process one category at a time
3. **Resumable**: Can stop and continue at any category
4. **Trackable**: Clear progress through categories

---

## Implementation Approach

### Script: `scripts/backfill-by-category.cjs`

```bash
# Backfill all missing categories
node scripts/backfill-by-category.cjs --all

# Backfill specific category
node scripts/backfill-by-category.cjs --category 2

# Dry run first
node scripts/backfill-by-category.cjs --all --dry-run

# Resume from specific category
node scripts/backfill-by-category.cjs --start-from 5
```

### Category Processing Order (by priority)

```
Priority 1 - Most Important:
  Category 11: Ports (15,000 games) - Switch ports, PC ports, etc.
  Category 2:  Expansions (3,000) - Major DLC like Witcher 3: Blood and Wine
  Category 3:  Bundles (2,000) - Game collections, Master Chief Collection

Priority 2 - Medium Important:
  Category 10: Remakes (already synced, verify complete)
  Category 9:  Remasters (already synced, verify complete)
  Category 5:  Mods (1,000) - Popular mods like Counter-Strike origin

Priority 3 - Lower Priority:
  Category 1:  DLC (20,000) - Small DLC, cosmetic packs
  Category 6:  Episodes (500) - Episodic game chapters
  Category 7:  Seasons (200) - Season passes
  Category 13: Packs (500) - Content packs
  Category 14: Updates (1,000) - Game updates/patches
  Category 12: Forks (100) - Game forks
```

---

## Technical Implementation

### Rate-Limited Category Sync

```javascript
class CategoryBackfiller {
  async backfillCategory(categoryId, categoryName) {
    console.log(`\n🎮 Backfilling Category ${categoryId}: ${categoryName}`);

    const BATCH_SIZE = 500; // IGDB limit per request
    const RATE_LIMIT = 3;    // requests per second
    let offset = 0;
    let totalFetched = 0;
    let totalAdded = 0;

    while (true) {
      // Fetch batch from IGDB
      const query = `
        fields name, summary, slug, first_release_date, rating,
               cover.url, genres.name, platforms.name,
               involved_companies.company.name,
               involved_companies.developer,
               involved_companies.publisher,
               category, updated_at;
        where category = ${categoryId};
        limit ${BATCH_SIZE};
        offset ${offset};
        sort id asc;
      `;

      console.log(`\n📦 Fetching batch at offset ${offset}...`);

      const games = await this.fetchFromIGDB(query);

      if (games.length === 0) {
        console.log(`✅ Category ${categoryId} complete! Total: ${totalFetched} games`);
        break;
      }

      totalFetched += games.length;

      // Check which games are new
      const newGames = await this.filterNewGames(games);
      console.log(`   📊 Found ${games.length} games, ${newGames.length} are new`);

      if (newGames.length > 0) {
        // Insert to database
        const added = await this.insertGames(newGames);
        totalAdded += added;
        console.log(`   ✅ Added ${added} games to database`);
      }

      offset += BATCH_SIZE;

      // Rate limit: 3 req/sec = ~333ms between requests
      await this.sleep(350);

      // Progress update
      console.log(`   📈 Progress: ${totalFetched} fetched, ${totalAdded} added`);
    }

    return { fetched: totalFetched, added: totalAdded };
  }

  async filterNewGames(games) {
    // Extract IGDB IDs
    const igdbIds = games.map(g => g.id);

    // Check which already exist in database
    const { data } = await supabase
      .from('game')
      .select('igdb_id')
      .in('igdb_id', igdbIds);

    const existingIds = new Set(data.map(g => g.igdb_id));

    // Return only new games
    return games.filter(g => !existingIds.has(g.id));
  }
}
```

### Progress Tracking

```javascript
// Save state after each category
function saveProgress(state) {
  fs.writeFileSync('.backfill-progress.json', JSON.stringify(state, null, 2));
}

// Resume from saved state
function loadProgress() {
  if (fs.existsSync('.backfill-progress.json')) {
    return JSON.parse(fs.readFileSync('.backfill-progress.json'));
  }
  return { completed: [], current: null, stats: {} };
}
```

---

## Execution Plan

### Phase 1: High-Priority Categories (~20,000 games)

```bash
# Start with ports (most important for your use case)
node scripts/backfill-by-category.cjs --category 11 --name "Ports"
# Estimated: 15,000 games, ~50 minutes

# Expansions
node scripts/backfill-by-category.cjs --category 2 --name "Expansions"
# Estimated: 3,000 games, ~10 minutes

# Bundles
node scripts/backfill-by-category.cjs --category 3 --name "Bundles"
# Estimated: 2,000 games, ~7 minutes
```

**Total Phase 1**: ~67 minutes, +20,000 games

### Phase 2: Medium-Priority Categories (~1,000 games)

```bash
# Mods
node scripts/backfill-by-category.cjs --category 5 --name "Mods"
# Estimated: 1,000 games, ~3 minutes

# Verify remakes/remasters (should be mostly complete)
node scripts/backfill-by-category.cjs --category 9 --name "Remasters"
node scripts/backfill-by-category.cjs --category 10 --name "Remakes"
```

**Total Phase 2**: ~10 minutes, +1,000 games

### Phase 3: Lower-Priority DLC/Episodes (~22,000 games)

```bash
# DLC (largest category, least critical)
node scripts/backfill-by-category.cjs --category 1 --name "DLC"
# Estimated: 20,000 games, ~67 minutes

# Episodes, Seasons, etc.
node scripts/backfill-by-category.cjs --category 6 --name "Episodes"
node scripts/backfill-by-category.cjs --category 7 --name "Seasons"
node scripts/backfill-by-category.cjs --category 13 --name "Packs"
node scripts/backfill-by-category.cjs --category 14 --name "Updates"
```

**Total Phase 3**: ~80 minutes, +22,000 games

### Total Backfill Time: ~2.5-3 hours for complete database

---

## Or: Run All at Once

```bash
# One command to backfill everything
node scripts/backfill-by-category.cjs --all

# With priority order
node scripts/backfill-by-category.cjs --all --priority-order

# Resume if interrupted
node scripts/backfill-by-category.cjs --all --resume
```

### Expected Output

```
🎮 Comprehensive Category Backfill Starting...

📋 Categories to process:
   [Priority 1]
   - Category 11: Ports
   - Category 2:  Expansions
   - Category 3:  Bundles

   [Priority 2]
   - Category 5:  Mods
   - Category 9:  Remasters
   - Category 10: Remakes

   [Priority 3]
   - Category 1:  DLC
   - Category 6:  Episodes
   - Category 7:  Seasons
   - Category 12: Forks
   - Category 13: Packs
   - Category 14: Updates

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎮 [1/12] Category 11: Ports

📦 Batch 1/30 (offset 0)
   ✅ Fetched 500 games
   📊 412 are new
   💾 Inserted 412 games

📦 Batch 2/30 (offset 500)
   ✅ Fetched 500 games
   📊 487 are new
   💾 Inserted 487 games

... [batches 3-29] ...

📦 Batch 30/30 (offset 14,500)
   ✅ Fetched 243 games
   📊 201 are new
   💾 Inserted 201 games

✅ Category 11 Complete!
   📊 Total fetched: 14,743
   ✅ Total added: 13,921
   ⏱️  Time: 49m 12s

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎮 [2/12] Category 2: Expansions

... [continues through all categories] ...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎉 Backfill Complete!

📊 Summary by Category:
   Category 11 (Ports):      +13,921 games
   Category 2 (Expansions):  +2,847 games
   Category 3 (Bundles):     +1,923 games
   Category 5 (Mods):        +891 games
   Category 9 (Remasters):   +234 games
   Category 10 (Remakes):    +187 games
   Category 1 (DLC):         +18,742 games
   Category 6 (Episodes):    +456 games
   Category 7 (Seasons):     +178 games
   Category 12 (Forks):      +67 games
   Category 13 (Packs):      +423 games
   Category 14 (Updates):    +891 games

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Total Added: 40,760 games
📊 Database before: 185,000 games
📊 Database after:  225,760 games (+22% growth)
⏱️  Total time: 2h 47m 23s

🔍 Search should now include:
   ✅ All Switch ports (Pikmin 1+2, etc.)
   ✅ All expansions and DLC
   ✅ Game bundles and collections
   ✅ Remasters and special editions
   ✅ Popular mods and variants
```

---

## Alternative: Time-Based Historical Backfill

If category-based doesn't work well, we can do historical date ranges:

```bash
# Backfill by year
node scripts/backfill-historical.cjs --year 2023
node scripts/backfill-historical.cjs --year 2022
node scripts/backfill-historical.cjs --year 2021

# Or by date range
node scripts/backfill-historical.cjs --start 2020-01-01 --end 2020-12-31
```

---

## Safety & Monitoring

### Before Starting
```bash
# 1. Database backup (via Supabase dashboard or CLI)
# 2. Dry run to estimate
node scripts/backfill-by-category.cjs --all --dry-run

# 3. Test with one small category first
node scripts/backfill-by-category.cjs --category 12 --name "Forks"
```

### During Execution
- Monitor Supabase dashboard for database size
- Watch for timeout errors
- Check for rate limit hits (429 errors)
- Verify game data quality in batches

### After Completion
- Test searches for previously missing games
- Verify database integrity
- Check for duplicate entries
- Update search indices if needed

---

## Next Steps

1. **Build the script** (`scripts/backfill-by-category.cjs`)
2. **Test with Category 12** (Forks - smallest category, ~100 games)
3. **Run Priority 1** categories (Ports, Expansions, Bundles)
4. **Verify search results** improve
5. **Continue with remaining categories** if needed

---

## Questions

1. **When do you want to run this?**
   - [ ] Now (will take 2-3 hours)
   - [ ] Tonight/off-hours
   - [ ] In phases over multiple days

2. **Priority categories only or everything?**
   - [ ] Just Ports, Expansions, Bundles (~20K games, 1 hour)
   - [ ] Everything except DLC (~23K games, 1.5 hours)
   - [ ] Absolutely everything (~43K games, 3 hours)

3. **Start immediately or review the code first?**
   - [ ] Build and run now
   - [ ] Show me the code first

**Ready to implement?** This is a much better solution than ID-based imports for your goal of improving search coverage!
