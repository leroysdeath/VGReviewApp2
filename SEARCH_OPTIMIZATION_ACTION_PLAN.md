# Game Search Optimization Action Plan

## Overview
This action plan addresses the critical performance issues in game search functionality, focusing on database population strategy and search optimization. The primary goal is to reduce search time from 2-3 seconds to under 300ms.

## Current Issues
- **6-8 parallel IGDB API calls** per search (primary + 5 sequel patterns + franchise)
- **Zero caching** of IGDB API responses
- **Games not saved to database** after IGDB searches
- **Database queries without indexes** using ILIKE full table scans
- **Inconsistent debouncing** across components (300ms vs 500ms)

## Expected Performance Gains
- **Phase 0 (Database Population)**: 50% improvement over time
- **Phase 1 (Critical Optimizations)**: 70-80% immediate improvement
- **Phase 2 (Request Optimization)**: 15-20% additional improvement
- **Phase 3 (Database Optimization)**: 10-15% additional improvement
- **Phase 4 (Advanced UX)**: 5-10% additional improvement

---

## 📊 Phase 0: Database Population Strategy
**Timeline**: 3-4 hours  
**Impact**: 50% long-term improvement, compounds over time  
**Priority**: HIGHEST - Do this first!

### A. Create Game Sync Service
**File to create**: `src/services/gameSyncService.ts`

```typescript
class GameSyncService {
  // Transform IGDB format to database format with correct field mapping
  private transformIGDBToDatabase(igdbGame: IGDBGame): Partial<DatabaseGame> {
    const developer = igdbGame.involved_companies?.find(c => c.developer)?.company.name;
    const publisher = igdbGame.involved_companies?.find(c => c.publisher)?.company.name;
    
    return {
      igdb_id: igdbGame.id,
      game_id: igdbGame.id.toString(),
      name: igdbGame.name,
      slug: igdbGame.slug || generateSlug(igdbGame.name),
      release_date: igdbGame.first_release_date 
        ? new Date(igdbGame.first_release_date * 1000).toISOString().split('T')[0]
        : null,
      summary: igdbGame.summary || null,
      description: igdbGame.storyline || null, // Map storyline to description
      cover_url: this.transformImageUrl(igdbGame.cover?.url),
      screenshots: igdbGame.screenshots?.map(s => this.transformImageUrl(s.url)),
      developer: developer || null,
      publisher: publisher || null,
      genres: igdbGame.genres?.map(g => g.name) || null,
      platforms: igdbGame.platforms?.map(p => p.name) || null,
      category: igdbGame.category || null,
      parent_game: igdbGame.parent_game || null,
      igdb_link: igdbGame.url || null,
      updated_at: new Date().toISOString()
    };
  }
  
  // Save games with smart update logic
  async saveGamesFromIGDB(igdbGames: IGDBGame[]): Promise<void>
  
  // Handle conflicts and partial data updates
  async upsertGames(games: DatabaseGame[]): Promise<void>
  
  // Track saved games to avoid duplicates
  private savedGameIds: Set<number>
}
```

### B. Update IGDB Service Fields
**File to edit**: `src/services/igdbService.ts`

**IGDB fields to request** (excluding rating fields per requirements):
```javascript
const IGDB_FIELDS_FOR_DATABASE = `
  fields 
    id,
    name,
    slug,
    summary,
    storyline,
    cover.url,
    first_release_date,
    genres.name,
    platforms.name,
    category,
    parent_game,
    involved_companies.company.name,
    involved_companies.developer,
    involved_companies.publisher,
    screenshots.url,
    url
  ;
`;
```

### C. Modify Game Data Service
**File to edit**: `src/services/gameDataService.ts`

**Changes**:
- Search local database first
- If insufficient results (< 5), search IGDB
- **NEW**: Save IGDB results to database immediately
- Merge and deduplicate results
- Return combined results

### D. Smart Update Logic for Existing Games
**Implementation**:
- Only update NULL or empty fields
- Skip fields that already have data
- Update `updated_at` timestamp
- Handle required fields (`game_id`, `name`, `slug`) - never NULL

### E. Create Popular Games Preloader
**File to create**: `src/services/gamePreloadService.ts`

**Tier 1 Franchises** (Load immediately):
- Nintendo: Mario, Zelda, Pokemon, Metroid, Kirby
- Shooters: Call of Duty, Battlefield, Halo, Fortnite, Apex Legends
- RPGs: Final Fantasy, Elder Scrolls, Witcher, Persona, Elden Ring
- Sports: FIFA, NBA 2K, Madden NFL
- Open World: GTA, Red Dead, Minecraft

**Progressive Loading**:
- 0-10 seconds: Top 5 franchises
- 30 seconds: Next 15 popular franchises
- 2 minutes: Modern trending games
- 5+ minutes: Legacy titles and comprehensive coverage

---

## 🚀 Phase 1: Critical Performance Optimizations
**Timeline**: 2-3 hours  
**Impact**: 70-80% immediate improvement

### A. Implement IGDB API Response Caching
**Files to edit**:
- `src/services/browserCacheService.ts` - Add IGDB-specific cache methods
- `src/services/igdbService.ts` - Wrap all API calls with cache

**Implementation**:
```typescript
const IGDB_CACHE_TTL = 5 * 60; // 5 minutes (shorter due to DB population)

async searchGames(query: string) {
  const cacheKey = `igdb:${query.toLowerCase()}`;
  const cached = browserCache.get(cacheKey);
  if (cached) return cached;
  
  const results = await this.performSearch(query);
  browserCache.set(cacheKey, results, IGDB_CACHE_TTL);
  return results;
}
```

### B. Reduce IGDB Parallel API Calls
**File to edit**: `src/services/igdbService.ts`

**Current problem**: 6-8 parallel calls per search
**Solution**: Smart sequential strategy

```typescript
// BEFORE: 5 parallel sequel searches
for (const pattern of allPatterns.slice(0, 5)) {
  sequelSearches.push(fetch(endpoint, {...}));
}

// AFTER: Conditional searching
const primaryResults = await this.performBasicSearch(query, limit);
if (primaryResults.length < 3) {
  const franchiseResults = await this.searchFranchise(query);
}
// Maximum 2 API calls instead of 6-8
```

### C. Add Database Query Result Caching
**File to edit**: `src/services/gameDataService.ts`

**Implementation**:
- Cache `searchGames()` results with 10-minute TTL
- Cache `getGameByIGDBId()` with 30-minute TTL
- Include filters in cache key
- Invalidate on game updates

---

## ⚡ Phase 2: Request Optimization
**Timeline**: 1-2 hours  
**Impact**: 15-20% additional improvement

### A. Implement Request Deduplication
**File to create**: `src/utils/requestDeduplicator.ts`

```typescript
class RequestDeduplicator {
  private pendingRequests = new Map<string, Promise<any>>();
  
  async dedupe<T>(key: string, fn: () => Promise<T>): Promise<T> {
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }
    const promise = fn();
    this.pendingRequests.set(key, promise);
    promise.finally(() => this.pendingRequests.delete(key));
    return promise;
  }
}
```

### B. Standardize Debouncing
**File to create**: `src/constants/search.ts`

```typescript
export const SEARCH_DEBOUNCE_MS = 300;
export const SUGGESTION_DEBOUNCE_MS = 200;
```

**Files to update**:
- `src/components/SearchBar.tsx`
- `src/components/GameSearch.tsx`
- `src/pages/GameSearchPage.tsx` (change from 500ms to 300ms)
- `src/components/HeaderSearchBar.tsx`

---

## 🔧 Phase 3: Database Optimization
**Timeline**: 2-3 hours  
**Impact**: 10-15% additional improvement

### A. Add Database Indexes
**File to create**: `supabase/migrations/[timestamp]_search_optimization_indexes.sql`

```sql
-- Full-text search optimization
CREATE INDEX IF NOT EXISTS idx_game_search_vector 
  ON game USING gin(search_vector);

-- Ensure slug index exists and is unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_game_slug 
  ON game(slug);

-- Optimize common query patterns
CREATE INDEX IF NOT EXISTS idx_game_name_lower 
  ON game(LOWER(name));

-- Array field indexes (if not exists)
CREATE INDEX IF NOT EXISTS idx_game_genres 
  ON game USING gin(genres);
CREATE INDEX IF NOT EXISTS idx_game_platforms 
  ON game USING gin(platforms);
```

### B. Update Search Vector Trigger
**File to create**: `supabase/migrations/[timestamp]_update_search_vector_trigger.sql`

```sql
CREATE OR REPLACE FUNCTION update_game_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.summary, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'C') ||
    setweight(to_tsvector('english', array_to_string(NEW.genres, ' ')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_game_search_vector_trigger
BEFORE INSERT OR UPDATE ON game
FOR EACH ROW
EXECUTE FUNCTION update_game_search_vector();
```

### C. Optimize Database Queries
**File to edit**: `src/services/gameDataService.ts`

**Changes**:
- Use full-text search instead of ILIKE
- Limit results before joins
- Use search_vector for text matching

---

## 🎯 Phase 4: Advanced UX Optimizations
**Timeline**: 2-3 hours  
**Impact**: 5-10% additional improvement

### A. Implement Progressive Loading
**Files to edit**:
- `src/pages/GameSearchPage.tsx` - Add progressive rendering
- `src/components/GameList.tsx` - Implement virtual scrolling

### B. Add Predictive Prefetching
**File to create**: `src/utils/prefetchManager.ts`

**Features**:
- Prefetch on search input focus
- Prefetch common next searches
- Cache aggressively

### C. Add Background Sync Queue
**File to create**: `src/utils/syncQueue.ts`

**Purpose**: Handle large batch saves without blocking search

---

## 📈 Implementation Schedule

### Day 1 - Database Population (Highest Impact)
- [ ] Create `gameSyncService.ts` with field mapping
- [ ] Update IGDB service to fetch required fields
- [ ] Modify game data service to save IGDB results
- [ ] Test database population on searches

### Day 2 - Critical Optimizations
- [ ] Implement IGDB response caching
- [ ] Reduce parallel API calls from 6-8 to 1-2
- [ ] Add database query caching
- [ ] Create popular games preloader

### Day 3 - Request Optimization
- [ ] Implement request deduplication
- [ ] Standardize debouncing across components
- [ ] Add database indexes
- [ ] Update search vector triggers

### Day 4 - Polish & Testing
- [ ] Add progressive loading
- [ ] Implement prefetching
- [ ] Create sync queue for background saves
- [ ] Performance testing and metrics

---

## 🎯 Success Metrics

### Immediate (Day 1)
- ✅ Every IGDB search saves games to database
- ✅ No duplicate games created
- ✅ Search functionality maintained during saves

### Week 1
- 📈 500+ games in database
- 📈 30% of searches hit database instead of API
- 📈 Search time reduced to < 1 second

### Month 1
- 📈 5,000+ games in database
- 📈 70% of searches hit database
- 📈 Search time < 300ms for common games
- 📈 IGDB API calls reduced by 80%

### Long-term (3+ months)
- 📈 20,000+ games in database
- 📈 95% of searches served from database
- 📈 Search time < 100ms for cached results
- 📈 IGDB API as fallback only

---

## 🔍 Performance Monitoring

### Metrics to Track
```typescript
interface SearchMetrics {
  query: string;
  databaseHits: number;
  igdbCalls: number;
  totalTime: number;
  resultCount: number;
  cacheHit: boolean;
  gamessSaved: number;
}
```

### Debug Mode
Add environment variable `DEBUG_SEARCH=true` to log:
- Database vs API hits
- Cache hit rates
- Games saved per search
- Response times

---

## ⚠️ Risk Mitigation

### Potential Issues & Solutions

1. **Database size growth**
   - Solution: Implement data retention policy (remove unused games after 6 months)

2. **Rate limiting from IGDB**
   - Solution: Aggressive caching, request deduplication, exponential backoff

3. **Duplicate games**
   - Solution: Use `igdb_id` as unique constraint, upsert logic

4. **Stale data**
   - Solution: Update games accessed within last 30 days

5. **Failed saves blocking search**
   - Solution: Background queue, try-catch with fallback

---

## 🚀 Expected Outcome

| Metric | Current | Phase 0 | Phase 1 | Phase 2 | Phase 3 | Final |
|--------|---------|---------|---------|---------|---------|--------|
| Search Time | 2-3s | 2-3s → 500ms | 300ms | 250ms | 200ms | <200ms |
| API Calls | 6-8 | 6-8 → 2 | 1-2 | 1-2 | 1-2 | 0-1 |
| Cache Hits | 0% | 30% | 60% | 70% | 80% | 90%+ |
| DB Games | ~100 | 1,000+ | 2,000+ | 3,000+ | 5,000+ | 20,000+ |

The key insight: **Database population (Phase 0) provides compounding benefits over time**, while other optimizations provide immediate but fixed improvements. Starting with Phase 0 ensures every search makes future searches faster.