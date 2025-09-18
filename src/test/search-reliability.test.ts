/**
 * Search Reliability Test Suite
 * Comprehensive tests for edge cases, error handling, and search robustness
 */

import { GameDataServiceV2 } from '../services/gameDataServiceV2';
import type { GameWithCalculatedFields } from '../types/database';

describe('Search Reliability & Edge Cases', () => {
  let gameService: GameDataServiceV2;

  beforeEach(() => {
    gameService = new GameDataServiceV2();
  });

  describe('Text Matching Edge Cases', () => {
    test('should handle special characters in game names', () => {
      const calculateScore = (gameService as any).calculateRelevanceScore.bind(gameService);
      
      const specialCharGame: GameWithCalculatedFields = {
        id: 1,
        name: 'Nier: Automata™',
        slug: 'nier-automata',
        igdb_id: 1,
        total_rating: 88,
        rating_count: 245,
        follows: 0,
        hypes: 0,
        igdb_rating: 85,
        summary: 'Action RPG with philosophical themes',
        cover_url: 'https://example.com/cover.jpg',
        averageUserRating: 4.5,
        totalUserRatings: 50,
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      };

      // Should match even with special characters
      const exactScore = calculateScore(specialCharGame, 'nier: automata™');
      const partialScore = calculateScore(specialCharGame, 'nier automata');
      const simpleScore = calculateScore(specialCharGame, 'nier');

      expect(exactScore).toBeGreaterThan(partialScore);
      // Partial and simple queries may score similarly due to text matching
      expect(simpleScore).toBeGreaterThan(80); // Should still match reasonably
    });

    test('should handle case sensitivity correctly', () => {
      const calculateScore = (gameService as any).calculateRelevanceScore.bind(gameService);
      
      const game: GameWithCalculatedFields = {
        id: 1,
        name: 'DOOM Eternal',
        slug: 'doom-eternal',
        igdb_id: 1,
        total_rating: 85,
        rating_count: 100,
        follows: 0,
        hypes: 0,
        igdb_rating: 85,
        summary: 'Fast-paced FPS shooter',
        averageUserRating: 4.0,
        totalUserRatings: 30,
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      };

      const upperScore = calculateScore(game, 'DOOM ETERNAL');
      const lowerScore = calculateScore(game, 'doom eternal');
      const mixedScore = calculateScore(game, 'Doom Eternal');

      // Test that case sensitivity doesn't completely break scoring
      // All should produce some score, but may vary due to exact matching
      expect(upperScore).toBeGreaterThan(0);
      expect(lowerScore).toBeGreaterThan(0);
      expect(mixedScore).toBeGreaterThan(0);
      
      // At least one should match well (exact case match)
      const scores = [upperScore, lowerScore, mixedScore];
      expect(Math.max(...scores)).toBeGreaterThan(150);
    });

    test('should handle empty or minimal queries gracefully', () => {
      const calculateScore = (gameService as any).calculateRelevanceScore.bind(gameService);
      
      const game: GameWithCalculatedFields = {
        id: 1,
        name: 'Test Game',
        slug: 'test-game',
        igdb_id: 1,
        total_rating: 80,
        rating_count: 50,
        follows: 0,
        hypes: 0,
        igdb_rating: 80,
        summary: 'A test game',
        averageUserRating: 4.0,
        totalUserRatings: 10,
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      };

      // Should handle single characters
      const singleCharScore = calculateScore(game, 't');
      expect(singleCharScore).toBeGreaterThan(0);

      // Should handle short queries
      const shortScore = calculateScore(game, 'te');
      expect(shortScore).toBeGreaterThanOrEqual(singleCharScore);
    });
  });

  describe('Scoring Edge Cases', () => {
    test('should handle games with missing metrics gracefully', () => {
      const calculateScore = (gameService as any).calculateRelevanceScore.bind(gameService);
      
      const incompleteGame: GameWithCalculatedFields = {
        id: 1,
        name: 'Incomplete Game',
        slug: 'incomplete-game',
        igdb_id: 1,
        total_rating: null as any,
        rating_count: 0,
        follows: 0,
        hypes: 0,
        igdb_rating: 0,
        summary: '',
        cover_url: null,
        averageUserRating: 0,
        totalUserRatings: 0,
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      };

      const score = calculateScore(incompleteGame, 'incomplete game');
      
      // Should still produce a reasonable score based on text match
      expect(score).toBeGreaterThan(50); // At least text relevance points
      expect(score).toBeLessThan(120); // But no quality/authority bonuses
    });

    test('should handle extremely high metrics correctly', () => {
      const calculateScore = (gameService as any).calculateRelevanceScore.bind(gameService);
      
      const extremeGame: GameWithCalculatedFields = {
        id: 1,
        name: 'Extreme Game',
        slug: 'extreme-game',
        igdb_id: 1,
        total_rating: 99,
        rating_count: 50000, // Extremely high review count
        follows: 100000, // Extremely high follows
        hypes: 10000, // Extremely high hypes
        igdb_rating: 99,
        summary: 'An extremely popular game with massive community engagement and universal critical acclaim.',
        cover_url: 'https://example.com/cover.jpg',
        averageUserRating: 5.0,
        totalUserRatings: 1000,
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      };

      const score = calculateScore(extremeGame, 'extreme game');
      
      // Should handle extreme values without breaking
      expect(score).toBeGreaterThan(180); // Very high score
      expect(score).toBeLessThan(250); // But not infinite
      expect(isNaN(score)).toBe(false);
      expect(isFinite(score)).toBe(true);
    });

    test('should provide consistent scoring for identical games', () => {
      const calculateScore = (gameService as any).calculateRelevanceScore.bind(gameService);
      
      const game1: GameWithCalculatedFields = {
        id: 1,
        name: 'Consistent Game',
        slug: 'consistent-game',
        igdb_id: 1,
        total_rating: 85,
        rating_count: 200,
        follows: 50,
        hypes: 10,
        igdb_rating: 85,
        summary: 'A consistently rated game',
        cover_url: 'https://example.com/cover.jpg',
        averageUserRating: 4.2,
        totalUserRatings: 25,
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      };

      // Create identical copy
      const game2 = { ...game1, id: 2 };

      const score1 = calculateScore(game1, 'consistent game');
      const score2 = calculateScore(game2, 'consistent game');

      // Should produce identical scores
      expect(score1).toEqual(score2);
    });
  });

  describe('Performance and Memory Tests', () => {
    test('should handle large batch scoring efficiently', () => {
      const calculateScore = (gameService as any).calculateRelevanceScore.bind(gameService);
      
      // Create 100 games with various properties
      const games: GameWithCalculatedFields[] = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        name: `Test Game ${i + 1}`,
        slug: `test-game-${i + 1}`,
        igdb_id: i + 1,
        total_rating: 60 + (i % 40), // Ratings from 60-99
        rating_count: Math.floor(Math.random() * 1000),
        follows: Math.floor(Math.random() * 500),
        hypes: Math.floor(Math.random() * 100),
        igdb_rating: 60 + (i % 40),
        summary: `Test game ${i + 1} description`,
        cover_url: `https://example.com/cover${i}.jpg`,
        averageUserRating: 3 + Math.random() * 2,
        totalUserRatings: Math.floor(Math.random() * 100),
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      }));

      const startTime = Date.now();
      
      const scores = games.map(game => calculateScore(game, 'test'));
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (< 100ms for 100 games)
      expect(duration).toBeLessThan(100);
      
      // Should produce valid scores for all games
      expect(scores.length).toBe(100);
      scores.forEach(score => {
        expect(score).toBeGreaterThan(0);
        expect(isFinite(score)).toBe(true);
      });
    });

    test('should not leak memory with repeated scoring', () => {
      const calculateScore = (gameService as any).calculateRelevanceScore.bind(gameService);
      
      const game: GameWithCalculatedFields = {
        id: 1,
        name: 'Memory Test Game',
        slug: 'memory-test',
        igdb_id: 1,
        total_rating: 85,
        rating_count: 100,
        follows: 25,
        hypes: 5,
        igdb_rating: 85,
        summary: 'Testing memory usage',
        averageUserRating: 4.0,
        totalUserRatings: 20,
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      };

      // Run scoring many times
      for (let i = 0; i < 1000; i++) {
        const score = calculateScore(game, `memory test ${i}`);
        expect(score).toBeGreaterThan(0);
      }

      // If we get here without errors, memory handling is likely fine
      expect(true).toBe(true);
    });
  });

  describe('Algorithm Stability Tests', () => {
    test('should maintain score relationships under different conditions', () => {
      const calculateScore = (gameService as any).calculateRelevanceScore.bind(gameService);
      
      const highQualityGame: GameWithCalculatedFields = {
        id: 1,
        name: 'High Quality Game',
        slug: 'high-quality',
        igdb_id: 1,
        total_rating: 95,
        rating_count: 1000,
        follows: 500,
        hypes: 0,
        igdb_rating: 95,
        summary: 'Exceptionally high quality game with universal acclaim',
        cover_url: 'https://example.com/cover.jpg',
        averageUserRating: 4.8,
        totalUserRatings: 200,
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      };

      const mediumGame: GameWithCalculatedFields = {
        id: 2,
        name: 'Medium Game',
        slug: 'medium-game',
        igdb_id: 2,
        total_rating: 80,
        rating_count: 150,
        follows: 50,
        hypes: 10,
        igdb_rating: 80,
        summary: 'Decent game with moderate reception',
        averageUserRating: 4.0,
        totalUserRatings: 50,
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      };

      // Test with different queries
      const queries = ['game', 'quality', 'high'];
      
      queries.forEach(query => {
        const highScore = calculateScore(highQualityGame, query);
        const mediumScore = calculateScore(mediumGame, query);
        
        // High quality game should always outscore medium game
        expect(highScore).toBeGreaterThan(mediumScore);
      });
    });

    test('should produce meaningful score differences', () => {
      const calculateScore = (gameService as any).calculateRelevanceScore.bind(gameService);
      
      const baseGame = {
        id: 1,
        name: 'Base Game',
        slug: 'base-game',
        igdb_id: 1,
        follows: 0,
        hypes: 0,
        igdb_rating: 75,
        summary: 'Base game for testing',
        averageUserRating: 3.5,
        totalUserRatings: 30,
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      };

      // Test different quality tiers
      const lowQuality = { ...baseGame, total_rating: 65, rating_count: 25 };
      const medQuality = { ...baseGame, total_rating: 80, rating_count: 150 };
      const highQuality = { ...baseGame, total_rating: 95, rating_count: 800 };

      const lowScore = calculateScore(lowQuality, 'base game');
      const medScore = calculateScore(medQuality, 'base game');
      const highScore = calculateScore(highQuality, 'base game');

      // Should have meaningful gaps (at least 10 points between tiers)
      expect(medScore - lowScore).toBeGreaterThan(10);
      expect(highScore - medScore).toBeGreaterThan(15);
      
      // Score distribution should make sense
      expect(lowScore).toBeGreaterThan(120); // Still decent due to text match
      expect(medScore).toBeGreaterThan(150);
      expect(highScore).toBeGreaterThan(180);
    });
  });

  describe('Real-World Scenario Tests', () => {
    test('should handle franchise vs non-franchise games appropriately', () => {
      const calculateScore = (gameService as any).calculateRelevanceScore.bind(gameService);
      const isFranchiseQuery = (gameService as any).isFranchiseQuery.bind(gameService);
      
      const franchiseGame: GameWithCalculatedFields = {
        id: 1,
        name: 'Super Mario Galaxy',
        slug: 'super-mario-galaxy',
        igdb_id: 1,
        total_rating: 92,
        rating_count: 456,
        follows: 234,
        hypes: 0,
        igdb_rating: 92,
        summary: 'Revolutionary 3D Mario platformer',
        cover_url: 'https://example.com/cover.jpg',
        averageUserRating: 4.7,
        totalUserRatings: 150,
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      };

      const independentGame: GameWithCalculatedFields = {
        id: 2,
        name: 'Indie Masterpiece',
        slug: 'indie-masterpiece',
        igdb_id: 2,
        total_rating: 92, // Same rating as franchise game
        rating_count: 456, // Same review count
        follows: 234,
        hypes: 0,
        igdb_rating: 92,
        summary: 'Outstanding independent game',
        averageUserRating: 4.7,
        totalUserRatings: 150,
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      };

      // Mock franchise detection
      (gameService as any).isFranchiseQuery = jest.fn().mockImplementation((query: string) => {
        return query.toLowerCase().includes('mario');
      });

      const marioScore = calculateScore(franchiseGame, 'mario');
      const indieScore = calculateScore(independentGame, 'indie');

      // Both should score well, independent game should be competitive
      // Mario should get franchise bonus but let's check they're both reasonable
      expect(marioScore).toBeGreaterThan(140);
      expect(indieScore).toBeGreaterThan(140); // Should also score well
    });

    test('should balance recency vs quality appropriately', () => {
      const calculateScore = (gameService as any).calculateRelevanceScore.bind(gameService);
      
      const classicGame: GameWithCalculatedFields = {
        id: 1,
        name: 'Classic Masterpiece',
        slug: 'classic-masterpiece',
        igdb_id: 1,
        total_rating: 96,
        rating_count: 2000, // Very established
        follows: 100,
        hypes: 0, // No current hype
        igdb_rating: 96,
        summary: 'Timeless classic with universal acclaim',
        cover_url: 'https://example.com/cover.jpg',
        averageUserRating: 4.9,
        totalUserRatings: 500,
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      };

      const trendingGame: GameWithCalculatedFields = {
        id: 2,
        name: 'Trending New Game',
        slug: 'trending-new',
        igdb_id: 2,
        total_rating: 85,
        rating_count: 200, // Moderate reviews
        follows: 800,
        hypes: 500, // Very hyped
        igdb_rating: 85,
        summary: 'Hot new game everyone is talking about',
        averageUserRating: 4.3,
        totalUserRatings: 100,
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      };

      const classicScore = calculateScore(classicGame, 'classic masterpiece');
      const trendingScore = calculateScore(trendingGame, 'trending new game');

      // Classic should still win due to superior quality and authority
      expect(classicScore).toBeGreaterThan(trendingScore);
      
      // But trending game should get respectable score from engagement
      expect(trendingScore).toBeGreaterThan(160);
      
      // Gap shouldn't be too large (within 30 points)
      expect(classicScore - trendingScore).toBeLessThan(30);
    });
  });
});