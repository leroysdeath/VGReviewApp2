import { describe, it, expect } from '@jest/globals';
import { 
  sortGamesByPriority, 
  calculateGamePriority,
  CategoryPriority,
  GamePriority
} from '../utils/gamePrioritization';

describe('Game Type Prioritization Sorting', () => {
  
  describe('Category Priority Order', () => {
    it('should prioritize main games over all other categories', () => {
      const testGames = [
        // DLC
        {
          id: 1,
          name: 'The Legend of Zelda: Breath of the Wild - The Master Trials',
          developer: 'Nintendo EPD',
          publisher: 'Nintendo',
          category: 1, // DLC
          igdb_rating: 85
        },
        // Main game (should appear first)
        {
          id: 2,
          name: 'The Legend of Zelda: Breath of the Wild',
          developer: 'Nintendo EPD',
          publisher: 'Nintendo',
          category: 0, // Main game
          igdb_rating: 97
        },
        // Expansion
        {
          id: 3,
          name: 'The Legend of Zelda: Breath of the Wild - The Champions\' Ballad',
          developer: 'Nintendo EPD',
          publisher: 'Nintendo',
          category: 2, // Expansion
          igdb_rating: 88
        }
      ];

      const sortedGames = sortGamesByPriority(testGames);
      
      // Main game should be first
      expect(sortedGames[0].category).toBe(0);
      expect(sortedGames[0].name).toBe('The Legend of Zelda: Breath of the Wild');
      
      // DLC and expansions should follow
      expect(sortedGames[1].category).toBe(2); // Expansion has higher category priority than DLC
      expect(sortedGames[2].category).toBe(1); // DLC comes last
    });

    it('should follow the correct category priority hierarchy', () => {
      const testGames = [
        // Bundle (low priority)
        {
          id: 1,
          name: 'Super Mario 3D All-Stars',
          developer: 'Nintendo EPD',
          publisher: 'Nintendo',
          category: 3, // Bundle
          igdb_rating: 80
        },
        // Mod (lowest priority)
        {
          id: 2,
          name: 'Super Mario Bros. Enhanced Edition',
          developer: 'Fan Developer',
          publisher: 'Community',
          category: 5, // Mod
          igdb_rating: 70
        },
        // Main game (highest priority)
        {
          id: 3,
          name: 'Super Mario Odyssey',
          developer: 'Nintendo EPD',
          publisher: 'Nintendo',
          category: 0, // Main game
          igdb_rating: 97
        },
        // Remake (high priority)
        {
          id: 4,
          name: 'Super Mario 64 DS',
          developer: 'Nintendo EAD',
          publisher: 'Nintendo',
          category: 8, // Remake
          igdb_rating: 85
        },
        // DLC (medium-low priority)
        {
          id: 5,
          name: 'Mario Kart 8 - Booster Course Pass',
          developer: 'Nintendo EPD',
          publisher: 'Nintendo',
          category: 1, // DLC
          igdb_rating: 88
        }
      ];

      const sortedGames = sortGamesByPriority(testGames);
      
      // Verify correct order: Main > Remake > DLC > Bundle > Mod
      expect(sortedGames[0].category).toBe(0); // Main game first
      expect(sortedGames[1].category).toBe(8); // Remake second
      expect(sortedGames[2].category).toBe(1); // DLC third
      expect(sortedGames[3].category).toBe(3); // Bundle fourth
      expect(sortedGames[4].category).toBe(5); // Mod last
      
      // Verify specific games are in correct positions
      expect(sortedGames[0].name).toBe('Super Mario Odyssey');
      expect(sortedGames[1].name).toBe('Super Mario 64 DS');
      expect(sortedGames[4].name).toBe('Super Mario Bros. Enhanced Edition');
    });
  });

  describe('Within Category Sorting', () => {
    it('should sort main games by quality and popularity within the main game category', () => {
      const mainGames = [
        // Lower rated main game
        {
          id: 1,
          name: 'Average Game',
          developer: 'Average Studio',
          publisher: 'Small Publisher',
          category: 0,
          igdb_rating: 65,
          total_rating_count: 50
        },
        // Flagship main game (highest quality)
        {
          id: 2,
          name: 'Super Mario Odyssey',
          developer: 'Nintendo EPD',
          publisher: 'Nintendo',
          category: 0,
          igdb_rating: 97,
          total_rating_count: 5000
        },
        // Good main game but not flagship
        {
          id: 3,
          name: 'Great Indie Game',
          developer: 'Indie Studio',
          publisher: 'Indie Publisher',
          category: 0,
          igdb_rating: 85,
          total_rating_count: 500
        }
      ];

      const sortedGames = sortGamesByPriority(mainGames);
      
      // All should still be main games
      expect(sortedGames.every(game => game.category === 0)).toBe(true);
      
      // But sorted by priority within the category
      expect(sortedGames[0].name).toBe('Super Mario Odyssey'); // Flagship tier
      expect(sortedGames[1].name).toBe('Great Indie Game');   // Higher rating than average
      expect(sortedGames[2].name).toBe('Average Game');       // Lowest quality
    });

    it('should sort DLC/expansions by quality within their category group', () => {
      const dlcGames = [
        // Low quality DLC
        {
          id: 1,
          name: 'Bad DLC Pack',
          developer: 'Unknown Studio',
          publisher: 'Small Publisher',
          category: 1, // DLC
          igdb_rating: 45
        },
        // High quality expansion
        {
          id: 2,
          name: 'The Witcher 3: Blood and Wine',
          developer: 'CD Projekt RED',
          publisher: 'CD Projekt',
          category: 2, // Expansion
          igdb_rating: 93,
          total_rating_count: 2500
        },
        // Good DLC
        {
          id: 3,
          name: 'Breath of the Wild: The Master Trials',
          developer: 'Nintendo EPD',
          publisher: 'Nintendo',
          category: 1, // DLC
          igdb_rating: 85,
          total_rating_count: 1000
        }
      ];

      const sortedGames = sortGamesByPriority(dlcGames);
      
      // Expansion should come first (higher category priority)
      expect(sortedGames[0].category).toBe(2);
      expect(sortedGames[0].name).toBe('The Witcher 3: Blood and Wine');
      
      // Then DLC sorted by quality
      expect(sortedGames[1].category).toBe(1);
      expect(sortedGames[1].name).toBe('Breath of the Wild: The Master Trials');
      expect(sortedGames[2].category).toBe(1);
      expect(sortedGames[2].name).toBe('Bad DLC Pack');
    });
  });

  describe('Cross-Category Quality Considerations', () => {
    it('should prioritize main games even if DLC has higher ratings', () => {
      const mixedGames = [
        // Excellent DLC (very high rating)
        {
          id: 1,
          name: 'Incredible DLC with Perfect Score',
          developer: 'Top Studio',
          publisher: 'AAA Publisher',
          category: 1, // DLC
          igdb_rating: 100, // Perfect score
          total_rating_count: 10000
        },
        // Average main game (lower rating)
        {
          id: 2,
          name: 'Mediocre Main Game',
          developer: 'Average Studio',
          publisher: 'Average Publisher',
          category: 0, // Main game
          igdb_rating: 60, // Much lower rating
          total_rating_count: 100
        }
      ];

      const sortedGames = sortGamesByPriority(mixedGames);
      
      // Main game should still come first despite lower rating
      expect(sortedGames[0].category).toBe(0);
      expect(sortedGames[0].name).toBe('Mediocre Main Game');
      
      // Excellent DLC should come second
      expect(sortedGames[1].category).toBe(1);
      expect(sortedGames[1].name).toBe('Incredible DLC with Perfect Score');
    });

    it('should handle edge case where remakes might outrank original main games', () => {
      const remakeVsOriginal = [
        // Original main game (older, possibly lower rating)
        {
          id: 1,
          name: 'Final Fantasy VII',
          developer: 'Square',
          publisher: 'Square Enix',
          category: 0, // Main game
          igdb_rating: 92,
          total_rating_count: 3000,
          first_release_date: 852076800 // 1997
        },
        // Modern remake (newer, possibly higher rating)
        {
          id: 2,
          name: 'Final Fantasy VII Remake',
          developer: 'Square Enix Creative Business Unit I',
          publisher: 'Square Enix',
          category: 8, // Remake
          igdb_rating: 95,
          total_rating_count: 4000,
          first_release_date: 1586476800 // 2020
        }
      ];

      const sortedGames = sortGamesByPriority(remakeVsOriginal);
      
      // Original main game should come first (higher category priority)
      expect(sortedGames[0].category).toBe(0);
      expect(sortedGames[0].name).toBe('Final Fantasy VII');
      
      // Remake should come second
      expect(sortedGames[1].category).toBe(8);
      expect(sortedGames[1].name).toBe('Final Fantasy VII Remake');
    });
  });

  describe('Complex Mixed Scenarios', () => {
    it('should handle a realistic search result mix correctly', () => {
      const realWorldSearchResults = [
        // Mod (should be last)
        {
          id: 1,
          name: 'Skyrim: Ultra Graphics Mod',
          developer: 'Modding Community',
          publisher: 'Nexus Mods',
          category: 5, // Mod
          igdb_rating: 80
        },
        // DLC (middle priority)
        {
          id: 2,
          name: 'The Elder Scrolls V: Skyrim - Dragonborn',
          developer: 'Bethesda Game Studios',
          publisher: 'Bethesda Softworks',
          category: 1, // DLC
          igdb_rating: 85
        },
        // Bundle (lower priority)
        {
          id: 3,
          name: 'The Elder Scrolls V: Skyrim - Legendary Edition',
          developer: 'Bethesda Game Studios',
          publisher: 'Bethesda Softworks',
          category: 3, // Bundle
          igdb_rating: 94
        },
        // Main game (should be first)
        {
          id: 4,
          name: 'The Elder Scrolls V: Skyrim',
          developer: 'Bethesda Game Studios',
          publisher: 'Bethesda Softworks',
          category: 0, // Main game
          igdb_rating: 94,
          total_rating_count: 8000
        },
        // Remaster (high priority after main)
        {
          id: 5,
          name: 'The Elder Scrolls V: Skyrim Special Edition',
          developer: 'Bethesda Game Studios',
          publisher: 'Bethesda Softworks',
          category: 9, // Remaster
          igdb_rating: 83,
          total_rating_count: 3000
        },
        // Port (medium priority)
        {
          id: 6,
          name: 'The Elder Scrolls V: Skyrim VR',
          developer: 'Bethesda Game Studios',
          publisher: 'Bethesda Softworks',
          category: 11, // Port
          igdb_rating: 78
        }
      ];

      const sortedGames = sortGamesByPriority(realWorldSearchResults);
      
      // Verify correct order by category priority
      const expectedOrder = [
        { name: 'The Elder Scrolls V: Skyrim', category: 0 },                    // Main game
        { name: 'The Elder Scrolls V: Skyrim Special Edition', category: 9 },    // Remaster  
        { name: 'The Elder Scrolls V: Skyrim VR', category: 11 },               // Port
        { name: 'The Elder Scrolls V: Skyrim - Dragonborn', category: 1 },      // DLC
        { name: 'The Elder Scrolls V: Skyrim - Legendary Edition', category: 3 }, // Bundle
        { name: 'Skyrim: Ultra Graphics Mod', category: 5 }                     // Mod
      ];

      expectedOrder.forEach((expected, index) => {
        expect(sortedGames[index].name).toBe(expected.name);
        expect(sortedGames[index].category).toBe(expected.category);
      });
    });

    it('should handle multiple games of the same category correctly', () => {
      const multipleMainGames = [
        {
          id: 1,
          name: 'Super Mario Galaxy',
          developer: 'Nintendo EAD',
          publisher: 'Nintendo',
          category: 0,
          igdb_rating: 97,
          total_rating_count: 4000
        },
        {
          id: 2,
          name: 'Super Mario Galaxy 2',
          developer: 'Nintendo EAD',
          publisher: 'Nintendo',
          category: 0,
          igdb_rating: 97,
          total_rating_count: 3000
        },
        {
          id: 3,
          name: 'Super Mario 3D World',
          developer: 'Nintendo EAD',
          publisher: 'Nintendo',
          category: 0,
          igdb_rating: 90,
          total_rating_count: 2500
        },
        {
          id: 4,
          name: 'New Super Mario Bros.',
          developer: 'Nintendo EAD',
          publisher: 'Nintendo',
          category: 0,
          igdb_rating: 87,
          total_rating_count: 2000
        }
      ];

      const sortedGames = sortGamesByPriority(multipleMainGames);
      
      // All should be main games (category 0)
      expect(sortedGames.every(game => game.category === 0)).toBe(true);
      
      // Should be sorted by quality within category
      // Galaxy games have same rating but Galaxy 1 has higher engagement
      expect(sortedGames[0].name).toBe('Super Mario Galaxy');
      expect(sortedGames[1].name).toBe('Super Mario Galaxy 2');
      expect(sortedGames[2].name).toBe('Super Mario 3D World');
      expect(sortedGames[3].name).toBe('New Super Mario Bros.');
    });
  });

  describe('Category Priority Function Tests', () => {
    it('should return correct category priorities for IGDB categories', () => {
      // Test each category mapping
      const testCases = [
        { category: 0, expectedName: 'Main game', expectedPriority: CategoryPriority.MAIN_GAMES },
        { category: 1, expectedName: 'DLC/Add-on', expectedPriority: CategoryPriority.DLC_ADDONS },
        { category: 2, expectedName: 'Expansion', expectedPriority: CategoryPriority.EXPANSIONS },
        { category: 3, expectedName: 'Bundle', expectedPriority: CategoryPriority.BUNDLES },
        { category: 4, expectedName: 'Standalone expansion', expectedPriority: CategoryPriority.EXPANSIONS },
        { category: 5, expectedName: 'Mod', expectedPriority: CategoryPriority.MODS_FORKS },
        { category: 6, expectedName: 'Episode', expectedPriority: CategoryPriority.EPISODIC },
        { category: 7, expectedName: 'Season', expectedPriority: CategoryPriority.EPISODIC },
        { category: 8, expectedName: 'Remake', expectedPriority: CategoryPriority.ENHANCED_GAMES },
        { category: 9, expectedName: 'Remaster', expectedPriority: CategoryPriority.ENHANCED_GAMES },
        { category: 10, expectedName: 'Expanded game', expectedPriority: CategoryPriority.ENHANCED_GAMES },
        { category: 11, expectedName: 'Port', expectedPriority: CategoryPriority.UPDATES_PORTS },
        { category: 12, expectedName: 'Fork', expectedPriority: CategoryPriority.MODS_FORKS },
        { category: 13, expectedName: 'Pack', expectedPriority: CategoryPriority.DLC_ADDONS },
        { category: 14, expectedName: 'Update', expectedPriority: CategoryPriority.UPDATES_PORTS }
      ];

      testCases.forEach(({ category, expectedPriority }) => {
        const testGame = {
          id: 1,
          name: 'Test Game',
          category,
          developer: 'Test Developer',
          publisher: 'Test Publisher'
        };

        const result = calculateGamePriority(testGame);
        expect(result.categoryPriority).toBe(expectedPriority);
      });
    });

    it('should handle unknown categories gracefully', () => {
      const testGame = {
        id: 1,
        name: 'Test Game',
        category: 999, // Unknown category
        developer: 'Test Developer',
        publisher: 'Test Publisher'
      };

      const result = calculateGamePriority(testGame);
      expect(result.categoryPriority).toBe(CategoryPriority.UNKNOWN);
    });

    it('should handle missing category gracefully', () => {
      const testGame = {
        id: 1,
        name: 'Test Game',
        // No category field
        developer: 'Test Developer',
        publisher: 'Test Publisher'
      };

      const result = calculateGamePriority(testGame);
      expect(result.categoryPriority).toBe(CategoryPriority.UNKNOWN);
    });
  });

  describe('Performance Tests', () => {
    it('should sort large datasets efficiently', () => {
      const largeDataset = [];
      
      // Create 1000 games with mixed categories
      for (let i = 0; i < 1000; i++) {
        largeDataset.push({
          id: i,
          name: `Test Game ${i}`,
          developer: 'Test Developer',
          publisher: 'Test Publisher',
          category: i % 15, // Cycle through categories 0-14
          igdb_rating: 50 + (i % 50), // Ratings from 50-99
          total_rating_count: i * 10
        });
      }

      const startTime = Date.now();
      const sortedGames = sortGamesByPriority(largeDataset);
      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Should complete within reasonable time (< 2000ms)
      expect(processingTime).toBeLessThan(2000);
      
      // Verify sorting correctness on large dataset
      expect(sortedGames).toHaveLength(1000);
      
      // Check that main games (category 0) appear first
      const mainGameIndices = sortedGames
        .map((game, index) => ({ game, index }))
        .filter(({ game }) => game.category === 0)
        .map(({ index }) => index);
      
      // All main games should appear before any non-main games
      const firstNonMainGame = sortedGames.findIndex(game => game.category !== 0);
      if (firstNonMainGame !== -1) {
        mainGameIndices.forEach(mainIndex => {
          expect(mainIndex).toBeLessThan(firstNonMainGame);
        });
      }
    });
  });

  describe('Integration with Existing Priority System', () => {
    it('should maintain flagship/famous game priority within categories', () => {
      const mixedQualityGames = [
        // Low tier main game
        {
          id: 1,
          name: 'Unknown Main Game',
          developer: 'Unknown Studio',
          publisher: 'Small Publisher',
          category: 0, // Main game
          igdb_rating: 50
        },
        // Flagship main game
        {
          id: 2,
          name: 'Super Mario Odyssey',
          developer: 'Nintendo EPD',
          publisher: 'Nintendo',
          category: 0, // Main game
          igdb_rating: 97
        },
        // Famous DLC (lower category but very high quality)
        {
          id: 3,
          name: 'The Witcher 3: Blood and Wine',
          developer: 'CD Projekt RED',
          publisher: 'CD Projekt',
          category: 2, // Expansion
          igdb_rating: 93
        }
      ];

      const sortedGames = sortGamesByPriority(mixedQualityGames);
      
      // Both main games should come first (category priority)
      expect(sortedGames[0].category).toBe(0);
      expect(sortedGames[1].category).toBe(0);
      
      // But flagship main game should come before unknown main game
      expect(sortedGames[0].name).toBe('Super Mario Odyssey');
      expect(sortedGames[1].name).toBe('Unknown Main Game');
      
      // Famous DLC should come third despite high quality
      expect(sortedGames[2].category).toBe(2);
      expect(sortedGames[2].name).toBe('The Witcher 3: Blood and Wine');
    });
  });
});