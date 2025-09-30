/**
 * Unit tests for IGDB Service database fallback functionality
 * Tests the hybrid approach: Try IGDB API first, fall back to database
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Mock supabase before importing igdbService
jest.mock('../services/supabase', () => ({
  supabase: {
    rpc: jest.fn()
  }
}));

// Import after mock
import { supabase } from '../services/supabase';

describe('IGDB Service - Database Fallback', () => {
  const mockSupabaseRpc = supabase.rpc as jest.MockedFunction<typeof supabase.rpc>;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  describe('Database Fallback Scenarios', () => {
    it('should fallback to database when IGDB returns 404', async () => {
      // Mock 404 response from IGDB
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      // Mock database response
      mockSupabaseRpc.mockResolvedValue({
        data: [
          {
            id: 1,
            igdb_id: 1234,
            name: 'The Legend of Zelda',
            slug: 'the-legend-of-zelda',
            cover_url: 'https://images.igdb.com/igdb/image/upload/t_cover_big/test.jpg',
            release_date: '1986-02-21',
            category: 0
          }
        ],
        error: null
      });

      // Dynamically import igdbService to ensure mock is applied
      const { igdbService } = await import('../services/igdbService');

      const results = await igdbService.searchGames('zelda', 10);

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('The Legend of Zelda');
      expect(results[0].id).toBe(1234);
      expect(mockSupabaseRpc).toHaveBeenCalledWith('search_games_secure', {
        search_query: 'zelda',
        limit_count: 10
      });
    });

    it('should fallback to database when IGDB returns 500', async () => {
      // Mock 500 response from IGDB
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      // Mock database response
      mockSupabaseRpc.mockResolvedValue({
        data: [
          {
            id: 2,
            igdb_id: 5678,
            name: 'Pokemon Red',
            slug: 'pokemon-red',
            cover_url: 'https://images.igdb.com/igdb/image/upload/t_cover_big/poke.jpg'
          }
        ],
        error: null
      });

      const { igdbService } = await import('../services/igdbService');

      const results = await igdbService.searchGames('pokemon', 10);

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Pokemon Red');
      expect(mockSupabaseRpc).toHaveBeenCalled();
    });

    it('should fallback to database on network error', async () => {
      // Mock network error
      global.fetch = jest.fn().mockRejectedValue(new Error('Failed to fetch'));

      // Mock database response
      mockSupabaseRpc.mockResolvedValue({
        data: [
          {
            id: 3,
            igdb_id: 9012,
            name: 'Super Mario 64',
            slug: 'super-mario-64'
          }
        ],
        error: null
      });

      const { igdbService } = await import('../services/igdbService');

      const results = await igdbService.searchGames('mario', 10);

      expect(results).toHaveLength(1);
      expect(mockSupabaseRpc).toHaveBeenCalled();
    });

    it('should use IGDB when available (no fallback)', async () => {
      // Mock successful IGDB response
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          success: true,
          games: [
            {
              id: 1234,
              name: 'Zelda from IGDB',
              slug: 'zelda-igdb',
              cover: { url: 'https://igdb.com/cover.jpg' }
            }
          ]
        })
      });

      const { igdbService } = await import('../services/igdbService');

      const results = await igdbService.searchGames('zelda', 10);

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Zelda from IGDB');
      expect(results[0].id).toBe(1234);
      // Database should NOT be called
      expect(mockSupabaseRpc).not.toHaveBeenCalled();
    });
  });

  describe('Database Result Transformation', () => {
    it('should correctly transform database results to IGDB format', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404
      });

      mockSupabaseRpc.mockResolvedValue({
        data: [
          {
            id: 100,
            igdb_id: 5000,
            name: 'Test Game',
            slug: 'test-game',
            cover_url: 'https://example.com/cover.jpg',
            description: 'A test game description',
            release_date: '2020-01-15',
            category: 0,
            developer: 'Test Studios',
            publisher: 'Test Publisher'
          }
        ],
        error: null
      });

      const { igdbService } = await import('../services/igdbService');

      const results = await igdbService.searchGames('test', 10);

      expect(results[0]).toMatchObject({
        id: 5000, // Uses igdb_id
        name: 'Test Game',
        slug: 'test-game',
        summary: 'A test game description',
        category: 0
      });

      expect(results[0].cover).toBeDefined();
      expect(results[0].cover?.url).toBe('https://example.com/cover.jpg');
      expect(results[0].first_release_date).toBeDefined();
      expect(results[0].involved_companies).toBeDefined();
    });

    it('should handle missing optional fields gracefully', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404
      });

      mockSupabaseRpc.mockResolvedValue({
        data: [
          {
            id: 200,
            name: 'Minimal Game'
            // No cover_url, release_date, etc.
          }
        ],
        error: null
      });

      const { igdbService } = await import('../services/igdbService');

      const results = await igdbService.searchGames('minimal', 10);

      expect(results[0].name).toBe('Minimal Game');
      expect(results[0].cover).toBeUndefined();
      expect(results[0].first_release_date).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should return empty array if database search fails', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404
      });

      mockSupabaseRpc.mockResolvedValue({
        data: null,
        error: { message: 'Database error', code: 'PGRST116' }
      });

      const { igdbService } = await import('../services/igdbService');

      const results = await igdbService.searchGames('error', 10);

      expect(results).toEqual([]);
    });

    it('should return empty array if database returns no results', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404
      });

      mockSupabaseRpc.mockResolvedValue({
        data: [],
        error: null
      });

      const { igdbService } = await import('../services/igdbService');

      const results = await igdbService.searchGames('nonexistent', 10);

      expect(results).toEqual([]);
    });
  });

  describe('API Limit Respect', () => {
    it('should respect limit parameter and cap at 100 for database', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404
      });

      mockSupabaseRpc.mockResolvedValue({
        data: Array(50).fill(null).map((_, i) => ({
          id: i,
          name: `Game ${i}`
        })),
        error: null
      });

      const { igdbService } = await import('../services/igdbService');

      await igdbService.searchGames('test', 150);

      // Should cap at 100 even if 150 requested
      expect(mockSupabaseRpc).toHaveBeenCalledWith('search_games_secure', {
        search_query: 'test',
        limit_count: 100 // Capped
      });
    });
  });
});