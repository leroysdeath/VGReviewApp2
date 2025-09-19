import { shouldFilterContent, filterProtectedContent, isOfficialCompany, debugGameFiltering } from '../utils/contentProtectionFilter';

describe('Pokemon Filtering Debug', () => {
  test('should NOT filter official Pokemon games', () => {
    const pokemonGames = [
      {
        id: 1511,
        name: 'Pokémon Blue Version',
        developer: 'Game Freak',
        publisher: 'Nintendo',
        category: 0, // Main game
      },
      {
        id: 1512,
        name: 'Pokémon Red Version',
        developer: 'Game Freak',
        publisher: 'Nintendo',
        category: 0,
      },
      {
        id: 1514,
        name: 'Pokémon Crystal Version',
        developer: 'Game Freak',
        publisher: 'Nintendo',
        category: 0,
      },
      {
        id: 1521,
        name: 'Pokémon Black Version',
        developer: 'Game Freak',
        publisher: 'The Pokémon Company',
        category: 0,
      },
      {
        id: 8284,
        name: 'Pokémon Black Version 2',
        developer: 'Game Freak',
        publisher: 'Nintendo',
        category: 0,
      },
      {
        id: 2320,
        name: 'Pokémon Mystery Dungeon: Blue Rescue Team',
        developer: 'Chunsoft',
        publisher: 'Nintendo',
        category: 0,
      },
      // Games with Pokemon Company as publisher
      {
        id: 999901,
        name: 'Pokémon Scarlet',
        developer: 'Game Freak',
        publisher: 'The Pokémon Company',
        category: 0,
      },
      {
        id: 999902,
        name: 'Pokémon Violet',
        developer: 'Game Freak',
        publisher: 'The Pokemon Company', // Without accent
        category: 0,
      },
      {
        id: 999903,
        name: 'Pokémon Legends: Arceus',
        developer: 'Game Freak',
        publisher: 'The Pokémon Company International',
        category: 0,
      }
    ];

    pokemonGames.forEach(game => {
      // Check if it's recognized as official
      const isOfficial = isOfficialCompany(game);
      console.log(`Game: ${game.name}`);
      console.log(`  Developer: ${game.developer}`);
      console.log(`  Publisher: ${game.publisher}`);
      console.log(`  Is Official: ${isOfficial}`);
      
      // Debug the filtering decision
      const debugInfo = debugGameFiltering(game);
      console.log(`  Debug Info:`, debugInfo);
      
      // Test that it should NOT be filtered
      const shouldFilter = shouldFilterContent(game);
      expect(shouldFilter).toBe(false);
      
      // Test filterProtectedContent
      const filtered = filterProtectedContent([game]);
      expect(filtered.length).toBe(1);
      expect(filtered[0].name).toBe(game.name);
    });
  });

  test('should filter Pokemon fan games and mods', () => {
    const fanGames = [
      {
        id: 999,
        name: 'Pokémon Uranium',
        developer: 'Fan Team',
        publisher: 'Unofficial',
        category: 5, // Mod
      },
      {
        id: 998,
        name: 'Pokémon ROM Hack: Crystal Clear',
        developer: 'ShockSlayer',
        publisher: 'Independent',
        category: 5,
      },
      {
        id: 997,
        name: 'Pokémon Insurgence',
        developer: 'The Insurgence Team',
        publisher: 'Fan Made',
        category: 0, // Even if marked as main game
      }
    ];

    fanGames.forEach(game => {
      const shouldFilter = shouldFilterContent(game);
      const filtered = filterProtectedContent([game]);
      
      console.log(`Fan Game: ${game.name} - Should Filter: ${shouldFilter}`);
      
      // These SHOULD be filtered
      expect(shouldFilter).toBe(true);
      expect(filtered.length).toBe(0);
    });
  });

  test('should handle Pokemon e-Reader games correctly', () => {
    const eReaderGames = [
      {
        id: 351674,
        name: 'Pokémon Channel-e Paint Pattern Card: Poké a la Card!',
        developer: 'Nintendo',
        publisher: 'Nintendo',
        category: 0,
      },
      {
        id: 220853,
        name: 'Pokémon Battle-e Card: Freezing Ray!',
        developer: 'Nintendo',
        publisher: 'Nintendo',
        category: 0,
      },
      {
        id: 355871,
        name: 'Pokémon Battle-e Card: Iron Defense!',
        developer: 'Nintendo',
        publisher: 'Nintendo',
        category: 0,
      },
      {
        id: 355873,
        name: 'Pokémon Colosseum Double Battle Card-e: Blue Pack',
        developer: 'Nintendo',
        publisher: 'Nintendo',
        category: 0,
      }
    ];

    eReaderGames.forEach(game => {
      // Check if it's recognized as official
      const isOfficial = isOfficialCompany(game);
      const shouldFilter = shouldFilterContent(game);
      
      console.log(`e-Reader Game: ${game.name}`);
      console.log(`  Is Official: ${isOfficial}`);
      console.log(`  Should Filter: ${shouldFilter}`);
      
      // e-Reader games from Nintendo should be treated as official
      // but might be filtered by filterFanGamesAndEReaderContent
      // which is a separate filter applied later
    });
  });

  test('debug specific problematic games', () => {
    // These are real games that are being incorrectly filtered
    const problematicGames = [
      {
        id: 1511,
        igdb_id: 1511,
        name: 'Pokémon Blue Version',
        developer: undefined, // Missing developer
        publisher: undefined, // Missing publisher
        category: undefined, // Missing category
      },
      {
        id: 1511,
        igdb_id: 1511,
        name: 'Pokémon Blue Version',
        developer: '',
        publisher: '',
        category: null,
      },
      {
        id: 1511,
        igdb_id: 1511,
        name: 'Pokémon Blue Version',
        developer: 'Unknown',
        publisher: 'Unknown',
        category: 0,
      }
    ];

    problematicGames.forEach((game, index) => {
      console.log(`\nProblematic Case ${index + 1}:`);
      console.log(`  Game: ${game.name}`);
      console.log(`  Developer: ${game.developer}`);
      console.log(`  Publisher: ${game.publisher}`);
      console.log(`  Category: ${game.category}`);
      
      const isOfficial = isOfficialCompany(game);
      console.log(`  Is Official: ${isOfficial}`);
      
      const shouldFilter = shouldFilterContent(game);
      console.log(`  Should Filter: ${shouldFilter}`);
      
      // If developer/publisher are missing, it will likely be filtered
      // This is the root cause!
    });
  });
});