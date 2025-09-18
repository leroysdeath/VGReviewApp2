import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { GameDataServiceV2 } from '../services/gameDataServiceV2';

// Create a minimal mock for testing the logic
class MockGameDataServiceV2 extends GameDataServiceV2 {
  // Override the private methods for testing
  public shouldQueryIGDBTest(dbResults: any[], query: string): boolean {
    return (this as any).shouldQueryIGDB(dbResults, query);
  }
  
  public isFranchiseQueryTest(query: string): boolean {
    return (this as any).isFranchiseQuery(query);
  }
  
  public isStaleGameTest(game: any, maxAgeMs: number): boolean {
    return (this as any).isStaleGame(game, maxAgeMs);
  }
  
  public calculateRelevanceScoreTest(game: any, query: string): number {
    return (this as any).calculateRelevanceScore(game, query);
  }
  
  public normalizeGameNameTest(name: string): string {
    return (this as any).normalizeGameName(name);
  }
}

describe('Database Threshold Fix - Core Logic', () => {
  let service: MockGameDataServiceV2;
  
  const mockGame = {
    id: 1,
    name: 'Super Mario Bros.',
    updated_at: '2023-01-01T00:00:00Z',
    igdb_rating: 95
  };
  
  beforeEach(() => {
    service = new MockGameDataServiceV2();
    // Mock console to reduce noise
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });
  
  describe('IGDB Query Decision Logic', () => {
    it('should query IGDB when database has < 3 results', () => {
      const dbResults = [mockGame, { ...mockGame, id: 2 }]; // 2 results
      const shouldQuery = service.shouldQueryIGDBTest(dbResults, 'mario');
      expect(shouldQuery).toBe(true);
    });
    
    it('should NOT query IGDB for non-franchise with 5+ results', () => {
      const dbResults = Array.from({ length: 5 }, (_, i) => ({ ...mockGame, id: i + 1 }));
      const shouldQuery = service.shouldQueryIGDBTest(dbResults, 'random game');
      expect(shouldQuery).toBe(false);
    });
    
    it('should query IGDB for franchise with < 10 results', () => {
      const dbResults = Array.from({ length: 7 }, (_, i) => ({ ...mockGame, id: i + 1 }));
      const shouldQuery = service.shouldQueryIGDBTest(dbResults, 'mario');
      expect(shouldQuery).toBe(true);
    });
    
    it('should NOT query IGDB for franchise with 10+ fresh results', () => {
      const freshGame = { 
        ...mockGame, 
        updated_at: new Date().toISOString() // Very fresh
      };
      const dbResults = Array.from({ length: 12 }, (_, i) => ({ ...freshGame, id: i + 1 }));
      
      // Mock Math.random to not trigger random refresh
      const originalRandom = Math.random;
      Math.random = jest.fn(() => 0.5); // Above 0.1 threshold
      
      const shouldQuery = service.shouldQueryIGDBTest(dbResults, 'mario');
      expect(shouldQuery).toBe(false);
      
      Math.random = originalRandom;
    });
  });
  
  describe('Franchise Detection', () => {
    it('should detect major franchises', () => {
      const franchises = [
        'mario', 'super mario', 'zelda', 'pokemon', 'final fantasy',
        'call of duty', 'assassin', 'grand theft auto', 'mega man',
        'sonic', 'halo', 'god of war'
      ];
      
      franchises.forEach(franchise => {
        expect(service.isFranchiseQueryTest(franchise)).toBe(true);
      });
    });
    
    it('should NOT detect non-franchise terms', () => {
      const nonFranchises = [
        'random game', 'indie title', 'puzzle game', 'racing simulator'
      ];
      
      nonFranchises.forEach(term => {
        expect(service.isFranchiseQueryTest(term)).toBe(false);
      });
    });
  });
  
  describe('Stale Data Detection', () => {
    it('should detect stale games (older than 7 days)', () => {
      const staleDate = new Date();
      staleDate.setDate(staleDate.getDate() - 10); // 10 days ago
      
      const staleGame = {
        ...mockGame,
        updated_at: staleDate.toISOString()
      };
      
      const isStale = service.isStaleGameTest(staleGame, 7 * 24 * 60 * 60 * 1000);
      expect(isStale).toBe(true);
    });
    
    it('should NOT detect fresh games as stale', () => {
      const freshDate = new Date();
      freshDate.setHours(freshDate.getHours() - 2); // 2 hours ago
      
      const freshGame = {
        ...mockGame,
        updated_at: freshDate.toISOString()
      };
      
      const isStale = service.isStaleGameTest(freshGame, 7 * 24 * 60 * 60 * 1000);
      expect(isStale).toBe(false);
    });
    
    it('should detect games without update timestamp as stale', () => {
      const gameWithoutTimestamp = {
        ...mockGame,
        updated_at: null
      };
      
      const isStale = service.isStaleGameTest(gameWithoutTimestamp, 7 * 24 * 60 * 60 * 1000);
      expect(isStale).toBe(true);
    });
  });
  
  describe('Relevance Scoring', () => {
    it('should score exact matches highest', () => {
      const game = { name: 'Mario Bros.', igdb_rating: 90, totalUserRatings: 100, summary: 'Great game' };
      const score = service.calculateRelevanceScoreTest(game, 'mario bros.');
      expect(score).toBeGreaterThan(100); // Should be highest score for exact match
      expect(score).toBeLessThan(150);    // But reasonable upper bound
    });
    
    it('should score partial matches lower', () => {
      const game = { name: 'Super Mario Bros.', igdb_rating: 80, totalUserRatings: 100, summary: 'Great game' };
      const score = service.calculateRelevanceScoreTest(game, 'mario');
      expect(score).toBeGreaterThan(60);
      expect(score).toBeLessThan(100);
    });
    
    it('should give quality bonuses', () => {
      const highQualityGame = { 
        name: 'Mario', 
        igdb_rating: 95, 
        totalUserRatings: 500, 
        summary: 'This is a very long and detailed summary that exceeds 50 characters easily'
      };
      
      const lowQualityGame = { 
        name: 'Mario', 
        igdb_rating: 60, 
        totalUserRatings: 5, 
        summary: 'Short'
      };
      
      const highScore = service.calculateRelevanceScoreTest(highQualityGame, 'mario');
      const lowScore = service.calculateRelevanceScoreTest(lowQualityGame, 'mario');
      
      expect(highScore).toBeGreaterThan(lowScore);
    });
  });
  
  describe('Name Normalization', () => {
    it('should normalize game names for duplicate detection', () => {
      const testCases = [
        ['Super Mario Bros.', 'super mario bros'],
        ['The Legend of Zelda: Breath of the Wild', 'the legend of zelda breath of the wild'],
        ['Grand Theft Auto: Vice City', 'grand theft auto vice city'],
        ['Mario Bros. (1983)', 'mario bros 1983']
      ];
      
      testCases.forEach(([input, expected]) => {
        const result = service.normalizeGameNameTest(input);
        expect(result).toBe(expected);
      });
    });
    
    it('should handle special characters and whitespace', () => {
      const weirdName = '  Super   Mario   Bros.!!!   ';
      const normalized = service.normalizeGameNameTest(weirdName);
      expect(normalized).toBe('super mario bros');
    });
  });
  
  describe('Integration Logic Tests', () => {
    it('should trigger IGDB for stale franchise results', () => {
      const staleDate = new Date();
      staleDate.setDate(staleDate.getDate() - 10);
      
      const staleGames = Array.from({ length: 15 }, (_, i) => ({
        ...mockGame,
        id: i + 1,
        updated_at: staleDate.toISOString()
      }));
      
      // Even though we have 15 results (above threshold), they're stale
      const shouldQuery = service.shouldQueryIGDBTest(staleGames, 'mario');
      expect(shouldQuery).toBe(true);
    });
    
    it('should handle mixed fresh and stale results', () => {
      const freshDate = new Date();
      const staleDate = new Date();
      staleDate.setDate(staleDate.getDate() - 10);
      
      const mixedGames = [
        // Some fresh games
        ...Array.from({ length: 8 }, (_, i) => ({
          ...mockGame,
          id: i + 1,
          updated_at: freshDate.toISOString()
        })),
        // Some stale games
        ...Array.from({ length: 4 }, (_, i) => ({
          ...mockGame,
          id: i + 9,
          updated_at: staleDate.toISOString()
        }))
      ];
      
      // Should query IGDB because we have stale results
      const shouldQuery = service.shouldQueryIGDBTest(mixedGames, 'mario');
      expect(shouldQuery).toBe(true);
    });
    
    it('should respect different thresholds for franchise vs specific searches', () => {
      const fiveGames = Array.from({ length: 5 }, (_, i) => ({ ...mockGame, id: i + 1 }));
      
      // Franchise search with 5 results should query IGDB (threshold is 10)
      const franchiseQuery = service.shouldQueryIGDBTest(fiveGames, 'mario');
      expect(franchiseQuery).toBe(true);
      
      // Specific search with 5 results should NOT query IGDB (threshold is 5)
      const specificQuery = service.shouldQueryIGDBTest(fiveGames, 'random game title');
      expect(specificQuery).toBe(false);
    });
  });
});

describe('Database Threshold Fix - Expected Behavior', () => {
  it('should demonstrate the fix in action', () => {
    const service = new MockGameDataServiceV2();
    
    // OLD BEHAVIOR: Would never query IGDB if 5+ results exist
    // NEW BEHAVIOR: Intelligent decision based on multiple factors
    
    // Case 1: Franchise with few results - should supplement
    const fewMarioGames = Array.from({ length: 3 }, (_, i) => ({ id: i + 1, name: 'Mario Game' }));
    expect(service.shouldQueryIGDBTest(fewMarioGames, 'mario')).toBe(true);
    
    // Case 2: Non-franchise with adequate results - should NOT supplement  
    const adequateOtherGames = Array.from({ length: 8 }, (_, i) => ({ id: i + 1, name: 'Random Game' }));
    expect(service.shouldQueryIGDBTest(adequateOtherGames, 'random title')).toBe(false);
    
    // Case 3: Franchise with good fresh coverage - should NOT supplement (usually)
    const manyFreshMarioGames = Array.from({ length: 15 }, (_, i) => ({ 
      id: i + 1, 
      name: 'Mario Game',
      updated_at: new Date().toISOString()
    }));
    
    // Mock Math.random to avoid random refresh
    const originalRandom = Math.random;
    Math.random = jest.fn(() => 0.5);
    
    expect(service.shouldQueryIGDBTest(manyFreshMarioGames, 'mario')).toBe(false);
    
    Math.random = originalRandom;
    
    console.log('✅ Database threshold fix working correctly!');
  });
});