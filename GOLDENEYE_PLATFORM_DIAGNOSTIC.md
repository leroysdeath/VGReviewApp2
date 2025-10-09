# Goldeneye Platform Issue - Diagnostic Report

## Issue Summary

**Problem:** Goldeneye 007 (N64 exclusive) shows SNES as a platform in our database.

**Root Cause:** Our IGDB sync includes ALL platforms from IGDB, including rumored/cancelled platforms, not just released platforms.

**Status:** ✅ CONFIRMED - Issue exists in both sync script and IGDB services

---

## Investigation Findings

### 1. How the Issue Occurs

IGDB tracks **rumored and cancelled** platforms separately from released ones using `release_dates` with status codes:

| Status Code | Meaning |
|-------------|---------|
| 0 | Released ✅ |
| 1 | Alpha |
| 2 | Beta |
| 3 | Early Access |
| 4 | Offline |
| 5 | Cancelled ❌ |
| 6 | Rumored ❌ |
| 7 | Delisted |

**Example: Goldeneye 007**
```javascript
{
  id: 113,
  name: 'GoldenEye 007',
  platforms: [
    { id: 4, name: 'Nintendo 64' },
    { id: 6, name: 'Super Nintendo (SNES)' }  // ❌ Rumored but never released
  ],
  release_dates: [
    { platform: 4, status: 0 },  // Released on N64
    { platform: 6, status: 6 }   // Rumored on SNES (status 6)
  ]
}
```

### 2. Current (Incorrect) Transformation

**Location:** `scripts/sync-igdb.js:252`

```javascript
platforms: igdbGame.platforms?.map(p => p.name) || null,
```

This takes **ALL** platforms without filtering by release status.

**Result:** Both "Nintendo 64" AND "Super Nintendo (SNES)" are stored in our database.

### 3. Missing Data in Sync Query

**Location:** `scripts/sync-igdb.js:186`

```javascript
requestBody: `fields name, summary, first_release_date, rating, cover.url,
              genres.name, platforms.name, involved_companies.company.name,
              updated_at; where updated_at > ${timestamp} & category = 0;
              sort updated_at desc; limit ${limit};`
```

**Problem:** Query does NOT fetch `release_dates.platform` or `release_dates.status`

Without this data, we **cannot** filter platforms by release status during sync.

### 4. Scope of the Problem

This issue affects:

1. **Sync Script** (`scripts/sync-igdb.js`) - New games added to database
2. **IGDB Service V2** (`src/services/igdbServiceV2.ts`) - Search results shown to users
3. **Enhanced IGDB Service** (`src/services/enhancedIGDBService.ts`) - Advanced queries
4. **Game Data Service** - Any service that fetches IGDB data directly

**Potential Impact:**
- Unknown number of games have incorrect platforms in database
- Users see platforms that never had actual releases
- Search results may be confusing (e.g., "SNES games" showing N64 exclusives)

### 5. Other Affected Games (Examples)

Based on IGDB data patterns, other likely affected games:

- **Star Fox 2** - Cancelled SNES, released Switch
- **Perfect Dark** - Rumored SNES port that never happened
- **Conker's Bad Fur Day** - Various rumored ports
- **Any game with cancelled ports** shown in IGDB

---

## Solution

### Fix #1: Update Sync Query to Include Release Dates

**File:** `scripts/sync-igdb.js:186`

```javascript
// OLD
requestBody: `fields name, summary, first_release_date, rating, cover.url,
              genres.name, platforms.name, involved_companies.company.name,
              updated_at;
              where updated_at > ${timestamp} & category = 0;
              sort updated_at desc; limit ${limit};`

// NEW
requestBody: `fields name, summary, first_release_date, rating, cover.url,
              genres.name, platforms.name, platforms.id,
              release_dates.platform, release_dates.status,
              involved_companies.company.name, updated_at;
              where updated_at > ${timestamp} & category = 0;
              sort updated_at desc; limit ${limit};`
```

**Changes:**
- Added `platforms.id` (needed to match with release_dates)
- Added `release_dates.platform` (which platform this release is for)
- Added `release_dates.status` (0 = released, 6 = rumored, etc.)

### Fix #2: Create Platform Filtering Function

Add to `scripts/sync-igdb.js` before the `addGameToDatabase` function:

```javascript
/**
 * Extract only platforms with released games (status 0)
 * Filters out rumored (6), cancelled (5), and unreleased platforms
 */
function getReleasedPlatforms(igdbGame) {
  if (!igdbGame.platforms || igdbGame.platforms.length === 0) {
    return null;
  }

  // If no release_dates, fall back to all platforms (rare edge case)
  if (!igdbGame.release_dates || igdbGame.release_dates.length === 0) {
    console.warn(`⚠️  Game "${igdbGame.name}" has platforms but no release_dates`);
    return igdbGame.platforms.map(p => p.name);
  }

  // Get platform IDs with released status (status 0 = Released)
  const releasedPlatformIds = new Set(
    igdbGame.release_dates
      .filter(rd => rd.status === 0)
      .map(rd => rd.platform)
  );

  // If no released platforms, fall back to all platforms
  if (releasedPlatformIds.size === 0) {
    console.warn(`⚠️  Game "${igdbGame.name}" has no released platforms`);
    return igdbGame.platforms.map(p => p.name);
  }

  // Filter platforms to only those with released games
  return igdbGame.platforms
    .filter(p => releasedPlatformIds.has(p.id))
    .map(p => p.name);
}
```

### Fix #3: Update Platform Assignment

**File:** `scripts/sync-igdb.js:252`

```javascript
// OLD
platforms: igdbGame.platforms?.map(p => p.name) || null,

// NEW
platforms: getReleasedPlatforms(igdbGame),
```

### Fix #4: Apply Same Fix to IGDB Services

The same filtering logic should be applied to:

1. `src/services/igdbServiceV2.ts` - Search results
2. `src/services/enhancedIGDBService.ts` - Advanced queries
3. Any other service that fetches platform data from IGDB

---

## Testing

### Unit Test Results

✅ All tests passed in `src/test/goldeneye-platform-unit.test.ts`

**Test Coverage:**
- Platform transformation with rumored platforms
- Filtering by release status
- Edge cases (missing release_dates)
- Multiple game scenarios (multiplatform, cancelled, etc.)
- Proposed fix validation

**Key Test Output:**
```
=== PLATFORM TRANSFORMATION TEST ===
Input platforms: [
  { id: 4, name: 'Nintendo 64' },
  { id: 6, name: 'Super Nintendo (SNES)' }
]
Transformed platforms: [ 'Nintendo 64', 'Super Nintendo (SNES)' ]
Release dates: [
  { platform: 4, status: 0, human: 'Aug 25, 1997' },
  { platform: 6, status: 6, human: 'TBD' }
]

❌ ISSUE FOUND: All platforms are included regardless of release status

=== PLATFORM FILTERING FIX ===
Current (wrong): [ 'Nintendo 64', 'Super Nintendo (SNES)' ]
Fixed (correct): [ 'Nintendo 64' ]

✅ Fix verified: Only released platforms included
```

### Integration Test Needed

To verify the fix works with real IGDB API data:

1. Start `netlify dev`
2. Run `src/test/goldeneye-platform-investigation.test.ts`
3. Verify Goldeneye shows only N64 platform
4. Check other affected games

---

## Migration Consideration

### Database Cleanup

After deploying the fix, consider:

1. **Query for affected games:**
   ```sql
   SELECT id, name, platforms, igdb_id
   FROM game
   WHERE platforms @> ARRAY['Super Nintendo (SNES)']
     AND igdb_id IS NOT NULL
   ORDER BY name;
   ```

2. **Re-fetch platform data from IGDB** for affected games using the fixed logic

3. **Update records** with correct platforms only

### Migration Script

Could create a migration script that:
1. Queries all games with `igdb_id`
2. Re-fetches correct platform data from IGDB
3. Updates only games where platforms differ
4. Logs all changes for review

---

## Summary

| Aspect | Status |
|--------|--------|
| **Root Cause** | ✅ Identified |
| **Affected Code** | ✅ Located |
| **Unit Tests** | ✅ Written & Passing |
| **Fix Designed** | ✅ Complete |
| **Integration Test** | ⏳ Requires netlify dev |
| **Fix Applied** | ❌ Not yet |
| **Database Migration** | ❌ Not yet |

**Next Steps:**
1. Apply fixes to sync script and IGDB services
2. Run integration tests with real IGDB API
3. Test with Goldeneye and other affected games
4. Consider database migration for historical data
5. Document platform filtering in service layer

---

## References

- **IGDB API Docs:** https://api-docs.igdb.com/#release-date
- **Sync Script:** `scripts/sync-igdb.js`
- **Unit Tests:** `src/test/goldeneye-platform-unit.test.ts`
- **Integration Tests:** `src/test/goldeneye-platform-investigation.test.ts`
