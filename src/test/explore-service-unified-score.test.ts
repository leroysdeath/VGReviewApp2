import { fetchGamesWithReviewMetrics, ExploreGame } from '../services/exploreService';
import { supabase } from '../services/supabase';
import { faker } from '@faker-js/faker';

// ============================================
// Mock Supabase
// ============================================

jest.mock('../services/supabase', () => ({
  supabase: {
    rpc: jest.fn(),
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
  },
}));

// ============================================
// Test Data Factories for Unified Score Testing
// ============================================

const createMockRating = (gameId: number, rating: number) => ({
  game_id: gameId,
  rating: rating,
});

const createMockGameWithStats = (overrides: Partial<any> = {}) => ({
  id: faker.number.int({ min: 1, max: 100000 }),
  igdb_id: faker.number.int({ min: 1000, max: 99999 }),
  name: faker.commerce.productName(),
  description: faker.lorem.paragraphs(2),
  summary: faker.lorem.paragraph(),
  release_date: faker.date.past({ years: 5 }).toISOString().split('T')[0],
  cover_url: `https://images.igdb.com/igdb/image/upload/t_cover_big/${faker.string.alphanumeric(12)}.jpg`,
  platforms: faker.helpers.arrayElements(['PC', 'PlayStation 5', 'Xbox Series X'], 2),
  category: 0,
  greenlight_flag: true,
  redlight_flag: false,
  ...overrides,
});

// ============================================
// Helper Functions for Score Calculation
// ============================================

function calculateExpectedUnifiedScore(avgRating: number, reviewCount: number, views: number = 0): number {
  if (reviewCount === 0 || avgRating === 0) return 0;
  
  // Normalize rating to 0-1 scale (assuming 1-10 rating scale)
  const normalizedRating = Math.max(0, (avgRating - 1) / 9);
  
  // Apply logarithmic scaling to review count
  const reviewScore = Math.log10(reviewCount + 1) / Math.log10(100);
  
  // Apply logarithmic scaling to views
  const viewScore = views > 0 ? Math.log10(views + 1) / Math.log10(10000) : 0;
  
  // Combine factors with weights: 50% rating, 35% reviews, 15% views
  const unifiedScore = (normalizedRating * 0.5) + (reviewScore * 0.35) + (viewScore * 0.15);
  
  return unifiedScore;
}

// ============================================
// Test Suite
// ============================================

describe('Explore Service Unified Score System', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // Unified Score Calculation Tests
  // ============================================
  
  describe('Unified Score Calculation', () => {
    test('should calculate unified scores correctly for different game profiles', async () => {
      // Create test data with known rating and review patterns
      const testGames = [
        { id: 1, name: 'High Rating Low Reviews', ratings: [9, 9, 9] }, // 3 reviews, 9.0 avg
        { id: 2, name: 'Medium Rating High Reviews', ratings: Array(50).fill(7) }, // 50 reviews, 7.0 avg
        { id: 3, name: 'Balanced Game', ratings: Array(20).fill(8) }, // 20 reviews, 8.0 avg
        { id: 4, name: 'Popular But Average', ratings: Array(100).fill(6) }, // 100 reviews, 6.0 avg
      ];

      // Create rating data
      const allRatings: any[] = [];
      testGames.forEach(game => {
        game.ratings.forEach(rating => {
          allRatings.push(createMockRating(game.id, rating));
        });
      });

      // Create game data
      const gameData = testGames.map(game => 
        createMockGameWithStats({ 
          id: game.id, 
          name: game.name 
        })
      );

      // Mock Supabase responses - RPC fails, fallback to manual calculation
      (supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: new Error('RPC not available') });
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        const mockChain = {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          not: jest.fn().mockReturnThis(),
        };
        
        if (table === 'rating') {
          return {
            ...mockChain,
            select: jest.fn().mockResolvedValue({
              data: allRatings,
              error: null,
            }),
          };
        } else if (table === 'game') {
          return {
            ...mockChain,
            not: jest.fn().mockResolvedValue({
              data: gameData,
              error: null,
            }),
          };
        }
        return mockChain;
      });

      const result = await fetchGamesWithReviewMetrics('unified_score', 10);

      expect(result).toHaveLength(4);

      // Verify unified scores are calculated and games are sorted
      const withScores = result.map((game: any) => ({
        name: game.name,
        avgRating: game.avg_user_rating,
        reviewCount: game.user_rating_count,
        unifiedScore: game.unified_score,
        expectedScore: calculateExpectedUnifiedScore(game.avg_user_rating, game.user_rating_count, 0),
      }));

      // Verify scores are calculated correctly
      withScores.forEach(game => {
        expect(game.unifiedScore).toBeCloseTo(game.expectedScore, 5);
      });

      // Verify sorting (highest unified score first)
      for (let i = 0; i < withScores.length - 1; i++) {
        expect(withScores[i].unifiedScore).toBeGreaterThanOrEqual(withScores[i + 1].unifiedScore);
      }
    });

    test('should handle edge cases in score calculation', async () => {
      const edgeCaseGames = [
        { id: 1, name: 'Single Perfect Review', ratings: [10] },
        { id: 2, name: 'Single Poor Review', ratings: [1] },
        { id: 3, name: 'Many Mixed Reviews', ratings: Array(200).fill(5) },
        { id: 4, name: 'High Variance', ratings: [1, 2, 3, 8, 9, 10] },
      ];

      const allRatings: any[] = [];
      edgeCaseGames.forEach(game => {
        game.ratings.forEach(rating => {
          allRatings.push(createMockRating(game.id, rating));
        });
      });

      const gameData = edgeCaseGames.map(game => 
        createMockGameWithStats({ 
          id: game.id, 
          name: game.name 
        })
      );

      (supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: new Error('RPC not available') });
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        const mockChain = {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          not: jest.fn().mockReturnThis(),
        };
        
        if (table === 'rating') {
          return {
            ...mockChain,
            select: jest.fn().mockResolvedValue({
              data: allRatings,
              error: null,
            }),
          };
        } else if (table === 'game') {
          return {
            ...mockChain,
            not: jest.fn().mockResolvedValue({
              data: gameData,
              error: null,
            }),
          };
        }
        return mockChain;
      });

      const result = await fetchGamesWithReviewMetrics('unified_score', 10);

      expect(result).toHaveLength(4);

      // All games should have valid unified scores
      result.forEach((game: any) => {
        expect(game.unified_score).toBeGreaterThan(0);
        expect(game.unified_score).toBeLessThanOrEqual(1);
        expect(typeof game.unified_score).toBe('number');
      });
    });

    test('should exclude games with no reviews', async () => {
      const gamesWithAndWithoutReviews = [
        { id: 1, name: 'Game With Reviews', hasReviews: true },
        { id: 2, name: 'Game Without Reviews', hasReviews: false },
        { id: 3, name: 'Another Reviewed Game', hasReviews: true },
      ];

      // Only create ratings for games that should have them
      const allRatings = [
        createMockRating(1, 8),
        createMockRating(1, 7),
        createMockRating(3, 9),
      ];

      const gameData = gamesWithAndWithoutReviews.map(game => 
        createMockGameWithStats({ 
          id: game.id, 
          name: game.name 
        })
      );

      (supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: new Error('RPC not available') });
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        const mockChain = {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          not: jest.fn().mockReturnThis(),
        };
        
        if (table === 'rating') {
          return {
            ...mockChain,
            select: jest.fn().mockResolvedValue({
              data: allRatings,
              error: null,
            }),
          };
        } else if (table === 'game') {
          return {
            ...mockChain,
            not: jest.fn().mockResolvedValue({
              data: gameData,
              error: null,
            }),
          };
        }
        return mockChain;
      });

      const result = await fetchGamesWithReviewMetrics('unified_score', 10);

      // Should only return games with reviews
      expect(result).toHaveLength(2);
      expect(result.find((g: any) => g.name === 'Game With Reviews')).toBeTruthy();
      expect(result.find((g: any) => g.name === 'Another Reviewed Game')).toBeTruthy();
      expect(result.find((g: any) => g.name === 'Game Without Reviews')).toBeFalsy();
    });
  });

  // ============================================
  // Ranking and Sorting Tests
  // ============================================
  
  describe('Ranking and Sorting', () => {
    test('should rank games by unified score correctly', async () => {
      // Create games with predictable unified scores
      const rankedGames = [
        { id: 1, name: 'Top Game', ratings: Array(30).fill(9) }, // High rating, good reviews
        { id: 2, name: 'Second Game', ratings: Array(50).fill(7) }, // Lower rating, more reviews
        { id: 3, name: 'Third Game', ratings: Array(10).fill(8) }, // Good rating, fewer reviews
        { id: 4, name: 'Fourth Game', ratings: Array(5).fill(6) }, // Lower rating, few reviews
      ];

      const allRatings: any[] = [];
      rankedGames.forEach(game => {
        game.ratings.forEach(rating => {
          allRatings.push(createMockRating(game.id, rating));
        });
      });

      const gameData = rankedGames.map(game => 
        createMockGameWithStats({ 
          id: game.id, 
          name: game.name 
        })
      );

      (supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: new Error('RPC not available') });
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        const mockChain = {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          not: jest.fn().mockReturnThis(),
        };
        
        if (table === 'rating') {
          return {
            ...mockChain,
            select: jest.fn().mockResolvedValue({
              data: allRatings,
              error: null,
            }),
          };
        } else if (table === 'game') {
          return {
            ...mockChain,
            not: jest.fn().mockResolvedValue({
              data: gameData,
              error: null,
            }),
          };
        }
        return mockChain;
      });

      const result = await fetchGamesWithReviewMetrics('unified_score', 10);

      // Verify ranking order
      const gameNames = result.map((game: any) => game.name);
      
      // Top game should rank higher due to excellent rating despite fewer reviews than second game
      const topGameIndex = gameNames.indexOf('Top Game');
      const secondGameIndex = gameNames.indexOf('Second Game');
      const thirdGameIndex = gameNames.indexOf('Third Game');
      const fourthGameIndex = gameNames.indexOf('Fourth Game');

      expect(topGameIndex).toBeGreaterThanOrEqual(0);
      expect(secondGameIndex).toBeGreaterThanOrEqual(0);
      expect(thirdGameIndex).toBeGreaterThanOrEqual(0);
      expect(fourthGameIndex).toBeGreaterThanOrEqual(0);

      // Verify unified scores are in descending order
      for (let i = 0; i < result.length - 1; i++) {
        expect((result[i] as any).unified_score).toBeGreaterThanOrEqual((result[i + 1] as any).unified_score);
      }
    });

    test('should handle tied unified scores gracefully', async () => {
      // Create games with identical rating patterns (should have same unified score)
      const tiedGames = [
        { id: 1, name: 'Tied Game A', ratings: Array(20).fill(8) },
        { id: 2, name: 'Tied Game B', ratings: Array(20).fill(8) },
        { id: 3, name: 'Different Game', ratings: Array(10).fill(9) },
      ];

      const allRatings: any[] = [];
      tiedGames.forEach(game => {
        game.ratings.forEach(rating => {
          allRatings.push(createMockRating(game.id, rating));
        });
      });

      const gameData = tiedGames.map(game => 
        createMockGameWithStats({ 
          id: game.id, 
          name: game.name 
        })
      );

      (supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: new Error('RPC not available') });
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        const mockChain = {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          not: jest.fn().mockReturnThis(),
        };
        
        if (table === 'rating') {
          return {
            ...mockChain,
            select: jest.fn().mockResolvedValue({
              data: allRatings,
              error: null,
            }),
          };
        } else if (table === 'game') {
          return {
            ...mockChain,
            not: jest.fn().mockResolvedValue({
              data: gameData,
              error: null,
            }),
          };
        }
        return mockChain;
      });

      const result = await fetchGamesWithReviewMetrics('unified_score', 10);

      expect(result).toHaveLength(3);

      // Find tied games
      const tiedGameA = result.find((g: any) => g.name === 'Tied Game A');
      const tiedGameB = result.find((g: any) => g.name === 'Tied Game B');

      expect(tiedGameA).toBeTruthy();
      expect(tiedGameB).toBeTruthy();

      // They should have the same unified score
      expect((tiedGameA as any).unified_score).toBeCloseTo((tiedGameB as any).unified_score, 5);
    });
  });

  // ============================================
  // Performance and Scalability Tests
  // ============================================
  
  describe('Performance with Large Datasets', () => {
    test('should handle large number of games efficiently', async () => {
      const largeGameSet = Array.from({ length: 1000 }, (_, index) => ({
        id: index + 1,
        name: `Game ${index + 1}`,
        ratings: Array(faker.number.int({ min: 1, max: 100 })).fill(
          faker.number.int({ min: 1, max: 10 })
        ),
      }));

      const allRatings: any[] = [];
      largeGameSet.forEach(game => {
        game.ratings.forEach(rating => {
          allRatings.push(createMockRating(game.id, rating));
        });
      });

      const gameData = largeGameSet.map(game => 
        createMockGameWithStats({ 
          id: game.id, 
          name: game.name 
        })
      );

      (supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: new Error('RPC not available') });
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        const mockChain = {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          not: jest.fn().mockReturnThis(),
        };
        
        if (table === 'rating') {
          return {
            ...mockChain,
            select: jest.fn().mockResolvedValue({
              data: allRatings,
              error: null,
            }),
          };
        } else if (table === 'game') {
          return {
            ...mockChain,
            not: jest.fn().mockResolvedValue({
              data: gameData,
              error: null,
            }),
          };
        }
        return mockChain;
      });

      const startTime = Date.now();
      const result = await fetchGamesWithReviewMetrics('unified_score', 40);
      const endTime = Date.now();

      // Should complete in reasonable time (less than 1 second for test environment)
      expect(endTime - startTime).toBeLessThan(1000);
      
      // Should return requested number of games
      expect(result).toHaveLength(40);
      
      // All should have valid unified scores
      result.forEach((game: any) => {
        expect(game.unified_score).toBeGreaterThan(0);
        expect(typeof game.unified_score).toBe('number');
      });
    });

    test('should respect limit parameter even with large datasets', async () => {
      const manyGames = Array.from({ length: 500 }, (_, index) => ({
        id: index + 1,
        name: `Game ${index + 1}`,
        ratings: [faker.number.int({ min: 5, max: 10 })],
      }));

      const allRatings: any[] = [];
      manyGames.forEach(game => {
        game.ratings.forEach(rating => {
          allRatings.push(createMockRating(game.id, rating));
        });
      });

      const gameData = manyGames.map(game => 
        createMockGameWithStats({ 
          id: game.id, 
          name: game.name 
        })
      );

      (supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: new Error('RPC not available') });
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        const mockChain = {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          not: jest.fn().mockReturnThis(),
        };
        
        if (table === 'rating') {
          return {
            ...mockChain,
            select: jest.fn().mockResolvedValue({
              data: allRatings,
              error: null,
            }),
          };
        } else if (table === 'game') {
          return {
            ...mockChain,
            not: jest.fn().mockResolvedValue({
              data: gameData,
              error: null,
            }),
          };
        }
        return mockChain;
      });

      const testLimits = [5, 10, 25, 50];

      for (const limit of testLimits) {
        const result = await fetchGamesWithReviewMetrics('unified_score', limit);
        expect(result).toHaveLength(limit);
      }
    });
  });

  // ============================================
  // Data Quality and Validation Tests
  // ============================================
  
  describe('Data Quality and Validation', () => {
    test('should exclude redlighted games from results', async () => {
      const mixedGames = [
        { id: 1, name: 'Good Game', redlight: false, ratings: [8, 9, 7] },
        { id: 2, name: 'Banned Game', redlight: true, ratings: [10, 10, 10] },
        { id: 3, name: 'Another Good Game', redlight: false, ratings: [8, 8, 8] },
      ];

      const allRatings: any[] = [];
      mixedGames.forEach(game => {
        game.ratings.forEach(rating => {
          allRatings.push(createMockRating(game.id, rating));
        });
      });

      const gameData = mixedGames.map(game => 
        createMockGameWithStats({ 
          id: game.id, 
          name: game.name,
          redlight_flag: game.redlight,
        })
      );

      (supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: new Error('RPC not available') });
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'rating') {
          return {
            select: jest.fn().mockReturnValue({
              data: allRatings,
              error: null,
            }),
          };
        } else if (table === 'game') {
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
            not: jest.fn().mockReturnValue({
              data: gameData.filter(g => !g.redlight_flag), // Simulate database filtering
              error: null,
            }),
          };
        }
        return {};
      });

      const result = await fetchGamesWithReviewMetrics('unified_score', 10);

      // Should only return non-redlighted games
      expect(result).toHaveLength(2);
      expect(result.find((g: any) => g.name === 'Good Game')).toBeTruthy();
      expect(result.find((g: any) => g.name === 'Another Good Game')).toBeTruthy();
      expect(result.find((g: any) => g.name === 'Banned Game')).toBeFalsy();

      // All returned games should have redlight_flag as false
      result.forEach((game: any) => {
        expect(game.redlight_flag).toBe(false);
      });
    });

    test('should return games with valid data structure', async () => {
      const testGames = [
        { id: 1, name: 'Test Game', ratings: [8, 9, 7] },
      ];

      const allRatings = testGames.flatMap(game =>
        game.ratings.map(rating => createMockRating(game.id, rating))
      );

      const gameData = testGames.map(game => 
        createMockGameWithStats({ 
          id: game.id, 
          name: game.name 
        })
      );

      (supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: new Error('RPC not available') });
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        const mockChain = {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          not: jest.fn().mockReturnThis(),
        };
        
        if (table === 'rating') {
          return {
            ...mockChain,
            select: jest.fn().mockResolvedValue({
              data: allRatings,
              error: null,
            }),
          };
        } else if (table === 'game') {
          return {
            ...mockChain,
            not: jest.fn().mockResolvedValue({
              data: gameData,
              error: null,
            }),
          };
        }
        return mockChain;
      });

      const result = await fetchGamesWithReviewMetrics('unified_score', 10);

      expect(result).toHaveLength(1);

      const game = result[0] as any;

      // Required fields
      expect(typeof game.id).toBe('number');
      expect(typeof game.name).toBe('string');
      expect(typeof game.user_rating_count).toBe('number');
      expect(typeof game.avg_user_rating).toBe('number');
      expect(typeof game.unified_score).toBe('number');

      // Rating count should match input
      expect(game.user_rating_count).toBe(3);
      
      // Average rating should be calculated correctly
      expect(game.avg_user_rating).toBeCloseTo(8, 1); // (8+9+7)/3 = 8

      // Unified score should be valid
      expect(game.unified_score).toBeGreaterThan(0);
      expect(game.unified_score).toBeLessThanOrEqual(1);
    });
  });
});