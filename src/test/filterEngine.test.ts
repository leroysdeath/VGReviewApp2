/**
 * Unit tests for FilterEngine
 */

import { FilterEngine, type FilterableGame, type FilterResult } from '../utils/filterEngine';
import { DEFAULT_FILTER_CONFIG, AGGRESSIVE_FILTER_CONFIG, PERMISSIVE_FILTER_CONFIG, type FilterConfig } from '../utils/filterConfig';

describe('FilterEngine', () => {
  // Test game data
  const createTestGame = (overrides: Partial<FilterableGame> = {}): FilterableGame => ({
    id: 1,
    igdb_id: 1234,
    name: 'Test Game',
    category: 0, // Main game
    developer: 'Test Dev',
    publisher: 'Test Pub',
    igdb_rating: 85,
    total_rating: 85,
    total_rating_count: 100,
    follows: 1000,
    hypes: 50,
    release_status: 'released',
    first_release_date: 1609459200, // 2021-01-01
    ...overrides
  });

  describe('Constructor', () => {
    it('should create engine with config', () => {
      const engine = new FilterEngine(DEFAULT_FILTER_CONFIG);
      expect(engine).toBeInstanceOf(FilterEngine);
      expect(engine.getConfig()).toEqual(DEFAULT_FILTER_CONFIG);
    });
  });

  describe('Category Filtering', () => {
    it('should filter out excluded categories', () => {
      const engine = new FilterEngine(DEFAULT_FILTER_CONFIG);

      const games = [
        createTestGame({ id: 1, name: 'Main Game', category: 0 }),
        createTestGame({ id: 2, name: 'Season', category: 7 }), // Excluded
        createTestGame({ id: 3, name: 'Update', category: 14 }), // Excluded
        createTestGame({ id: 4, name: 'DLC', category: 2 })
      ];

      const results = engine.applyFilters(games);
      const passed = results.filter(r => r.passed);

      expect(passed).toHaveLength(2);
      expect(passed.map(r => r.game.name)).toEqual(['Main Game', 'DLC']);
    });

    it('should only include allowed categories when categoryIncludes is set', () => {
      const config: FilterConfig = {
        ...DEFAULT_FILTER_CONFIG,
        filters: [
          {
            id: 'category-strict',
            name: 'Strict Category',
            type: 'category',
            enabled: true,
            priority: 100,
            condition: {
              categoryIncludes: [0, 8] // Only main games and remakes
            }
          }
        ]
      };

      const engine = new FilterEngine(config);

      const games = [
        createTestGame({ id: 1, category: 0 }), // Main - pass
        createTestGame({ id: 2, category: 2 }), // DLC - fail
        createTestGame({ id: 3, category: 8 }), // Remake - pass
        createTestGame({ id: 4, category: 4 })  // Expansion - fail
      ];

      const results = engine.applyFilters(games);
      const passed = results.filter(r => r.passed);

      expect(passed).toHaveLength(2);
      expect(passed.map(r => r.game.category)).toEqual([0, 8]);
    });
  });

  describe('Content Protection Filtering', () => {
    it('should filter games matching name patterns', () => {
      const engine = new FilterEngine(DEFAULT_FILTER_CONFIG);

      const games = [
        createTestGame({ id: 1, name: 'Super Mario 64' }),
        createTestGame({ id: 2, name: 'Mario 64 ROM Hack' }), // Filtered
        createTestGame({ id: 3, name: 'Zelda Fan Game' }), // Filtered
        createTestGame({ id: 4, name: 'Unofficial Mod Pack' }) // Filtered
      ];

      const results = engine.applyFilters(games);
      const passed = results.filter(r => r.passed);

      expect(passed).toHaveLength(1);
      expect(passed[0].game.name).toBe('Super Mario 64');
    });

    it('should filter games from blacklisted developers', () => {
      const config: FilterConfig = {
        ...DEFAULT_FILTER_CONFIG,
        filters: [
          {
            id: 'dev-blacklist',
            name: 'Developer Blacklist',
            type: 'content',
            enabled: true,
            priority: 100,
            condition: {
              developerBlacklist: ['Bad Dev Co', 'Sketchy Studios']
            }
          }
        ]
      };

      const engine = new FilterEngine(config);

      const games = [
        createTestGame({ id: 1, developer: 'Good Dev' }),
        createTestGame({ id: 2, developer: 'Bad Dev Co' }), // Filtered
        createTestGame({ id: 3, developer: 'Sketchy Studios' }), // Filtered
        createTestGame({ id: 4, developer: 'Another Good Dev' })
      ];

      const results = engine.applyFilters(games);
      const passed = results.filter(r => r.passed);

      expect(passed).toHaveLength(2);
      expect(passed.map(r => r.game.developer)).toEqual(['Good Dev', 'Another Good Dev']);
    });
  });

  describe('Quality Filtering', () => {
    it('should filter games below minimum rating', () => {
      const config: FilterConfig = {
        ...DEFAULT_FILTER_CONFIG,
        filters: [
          {
            id: 'quality',
            name: 'Quality Filter',
            type: 'quality',
            enabled: true,
            priority: 80,
            condition: {
              minRating: 70,
              minFollows: 500
            }
          }
        ]
      };

      const engine = new FilterEngine(config);

      const games = [
        createTestGame({ id: 1, igdb_rating: 85, follows: 1000 }), // Pass
        createTestGame({ id: 2, igdb_rating: 65, follows: 1000 }), // Fail - low rating
        createTestGame({ id: 3, igdb_rating: 80, follows: 100 }), // Fail - low follows
        createTestGame({ id: 4, igdb_rating: 90, follows: 2000 })  // Pass
      ];

      const results = engine.applyFilters(games);
      const passed = results.filter(r => r.passed);

      expect(passed).toHaveLength(2);
      const passedIds = passed.map(r => r.game.id).sort((a, b) => a - b);
      expect(passedIds).toEqual([1, 4]);
    });

    it('should filter games below minimum rating count', () => {
      const config: FilterConfig = {
        ...DEFAULT_FILTER_CONFIG,
        filters: [
          {
            id: 'quality',
            name: 'Quality Filter',
            type: 'quality',
            enabled: true,
            priority: 80,
            condition: {
              minRatingCount: 50
            }
          }
        ]
      };

      const engine = new FilterEngine(config);

      const games = [
        createTestGame({ id: 1, total_rating_count: 100 }), // Pass
        createTestGame({ id: 2, total_rating_count: 25 }), // Fail
        createTestGame({ id: 3, total_rating_count: undefined }), // Fail
        createTestGame({ id: 4, total_rating_count: 75 })  // Pass
      ];

      const results = engine.applyFilters(games);
      const passed = results.filter(r => r.passed);

      expect(passed).toHaveLength(2);
      expect(passed.map(r => r.game.id)).toEqual([1, 4]);
    });
  });

  describe('Release Status Filtering', () => {
    it('should filter by release status', () => {
      const config: FilterConfig = {
        ...DEFAULT_FILTER_CONFIG,
        filters: [
          {
            id: 'release-status',
            name: 'Release Status',
            type: 'release',
            enabled: true,
            priority: 90,
            condition: {
              releaseStatuses: ['released']
            }
          }
        ]
      };

      const engine = new FilterEngine(config);

      const games = [
        createTestGame({ id: 1, release_status: 'released' }), // Pass
        createTestGame({ id: 2, release_status: 'unreleased' }), // Fail
        createTestGame({ id: 3, release_status: 'canceled' }), // Fail
        createTestGame({ id: 4, release_status: 'released' })  // Pass
      ];

      const results = engine.applyFilters(games);
      const passed = results.filter(r => r.passed);

      expect(passed).toHaveLength(2);
      expect(passed.map(r => r.game.id)).toEqual([1, 4]);
    });
  });

  describe('Custom Function Filtering', () => {
    it('should apply custom filter function', () => {
      const config: FilterConfig = {
        ...DEFAULT_FILTER_CONFIG,
        filters: [
          {
            id: 'custom',
            name: 'Custom Filter',
            type: 'custom',
            enabled: true,
            priority: 100,
            condition: {
              customFunction: 'return game.name.includes("Mario");'
            }
          }
        ]
      };

      const engine = new FilterEngine(config);

      const games = [
        createTestGame({ id: 1, name: 'Super Mario 64' }), // Pass
        createTestGame({ id: 2, name: 'Zelda' }), // Fail
        createTestGame({ id: 3, name: 'Mario Kart' }), // Pass
        createTestGame({ id: 4, name: 'Pokemon' })  // Fail
      ];

      const results = engine.applyFilters(games);
      const passed = results.filter(r => r.passed);

      expect(passed).toHaveLength(2);
      expect(passed.map(r => r.game.name)).toContain('Super Mario 64');
      expect(passed.map(r => r.game.name)).toContain('Mario Kart');
    });

    it('should handle custom function errors gracefully', () => {
      const config: FilterConfig = {
        ...DEFAULT_FILTER_CONFIG,
        filters: [
          {
            id: 'custom-error',
            name: 'Broken Custom Filter',
            type: 'custom',
            enabled: true,
            priority: 100,
            condition: {
              customFunction: 'throw new Error("Test error");'
            }
          }
        ]
      };

      const engine = new FilterEngine(config);
      const games = [createTestGame({ id: 1 })];

      // Should not throw, should pass game on error
      const results = engine.applyFilters(games);
      expect(results).toHaveLength(1);
      expect(results[0].passed).toBe(true);
    });
  });

  describe('Multiple Filters', () => {
    it('should apply all enabled filters', () => {
      const engine = new FilterEngine(AGGRESSIVE_FILTER_CONFIG);

      const games = [
        createTestGame({ id: 1, name: 'Zelda', category: 0, follows: 5000 }), // Pass
        createTestGame({ id: 2, name: 'ROM Hack', category: 0, follows: 5000 }), // Fail - content
        createTestGame({ id: 3, name: 'DLC Pack', category: 2, follows: 5000 }), // Fail - category
        createTestGame({ id: 4, name: 'Obscure Game', category: 0, follows: 50 }) // Fail - quality
      ];

      const results = engine.applyFilters(games);
      const passed = results.filter(r => r.passed);

      expect(passed).toHaveLength(1);
      expect(passed[0].game.name).toBe('Zelda');
    });

    it('should track which filters failed for each game', () => {
      const engine = new FilterEngine(AGGRESSIVE_FILTER_CONFIG);

      const game = createTestGame({
        id: 1,
        name: 'Test ROM Hack', // Fails content filter
        category: 2, // Fails category filter (DLC not allowed)
        follows: 50  // Fails quality filter (< 100)
      });

      const results = engine.applyFilters([game]);
      const result = results[0];

      expect(result.passed).toBe(false);
      expect(result.failedFilters.length).toBeGreaterThan(0);
    });
  });

  describe('Disabled Filters', () => {
    it('should skip disabled filters', () => {
      const config: FilterConfig = {
        ...DEFAULT_FILTER_CONFIG,
        filters: [
          {
            id: 'content-protection',
            name: 'Content Protection',
            type: 'content',
            enabled: false, // Disabled
            priority: 100,
            condition: {
              namePatterns: ['rom.*hack']
            }
          }
        ]
      };

      const engine = new FilterEngine(config);
      const games = [
        createTestGame({ id: 1, name: 'ROM Hack' }) // Would fail if enabled
      ];

      const results = engine.applyFilters(games);
      expect(results[0].passed).toBe(true);
    });
  });

  describe('Sorting', () => {
    it('should sort by priority score descending', () => {
      const engine = new FilterEngine(DEFAULT_FILTER_CONFIG);

      const games = [
        createTestGame({ id: 1, name: 'Low Priority', follows: 100, igdb_rating: 60 }),
        createTestGame({ id: 2, name: 'High Priority', follows: 10000, igdb_rating: 95 }),
        createTestGame({ id: 3, name: 'Mid Priority', follows: 1000, igdb_rating: 75 })
      ];

      const results = engine.applyFilters(games);

      // Should be sorted by priority (high to low)
      // Just verify they're in descending order of priority score
      expect(results[0].priorityScore).toBeGreaterThanOrEqual(results[1].priorityScore);
      expect(results[1].priorityScore).toBeGreaterThanOrEqual(results[2].priorityScore);
    });

    it('should sort by rating when configured', () => {
      const config: FilterConfig = {
        ...DEFAULT_FILTER_CONFIG,
        sorting: [
          {
            id: 'rating-sort',
            name: 'Rating',
            enabled: true,
            field: 'rating',
            order: 'desc',
            weight: 1.0
          }
        ]
      };

      const engine = new FilterEngine(config);

      const games = [
        createTestGame({ id: 1, igdb_rating: 70 }),
        createTestGame({ id: 2, igdb_rating: 95 }),
        createTestGame({ id: 3, igdb_rating: 80 })
      ];

      const results = engine.applyFilters(games);

      expect(results[0].game.igdb_rating).toBe(95);
      expect(results[1].game.igdb_rating).toBe(80);
      expect(results[2].game.igdb_rating).toBe(70);
    });
  });

  describe('Statistics', () => {
    it('should calculate correct stats', () => {
      const engine = new FilterEngine(DEFAULT_FILTER_CONFIG);

      const games = [
        createTestGame({ id: 1, category: 0 }), // Pass
        createTestGame({ id: 2, category: 7 }), // Fail - season
        createTestGame({ id: 3, category: 14 }), // Fail - update
        createTestGame({ id: 4, category: 0 })  // Pass
      ];

      const results = engine.applyFilters(games);
      const stats = engine.getStats(results);

      expect(stats.total).toBe(4);
      expect(stats.passed).toBe(2);
      expect(stats.filtered).toBe(2);
      expect(stats.passRate).toBe(50);
    });

    it('should track filter breakdown', () => {
      const engine = new FilterEngine(DEFAULT_FILTER_CONFIG);

      const games = [
        createTestGame({ id: 1, category: 0 }),
        createTestGame({ id: 2, category: 7 }),
        createTestGame({ id: 3, category: 14 })
      ];

      const results = engine.applyFilters(games);
      const stats = engine.getStats(results);

      expect(stats.filterBreakdown['category-filter']).toBe(2);
    });
  });

  describe('Configuration Management', () => {
    it('should update config', () => {
      const engine = new FilterEngine(DEFAULT_FILTER_CONFIG);
      engine.updateConfig(PERMISSIVE_FILTER_CONFIG);

      expect(engine.getConfig()).toEqual(PERMISSIVE_FILTER_CONFIG);
    });

    it('should toggle filter enabled state', () => {
      const engine = new FilterEngine(DEFAULT_FILTER_CONFIG);

      engine.toggleFilter('content-protection', false);
      const filter = engine.getFilter('content-protection');

      expect(filter?.enabled).toBe(false);
    });

    it('should toggle sort enabled state', () => {
      const engine = new FilterEngine(DEFAULT_FILTER_CONFIG);

      engine.toggleSort('priority-sort', false);
      const config = engine.getConfig();

      expect(config.sorting[0].enabled).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty game array', () => {
      const engine = new FilterEngine(DEFAULT_FILTER_CONFIG);
      const results = engine.applyFilters([]);

      expect(results).toEqual([]);
    });

    it('should handle games with missing properties', () => {
      const engine = new FilterEngine(DEFAULT_FILTER_CONFIG);
      const game: FilterableGame = {
        id: 1,
        name: 'Minimal Game'
      };

      const results = engine.applyFilters([game]);
      expect(results).toHaveLength(1);
      expect(results[0].passed).toBe(true);
    });

    it('should handle invalid regex patterns gracefully', () => {
      const config: FilterConfig = {
        ...DEFAULT_FILTER_CONFIG,
        filters: [
          {
            id: 'bad-regex',
            name: 'Bad Regex',
            type: 'content',
            enabled: true,
            priority: 100,
            condition: {
              namePatterns: ['[invalid(regex'] // Invalid regex
            }
          }
        ]
      };

      const engine = new FilterEngine(config);
      const games = [createTestGame({ id: 1 })];

      // Should not throw, should pass game on regex error
      const results = engine.applyFilters(games);
      expect(results[0].passed).toBe(true);
    });
  });

  describe('Filter Priority', () => {
    it('should apply filters in priority order', () => {
      const config: FilterConfig = {
        ...DEFAULT_FILTER_CONFIG,
        filters: [
          {
            id: 'low-priority',
            name: 'Low Priority',
            type: 'category',
            enabled: true,
            priority: 50,
            condition: { categoryExcludes: [0] }
          },
          {
            id: 'high-priority',
            name: 'High Priority',
            type: 'category',
            enabled: true,
            priority: 100,
            condition: { categoryExcludes: [5] }
          }
        ]
      };

      const engine = new FilterEngine(config);
      const game = createTestGame({ id: 1, category: 5 });

      const results = engine.applyFilters([game]);
      const result = results[0];

      // High priority filter should be evaluated first
      expect(result.failedFilters[0]).toBe('high-priority');
    });
  });
});
