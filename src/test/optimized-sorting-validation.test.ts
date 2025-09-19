import GameDataServiceV2 from '../services/gameDataServiceV2';

// Mock dependencies
jest.mock('../services/supabase');
jest.mock('../services/advancedSearchCoordination');

describe('Optimized Sorting Algorithm Validation', () => {
  let gameDataService: GameDataServiceV2;

  beforeEach(() => {
    gameDataService = new GameDataServiceV2();
  });

  describe('Fame-Based Ranking with All IGDB Variables', () => {
    it('should prioritize AAA masterpieces with high total_rating and rating_count', () => {
      const games = [
        {
          id: 1,
          name: 'Super Mario Odyssey',
          total_rating: 92,     // AAA masterpiece
          rating_count: 3000,   // Very popular
          follows: 15000,       // Extremely popular
          hypes: 200,           // Good buzz
          summary: 'A fantastic Mario adventure with innovative gameplay mechanics.',
          cover_url: 'cover1.jpg',
          totalUserRatings: 50
        },
        {
          id: 2,
          name: 'Super Mario Bros',
          total_rating: 75,     // Good game
          rating_count: 800,    // Well-known
          follows: 2000,        // Some popularity
          hypes: 50,            // Some buzz
          summary: 'Classic Mario platformer.',
          cover_url: 'cover2.jpg',
          totalUserRatings: 20
        },
        {
          id: 3,
          name: 'Super Mario Obscure Game',
          total_rating: 65,     // Below threshold
          rating_count: 10,     // Minimal recognition
          follows: 50,          // Low popularity
          hypes: 2,             // Little buzz
          summary: 'An unknown Mario game.',
          cover_url: 'cover3.jpg',
          totalUserRatings: 5
        }
      ];

      const query = 'super mario';
      
      // Calculate scores for each game
      const scores = games.map(game => ({
        name: game.name,
        score: (gameDataService as any).calculateRelevanceScore(game, query)
      }));

      // Sort by score (highest first)
      scores.sort((a, b) => b.score - a.score);

      // Validate ranking order
      expect(scores[0].name).toBe('Super Mario Odyssey'); // Should be first (highest fame)
      expect(scores[1].name).toBe('Super Mario Bros');    // Should be second (moderate fame)
      expect(scores[2].name).toBe('Super Mario Obscure Game'); // Should be last (low fame)

      // Validate score differences are significant
      expect(scores[0].score).toBeGreaterThan(scores[1].score + 100); // Clear separation
      expect(scores[1].score).toBeGreaterThan(scores[2].score + 50);  // Clear separation
    });

    it('should use total_rating as primary quality indicator', () => {
      const highRatedGame = {
        id: 1,
        name: 'Mario Game',
        total_rating: 95,     // Exceptional
        rating_count: 1000,
        follows: 1000,
        hypes: 100
      };

      const lowRatedGame = {
        id: 2,
        name: 'Mario Game',
        total_rating: 65,     // Below average
        rating_count: 1000,   // Same popularity
        follows: 1000,        // Same follows
        hypes: 100            // Same hypes
      };

      const score1 = (gameDataService as any).calculateRelevanceScore(highRatedGame, 'mario');
      const score2 = (gameDataService as any).calculateRelevanceScore(lowRatedGame, 'mario');

      // High rated should score significantly higher due to quality bonus
      expect(score1).toBeGreaterThan(score2 + 150); // 200 vs 40 quality points
    });

    it('should use rating_count as authority indicator', () => {
      const popularGame = {
        id: 1,
        name: 'Mario Game',
        total_rating: 80,
        rating_count: 6000,   // Extremely popular (200 points)
        follows: 1000,
        hypes: 100
      };

      const nicheGame = {
        id: 2,
        name: 'Mario Game',
        total_rating: 80,     // Same quality
        rating_count: 50,     // Minimal recognition (20 points)
        follows: 1000,        // Same follows
        hypes: 100            // Same hypes
      };

      const score1 = (gameDataService as any).calculateRelevanceScore(popularGame, 'mario');
      const score2 = (gameDataService as any).calculateRelevanceScore(nicheGame, 'mario');

      // Popular game should score much higher due to authority
      expect(score1).toBeGreaterThan(score2 + 160); // 200 vs 20 authority points
    });

    it('should use follows for sustained popularity ranking', () => {
      const followedGame = {
        id: 1,
        name: 'Mario Game',
        total_rating: 80,
        rating_count: 1000,
        follows: 12000,       // Extremely popular (50 points)
        hypes: 50
      };

      const unFollowedGame = {
        id: 2,
        name: 'Mario Game',
        total_rating: 80,
        rating_count: 1000,
        follows: 50,          // Low popularity (0 points)
        hypes: 50
      };

      const score1 = (gameDataService as any).calculateRelevanceScore(followedGame, 'mario');
      const score2 = (gameDataService as any).calculateRelevanceScore(unFollowedGame, 'mario');

      expect(score1).toBeGreaterThan(score2 + 40); // Should get engagement bonus
    });

    it('should use hypes for current buzz ranking', () => {
      const hypedGame = {
        id: 1,
        name: 'Mario Game',
        total_rating: 80,
        rating_count: 1000,
        follows: 1000,
        hypes: 1200           // Extremely hyped (50 points)
      };

      const unhypedGame = {
        id: 2,
        name: 'Mario Game',
        total_rating: 80,
        rating_count: 1000,
        follows: 1000,
        hypes: 5              // Low hype (0 points)
      };

      const score1 = (gameDataService as any).calculateRelevanceScore(hypedGame, 'mario');
      const score2 = (gameDataService as any).calculateRelevanceScore(unhypedGame, 'mario');

      expect(score1).toBeGreaterThan(score2 + 40); // Should get hype bonus
    });
  });

  describe('Text Relevance with Fame Modifiers', () => {
    it('should prioritize exact matches but still consider fame', () => {
      const exactMatchLowFame = {
        id: 1,
        name: 'mario',           // Exact match (1000 points)
        total_rating: 60,        // Low quality
        rating_count: 10,        // Low popularity
        follows: 20,
        hypes: 1
      };

      const partialMatchHighFame = {
        id: 2,
        name: 'super mario odyssey', // Contains match (600 points)
        total_rating: 95,            // High quality (200 points)
        rating_count: 5000,          // High popularity (200 points)
        follows: 15000,              // High follows (50 points)
        hypes: 500                   // High hypes (40 points)
      };

      const score1 = (gameDataService as any).calculateRelevanceScore(exactMatchLowFame, 'mario');
      const score2 = (gameDataService as any).calculateRelevanceScore(partialMatchHighFame, 'mario');

      // Exact match should still win despite lower fame
      expect(score1).toBeGreaterThan(score2);
      
      // But the gap should be smaller due to fame modifiers
      expect(score1 - score2).toBeLessThan(300); // Closer than just text difference
    });

    it('should handle word-based matching with fame ranking', () => {
      const games = [
        {
          id: 1,
          name: 'The Legend of Zelda: Breath of the Wild',
          total_rating: 97,
          rating_count: 8000,
          follows: 25000,
          hypes: 300
        },
        {
          id: 2,
          name: 'Zelda II: The Adventure of Link',
          total_rating: 73,
          rating_count: 500,
          follows: 1500,
          hypes: 20
        },
        {
          id: 3,
          name: 'Some Zelda Fan Game',
          total_rating: 50,
          rating_count: 5,
          follows: 10,
          hypes: 0
        }
      ];

      const scores = games.map(game => ({
        name: game.name,
        score: (gameDataService as any).calculateRelevanceScore(game, 'zelda')
      }));

      scores.sort((a, b) => b.score - a.score);

      // Should rank by combination of text relevance and fame
      expect(scores[0].name).toBe('The Legend of Zelda: Breath of the Wild');
      expect(scores[1].name).toBe('Zelda II: The Adventure of Link');
      expect(scores[2].name).toBe('Some Zelda Fan Game');
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle missing IGDB data gracefully', () => {
      const gameWithMissingData = {
        id: 1,
        name: 'Test Game',
        // Missing: total_rating, rating_count, follows, hypes
        igdb_rating: 75,  // Should use fallback
        summary: 'Test summary',
        cover_url: 'test.jpg',
        totalUserRatings: 15
      };

      const score = (gameDataService as any).calculateRelevanceScore(gameWithMissingData, 'test');
      
      // Should not crash and should provide reasonable score
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(2000); // Reasonable bounds
    });

    it('should be significantly faster than complex algorithm', () => {
      const testGame = {
        id: 1,
        name: 'Performance Test Game',
        total_rating: 85,
        rating_count: 2000,
        follows: 5000,
        hypes: 200,
        summary: 'Test game for performance',
        cover_url: 'test.jpg',
        totalUserRatings: 25
      };

      const startTime = performance.now();
      
      // Run scoring 1000 times to test performance
      for (let i = 0; i < 1000; i++) {
        (gameDataService as any).calculateRelevanceScore(testGame, 'performance test');
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // Should complete 1000 iterations in under 50ms (very fast)
      expect(totalTime).toBeLessThan(50);
    });

    it('should provide consistent scoring across multiple runs', () => {
      const testGame = {
        id: 1,
        name: 'Consistency Test',
        total_rating: 88,
        rating_count: 1500,
        follows: 3000,
        hypes: 150
      };

      const scores = [];
      for (let i = 0; i < 10; i++) {
        scores.push((gameDataService as any).calculateRelevanceScore(testGame, 'consistency'));
      }

      // All scores should be identical (deterministic)
      const firstScore = scores[0];
      scores.forEach(score => {
        expect(score).toBe(firstScore);
      });
    });
  });

  describe('Real-world Scenario Tests', () => {
    it('should properly rank Mario franchise games by fame', () => {
      const marioGames = [
        {
          id: 1,
          name: 'Super Mario Odyssey',
          total_rating: 92,
          rating_count: 3200,
          follows: 18000,
          hypes: 450
        },
        {
          id: 2,
          name: 'Super Mario Bros.',
          total_rating: 85,
          rating_count: 2800,
          follows: 12000,
          hypes: 200
        },
        {
          id: 3,
          name: 'Mario Party 4',
          total_rating: 76,
          rating_count: 800,
          follows: 2000,
          hypes: 50
        },
        {
          id: 4,
          name: 'Mario Educational Game',
          total_rating: 55,
          rating_count: 25,
          follows: 100,
          hypes: 2
        }
      ];

      const scores = marioGames.map(game => ({
        name: game.name,
        score: (gameDataService as any).calculateRelevanceScore(game, 'mario')
      }));

      scores.sort((a, b) => b.score - a.score);

      // Should rank in order of fame/quality
      expect(scores[0].name).toBe('Super Mario Odyssey');    // Newest, highest rated
      expect(scores[1].name).toBe('Super Mario Bros.');      // Classic, high fame
      expect(scores[2].name).toBe('Mario Party 4');          // Decent recognition
      expect(scores[3].name).toBe('Mario Educational Game'); // Low fame
    });

    it('should balance text relevance with fame appropriately', () => {
      const games = [
        {
          id: 1,
          name: 'Mario Kart',           // Shorter, more direct match
          total_rating: 89,
          rating_count: 2500,
          follows: 8000,
          hypes: 300
        },
        {
          id: 2,
          name: 'Super Mario Kart Racing Championship', // Longer but contains mario kart
          total_rating: 72,
          rating_count: 150,
          follows: 400,
          hypes: 10
        }
      ];

      const scores = games.map(game => ({
        name: game.name,
        score: (gameDataService as any).calculateRelevanceScore(game, 'mario kart')
      }));

      scores.sort((a, b) => b.score - a.score);

      // More direct match with higher fame should win
      expect(scores[0].name).toBe('Mario Kart');
    });
  });
});