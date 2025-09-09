# Franchise Coverage Improvement Plan

## Overview
This document outlines a systematic approach to improve the coverage of popular games from major franchises in our gaming database and search results.

## Problem Analysis

### Expected Coverage Issues

Based on typical gaming databases, we anticipate these coverage gaps:

1. **Historical/Legacy Games** - Older titles may be missing from IGDB
2. **Subtitle/Version Variations** - Games with different regional names or editions
3. **Search Algorithm Limitations** - Our current search may not capture all variations
4. **Data Quality Issues** - Inconsistent naming conventions in the database

### High-Risk Franchises (Predicted Low Coverage)

- **Medal of Honor** - Many older entries may be missing
- **Guitar Hero** - Music games often have limited coverage
- **Fight Night** - Smaller franchise, less likely to be comprehensive
- **Dino Crisis** - Older Capcom series
- **Virtua Fighter** - Sega arcade series
- **Star Fox** - Nintendo exclusives sometimes limited

## Improvement Strategy

### Phase 1: Data Collection & Analysis (Week 1)

#### 1.1 Run Comprehensive Coverage Analysis
```bash
node analyze-franchises.js
```

#### 1.2 Identify Coverage Gaps
- Run the franchise coverage test
- Document specific missing games
- Categorize gaps by type (historical, regional, search algorithm)

#### 1.3 Sister Game Detection Enhancement
- Update `sisterGameDetection.ts` with missing franchise patterns
- Add series patterns for low-coverage franchises
- Enhance version detection for numbered/subtitled games

### Phase 2: Database Enhancement (Week 2)

#### 2.1 IGDB Data Enrichment
```typescript
// Enhance IGDB search for missing games
const enhanceIGDBSearch = async (franchise: string, missingGames: string[]) => {
  for (const game of missingGames) {
    // Try multiple search variations
    const variations = [
      game,
      game.replace(/[:\-]/g, ''),
      game.replace(/\d+/g, ''),
      `${franchise} ${game.split(' ').pop()}`
    ];
    
    for (const variation of variations) {
      const results = await igdbService.searchGames(variation);
      // Process and add relevant results
    }
  }
};
```

#### 2.2 Manual Data Addition
- For games consistently missing from IGDB, create manual entries
- Focus on highest-impact titles (most popular/iconic)
- Prioritize franchises with <50% coverage

#### 2.3 Alternative Data Sources
- Consider MobyGames API for older titles
- Wikipedia game lists for comprehensive franchise catalogs
- Manual curation for critically important titles

### Phase 3: Search Algorithm Improvements (Week 3)

#### 3.1 Enhanced Franchise Detection
```typescript
// Add to sisterGameDetection.ts
const ENHANCED_FRANCHISE_PATTERNS = {
  'Medal of Honor': {
    pattern: /medal\s+of\s+honor/i,
    variations: ['MOH', 'Medal of Honor', 'Medal Of Honor'],
    commonSubtitles: ['Allied Assault', 'Frontline', 'European Assault', 'Airborne']
  },
  'Guitar Hero': {
    pattern: /guitar\s+hero/i,
    variations: ['Guitar Hero', 'GH'],
    commonSubtitles: ['Legends of Rock', 'World Tour', 'Warriors of Rock']
  }
  // Add patterns for all low-coverage franchises
};
```

#### 3.2 Fuzzy Matching Improvements
```typescript
// Enhanced fuzzy matching for game titles
const improvedFuzzyMatch = (searchTerm: string, gameTitle: string) => {
  // Remove common words that cause matching issues
  const cleanSearch = removeCommonWords(searchTerm);
  const cleanTitle = removeCommonWords(gameTitle);
  
  // Check for numerical matches (Final Fantasy VII vs Final Fantasy 7)
  const numericalMatch = checkNumericalEquivalence(cleanSearch, cleanTitle);
  
  // Check for subtitle matches
  const subtitleMatch = checkSubtitleMatch(cleanSearch, cleanTitle);
  
  return numericalMatch || subtitleMatch || standardFuzzyMatch(cleanSearch, cleanTitle);
};
```

#### 3.3 Multi-Strategy Search Enhancement
```typescript
// Implement comprehensive franchise search
const comprehensiveFranchiseSearch = async (franchiseName: string) => {
  const strategies = [
    () => searchByExactFranchiseName(franchiseName),
    () => searchByFranchiseAbbreviation(franchiseName),
    () => searchByPopularTitles(franchiseName),
    () => searchByDeveloperPublisher(franchiseName),
    () => searchByGameSeries(franchiseName)
  ];
  
  let allResults = [];
  for (const strategy of strategies) {
    const results = await strategy();
    allResults = deduplicateAndMerge(allResults, results);
  }
  
  return prioritizeByPopularity(allResults);
};
```

### Phase 4: Quality Assurance (Week 4)

#### 4.1 Coverage Verification
- Re-run coverage analysis after improvements
- Target: Achieve >70% coverage for major franchises
- Target: Achieve >90% coverage for top-tier franchises (Mario, Zelda, Final Fantasy)

#### 4.2 Search Quality Testing
```typescript
// Automated quality tests
describe('Franchise Search Quality', () => {
  const HIGH_PRIORITY_FRANCHISES = ['Mario', 'Zelda', 'Final Fantasy', 'Call of Duty'];
  
  HIGH_PRIORITY_FRANCHISES.forEach(franchise => {
    it(`should find all major ${franchise} games`, async () => {
      const results = await gameDataService.searchGames(franchise);
      const coverage = calculateCoverage(results, FRANCHISE_POPULAR_GAMES[franchise]);
      expect(coverage).toBeGreaterThan(90); // 90% minimum for top franchises
    });
  });
});
```

#### 4.3 User Experience Testing
- Test search results relevance
- Verify popular games appear in top results
- Ensure sister game detection works correctly

## Implementation Priority Matrix

### High Priority (Target: 90%+ Coverage)
1. **Mario** - Nintendo flagship, must be comprehensive
2. **Zelda** - Nintendo flagship, must be comprehensive
3. **Final Fantasy** - JRPG landmark series
4. **Call of Duty** - Modern gaming juggernaut
5. **Pokémon** - Global gaming phenomenon

### Medium Priority (Target: 80%+ Coverage)
6. **Resident Evil** - Survival horror icon
7. **Metal Gear Solid** - Stealth game pioneer
8. **Assassin's Creed** - Modern franchise
9. **Elder Scrolls** - RPG heavyweight
10. **Fallout** - Post-apocalyptic RPG

### Lower Priority (Target: 60%+ Coverage)
11. **Forza** / **Gran Turismo** - Racing games
12. **Monster Hunter** - Action RPG
13. **Battlefield** - Military shooter
14. **Tekken** - Fighting game
15. **Hitman** - Stealth action

### Specialized Focus (Target: 40%+ Coverage)
16. **Medal of Honor** - Historical importance
17. **Guitar Hero** - Music game pioneer
18. **Fight Night** - Boxing simulation
19. **Dino Crisis** - Capcom survival horror
20. **Silent Hill** - Psychological horror

## Technical Implementation

### Database Schema Enhancements
```sql
-- Add franchise tracking table
CREATE TABLE game_franchises (
  id SERIAL PRIMARY KEY,
  franchise_name VARCHAR(255) NOT NULL,
  game_id INTEGER REFERENCES games(id),
  popularity_rank INTEGER,
  is_mainline_entry BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add franchise search optimization
CREATE INDEX idx_game_franchises_name ON game_franchises(franchise_name);
CREATE INDEX idx_game_franchises_popularity ON game_franchises(popularity_rank);
```

### Search Service Enhancements
```typescript
// Enhanced franchise-aware search
export class FranchiseAwareSearchService {
  async searchWithFranchiseBoost(query: string): Promise<GameWithCalculatedFields[]> {
    // Detect if query is a franchise name
    const franchise = this.detectFranchise(query);
    
    if (franchise) {
      // Get franchise-specific results with popularity boost
      const franchiseResults = await this.getFranchiseGames(franchise);
      const regularResults = await this.regularSearch(query);
      
      return this.mergeAndPrioritizeFranchiseResults(franchiseResults, regularResults);
    }
    
    return this.regularSearch(query);
  }
}
```

## Success Metrics

### Coverage Targets
- **Overall Coverage**: >70% of popular games found
- **Top 5 Franchises**: >90% coverage
- **Medium Priority**: >80% coverage  
- **All Franchises**: >40% minimum coverage

### Search Quality Metrics
- **Relevance**: Popular games in top 10 results
- **Sister Game Detection**: 80% of related games found
- **Search Speed**: <2 seconds average response time
- **API Efficiency**: <50 API calls per comprehensive search

### User Experience Goals
- Users find expected games for major franchises
- Popular titles appear prominently in search results
- Sister games surface automatically for franchise searches
- Search doesn't timeout or hit rate limits

## Timeline

- **Week 1**: Analysis & Gap Identification
- **Week 2**: Data Enhancement & Manual Additions  
- **Week 3**: Algorithm Improvements & Testing
- **Week 4**: Quality Assurance & Optimization

## Risk Mitigation

### API Rate Limiting
- Implement exponential backoff
- Cache results aggressively
- Prioritize most important franchises first

### Data Quality Issues
- Manual verification for top franchises
- Community feedback integration
- Regular coverage audits

### Performance Impact
- Lazy loading for franchise data
- Efficient database queries
- CDN caching for popular searches

## Monitoring & Maintenance

### Ongoing Coverage Monitoring
```typescript
// Weekly coverage analysis
const runWeeklyCoverageAnalysis = async () => {
  const results = await analyzeFranchiseCoverage();
  const regressions = identifyRegressions(results, previousWeekResults);
  
  if (regressions.length > 0) {
    alertDevelopmentTeam(regressions);
  }
  
  generateCoverageReport(results);
};
```

### Performance Monitoring
- Track search response times
- Monitor API usage patterns
- Alert on coverage drops

This comprehensive plan should significantly improve franchise coverage while maintaining system performance and staying within API limits.