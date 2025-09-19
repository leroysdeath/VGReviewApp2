import { shouldFilterContent, filterProtectedContent } from '../utils/contentProtectionFilter';

describe('Pokemon with Missing Metadata', () => {
  test('should NOT filter Pokemon Blue with IGDB ID but missing developer/publisher', () => {
    const pokemonBlue = {
      id: 1511,
      igdb_id: 1511,
      name: 'Pokémon Blue Version',
      developer: undefined,
      publisher: undefined,
      category: 0,
    };

    const shouldFilter = shouldFilterContent(pokemonBlue);
    console.log(`Pokemon Blue (missing metadata) - Should Filter: ${shouldFilter}`);
    
    expect(shouldFilter).toBe(false); // Should NOT be filtered due to known IGDB ID
  });

  test('should NOT filter Pokemon games with official name patterns', () => {
    const testCases = [
      { name: 'Pokémon Red Version', developer: '', publisher: '' },
      { name: 'Pokémon Crystal Version', developer: undefined, publisher: undefined },
      { name: 'Pokémon Black Version 2', developer: 'Unknown', publisher: 'Unknown' },
      { name: 'Pokémon Legends: Arceus', developer: null, publisher: null },
      { name: 'Pokémon Mystery Dungeon: Blue Rescue Team', developer: '', publisher: '' },
    ];

    testCases.forEach(game => {
      const fullGame = { 
        id: 999, 
        ...game, 
        category: 0 
      };
      
      const shouldFilter = shouldFilterContent(fullGame);
      console.log(`${game.name} (missing metadata) - Should Filter: ${shouldFilter}`);
      
      expect(shouldFilter).toBe(false); // Should NOT be filtered due to official name pattern
    });
  });

  test('should STILL filter fan games even with Pokemon in name', () => {
    const fanGames = [
      { name: 'Pokémon Uranium', developer: '', publisher: '' },
      { name: 'Pokémon Insurgence', developer: 'Fan Team', publisher: '' },
      { name: 'Pokémon ROM Hack Crystal Clear', developer: '', publisher: '' },
      { name: 'Pokémon Fan Game: Adventure', developer: '', publisher: '' },
    ];

    fanGames.forEach(game => {
      const fullGame = { 
        id: 999, 
        ...game, 
        category: 0 
      };
      
      const shouldFilter = shouldFilterContent(fullGame);
      console.log(`${game.name} (fan game) - Should Filter: ${shouldFilter}`);
      
      expect(shouldFilter).toBe(true); // SHOULD be filtered as fan content
    });
  });

  test('real-world scenario: Pokemon games from search results', () => {
    // Simulating what we see in the actual search results
    const searchResults = [
      {
        id: 1511,
        igdb_id: 1511,
        name: 'Pokémon Blue Version',
        // Missing developer/publisher as seen in errors
      },
      {
        id: 8284,
        igdb_id: 8284, 
        name: 'Pokémon Black Version 2',
      },
      {
        id: 1514,
        igdb_id: 1514,
        name: 'Pokémon Crystal Version',
      },
      {
        id: 2320,
        igdb_id: 2320,
        name: 'Pokémon Mystery Dungeon: Blue Rescue Team',
      }
    ];

    const filtered = filterProtectedContent(searchResults);
    
    console.log(`Search results: ${searchResults.length} games`);
    console.log(`After filtering: ${filtered.length} games`);
    console.log('Filtered games:', filtered.map(g => g.name));
    
    // All official Pokemon games should pass through
    expect(filtered.length).toBe(searchResults.length);
  });
});