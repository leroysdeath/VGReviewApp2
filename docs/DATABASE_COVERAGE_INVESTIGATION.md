# Database Coverage Investigation

**Created:** 2025-01-15
**Status:** Investigation Required
**Priority:** High

---

## Question to Answer

**Does our database have significant coverage gaps compared to IGDB?**

Based on the search system analysis, we discovered that:
- Main search uses **local database only** (185K+ games)
- Admin sorting uses **IGDB API directly** (millions of games)
- This creates inconsistent results and suggests potential coverage gaps

---

## What We Know

### Database Stats (As of Last Sync)
- **Total Games:** ~185,000
- **IGDB Coverage:** 99.9% have IGDB IDs
- **Sync Method:** Manual only via `scripts/sync-igdb.js`
- **Sync Strategy:** By `updated_at` timestamp only
- **Last Known Sync:** Unknown (needs investigation)

### Known Gaps (from IGDB_SYNC.md)
- **2023+ Games:** Only ~1,069 in database vs ~3,000+ expected
- **Potential Missing:** ~2,000 recent releases
- **No Franchise Monitoring:** Popular series may be incomplete
- **No New Release Detection:** Automated new game detection disabled

---

## Investigation Steps

### Step 1: Check Database Age

**Goal:** Determine when we last synced with IGDB

**Query:**
```sql
SELECT
  MAX(created_at) as last_import_date,
  COUNT(*) as total_imported_games,
  DATE_PART('day', NOW() - MAX(created_at)) as days_since_last_import
FROM game
WHERE igdb_id IS NOT NULL;
```

**Expected Results:**
- Last import date
- Days since last sync
- Total games imported from IGDB

**Red Flags:**
- ⚠️ Last sync > 30 days ago
- ⚠️ Last sync > 90 days ago (critical)

---

### Step 2: Check Recent Game Coverage

**Goal:** See how many 2023-2025 games we have

**Query:**
```sql
SELECT
  EXTRACT(YEAR FROM release_date) as year,
  COUNT(*) as game_count
FROM game
WHERE release_date >= '2023-01-01'
GROUP BY year
ORDER BY year DESC;
```

**Expected Results:**
| Year | Expected | Actual | Gap |
|------|----------|--------|-----|
| 2024 | ~2,000+  | ???    | ??? |
| 2023 | ~2,000+  | 1,069  | ~1,000 |

**Red Flags:**
- ⚠️ 2024 < 1,500 games (major gap)
- ⚠️ 2023 < 1,500 games (confirmed gap)

---

### Step 3: Check Popular Franchises

**Goal:** Verify major franchises are complete

**Franchises to Check:**
1. Pokemon (should have 100+ games)
2. Mario (should have 200+ games)
3. Zelda (should have 40+ games)
4. Final Fantasy (should have 80+ games)
5. Call of Duty (should have 30+ games)

**Query:**
```sql
SELECT
  franchises,
  COUNT(*) as game_count
FROM game
WHERE franchises @> ARRAY['Pokemon']
GROUP BY franchises;
```

**Red Flags:**
- ⚠️ Pokemon < 80 games
- ⚠️ Mario < 150 games
- ⚠️ Zelda < 30 games

---

### Step 4: Compare Sample Searches

**Goal:** Find specific examples of missing games

**Test Searches:**
1. "Zelda Breath of the Wild"
2. "Pokemon Scarlet"
3. "Elden Ring"
4. "Baldur's Gate 3"
5. "Tears of the Kingdom"

**Method:**
1. Search via main search (database)
2. Search via admin sorting (IGDB)
3. Compare results
4. Document missing games

---

### Step 5: Estimate Coverage Gap

**Goal:** Calculate approximate number of missing games

**IGDB API Test:**
```javascript
// Test popular search terms and compare counts
const testTerms = [
  'zelda',
  'mario',
  'pokemon',
  'final fantasy',
  'call of duty'
];

for (const term of testTerms) {
  const dbResults = await searchService.coordinatedSearch(term, { maxResults: 200 });
  const igdbResults = await igdbServiceV2.searchGames(term, 200);

  console.log(`"${term}":`, {
    database: dbResults.results.length,
    igdb: igdbResults.length,
    gap: igdbResults.length - dbResults.results.length
  });
}
```

---

## Expected Findings

### Best Case Scenario
- ✅ Database is mostly complete
- ✅ Only missing very recent releases (last 30 days)
- ✅ All major franchises well-represented
- ✅ Gap < 5,000 games total

**Action:** Minor backfill for recent releases

---

### Moderate Gap Scenario
- ⚠️ Missing 1-2 years of releases
- ⚠️ Some franchise games missing
- ⚠️ Gap: 5,000-20,000 games

**Action:**
1. Immediate backfill for 2023-2025
2. Franchise-specific backfills
3. Set up automated daily sync

---

### Critical Gap Scenario
- 🚨 Missing 3+ years of releases
- 🚨 Major franchises incomplete
- 🚨 Gap: 20,000+ games

**Action:**
1. Emergency full database backfill
2. Prioritize top 100 franchises
3. Implement automated sync immediately
4. Consider hybrid search (DB + IGDB fallback)

---

## Backfill Strategy

### If Backfill is Needed

**Priority 1: Recent Releases (2023-2025)**
```bash
npm run sync-igdb -- --start-date 2023-01-01 --limit 5000
```

**Priority 2: Major Franchises**
```bash
# Pokemon
npm run sync-igdb -- --franchise "Pokemon" --limit 500

# Mario
npm run sync-igdb -- --franchise "Mario" --limit 500

# Zelda
npm run sync-igdb -- --franchise "The Legend of Zelda" --limit 200
```

**Priority 3: Popular Platforms**
```bash
# Nintendo Switch (recent)
npm run sync-igdb -- --platform 130 --start-date 2020-01-01 --limit 2000

# PS5
npm run sync-igdb -- --platform 167 --limit 1000

# Xbox Series
npm run sync-igdb -- --platform 169 --limit 1000
```

---

## Automated Sync Setup

### After Backfill Complete

**Daily Sync for New Releases:**
```javascript
// Add to cron job or GitHub Actions
// Run: npm run sync-igdb:new-releases
// Syncs games released in last 7 days
```

**Weekly Franchise Monitoring:**
```javascript
// Monitor top 50 franchises for new entries
// Run: npm run sync-igdb:franchises
```

**Monthly Full Update Sync:**
```javascript
// Sync all games updated in last 30 days
// Run: npm run sync-igdb -- --days 30
```

---

## Search System Improvements

### Short-Term: IGDB Fallback

**Concept:** If game not in database, try IGDB API

```typescript
// In searchService.coordinatedSearch()
async coordinatedSearch(query: string, options = {}) {
  // 1. Try database first
  const dbResults = await this.searchDatabase(query, options);

  // 2. If insufficient results, try IGDB
  if (dbResults.length < 3) {
    const igdbResults = await igdbServiceV2.searchGames(query, 10);

    // 3. Store IGDB results in database for future searches
    await this.cacheIGDBResults(igdbResults);

    // 4. Merge results
    return this.mergeResults(dbResults, igdbResults);
  }

  return dbResults;
}
```

**Benefits:**
- ✅ Gradually fills database gaps
- ✅ Users find games even if not synced
- ✅ Self-healing database
- ✅ Better user experience

---

### Long-Term: Unified Search

**Concept:** Apply igdbServiceV2 filtering to database results

**Architecture:**
```
User Search
  → searchService.search()
    → Database Query (fast, local)
      → Apply Advanced Filters:
        - Content protection
        - Franchise detection
        - Flagship fallback
        - Quality ranking
        - Iconic boost
      → Return Enhanced Results
```

**Benefits:**
- ✅ Speed of database
- ✅ Quality of IGDB filtering
- ✅ Consistent results
- ✅ Best of both systems

---

## Metrics to Track

### Before Backfill
- Total games in database
- Games per year (2020-2025)
- Top franchise counts
- Coverage %

### After Backfill
- Games added
- New franchises
- Coverage improvement
- Search quality improvement

### Ongoing Monitoring
- Daily: New games synced
- Weekly: Franchise completeness
- Monthly: Overall coverage %
- Quarterly: Search satisfaction

---

## Next Steps

1. **Run Coverage Analysis Script** ✅ Created
   - Execute: `node scripts/analyze-database-coverage.js`
   - Document findings

2. **Test Sample Searches**
   - Compare DB vs IGDB for 10 popular terms
   - Document specific missing games

3. **Decide on Backfill Strategy**
   - Based on gap size
   - Prioritize critical content

4. **Implement Solution**
   - Run backfill if needed
   - Set up automated sync
   - Add IGDB fallback (optional)

5. **Monitor Results**
   - Track coverage improvement
   - Measure search quality
   - User satisfaction

---

## Files to Create/Modify

### Investigation Scripts
- ✅ `scripts/analyze-database-coverage.js` - Coverage analysis
- ⏳ `scripts/compare-db-igdb.js` - Side-by-side comparison
- ⏳ `scripts/find-missing-games.js` - Identify specific gaps

### Backfill Scripts
- ⏳ `scripts/backfill-recent-games.js` - 2023-2025 releases
- ⏳ `scripts/backfill-franchises.js` - Popular franchises
- ⏳ `scripts/backfill-platforms.js` - Platform-specific

### Sync Improvements
- ⏳ Modify `scripts/sync-igdb.js` for multi-strategy sync
- ⏳ Add `scripts/sync-igdb-scheduled.js` for automation
- ⏳ Add GitHub Actions workflow for daily sync

---

## Questions to Answer

1. ✅ Do we have two separate datasets? **YES - Database vs IGDB**
2. ⏳ How big is the coverage gap? **Need to run analysis**
3. ⏳ Which franchises are most affected? **Need to investigate**
4. ⏳ How many 2024-2025 games are missing? **Need to query**
5. ⏳ When was last sync? **Need to check database**
6. ⏳ Should we backfill? **Depends on gap size**
7. ⏳ Should we add IGDB fallback? **Likely yes**
8. ⏳ Should we unify search systems? **Long-term goal**

---

## References

- `docs/SEARCH_SYSTEM_ANALYSIS.md` - Search system comparison
- `docs/IGDB_SYNC.md` - Sync system documentation
- `scripts/sync-igdb.js` - Current sync implementation
- `src/services/searchService.ts` - Database search
- `src/services/igdbService.ts` - IGDB search
