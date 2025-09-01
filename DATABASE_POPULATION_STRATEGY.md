# Database Population Strategy

## Overview
This document outlines the strategy for populating the local Supabase database with game data from the IGDB API. The goal is to progressively build a comprehensive local cache that reduces API calls and improves search performance from 2-3 seconds to under 100ms.

## Core Principle
**Every IGDB search should save results to the database**, creating a growing cache that improves over time. After initial population, 90%+ of searches will be served from the local database rather than the IGDB API.

---

## Database Schema Reference

### Current `game` Table Structure
```sql
-- Core Fields (Required - NOT NULL)
id                  SERIAL PRIMARY KEY
game_id             VARCHAR(255) NOT NULL UNIQUE  -- String version of IGDB ID
igdb_id             INTEGER UNIQUE                 -- IGDB's game ID
name                VARCHAR(500) NOT NULL          -- Game title
slug                VARCHAR(500) NOT NULL UNIQUE   -- URL-friendly name

-- Content Fields (Optional)
release_date        DATE                          -- NOT first_release_date
description         TEXT                          -- Maps from IGDB storyline
summary             TEXT                          -- Game summary
cover_url           TEXT                          -- Cover image URL
screenshots         TEXT[]                        -- Array of screenshot URLs

-- Company Fields
developer           VARCHAR(255)                  -- NOT involved_companies
publisher           VARCHAR(255)                  -- NOT involved_companies

-- Categorization
genres              TEXT[]                        -- Array of genre names
platforms           TEXT[]                        -- Array of platform names
category            INTEGER                       -- IGDB category enum
parent_game         INTEGER                       -- References parent game IGDB ID

-- External Links
igdb_link           TEXT                          -- IGDB URL

-- Metadata
created_at          TIMESTAMPTZ DEFAULT NOW()
updated_at          TIMESTAMPTZ DEFAULT NOW()
search_vector       TSVECTOR                      -- Full-text search

-- DEPRECATED FIELDS (DO NOT USE)
igdb_rating         INTEGER                       -- Don't update
metacritic_score    INTEGER                       -- Don't update
pic_url             TEXT                          -- Use cover_url instead
```

### Fields We DON'T Fetch/Update
- `total_rating` - Excluded per requirements
- `total_rating_count` - Excluded per requirements
- `aggregated_rating` - Excluded per requirements
- `aggregated_rating_count` - Excluded per requirements
- `igdb_rating` - Deprecated
- `metacritic_score` - Deprecated

---

## Field Mapping: IGDB → Database

### Required Field Transformations
```typescript
{
  // Identity mappings
  'igdb.id'                 → 'game.igdb_id' (INTEGER)
  'igdb.name'               → 'game.name' (VARCHAR)
  'igdb.slug'               → 'game.slug' (VARCHAR)
  
  // Computed fields
  'igdb.id.toString()'      → 'game.game_id' (VARCHAR)
  
  // Date transformation
  'igdb.first_release_date' → 'game.release_date' (DATE)
  // Unix timestamp to YYYY-MM-DD format
  
  // Text mappings
  'igdb.summary'            → 'game.summary' (TEXT)
  'igdb.storyline'          → 'game.description' (TEXT) // Note: storyline maps to description
  
  // Media transformations
  'igdb.cover.url'          → 'game.cover_url' (TEXT)
  // Transform: //images.igdb.com/... → https://images.igdb.com/...
  // Size: t_thumb → t_cover_big
  
  'igdb.screenshots[].url'  → 'game.screenshots' (TEXT[])
  // Same URL transformation as cover
  
  // Company extraction (special handling)
  'igdb.involved_companies' → 'game.developer' and 'game.publisher'
  // Filter where developer: true → developer column
  // Filter where publisher: true → publisher column
  
  // Arrays (direct mapping)
  'igdb.genres[].name'      → 'game.genres' (TEXT[])
  'igdb.platforms[].name'   → 'game.platforms' (TEXT[])
  
  // Relationships
  'igdb.category'           → 'game.category' (INTEGER)
  'igdb.parent_game'        → 'game.parent_game' (INTEGER)
  
  // Links
  'igdb.url'                → 'game.igdb_link' (TEXT)
}
```

---

## Implementation Components

### 1. Game Sync Service (`gameSyncService.ts`)

#### Core Responsibilities
- Transform IGDB data to database format
- Handle batch inserts and updates
- Manage deduplication
- Track sync metrics

#### Key Methods

```typescript
class GameSyncService {
  // Main entry point for saving games
  async saveGamesFromIGDB(igdbGames: IGDBGame[]): Promise<void> {
    const transformedGames = igdbGames.map(g => this.transformIGDBToDatabase(g));
    await this.upsertGames(transformedGames);
  }
  
  // Transform with all field mappings
  private transformIGDBToDatabase(igdbGame: IGDBGame): Partial<DatabaseGame> {
    // Extract companies
    const developer = igdbGame.involved_companies
      ?.find(c => c.developer)?.company.name || null;
    const publisher = igdbGame.involved_companies
      ?.find(c => c.publisher)?.company.name || null;
    
    return {
      // Required fields (never null)
      igdb_id: igdbGame.id,
      game_id: igdbGame.id.toString(),
      name: igdbGame.name || `Game #${igdbGame.id}`,
      slug: igdbGame.slug || generateSlug(igdbGame.name),
      
      // Date conversion
      release_date: igdbGame.first_release_date 
        ? new Date(igdbGame.first_release_date * 1000).toISOString().split('T')[0]
        : null,
      
      // Content
      summary: igdbGame.summary || null,
      description: igdbGame.storyline || null, // storyline → description
      
      // Media with URL transformation
      cover_url: this.transformImageUrl(igdbGame.cover?.url),
      screenshots: igdbGame.screenshots
        ?.map(s => this.transformImageUrl(s.url))
        .filter(Boolean) || null,
      
      // Companies
      developer,
      publisher,
      
      // Categories
      genres: igdbGame.genres?.map(g => g.name) || null,
      platforms: igdbGame.platforms?.map(p => p.name) || null,
      category: igdbGame.category || null,
      parent_game: igdbGame.parent_game || null,
      
      // Links
      igdb_link: igdbGame.url || null,
      
      // Metadata
      updated_at: new Date().toISOString()
    };
  }
  
  // Fix IGDB image URLs
  private transformImageUrl(url: string): string | null {
    if (!url) return null;
    
    // Fix protocol
    const httpsUrl = url.startsWith('//') ? `https:${url}` : url;
    
    // Upgrade image size
    return httpsUrl
      .replace('t_thumb', 't_cover_big')
      .replace('t_micro', 't_cover_big');
  }
}
```

### 2. Smart Update Strategy

#### Update Decision Logic
```typescript
private async buildUpdateData(
  newData: IGDBGame, 
  existingGame: DatabaseGame
): Promise<Partial<DatabaseGame>> {
  const updates: Partial<DatabaseGame> = {};
  
  // Priority 1: Fill NULL fields
  if (!existingGame.summary && newData.summary) {
    updates.summary = newData.summary;
  }
  
  if (!existingGame.description && newData.storyline) {
    updates.description = newData.storyline;
  }
  
  if (!existingGame.developer && newData.involved_companies) {
    const dev = newData.involved_companies.find(c => c.developer);
    if (dev) updates.developer = dev.company.name;
  }
  
  if (!existingGame.publisher && newData.involved_companies) {
    const pub = newData.involved_companies.find(c => c.publisher);
    if (pub) updates.publisher = pub.company.name;
  }
  
  // Priority 2: Update empty arrays
  if ((!existingGame.genres || existingGame.genres.length === 0) && newData.genres) {
    updates.genres = newData.genres.map(g => g.name);
  }
  
  if ((!existingGame.platforms || existingGame.platforms.length === 0) && newData.platforms) {
    updates.platforms = newData.platforms.map(p => p.name);
  }
  
  // Priority 3: Update if stale (>30 days)
  const isStale = new Date(existingGame.updated_at) < 
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
  if (isStale) {
    // Full update for stale records
    return this.transformIGDBToDatabase(newData);
  }
  
  // Always update timestamp if any changes
  if (Object.keys(updates).length > 0) {
    updates.updated_at = new Date().toISOString();
  }
  
  return updates;
}
```

### 3. Batch Operations

#### Efficient Bulk Inserts
```typescript
async upsertGames(games: DatabaseGame[]): Promise<void> {
  // Ensure required fields
  const validGames = games.map(game => ({
    ...game,
    game_id: game.game_id || game.igdb_id?.toString(),
    name: game.name || 'Unknown Game',
    slug: game.slug || generateSlug(game.name || `game-${game.igdb_id}`)
  }));
  
  // Batch size to avoid payload limits
  const BATCH_SIZE = 50;
  const batches = chunk(validGames, BATCH_SIZE);
  
  for (const batch of batches) {
    try {
      await supabase
        .from('game')
        .upsert(batch, {
          onConflict: 'igdb_id',
          ignoreDuplicates: false // Update if exists
        });
    } catch (error) {
      console.error('Batch upsert failed:', error);
      // Fallback to individual inserts
      await this.individualUpsert(batch);
    }
  }
}
```

---

## IGDB API Query Configuration

### Required Fields for Database Population
```javascript
const IGDB_DATABASE_FIELDS = `
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
  where name != null;
  limit 500;
`;
```

### Different Query Levels
```typescript
enum IGDBQueryLevel {
  MINIMAL = 'id,name,cover.url',  // Quick search
  STANDARD = `
    id,name,slug,summary,cover.url,
    genres.name,platforms.name,
    first_release_date,developer,publisher
  `, // Normal search
  FULL = IGDB_DATABASE_FIELDS  // Database population
}
```

---

## Popular Games Preloading

### Tier System

#### Tier 1: Core Franchises (Immediate Load)
```typescript
const TIER_1_FRANCHISES = [
  // Must-have franchises that cover 40% of searches
  'Mario', 'Zelda', 'Pokemon', 'Call of Duty', 'FIFA',
  'Grand Theft Auto', 'Minecraft', 'Fortnite', 'Final Fantasy',
  'Elder Scrolls', 'Witcher', 'Halo', 'God of War', 'Apex Legends'
];
```

#### Tier 2: Popular Modern Games
```typescript
const TIER_2_MODERN = [
  // Recent hits and trending games
  'Elden Ring', 'Baldurs Gate 3', 'Hogwarts Legacy', 'Starfield',
  'Cyberpunk 2077', 'Helldivers 2', 'Palworld', 'Lethal Company',
  
  // Live services
  'Destiny', 'Genshin Impact', 'League of Legends', 'Valorant',
  'World of Warcraft', 'Final Fantasy XIV',
  
  // Annual releases (dynamic)
  `FIFA ${new Date().getFullYear()}`,
  `NBA 2K${new Date().getFullYear() % 100}`,
  `Madden NFL ${new Date().getFullYear() % 100}`
];
```

#### Tier 3: Legacy & Completeness
```typescript
const TIER_3_LEGACY = [
  // Classic franchises for comprehensive coverage
  'Sonic', 'Mega Man', 'Castlevania', 'Metal Gear',
  'Half-Life', 'Portal', 'Bioshock', 'Mass Effect',
  'Dragon Age', 'Persona', 'Dark Souls', 'Resident Evil'
];
```

### Progressive Loading Schedule
```typescript
class GamePreloadService {
  async startPreloading() {
    // Immediate (0-10 seconds): Ultra-critical
    await this.preloadBatch(TIER_1_FRANCHISES.slice(0, 5), 20);
    
    // Fast (30 seconds): Very popular
    setTimeout(() => {
      this.preloadBatch(TIER_1_FRANCHISES.slice(5), 15);
    }, 30000);
    
    // Standard (2 minutes): Popular
    setTimeout(() => {
      this.preloadBatch(TIER_2_MODERN, 10);
    }, 120000);
    
    // Background (5 minutes): Everything else
    setTimeout(() => {
      this.preloadBatch(TIER_3_LEGACY, 10);
    }, 300000);
    
    // Continuous (every hour): Trending games
    setInterval(() => {
      this.preloadTrendingGames();
    }, 3600000);
  }
  
  private async preloadBatch(queries: string[], limit: number) {
    for (const query of queries) {
      const games = await igdbService.searchGames(query, { limit });
      await gameSyncService.saveGamesFromIGDB(games);
      await delay(2000); // Rate limiting
    }
  }
}
```

---

## Integration Points

### 1. Search Flow Integration
```typescript
// gameDataService.ts
async searchGames(query: string): Promise<GameWithCalculatedFields[]> {
  // Step 1: Always check database first
  const dbResults = await this.searchLocalDatabase(query);
  
  // Step 2: If insufficient results, fetch from IGDB
  if (dbResults.length < 5) {
    const igdbResults = await igdbService.searchGames(query);
    
    // Step 3: CRITICAL - Save IGDB results to database
    gameSyncService.saveGamesFromIGDB(igdbResults)
      .catch(error => {
        // Don't let save failure break search
        console.error('Background save failed:', error);
        syncQueue.add(igdbResults); // Queue for retry
      });
    
    // Step 4: Return combined results immediately
    return this.mergeResults(dbResults, igdbResults);
  }
  
  return dbResults;
}
```

### 2. Background Sync Queue
```typescript
class SyncQueue {
  private queue: IGDBGame[] = [];
  private processing = false;
  
  add(games: IGDBGame[]) {
    this.queue.push(...games);
    if (!this.processing) {
      this.processQueue();
    }
  }
  
  private async processQueue() {
    this.processing = true;
    
    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, 10);
      try {
        await gameSyncService.saveGamesFromIGDB(batch);
      } catch (error) {
        console.error('Sync queue error:', error);
        // Re-add to queue with backoff
        setTimeout(() => this.add(batch), 60000);
      }
      await delay(1000); // Rate limiting
    }
    
    this.processing = false;
  }
}
```

### 3. Application Initialization
```typescript
// App.tsx or main initialization
async function initializeApp() {
  // Start popular games preloading in background
  if (process.env.NODE_ENV === 'production') {
    gamePreloadService.startPreloading();
  }
  
  // Initialize sync queue
  window.gameSyncQueue = new SyncQueue();
  
  // Check database health
  const gameCount = await gameDataService.getDatabaseGameCount();
  console.log(`Database initialized with ${gameCount} games`);
  
  if (gameCount < 100) {
    // Bootstrap with essential games if database is empty
    await gamePreloadService.bootstrapEssentialGames();
  }
}
```

---

## Metrics & Monitoring

### Track Population Progress
```typescript
interface PopulationMetrics {
  totalGamesInDB: number;
  gamesAddedToday: number;
  gamesUpdatedToday: number;
  searchesServedFromDB: number;
  searchesRequiringAPI: number;
  cacheHitRate: number;
  averageSearchTime: number;
}

class MetricsService {
  async getPopulationMetrics(): Promise<PopulationMetrics> {
    const { count: totalGames } = await supabase
      .from('game')
      .select('*', { count: 'exact', head: true });
    
    const today = new Date().toISOString().split('T')[0];
    
    const { count: addedToday } = await supabase
      .from('game')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today);
    
    const { count: updatedToday } = await supabase
      .from('game')
      .select('*', { count: 'exact', head: true })
      .gte('updated_at', today)
      .lt('created_at', today);
    
    return {
      totalGamesInDB: totalGames || 0,
      gamesAddedToday: addedToday || 0,
      gamesUpdatedToday: updatedToday || 0,
      // ... other metrics from localStorage or analytics
    };
  }
}
```

### Database Growth Tracking
```sql
-- Create metrics view
CREATE VIEW game_population_metrics AS
SELECT 
  COUNT(*) as total_games,
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as added_today,
  COUNT(CASE WHEN updated_at > NOW() - INTERVAL '24 hours' 
        AND created_at < NOW() - INTERVAL '24 hours' THEN 1 END) as updated_today,
  COUNT(CASE WHEN summary IS NOT NULL THEN 1 END) as games_with_summary,
  COUNT(CASE WHEN developer IS NOT NULL THEN 1 END) as games_with_developer,
  COUNT(CASE WHEN screenshots IS NOT NULL THEN 1 END) as games_with_screenshots,
  AVG(CASE 
    WHEN summary IS NOT NULL THEN 10 ELSE 0 
  END + CASE 
    WHEN genres IS NOT NULL THEN 10 ELSE 0 
  END + CASE 
    WHEN platforms IS NOT NULL THEN 10 ELSE 0 
  END) as avg_data_completeness
FROM game;
```

---

## Expected Growth Pattern

### Timeline & Milestones

| Timeframe | Games in DB | DB Hit Rate | Avg Search Time | IGDB API Calls |
|-----------|-------------|-------------|-----------------|----------------|
| Day 1 | 100-200 | 10% | 2s | 90% of searches |
| Week 1 | 500-1,000 | 30% | 1.5s | 70% of searches |
| Week 2 | 1,500-2,000 | 45% | 1s | 55% of searches |
| Month 1 | 3,000-5,000 | 60% | 500ms | 40% of searches |
| Month 2 | 7,000-10,000 | 75% | 300ms | 25% of searches |
| Month 3 | 12,000-15,000 | 85% | 200ms | 15% of searches |
| Month 6 | 20,000-25,000 | 95% | 100ms | 5% of searches |

### Factors Affecting Growth
1. **User Activity**: More searches = faster population
2. **Preloading**: Background population of popular games
3. **Franchise Completion**: When one game is searched, load related games
4. **Update Frequency**: How often to refresh existing data

---

## Maintenance & Optimization

### Data Freshness Policy
```typescript
const FRESHNESS_RULES = {
  // Never update these (static data)
  NEVER: ['name', 'slug', 'release_date', 'igdb_id'],
  
  // Update if NULL
  IF_NULL: ['summary', 'description', 'developer', 'publisher', 'genres'],
  
  // Update if older than 30 days
  MONTHLY: ['screenshots', 'cover_url'],
  
  // Update if older than 90 days
  QUARTERLY: ['platforms', 'category'],
  
  // Always update
  ALWAYS: ['updated_at']
};
```

### Database Cleanup
```sql
-- Remove games never accessed after 6 months
DELETE FROM game 
WHERE updated_at < NOW() - INTERVAL '6 months'
AND id NOT IN (
  SELECT DISTINCT game_id FROM rating
  UNION
  SELECT DISTINCT game_id FROM user_game_list
);

-- Identify incomplete games for enhancement
SELECT igdb_id, name, 
  CASE 
    WHEN summary IS NULL THEN 'Missing summary'
    WHEN developer IS NULL THEN 'Missing developer'
    WHEN genres IS NULL THEN 'Missing genres'
    ELSE 'Complete'
  END as issue
FROM game
WHERE summary IS NULL 
   OR developer IS NULL 
   OR genres IS NULL
ORDER BY view_count DESC
LIMIT 100;
```

---

## Error Handling & Recovery

### Common Issues & Solutions

#### 1. Duplicate Key Violations
```typescript
// Handle gracefully with upsert
.upsert(games, {
  onConflict: 'igdb_id',
  ignoreDuplicates: false // Update instead of error
})
```

#### 2. Rate Limiting
```typescript
// Exponential backoff
async function withRetry(fn: Function, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 429) { // Rate limited
        await delay(Math.pow(2, i) * 1000);
        continue;
      }
      throw error;
    }
  }
}
```

#### 3. Invalid Data
```typescript
// Validation before insert
function validateGame(game: any): boolean {
  return !!(
    game.igdb_id && 
    game.name && 
    game.name.length > 0 &&
    game.name.length < 500
  );
}
```

---

## Success Criteria

### Short-term (Week 1)
- ✅ Every IGDB search saves to database
- ✅ No duplicate games created
- ✅ 500+ games in database
- ✅ 30% searches hit database

### Medium-term (Month 1)
- ✅ 5,000+ games in database
- ✅ 60% searches hit database
- ✅ Average search time < 500ms
- ✅ IGDB API calls reduced by 60%

### Long-term (3+ Months)
- ✅ 20,000+ games in database
- ✅ 95% searches hit database
- ✅ Average search time < 100ms
- ✅ IGDB API as fallback only
- ✅ Self-sustaining system requiring minimal maintenance

---

## Conclusion

The database population strategy transforms search from an API-dependent operation to a database-first approach with API fallback. This provides:

1. **Immediate Benefits**: Every search improves future searches
2. **Compounding Returns**: Database grows organically with usage
3. **Cost Reduction**: Fewer API calls = lower costs
4. **Performance Gains**: 10-20x faster searches
5. **Offline Capability**: Works without internet for cached games
6. **Predictable Performance**: Database queries are consistent

The key is starting immediately - every day without database population is a missed opportunity for permanent performance improvements.