import { describe, it, expect } from '@jest/globals';
import { 
  shouldFilterContent, 
  filterProtectedContent,
  isContentFiltered 
} from '../utils/contentProtectionFilter';

describe('Official Game Filtering Improvements', () => {
  describe('Pokemon Company Publisher Recognition', () => {
    it('should allow all Pokemon Company publisher variations', () => {
      const pokemonGames = [
        {
          id: 1,
          name: 'Pokemon Red',
          developer: 'Game Freak',
          publisher: 'Nintendo',
          category: 0
        },
        {
          id: 2,
          name: 'Pokemon Gold',
          developer: 'Game Freak',
          publisher: 'The Pokemon Company',
          category: 0
        },
        {
          id: 3,
          name: 'Pokemon Crystal',
          developer: 'Game Freak',
          publisher: 'Pokemon Company International',
          category: 0
        },
        {
          id: 4,
          name: 'Pokemon Ruby',
          developer: 'Game Freak',
          publisher: 'The Pokémon Company International',
          category: 0
        },
        {
          id: 5,
          name: 'Pokemon Sword',
          developer: 'Game Freak',
          publisher: 'Pokémon Company',
          category: 0
        }
      ];

      const filteredGames = filterProtectedContent(pokemonGames);
      
      // All official Pokemon games should pass through
      expect(filteredGames).toHaveLength(5);
      expect(filteredGames.every(game => game.name.startsWith('Pokemon'))).toBe(true);
      
      // Test each individual game is not filtered
      pokemonGames.forEach(game => {
        const isFiltered = shouldFilterContent(game);
        expect(isFiltered).toBe(false);
      });
    });

    it('should still filter Pokemon ROM hacks and fan games', () => {
      const pokemonFanGames = [
        {
          id: 10,
          name: 'Pokemon Crystal Clear',
          developer: 'ShockSlayer',
          publisher: 'RomHack Community',
          category: 5, // Mod
          summary: 'An open-world ROM hack of Pokemon Crystal'
        },
        {
          id: 11,
          name: 'Pokemon Uranium',
          developer: 'Pokemon Uranium Team',
          publisher: 'Fan Made',
          category: 0,
          summary: 'A fan-made Pokemon game with new region',
          description: 'This is a fan game created by the Pokemon Uranium Team'
        },
        {
          id: 12,
          name: 'Pokemon mod: Randomizer',
          developer: 'Community Modder',
          publisher: 'Homebrew',
          category: 5,
          summary: 'A mod that randomizes Pokemon encounters'
        }
      ];

      const filteredGames = filterProtectedContent(pokemonFanGames);
      
      // All fan content should be filtered out
      expect(filteredGames).toHaveLength(0);
      
      // Test each individual game is filtered
      pokemonFanGames.forEach(game => {
        const isFiltered = shouldFilterContent(game);
        expect(isFiltered).toBe(true);
      });
    });
  });

  describe('Nintendo Official Game Bypass', () => {
    it('should allow official Nintendo games despite franchise keywords', () => {
      const nintendoGames = [
        {
          id: 20,
          name: 'Super Mario Odyssey',
          developer: 'Nintendo EPD',
          publisher: 'Nintendo',
          category: 0,
          summary: 'Official Nintendo 3D platformer'
        },
        {
          id: 21,
          name: 'The Legend of Zelda: Breath of the Wild',
          developer: 'Nintendo EPD',
          publisher: 'Nintendo',
          category: 0,
          summary: 'Official Nintendo open-world adventure'
        },
        {
          id: 22,
          name: 'Metroid Prime',
          developer: 'Retro Studios',
          publisher: 'Nintendo',
          category: 0,
          summary: 'Official Nintendo first-person adventure'
        },
        {
          id: 23,
          name: 'Fire Emblem: Three Houses',
          developer: 'Intelligent Systems',
          publisher: 'Nintendo',
          category: 0,
          summary: 'Official Nintendo strategy RPG'
        }
      ];

      const filteredGames = filterProtectedContent(nintendoGames);
      
      // All official Nintendo games should pass
      expect(filteredGames).toHaveLength(4);
      
      // Verify individual games are not filtered
      nintendoGames.forEach(game => {
        const isFiltered = shouldFilterContent(game);
        expect(isFiltered).toBe(false);
        
        const analysis = isContentFiltered(game);
        expect(analysis.filtered).toBe(false);
      });
    });

    it('should still filter Nintendo fan games and mods', () => {
      const nintendoFanContent = [
        {
          id: 30,
          name: 'Super Mario Bros. ROM Hack',
          developer: 'Fan Developer',
          publisher: 'RomHack',
          category: 5, // Mod
          summary: 'A ROM hack with new levels and mechanics'
        },
        {
          id: 31,
          name: 'Zelda fan game: Breath of the Open Source',
          developer: 'Indie Team',
          publisher: 'Fan Made',
          category: 0,
          summary: 'Fan-made Zelda-inspired game'
        },
        {
          id: 32,
          name: 'Mario Kart mod: Unlimited Tracks',
          developer: 'Community Modder',
          publisher: 'Homebrew',
          category: 5,
          summary: 'Mod adding custom tracks to Mario Kart'
        }
      ];

      const filteredGames = filterProtectedContent(nintendoFanContent);
      
      // All fan content should be filtered
      expect(filteredGames).toHaveLength(0);
      
      nintendoFanContent.forEach(game => {
        const isFiltered = shouldFilterContent(game);
        expect(isFiltered).toBe(true);
      });
    });
  });

  describe('Rockstar/Take-Two Official Game Recognition', () => {
    it('should allow official GTA games', () => {
      const gtaGames = [
        {
          id: 40,
          name: 'Grand Theft Auto V',
          developer: 'Rockstar North',
          publisher: 'Rockstar Games',
          category: 0,
          summary: 'Official open-world action game'
        },
        {
          id: 41,
          name: 'Grand Theft Auto: San Andreas',
          developer: 'Rockstar North',
          publisher: 'Take-Two Interactive',
          category: 0,
          summary: 'Classic GTA game from 2004'
        },
        {
          id: 42,
          name: 'Red Dead Redemption 2',
          developer: 'Rockstar Games',
          publisher: 'Take-Two',
          category: 0,
          summary: 'Official western action-adventure game'
        }
      ];

      const filteredGames = filterProtectedContent(gtaGames);
      
      // All official Rockstar games should pass
      expect(filteredGames).toHaveLength(3);
      
      gtaGames.forEach(game => {
        const isFiltered = shouldFilterContent(game);
        expect(isFiltered).toBe(false);
      });
    });

    it('should still filter GTA mods and fan content', () => {
      const gtaFanContent = [
        {
          id: 50,
          name: 'GTA V: Los Santos Life mod',
          developer: 'Modding Community',
          publisher: 'FiveM',
          category: 5, // Mod
          summary: 'Roleplay mod for GTA V'
        },
        {
          id: 51,
          name: 'Grand Theft Auto: Fan City',
          developer: 'Fan Developer',
          publisher: 'Unofficial',
          category: 0,
          summary: 'Fan-made GTA-style game'
        }
      ];

      const filteredGames = filterProtectedContent(gtaFanContent);
      
      // Fan content should be filtered
      expect(filteredGames).toHaveLength(0);
      
      gtaFanContent.forEach(game => {
        const isFiltered = shouldFilterContent(game);
        expect(isFiltered).toBe(true);
      });
    });
  });

  describe('Square Enix Official Game Recognition', () => {
    it('should allow official Square Enix games', () => {
      const squareEnixGames = [
        {
          id: 60,
          name: 'Final Fantasy VII',
          developer: 'Square',
          publisher: 'Square Enix',
          category: 0,
          summary: 'Classic JRPG'
        },
        {
          id: 61,
          name: 'Final Fantasy VII Remake',
          developer: 'Square Enix Creative Business Unit I',
          publisher: 'Square Enix',
          category: 0,
          summary: 'Modern remake of FF7'
        },
        {
          id: 62,
          name: 'Dragon Quest XI',
          developer: 'Square Enix',
          publisher: 'Square Enix',
          category: 0,
          summary: 'Official JRPG'
        }
      ];

      const filteredGames = filterProtectedContent(squareEnixGames);
      
      // All official Square Enix games should pass
      expect(filteredGames).toHaveLength(3);
      
      squareEnixGames.forEach(game => {
        const isFiltered = shouldFilterContent(game);
        expect(isFiltered).toBe(false);
      });
    });
  });

  describe('Mixed Official and Fan Content Filtering', () => {
    it('should correctly separate official games from fan content', () => {
      const mixedGames = [
        // Official games - should pass
        {
          id: 70,
          name: 'Super Mario Galaxy',
          developer: 'Nintendo EAD',
          publisher: 'Nintendo',
          category: 0
        },
        {
          id: 71,
          name: 'Pokemon Diamond',
          developer: 'Game Freak',
          publisher: 'The Pokemon Company',
          category: 0
        },
        {
          id: 72,
          name: 'Grand Theft Auto IV',
          developer: 'Rockstar North',
          publisher: 'Rockstar Games',
          category: 0
        },
        
        // Fan content - should be filtered
        {
          id: 73,
          name: 'Super Mario Bros. 3 Mix',
          developer: 'Fan Developer',
          publisher: 'RomHack',
          category: 5
        },
        {
          id: 74,
          name: 'Pokemon Crystal Clear',
          developer: 'ShockSlayer',
          publisher: 'Community',
          category: 5
        },
        {
          id: 75,
          name: 'GTA: Vice City Stories mod',
          developer: 'Modder',
          publisher: 'Unofficial',
          category: 5
        }
      ];

      const filteredGames = filterProtectedContent(mixedGames);
      
      // Should have exactly 3 official games, 0 fan games
      expect(filteredGames).toHaveLength(3);
      
      // Verify all remaining games are official
      const remainingNames = filteredGames.map(g => g.name);
      expect(remainingNames).toEqual([
        'Super Mario Galaxy',
        'Pokemon Diamond', 
        'Grand Theft Auto IV'
      ]);
      
      // Verify fan content was filtered
      const fanContentIds = [73, 74, 75];
      fanContentIds.forEach(id => {
        const fanGame = mixedGames.find(g => g.id === id);
        expect(fanGame).toBeDefined();
        const isFiltered = shouldFilterContent(fanGame!);
        expect(isFiltered).toBe(true);
      });
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle games with missing publisher/developer gracefully', () => {
      const edgeCaseGames = [
        {
          id: 80,
          name: 'Unknown Game',
          category: 0
          // No developer/publisher
        },
        {
          id: 81,
          name: 'Mario-like Game',
          developer: '',
          publisher: '',
          category: 0
        },
        {
          id: 82,
          name: 'Super Mario Odyssey',
          developer: 'Nintendo EPD',
          publisher: null,
          category: 0
        }
      ];

      // Should not throw errors
      expect(() => {
        edgeCaseGames.forEach(game => shouldFilterContent(game));
      }).not.toThrow();
      
      // Should filter unknown games with franchise keywords but no official publisher
      expect(shouldFilterContent(edgeCaseGames[1])).toBe(true); // Mario-like Game with no publisher
      
      // Should allow known official developers even with missing publisher
      expect(shouldFilterContent(edgeCaseGames[2])).toBe(false); // Nintendo EPD is official
    });

    it('should maintain high performance with large datasets', () => {
      // Create a large dataset
      const largeDataset = [];
      for (let i = 0; i < 100; i++) {
        largeDataset.push({
          id: i,
          name: `Game ${i}`,
          developer: i % 2 === 0 ? 'Nintendo' : 'Fan Developer',
          publisher: i % 2 === 0 ? 'Nintendo' : 'Homebrew',
          category: i % 2 === 0 ? 0 : 5
        });
      }

      const startTime = Date.now();
      const filteredGames = filterProtectedContent(largeDataset);
      const endTime = Date.now();
      
      // Should complete filtering within reasonable time (< 500ms)
      const processingTime = endTime - startTime;
      expect(processingTime).toBeLessThan(500);
      
      // With time-based filtering: Official Nintendo games pass through, 
      // fan mods with unknown dates are now allowed (treated as old)
      // So all 100 games should pass (50 official + 50 old mods)
      expect(filteredGames).toHaveLength(100);
      
      // Verify we have both Nintendo official games and fan mods
      const officialGames = filteredGames.filter(game => game.developer === 'Nintendo');
      const fanMods = filteredGames.filter(game => game.developer === 'Fan Developer');
      expect(officialGames).toHaveLength(50);
      expect(fanMods).toHaveLength(50); // Fan mods now allowed due to unknown release dates
    });
  });
});