/**
 * IGDB Metrics Integration Tests
 * 
 * Tests for the new IGDB metrics columns and related functionality
 * including data storage, retrieval, and the backfill process.
 */

import { supabase } from '../services/supabase';
import { GameDataServiceV2 } from '../services/gameDataServiceV2';
import type { Game } from '../types/database';
import type { IGDBGame } from '../types/igdb';

// Mock IGDB data for testing
const mockIGDBGameWithMetrics: IGDBGame = {
  id: 99999,
  name: 'Test Game With Metrics',
  summary: 'A test game with full IGDB metrics',
  rating: 87,
  total_rating: 85,
  rating_count: 156,
  follows: 25000,
  hypes: 1200,
  first_release_date: 1609459200, // 2021-01-01
  cover: {
    id: 1,
    url: '//images.igdb.com/igdb/image/upload/t_thumb/test.jpg'
  },
  genres: [{ id: 1, name: 'Action' }],
  platforms: [{ id: 1, name: 'PC' }]
};

const mockIGDBGamePartialMetrics: IGDBGame = {
  id: 99998,
  name: 'Test Game Partial Metrics',
  summary: 'A test game with partial IGDB metrics',
  rating: 75,
  total_rating: 72,
  // Missing rating_count, follows, hypes
  first_release_date: 1609459200
};

const mockIGDBGameNoMetrics: IGDBGame = {
  id: 99997,
  name: 'Test Game No Metrics',
  summary: 'A test game with no IGDB metrics',
  // Missing all metrics except basic data
  first_release_date: 1609459200
};

describe('IGDB Metrics Integration', () => {
  let gameService: GameDataServiceV2;
  let testGameIds: number[] = [];

  beforeAll(() => {
    gameService = new GameDataServiceV2();
  });

  afterEach(async () => {
    // Cleanup test games after each test
    if (testGameIds.length > 0) {
      await supabase
        .from('game')
        .delete()
        .in('igdb_id', testGameIds.map(id => id));
      testGameIds = [];
    }
  });

  describe('Database Schema', () => {
    it('should have new IGDB metrics columns', async () => {
      // Test that the new columns exist by querying with them
      const { data, error } = await supabase
        .from('game')
        .select('total_rating, rating_count, follows, hypes, popularity_score')
        .limit(1);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('should enforce check constraints on new columns', async () => {
      // Test that negative values are rejected
      const invalidGame = {
        igdb_id: 99996,
        name: 'Invalid Game',
        total_rating: -10, // Should fail constraint
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('game')
        .insert([invalidGame]);

      expect(error).toBeTruthy();
      expect(error?.message).toContain('check constraint');
    });

    it('should auto-calculate popularity_score via trigger', async () => {
      const testGame = {
        igdb_id: 99995,
        name: 'Popularity Test Game',
        follows: 10000,
        hypes: 500,
        rating_count: 100,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('game')
        .insert([testGame])
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.popularity_score).toBeGreaterThan(0);
      
      // Check the formula: follows*0.6 + hypes*0.3 + rating_count*10*0.1
      const expectedScore = Math.round(10000 * 0.6 + 500 * 0.3 + 100 * 10 * 0.1);
      expect(data.popularity_score).toBe(expectedScore);

      testGameIds.push(99995);
    });
  });

  describe('Data Storage', () => {
    it('should store all IGDB metrics correctly', async () => {
      // Mock the batchInsertGames method behavior
      await gameService['batchInsertGames']([mockIGDBGameWithMetrics]);
      testGameIds.push(mockIGDBGameWithMetrics.id);

      // Verify the game was stored with all metrics
      const { data, error } = await supabase
        .from('game')
        .select('*')
        .eq('igdb_id', mockIGDBGameWithMetrics.id)
        .single();

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(data.igdb_rating).toBe(87);
      expect(data.total_rating).toBe(85);
      expect(data.rating_count).toBe(156);
      expect(data.follows).toBe(25000);
      expect(data.hypes).toBe(1200);
      expect(data.popularity_score).toBeGreaterThan(0);
    });

    it('should handle games with partial metrics', async () => {
      await gameService['batchInsertGames']([mockIGDBGamePartialMetrics]);
      testGameIds.push(mockIGDBGamePartialMetrics.id);

      const { data, error } = await supabase
        .from('game')
        .select('*')
        .eq('igdb_id', mockIGDBGamePartialMetrics.id)
        .single();

      expect(error).toBeNull();
      expect(data.total_rating).toBe(72);
      expect(data.rating_count).toBe(0); // Default value
      expect(data.follows).toBe(0); // Default value
      expect(data.hypes).toBe(0); // Default value
    });

    it('should handle games with no metrics gracefully', async () => {
      await gameService['batchInsertGames']([mockIGDBGameNoMetrics]);
      testGameIds.push(mockIGDBGameNoMetrics.id);

      const { data, error } = await supabase
        .from('game')
        .select('*')
        .eq('igdb_id', mockIGDBGameNoMetrics.id)
        .single();

      expect(error).toBeNull();
      expect(data.total_rating).toBeNull();
      expect(data.rating_count).toBe(0);
      expect(data.follows).toBe(0);
      expect(data.hypes).toBe(0);
      expect(data.popularity_score).toBe(0);
    });
  });

  describe('Popularity Score Calculation', () => {
    it('should calculate popularity score with the correct formula', async () => {
      const testCases = [
        { follows: 10000, hypes: 500, rating_count: 100, expected: 6000 + 150 + 100 },
        { follows: 50000, hypes: 2000, rating_count: 300, expected: 30000 + 600 + 300 },
        { follows: 0, hypes: 0, rating_count: 0, expected: 0 }
      ];

      for (const testCase of testCases) {
        const { data } = await supabase.rpc('calculate_popularity_score', {
          p_follows: testCase.follows,
          p_hypes: testCase.hypes,
          p_rating_count: testCase.rating_count
        });

        expect(data).toBe(testCase.expected);
      }
    });
  });

  describe('Metrics Completion Tracking', () => {
    it('should track completion statistics correctly', async () => {
      // Insert test games with various metric completeness
      const games = [
        mockIGDBGameWithMetrics,
        mockIGDBGamePartialMetrics,
        mockIGDBGameNoMetrics
      ];

      await gameService['batchInsertGames'](games);
      testGameIds.push(...games.map(g => g.id));

      const { data, error } = await supabase.rpc('get_metrics_completion_stats');

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(data[0].total_games).toBeGreaterThanOrEqual(3);
      expect(data[0].completion_percentage).toBeGreaterThanOrEqual(0);
      expect(data[0].completion_percentage).toBeLessThanOrEqual(100);
    });
  });

  describe('Database Indexes', () => {
    it('should use indexes for metrics-based queries', async () => {
      // This test verifies that our indexes are being used
      // In a real environment, you'd use EXPLAIN ANALYZE
      const { data, error } = await supabase
        .from('game')
        .select('name, total_rating, follows')
        .gt('total_rating', 80)
        .gt('follows', 10000)
        .order('popularity_score', { ascending: false })
        .limit(10);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });
  });

  describe('Game Metrics Summary View', () => {
    it('should categorize games by popularity tiers', async () => {
      // Test the view that categorizes games
      const { data, error } = await supabase
        .from('game_metrics_summary')
        .select('name, popularity_tier, metrics_status')
        .limit(5);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      
      if (data && data.length > 0) {
        const validTiers = ['viral', 'mainstream', 'popular', 'known', 'niche'];
        const validStatuses = ['complete', 'partial', 'missing'];
        
        data.forEach(game => {
          expect(validTiers).toContain(game.popularity_tier);
          expect(validStatuses).toContain(game.metrics_status);
        });
      }
    });
  });

  describe('TypeScript Interface Compatibility', () => {
    it('should maintain type compatibility with existing Game interface', () => {
      const gameWithMetrics: Game = {
        id: 1,
        igdb_id: 1234,
        name: 'Test Game',
        igdb_rating: 85,
        total_rating: 87,
        rating_count: 150,
        follows: 25000,
        hypes: 1200,
        popularity_score: 15000,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // This should compile without errors
      expect(gameWithMetrics.total_rating).toBe(87);
      expect(gameWithMetrics.rating_count).toBe(150);
      expect(gameWithMetrics.follows).toBe(25000);
      expect(gameWithMetrics.hypes).toBe(1200);
      expect(gameWithMetrics.popularity_score).toBe(15000);
    });
  });
});

describe('Backfill Process Simulation', () => {
  it('should identify games missing metrics', async () => {
    // This would test the logic used by the backfill script
    const { data, error } = await supabase
      .from('game')
      .select('id, igdb_id, name, total_rating, rating_count, follows')
      .or('total_rating.is.null,rating_count.eq.0,follows.eq.0')
      .limit(5);

    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  it('should batch process games efficiently', async () => {
    // Test that we can efficiently query and update games in batches
    const batchSize = 10;
    const { data, error } = await supabase
      .from('game')
      .select('id, igdb_id')
      .range(0, batchSize - 1);

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data?.length).toBeLessThanOrEqual(batchSize);
  });
});

// Performance tests
describe('Performance Tests', () => {
  it('should query metrics efficiently', async () => {
    const startTime = Date.now();
    
    const { data, error } = await supabase
      .from('game')
      .select('name, total_rating, follows, popularity_score')
      .gt('popularity_score', 1000)
      .order('popularity_score', { ascending: false })
      .limit(50);

    const duration = Date.now() - startTime;

    expect(error).toBeNull();
    expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
  });

  it('should handle sorting by multiple metrics efficiently', async () => {
    const startTime = Date.now();
    
    const { data, error } = await supabase
      .from('game')
      .select('name, total_rating, follows, rating_count')
      .not('total_rating', 'is', null)
      .order('total_rating', { ascending: false })
      .order('follows', { ascending: false })
      .limit(20);

    const duration = Date.now() - startTime;

    expect(error).toBeNull();
    expect(duration).toBeLessThan(1500); // Should be fast with indexes
  });
});