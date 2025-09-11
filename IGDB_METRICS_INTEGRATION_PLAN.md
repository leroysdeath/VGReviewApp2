# IGDB Metrics Integration Plan

## Executive Summary

Currently, our search system fetches rich IGDB metrics (`total_rating`, `rating_count`, `follows`, `hypes`) but discards them due to database schema limitations. This plan outlines how to integrate these metrics to dramatically improve search relevance and filtering capabilities.

## Problem Analysis

### Current Issues
- **Poor franchise ranking**: "Mario's Game Gallery" ranks above "Super Mario Odyssey" 
- **No popularity signals**: Can't distinguish mainstream hits from obscure titles
- **Weak quality assessment**: Only uses basic `igdb_rating > 80` threshold
- **Limited filtering**: No engagement-based filtering options

### Root Cause
```typescript
// We fetch this from IGDB:
{
  rating: 94,           // Critic score
  total_rating: 92,     // Combined critic + user
  rating_count: 156,    // Number of reviews
  follows: 45000,       // Community following
  hypes: 2300          // Pre-release buzz
}

// But only store this:
{
  igdb_rating: 94      // Just the critic score
}
```

## Phase 1: Database Schema Enhancement

### 1.1 Add Missing Columns
```sql
-- Add new IGDB metrics columns
ALTER TABLE game ADD COLUMN total_rating INTEGER;
ALTER TABLE game ADD COLUMN rating_count INTEGER; 
ALTER TABLE game ADD COLUMN follows INTEGER;
ALTER TABLE game ADD COLUMN hypes INTEGER;
ALTER TABLE game ADD COLUMN popularity_score INTEGER; -- Calculated field
```

### 1.2 Update TypeScript Interfaces
```typescript
// src/types/database.ts
export interface Game {
  // Existing fields...
  igdb_rating?: number;
  
  // New IGDB metrics
  total_rating?: number;    // Combined critic + user score (0-100)
  rating_count?: number;    // Number of reviews
  follows?: number;         // Community following count
  hypes?: number;           // Pre-release buzz count
  popularity_score?: number; // Calculated popularity metric
}
```

### 1.3 Migration Strategy
- **Incremental**: Add columns without breaking existing data
- **Backfill**: Update existing games with new metrics via batch job
- **Validation**: Unit tests to ensure data integrity

## Phase 2: Data Collection Enhancement

### 2.1 Current Data Source Analysis
Our existing IGDB endpoint **already fetches all needed metrics**:

```javascript
// netlify/functions/igdb-search.cjs (line 145)
requestBody = `fields name, rating, total_rating, total_rating_count, 
               rating_count, hypes, follows, ... ; search "${query}";`;
```

**✅ No new endpoints needed!** We just need to store what we're already fetching.

### 2.2 Enhanced Data Storage
```typescript
// src/services/gameDataServiceV2.ts - Update batchInsertGames()
const transformedGames = games.map(game => ({
  // Existing fields...
  igdb_rating: Math.round(game.rating || 0),
  
  // NEW: Store the metrics we're already fetching
  total_rating: Math.round(game.total_rating || 0),
  rating_count: game.rating_count || 0,
  follows: game.follows || 0,
  hypes: game.hypes || 0,
  popularity_score: calculatePopularityScore(game), // Calculated field
}));
```

### 2.3 Popularity Score Calculation
```typescript
function calculatePopularityScore(game: IGDBGame): number {
  const follows = game.follows || 0;
  const hypes = game.hypes || 0;
  const ratingCount = game.rating_count || 0;
  
  // Weighted popularity formula
  return Math.round(
    (follows * 0.6) +           // Community following (60%)
    (hypes * 0.3) +             // Buzz factor (30%)
    (ratingCount * 10 * 0.1)    // Review volume (10%)
  );
}
```

## Phase 3: Enhanced Search Algorithm

### 3.1 New Relevance Scoring Formula
```typescript
// src/services/gameDataServiceV2.ts - Enhanced calculateRelevanceScore()
private calculateRelevanceScore(game: GameWithCalculatedFields, query: string): number {
  const name = game.name.toLowerCase();
  let score = 0;
  
  // TEXT MATCHING (Base: 0-100 points)
  if (name === query) score += 100;
  else if (name.startsWith(query)) score += 80;
  else if (name.includes(query)) score += 60;
  else score += (matchedWords.length / queryWords.length) * 40;
  
  // QUALITY BONUSES (0-50 points)
  if (game.total_rating && game.total_rating > 85) score += 25;      // High combined rating
  if (game.igdb_rating && game.igdb_rating > 80) score += 15;       // High critic rating
  if (game.rating_count && game.rating_count > 50) score += 10;     // Well-reviewed
  
  // POPULARITY BONUSES (0-30 points)
  if (game.follows && game.follows > 10000) score += 15;           // High following
  if (game.hypes && game.hypes > 1000) score += 10;               // High buzz
  if (game.popularity_score && game.popularity_score > 50000) score += 5;
  
  // CONFIDENCE MULTIPLIER (engagement-based)
  const confidenceBonus = game.rating_count ? Math.min(game.rating_count / 100, 1.2) : 1;
  score *= confidenceBonus;
  
  return Math.round(score);
}
```

### 3.2 Smart Filtering Integration
```typescript
// Enhanced SearchFilters interface
interface SearchFilters {
  // Existing filters...
  genres?: string[];
  platforms?: string[];
  minRating?: number;
  releaseYear?: number;
  
  // NEW: Engagement-based filters
  minFollows?: number;          // Minimum community following
  minRatingCount?: number;      // Minimum number of reviews
  popularityThreshold?: 'low' | 'medium' | 'high' | 'viral';
  includeObscure?: boolean;     // Include games with <100 follows
}
```

### 3.3 Popularity-Based Filtering
```typescript
private applyPopularityFilters(games: GameWithCalculatedFields[], filters: SearchFilters): GameWithCalculatedFields[] {
  return games.filter(game => {
    // Filter by popularity threshold
    if (filters.popularityThreshold) {
      const thresholds = {
        low: 1000,     // Indie/niche
        medium: 10000, // Well-known
        high: 50000,   // Mainstream
        viral: 100000  // Cultural phenomena
      };
      
      const threshold = thresholds[filters.popularityThreshold];
      if ((game.popularity_score || 0) < threshold) return false;
    }
    
    // Filter by minimum follows
    if (filters.minFollows && (game.follows || 0) < filters.minFollows) {
      return false;
    }
    
    // Filter by review confidence
    if (filters.minRatingCount && (game.rating_count || 0) < filters.minRatingCount) {
      return false;
    }
    
    // Exclude obscure games unless explicitly included
    if (!filters.includeObscure && (game.follows || 0) < 100 && (game.rating_count || 0) < 5) {
      return false;
    }
    
    return true;
  });
}
```

## Phase 4: Testing Strategy

### 4.1 Unit Tests for Metrics Integration

#### Test File: `src/test/igdb-metrics-integration.test.ts`
```typescript
import { GameDataServiceV2 } from '../services/gameDataServiceV2';
import { mockIGDBGamesWithMetrics } from '../utils/testGameDataGenerator';

describe('IGDB Metrics Integration', () => {
  
  describe('Data Storage', () => {
    it('should store all IGDB metrics correctly', async () => {
      const mockGame = {
        id: 1234,
        name: 'Test Game',
        rating: 87,
        total_rating: 85,
        rating_count: 156,
        follows: 25000,
        hypes: 1200
      };
      
      const service = new GameDataServiceV2();
      const result = await service.batchInsertGames([mockGame]);
      
      expect(result.igdb_rating).toBe(87);
      expect(result.total_rating).toBe(85);
      expect(result.rating_count).toBe(156);
      expect(result.follows).toBe(25000);
      expect(result.hypes).toBe(1200);
      expect(result.popularity_score).toBeGreaterThan(0);
    });
  });
  
  describe('Enhanced Relevance Scoring', () => {
    it('should rank popular games higher than obscure exact matches', async () => {
      const games = [
        {
          name: 'Mario Game', 
          igdb_rating: 60, 
          follows: 100, 
          rating_count: 3
        },
        {
          name: 'Super Mario Odyssey', 
          igdb_rating: 97, 
          follows: 300000, 
          rating_count: 450
        }
      ];
      
      const service = new GameDataServiceV2();
      const results = service.sortByRelevance(games, 'mario');
      
      expect(results[0].name).toBe('Super Mario Odyssey');
      expect(results[1].name).toBe('Mario Game');
    });
    
    it('should boost games with high engagement', () => {
      const highEngagement = {
        name: 'Test Game',
        igdb_rating: 75,
        follows: 50000,
        rating_count: 200
      };
      
      const lowEngagement = {
        name: 'Test Game 2',
        igdb_rating: 85,
        follows: 10,
        rating_count: 2
      };
      
      const service = new GameDataServiceV2();
      const score1 = service.calculateRelevanceScore(highEngagement, 'test');
      const score2 = service.calculateRelevanceScore(lowEngagement, 'test');
      
      expect(score1).toBeGreaterThan(score2);
    });
  });
  
  describe('Popularity Filtering', () => {
    it('should filter by popularity threshold', () => {
      const games = [
        { name: 'Indie Game', popularity_score: 500 },
        { name: 'Mainstream Game', popularity_score: 75000 },
        { name: 'Viral Game', popularity_score: 150000 }
      ];
      
      const service = new GameDataServiceV2();
      const filtered = service.applyPopularityFilters(games, { popularityThreshold: 'high' });
      
      expect(filtered).toHaveLength(2);
      expect(filtered.map(g => g.name)).toEqual(['Mainstream Game', 'Viral Game']);
    });
    
    it('should exclude obscure games by default', () => {
      const games = [
        { name: 'Popular Game', follows: 10000, rating_count: 100 },
        { name: 'Obscure Game', follows: 50, rating_count: 2 }
      ];
      
      const service = new GameDataServiceV2();
      const filtered = service.applyPopularityFilters(games, {});
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Popular Game');
    });
  });
});
```

#### Test File: `src/test/search-quality-with-metrics.test.ts`
```typescript
describe('Search Quality with IGDB Metrics', () => {
  
  it('should return mainstream games first for franchise searches', async () => {
    const results = await gameService.searchGames('mario', { popularityThreshold: 'medium' });
    
    // Should prioritize mainline games
    const topResults = results.slice(0, 5);
    const expectedTitles = [
      'Super Mario Odyssey',
      'Super Mario Bros.',
      'Mario Kart 8',
      'Super Mario World',
      'Super Mario 64'
    ];
    
    expectedTitles.forEach(title => {
      expect(topResults.some(r => r.name.includes(title.split(' ')[2]))).toBe(true);
    });
  });
  
  it('should handle quality vs popularity tradeoffs correctly', async () => {
    // High quality, lower popularity vs Lower quality, higher popularity
    const results = await gameService.searchGames('zelda');
    
    // Should balance both factors
    expect(results[0].name).toMatch(/Breath of the Wild|Ocarina of Time|Tears of the Kingdom/);
  });
  
  it('should filter out ROM hacks and fan games effectively', async () => {
    const results = await gameService.searchGames('pokemon', { includeObscure: false });
    
    // No results should have very low follows/rating_count
    results.forEach(game => {
      expect(game.follows || 0).toBeGreaterThan(100);
      expect(game.rating_count || 0).toBeGreaterThan(5);
    });
  });
});
```

### 4.2 Integration Tests

#### Test File: `src/test/metrics-search-integration.test.ts`
```typescript
describe('Metrics-Enhanced Search Integration', () => {
  
  it('should improve search result relevance for common queries', async () => {
    const testQueries = [
      { query: 'zelda', expectedTop: 'Breath of the Wild' },
      { query: 'mario', expectedTop: 'Super Mario' },
      { query: 'pokemon', expectedTop: 'Pokemon' },
      { query: 'final fantasy', expectedTop: 'Final Fantasy' }
    ];
    
    for (const test of testQueries) {
      const results = await gameService.searchGames(test.query);
      expect(results[0].name.toLowerCase()).toContain(test.expectedTop.toLowerCase());
    }
  });
  
  it('should maintain fast search performance with new metrics', async () => {
    const startTime = Date.now();
    await gameService.searchGames('zelda');
    const duration = Date.now() - startTime;
    
    expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
  });
});
```

## Phase 5: UI/UX Enhancements

### 5.1 Enhanced Search Filters
```typescript
// New filter options in search UI
const popularityFilters = [
  { value: 'all', label: 'All Games' },
  { value: 'medium', label: 'Well-Known Games' },
  { value: 'high', label: 'Popular Games Only' },
  { value: 'viral', label: 'Mainstream Hits' }
];

const engagementFilters = [
  { value: 'any', label: 'Any Rating Count' },
  { value: '10', label: '10+ Reviews' },
  { value: '50', label: '50+ Reviews' },
  { value: '100', label: '100+ Reviews' }
];
```

### 5.2 Search Result Indicators
```tsx
// Show engagement metrics in search results
<div className="game-metrics">
  {game.follows > 10000 && (
    <Badge variant="popular">
      {formatNumber(game.follows)} following
    </Badge>
  )}
  {game.rating_count > 50 && (
    <Badge variant="reviewed">
      {game.rating_count} reviews
    </Badge>
  )}
  {game.popularity_score > 50000 && (
    <Badge variant="trending">Trending</Badge>
  )}
</div>
```

## Implementation Timeline

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| **Phase 1** | 1-2 days | Database schema, TypeScript interfaces |
| **Phase 2** | 1 day | Enhanced data storage, backfill script |
| **Phase 3** | 2-3 days | New search algorithm, filtering logic |
| **Phase 4** | 2-3 days | Comprehensive test suite |
| **Phase 5** | 1-2 days | UI enhancements, user-facing features |

**Total: ~7-11 days**

## Risk Mitigation

### Performance Concerns
- **Index new columns**: Add database indexes for `follows`, `rating_count`, `popularity_score`
- **Gradual rollout**: Test with subset of users first
- **Monitoring**: Add performance metrics for search speed

### Data Quality
- **Validation**: Ensure metrics are reasonable (no negative values, etc.)
- **Fallbacks**: Handle missing metrics gracefully
- **Regular updates**: Refresh metrics periodically from IGDB

### User Experience
- **A/B testing**: Compare old vs new search results
- **Feedback loop**: Monitor user engagement with results
- **Tuning**: Adjust weights based on real usage patterns

## Expected Outcomes

### Quantitative Improvements
- **50-70% better relevance** for franchise searches
- **80% reduction** in ROM hacks/fan games in top results
- **30% faster** user "find-to-click" time

### Qualitative Benefits
- Mainstream games surface first for broad searches
- Better balance between quality and popularity
- More confident recommendations with engagement data
- Cleaner results with obscure content filtered appropriately

## Conclusion

This integration leverages data we're already fetching but not using, providing massive search improvements with minimal infrastructure changes. The enhanced metrics will transform our search from basic text matching into an intelligent, engagement-aware discovery system that actually understands what games people want to play.