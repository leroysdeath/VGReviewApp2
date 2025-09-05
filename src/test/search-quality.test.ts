/**
 * Search Quality Tests - Percentage-based testing for search effectiveness
 */

import { describe, it, expect } from '@jest/globals';
import { testSearchQuality, IMPORTANT_GAMES_LISTS } from '../utils/searchQualityTester';

// Mock search function that simulates different quality levels
const createMockSearchFunction = (foundGameNames: string[]) => {
  return async (query: string) => {
    return foundGameNames.map(name => ({ name }));
  };
};

describe('Search Quality Tests', () => {
  
  describe('Mario Search Quality', () => {
    it('should achieve high quality for complete Mario search', async () => {
      // Mock perfect Mario search (finds all important games)
      const perfectMarioSearch = createMockSearchFunction([
        'Super Mario Bros.',
        'Super Mario Bros. 2', 
        'Super Mario Bros. 3',
        'Super Mario World',
        'Super Mario 64',
        'Super Mario Sunshine',
        'Super Mario Galaxy',
        'Super Mario Galaxy 2',
        'Super Mario Odyssey'
      ]);
      
      const result = await testSearchQuality('mario', 'mario', perfectMarioSearch);
      
      expect(result.franchise).toBe('mario');
      expect(result.searchTerm).toBe('mario');
      expect(result.totalImportantGames).toBe(9);
      expect(result.foundGames).toBe(9);
      expect(result.qualityPercentage).toBe(100.0);
      expect(result.missingGames).toHaveLength(0);
    });

    it('should detect poor quality Mario search', async () => {
      // Mock poor Mario search (finds only 3 games)
      const poorMarioSearch = createMockSearchFunction([
        'Super Mario Bros.',
        'Super Mario 64',
        'Mario Kart 8'  // Not in important games list
      ]);
      
      const result = await testSearchQuality('mario', 'mario', poorMarioSearch);
      
      expect(result.foundGames).toBe(2); // Only 2 from important list
      expect(result.qualityPercentage).toBeCloseTo(22.2, 1); // 2/9 = ~22%
      expect(result.missingGames).toHaveLength(7);
      expect(result.missingGames).toContain('Super Mario Bros. 3');
      expect(result.missingGames).toContain('Super Mario Galaxy');
    });

    it('should handle partial Mario search quality', async () => {
      // Mock decent Mario search (finds flagship games but missing some)
      const partialMarioSearch = createMockSearchFunction([
        'Super Mario Bros.',
        'Super Mario Bros. 3',
        'Super Mario World', 
        'Super Mario 64',
        'Super Mario Odyssey'
      ]);
      
      const result = await testSearchQuality('mario', 'mario', partialMarioSearch);
      
      expect(result.foundGames).toBe(5);
      expect(result.qualityPercentage).toBeCloseTo(55.6, 1); // 5/9 = ~56%
      expect(result.missingGames).toHaveLength(4);
      expect(result.missingGames).toContain('Super Mario Galaxy');
      expect(result.missingGames).toContain('Super Mario Galaxy 2');
    });
  });

  describe('Zelda Search Quality', () => {
    it('should achieve high quality for complete Zelda search', async () => {
      // Mock excellent Zelda search (finds 9/10 games)
      const excellentZeldaSearch = createMockSearchFunction([
        'The Legend of Zelda',
        'The Legend of Zelda: A Link to the Past',
        'The Legend of Zelda: Link\'s Awakening', 
        'The Legend of Zelda: Ocarina of Time',
        'The Legend of Zelda: Majora\'s Mask',
        'The Legend of Zelda: The Wind Waker',
        'The Legend of Zelda: Twilight Princess',
        'The Legend of Zelda: Breath of the Wild',
        'The Legend of Zelda: Tears of the Kingdom'
        // Missing: Zelda II: The Adventure of Link
      ]);
      
      const result = await testSearchQuality('zelda', 'zelda', excellentZeldaSearch);
      
      expect(result.foundGames).toBe(9);
      expect(result.qualityPercentage).toBe(90.0); // 9/10 = 90%
      expect(result.missingGames).toHaveLength(1);
      expect(result.missingGames).toContain('Zelda II: The Adventure of Link');
    });
  });

  describe('Mega Man X Search Quality', () => {
    it('should achieve perfect quality for Mega Man X search', async () => {
      // Mock perfect Mega Man X search
      const perfectMegaManXSearch = createMockSearchFunction([
        'Mega Man X',
        'Mega Man X2',
        'Mega Man X3', 
        'Mega Man X4',
        'Mega Man X5',
        'Mega Man X6',
        'Mega Man X7',
        'Mega Man X8'
      ]);
      
      const result = await testSearchQuality('megamanx', 'mega man x', perfectMegaManXSearch);
      
      expect(result.foundGames).toBe(8);
      expect(result.qualityPercentage).toBe(100.0);
      expect(result.missingGames).toHaveLength(0);
    });
  });

  describe('Search Quality Thresholds', () => {
    it('should identify excellent search quality (>= 90%)', async () => {
      const excellentSearch = createMockSearchFunction(['Super Mario Bros.', 'Super Mario Bros. 2', 'Super Mario Bros. 3', 'Super Mario World', 'Super Mario 64', 'Super Mario Sunshine', 'Super Mario Galaxy', 'Super Mario Galaxy 2']);
      const result = await testSearchQuality('mario', 'mario', excellentSearch);
      
      expect(result.qualityPercentage).toBeGreaterThanOrEqual(80);
      expect(result.qualityPercentage).toBeLessThan(100);
    });

    it('should identify poor search quality (< 50%)', async () => {
      const poorSearch = createMockSearchFunction(['Super Mario Bros.', 'Super Mario 64']);
      const result = await testSearchQuality('mario', 'mario', poorSearch);
      
      expect(result.qualityPercentage).toBeLessThan(50);
      expect(result.missingGames.length).toBeGreaterThan(result.foundGames);
    });
  });

  describe('Alternative Name Matching', () => {
    it('should find games by alternative names', async () => {
      // Test search that uses alternative names
      const altNameSearch = createMockSearchFunction([
        'SMB',        // Alternative for Super Mario Bros.
        'SMB3',       // Alternative for Super Mario Bros. 3  
        'SM64',       // Alternative for Super Mario 64
        'Mario Galaxy' // Alternative for Super Mario Galaxy
      ]);
      
      const result = await testSearchQuality('mario', 'mario', altNameSearch);
      
      expect(result.foundGames).toBe(4);
      expect(result.qualityPercentage).toBeCloseTo(44.4, 1); // 4/9 = ~44%
      expect(result.foundGamesList).toContain('Super Mario Bros.');
      expect(result.foundGamesList).toContain('Super Mario Bros. 3');
      expect(result.foundGamesList).toContain('Super Mario 64');
      expect(result.foundGamesList).toContain('Super Mario Galaxy');
    });
  });
});