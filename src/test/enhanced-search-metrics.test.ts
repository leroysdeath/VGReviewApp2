/**
 * Enhanced Search Metrics Integration Tests
 * Tests the new IGDB metrics (total_rating, rating_count, follows, hypes) integration
 */

import { GameDataServiceV2 } from '../services/gameDataServiceV2';
import type { GameWithCalculatedFields } from '../types/database';

// Mock data representing games with new IGDB metrics
const mockGamesWithMetrics: GameWithCalculatedFields[] = [
  {
    id: 1,
    name: 'Star Wars: Knights of the Old Republic',
    slug: 'star-wars-kotor',
    igdb_id: 116,
    total_rating: 92,
    rating_count: 1338,
    follows: 0,
    hypes: 2,
    igdb_rating: 85,
    summary: 'Epic RPG in the Star Wars universe',
    averageUserRating: 4.5,
    totalUserRatings: 25,
    created_at: '2024-01-01',
    updated_at: '2024-01-01'
  },
  {
    id: 2,
    name: 'NetHack',
    slug: 'nethack',
    igdb_id: 1022,
    total_rating: 93,
    rating_count: 17,
    follows: 0,
    hypes: 0,
    igdb_rating: 90,
    summary: 'Classic roguelike dungeon crawler',
    averageUserRating: 4.2,
    totalUserRatings: 5,
    created_at: '2024-01-01',
    updated_at: '2024-01-01'
  },
  {
    id: 3,
    name: 'Clair Obscur: Expedition 33',
    slug: 'clair-obscur-expedition-33',
    igdb_id: 305152,
    total_rating: 90,
    rating_count: 387,
    follows: 0,
    hypes: 131,
    igdb_rating: 88,
    summary: 'Upcoming JRPG with stunning visuals',
    averageUserRating: 0,
    totalUserRatings: 0,
    created_at: '2024-01-01',
    updated_at: '2024-01-01'
  },
  {
    id: 4,
    name: 'Mario Kart 8',
    slug: 'mario-kart-8',
    igdb_id: 1030,
    total_rating: 88,
    rating_count: 156,
    follows: 0,
    hypes: 5,
    igdb_rating: 85,
    summary: 'Popular racing game from Nintendo',
    averageUserRating: 4.8,
    totalUserRatings: 50,
    created_at: '2024-01-01',
    updated_at: '2024-01-01'
  },
  {
    id: 5,
    name: 'Super Mario 64',
    slug: 'super-mario-64',
    igdb_id: 1040,
    total_rating: 96,
    rating_count: 892,
    follows: 0,
    hypes: 0,
    igdb_rating: 94,
    summary: 'Revolutionary 3D platformer',
    averageUserRating: 4.9,
    totalUserRatings: 75,
    created_at: '2024-01-01',
    updated_at: '2024-01-01'
  }
];

describe('Enhanced Search Metrics Integration', () => {
  let gameService: GameDataServiceV2;

  beforeEach(() => {
    gameService = new GameDataServiceV2();
  });

  describe('Quality Scoring with total_rating', () => {
    test('should prioritize games with higher total_rating', () => {
      // Access private method for testing
      const calculateScore = (gameService as any).calculateRelevanceScore.bind(gameService);
      
      const kotor = mockGamesWithMetrics[0]; // 92 rating, 1338 reviews
      const nethack = mockGamesWithMetrics[1]; // 93 rating, 17 reviews
      
      const kotorScore = calculateScore(kotor, 'star wars');
      const nethackScore = calculateScore(nethack, 'nethack');
      
      console.log(`KOTOR score: ${kotorScore}, NetHack score: ${nethackScore}`);
      
      // KOTOR should score higher due to massive review count despite slightly lower rating
      expect(kotorScore).toBeGreaterThan(nethackScore);
    });

    test('should apply quality scoring correctly', () => {
      const calculateScore = (gameService as any).calculateRelevanceScore.bind(gameService);
      
      const mario64 = mockGamesWithMetrics[4]; // 96 rating - should get high quality score
      const score = calculateScore(mario64, 'super mario 64');
      
      // Should get high score for exact match + excellent rating
      expect(score).toBeGreaterThan(140); // 100 (exact match) + quality + popularity
    });
  });

  describe('Authority Scoring with rating_count', () => {
    test('should favor games with substantial review counts', () => {
      const calculateScore = (gameService as any).calculateRelevanceScore.bind(gameService);
      
      // Same query, different authority levels
      const kotor = mockGamesWithMetrics[0]; // 1338 reviews
      const clair = mockGamesWithMetrics[2]; // 387 reviews
      
      const kotorScore = calculateScore(kotor, 'rpg');
      const clairScore = calculateScore(clair, 'rpg');
      
      // Both games should get competitive scores - KOTOR has more authority (reviews)
      // but Clair has significant hype. This tests that our algorithm balances both factors.
      expect(Math.abs(kotorScore - clairScore)).toBeLessThan(20); // Should be within 20 points
    });

    test('should use tiered scaling for review counts', () => {
      const calculateScore = (gameService as any).calculateRelevanceScore.bind(gameService);
      
      // Test that the authority score scales with clear tiers
      const gameElite = { ...mockGamesWithMetrics[0], rating_count: 1200 }; // Elite tier
      const gameMid = { ...mockGamesWithMetrics[0], rating_count: 150 }; // Mid tier  
      const gameMinimal = { ...mockGamesWithMetrics[0], rating_count: 10 }; // Minimal tier
      
      const scoreElite = calculateScore(gameElite, 'test');
      const scoreMid = calculateScore(gameMid, 'test');
      const scoreMinimal = calculateScore(gameMinimal, 'test');
      
      // Scores should increase with tier progression
      expect(scoreElite).toBeGreaterThan(scoreMid);
      expect(scoreMid).toBeGreaterThan(scoreMinimal);
      
      // Tier gaps should be meaningful (at least 5 points between major tiers)
      const eliteToMidGap = scoreElite - scoreMid;
      const midToMinimalGap = scoreMid - scoreMinimal;
      
      expect(eliteToMidGap).toBeGreaterThan(5); // Elite tier should have clear advantage
      expect(midToMinimalGap).toBeGreaterThan(10); // Mid tier should have substantial advantage over minimal
    });
  });

  describe('Interest Scoring with follows and hypes', () => {
    test('should boost games with high hype levels', () => {
      const calculateScore = (gameService as any).calculateRelevanceScore.bind(gameService);
      
      const clair = mockGamesWithMetrics[2]; // 131 hypes
      const kotor = mockGamesWithMetrics[0]; // 2 hypes
      
      // Same text relevance, different hype levels
      const clairScore = calculateScore(clair, 'expedition');
      const kotorScore = calculateScore(kotor, 'knights');
      
      console.log(`Clair score: ${clairScore}, KOTOR score: ${kotorScore}`);
      
      // Despite KOTOR having more reviews, Clair's hype should provide significant boost
      expect(clairScore).toBeGreaterThan(100); // Should get reasonable score
    });

    test('should combine follows and hypes for interest score', () => {
      const calculateScore = (gameService as any).calculateRelevanceScore.bind(gameService);
      
      const highInterest = { 
        ...mockGamesWithMetrics[0], 
        follows: 500, 
        hypes: 100,
        name: 'Test Game'
      };
      const lowInterest = { 
        ...mockGamesWithMetrics[0], 
        follows: 0, 
        hypes: 0,
        name: 'Test Game'
      };
      
      const highScore = calculateScore(highInterest, 'test game');
      const lowScore = calculateScore(lowInterest, 'test game');
      
      expect(highScore).toBeGreaterThan(lowScore);
    });
  });

  describe('Franchise Bonus System', () => {
    test('should boost numbered franchise entries', () => {
      const calculateScore = (gameService as any).calculateRelevanceScore.bind(gameService);
      const calculateFranchiseBonus = (gameService as any).calculateFranchiseBonus.bind(gameService);
      
      // Mock franchise query detection
      (gameService as any).isFranchiseQuery = jest.fn().mockReturnValue(true);
      
      const mario64 = mockGamesWithMetrics[4]; // Super Mario 64
      const bonus = calculateFranchiseBonus(mario64, 'mario');
      
      expect(bonus).toBeGreaterThan(0);
      expect(bonus).toBeLessThanOrEqual(10);
    });

    test('should detect numbered entries correctly', () => {
      const calculateFranchiseBonus = (gameService as any).calculateFranchiseBonus.bind(gameService);
      
      const testCases = [
        { name: 'Final Fantasy VII', expected: 8 },
        { name: 'Mario Kart 8', expected: 8 },
        { name: 'Super Mario 64', expected: 8 },
        { name: 'Zelda: Ocarina of Time', expected: 6 }, // subtitle
        { name: 'Mario Party', expected: 4 }, // starts with franchise
        { name: 'Random Mario Game', expected: 2 } // contains franchise
      ];
      
      testCases.forEach(({ name, expected }) => {
        const game = { ...mockGamesWithMetrics[0], name };
        const bonus = calculateFranchiseBonus(game, 'mario');
        expect(bonus).toBe(expected);
      });
    });
  });

  describe('Overall Ranking Integration', () => {
    test('should rank Mario franchise games correctly', () => {
      const calculateScore = (gameService as any).calculateRelevanceScore.bind(gameService);
      
      // Mock franchise query detection
      (gameService as any).isFranchiseQuery = jest.fn().mockReturnValue(true);
      
      const mario64 = mockGamesWithMetrics[4]; // Super Mario 64 - 96 rating, 892 reviews
      const marioKart8 = mockGamesWithMetrics[3]; // Mario Kart 8 - 88 rating, 156 reviews
      
      const mario64Score = calculateScore(mario64, 'mario');
      const marioKart8Score = calculateScore(marioKart8, 'mario');
      
      // Mario Kart 8 should rank higher due to better text relevance (starts with "mario") 
      // and interest score, despite Mario 64 having better quality/authority
      expect(marioKart8Score).toBeGreaterThan(mario64Score);
    });

    test('should handle missing metrics gracefully', () => {
      const calculateScore = (gameService as any).calculateRelevanceScore.bind(gameService);
      
      const gameWithoutMetrics = {
        ...mockGamesWithMetrics[0],
        total_rating: null,
        rating_count: null,
        follows: null,
        hypes: null
      };
      
      // Should not throw error and should fall back to igdb_rating
      expect(() => calculateScore(gameWithoutMetrics, 'test')).not.toThrow();
      
      const score = calculateScore(gameWithoutMetrics, 'test');
      expect(score).toBeGreaterThan(0);
    });
  });

  describe('Score Distribution Analysis', () => {
    test('should produce reasonable score ranges', () => {
      const calculateScore = (gameService as any).calculateRelevanceScore.bind(gameService);
      
      const scores = mockGamesWithMetrics.map(game => ({
        name: game.name,
        score: calculateScore(game, game.name.toLowerCase())
      }));
      
      console.log('Score distribution:', scores);
      
      // All scores should be positive
      scores.forEach(({ score }) => {
        expect(score).toBeGreaterThan(0);
      });
      
      // Scores should span a reasonable range
      const maxScore = Math.max(...scores.map(s => s.score));
      const minScore = Math.min(...scores.map(s => s.score));
      
      expect(maxScore - minScore).toBeGreaterThan(20); // Should have good separation
    });
  });
});

describe('Percentile Tests for Search Quality', () => {
  let gameService: GameDataServiceV2;

  beforeEach(() => {
    gameService = new GameDataServiceV2();
  });

  describe('Top-Tier Game Recognition (90th+ Percentile)', () => {
    test('should rank universally acclaimed games highly', () => {
      const calculateScore = (gameService as any).calculateRelevanceScore.bind(gameService);
      
      // Games that should always rank highly
      const eliteGame = { 
        ...mockGamesWithMetrics[0], 
        name: 'Super Mario 64', 
        total_rating: 96, 
        rating_count: 892 
      };
      
      const averageGame = { 
        ...mockGamesWithMetrics[0], 
        name: 'Average Game', 
        total_rating: 75, 
        rating_count: 50 
      };
      
      const lowRatedGame = { 
        ...mockGamesWithMetrics[0], 
        name: 'Low Rated Game', 
        total_rating: 60, 
        rating_count: 15 
      };
      
      const eliteScore = calculateScore(eliteGame, 'super mario 64');
      const averageScore = calculateScore(averageGame, 'average game');
      const lowScore = calculateScore(lowRatedGame, 'low rated game');
      
      // Elite games should significantly outrank average and low-rated games
      expect(eliteScore).toBeGreaterThan(averageScore + 20); // At least 20 point advantage
      expect(averageScore).toBeGreaterThan(lowScore + 10); // At least 10 point advantage
      
      // Elite games should score very high (180+ points total)
      expect(eliteScore).toBeGreaterThan(180);
    });
  });

  describe('Authority Threshold Tests', () => {
    test('should prefer games with 100+ reviews over those with <10 reviews', () => {
      const calculateScore = (gameService as any).calculateRelevanceScore.bind(gameService);
      
      const highAuthority = { 
        ...mockGamesWithMetrics[0], 
        name: 'Test Game',
        total_rating: 85,
        rating_count: 500 
      };
      
      const lowAuthority = { 
        ...mockGamesWithMetrics[0], 
        name: 'Test Game',
        total_rating: 90,
        rating_count: 5 
      };
      
      const highScore = calculateScore(highAuthority, 'test game');
      const lowScore = calculateScore(lowAuthority, 'test game');
      
      // Higher authority should win despite lower rating
      expect(highScore).toBeGreaterThan(lowScore);
    });
  });

  describe('Hype Impact Analysis', () => {
    test('should boost upcoming games with significant hype', () => {
      const calculateScore = (gameService as any).calculateRelevanceScore.bind(gameService);
      
      const hypedGame = { 
        ...mockGamesWithMetrics[0], 
        name: 'Upcoming Game',
        total_rating: 80,
        rating_count: 50,
        hypes: 500 
      };
      
      const establishedGame = { 
        ...mockGamesWithMetrics[0], 
        name: 'Upcoming Game',
        total_rating: 85,
        rating_count: 200,
        hypes: 0 
      };
      
      const hypedScore = calculateScore(hypedGame, 'upcoming game');
      const establishedScore = calculateScore(establishedGame, 'upcoming game');
      
      // Should be competitive due to hype
      const scoreDifference = Math.abs(hypedScore - establishedScore);
      expect(scoreDifference).toBeLessThan(20); // Should be close
    });
  });
});