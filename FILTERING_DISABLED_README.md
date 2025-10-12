# ⚠️ FILTERING DISABLED - 2025-01-10

All game category filtering has been temporarily disabled to allow comprehensive database backfill.

## What Was Changed

### 1. IGDB API Functions (Server-Side)
**Files Modified:**
- `netlify/functions/igdb-search.cjs:153-155`
- `netlify/functions/igdb-search-detailed.cjs:110`
- `netlify/functions/igdb-search-autocomplete.cjs:106`

**Old Filter:**
```
where category = (0,4,8,9,10,11) & version_parent = null;
```

**Current State:**
```
/* ⚠️ FILTERING DISABLED 2025-01-10 - OLD: where category = (0,4,8,9,10,11) & version_parent = null; */
```

**Impact:** IGDB API now returns ALL game categories including:
- Category 1 (DLC/Add-ons)
- Category 2 (Expansions)
- Category 3 (Bundles)
- Category 5 (Mods)
- Category 6 (Episodes)
- Category 7 (Seasons)
- Category 11 (Ports) - **Previously filtered by version_parent**
- Category 12 (Forks)
- Category 13 (Packs)
- Category 14 (Updates)

---

### 2. Client-Side Content Filtering
**File:** `src/utils/contentProtectionFilter.ts`

**Feature Flag:** `ENABLE_CONTENT_FILTERING = false` - Line 6
**Function:** `filterFanGamesAndEReaderContent()` - Line 975 (early return added)
**Function:** `filterProtectedContent()` - Line 1127 (early return added)

**Changes Made:**
```typescript
// Line 6
const ENABLE_CONTENT_FILTERING = false;

// Line 975 (filterFanGamesAndEReaderContent)
if (!ENABLE_CONTENT_FILTERING) return games;

// Line 1127 (filterProtectedContent)
if (!ENABLE_CONTENT_FILTERING) return games;
```

**Impact:** Client-side filtering now bypassed - all games returned unfiltered

---

### 3. Sync Script
**File:** `scripts/sync-igdb.js:206-208`

**Old Filter:**
```javascript
where updated_at > ${timestamp} & category = 0;
```

**Current State:**
```javascript
// ⚠️ FILTERING DISABLED 2025-01-10: Removed "& category = 0" to sync all game categories
// TO RESTORE: Add back "& category = 0" after "updated_at > ${timestamp}"
where updated_at > ${timestamp};
```

**Impact:** Sync script will now pull ALL game categories from IGDB, not just category 0 (main games)

---

## How to Restore Filtering

### Quick Restore (IGDB API Only)

**File:** `netlify/functions/igdb-search.cjs:155`
```javascript
// Change from:
requestBody = `fields ...; search "${query.trim()}"; limit ${limit};`;

// Back to:
requestBody = `fields ...; search "${query.trim()}"; limit ${limit}; where category = (0,4,8,9,10,11) & version_parent = null;`;
```

Repeat for:
- `netlify/functions/igdb-search-detailed.cjs:110`
- `netlify/functions/igdb-search-autocomplete.cjs:106`

### Full Restore (All Filtering)

1. **IGDB API**: Restore `where` clauses as shown above (3 files)
2. **Client Filter**: Set `ENABLE_CONTENT_FILTERING = true` in `contentProtectionFilter.ts:6`
3. **Sync Script**: Add back `& category = 0` after `updated_at > ${timestamp}` in `scripts/sync-igdb.js:208`

**Note:** All changes are marked with `⚠️ FILTERING DISABLED 2025-01-10` comments for easy restoration

---

## Expected Results

### Games Now Visible

| Category | Type | Example Games |
|----------|------|---------------|
| 11 (Port) | Console ports | **Pikmin 1+2 (Switch)**, Persona 5 Royal (PC) |
| 2 (Expansion) | Major DLC | Witcher 3: Blood and Wine, Elden Ring DLC |
| 3 (Bundle) | Collections | Master Chief Collection, Borderlands Collection |
| 1 (DLC) | Add-ons | Cosmetic packs, weapon packs, season passes |
| 5 (Mod) | Mods | Counter-Strike, Dota 2 (originally mods) |

### Database Growth Estimate

- **Current**: 185K games
- **After Backfill**: ~210K-230K games (+25K-45K)
- **Breakdown**:
  - Ports (11): +15,000
  - Expansions (2): +3,000
  - Bundles (3): +2,000
  - DLC (1): +20,000
  - Other: +5,000

---

## Next Steps

1. ✅ Disable IGDB API filters (DONE)
2. ✅ Disable client-side filters (DONE)
3. ✅ Update sync script (DONE)
4. ⏳ Run comprehensive backfill
5. ⏳ Verify missing games now appear (Pikmin 1+2, GoldenEye N64)
6. ⏳ Monitor search quality
7. ⏳ Re-enable selective filtering if needed

---

## Rollback Plan

If search quality degrades significantly:

**Immediate** (within hours):
- Restore IGDB API filters only
- Keep database as-is (backfilled data remains)
- Add client-side quality filters

**Later** (within days):
- Review problematic content
- Implement graduated filtering (NONE/MINIMAL/MODERATE/AGGRESSIVE)
- Use manual override flags (greenlight/redlight)

---

**Date Disabled**: 2025-01-10
**Reason**: Missing legitimate games (Pikmin 1+2, GoldenEye N64)
**Expected Duration**: 1-2 weeks for evaluation
