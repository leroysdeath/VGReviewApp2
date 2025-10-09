# 📊 Search Ranking Improvement Plan

**Goal:** Get most liked, viewed, and highest-rated games appearing first in search results using data from our site, IGDB, and other sources.

**Date Created:** 2025-10-08
**Status:** Planning Phase
**Priority:** High

---

## Current State Analysis

### Data Available for Ranking

#### IGDB API Data (External):
- `rating` / `total_rating` (0-100, critic + user ratings)
- `total_rating_count` / `rating_count` (number of reviews)
- `follows` (user follows on IGDB)
- `hypes` (pre-release buzz)
- `first_release_date` (age/recency)
- `category` (main game vs DLC vs mod)
- `developer` / `publisher` (for official game detection)

#### Internal Database (Our Site):
- `avg_user_rating` (1-10 scale from rating table)
- `user_rating_count` (count from rating table)
- `view_count` (game page views)
- `game_views` table (privacy-compliant tracking)
- `content_like` table (review/comment likes)
- Rating table engagement metrics

#### Existing Systems:
- ✅ `gamePrioritization.ts` - 6-tier system (Flagship → Low tier)
- ✅ Category filtering (removes seasons, updates, etc.)
- ✅ Content protection filters (removes problematic content)
- ✅ Fuzzy matching for relevance

### Current Problems
1. **Ranking uses only IGDB data** - ignores our site's popularity signals
2. **No view count integration** - popular games on our site don't rank higher
3. **No cross-source weighting** - treats all signals equally
4. **Official games not prioritized in sorting** - mods can outrank official releases
5. **No A/B testing capability** - can't validate improvements

---

## 🎯 Proposed Solution: Hybrid Popularity Score with Official Game Priority

### Two-Phase Ranking System

#### Phase 1: Official Game Tier Classification
**Purpose:** Ensure official games always rank above unofficial content

```typescript
Official Game Tiers (applied FIRST):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tier 0 (Flagship):   +10000 pts  // Iconic games (existing)
Tier 1 (Famous):      +8000 pts   // Industry-defining games
Tier 2 (Sequel):      +6000 pts   // Acclaimed series entries
Tier 3 (Official):    +4000 pts   // Official releases from verified publishers
Tier 4 (DLC):         +2000 pts   // Official expansions/DLC
Tier 5 (Community):   +500 pts    // Mod-friendly publisher content
Tier 6 (Unofficial):  +0 pts      // Fan mods, unofficial content
```

**Detection Logic:**
```typescript
isOfficialGame(game) {
  // Check developer/publisher against known first-party studios
  const hasOfficialPublisher = KNOWN_PUBLISHERS.includes(game.publisher)
  const hasOfficialDeveloper = KNOWN_DEVELOPERS.includes(game.developer)

  // Check category (0 = main game, 1/2 = official DLC)
  const isMainGame = game.category === 0
  const isOfficialDLC = game.category === 1 || game.category === 2

  // Check IGDB metrics (official games have higher engagement)
  const hasHighEngagement = game.follows > 100 || game.rating_count > 10

  return (hasOfficialPublisher || hasOfficialDeveloper) &&
         (isMainGame || isOfficialDLC) &&
         hasHighEngagement
}
```

#### Phase 2: Hybrid Popularity Score (within each tier)
**Purpose:** Rank games within the same official tier by popularity/quality

```typescript
Final Score = (
  Official_Tier_Bonus +         // 0-10000 pts (tier classification)
  IGDB_Score × 0.40 +           // External authority (40%)
  Internal_Score × 0.35 +       // Our community (35%)
  Quality_Score × 0.15 +        // Rating quality (15%)
  Recency_Bonus × 0.10          // Release recency (10%)
)
```

### Component Calculations

#### 1. Official Tier Bonus (0-10000 pts)
```typescript
official_tier_bonus =
  if (isFlagshipGame) 10000              // Zelda BOTW, Mario Odyssey, etc.
  else if (isFamousGame) 8000            // Industry classics
  else if (isFamousSeriesGame) 6000      // Sequel to famous game
  else if (isOfficialGame) 4000          // Verified official release
  else if (isOfficialDLC) 2000           // Official expansion
  else if (isModFriendly) 500            // Bethesda/Valve mods
  else 0                                  // Fan content
```

#### 2. IGDB Score (0-100)
```typescript
igdb_score = (
  (total_rating || igdb_rating || 0) × 0.50 +        // Rating weight
  Math.min(follows / 1000, 100) × 0.30 +             // Follows (capped at 100k)
  Math.min(rating_count × 5, 100) × 0.20             // Review count (capped at 20)
)
```

#### 3. Internal Score (0-100)
```typescript
internal_score = (
  (avg_user_rating / 10 × 100) × 0.40 +              // Our ratings (1-10 → 0-100)
  Math.min(user_rating_count / 50, 100) × 0.30 +    // Our review count (capped at 5000)
  Math.min(view_count / 500, 100) × 0.30             // Page views (capped at 50k)
)

// Fallback if no internal data: use IGDB data
if (user_rating_count === 0 && view_count === 0) {
  internal_score = igdb_score × 0.7  // Reduce confidence
}
```

#### 4. Quality Score (0-100)
```typescript
quality_score = (
  rating_consistency × 0.50 +                         // IGDB vs internal agreement
  review_depth_score × 0.30 +                         // Review length/detail
  engagement_rate × 0.20                              // Likes per view ratio
)

// Rating consistency (0-100)
rating_consistency =
  if (both ratings exist) {
    igdb_normalized = total_rating  // 0-100
    internal_normalized = avg_user_rating × 10  // 1-10 → 10-100
    consistency = 100 - Math.abs(igdb_normalized - internal_normalized)
  } else {
    50  // Neutral if only one source
  }

// Review depth (0-100)
review_depth_score =
  avg_review_length = average(reviews.map(r => r.length))
  Math.min(avg_review_length / 500, 100)  // Cap at 500 chars

// Engagement rate (0-100)
engagement_rate =
  if (view_count > 0) {
    (total_likes / view_count) × 100
  } else {
    0
  }
```

#### 5. Recency Bonus (0-20)
```typescript
years_since_release = (now - first_release_date) / YEAR_IN_SECONDS

recency_bonus =
  if (years < 1) 20        // Brand new (2024+)
  else if (years < 3) 15   // Recent (2022-2023)
  else if (years < 5) 10   // Modern (2020-2021)
  else if (years < 10) 5   // Current gen (2015-2019)
  else 0                    // Classic (no penalty, no bonus)
```

---

## 📋 Implementation Plan

### Phase 1: Data Preparation (30 min)
**Files to Create/Modify:**
- `src/services/gameDataEnrichment.ts` (NEW)
- `src/services/gameMetricsService.ts` (NEW)

**Tasks:**
1. ✅ Create enriched game data fetcher combining IGDB + internal data
2. ✅ Add view count aggregation query from `game_views` table
3. ✅ Add engagement metrics (likes from `content_like`, reviews from `rating`)
4. ✅ Add official game detection (check against known publishers/devs)
5. ✅ Cache enriched data (1 hour TTL) to avoid DB hammering

**Code Example:**
```typescript
// src/services/gameDataEnrichment.ts
export async function enrichGameWithInternalData(game: IGDBGame) {
  const [ratings, views, likes] = await Promise.all([
    supabase
      .from('rating')
      .select('rating, review')
      .eq('game_id', game.id),
    supabase
      .from('game_views')
      .select('view_count')
      .eq('game_id', game.id)
      .single(),
    supabase
      .from('content_like')
      .select('id')
      .eq('game_id', game.id)
  ]);

  return {
    ...game,
    avg_user_rating: calculateAverage(ratings.data?.map(r => r.rating)),
    user_rating_count: ratings.data?.length || 0,
    view_count: views.data?.view_count || 0,
    total_likes: likes.data?.length || 0,
    review_depth: calculateAverageReviewLength(ratings.data),
  };
}
```

### Phase 2: Official Game Detection (30 min)
**Files to Create/Modify:**
- `src/utils/officialGameDetection.ts` (NEW)
- `src/utils/gamePrioritization.ts` (MODIFY - integrate with existing tiers)

**Tasks:**
1. ✅ Create database of known official publishers/developers
2. ✅ Implement tier classification logic
3. ✅ Integrate with existing `calculateGamePriority()` function
4. ✅ Add debug logging for tier assignments

**Code Example:**
```typescript
// src/utils/officialGameDetection.ts
const OFFICIAL_PUBLISHERS = [
  'Nintendo', 'Sony', 'Microsoft', 'Square Enix', 'Capcom',
  'Bandai Namco', 'Ubisoft', 'Electronic Arts', 'Activision',
  'Bethesda', 'CD Projekt', 'Rockstar Games', 'Valve',
  // ... comprehensive list
];

const FIRST_PARTY_STUDIOS = {
  'Nintendo': ['Nintendo EPD', 'Retro Studios', 'Monolith Soft'],
  'Sony': ['Naughty Dog', 'Santa Monica Studio', 'Insomniac'],
  'Microsoft': ['343 Industries', 'Turn 10 Studios', 'Rare'],
  // ... etc
};

export function detectOfficialTier(game: Game): OfficialTier {
  // Use existing flagship/famous detection
  if (isFlagshipGame(game)) return OfficialTier.FLAGSHIP;
  if (isFamousGame(game)) return OfficialTier.FAMOUS;
  if (isFamousSeriesGame(game)) return OfficialTier.SEQUEL;

  // New: Check for official releases
  const isOfficial = isOfficialPublisher(game.publisher) ||
                     isOfficialDeveloper(game.developer);
  const isMainGame = game.category === 0;
  const isDLC = game.category === 1 || game.category === 2;

  if (isOfficial && isMainGame) return OfficialTier.OFFICIAL;
  if (isOfficial && isDLC) return OfficialTier.OFFICIAL_DLC;

  // Check mod-friendly publishers
  if (isModFriendlyPublisher(game.publisher)) {
    return OfficialTier.COMMUNITY;
  }

  return OfficialTier.UNOFFICIAL;
}
```

### Phase 3: Scoring Algorithm (45 min)
**Files to Create:**
- `src/utils/enhancedRanking.ts` (NEW)

**Tasks:**
1. ✅ Implement hybrid score calculator with all 5 components
2. ✅ Add fallbacks for missing data (games with no internal metrics)
3. ✅ Add debug logging for score breakdown
4. ✅ Export scoring functions for testing

**Code Example:**
```typescript
// src/utils/enhancedRanking.ts
export interface RankingScore {
  finalScore: number;
  officialTierBonus: number;
  igdbScore: number;
  internalScore: number;
  qualityScore: number;
  recencyBonus: number;
  breakdown: string[];  // Human-readable explanations
}

export function calculateEnhancedRanking(
  game: EnrichedGame
): RankingScore {
  const officialTier = detectOfficialTier(game);
  const officialBonus = getOfficialTierBonus(officialTier);

  const igdbScore = calculateIGDBScore(game);
  const internalScore = calculateInternalScore(game);
  const qualityScore = calculateQualityScore(game);
  const recencyBonus = calculateRecencyBonus(game);

  const finalScore =
    officialBonus +
    igdbScore * 0.40 +
    internalScore * 0.35 +
    qualityScore * 0.15 +
    recencyBonus * 0.10;

  return {
    finalScore,
    officialTierBonus: officialBonus,
    igdbScore,
    internalScore,
    qualityScore,
    recencyBonus,
    breakdown: generateBreakdown(...)
  };
}
```

### Phase 4: Integration (30 min)
**Files to Modify:**
- `src/services/igdbServiceV2.ts`
- `src/hooks/useGameSearch.ts`

**Tasks:**
1. ✅ Modify `applyPrioritization()` in igdbServiceV2 to use enhanced ranking
2. ✅ Enrich games with internal data before scoring
3. ✅ Sort by enhanced score after existing filters
4. ✅ Preserve existing content protection and category filtering

**Code Example:**
```typescript
// src/services/igdbServiceV2.ts
private async applyEnhancedRanking(games: IGDBGame[]): Promise<IGDBGame[]> {
  // Enrich with internal data
  const enrichedGames = await Promise.all(
    games.map(game => enrichGameWithInternalData(game))
  );

  // Calculate scores
  const gamesWithScores = enrichedGames.map(game => ({
    ...game,
    _rankingScore: calculateEnhancedRanking(game)
  }));

  // Sort by final score (descending)
  return gamesWithScores.sort((a, b) =>
    b._rankingScore.finalScore - a._rankingScore.finalScore
  );
}
```

### Phase 5: Diagnostic Mode (45 min)
**Files to Modify:**
- `src/pages/SearchResultsPage.tsx`

**Tasks:**
1. ✅ Add `?ranking=debug` URL parameter support
2. ✅ Display score breakdown when enabled
3. ✅ Show: Official tier, IGDB score, Internal score, Quality, Recency, Final
4. ✅ Color-code components for easy analysis
5. ✅ Add toggle button to enable/disable without URL change

**UI Design:**
```typescript
{isDebugMode && game._rankingScore && (
  <div className="mt-2 p-3 bg-gray-800/50 rounded text-xs">
    <div className="font-bold mb-2">
      📊 Ranking Score: {game._rankingScore.finalScore.toFixed(1)}
    </div>

    <div className="grid grid-cols-2 gap-2">
      <div className="bg-purple-900/30 p-2 rounded">
        <div className="text-purple-300">Official Tier</div>
        <div className="font-bold">+{game._rankingScore.officialTierBonus}</div>
      </div>

      <div className="bg-blue-900/30 p-2 rounded">
        <div className="text-blue-300">IGDB Score</div>
        <div className="font-bold">{game._rankingScore.igdbScore.toFixed(1)}</div>
      </div>

      <div className="bg-green-900/30 p-2 rounded">
        <div className="text-green-300">Internal Score</div>
        <div className="font-bold">{game._rankingScore.internalScore.toFixed(1)}</div>
      </div>

      <div className="bg-yellow-900/30 p-2 rounded">
        <div className="text-yellow-300">Quality Score</div>
        <div className="font-bold">{game._rankingScore.qualityScore.toFixed(1)}</div>
      </div>
    </div>

    <div className="mt-2 text-gray-400">
      {game._rankingScore.breakdown.map((line, i) => (
        <div key={i}>• {line}</div>
      ))}
    </div>
  </div>
)}
```

### Phase 6: Testing & Validation (60 min)
**Files to Create:**
- `src/test/enhanced-ranking.test.ts` (NEW)
- `scripts/test-search-ranking.js` (NEW)

**Tasks:**
1. ✅ Create unit tests for scoring functions
2. ✅ Test edge cases (no internal data, no IGDB data, brand new games)
3. ✅ Compare old vs new ranking for popular searches
4. ✅ Verify official games always outrank unofficial
5. ✅ Performance test with 200+ games

---

## 🧪 Test Cases

### Test 1: Official Game Priority
**Search:** "mario"
**Expected Behavior:**
```
1. Super Mario Odyssey (Official Tier + High scores)
2. Super Mario 64 (Official Tier + Classic)
3. Mario Kart 8 Deluxe (Official Tier + Popular)
...
19. Mario Fan Game X (Unofficial Tier)
20. Mario ROM Hack Y (Unofficial Tier)
```

### Test 2: Franchise Search with Official Priority
**Search:** "zelda"
**Expected Behavior:**
- Top 10: All official Nintendo Zelda games
- Ranked by: BOTW/TOTK > Ocarina/Majora > Skyward Sword > Remakes > Ports
- Bottom: Fan games, ROM hacks (if any pass filters)

### Test 3: View Count Priority (Within Same Tier)
**Setup:** Two official games, one has 5k views (our site), one has 500
**Expected:** Higher view count game ranks higher (all else equal)

### Test 4: New Release Boost (Within Same Tier)
**Setup:** New Zelda game (2024) vs older Zelda (2017), similar ratings
**Expected:** 2024 game ranks higher due to recency bonus

### Test 5: Rating Consistency Bonus
**Setup:** Game rated 90 on IGDB, 9.0 on our site (consistent)
**Expected:** Gets quality score boost, ranks higher than inconsistent game

### Test 6: No Internal Data Fallback
**Setup:** Brand new game with IGDB data but no reviews/views on our site
**Expected:** Uses IGDB score × 0.7 for internal score, still ranks reasonably

### Test 7: Mod from Mod-Friendly Publisher
**Setup:** Skyrim mod (Bethesda is mod-friendly)
**Expected:** Ranks in Community Tier (above unofficial mods, below official)

---

## 🎨 Diagnostic UI Example

When `?ranking=debug` is enabled:

```
┌─────────────────────────────────────────────┐
│ The Legend of Zelda: Tears of the Kingdom  │
│ [Cover Image]                               │
├─────────────────────────────────────────────┤
│ 📊 RANKING BREAKDOWN                        │
│ Final Score: 10,287.5                       │
│                                             │
│ Official Tier:  Flagship      +10,000 pts  │
│ IGDB Score:     95.2 (40%)    +38.1 pts    │
│ Internal:       89.3 (35%)    +31.3 pts    │
│ Quality:        92.0 (15%)    +13.8 pts    │
│ Recency:        20.0 (10%)    +4.3 pts     │
│                                             │
│ Details:                                    │
│ • IGDB: 96 rating, 125k follows, 2.8k reviews │
│ • Internal: 9.2 avg, 1,234 reviews, 45k views │
│ • Consistency: 96% (IGDB 96 ≈ Internal 92)  │
│ • Engagement: 8.7% like rate (3.9k/45k)    │
│ • Released: May 2023 (1.4 years ago)       │
└─────────────────────────────────────────────┘
```

---

## 🚦 Success Criteria

### Must-Have (Blocking Launch)
- [x] Official games rank above unofficial games in all searches
- [x] Popular games on our site (high views) rank higher
- [x] Diagnostic mode shows accurate score breakdown
- [x] No performance regression (search < 500ms p95)
- [x] All existing filters still work (content protection, category)

### Should-Have (Nice to Have)
- [x] Recent releases get appropriate boost
- [x] Rating consistency rewarded
- [x] Graceful fallback when internal data missing
- [x] Unit test coverage >80%

### Could-Have (Future Iteration)
- [ ] A/B test weight adjustments
- [ ] User feedback on result quality
- [ ] Machine learning for optimal weights
- [ ] Per-user personalization based on viewing history

---

## 🔧 Code Structure

```
src/
├── utils/
│   ├── enhancedRanking.ts              ← NEW: Hybrid scoring algorithm
│   ├── officialGameDetection.ts        ← NEW: Detect official vs unofficial
│   └── gamePrioritization.ts           ← MODIFY: Integrate with tiers
├── services/
│   ├── gameDataEnrichment.ts           ← NEW: Fetch internal metrics
│   ├── gameMetricsService.ts           ← NEW: Aggregate views/likes/ratings
│   ├── igdbServiceV2.ts                ← MODIFY: Add ranking call
│   └── searchService.ts                ← MODIFY: Pass through ranking
└── pages/
    └── SearchResultsPage.tsx            ← MODIFY: Add debug UI

test/
└── enhanced-ranking.test.ts             ← NEW: Unit tests

scripts/
└── test-search-ranking.js               ← NEW: Integration testing script

docs/
└── SEARCH_RANKING_IMPROVEMENT_PLAN.md   ← THIS FILE
```

---

## ⚠️ Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Internal data sparse for new games | High | Weight IGDB more heavily (60/40) if <10 internal reviews |
| View count manipulation | Medium | Cap view count contribution at 50k, monitor outliers |
| Algorithm too complex | Low | Keep debug mode, comprehensive unit tests |
| Breaks existing behavior | High | Feature flag, run side-by-side comparison first |
| Performance degradation | High | Cache enriched data (1hr TTL), batch DB queries |
| Official detection false positives | Medium | Require multiple signals (publisher + category + engagement) |
| Unofficial games rank too low | Low | Ensure recency/quality bonuses can still boost them |

---

## 📈 Monitoring & Iteration

### After Deploy: Week 1
1. Monitor search latency (target: <500ms p95)
2. Track top 10 game IDs for 20 most popular searches
3. Review diagnostic logs for games with unexpected rankings
4. Collect user feedback via feedback form

### After Deploy: Week 2-4
1. A/B test weight adjustments:
   - Test 40/35/15/10 vs 50/30/15/5
   - Test official tier bonuses (10k vs 5k for flagship)
2. Identify edge cases and refine
3. Monitor for view count manipulation patterns
4. Gather qualitative feedback from community

### Success Metrics (30 days)
- ✅ **90%+ official games in top 10** for franchise searches
- ✅ **30% increase** in "good result in top 5" (user survey)
- ✅ **Maintained performance** (<500ms p95 latency)
- ✅ **Positive community feedback** (>70% approval)
- ✅ **No spam in top 20** (manual review of top searches)

---

## 🚀 Rollout Strategy

### Stage 1: Silent Deploy (Debug Mode Only)
- Deploy code with `?ranking=debug` parameter
- Team tests internally for 2-3 days
- Collect feedback, fix issues
- **No user-visible changes yet**

### Stage 2: Soft Launch (10% of users)
- Enable for 10% of search traffic (feature flag)
- Monitor metrics closely
- A/B test against old ranking
- **Rollback if issues detected**

### Stage 3: Full Launch (100% of users)
- Enable for all users
- Keep debug mode available for power users
- Monitor for 1 week
- **Iterate based on feedback**

---

## 📝 Open Questions

1. **Weight Tuning:** Should IGDB or Internal score be weighted higher?
   - Initial: 40% IGDB, 35% Internal
   - Alternative: 50% IGDB, 30% Internal (more conservative)

2. **View Count Cap:** What's a reasonable cap to prevent manipulation?
   - Proposal: 50k views = 100 score (500 views per point)

3. **Recency Window:** Should very old games (<2000) get a penalty?
   - Current: No penalty for classics
   - Alternative: Small penalty for <1995 games to boost modern results

4. **Official Detection:** How strict should we be?
   - Current: Require (publisher OR developer) AND category AND engagement
   - Alternative: Just publisher/developer check (more inclusive)

5. **Mod Handling:** Should mods from official publishers (e.g., Bethesda-endorsed) rank higher?
   - Current: Community Tier (+500 pts)
   - Alternative: Official DLC Tier (+2000 pts) if endorsed

---

## 🎯 Next Steps

1. **Review this plan** - Get team approval on approach
2. **Create feature branch** - `feature/enhanced-search-ranking`
3. **Implement Phase 1** - Data preparation (30 min)
4. **Implement Phase 2** - Official game detection (30 min)
5. **Implement Phase 3** - Scoring algorithm (45 min)
6. **Implement Phase 4** - Integration (30 min)
7. **Implement Phase 5** - Diagnostic mode (45 min)
8. **Test extensively** - Unit + integration tests (60 min)
9. **Internal testing** - Team validates with debug mode (2-3 days)
10. **Soft launch** - 10% rollout with monitoring (1 week)
11. **Full launch** - 100% rollout (if metrics look good)

**Total Implementation Time:** ~4-5 hours of focused dev work
**Total Validation Time:** 2-3 weeks including testing and rollout

---

## 📚 References

- Existing code: `src/utils/gamePrioritization.ts` (6-tier system)
- Existing code: `src/services/igdbServiceV2.ts` (search implementation)
- Database schema: `supabase/migrations/20250911_add_igdb_metrics_columns.sql`
- Related docs: `docs/IGDB_SYNC.md` (data source documentation)

---

**Plan Version:** 1.0
**Last Updated:** 2025-10-08
**Next Review:** After Stage 1 completion
