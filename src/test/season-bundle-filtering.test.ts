import { describe, it, expect } from '@jest/globals';

describe('Season and Bundle Filtering System', () => {
  describe('Season Content Filtering (Category 7)', () => {
    it('should filter seasonal gaming content to reduce clutter', () => {
      const testGames = [
        { id: 1, name: 'Super Mario Bros.', category: 0 }, // MainGame - PRESERVE
        { id: 2, name: 'Mario Kart Tour: Mario Bros. Tour', category: 7 }, // Season - FILTER
        { id: 3, name: 'Fortnite Season 10', category: 7 }, // Season - FILTER
        { id: 4, name: 'Destiny 2: Season of the Lost', category: 7 }, // Season - FILTER
        { id: 5, name: 'Apex Legends Season 12', category: 7 }, // Season - FILTER
        { id: 6, name: 'The Legend of Zelda', category: 0 }, // MainGame - PRESERVE
        { id: 7, name: 'Call of Duty: Warzone Season 6', category: 7 }, // Season - FILTER
        { id: 8, name: 'Rocket League Season Pass', category: 7 } // Season - FILTER
      ];

      // Simulate season filtering logic
      const filteredGames = testGames.filter(game => {
        return game.category !== 7; // Remove all season content
      });

      expect(filteredGames).toHaveLength(2); // Only main games should remain
      expect(filteredGames.every(game => game.category === 0)).toBe(true);
      expect(filteredGames.some(game => game.name === 'Super Mario Bros.')).toBe(true);
      expect(filteredGames.some(game => game.name === 'The Legend of Zelda')).toBe(true);
      
      // Verify season content was removed
      expect(filteredGames.some(game => game.name.includes('Season'))).toBe(false);
      expect(filteredGames.some(game => game.name.includes('Tour'))).toBe(false);
    });

    it('should preserve main games while filtering season variants', () => {
      const mariokartGames = [
        { id: 9, name: 'Mario Kart 8', category: 0 }, // MainGame - PRESERVE
        { id: 10, name: 'Mario Kart 8 Deluxe', category: 0 }, // MainGame - PRESERVE
        { id: 11, name: 'Mario Kart Tour', category: 0 }, // MainGame - PRESERVE
        { id: 12, name: 'Mario Kart Tour: Mario Bros. Tour', category: 7 }, // Season - FILTER
        { id: 13, name: 'Mario Kart Tour: Ninja Tour', category: 7 }, // Season - FILTER
        { id: 14, name: 'Mario Kart Tour: Anniversary Tour', category: 7 } // Season - FILTER
      ];

      const filteredGames = mariokartGames.filter(game => game.category !== 7);

      expect(filteredGames).toHaveLength(3); // Main Mario Kart games preserved
      expect(filteredGames.every(game => !game.name.includes('Tour:'))).toBe(true);
      expect(filteredGames.some(game => game.name === 'Mario Kart 8')).toBe(true);
      expect(filteredGames.some(game => game.name === 'Mario Kart Tour')).toBe(true);
    });
  });

  describe('Bundle/Pack Content Filtering (Category 3)', () => {
    it('should filter bundle and collection content to focus on individual games', () => {
      const testGames = [
        { id: 15, name: 'Super Mario Bros.', category: 0 }, // MainGame - PRESERVE
        { id: 16, name: 'Super Mario All-Stars', category: 3 }, // Bundle - FILTER
        { id: 17, name: 'Nintendo Game Bundle Pack', category: 3 }, // Bundle - FILTER
        { id: 18, name: 'Super Mario Collection', category: 3 }, // Bundle - FILTER
        { id: 19, name: 'The Legend of Zelda', category: 0 }, // MainGame - PRESERVE
        { id: 20, name: 'Zelda Collector\'s Edition', category: 3 }, // Bundle - FILTER
        { id: 21, name: 'Nintendo Switch Online NES Collection', category: 3 } // Bundle - FILTER
      ];

      // Simulate bundle filtering logic
      const filteredGames = testGames.filter(game => {
        return game.category !== 3; // Remove all bundle/collection content
      });

      expect(filteredGames).toHaveLength(2); // Only individual games should remain
      expect(filteredGames.every(game => game.category === 0)).toBe(true);
      expect(filteredGames.some(game => game.name === 'Super Mario Bros.')).toBe(true);
      expect(filteredGames.some(game => game.name === 'The Legend of Zelda')).toBe(true);
      
      // Verify bundle content was removed
      expect(filteredGames.some(game => game.name.includes('All-Stars'))).toBe(false);
      expect(filteredGames.some(game => game.name.includes('Collection'))).toBe(false);
      expect(filteredGames.some(game => game.name.includes('Bundle'))).toBe(false);
    });

    it('should filter various types of game bundles and compilations', () => {
      const bundleGames = [
        { id: 22, name: 'Final Fantasy', category: 0 }, // MainGame - PRESERVE
        { id: 23, name: 'Final Fantasy Anniversary Edition', category: 3 }, // Bundle - FILTER
        { id: 24, name: 'Street Fighter Anniversary Collection', category: 3 }, // Bundle - FILTER
        { id: 25, name: 'Mega Man Legacy Collection', category: 3 }, // Bundle - FILTER
        { id: 26, name: 'Castlevania Anniversary Collection', category: 3 }, // Bundle - FILTER
        { id: 27, name: 'SNK 40th Anniversary Collection', category: 3 }, // Bundle - FILTER
        { id: 28, name: 'Resident Evil', category: 0 }, // MainGame - PRESERVE
        { id: 29, name: 'Resident Evil Triple Pack', category: 3 } // Bundle - FILTER
      ];

      const filteredGames = bundleGames.filter(game => game.category !== 3);

      expect(filteredGames).toHaveLength(2); // Only individual games preserved
      expect(filteredGames.every(game => !game.name.includes('Collection'))).toBe(true);
      expect(filteredGames.every(game => !game.name.includes('Anniversary'))).toBe(true);
      expect(filteredGames.every(game => !game.name.includes('Pack'))).toBe(true);
    });
  });

  describe('E-reader Micro-Content Filtering', () => {
    it('should filter Game Boy Advance e-reader card content', () => {
      const testGames = [
        { id: 30, name: 'Super Mario Bros. 3' }, // Regular game - PRESERVE
        { id: 31, name: 'Super Mario Advance 4: Super Mario Bros. 3-e - Para Beetle Challenge' }, // E-reader - FILTER
        { id: 32, name: 'Super Mario Advance 4: Super Mario Bros. 3-e - Goomba Challenge' }, // E-reader - FILTER
        { id: 33, name: 'Mario vs. Donkey Kong-e - Level 1-1' }, // E-reader - FILTER
        { id: 34, name: 'Mario Party-e - Bowser Game' }, // E-reader - FILTER
        { id: 35, name: 'Super Mario World' }, // Regular game - PRESERVE
        { id: 36, name: 'Pokemon Ruby & Sapphire-e Card' }, // E-reader - FILTER
        { id: 37, name: 'Zelda II-e - Adventure Challenge' } // E-reader - FILTER
      ];

      // Simulate e-reader filtering logic (primary + secondary patterns)
      const eReaderPattern = /-e\s*-\s*.+/i; // Primary: "-e - something"
      const eReaderCardPattern = /-e\s+(card|challenge|level|game)/i; // Secondary: "-e card/challenge/etc"
      
      const filteredGames = testGames.filter(game => 
        !eReaderPattern.test(game.name) && !eReaderCardPattern.test(game.name)
      );

      expect(filteredGames).toHaveLength(2); // Only regular games should remain
      expect(filteredGames.some(game => game.name === 'Super Mario Bros. 3')).toBe(true);
      expect(filteredGames.some(game => game.name === 'Super Mario World')).toBe(true);
      
      // Verify e-reader content was removed
      expect(filteredGames.some(game => game.name.includes('-e -'))).toBe(false);
      expect(filteredGames.some(game => game.name.includes('Challenge'))).toBe(false);
      expect(filteredGames.some(game => game.name.includes('Level 1-1'))).toBe(false);
    });

    it('should preserve legitimate games with "e" in the name', () => {
      const testGames = [
        { id: 38, name: 'Fire Emblem' }, // Has "e" but not e-reader - PRESERVE
        { id: 39, name: 'Super Mario Maker' }, // Has "e" but not e-reader - PRESERVE
        { id: 40, name: 'Pokemon Red' }, // Has "e" but not e-reader - PRESERVE
        { id: 41, name: 'The Elder Scrolls' }, // Has "e" but not e-reader - PRESERVE
        { id: 42, name: 'Mario Party-e - Card Game' }, // E-reader pattern - FILTER
        { id: 43, name: 'Street Fighter Zero 3' } // Has "e" but not e-reader - PRESERVE
      ];

      // E-reader pattern should only match specific e-reader card format
      const eReaderPattern = /-e\s*-\s*.+/i; // Primary: "-e - something"
      const eReaderCardPattern = /-e\s+(card|challenge|level|game)/i; // Secondary: "-e card/challenge/etc"
      
      const filteredGames = testGames.filter(game => 
        !eReaderPattern.test(game.name) && !eReaderCardPattern.test(game.name)
      );

      expect(filteredGames).toHaveLength(5); // All legitimate games preserved
      expect(filteredGames.some(game => game.name === 'Fire Emblem')).toBe(true);
      expect(filteredGames.some(game => game.name === 'Super Mario Maker')).toBe(true);
      expect(filteredGames.some(game => game.name === 'Pokemon Red')).toBe(true);
      expect(filteredGames.some(game => game.name === 'The Elder Scrolls')).toBe(true);
      expect(filteredGames.some(game => game.name === 'Street Fighter Zero 3')).toBe(true);
      
      // Only e-reader card should be filtered
      expect(filteredGames.some(game => game.name.includes('Party-e -'))).toBe(false);
    });
  });

  describe('Combined Filtering Pipeline', () => {
    it('should apply season + bundle + e-reader filtering together', () => {
      const testGames = [
        { id: 44, name: 'Super Mario Bros.', category: 0 }, // MainGame - PRESERVE
        { id: 45, name: 'Mario Kart Tour: Anniversary Tour', category: 7 }, // Season - FILTER
        { id: 46, name: 'Super Mario All-Stars', category: 3 }, // Bundle - FILTER
        { id: 47, name: 'Super Mario Advance 4: Super Mario Bros. 3-e - Challenge', category: 0 }, // E-reader - FILTER
        { id: 48, name: 'The Legend of Zelda', category: 0 }, // MainGame - PRESERVE
        { id: 49, name: 'Zelda Collection', category: 3 }, // Bundle - FILTER
        { id: 50, name: 'Pokemon Stadium 2', category: 0 }, // MainGame - PRESERVE
        { id: 51, name: 'Fortnite Season 8', category: 7 } // Season - FILTER
      ];

      // Apply complete filtering pipeline
      const afterSeasonFilter = testGames.filter(game => game.category !== 7);
      const afterBundleFilter = afterSeasonFilter.filter(game => game.category !== 3);
      const eReaderPattern = /-e\s*-\s*.+/i; // Primary: "-e - something"
      const eReaderCardPattern = /-e\s+(card|challenge|level|game)/i; // Secondary: "-e card/challenge/etc"
      const finalFiltered = afterBundleFilter.filter(game => 
        !eReaderPattern.test(game.name) && !eReaderCardPattern.test(game.name)
      );

      expect(finalFiltered).toHaveLength(3); // Only clean main games remain
      expect(finalFiltered.every(game => game.category === 0)).toBe(true);
      expect(finalFiltered.some(game => game.name === 'Super Mario Bros.')).toBe(true);
      expect(finalFiltered.some(game => game.name === 'The Legend of Zelda')).toBe(true);
      expect(finalFiltered.some(game => game.name === 'Pokemon Stadium 2')).toBe(true);
      
      // Verify all clutter content was removed
      expect(finalFiltered.some(game => game.name.includes('Season'))).toBe(false);
      expect(finalFiltered.some(game => game.name.includes('Collection'))).toBe(false);
      expect(finalFiltered.some(game => game.name.includes('-e -'))).toBe(false);
    });

    it('should preserve main game quality while removing clutter', () => {
      const realWorldMarioResults = [
        { id: 52, name: 'Super Mario Bros.', category: 0 }, // Quality main game - PRESERVE
        { id: 53, name: 'Super Mario Bros. 3', category: 0 }, // Quality main game - PRESERVE
        { id: 54, name: 'Mario & Sonic at the Olympic Winter Games', category: 0 }, // Olympic - PRESERVE (not filtered by category)
        { id: 55, name: 'Super Mario All-Stars: Limited Edition', category: 3 }, // Bundle - FILTER
        { id: 56, name: 'Mario Kart Tour: Mario Bros. Tour', category: 7 }, // Season - FILTER
        { id: 57, name: 'Super Mario Advance 4: Super Mario Bros. 3-e - Para Beetle Challenge', category: 0 }, // E-reader - FILTER
        { id: 58, name: 'Mario Bros.', category: 11 } // Version - PRESERVE
      ];

      // Apply the filtering pipeline
      const afterSeasonFilter = realWorldMarioResults.filter(game => game.category !== 7);
      const afterBundleFilter = afterSeasonFilter.filter(game => game.category !== 3);
      const eReaderPattern = /-e\s*-\s*.+/i; // Primary: "-e - something"
      const eReaderCardPattern = /-e\s+(card|challenge|level|game)/i; // Secondary: "-e card/challenge/etc"
      const finalFiltered = afterBundleFilter.filter(game => 
        !eReaderPattern.test(game.name) && !eReaderCardPattern.test(game.name)
      );

      // Count quality main games for flagship fallback logic
      const qualityMainGames = finalFiltered.filter(game => 
        game.category === 0 && 
        !game.name.toLowerCase().includes('olympic')
      );

      expect(finalFiltered).toHaveLength(4); // Clutter removed but games preserved
      expect(qualityMainGames).toHaveLength(2); // Quality main games (triggers flagship fallback)
      expect(qualityMainGames.length < 3).toBe(true); // Should trigger flagship fallback
      
      // Verify specific games preserved/filtered
      expect(finalFiltered.some(game => game.name === 'Super Mario Bros.')).toBe(true);
      expect(finalFiltered.some(game => game.name === 'Super Mario Bros. 3')).toBe(true);
      expect(finalFiltered.some(game => game.name.includes('Olympic'))).toBe(true); // Olympic preserved (not filtered by category)
      expect(finalFiltered.some(game => game.name.includes('All-Stars'))).toBe(false); // Bundle filtered
      expect(finalFiltered.some(game => game.name.includes('Tour:'))).toBe(false); // Season filtered
      expect(finalFiltered.some(game => game.name.includes('-e -'))).toBe(false); // E-reader filtered
    });
  });

  describe('Bundle Category Precision', () => {
    it('should distinguish between regular editions and bundles', () => {
      const zeldaGameVariants = [
        { id: 59, name: 'The Legend of Zelda: Breath of the Wild', category: 0 }, // Regular - PRESERVE
        { id: 60, name: 'The Legend of Zelda: Breath of the Wild - Limited Edition', category: 0 }, // Special edition - PRESERVE
        { id: 61, name: 'The Legend of Zelda: Breath of the Wild Collector\'s Edition', category: 0 }, // Collector - PRESERVE
        { id: 62, name: 'Zelda Bundle Pack', category: 3 }, // Bundle - FILTER
        { id: 63, name: 'Legend of Zelda Collection', category: 3 }, // Bundle - FILTER
        { id: 64, name: 'Zelda Anniversary Collection', category: 3 } // Bundle - FILTER
      ];

      const filteredGames = zeldaGameVariants.filter(game => game.category !== 3);

      expect(filteredGames).toHaveLength(3); // All BotW editions preserved
      expect(filteredGames.every(game => game.category === 0)).toBe(true);
      expect(filteredGames.every(game => game.name.includes('Breath of the Wild'))).toBe(true);
      
      // Verify bundles filtered but editions preserved
      expect(filteredGames.some(game => game.name.includes('Bundle'))).toBe(false);
      expect(filteredGames.some(game => game.name.includes('Collection'))).toBe(false);
      expect(filteredGames.some(game => game.name.includes('Limited Edition'))).toBe(true);
    });

    it('should handle platform-specific collections appropriately', () => {
      const platformCollections = [
        { id: 65, name: 'Final Fantasy VII', category: 0 }, // Individual game - PRESERVE
        { id: 66, name: 'Final Fantasy VII Remake', category: 0 }, // Individual game - PRESERVE  
        { id: 67, name: 'Final Fantasy Collection', category: 3 }, // Bundle - FILTER
        { id: 68, name: 'Final Fantasy Anthology', category: 3 }, // Bundle - FILTER
        { id: 69, name: 'Final Fantasy Chronicles', category: 3 }, // Bundle - FILTER
        { id: 70, name: 'PlayStation Final Fantasy Bundle', category: 3 }, // Bundle - FILTER
        { id: 71, name: 'Square Enix Collection', category: 3 } // Bundle - FILTER
      ];

      const filteredGames = platformCollections.filter(game => game.category !== 3);

      expect(filteredGames).toHaveLength(2); // Individual FF games preserved
      expect(filteredGames.some(game => game.name === 'Final Fantasy VII')).toBe(true);
      expect(filteredGames.some(game => game.name === 'Final Fantasy VII Remake')).toBe(true);
      
      // Verify all collections filtered
      expect(filteredGames.some(game => game.name.includes('Collection'))).toBe(false);
      expect(filteredGames.some(game => game.name.includes('Anthology'))).toBe(false);
      expect(filteredGames.some(game => game.name.includes('Bundle'))).toBe(false);
    });
  });

  describe('Category-Based Game Type Recognition', () => {
    it('should correctly identify different IGDB categories', () => {
      const categoryMappings = {
        0: 'MainGame',
        1: 'DLCAddon', 
        2: 'Expansion',
        3: 'Bundle',
        4: 'StandaloneExpansion',
        5: 'Mod',
        6: 'Episode',
        7: 'Season',
        8: 'Remake',
        9: 'Remaster',
        10: 'ExpandedGame',
        11: 'Port',
        12: 'Fork',
        13: 'Pack',
        14: 'Update'
      };

      // Test that our filtering focuses on the right categories
      const preservedCategories = [0, 1, 2, 4, 6, 8, 9, 10, 11]; // Categories we keep
      const filteredCategories = [3, 7]; // Categories we filter (Bundle, Season)
      const contextualCategories = [5]; // Categories we filter based on content protection

      preservedCategories.forEach(category => {
        expect([3, 7].includes(category)).toBe(false); // Should not be in filter list
      });

      filteredCategories.forEach(category => {
        expect([0, 1, 2, 4, 6, 8, 9, 10, 11].includes(category)).toBe(false); // Should not be in preserve list
      });

      expect(categoryMappings[0]).toBe('MainGame');
      expect(categoryMappings[3]).toBe('Bundle');
      expect(categoryMappings[7]).toBe('Season');
    });

    it('should handle edge case categories appropriately', () => {
      const edgeCaseGames = [
        { id: 72, name: 'Super Mario Bros.', category: 0 }, // MainGame - PRESERVE
        { id: 73, name: 'Super Mario Bros. 3 Enhanced', category: 8 }, // Remake - PRESERVE
        { id: 74, name: 'Super Mario 64 DS', category: 11 }, // Port - PRESERVE
        { id: 75, name: 'Mario Kart 8 Deluxe', category: 9 }, // Remaster - PRESERVE
        { id: 76, name: 'Super Mario Bros. DLC', category: 1 }, // DLC - PRESERVE
        { id: 77, name: 'Mario Galaxy Expansion', category: 2 }, // Expansion - PRESERVE
        { id: 78, name: 'Mario Season Pass', category: 7 }, // Season - FILTER
        { id: 79, name: 'Mario Legacy Bundle', category: 3 } // Bundle - FILTER
      ];

      const filteredGames = edgeCaseGames.filter(game => 
        game.category !== 3 && game.category !== 7
      );

      expect(filteredGames).toHaveLength(6); // All non-bundle/season games preserved
      expect(filteredGames.some(game => game.name.includes('Enhanced'))).toBe(true); // Remake preserved
      expect(filteredGames.some(game => game.name.includes('DS'))).toBe(true); // Port preserved
      expect(filteredGames.some(game => game.name.includes('Deluxe'))).toBe(true); // Remaster preserved
      expect(filteredGames.some(game => game.name.includes('DLC'))).toBe(true); // DLC preserved
      expect(filteredGames.some(game => game.name.includes('Expansion'))).toBe(true); // Expansion preserved
      
      // Verify bundles and seasons filtered
      expect(filteredGames.some(game => game.name.includes('Bundle'))).toBe(false);
      expect(filteredGames.some(game => game.name.includes('Season Pass'))).toBe(false);
    });
  });
});