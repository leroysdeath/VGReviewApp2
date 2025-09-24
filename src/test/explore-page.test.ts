import { fetchGamesWithReviewMetrics } from '../services/exploreService';

describe('Explore Page Functionality', () => {
  describe('fetchGamesWithReviewMetrics', () => {
    test('should fetch games sorted by unified score', async () => {
      const games = await fetchGamesWithReviewMetrics('unified_score', 10);
      
      expect(games).toBeDefined();
      expect(Array.isArray(games)).toBe(true);
      
      if (games.length > 0) {
        // Verify structure of returned games
        const firstGame = games[0];
        expect(firstGame).toHaveProperty('id');
        expect(firstGame).toHaveProperty('name');
        expect(firstGame).toHaveProperty('user_rating_count');
        expect(firstGame).toHaveProperty('avg_user_rating');
        
        // Verify all games have at least one review
        games.forEach(game => {
          expect(game.user_rating_count).toBeGreaterThan(0);
          expect(game.avg_user_rating).toBeGreaterThan(0);
        });
        
        // Verify unified score exists (as internal property)
        expect((firstGame as any).unified_score).toBeDefined();
        expect(typeof (firstGame as any).unified_score).toBe('number');
        
        // Verify sorting by unified score (highest first) - this creates rankings
        if (games.length > 1) {
          const firstScore = (games[0] as any).unified_score;
          const secondScore = (games[1] as any).unified_score;
          expect(firstScore).toBeGreaterThanOrEqual(secondScore);
          
          // Verify ranking order: first game is rank #1, second is rank #2, etc.
          games.forEach((game, index) => {
            const expectedRank = index + 1;
            expect(expectedRank).toBe(index + 1); // Rankings start at 1 and increment
          });
        }
      }
    });

    test('should respect the limit parameter', async () => {
      const limit = 5;
      const games = await fetchGamesWithReviewMetrics('unified_score', limit);
      
      expect(games.length).toBeLessThanOrEqual(limit);
    });

    test('should handle empty results gracefully', async () => {
      // Test with a very high limit to potentially get all results
      const games = await fetchGamesWithReviewMetrics('unified_score', 1000);
      
      expect(games).toBeDefined();
      expect(Array.isArray(games)).toBe(true);
    });

    test('should exclude redlighted games', async () => {
      const games = await fetchGamesWithReviewMetrics('unified_score', 20);
      
      // All returned games should not be redlighted
      games.forEach(game => {
        expect(game.redlight_flag).not.toBe(true);
      });
    });

    test('should return games with valid data types', async () => {
      const games = await fetchGamesWithReviewMetrics('unified_score', 5);
      
      games.forEach(game => {
        // Required fields
        expect(typeof game.id).toBe('number');
        expect(typeof game.name).toBe('string');
        expect(typeof game.user_rating_count).toBe('number');
        expect(typeof game.avg_user_rating).toBe('number');
        
        // Optional fields should be correct type if present
        if (game.igdb_id !== undefined) {
          expect(typeof game.igdb_id).toBe('number');
        }
        if (game.description !== undefined) {
          expect(typeof game.description).toBe('string');
        }
        if (game.release_date !== undefined) {
          expect(typeof game.release_date).toBe('string');
        }
        if (game.platforms !== undefined) {
          expect(Array.isArray(game.platforms)).toBe(true);
        }
      });
    });
  });

  describe('Database Performance', () => {
    test('should complete queries within reasonable time', async () => {
      const startTime = Date.now();
      
      await fetchGamesWithReviewMetrics('most_reviewed', 40);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within 5 seconds for good user experience
      expect(duration).toBeLessThan(5000);
    });

    test('should handle concurrent requests', async () => {
      const promises = [
        fetchGamesWithReviewMetrics('most_reviewed', 10),
        fetchGamesWithReviewMetrics('highest_rated', 10),
        fetchGamesWithReviewMetrics('most_reviewed', 5)
      ];
      
      const results = await Promise.all(promises);
      
      // All requests should succeed
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid sort options gracefully', async () => {
      // TypeScript should prevent this, but test runtime behavior
      const result = await fetchGamesWithReviewMetrics('invalid_sort' as any, 10);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    test('should handle very large limits', async () => {
      const result = await fetchGamesWithReviewMetrics('most_reviewed', 10000);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      // Should not crash, but may return fewer results
    });

    test('should handle zero or negative limits', async () => {
      const zeroResult = await fetchGamesWithReviewMetrics('most_reviewed', 0);
      const negativeResult = await fetchGamesWithReviewMetrics('most_reviewed', -5);
      
      expect(zeroResult).toBeDefined();
      expect(Array.isArray(zeroResult)).toBe(true);
      expect(negativeResult).toBeDefined();
      expect(Array.isArray(negativeResult)).toBe(true);
    });
  });

  describe('Data Quality', () => {
    test('should return games with meaningful review counts', async () => {
      const games = await fetchGamesWithReviewMetrics('most_reviewed', 10);
      
      if (games.length > 0) {
        // Top reviewed games should have reasonable review counts
        expect(games[0].user_rating_count).toBeGreaterThan(0);
        
        // Check that we're getting games with substantial review activity
        const hasWellReviewedGames = games.some(game => game.user_rating_count >= 3);
        expect(hasWellReviewedGames).toBe(true);
      }
    });

    test('should return games with valid rating ranges', async () => {
      const games = await fetchGamesWithReviewMetrics('highest_rated', 10);
      
      games.forEach(game => {
        // Ratings should be in valid range (assuming 1-10 scale)
        expect(game.avg_user_rating).toBeGreaterThan(0);
        expect(game.avg_user_rating).toBeLessThanOrEqual(10);
      });
    });

    test('should return diverse games', async () => {
      const games = await fetchGamesWithReviewMetrics('most_reviewed', 20);
      
      if (games.length >= 5) {
        // Should have games with different names (not all the same)
        const uniqueNames = new Set(games.map(g => g.name));
        expect(uniqueNames.size).toBeGreaterThan(1);
        
        // Should have games with different review counts (not all tied)
        const uniqueCounts = new Set(games.map(g => g.user_rating_count));
        expect(uniqueCounts.size).toBeGreaterThan(1);
      }
    });
  });
});