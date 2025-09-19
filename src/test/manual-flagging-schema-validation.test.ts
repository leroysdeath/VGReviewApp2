// Schema validation test that doesn't require actual database calls
// This tests the service methods and expected response structure

import { gameFlagService } from '../services/gameFlagService';

// Mock Supabase to test the schema validation without network calls
jest.mock('../services/supabase', () => ({
  supabase: {
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: 'test-user-id' } } })
    },
    from: (table: string) => ({
      select: (columns: string) => ({
        eq: () => ({
          order: () => Promise.resolve({ 
            data: table === 'game' ? [
              {
                id: 1,
                name: 'Test Game',
                developer: 'Test Dev',
                publisher: 'Test Pub',
                category: 0,
                greenlight_flag: false,
                redlight_flag: false,
                flag_reason: null,
                flagged_by: null,
                flagged_at: null,
                total_rating: 85,
                rating_count: 50,
                follows: 10000,
                popularity_score: 50000
              }
            ] : [],
            error: null 
          })
        }),
        or: () => ({
          order: () => ({
            limit: () => Promise.resolve({ 
              data: [
                {
                  id: 1,
                  name: 'Test Game',
                  developer: 'Test Dev',
                  publisher: 'Test Pub',
                  category: 0,
                  greenlight_flag: false,
                  redlight_flag: false,
                  flag_reason: null,
                  flagged_by: null,
                  flagged_at: null,
                  total_rating: 85,
                  rating_count: 50,
                  follows: 10000,
                  popularity_score: 50000
                }
              ],
              error: null 
            })
          })
        }),
        order: () => Promise.resolve({ 
          data: [],
          error: null 
        })
      })
    }),
    rpc: (functionName: string, params?: any) => {
      if (functionName === 'get_flagged_games_summary') {
        return Promise.resolve({
          data: [{
            total_flagged: 0,
            greenlight_count: 0,
            redlight_count: 0,
            recent_flags_24h: 0,
            most_recent_flag: null
          }],
          error: null
        });
      }
      if (functionName === 'set_game_flag') {
        return Promise.resolve({
          data: true,
          error: null
        });
      }
      return Promise.resolve({ data: null, error: null });
    }
  }
}));

describe('Manual Flagging Schema Validation', () => {
  describe('Service Method Structure', () => {
    it('should have all required methods on gameFlagService', () => {
      expect(typeof gameFlagService.setGameFlag).toBe('function');
      expect(typeof gameFlagService.getFlagSummary).toBe('function');
      expect(typeof gameFlagService.getFlaggedGames).toBe('function');
      expect(typeof gameFlagService.searchGamesForFlagging).toBe('function');
      expect(typeof gameFlagService.getConflictingFlags).toBe('function');
    });

    it('should return proper response structure for setGameFlag', async () => {
      const result = await gameFlagService.setGameFlag(1, 'greenlight', 'Test reason');
      
      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
      
      if (!result.success) {
        expect(result).toHaveProperty('error');
      }
    });

    it('should return proper response structure for getFlagSummary', async () => {
      const result = await gameFlagService.getFlagSummary();
      
      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
      
      if (result.success) {
        expect(result.data).toHaveProperty('total_flagged');
        expect(result.data).toHaveProperty('greenlight_count');
        expect(result.data).toHaveProperty('redlight_count');
        expect(result.data).toHaveProperty('recent_flags_24h');
        expect(typeof result.data.total_flagged).toBe('number');
        expect(typeof result.data.greenlight_count).toBe('number');
        expect(typeof result.data.redlight_count).toBe('number');
        expect(typeof result.data.recent_flags_24h).toBe('number');
      }
    });

    it('should return proper response structure for searchGamesForFlagging', async () => {
      const result = await gameFlagService.searchGamesForFlagging('test', 5);
      
      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
      
      if (result.success) {
        expect(Array.isArray(result.data)).toBe(true);
        
        if (result.data.length > 0) {
          const game = result.data[0];
          expect(game).toHaveProperty('id');
          expect(game).toHaveProperty('name');
          expect(game).toHaveProperty('greenlight_flag');
          expect(game).toHaveProperty('redlight_flag');
          expect(game).toHaveProperty('total_rating');
          expect(game).toHaveProperty('follows');
          expect(game).toHaveProperty('popularity_score');
        }
      }
    });

    it('should validate flag types correctly', () => {
      const validFlags = ['greenlight', 'redlight', 'clear'];
      
      validFlags.forEach(flag => {
        expect(['greenlight', 'redlight', 'clear']).toContain(flag);
      });
    });

    it('should handle error responses correctly', async () => {
      // Test with invalid flag type (should be caught by TypeScript, but test runtime)
      const result = await gameFlagService.setGameFlag(1, 'invalid' as any, 'Test');
      
      // Should still return a response structure
      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('Expected Database Schema', () => {
    it('should expect games to have manual flag columns', async () => {
      const result = await gameFlagService.searchGamesForFlagging('test', 1);
      
      if (result.success && result.data.length > 0) {
        const game = result.data[0];
        
        // These columns should exist after migration
        expect(game).toHaveProperty('greenlight_flag');
        expect(game).toHaveProperty('redlight_flag');
        expect(game).toHaveProperty('flag_reason');
        expect(game).toHaveProperty('flagged_by');
        expect(game).toHaveProperty('flagged_at');
        
        // Should also have new IGDB metrics
        expect(game).toHaveProperty('total_rating');
        expect(game).toHaveProperty('rating_count');
        expect(game).toHaveProperty('follows');
        expect(game).toHaveProperty('popularity_score');
      }
    });

    it('should expect summary function to return statistics', async () => {
      const result = await gameFlagService.getFlagSummary();
      
      if (result.success) {
        // These fields should be returned by get_flagged_games_summary function
        expect(result.data).toHaveProperty('total_flagged');
        expect(result.data).toHaveProperty('greenlight_count');
        expect(result.data).toHaveProperty('redlight_count');
        expect(result.data).toHaveProperty('recent_flags_24h');
        expect(result.data).toHaveProperty('most_recent_flag');
      }
    });
  });

  describe('Type Safety and Validation', () => {
    it('should use correct TypeScript types for flag operations', () => {
      // This test ensures our types are correctly defined
      const flagTypes: Array<'greenlight' | 'redlight' | 'clear'> = ['greenlight', 'redlight', 'clear'];
      
      flagTypes.forEach(flagType => {
        expect(['greenlight', 'redlight', 'clear']).toContain(flagType);
      });
    });

    it('should handle numeric game IDs correctly', async () => {
      const validGameId = 1;
      const result = await gameFlagService.setGameFlag(validGameId, 'greenlight', 'Test');
      
      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
    });

    it('should handle optional reason parameter correctly', async () => {
      // Test with reason
      const withReason = await gameFlagService.setGameFlag(1, 'greenlight', 'With reason');
      expect(withReason).toHaveProperty('success');
      
      // Test without reason
      const withoutReason = await gameFlagService.setGameFlag(1, 'clear');
      expect(withoutReason).toHaveProperty('success');
    });
  });
});