# 📊 Secondary Data Source Analysis for Game Importance Scoring

## Executive Summary
As a data science expert, I've analyzed multiple secondary data sources to supplement IGDB for determining game importance. The goal is to find sources that provide sales data, cultural impact metrics, and community engagement signals that IGDB lacks.

## 🎯 Current Architecture Analysis

### How Your App Currently Works:
```
User Query → Supabase DB (fast, limited data) → IGDB API (if needed) → Results
```

**Performance Profile:**
- Supabase query: ~50-200ms
- IGDB API call: ~300-800ms  
- Total response: ~500-1000ms for mixed results

**Data Flow:**
1. Quick database check (your cached games)
2. IGDB supplement if < 10 results
3. Client-side filtering and sorting
4. No importance/popularity weighting beyond IGDB ratings

## 🔍 Secondary Data Source Options

### Option 1: **Wikidata/Wikipedia API** ✅ RECOMMENDED
**What it provides:**
- Sales figures (when available)
- Awards and accolades
- Cultural significance indicators
- Series/franchise relationships
- Cross-referenced with other databases

**Integration Approach:**
```javascript
// Lightweight client-side enrichment
async function enrichWithWikidata(games) {
  // Batch query using SPARQL
  const wikidataIds = await matchGamesToWikidata(games);
  const enrichedData = await getWikidataProperties(wikidataIds);
  return mergeEnrichmentData(games, enrichedData);
}
```

**Performance Impact:**
- Initial match: ~200ms (can be cached in Supabase)
- Property fetch: ~150ms (batch query)
- **Total added latency: ~350ms** (or 0ms if pre-cached)

**Pros:**
- FREE, no rate limits for reasonable use
- Reliable, Wikipedia won't disappear
- Rich cultural/historical data
- SPARQL allows complex queries

**Cons:**
- Not all games have entries
- Data quality varies
- Requires entity matching logic

**Implementation Strategy:**
```sql
-- Add to your Supabase schema
ALTER TABLE game ADD COLUMN wikidata_id VARCHAR(20);
ALTER TABLE game ADD COLUMN cultural_impact_score DECIMAL(3,2);
ALTER TABLE game ADD COLUMN sales_estimate INTEGER;
ALTER TABLE game ADD COLUMN awards_count INTEGER;

-- Pre-populate via background job
CREATE TABLE game_importance_cache (
  game_id INTEGER PRIMARY KEY,
  wikidata_id VARCHAR(20),
  sales_estimate INTEGER,
  awards TEXT[],
  cultural_score DECIMAL(3,2),
  last_updated TIMESTAMP DEFAULT NOW()
);
```

---

### Option 2: **Steam Web API + SteamSpy**
**What it provides:**
- Player counts (concurrent, peak)
- Ownership estimates
- Playtime statistics
- User review counts
- Price history

**Integration Approach:**
```javascript
// Server-side caching required
async function enrichWithSteam(games) {
  const steamIds = await matchToSteamAppIds(games);
  const steamData = await batchFetchSteamData(steamIds);
  return mergeSteamMetrics(games, steamData);
}
```

**Performance Impact:**
- Steam API: ~100ms per game (needs caching)
- SteamSpy: ~200ms (batch possible)
- **Total added latency: ~300ms** (0ms if cached)

**Pros:**
- Excellent PC game coverage
- Real player engagement metrics
- Active player counts = current relevance

**Cons:**
- PC-only (misses console exclusives)
- Rate limits (100k calls/day)
- Requires Steam App ID matching

---

### Option 3: **MobyGames API**
**What it provides:**
- Comprehensive game database
- User ratings across platforms
- Release history
- Credits and development info

**Performance Impact:**
- API calls: ~400ms
- Rate limited (360 requests/hour free tier)
- **Total added latency: ~400ms**

**Pros:**
- Covers all platforms
- Historical data for retro games
- Good for series chronology

**Cons:**
- Strict rate limits without paid plan
- Less "importance" data, more metadata

---

### Option 4: **RAWG Video Games Database API**
**What it provides:**
- Metacritic scores
- Reddit engagement metrics
- YouTube/Twitch presence
- "Added by users" counts

**Performance Impact:**
- API calls: ~250ms
- **Total added latency: ~250ms**

**Pros:**
- Modern API with good documentation
- Includes social media metrics
- Free tier is generous (20k requests/month)

**Cons:**
- Newer service, less proven
- Limited historical data

---

### Option 5: **Custom Scraping Solution**
**What it provides:**
- Metacritic scores
- Sales data from VGChartz
- Google Trends data
- YouTube video counts

**Performance Impact:**
- Highly variable (500ms - 2s)
- Must be done async/background

**Pros:**
- Complete control
- Can aggregate any source

**Cons:**
- Maintenance burden
- Legal gray area
- Fragile (sites change)

---

## 🏆 **RECOMMENDED APPROACH: Hybrid Wiki + Steam + Your Data**

### Architecture Design:

```typescript
// 1. Database Schema Enhancement
interface GameImportanceData {
  game_id: number;
  
  // From Wikidata (background job, weekly update)
  wikidata_id?: string;
  sales_estimate?: number;
  awards?: string[];
  cultural_impact_score?: number;  // 0-1 score based on Wikipedia metrics
  
  // From Steam (background job, daily update for popular games)
  steam_app_id?: number;
  steam_players_peak?: number;
  steam_players_recent?: number;
  steam_review_count?: number;
  steam_review_score?: number;
  
  // From your users (real-time)
  our_rating_avg?: number;
  our_rating_count?: number;
  our_review_count?: number;
  our_list_appearances?: number;
  our_activity_score?: number;  // Recent views, adds, reviews
  
  // Computed importance score
  importance_score?: number;  // 0-100 composite score
  importance_tier?: 'essential' | 'important' | 'notable' | 'standard';
  
  last_updated: Date;
}
```

### Data Collection Strategy:

```javascript
// Phase 1: Wikidata Enrichment (Run weekly)
async function enrichWithWikidata() {
  const games = await getGamesNeedingWikidata();
  
  for (const batch of chunk(games, 50)) {
    const sparqlQuery = buildWikidataSPARQL(batch);
    const wikidataResults = await queryWikidata(sparqlQuery);
    
    await updateGamesWithWikidataInfo(wikidataResults);
    await delay(1000); // Be nice to Wikidata
  }
}

// Phase 2: Steam Enrichment (Run daily for top games)
async function enrichWithSteam() {
  const pcGames = await getPopularPCGames();
  
  for (const game of pcGames) {
    if (!game.steam_app_id) {
      game.steam_app_id = await findSteamAppId(game.name);
    }
    
    if (game.steam_app_id) {
      const steamData = await getSteamStats(game.steam_app_id);
      await updateGameWithSteamData(game.id, steamData);
    }
  }
}

// Phase 3: Real-time importance calculation
function calculateImportanceScore(game: GameImportanceData): number {
  let score = 0;
  
  // Wikidata signals (30% weight)
  if (game.cultural_impact_score) {
    score += game.cultural_impact_score * 30;
  }
  if (game.sales_estimate) {
    score += Math.min(10, Math.log10(game.sales_estimate) * 2);
  }
  
  // Steam signals (20% weight)
  if (game.steam_players_recent) {
    score += Math.min(10, Math.log10(game.steam_players_recent + 1) * 2);
  }
  if (game.steam_review_score && game.steam_review_count > 100) {
    score += (game.steam_review_score / 100) * 10;
  }
  
  // Your community signals (30% weight)
  const communityScore = (
    (game.our_rating_avg || 0) * 0.3 +
    Math.min(10, Math.log10((game.our_review_count || 0) + 1) * 3) +
    Math.min(10, Math.log10((game.our_list_appearances || 0) + 1) * 2) +
    (game.our_activity_score || 0) * 0.5
  );
  score += communityScore;
  
  // IGDB signals (20% weight) - from existing data
  if (game.igdb_follows) {
    score += Math.min(10, Math.log10(game.igdb_follows + 1) * 2);
  }
  if (game.igdb_rating && game.total_rating_count > 50) {
    score += (game.igdb_rating / 100) * 10;
  }
  
  return Math.min(100, score);
}
```

### Performance Optimization:

```javascript
// Use materialized views for fast queries
CREATE MATERIALIZED VIEW game_search_ranked AS
SELECT 
  g.*,
  gi.importance_score,
  gi.importance_tier,
  gi.steam_players_recent,
  gi.our_activity_score
FROM game g
LEFT JOIN game_importance_data gi ON g.id = gi.game_id
WHERE g.active = true;

CREATE INDEX idx_game_search_ranked_importance ON game_search_ranked(importance_score DESC);
CREATE INDEX idx_game_search_ranked_name_trgm ON game_search_ranked USING gin(name gin_trgm_ops);

-- Refresh every hour
REFRESH MATERIALIZED VIEW CONCURRENTLY game_search_ranked;
```

### Search Query Optimization:

```sql
-- New search query with importance
SELECT 
  *,
  -- Combine text relevance with importance
  (
    similarity(name, $1) * 0.4 +  -- Name match
    COALESCE(importance_score / 100, 0) * 0.3 +  -- Importance
    CASE 
      WHEN our_activity_score > 0 THEN 
        least(our_activity_score / 100, 0.2)  -- Recent activity boost
      ELSE 0 
    END +
    CASE
      WHEN importance_tier = 'essential' THEN 0.1
      WHEN importance_tier = 'important' THEN 0.05
      ELSE 0
    END
  ) AS combined_score
FROM game_search_ranked
WHERE 
  name % $1  -- Trigram similarity
  OR summary ILIKE '%' || $1 || '%'
ORDER BY combined_score DESC
LIMIT 50;
```

## 📈 **Implementation Roadmap**

### Week 1: Foundation
1. Add importance tables to Supabase
2. Set up Wikidata matching for top 1000 games
3. Create background job infrastructure

### Week 2: Data Collection
1. Implement Wikidata SPARQL queries
2. Add Steam API integration for PC games
3. Start collecting your community metrics

### Week 3: Scoring & Testing
1. Implement importance scoring algorithm
2. Create materialized view for search
3. A/B test new search vs old

### Week 4: Optimization
1. Add caching layers
2. Optimize query performance
3. Fine-tune scoring weights

## 💡 **Why This Approach Works**

1. **No Added Latency**: All enrichment happens in background jobs
2. **Fallback Safe**: If external APIs fail, search still works
3. **Community Driven**: Your users' activity influences rankings
4. **Scalable**: Can add more sources later (RAWG, MobyGames)
5. **Cost Effective**: Free tiers sufficient for your scale

## 🎯 **Expected Results**

**Before:**
- Search "Mario" → Random Mario games based on IGDB rating
- Search "Final Fantasy" → FF mobile games rank above FF VII

**After:**
- Search "Mario" → Super Mario Bros, Mario 64, Mario Kart 8 (by importance)
- Search "Final Fantasy" → FF VII, FF X, FF XIV (most impactful entries)

## 📊 **Performance Comparison**

| Approach | Added Latency | Data Quality | Implementation Effort | Cost |
|----------|--------------|--------------|----------------------|------|
| Current (IGDB only) | 0ms | Poor | - | Free |
| Wikidata + Caching | 0ms* | Good | Medium | Free |
| Steam API + Caching | 0ms* | Excellent (PC) | Medium | Free |
| RAWG API | 250ms | Good | Low | Free tier |
| Custom Scraping | 0ms* | Excellent | High | Server costs |
| **Recommended Hybrid** | **0ms*** | **Excellent** | **Medium** | **Free** |

*With proper caching/background jobs

## 🚀 **Next Steps**

1. **Immediate**: Start collecting your community engagement metrics
2. **This Week**: Set up Wikidata entity matching for top franchises
3. **Next Sprint**: Implement importance scoring and test
4. **Future**: Add more sources as needed (RAWG for social metrics)

This approach gives you Netflix-quality recommendations using Letterboxd-scale infrastructure!