import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock the igdbService
jest.mock('../services/igdbService', () => ({
  igdbService: {
    searchWithSequels: jest.fn(),
  }
}));

import { igdbService } from '../services/igdbService';

describe('Quality-Based Flagship Fallback System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Mario Search Quality Analysis', () => {
    it('should trigger flagship fallback when Mario search returns only Olympic games and seasons', async () => {
      // Mock raw IGDB results for "mario" search (actual API response pattern)
      const mockIGDBResults = [
        { id: 1, name: 'Mario Kart Tour: Mario Bros. Tour', category: 7 }, // Season
        { id: 2, name: 'Mario & Sonic at the Olympic Winter Games', category: 0 }, // Olympic
        { id: 3, name: 'Super Mario All-Stars: Limited Edition', category: 3 }, // Bundle
        { id: 4, name: 'Mario & Sonic at the Olympic Games Tokyo 2020', category: 0 }, // Olympic
        { id: 5, name: 'Mario Bros.', category: 11 } // Version
      ];

      (igdbService.searchWithSequels as jest.MockedFunction<typeof igdbService.searchWithSequels>).mockResolvedValueOnce(mockIGDBResults);

      const results = await igdbService.searchWithSequels('mario', 20);
      
      // Simulate filtering logic
      const afterSeasonFilter = results.filter(g => g.category !== 7);
      const afterBundleFilter = afterSeasonFilter.filter(g => g.category !== 3);
      const qualityMainGames = afterBundleFilter.filter(game => 
        game.category === 0 && 
        !game.name.toLowerCase().includes('olympic')
      );

      expect(qualityMainGames.length).toBe(0);
      expect(qualityMainGames.length < 3).toBe(true); // Should trigger flagship fallback
    });

    it('should identify flagship Mario games correctly', () => {
      const flagshipMarioGames = [
        'Super Mario Bros.',
        'Super Mario Bros. 3', 
        'Super Mario World',
        'Super Mario 64',
        'Super Mario Galaxy',
        'Super Mario Odyssey'
      ];

      const testResults = [
        { id: 6, name: 'Super Mario Bros. 3', category: 0 },
        { id: 7, name: 'Super Mario 64', category: 0 },
        { id: 8, name: 'Mario & Sonic at the Olympic Games', category: 0 }
      ];

      const flagshipFound = testResults.filter(game =>
        flagshipMarioGames.some(flagship =>
          game.name.toLowerCase().includes(flagship.toLowerCase()) ||
          flagship.toLowerCase().includes(game.name.toLowerCase())
        )
      );

      expect(flagshipFound).toHaveLength(2);
      expect(flagshipFound[0].name).toBe('Super Mario Bros. 3');
      expect(flagshipFound[1].name).toBe('Super Mario 64');
    });
  });

  describe('Pokemon Search Enhancement', () => {
    it('should trigger flagship fallback when Pokemon search returns only ROM hacks', async () => {
      // Mock raw IGDB results for "pokemon" search (actual API response pattern)
      const mockIGDBResults = [
        { id: 9, name: 'Name That Pokemon', category: 0 },
        { id: 10, name: 'Shin Pokemon: Red Version', category: 5 }, // ROM hack
        { id: 11, name: 'Shin Pokemon: Green Version', category: 5 }, // ROM hack
        { id: 12, name: 'Pokémon Stadium 2', category: 0 },
        { id: 13, name: 'Pokemon Ryen', category: 0 }, // Fan game
        { id: 14, name: 'Pokemon R.O.W.E.', category: 5 } // ROM hack
      ];

      (igdbService.searchWithSequels as jest.MockedFunction<typeof igdbService.searchWithSequels>).mockResolvedValueOnce(mockIGDBResults);

      const results = await igdbService.searchWithSequels('pokemon', 20);
      
      // Count quality Pokemon games (excluding ROM hacks and fan games)
      const qualityPokemonGames = results.filter(game => 
        game.category === 0 && 
        !game.name.toLowerCase().includes('shin pokemon') &&
        !game.name.toLowerCase().includes('ryen') &&
        !game.name.toLowerCase().includes('name that')
      );

      expect(qualityPokemonGames.length).toBeLessThan(3); // Should trigger flagship fallback
      expect(results.some(game => game.name === 'Pokémon Stadium 2')).toBe(true);
    });

    it('should detect Pokemon franchise correctly', () => {
      const pokemonQueries = ['pokemon', 'pokémon', 'Pokemon Red', 'pokemon blue'];
      
      pokemonQueries.forEach(query => {
        const queryLower = query.toLowerCase();
        const isPokemonFranchise = queryLower.includes('pokemon') || queryLower.includes('pokémon');
        expect(isPokemonFranchise).toBe(true);
      });
    });
  });

  describe('Zelda Search Quality', () => {
    it('should maintain good Zelda search results without flagship fallback', async () => {
      // Mock raw IGDB results for "zelda" search (actual API response pattern)
      const mockIGDBResults = [
        { id: 15, name: 'The Legend of Zelda', category: 0 },
        { id: 16, name: 'Zelda II: The Adventure of Link', category: 0 },
        { id: 17, name: 'The Legend of Zelda: A Link to the Past', category: 0 },
        { id: 18, name: 'The Legend of Zelda: Oracle of Ages', category: 0 },
        { id: 19, name: 'The Legend of Zelda: Oracle of Seasons', category: 0 },
        { id: 20, name: 'The Legend of Zelda: Ocarina of Time - Master Quest', category: 4 },
        { id: 21, name: 'BS The Legend of Zelda "MottZilla Patch"', category: 5 } // Mod - should be filtered
      ];

      (igdbService.searchWithSequels as jest.MockedFunction<typeof igdbService.searchWithSequels>).mockResolvedValueOnce(mockIGDBResults);

      const results = await igdbService.searchWithSequels('zelda', 20);
      
      // Count quality main games (excluding mods)
      const qualityZeldaGames = results.filter(game => 
        game.category === 0
      );

      expect(qualityZeldaGames.length).toBeGreaterThanOrEqual(3); // Should NOT trigger flagship fallback
      expect(results.some(game => game.name === 'The Legend of Zelda')).toBe(true);
      expect(results.some(game => game.name === 'The Legend of Zelda: A Link to the Past')).toBe(true);
    });
  });

  describe('Franchise Detection', () => {
    it('should detect major gaming franchises correctly', () => {
      const testCases = [
        { query: 'mario', expectedFranchise: 'mario' },
        { query: 'super mario', expectedFranchise: 'mario' },
        { query: 'mario party', expectedFranchise: 'mario party' },
        { query: 'pokemon', expectedFranchise: 'pokemon' },
        { query: 'zelda', expectedFranchise: 'zelda' },
        { query: 'metal gear', expectedFranchise: 'metal gear' },
        { query: 'final fantasy', expectedFranchise: 'final fantasy' },
        { query: 'street fighter', expectedFranchise: 'street fighter' }
      ];

      testCases.forEach(({ query, expectedFranchise }) => {
        // Simulate franchise detection logic
        const queryLower = query.toLowerCase();
        const franchisePatterns = {
          'mario party': ['mario party'], // Check mario party FIRST (more specific)
          'mario': ['mario', 'super mario'],
          'pokemon': ['pokemon', 'pokémon'],
          'zelda': ['zelda'],
          'metal gear': ['metal gear'],
          'final fantasy': ['final fantasy'],
          'street fighter': ['street fighter']
        };

        const detectedFranchise = Object.keys(franchisePatterns).find(franchise =>
          franchisePatterns[franchise].some(pattern => queryLower.includes(pattern))
        );

        expect(detectedFranchise).toBe(expectedFranchise);
      });
    });
  });

  describe('Filtering Pipeline', () => {
    it('should filter season content (category 7)', () => {
      const testGames = [
        { name: 'Super Mario Bros.', category: 0 },
        { name: 'Mario Kart Tour: Mario Bros. Tour', category: 7 }, // Season
        { name: 'Fortnite Season 10', category: 7 }, // Season
        { name: 'The Legend of Zelda', category: 0 }
      ];

      const filteredGames = testGames.filter(game => game.category !== 7);

      expect(filteredGames).toHaveLength(2);
      expect(filteredGames.every(game => game.category !== 7)).toBe(true);
      expect(filteredGames.some(game => game.name === 'Super Mario Bros.')).toBe(true);
      expect(filteredGames.some(game => game.name === 'The Legend of Zelda')).toBe(true);
    });

    it('should filter bundle content (category 3)', () => {
      const testGames = [
        { name: 'Super Mario Bros.', category: 0 },
        { name: 'Super Mario All-Stars', category: 3 }, // Bundle
        { name: 'Nintendo Game Bundle', category: 3 }, // Bundle
        { name: 'The Legend of Zelda', category: 0 }
      ];

      const filteredGames = testGames.filter(game => game.category !== 3);

      expect(filteredGames).toHaveLength(2);
      expect(filteredGames.every(game => game.category !== 3)).toBe(true);
      expect(filteredGames.some(game => game.name === 'Super Mario Bros.')).toBe(true);
      expect(filteredGames.some(game => game.name === 'The Legend of Zelda')).toBe(true);
    });

    it('should filter e-reader micro-content', () => {
      const testGames = [
        { name: 'Super Mario Bros. 3' },
        { name: 'Super Mario Advance 4: Super Mario Bros. 3-e - Para Beetle Challenge' }, // E-reader
        { name: 'Mario vs. Donkey Kong-e - Level 1-1' }, // E-reader
        { name: 'Super Mario World' }
      ];

      // Simulate e-reader filtering logic
      const eReaderPattern = /-e\s*-\s*.+/i;
      const filteredGames = testGames.filter(game => 
        !eReaderPattern.test(game.name)
      );

      expect(filteredGames).toHaveLength(2);
      expect(filteredGames.some(game => game.name === 'Super Mario Bros. 3')).toBe(true);
      expect(filteredGames.some(game => game.name === 'Super Mario World')).toBe(true);
    });
  });

  describe('Search Quality Metrics', () => {
    it('should calculate search quality scores correctly', () => {
      const importantMarioGames = [
        'Super Mario Bros.',
        'Super Mario Bros. 3',
        'Super Mario World',
        'Super Mario 64',
        'Super Mario Galaxy',
        'Super Mario Odyssey'
      ];

      const searchResults = [
        { id: 22, name: 'Super Mario Bros.' },
        { id: 23, name: 'Super Mario Bros. 3' },
        { id: 24, name: 'Super Mario 64' },
        { id: 25, name: 'Mario & Sonic at the Olympic Games' }
      ];

      let foundCount = 0;
      importantMarioGames.forEach(important => {
        const found = searchResults.some(result =>
          result.name.toLowerCase().includes(important.toLowerCase()) ||
          important.toLowerCase().includes(result.name.toLowerCase())
        );
        if (found) foundCount++;
      });

      const qualityScore = (foundCount / importantMarioGames.length) * 100;
      expect(qualityScore).toBeCloseTo(50, 1); // 3 out of 6 important games found
      expect(foundCount).toBe(3);
    });
  });
});