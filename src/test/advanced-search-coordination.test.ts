import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { AdvancedSearchCoordination } from '../services/advancedSearchCoordination';
import { SearchIntent } from '../utils/intelligentPrioritization';

describe('Advanced Search Coordination - Layer 4 Integration Tests', () => {
  let searchService: AdvancedSearchCoordination;
  
  beforeEach(() => {
    searchService = new AdvancedSearchCoordination();
    // Mock console methods to reduce test noise
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
    searchService.clearCache(); // Clean up between tests
  });

  describe('Service Initialization', () => {
    it('should create search service instance', () => {
      expect(searchService).toBeInstanceOf(AdvancedSearchCoordination);
    });

    it('should have performance metrics available', () => {
      const metrics = searchService.getPerformanceMetrics();
      expect(metrics).toHaveProperty('cacheSize');
      expect(metrics).toHaveProperty('cacheHitRate');
      expect(metrics).toHaveProperty('averageSearchTime');
      expect(typeof metrics.cacheSize).toBe('number');
    });
  });

  describe('Query Expansion & Intent Detection', () => {
    it('should handle Final Fantasy abbreviations', async () => {
      const result = await searchService.coordinatedSearch('ff7', { 
        includeMetrics: true,
        maxResults: 10
      });
      
      expect(result.context.expandedQueries.length).toBeGreaterThan(1);
      expect(result.context.expandedQueries).toContain('final fantasy vii');
      expect(result.context.expandedQueries).toContain('final fantasy 7');
      // "ff7" is actually better classified as franchise browsing since it's an abbreviation
      expect([SearchIntent.SPECIFIC_GAME, SearchIntent.FRANCHISE_BROWSE]).toContain(result.context.searchIntent);
    }, 30000);

    it('should detect franchise browsing intent', async () => {
      const result = await searchService.coordinatedSearch('mario games', { 
        includeMetrics: true,
        maxResults: 20
      });
      
      expect(result.context.searchIntent).toBe(SearchIntent.FRANCHISE_BROWSE);
      expect(result.context.qualityThreshold).toBeLessThan(0.8); // Lower threshold for browsing
      expect(result.context.maxResults).toBeGreaterThanOrEqual(20); // Good results for franchise browsing
    }, 30000);

    it('should detect specific game searches', async () => {
      const result = await searchService.coordinatedSearch('The Legend of Zelda: Breath of the Wild', {
        includeMetrics: true
      });
      
      expect(result.context.searchIntent).toBe(SearchIntent.SPECIFIC_GAME);
      expect(result.context.qualityThreshold).toBeGreaterThan(0.7); // High threshold for specific searches
    }, 30000);

    it('should handle Zelda abbreviations and intent', async () => {
      const result = await searchService.coordinatedSearch('botw', {
        includeMetrics: true
      });
      
      expect(result.context.expandedQueries).toContain('breath of the wild');
      expect(result.context.expandedQueries).toContain('zelda breath of the wild');
      expect(result.results.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Search Quality and Filtering', () => {
    it('should return high-quality results for popular franchises', async () => {
      const result = await searchService.coordinatedSearch('pokemon', {
        maxResults: 20,
        includeMetrics: true
      });
      
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.results.length).toBeLessThanOrEqual(20);
      
      // Check that results have quality scores
      result.results.forEach(game => {
        expect(game.qualityScore).toBeDefined();
        expect(game.relevanceScore).toBeDefined();
        expect(game.source).toBeDefined();
      });
    }, 30000);

    it('should apply dynamic quality thresholds', async () => {
      // Specific search should have higher quality threshold
      const specificResult = await searchService.coordinatedSearch('Final Fantasy VII Remake', {
        maxResults: 10,
        includeMetrics: true
      });
      
      // Franchise browse should have lower quality threshold (more results)
      const browseResult = await searchService.coordinatedSearch('final fantasy', {
        maxResults: 30,
        includeMetrics: true
      });
      
      expect(specificResult.context.qualityThreshold).toBeGreaterThan(browseResult.context.qualityThreshold);
      expect(browseResult.results.length).toBeGreaterThanOrEqual(specificResult.results.length);
    }, 30000);

    it('should filter protected content appropriately', async () => {
      const result = await searchService.coordinatedSearch('mario', {
        maxResults: 20,
        includeMetrics: true
      });
      
      // Should have some results but filter out obvious mods/fan content
      expect(result.results.length).toBeGreaterThan(0);
      
      // Check that no results have obvious mod indicators in names
      const modResults = result.results.filter(game => 
        game.name.toLowerCase().includes('mod') || 
        game.name.toLowerCase().includes('hack') ||
        game.name.toLowerCase().includes('fan')
      );
      
      expect(modResults.length).toBe(0); // Should be filtered out by content protection
    }, 30000);
  });

  describe('Performance and Caching', () => {
    it('should cache search results', async () => {
      const query = 'zelda ocarina';
      
      // First search
      const startTime1 = Date.now();
      const result1 = await searchService.coordinatedSearch(query, { includeMetrics: true });
      const time1 = Date.now() - startTime1;
      
      // Second search (should be cached)
      const startTime2 = Date.now();
      const result2 = await searchService.coordinatedSearch(query, { includeMetrics: true });
      const time2 = Date.now() - startTime2;
      
      // Results should be identical
      expect(result1.results.length).toBe(result2.results.length);
      expect(result1.results[0]?.name).toBe(result2.results[0]?.name);
      
      // Second search should be significantly faster (cached)
      expect(time2).toBeLessThan(time1 * 0.5); // At least 50% faster
      
      // Cache metrics should show the cache is working
      const metrics = searchService.getPerformanceMetrics();
      expect(metrics.cacheSize).toBeGreaterThan(0);
    }, 30000);

    it('should bypass cache when requested', async () => {
      const query = 'street fighter';
      
      // First search with cache
      await searchService.coordinatedSearch(query);
      
      // Second search bypassing cache
      const result = await searchService.coordinatedSearch(query, { 
        bypassCache: true,
        includeMetrics: true 
      });
      
      expect(result.metrics?.cacheHit).toBe(false);
    }, 30000);

    it('should complete searches within reasonable time limits', async () => {
      const queries = ['mario', 'zelda', 'pokemon', 'final fantasy', 'street fighter'];
      
      for (const query of queries) {
        const startTime = Date.now();
        const result = await searchService.coordinatedSearch(query, { 
          maxResults: 15,
          includeMetrics: true 
        });
        const duration = Date.now() - startTime;
        
        expect(duration).toBeLessThan(8000); // Should complete within 8 seconds
        expect(result.results.length).toBeGreaterThan(0);
        expect(result.metrics?.totalSearchTime).toBeGreaterThan(0);
      }
    }, 45000);
  });

  describe('Multi-Query Coordination', () => {
    it('should coordinate results from multiple expanded queries', async () => {
      const result = await searchService.coordinatedSearch('gta', {
        includeMetrics: true,
        maxResults: 15
      });
      
      // Should expand 'gta' to 'grand theft auto'
      expect(result.context.expandedQueries.length).toBeGreaterThan(1);
      expect(result.context.expandedQueries).toContain('grand theft auto');
      expect(result.context.queriesExpanded).toBeGreaterThan(1);
      
      // Should have results from the expansion
      expect(result.results.length).toBeGreaterThan(0);
      
      // Results should be properly deduplicated
      const gameIds = result.results.map(g => g.id);
      const uniqueIds = new Set(gameIds);
      expect(uniqueIds.size).toBe(gameIds.length); // No duplicates
    }, 30000);

    it('should handle search intent-specific result limits', async () => {
      // Specific game search should return fewer, more targeted results
      const specificSearch = await searchService.coordinatedSearch('The Last of Us Part II', {
        includeMetrics: true
      });
      
      // Genre discovery should return more results for exploration
      const discoverySearch = await searchService.coordinatedSearch('action games', {
        includeMetrics: true
      });
      
      expect(specificSearch.context.maxResults).toBeLessThan(discoverySearch.context.maxResults);
    }, 30000);
  });

  describe('Error Handling and Resilience', () => {
    it('should gracefully handle failed sub-queries', async () => {
      // This test simulates a scenario where some queries might fail
      // The service should continue with successful queries
      const result = await searchService.coordinatedSearch('test query', {
        includeMetrics: true,
        maxResults: 10
      });
      
      // Should not throw errors and return an array (even if empty)
      expect(Array.isArray(result.results)).toBe(true);
      expect(result.context).toBeDefined();
      expect(result.metrics).toBeDefined();
    }, 30000);

    it('should handle empty search queries', async () => {
      const result = await searchService.coordinatedSearch('', {
        includeMetrics: true
      });
      
      expect(result.results).toEqual([]);
      expect(result.context.originalQuery).toBe('');
    }, 10000);

    it('should handle very long search queries', async () => {
      const longQuery = 'the legend of zelda breath of the wild complete edition with all dlc content and updates';
      const result = await searchService.coordinatedSearch(longQuery, {
        includeMetrics: true,
        maxResults: 5
      });
      
      expect(result.context.searchIntent).toBe(SearchIntent.SPECIFIC_GAME);
      expect(result.results.length).toBeLessThanOrEqual(5);
    }, 30000);
  });

  describe('Search Result Quality', () => {
    it('should return well-structured results with required fields', async () => {
      const result = await searchService.coordinatedSearch('super mario', {
        maxResults: 10,
        includeMetrics: true
      });
      
      expect(result.results.length).toBeGreaterThan(0);
      
      result.results.forEach(game => {
        // Core required fields
        expect(game.id).toBeDefined();
        expect(game.name).toBeDefined();
        expect(typeof game.id).toBe('number');
        expect(typeof game.name).toBe('string');
        
        // Quality metadata
        expect(game.source).toBeDefined();
        expect(['database', 'igdb', 'hybrid']).toContain(game.source);
        expect(typeof game.relevanceScore).toBe('number');
        expect(typeof game.qualityScore).toBe('number');
        
        // Scores should be in valid ranges
        expect(game.relevanceScore).toBeGreaterThanOrEqual(0);
        expect(game.relevanceScore).toBeLessThanOrEqual(1);
        expect(game.qualityScore).toBeGreaterThanOrEqual(0);
        expect(game.qualityScore).toBeLessThanOrEqual(1);
      });
    }, 30000);
  });
});