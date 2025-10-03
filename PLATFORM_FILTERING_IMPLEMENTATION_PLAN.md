# Platform Filtering Implementation Plan

## Executive Summary

**Goal:** Filter IGDB platform data to exclude rumored/cancelled/unreleased platforms across all services.

**Approach:** Centralized utility function + update all IGDB queries to include `release_dates` + apply filtering at transformation points.

**Impact:** Fixes 10+ locations where platform data is transformed from IGDB format.

---

## Option A: Centralized Filtering (RECOMMENDED)

### Advantages
✅ Single source of truth for filtering logic
✅ Easy to test and maintain
✅ Consistent behavior across all services
✅ Future-proof - add new filtering rules in one place

### Architecture

```
┌─────────────────────────────────────────────────────┐
│  IGDB API Response (raw platforms + release_dates)  │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  Centralized Utility: filterReleasedPlatforms()     │
│  Location: src/utils/igdbPlatformFilter.ts          │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  Filtered platform names (only released platforms)  │
│  Used by: All services, sync scripts, functions     │
└─────────────────────────────────────────────────────┘
```

---

## Files Analysis

### Files That Need Changes

#### 1. **Create New Utility** (NEW FILE)
- **File:** `src/utils/igdbPlatformFilter.ts`
- **Purpose:** Centralized platform filtering logic
- **Exports:** `filterReleasedPlatforms(igdbGame)` function

#### 2. **IGDB Query Updates** (Add `release_dates` to queries)

**Netlify Functions:**
- `netlify/functions/igdb-search.cjs` (Lines 134, 153, 156)
- `netlify/functions/igdb-search-detailed.cjs`
- `netlify/functions/igdb-search-autocomplete.cjs`

**Scripts:**
- `scripts/sync-igdb.js` (Line 186) - ⭐ **PRIMARY TARGET**
- `scripts/sync-priority-franchises.js` (Lines 37, 50, 54, 67, 71, 75, 88)

**Services:**
- `src/services/igdbSyncService.ts` (Line 155)
- `src/services/igdbService.ts` (Line 1147)
- `src/services/enhancedIGDBService.ts` (Lines 36-44)

#### 3. **Platform Transformation Points** (Use new utility)

**Services that transform platform data:**
- `src/services/igdbService.ts` (Line 1257)
- `src/services/igdbSyncService.ts` (Line 224)
- `src/services/resultAnalysisService.ts` (Line 626)
- `src/services/gameSyncService.ts` (Line 120)
- `src/services/gameService.ts` (Lines 833, 948)
- `src/services/gameSeeder.ts` (Line 265)

**Scripts:**
- `scripts/sync-igdb.js` (Line 252) - ⭐ **PRIMARY TARGET**

**Netlify Functions:**
- `netlify/functions/igdb-search-detailed.cjs` (Line 157)
- `netlify/functions/igdb-search-autocomplete.cjs` (Line 153)

**Utility Scripts:**
- `update_zelda_1022.js` (Line 83)
- `update_game_columns_partial.js` (Line 196)

---

## Implementation Steps

### Phase 1: Create Utility Function ⭐

**File:** `src/utils/igdbPlatformFilter.ts`

```typescript
/**
 * Filter IGDB platforms to only include released games
 * Excludes rumored (status 6), cancelled (status 5), and other unreleased platforms
 */

export interface IGDBPlatform {
  id: number;
  name: string;
}

export interface IGDBReleaseDate {
  platform: number;
  status: number;
  date?: number;
  human?: string;
  region?: number;
}

export interface IGDBGameWithPlatforms {
  name?: string;
  platforms?: IGDBPlatform[];
  release_dates?: IGDBReleaseDate[];
}

/**
 * IGDB Release Status Codes
 */
export const RELEASE_STATUS = {
  RELEASED: 0,
  ALPHA: 1,
  BETA: 2,
  EARLY_ACCESS: 3,
  OFFLINE: 4,
  CANCELLED: 5,
  RUMORED: 6,
  DELISTED: 7
} as const;

/**
 * Extract only platforms with released games (status 0)
 *
 * @param igdbGame - Game object from IGDB API
 * @returns Array of platform names for released platforms only, or null if no platforms
 *
 * @example
 * const game = {
 *   name: 'GoldenEye 007',
 *   platforms: [
 *     { id: 4, name: 'Nintendo 64' },
 *     { id: 6, name: 'Super Nintendo (SNES)' }
 *   ],
 *   release_dates: [
 *     { platform: 4, status: 0 },  // Released
 *     { platform: 6, status: 6 }   // Rumored
 *   ]
 * };
 *
 * filterReleasedPlatforms(game);
 * // Returns: ['Nintendo 64']
 */
export function filterReleasedPlatforms(
  igdbGame: IGDBGameWithPlatforms
): string[] | null {
  // No platforms at all
  if (!igdbGame.platforms || igdbGame.platforms.length === 0) {
    return null;
  }

  // No release dates - fall back to all platforms
  // This is a conservative approach for edge cases
  if (!igdbGame.release_dates || igdbGame.release_dates.length === 0) {
    console.warn(
      `⚠️  Game "${igdbGame.name || 'Unknown'}" has platforms but no release_dates - using all platforms`
    );
    return igdbGame.platforms.map(p => p.name);
  }

  // Get platform IDs with released status (status 0 = Released)
  const releasedPlatformIds = new Set(
    igdbGame.release_dates
      .filter(rd => rd.status === RELEASE_STATUS.RELEASED)
      .map(rd => rd.platform)
  );

  // No released platforms - fall back to all platforms
  // This handles edge cases where IGDB data might be incomplete
  if (releasedPlatformIds.size === 0) {
    console.warn(
      `⚠️  Game "${igdbGame.name || 'Unknown'}" has no released platforms (all rumored/cancelled) - using all platforms`
    );
    return igdbGame.platforms.map(p => p.name);
  }

  // Filter platforms to only those with released games
  return igdbGame.platforms
    .filter(p => releasedPlatformIds.has(p.id))
    .map(p => p.name);
}

/**
 * Get statistics about platform filtering for diagnostics
 */
export function getPlatformFilterStats(igdbGame: IGDBGameWithPlatforms): {
  totalPlatforms: number;
  releasedPlatforms: number;
  filteredPlatforms: number;
  filteredPlatformNames: string[];
} {
  const totalPlatforms = igdbGame.platforms?.length || 0;
  const filtered = filterReleasedPlatforms(igdbGame);
  const releasedPlatforms = filtered?.length || 0;

  const allPlatformNames = igdbGame.platforms?.map(p => p.name) || [];
  const releasedPlatformNames = filtered || [];
  const filteredPlatformNames = allPlatformNames.filter(
    name => !releasedPlatformNames.includes(name)
  );

  return {
    totalPlatforms,
    releasedPlatforms,
    filteredPlatforms: totalPlatforms - releasedPlatforms,
    filteredPlatformNames
  };
}
```

### Phase 2: Update IGDB Queries

**For ALL queries that fetch platforms, add:**
- `platforms.id` (needed to match with release_dates)
- `release_dates.platform`
- `release_dates.status`

**Example - sync-igdb.js (Line 186):**

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

**Apply to:**
- ✅ `scripts/sync-igdb.js:186`
- ✅ `src/services/igdbSyncService.ts:155`
- ✅ `src/services/igdbService.ts:1147`
- ✅ `src/services/enhancedIGDBService.ts:36-44` (in baseFields)
- ✅ `netlify/functions/igdb-search.cjs:134,153,156`
- ✅ All priority franchise sync queries

### Phase 3: Apply Filtering

**For ALL platform transformations, replace:**

```typescript
// OLD
platforms: igdbGame.platforms?.map(p => p.name) || null

// NEW
import { filterReleasedPlatforms } from '../utils/igdbPlatformFilter';
platforms: filterReleasedPlatforms(igdbGame)
```

**JavaScript files (scripts, Netlify functions):**

```javascript
// For .js/.cjs files, create a parallel utility or inline the function
// Option 1: Inline (for scripts)
function filterReleasedPlatforms(igdbGame) {
  if (!igdbGame.platforms || igdbGame.platforms.length === 0) return null;
  if (!igdbGame.release_dates || igdbGame.release_dates.length === 0) {
    return igdbGame.platforms.map(p => p.name);
  }

  const releasedPlatformIds = new Set(
    igdbGame.release_dates.filter(rd => rd.status === 0).map(rd => rd.platform)
  );

  if (releasedPlatformIds.size === 0) {
    return igdbGame.platforms.map(p => p.name);
  }

  return igdbGame.platforms
    .filter(p => releasedPlatformIds.has(p.id))
    .map(p => p.name);
}

// Option 2: Create utils/igdbPlatformFilter.js for CommonJS files
```

### Phase 4: Update TypeScript Interfaces

**File:** `src/services/igdbServiceV2.ts` (and other service files)

Add `release_dates` to the `IGDBGame` interface:

```typescript
export interface IGDBGame {
  id: number;
  name: string;
  // ... existing fields ...
  platforms?: Array<{
    id: number;
    name: string;
  }>;
  release_dates?: Array<{
    platform: number;
    status: number;
    date?: number;
    human?: string;
    region?: number;
  }>;
  // ... rest of fields ...
}
```

### Phase 5: Testing

**Unit Tests:**
- ✅ Already created: `src/test/goldeneye-platform-unit.test.ts`
- Add tests for the new utility function

**Integration Tests:**
- ✅ Already created: `src/test/goldeneye-platform-investigation.test.ts`
- Run with `netlify dev` to test real IGDB API

**Validation:**
1. Run sync with dry-run: `npm run sync-igdb:dry`
2. Check that Goldeneye shows only N64
3. Check other known affected games (Perfect Dark, Star Fox 2)
4. Verify no games lost all platforms

---

## Rollout Strategy

### Step 1: Low-Risk Testing
1. Create utility function with comprehensive tests
2. Update ONE service (e.g., `igdbServiceV2.ts`) as pilot
3. Test search results for affected games
4. Validate no breaking changes

### Step 2: Sync Script Update
1. Update `scripts/sync-igdb.js` query + transformation
2. Run dry-run sync to validate
3. Run real sync on small batch (limit 10)
4. Verify database entries are correct

### Step 3: Service Layer Rollout
1. Update remaining TypeScript services
2. Run full test suite
3. Test search, game pages, user flows

### Step 4: Function Layer Rollout
1. Update Netlify functions
2. Deploy to staging/preview
3. Test API responses
4. Deploy to production

### Step 5: Database Migration (Optional)
Consider migrating existing incorrect data:
```sql
-- Find potentially affected games
SELECT id, name, platforms, igdb_id
FROM game
WHERE platforms IS NOT NULL
  AND igdb_id IS NOT NULL
  AND array_length(platforms, 1) > 1
ORDER BY name;
```

Then re-fetch and update using the sync script with fixed logic.

---

## Alternatives Considered

### Option B: Filter in IGDB Function (Netlify)
**Approach:** Add filtering logic directly in `netlify/functions/igdb-search.cjs`

**Pros:**
- Single point of filtering before data leaves API
- Services don't need to know about release_dates

**Cons:**
- ❌ Doesn't help sync scripts (they call the function but need their own logic)
- ❌ Harder to test (requires function deployment)
- ❌ Couples API layer with business logic

**Verdict:** Not recommended. Services and scripts still need access to filtering logic.

### Option C: Database-Side Filtering
**Approach:** Store all platforms, filter in SQL queries

**Pros:**
- Could retroactively fix historical data

**Cons:**
- ❌ Requires storing release_dates in database (complex schema change)
- ❌ Doesn't prevent bad data from being synced
- ❌ Multiple sources of truth

**Verdict:** Not practical. Better to prevent bad data at source.

---

## Summary & Recommendation

**Recommended Approach:** Option A - Centralized Filtering

**Implementation Checklist:**
- [ ] Create `src/utils/igdbPlatformFilter.ts` with comprehensive tests
- [ ] Update IGDB queries to include `release_dates` (10+ locations)
- [ ] Replace platform transformations with utility function (10+ locations)
- [ ] Update TypeScript interfaces for `release_dates`
- [ ] Run integration tests with real IGDB API
- [ ] Deploy and validate in production

**Estimated Effort:** 3-4 hours for complete implementation + testing

**Risk Level:** Low
- Utility function is well-tested
- Changes are localized and follow existing patterns
- Fallback logic prevents data loss

**Expected Outcome:**
- Goldeneye shows only "Nintendo 64" (not SNES)
- All games show only platforms where they were actually released
- Cleaner, more accurate platform data across entire app
