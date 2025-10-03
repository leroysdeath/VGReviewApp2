# Platform Filtering Risk Analysis

## Your Concerns (Valid!)

### Concern 1: Would This Filter Out Upcoming Games?
**Short Answer:** Depends on which status codes we exclude.

**IGDB Status Codes:**
```
0 = Released       ✅ (actual release)
1 = Alpha          ⚠️  (in development, might have release date)
2 = Beta           ⚠️  (in development, might have release date)
3 = Early Access   ⚠️  (playable but not final)
4 = Offline        ❌ (no longer available)
5 = Cancelled      ❌ (never released)
6 = Rumored        ❌ (never confirmed)
7 = Delisted       ⚠️  (was released, now removed)
```

**Example Scenarios:**

**Scenario A: GTA VI (Announced for 2025)**
- Likely has platforms with status `0` (Released) because IGDB considers "announced with release date" as released
- OR might have no `release_dates` at all yet (just platforms)
- **Risk with strict filtering:** LOW - Announced games typically don't have release_dates until closer to launch

**Scenario B: Hades (Was Early Access, Now Released)**
- PC probably has status `3` (Early Access) for initial release
- PC should ALSO have status `0` (Released) for full release
- Multiple release_dates per platform is normal
- **Risk with strict filtering:** LOW if we check for ANY status 0, not ALL

**Scenario C: Goldeneye SNES Port (Never Released)**
- SNES has status `6` (Rumored)
- N64 has status `0` (Released)
- **This is what we want to filter**

### Concern 2: False Positives (Filtering Valid Games)
**This is the real risk.** History shows over-aggressive filtering breaks things.

**Potential False Positives:**

1. **Games with no `release_dates` data in IGDB**
   - IGDB data is incomplete for some games
   - If we filter to "status 0 only" and game has no release_dates, we'd lose all platforms
   - **Mitigation:** Fallback to ALL platforms if no release_dates

2. **Early Access games still in development**
   - Might only have status `3` (Early Access), not status `0`
   - Example: Valheim on PC during Early Access period
   - **Mitigation:** Don't exclude status 3 (Early Access)

3. **Delisted games that were real releases**
   - Example: P.T. (Silent Hills demo) - was real, now delisted
   - Status `7` (Delisted)
   - **Mitigation:** Don't exclude status 7 (Delisted)

4. **Regional releases with different statuses**
   - Game might be released in Japan (status 0) but cancelled in US (status 5)
   - Same platform, different release_dates entries
   - **Mitigation:** Include platform if ANY release_date has status 0

---

## Safer Filtering Strategies

### Strategy 1: CONSERVATIVE (Exclude Only Rumored)
**Filter:** `status !== 6`

**What gets excluded:**
- ❌ Rumored platforms (status 6)

**What stays:**
- ✅ Released (0)
- ✅ Alpha/Beta (1, 2)
- ✅ Early Access (3)
- ✅ Offline (4)
- ✅ Cancelled (5) ⚠️ This might be wrong!
- ✅ Delisted (7)

**Pros:**
- Very safe, minimal false positives
- Only removes pure rumors
- Keeps all real development/releases

**Cons:**
- Keeps cancelled platforms (status 5)
- Example: Star Fox 2 SNES (cancelled in 1995) would NOT be filtered

**Verdict:** Too conservative, doesn't solve cancelled games problem.

---

### Strategy 2: MODERATE (Exclude Rumored + Cancelled)
**Filter:** `status !== 5 && status !== 6`

**What gets excluded:**
- ❌ Cancelled (5)
- ❌ Rumored (6)

**What stays:**
- ✅ Released (0)
- ✅ Alpha/Beta (1, 2)
- ✅ Early Access (3)
- ✅ Offline (4) ⚠️ Questionable
- ✅ Delisted (7)

**Pros:**
- Fixes Goldeneye SNES (rumored)
- Fixes cancelled platform ports
- Keeps Early Access and in-development games
- Keeps delisted games (they were real)

**Cons:**
- Keeps "Offline" (status 4) - unclear what this means in practice

**Verdict:** ⭐ **RECOMMENDED** - Good balance of safety and accuracy.

---

### Strategy 3: STRICT (Include Only Released + Active Development)
**Filter:** `status === 0 || status === 3`

**What gets included:**
- ✅ Released (0)
- ✅ Early Access (3)

**What gets excluded:**
- ❌ Everything else (1, 2, 4, 5, 6, 7)

**Pros:**
- Very clean data
- Only confirmed real releases

**Cons:**
- Excludes Alpha/Beta (1, 2) - might be legitimate upcoming releases
- Excludes Delisted (7) - were real releases, now removed
- Risk of false positives if IGDB data is incomplete

**Verdict:** Too aggressive, risk of losing valid games.

---

### Strategy 4: SMART (Multi-Condition Logic)
**Filter:** Include platform if ANY of these conditions:
- Platform has at least one release_date with status 0 (Released)
- Platform has at least one release_date with status 3 (Early Access)
- Platform has at least one release_date with status 7 (Delisted)
- **AND** platform has NO release_dates with status 6 (Rumored) as the ONLY status

**Pseudocode:**
```javascript
function shouldIncludePlatform(platformId, releaseDates) {
  const platformReleases = releaseDates.filter(rd => rd.platform === platformId);

  // No release dates for this platform - include by default (safe fallback)
  if (platformReleases.length === 0) return true;

  // Has any released, early access, or delisted - include
  const hasValidRelease = platformReleases.some(rd =>
    rd.status === 0 || rd.status === 3 || rd.status === 7
  );
  if (hasValidRelease) return true;

  // Only has rumored or cancelled - exclude
  const onlyBadStatuses = platformReleases.every(rd =>
    rd.status === 5 || rd.status === 6
  );
  if (onlyBadStatuses) return false;

  // For other cases (Alpha, Beta, Offline) - include by default
  return true;
}
```

**Pros:**
- Handles regional differences
- Safe fallbacks for incomplete data
- Flexible for edge cases

**Cons:**
- More complex logic
- Harder to explain and maintain

**Verdict:** Most robust but probably overkill.

---

## Recommended Implementation

### Phase 1: Start Conservative (Low Risk)

**Approach:** Strategy 2 (Exclude Rumored + Cancelled)

**Implementation:**
```typescript
export function filterReleasedPlatforms(igdbGame: IGDBGameWithPlatforms): string[] | null {
  if (!igdbGame.platforms || igdbGame.platforms.length === 0) {
    return null;
  }

  // No release_dates - keep all platforms (safe fallback)
  if (!igdbGame.release_dates || igdbGame.release_dates.length === 0) {
    console.warn(`⚠️  Game "${igdbGame.name}" has no release_dates - keeping all platforms`);
    return igdbGame.platforms.map(p => p.name);
  }

  // Get platforms that are NOT rumored or cancelled
  const validPlatformIds = new Set(
    igdbGame.release_dates
      .filter(rd => rd.status !== 5 && rd.status !== 6)  // Exclude Cancelled & Rumored
      .map(rd => rd.platform)
  );

  // If all platforms are rumored/cancelled, keep them (edge case protection)
  if (validPlatformIds.size === 0) {
    console.warn(`⚠️  Game "${igdbGame.name}" has only rumored/cancelled platforms - keeping all`);
    return igdbGame.platforms.map(p => p.name);
  }

  // Filter platforms
  return igdbGame.platforms
    .filter(p => validPlatformIds.has(p.id))
    .map(p => p.name);
}
```

**Why This is Safe:**
- ✅ Fixes Goldeneye SNES (rumored)
- ✅ Fixes cancelled platform ports
- ✅ Keeps Early Access games
- ✅ Keeps upcoming games (usually no release_dates yet)
- ✅ Fallback for incomplete IGDB data
- ✅ Keeps delisted games (were real releases)

### Phase 2: Monitor and Adjust

After deploying, monitor for issues:

1. **Check for lost platforms:**
   ```sql
   -- Find games that lost all platforms
   SELECT id, name, platforms, igdb_id
   FROM game
   WHERE platforms IS NULL OR array_length(platforms, 1) = 0
     AND igdb_id IS NOT NULL;
   ```

2. **Check specific known games:**
   - GTA VI (should have platforms even though unreleased)
   - Hades (should have PC)
   - Goldeneye (should have N64 only, not SNES)
   - Star Fox 2 (should have Switch only, not original SNES)

3. **Adjust filtering if needed:**
   - If we see false positives, make filtering more conservative
   - If we see too many rumored platforms, make filtering stricter

---

## Alternative: Conservative Start (No Filtering)

### Option: Fix Only Obvious Cases

Instead of filtering ALL games, we could:

1. **Create a manual exclusion list:**
   ```typescript
   const KNOWN_RUMORED_PLATFORMS = {
     113: { exclude: [6] },  // Goldeneye: exclude SNES (platform 6)
     // Add more as discovered
   };
   ```

2. **Pros:**
   - Zero risk of false positives
   - Surgical fixes for known issues

3. **Cons:**
   - Doesn't scale
   - Requires manual discovery and maintenance
   - New syncs will still get bad data

**Verdict:** Not recommended. The problem is systematic, not just a few games.

---

## Final Recommendation

### Start with Strategy 2 (Moderate Filtering)

**Exclude:** Status 5 (Cancelled) and Status 6 (Rumored)
**Keep:** Everything else

**Rationale:**
1. Solves the Goldeneye problem (rumored platforms)
2. Solves cancelled platform problems
3. Low risk of false positives due to fallback logic
4. Easy to make more conservative if issues arise
5. Can be monitored and adjusted based on real data

**Implementation Steps:**
1. Deploy filtering utility with Strategy 2
2. Run sync dry-run and validate sample of games
3. Deploy to production
4. Monitor for any games losing platforms incorrectly
5. Adjust if needed (can always make more conservative)

**Escape Hatch:**
If we see ANY false positives, we can immediately:
- Revert to keeping all platforms (current behavior)
- Add specific game ID exceptions
- Adjust filtering logic to be more conservative

The key is: **We have fallback logic** for games with no release_dates, so we can't make things worse than they are now.

---

## Questions to Answer Before Implementing

1. **Do we have examples of games in our DB with incorrect platforms?**
   - Run: `SELECT name, platforms FROM game WHERE name ILIKE '%goldeneye%';`
   - Check: Does Goldeneye show SNES?

2. **Can we test with a small batch first?**
   - Sync 10 games with new logic
   - Manually verify platforms are correct
   - Only then roll out to all services

3. **Do we want to fix historical data?**
   - Re-sync existing games with corrected logic?
   - Or only apply to new syncs going forward?

**My recommendation:** Test with sync script first (small batch), verify results, then roll out to services.
