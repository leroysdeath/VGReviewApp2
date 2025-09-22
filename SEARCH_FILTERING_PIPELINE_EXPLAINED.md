# Search Filtering Pipeline Documentation

## Overview
This document explains how search results are filtered from the initial database query to the final displayed results. Using "Pokemon" as an example, we'll trace how 166 database results become only 25 displayed games.

## The Complete Pipeline

```
Database (166 Pokemon games)
    ↓
Query Expansion & Multiple Searches
    ↓
Relevance Filtering (0.4 threshold)
    ↓
Early Termination (80 games max)
    ↓
Content Protection Filter
    ↓
Fan Game Filter
    ↓
Quality Threshold Filter (0.6 threshold)
    ↓
Intelligent Sorting
    ↓
Final Limit (40 games)
    ↓
Display (25 games)
```

## Stage 1: Query Expansion
**Location**: `advancedSearchCoordination.ts`, lines 235-350

### What Happens
When you search "pokemon", the system creates multiple query variations:
- `pokemon`
- `pokémon` (with accent)
- Additional franchise-specific expansions

### Code
```typescript
private expandQuery(query: string, intent: SearchIntent): string[] {
  const expansions: string[] = [baseQuery];

  // Add accent variations
  const accentVariations = expandWithAccentVariations(query);
  expansions.push(...accentVariations);

  // Add franchise-specific terms
  if (intent === SearchIntent.FRANCHISE_BROWSE) {
    if (normalizedQuery.includes('pokemon')) {
      expansions.push('pokémon');
    }
  }

  return [...new Set(expansions)];
}
```

### Impact
- **Input**: 1 search term
- **Output**: 2-5 query variations
- **Result**: Multiple database queries executed

## Stage 2: Database Query Execution
**Location**: `advancedSearchCoordination.ts`, lines 467-515

### What Happens
Each query variation searches the database separately:
1. Query 1: "pokemon" → finds 100 games
2. Query 2: "pokémon" → finds 66 games (some overlap)
3. Results are merged, duplicates removed

### Code
```typescript
for (const expandedQuery of selectedQueries) {
  const queryResults = await this.gameDataService.searchGames(expandedQuery);

  // Convert and filter results
  const relevantResults = convertedResults.filter(game =>
    (game.relevanceScore || 0) >= 0.4 // FILTERS OUT LOW RELEVANCE
  );

  // Add to combined results
  for (const result of relevantResults) {
    if (!seenIds.has(result.id)) {
      allResults.push(result);
    }
  }
}
```

### Impact
- **Relevance Filter**: Removes games with < 0.4 relevance score
- **Problem**: Some legitimate Pokemon games score low on relevance

## Stage 3: Early Termination
**Location**: `advancedSearchCoordination.ts`, lines 502-509

### What Happens
Search stops after finding "enough" results:

```typescript
const isFranchiseSearch = context.intent === 'franchise_browse';
const terminationThreshold = isFranchiseSearch ? 80 : 40;

if (allResults.length >= terminationThreshold) {
  break; // STOPS SEARCHING!
}
```

### Impact
- **Franchise searches**: Stop at 80 games
- **Other searches**: Stop at 40 games
- **Problem**: May not get all 166 Pokemon games from database

## Stage 4: Content Protection Filter
**Location**: `advancedSearchCoordination.ts`, lines 640-654

### What Happens
Filters out "protected" content categories:
- Collections
- Ports
- Bundles
- Remasters (sometimes)

### Code
```typescript
const contentFilteredResults = filterProtectedContent(results.map(r => ({
  id: r.id,
  name: r.name,
  category: r.category,
  // Preserves greenlight/redlight flags
})))
```

### Examples Filtered Out
- "Pokemon Collection"
- "Pokemon Red/Blue Bundle"
- "Pokemon Stadium + Pokemon Snap"

### Impact
- **Removes**: ~20-30% of Pokemon games
- **Problem**: Many legitimate Pokemon releases are collections

## Stage 5: Fan Game Filter
**Location**: `advancedSearchCoordination.ts`, lines 657-671

### What Happens
Removes games detected as fan-made:
- Games with "fan" in title
- Games from known fan developers
- Games without official publishers

### Code
```typescript
const fanGameFilteredResults = filterFanGamesAndEReaderContent(contentFilteredResults)
```

### Examples Filtered Out
- "Pokemon Fan Version"
- "Pokemon ROM Hack"
- "Pokemon Uranium" (fan game)
- E-reader card games

### Impact
- **Removes**: ~10-20% of results
- **Problem**: Some official Pokemon spinoffs look like fan games

## Stage 6: Quality Threshold Filter
**Location**: `advancedSearchCoordination.ts`, lines 676-679

### What Happens
Removes games below quality score threshold:

```typescript
// Quality threshold for Pokemon (popular franchise)
const threshold = 0.6; // Line 374

const qualityFilteredResults = fanGameFilteredResults.filter(result => {
  const meetsThreshold = (result.qualityScore || 0) >= threshold;
  return meetsThreshold;
});
```

### Quality Score Calculation
Based on:
- IGDB rating (if available)
- Metadata completeness (summary, developer, publisher, genres, cover)
- Category (main games score higher than DLC)

### Impact
- **Removes**: ~30-40% of remaining games
- **Problem**: Older Pokemon games often lack metadata

## Stage 7: Intelligent Sorting
**Location**: `advancedSearchCoordination.ts`, lines 684-687

### What Happens
Sorts remaining games by:
1. Relevance to query
2. Popularity/ratings
3. Release date (newer preferred)
4. Franchise importance

### Code
```typescript
const sortedResults = sortGamesIntelligently(
  qualityFilteredResults,
  context.originalQuery
);
```

### Impact
- **Reorders**: Best matches first
- **No removal**: Just sorting

## Stage 8: Final Limit
**Location**: `advancedSearchCoordination.ts`, line 690

### What Happens
Takes only the top N results:

```typescript
// For franchise searches
const maxResults = 40; // Line 396

const finalResults = sortedResults.slice(0, context.maxResults);
```

### Impact
- **Hard limit**: Only 40 games maximum for franchise searches
- **Problem**: Even after all filtering, might have 60+ games

## Search Intent Detection
**Location**: Determined by query analysis

### Intent Types
```typescript
enum SearchIntent {
  SPECIFIC_GAME,      // "Pokemon Red" → 20 max results
  FRANCHISE_BROWSE,   // "Pokemon" → 40 max results
  GENRE_DISCOVERY,    // "RPG games" → 50 max results
  YEAR_SEARCH,        // "2023 games" → 40 max results
  DEVELOPER_SEARCH,   // "Nintendo games" → 40 max results
}
```

### Pokemon Detection
- Query "pokemon" → `FRANCHISE_BROWSE`
- Max results: 40
- Quality threshold: 0.6
- Early termination: 80

## Configuration Points

### Current Settings
```typescript
// Relevance threshold (Stage 2)
const RELEVANCE_THRESHOLD = 0.4;

// Early termination (Stage 3)
const FRANCHISE_TERMINATION = 80;
const DEFAULT_TERMINATION = 40;

// Quality thresholds (Stage 6)
const FRANCHISE_QUALITY_THRESHOLD = 0.6;
const DEFAULT_QUALITY_THRESHOLD = 0.5;

// Max results (Stage 8)
const FRANCHISE_MAX_RESULTS = 40;
const SPECIFIC_MAX_RESULTS = 20;
```

## Why You Only See 25 Pokemon Games

Starting with **166 Pokemon games** in database:

1. **Query Expansion**: Searches multiple variations
2. **Relevance Filter (0.4)**: ~140 games remain
3. **Early Termination (80)**: Only processes first 80 games found
4. **Content Filter**: ~60 games remain (removes collections)
5. **Fan Game Filter**: ~50 games remain
6. **Quality Filter (0.6)**: ~30 games remain (removes low metadata)
7. **Sorting**: Reorders by relevance
8. **Final Limit (40)**: Takes top 40
9. **Actual display**: ~25 games (some filtered by UI)

## Common Issues

### Problem 1: Legitimate Games Filtered Out
- Pokemon collections are filtered as "protected content"
- Older games lack metadata and fail quality threshold
- Some official games detected as fan games

### Problem 2: Limits Too Restrictive
- 40 game maximum for franchises
- 80 game early termination
- 0.6 quality threshold too high

### Problem 3: Filters Don't Consider Franchise
- Pokemon has many collections (should keep)
- Pokemon has official "fan-like" games
- Popular franchises should have different rules

## Recommended Fixes

### Quick Fixes
```typescript
// Increase limits for franchises
FRANCHISE_MAX_RESULTS = 150;  // Was 40
FRANCHISE_TERMINATION = 200;  // Was 80

// Lower quality threshold
FRANCHISE_QUALITY_THRESHOLD = 0.3;  // Was 0.6

// Remove relevance filter for franchises
RELEVANCE_THRESHOLD = 0.2;  // Was 0.4
```

### Smart Fixes
```typescript
// Detect popular franchises
const popularFranchises = ['pokemon', 'mario', 'zelda'];
if (popularFranchises.includes(query)) {
  // Use special configuration
  config = {
    skipFanGameFilter: true,
    skipContentFilter: true,
    qualityThreshold: 0.2,
    maxResults: 200
  };
}
```

### Best Fix
Create per-franchise configurations:
```typescript
const franchiseConfigs = {
  'pokemon': {
    maxResults: 200,
    skipFilters: ['fanGame', 'collection'],
    qualityThreshold: 0.2
  },
  'mario': {
    maxResults: 150,
    skipFilters: ['collection'],
    qualityThreshold: 0.3
  }
};
```

## Monitoring & Debugging

### Console Logs to Watch
```javascript
// See how many games at each stage
console.log(`After database query: ${results.length}`);
console.log(`After relevance filter: ${relevantResults.length}`);
console.log(`After early termination: ${allResults.length}`);
console.log(`After content filter: ${contentFilteredResults.length}`);
console.log(`After fan filter: ${fanGameFilteredResults.length}`);
console.log(`After quality filter: ${qualityFilteredResults.length}`);
console.log(`Final results: ${finalResults.length}`);
```

### Test Searches
- "pokemon" - Should show 150+ games
- "mario" - Should show 100+ games
- "final fantasy" - Should show 50+ games
- "call of duty" - Should show 30+ games

## Summary

The search pipeline is over-filtering franchise searches. The combination of:
- Early termination at 80 games
- Multiple aggressive filters
- High quality threshold (0.6)
- Low final limit (40)

Results in showing only 15% of available games (25 of 166 for Pokemon).

**Primary recommendation**: Increase limits and reduce filter aggressiveness for franchise searches.