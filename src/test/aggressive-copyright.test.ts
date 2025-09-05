import { filterProtectedContent } from '../utils/contentProtectionFilter';

describe('AGGRESSIVE Copyright Level - Mod Filtering', () => {
  describe('Nintendo Franchise - AGGRESSIVE Protection', () => {
    it('should filter ALL mods for Nintendo franchises', () => {
      const testGames = [
        // Official Nintendo games - should PASS
        {
          id: 1,
          name: 'Super Mario Bros.',
          developer: 'Nintendo',
          publisher: 'Nintendo',
          category: 0 // MainGame
        },
        {
          id: 2,
          name: 'The Legend of Zelda: Breath of the Wild',
          developer: 'Nintendo EPD',
          publisher: 'Nintendo',
          category: 0
        },
        {
          id: 3,
          name: 'Pokemon Red',
          developer: 'Game Freak',
          publisher: 'Nintendo',
          category: 0
        },
        
        // Nintendo mods - should be FILTERED
        {
          id: 4,
          name: 'Super Mario Bros. ROM Hack',
          developer: 'Fan Developer',
          publisher: 'Homebrew',
          category: 5 // Mod
        },
        {
          id: 5,
          name: 'Mario Kart Custom Tracks',
          developer: 'Modding Community',
          publisher: 'Fan Made',
          category: 5
        },
        {
          id: 6,
          name: 'Zelda Randomizer',
          developer: 'Community',
          publisher: 'Fan Project',
          category: 5
        },
        {
          id: 7,
          name: 'Pokemon Crystal Clear',
          developer: 'ShockSlayer',
          publisher: 'ROM Hack',
          category: 5
        },
        {
          id: 8,
          name: 'Super Mario 64 Multiplayer Mod',
          developer: 'Modding Team',
          publisher: 'Community',
          category: 5
        }
      ];

      const filteredGames = filterProtectedContent(testGames);
      
      // All official Nintendo games should pass
      const officialGames = filteredGames.filter(game => 
        game.category === 0 && 
        (game.name.includes('Mario') || game.name.includes('Zelda') || game.name.includes('Pokemon'))
      );
      expect(officialGames).toHaveLength(3);
      
      // NO mods should pass for Nintendo franchises
      const nintendoMods = filteredGames.filter(game => 
        game.category === 5 && 
        (game.name.includes('Mario') || game.name.includes('Zelda') || game.name.includes('Pokemon'))
      );
      expect(nintendoMods).toHaveLength(0);
      
      // Verify specific mods are filtered
      const filteredNames = filteredGames.map(g => g.name);
      expect(filteredNames).not.toContain('Super Mario Bros. ROM Hack');
      expect(filteredNames).not.toContain('Mario Kart Custom Tracks');
      expect(filteredNames).not.toContain('Zelda Randomizer');
      expect(filteredNames).not.toContain('Pokemon Crystal Clear');
      expect(filteredNames).not.toContain('Super Mario 64 Multiplayer Mod');
    });
  });

  describe('Disney Franchise - AGGRESSIVE Protection', () => {
    it('should filter ALL mods for Disney franchises', () => {
      const testGames = [
        // Official Disney games - should PASS
        {
          id: 9,
          name: 'Star Wars Jedi: Fallen Order',
          developer: 'Respawn Entertainment',
          publisher: 'Electronic Arts',
          category: 0
        },
        {
          id: 10,
          name: 'Kingdom Hearts III',
          developer: 'Square Enix',
          publisher: 'Square Enix',
          category: 0
        },
        {
          id: 11,
          name: 'Marvel\'s Spider-Man',
          developer: 'Insomniac Games',
          publisher: 'Sony Interactive Entertainment',
          category: 0
        },
        
        // Disney mods - should be FILTERED
        {
          id: 12,
          name: 'Star Wars Battlefront Mod',
          developer: 'Modding Community',
          publisher: 'Fan Made',
          category: 5
        },
        {
          id: 13,
          name: 'Kingdom Hearts Fan Game',
          developer: 'Independent Team',
          publisher: 'Fan Project',
          category: 5
        },
        {
          id: 14,
          name: 'Marvel vs Capcom ROM Hack',
          developer: 'ROM Hacker',
          publisher: 'Homebrew',
          category: 5
        },
        {
          id: 15,
          name: 'Star Wars Empire at War Mod',
          developer: 'Community',
          publisher: 'Fan Modification',
          category: 5
        }
      ];

      const filteredGames = filterProtectedContent(testGames);
      
      // All official Disney games should pass
      const officialGames = filteredGames.filter(game => 
        game.category === 0 && 
        (game.name.includes('Star Wars') || game.name.includes('Kingdom Hearts') || game.name.includes('Marvel'))
      );
      expect(officialGames).toHaveLength(3);
      
      // NO mods should pass for Disney franchises
      const disneyMods = filteredGames.filter(game => 
        game.category === 5 && 
        (game.name.includes('Star Wars') || game.name.includes('Kingdom Hearts') || game.name.includes('Marvel'))
      );
      expect(disneyMods).toHaveLength(0);
      
      // Verify specific mods are filtered
      const filteredNames = filteredGames.map(g => g.name);
      expect(filteredNames).not.toContain('Star Wars Battlefront Mod');
      expect(filteredNames).not.toContain('Kingdom Hearts Fan Game');
      expect(filteredNames).not.toContain('Marvel vs Capcom ROM Hack');
      expect(filteredNames).not.toContain('Star Wars Empire at War Mod');
    });
  });

  describe('Cross-Franchise AGGRESSIVE Protection', () => {
    it('should consistently filter mods across all AGGRESSIVE franchises', () => {
      const testGames = [
        // Mix of official games and mods from AGGRESSIVE companies
        {
          id: 16,
          name: 'Final Fantasy VII',
          developer: 'Square Enix',
          publisher: 'Square Enix',
          category: 0
        },
        {
          id: 17,
          name: 'Street Fighter 6',
          developer: 'Capcom',
          publisher: 'Capcom',
          category: 0
        },
        {
          id: 18,
          name: 'Grand Theft Auto V',
          developer: 'Rockstar Games',
          publisher: 'Take-Two Interactive',
          category: 0
        },
        
        // Mods from AGGRESSIVE companies - ALL should be filtered
        {
          id: 19,
          name: 'Final Fantasy VII Remake Mod',
          developer: 'Modder',
          publisher: 'Fan Made',
          category: 5
        },
        {
          id: 20,
          name: 'Street Fighter Custom Characters',
          developer: 'Fighting Game Community',
          publisher: 'Fan Project',
          category: 5
        },
        {
          id: 21,
          name: 'GTA V Script Mod',
          developer: 'Modding Team',
          publisher: 'Community',
          category: 5
        }
      ];

      const filteredGames = filterProtectedContent(testGames);
      
      // All official games should pass
      const officialGames = filteredGames.filter(game => game.category === 0);
      expect(officialGames).toHaveLength(3);
      
      // NO mods should pass for ANY AGGRESSIVE franchise
      const allMods = filteredGames.filter(game => game.category === 5);
      expect(allMods).toHaveLength(0);
      
      // Verify zero tolerance for mods
      const hasAnyMods = filteredGames.some(game => game.category === 5);
      expect(hasAnyMods).toBe(false);
    });
  });

  describe('AGGRESSIVE vs MOD_FRIENDLY Comparison', () => {
    it('should show clear difference between AGGRESSIVE and MOD_FRIENDLY policies', () => {
      // Nintendo (AGGRESSIVE) vs Bethesda (MOD_FRIENDLY) comparison
      const mixedGames = [
        // Nintendo official - should PASS
        {
          id: 22,
          name: 'Super Mario Odyssey',
          developer: 'Nintendo EPD',
          publisher: 'Nintendo',
          category: 0
        },
        // Nintendo mod - should be FILTERED (AGGRESSIVE)
        {
          id: 23,
          name: 'Mario Odyssey Moon Mod',
          developer: 'Fan Team',
          publisher: 'Community',
          category: 5
        },
        
        // Bethesda official - should PASS
        {
          id: 24,
          name: 'The Elder Scrolls V: Skyrim',
          developer: 'Bethesda Game Studios',
          publisher: 'Bethesda Softworks',
          category: 0
        },
        // Bethesda mod - should PASS (MOD_FRIENDLY)
        {
          id: 25,
          name: 'Skyrim: Enderal',
          developer: 'SureAI',
          publisher: 'Modding Community',
          category: 5
        }
      ];

      const filteredGames = filterProtectedContent(mixedGames);
      
      // Nintendo official should pass
      const marioOfficial = filteredGames.find(g => g.name.includes('Mario Odyssey') && g.category === 0);
      expect(marioOfficial).toBeDefined();
      
      // Nintendo mod should be filtered2
      const marioMod = filteredGames.find(g => g.name.includes('Mario Odyssey Moon Mod'));
      expect(marioMod).toBeUndefined();
      
      // Bethesda official should pass
      const skyrimOfficial = filteredGames.find(g => g.name.includes('Skyrim') && g.category === 0);
      expect(skyrimOfficial).toBeDefined();
      
      // Bethesda mod should pass (MOD_FRIENDLY policy)
      const skyrimMod = filteredGames.find(g => g.name.includes('Enderal'));
      expect(skyrimMod).toBeDefined();
    });
  });
});