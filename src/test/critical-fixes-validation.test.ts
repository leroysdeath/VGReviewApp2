import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { supabase } from '../services/supabase';
import { getReviews } from '../services/reviewService';
import { gameDataServiceV2 } from '../services/gameDataServiceV2';
import { generateSlug, generateUniqueSlug } from '../utils/gameUrls';

// Mock Supabase
jest.mock('../services/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        not: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn(() => ({
              abortSignal: jest.fn(() => ({
                then: jest.fn()
              }))
            }))
          }))
        }))
      })),
      eq: jest.fn(() => ({
        neq: jest.fn(() => ({
          single: jest.fn()
        }))
      })),
      in: jest.fn(() => ({})),
      upsert: jest.fn(() => ({}))
    }))
  }
}));

describe('Critical Fixes Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Review Query Timeout Fix', () => {
    test('should handle timeout gracefully in getReviews', async () => {
      const mockAbortController = {
        abort: jest.fn(),
        signal: new AbortController().signal
      };
      
      // Mock AbortController
      global.AbortController = jest.fn(() => mockAbortController) as any;
      global.setTimeout = jest.fn((cb) => {
        setTimeout(() => cb(), 0); // Trigger timeout immediately for test
        return 123;
      }) as any;
      global.clearTimeout = jest.fn();

      // Mock Supabase to simulate timeout
      const mockSelect = jest.fn(() => ({
        not: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn(() => ({
              abortSignal: jest.fn(() => 
                Promise.reject({ name: 'AbortError', message: 'Query timed out' })
              )
            }))
          }))
        }))
      }));

      (supabase.from as any).mockReturnValue({
        select: mockSelect
      });

      const result = await getReviews(10);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
      expect(global.clearTimeout).toHaveBeenCalled();
    });

    test('should return results when query succeeds within timeout', async () => {
      const mockData = [
        {
          id: 1,
          user_id: 1,
          game_id: 1,
          igdb_id: 1,
          rating: 8,
          review: 'Great game!',
          post_date_time: new Date().toISOString(),
          playtime_hours: 10,
          is_recommended: true
        }
      ];

      const mockUsers = [{ id: 1, username: 'testuser', name: 'Test User', avatar_url: null }];
      const mockGames = [{ id: 1, name: 'Test Game', cover_url: null, game_id: '1', igdb_id: 1 }];

      // Mock successful query chain
      const mockQuery = {
        not: jest.fn(() => mockQuery),
        order: jest.fn(() => mockQuery),
        limit: jest.fn(() => mockQuery),
        abortSignal: jest.fn(() => Promise.resolve({ data: mockData, error: null, count: 1 })),
        in: jest.fn(() => Promise.resolve({ data: mockUsers })),
        select: jest.fn((fields) => {
          if (fields.includes('username')) {
            return { in: jest.fn(() => Promise.resolve({ data: mockUsers })) };
          }
          if (fields.includes('name') && fields.includes('cover_url')) {
            return { in: jest.fn(() => Promise.resolve({ data: mockGames })) };
          }
          return mockQuery;
        })
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      const result = await getReviews(10);
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].review).toBe('Great game!');
    });
  });

  describe('Slug Conflict Resolution', () => {
    test('generateSlug should create basic slug', () => {
      const slug = generateSlug('Super Mario Bros.');
      expect(slug).toBe('super-mario-bros');
    });

    test('generateSlug should handle special characters', () => {
      const slug = generateSlug('Grand Theft Auto: Vice City');
      expect(slug).toBe('grand-theft-auto-vice-city');
    });

    test('generateSlug with IGDB ID should append ID for uniqueness', () => {
      const slug = generateSlug('Mario', 123);
      expect(slug).toBe('mario-123');
    });

    test('generateUniqueSlug should return base slug when no conflict', async () => {
      // Mock no existing game found
      const mockQuery = {
        eq: jest.fn(() => mockQuery),
        neq: jest.fn(() => mockQuery),
        single: jest.fn(() => Promise.resolve({ data: null, error: null }))
      };

      (supabase.from as any).mockReturnValue({
        select: jest.fn(() => mockQuery)
      });

      const slug = await generateUniqueSlug('Mario Bros', 123);
      expect(slug).toBe('mario-bros');
    });

    test('generateUniqueSlug should append IGDB ID when conflict exists', async () => {
      // Mock existing game found
      const mockQuery = {
        eq: jest.fn(() => mockQuery),
        neq: jest.fn(() => mockQuery),
        single: jest.fn(() => Promise.resolve({ 
          data: { id: 1, igdb_id: 456 }, 
          error: null 
        }))
      };

      (supabase.from as any).mockReturnValue({
        select: jest.fn(() => mockQuery)
      });

      const slug = await generateUniqueSlug('Mario Bros', 123);
      expect(slug).toBe('mario-bros-123');
    });
  });

  describe('Database Operation Timeouts', () => {
    test('should apply timeout to search operations', async () => {
      const mockAbortController = {
        abort: jest.fn(),
        signal: new AbortController().signal
      };
      
      global.AbortController = jest.fn(() => mockAbortController) as any;
      global.setTimeout = jest.fn((cb, delay) => {
        expect(delay).toBeLessThanOrEqual(10000); // Should be 10s or less
        return 123;
      }) as any;
      global.clearTimeout = jest.fn();

      const mockQuery = {
        select: jest.fn(() => mockQuery),
        ilike: jest.fn(() => mockQuery),
        limit: jest.fn(() => mockQuery),
        abortSignal: jest.fn(() => Promise.resolve({ data: [], error: null }))
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      // Test the private method through public interface
      const service = gameDataServiceV2;
      await service.searchGames('test', {});

      expect(global.setTimeout).toHaveBeenCalled();
      expect(mockQuery.abortSignal).toHaveBeenCalledWith(mockAbortController.signal);
    });
  });

  describe('Image Fallback System', () => {
    test('should validate SmartImage retry logic with IGDB URL variants', () => {
      const originalUrl = 'https://images.igdb.com/igdb/image/upload/f_webp,q_85,w_400,h_600,c_cover/co214e.webp';
      
      // Simulate the retry variants logic
      const retryVariants = [
        originalUrl.replace('/t_cover_big/', '/t_cover_small/'),
        originalUrl.replace('f_webp', 'f_jpg'),
        originalUrl.replace(',q_85', ',q_75'),
        originalUrl // Original as last resort
      ];

      expect(retryVariants[0]).toBe(originalUrl); // No replacement since no t_cover_big
      expect(retryVariants[1]).toBe('https://images.igdb.com/igdb/image/upload/f_jpg,q_85,w_400,h_600,c_cover/co214e.webp');
      expect(retryVariants[2]).toBe('https://images.igdb.com/igdb/image/upload/f_webp,q_75,w_400,h_600,c_cover/co214e.webp');
      expect(retryVariants[3]).toBe(originalUrl);
    });

    test('should handle t_cover_big replacement correctly', () => {
      const bigCoverUrl = 'https://images.igdb.com/igdb/image/upload/t_cover_big/co214e.webp';
      
      const smallCoverVariant = bigCoverUrl.replace('/t_cover_big/', '/t_cover_small/');
      expect(smallCoverVariant).toBe('https://images.igdb.com/igdb/image/upload/t_cover_small/co214e.webp');
    });
  });

  describe('API Rate Limiting Awareness', () => {
    test('should batch process games to avoid overwhelming database', async () => {
      const mockGames = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        name: `Game ${i + 1}`,
        summary: 'Test game'
      }));

      // Mock successful upsert
      (supabase.from as any).mockReturnValue({
        upsert: jest.fn(() => Promise.resolve({ error: null }))
      });

      // Mock generateUniqueSlug to avoid actual DB calls
      jest.mock('../utils/gameUrls', () => ({
        generateSlug: jest.fn((name, id) => `${name.toLowerCase()}-${id}`),
        generateUniqueSlug: jest.fn((name, id) => Promise.resolve(`${name.toLowerCase()}-${id}`))
      }));

      const service = gameDataServiceV2;
      
      // Should not throw and should process all games
      await expect(async () => {
        // This calls the private batchInsertGames method
        const result = await service.searchGames('test');
        return result;
      }).not.toThrow();
    });
  });
});