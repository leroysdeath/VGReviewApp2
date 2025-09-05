import { describe, it, expect } from '@jest/globals';
import { 
  shouldFilterContent, 
  filterProtectedContent 
} from '../utils/contentProtectionFilter';

describe('Time-Based Mod Filtering (MODERATE Copyright Level)', () => {
  // Helper function to create timestamps
  const createTimestamp = (yearsAgo: number): number => {
    const currentTime = Math.floor(Date.now() / 1000);
    return currentTime - (yearsAgo * 365 * 24 * 60 * 60);
  };

  describe('Recent Game Mod Filtering (Past 3 Years)', () => {
    it('should filter mods for games released within past 3 years', () => {
      const recentGameMods = [
        // Game released 1 year ago with mods
        {
          id: 1,
          name: 'Cyberpunk 2077 Enhanced Graphics Mod',
          developer: 'Modding Community',
          publisher: 'Nexus Mods',
          category: 5, // IGDB Category 5 = Mod
          first_release_date: createTimestamp(1), // 1 year ago
          summary: 'Graphics enhancement mod for Cyberpunk 2077'
        },
        // Game released 2 years ago with mods
        {
          id: 2,
          name: 'Elden Ring Boss Rush Mod', 
          developer: 'Fan Modder',
          publisher: 'ModDB',
          category: 5, // Mod
          first_release_date: createTimestamp(2), // 2 years ago
          summary: 'Boss rush mode for Elden Ring'
        },
        // Game released 6 months ago with mods
        {
          id: 3,
          name: 'Starfield Enhanced Space Travel',
          developer: 'Space Mod Team',
          publisher: 'Community',
          category: 5, // Mod
          first_release_date: createTimestamp(0.5), // 6 months ago
          summary: 'Enhanced space travel mechanics for Starfield'
        }
      ];

      const filteredMods = filterProtectedContent(recentGameMods);
      
      // All recent game mods should be filtered for MODERATE level companies
      expect(filteredMods).toHaveLength(0);
      
      // Test individual filtering
      recentGameMods.forEach(mod => {
        const isFiltered = shouldFilterContent(mod);
        expect(isFiltered).toBe(true);
      });
    });

    it('should allow mods for games released more than 3 years ago', () => {
      const oldGameMods = [
        // Game released 4 years ago with mods
        {
          id: 10,
          name: 'Skyrim Special Edition Weather Mod',
          developer: 'Weather Modder',
          publisher: 'Nexus Mods',
          category: 5, // Mod
          first_release_date: createTimestamp(4), // 4 years ago
          summary: 'Enhanced weather system for Skyrim SE'
        },
        // Game released 10 years ago with mods (use non-protected franchise)
        {
          id: 11,
          name: 'Call of Duty Enhanced Graphics Pack',
          developer: 'Graphics Team',
          publisher: 'ModDB',
          category: 5, // Mod
          first_release_date: createTimestamp(10), // 10 years ago
          summary: 'HD graphics pack for Call of Duty'
        },
        // Game released 15 years ago with mods
        {
          id: 12,
          name: 'Half-Life 2 VR Mod',
          developer: 'VR Modding Team',
          publisher: 'Source Mods',
          category: 5, // Mod
          first_release_date: createTimestamp(15), // 15 years ago
          summary: 'VR support for Half-Life 2'
        }
      ];

      const filteredMods = filterProtectedContent(oldGameMods);
      
      // All old game mods should pass through for MODERATE level
      expect(filteredMods).toHaveLength(3);
      
      // Test individual filtering
      oldGameMods.forEach(mod => {
        const isFiltered = shouldFilterContent(mod);
        expect(isFiltered).toBe(false);
      });
    });
  });

  describe('Release Date Edge Cases', () => {
    it('should handle games with missing release dates', () => {
      const modsWithoutDates = [
        {
          id: 20,
          name: 'Unknown Game Mod',
          developer: 'Modder',
          publisher: 'Community',
          category: 5, // Mod
          // No release date information
          summary: 'Mod for unknown release date game'
        },
        {
          id: 21,
          name: 'Another Unknown Game Mod',
          developer: 'Another Modder',
          publisher: 'Forum',
          category: 5, // Mod
          first_release_date: undefined,
          release_dates: [],
          summary: 'Another mod with no date info'
        }
      ];

      // Without release dates, should default to allowing (not recent)
      const filteredMods = filterProtectedContent(modsWithoutDates);
      expect(filteredMods).toHaveLength(2);
      
      modsWithoutDates.forEach(mod => {
        const isFiltered = shouldFilterContent(mod);
        expect(isFiltered).toBe(false);
      });
    });

    it('should handle games with release_dates array fallback', () => {
      const currentTime = Math.floor(Date.now() / 1000);
      
      const modsWithReleaseDatesArray = [
        // Recent game using release_dates array
        {
          id: 30,
          name: 'Recent Game Mod',
          developer: 'Modder',
          publisher: 'Community',
          category: 5, // Mod
          release_dates: [
            { date: createTimestamp(1), platform: 6, region: 1 }, // 1 year ago, PC
            { date: createTimestamp(0.5), platform: 48, region: 1 } // 6 months ago, PlayStation
          ],
          summary: 'Mod for recently released game'
        },
        // Old game using release_dates array
        {
          id: 31,
          name: 'Old Game Mod',
          developer: 'Veteran Modder',
          publisher: 'Old Mods',
          category: 5, // Mod
          release_dates: [
            { date: createTimestamp(5), platform: 6, region: 1 }, // 5 years ago, PC
            { date: createTimestamp(4.5), platform: 9, region: 1 } // 4.5 years ago, PlayStation 3
          ],
          summary: 'Mod for old game'
        }
      ];

      const filteredMods = filterProtectedContent(modsWithReleaseDatesArray);
      
      // Should filter recent (first game) but allow old (second game)
      expect(filteredMods).toHaveLength(1);
      expect(filteredMods[0].name).toBe('Old Game Mod');
      
      // Test individual filtering
      expect(shouldFilterContent(modsWithReleaseDatesArray[0])).toBe(true); // Recent
      expect(shouldFilterContent(modsWithReleaseDatesArray[1])).toBe(false); // Old
    });

    it('should use earliest release date for multi-platform releases', () => {
      const multiPlatformGameMod = {
        id: 40,
        name: 'Multi-Platform Game Mod',
        developer: 'Platform Modder',
        publisher: 'Universal Mods',
        category: 5, // Mod
        release_dates: [
          { date: createTimestamp(1), platform: 48, region: 1 }, // 1 year ago, PlayStation (later)
          { date: createTimestamp(2.5), platform: 6, region: 1 }, // 2.5 years ago, PC (earlier)
          { date: createTimestamp(0.8), platform: 49, region: 1 } // 0.8 years ago, Xbox (latest)
        ],
        summary: 'Mod for game with staggered platform releases'
      };

      // Should use earliest date (2.5 years ago) which is within 3-year threshold
      const isFiltered = shouldFilterContent(multiPlatformGameMod);
      expect(isFiltered).toBe(true); // Should be filtered as recent
    });
  });

  describe('MODERATE vs Other Copyright Levels', () => {
    it('should still filter all mods for AGGRESSIVE companies regardless of release date', () => {
      // Nintendo game mod (AGGRESSIVE level)
      const nintendoOldGameMod = {
        id: 50,
        name: 'Super Mario Bros. ROM Hack',
        developer: 'Fan Developer',
        publisher: 'RomHack',
        category: 5, // Mod
        first_release_date: createTimestamp(35), // 35 years ago (very old)
        summary: 'ROM hack of original Super Mario Bros'
      };

      // Should be filtered regardless of age for AGGRESSIVE companies
      const isFiltered = shouldFilterContent(nintendoOldGameMod);
      expect(isFiltered).toBe(true);
    });

    it('should allow all mods for MOD_FRIENDLY companies regardless of release date', () => {
      // Bethesda game mod (MOD_FRIENDLY level)
      const bethesdaRecentGameMod = {
        id: 60,
        name: 'Skyrim Anniversary Edition ENB',
        developer: 'ENB Modder',
        publisher: 'Nexus Mods',
        category: 5, // Mod
        first_release_date: createTimestamp(0.5), // 6 months ago (recent)
        summary: 'ENB preset for Skyrim Anniversary Edition'
      };

      // Should be allowed regardless of recency for MOD_FRIENDLY companies
      const isFiltered = shouldFilterContent(bethesdaRecentGameMod);
      expect(isFiltered).toBe(false);
    });
  });

  describe('Mixed Content Scenarios', () => {
    it('should correctly handle mix of official games, recent mods, and old mods', () => {
      const mixedContent = [
        // Official recent game - should be allowed
        {
          id: 70,
          name: 'Cyberpunk 2077',
          developer: 'CD Projekt RED',
          publisher: 'CD Projekt',
          category: 0, // Main game
          first_release_date: createTimestamp(1), // 1 year ago
          summary: 'Official game'
        },
        // Recent game mod - should be filtered (MODERATE level)
        {
          id: 71,
          name: 'Cyberpunk 2077 Car Pack Mod',
          developer: 'Car Modder',
          publisher: 'ModDB',
          category: 5, // Mod
          first_release_date: createTimestamp(1), // 1 year ago
          summary: 'Additional cars for Cyberpunk 2077'
        },
        // Old game mod - should be allowed (MODERATE level)
        {
          id: 72,
          name: 'Call of Duty Classic Graphics Mod',
          developer: 'COD Graphics Team',
          publisher: 'CODMods',
          category: 5, // Mod
          first_release_date: createTimestamp(18), // 18 years ago
          summary: 'Enhanced graphics for COD Classic'
        },
        // Old official game - should be allowed
        {
          id: 73,
          name: 'Grand Theft Auto: San Andreas',
          developer: 'Rockstar North',
          publisher: 'Rockstar Games',
          category: 0, // Main game
          first_release_date: createTimestamp(18), // 18 years ago
          summary: 'Official Rockstar game'
        }
      ];

      const filteredContent = filterProtectedContent(mixedContent);
      
      // Should have 3 items: official recent game, old mod, official old game
      // Should filter: recent mod
      expect(filteredContent).toHaveLength(3);
      
      const filteredNames = filteredContent.map(game => game.name);
      expect(filteredNames).toContain('Cyberpunk 2077'); // Official recent
      expect(filteredNames).toContain('Call of Duty Classic Graphics Mod'); // Old mod
      expect(filteredNames).toContain('Grand Theft Auto: San Andreas'); // Official old
      expect(filteredNames).not.toContain('Cyberpunk 2077 Car Pack Mod'); // Recent mod filtered
    });
  });

  describe('Performance and Boundary Testing', () => {
    it('should handle exactly 3-year threshold correctly', () => {
      const currentTime = Math.floor(Date.now() / 1000);
      const exactlyThreeYears = currentTime - (3 * 365 * 24 * 60 * 60);
      const slightlyMoreThanThreeYears = exactlyThreeYears - 86400; // 1 day older
      const slightlyLessThanThreeYears = exactlyThreeYears + 86400; // 1 day newer
      
      const boundaryTestMods = [
        {
          id: 80,
          name: 'Exactly 3 Years Old Mod',
          developer: 'Boundary Tester',
          publisher: 'Test Mods',
          category: 5,
          first_release_date: exactlyThreeYears,
          summary: 'Mod for game released exactly 3 years ago'
        },
        {
          id: 81,
          name: 'Slightly Over 3 Years Old Mod',
          developer: 'Boundary Tester',
          publisher: 'Test Mods',
          category: 5,
          first_release_date: slightlyMoreThanThreeYears,
          summary: 'Mod for game released 3+ years ago'
        },
        {
          id: 82,
          name: 'Slightly Under 3 Years Old Mod',
          developer: 'Boundary Tester',
          publisher: 'Test Mods',
          category: 5,
          first_release_date: slightlyLessThanThreeYears,
          summary: 'Mod for game released under 3 years ago'
        }
      ];

      // Test boundary conditions
      expect(shouldFilterContent(boundaryTestMods[0])).toBe(false); // Exactly 3 years = allowed
      expect(shouldFilterContent(boundaryTestMods[1])).toBe(false); // Over 3 years = allowed
      expect(shouldFilterContent(boundaryTestMods[2])).toBe(true);  // Under 3 years = filtered
    });

    it('should maintain good performance with large datasets', () => {
      const largeDataset = [];
      for (let i = 0; i < 100; i++) {
        largeDataset.push({
          id: 100 + i,
          name: `Test Mod ${i}`,
          developer: 'Performance Tester',
          publisher: 'Test Publisher',
          category: 5, // Mod
          first_release_date: createTimestamp(i % 10), // Vary ages 0-9 years
          summary: `Test mod ${i} for performance testing`
        });
      }

      const startTime = Date.now();
      const filteredResults = filterProtectedContent(largeDataset);
      const endTime = Date.now();
      
      // Should complete within reasonable time (< 1000ms)
      const processingTime = endTime - startTime;
      expect(processingTime).toBeLessThan(1000);
      
      // Should filter recent mods (0-2 years) and allow older ones (3+ years)
      const expectedFiltered = largeDataset.filter(game => {
        const yearsAgo = (game.id - 100) % 10;
        return yearsAgo >= 3; // Should allow 3+ year old mods
      });
      
      expect(filteredResults).toHaveLength(expectedFiltered.length);
    });
  });
});