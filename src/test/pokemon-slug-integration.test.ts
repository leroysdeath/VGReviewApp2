import { generateSlug, generateUniqueSlug } from '../utils/gameUrls';

describe('Pokemon Search Integration', () => {
  test('Pokemon slugs should be valid for database queries', () => {
    const pokemonGames = [
      'Pokémon Red Version',
      'Pokémon Blue Version',
      'Pokémon Yellow Version',
      'Pokémon Gold Version',
      'Pokémon Silver Version',
      'Pokémon Crystal Version',
      'Pokémon Ruby Version',
      'Pokémon Sapphire Version',
      'Pokémon Emerald Version',
      'Pokémon FireRed Version',
      'Pokémon LeafGreen Version',
      'Pokémon Diamond Version',
      'Pokémon Pearl Version',
      'Pokémon Platinum Version',
      'Pokémon Black Version',
      'Pokémon White Version',
      'Pokémon Black Version 2',
      'Pokémon White Version 2',
      'Pokémon X',
      'Pokémon Y',
      'Pokémon Omega Ruby',
      'Pokémon Alpha Sapphire',
      'Pokémon Sun',
      'Pokémon Moon',
      'Pokémon Ultra Sun',
      'Pokémon Ultra Moon',
      'Pokémon Sword',
      'Pokémon Shield',
      'Pokémon Brilliant Diamond',
      'Pokémon Shining Pearl',
      'Pokémon Legends: Arceus',
      'Pokémon Scarlet',
      'Pokémon Violet'
    ];

    pokemonGames.forEach(gameName => {
      const slug = generateSlug(gameName);
      
      // Verify the slug contains 'pokemon', not 'pokmon'
      expect(slug).toMatch(/pokemon/);
      expect(slug).not.toMatch(/pokmon/);
      
      // Verify slug is URL-safe
      expect(slug).toMatch(/^[a-z0-9-]+$/);
      
      // Verify no accented characters remain
      expect(slug).not.toContain('é');
      expect(slug).not.toContain('è');
      
      // Simulate what would be in a Supabase query
      const queryUrl = `https://example.supabase.co/rest/v1/game?slug=eq.${slug}`;
      
      // The URL should be valid (no special chars that would break it)
      expect(() => new URL(queryUrl)).not.toThrow();
      
      // Log for manual verification if needed
      console.log(`✓ ${gameName} -> ${slug}`);
    });
  });

  test('Pokemon franchise search should produce valid query', () => {
    const searchTerm = 'Pokémon';
    const slug = generateSlug(searchTerm);
    
    expect(slug).toBe('pokemon');
    
    // This should create a valid database query
    const dbQuery = {
      table: 'game',
      filter: `slug=eq.${slug}`,
      expected: 'slug=eq.pokemon'
    };
    
    expect(dbQuery.filter).toBe('slug=eq.pokemon');
    expect(dbQuery.filter).not.toBe('slug=eq.pokmon');
  });

  test('Mixed Pokemon searches should normalize correctly', () => {
    const searchVariants = [
      'pokemon',       // No accent
      'Pokémon',       // With accent
      'POKÉMON',       // Uppercase with accent
      'pokémon',       // Lowercase with accent
      'Pokemon',       // Capital, no accent
      'POKEMON',       // All caps, no accent
      ' Pokémon ',     // With spaces
      'Pokémon™',      // With trademark
      'Pokémon®'       // With registered mark
    ];

    const slugs = searchVariants.map(variant => generateSlug(variant));
    
    // All should produce 'pokemon'
    slugs.forEach(slug => {
      expect(slug).toBe('pokemon');
    });
    
    // Verify they're all identical (important for database consistency)
    const uniqueSlugs = new Set(slugs);
    expect(uniqueSlugs.size).toBe(1);
    expect([...uniqueSlugs][0]).toBe('pokemon');
  });

  test('Real problematic Pokemon e-Reader games should work', () => {
    const eReaderGames = [
      { 
        name: 'Pokémon Battle-e Card: Freezing Ray!',
        expectedSlug: 'pokemon-battle-e-card-freezing-ray'
      },
      {
        name: 'Pokémon Battle-e Card: Iron Defense!',
        expectedSlug: 'pokemon-battle-e-card-iron-defense'
      },
      {
        name: 'Pokémon Colosseum Double Battle Card-e: Blue Pack',
        expectedSlug: 'pokemon-colosseum-double-battle-card-e-blue-pack'
      },
      {
        name: 'Pokémon Channel-e Paint Pattern Card: Poké a la Card!',
        expectedSlug: 'pokemon-channel-e-paint-pattern-card-poke-a-la-card'
      }
    ];

    eReaderGames.forEach(({ name, expectedSlug }) => {
      const slug = generateSlug(name);
      expect(slug).toBe(expectedSlug);
      
      // Ensure it contains 'pokemon', not 'pokmon'
      expect(slug).toContain('pokemon');
      expect(slug).not.toContain('pokmon');
      
      // Verify it would work in a database query
      const queryParam = `slug=eq.${slug}`;
      expect(queryParam).toContain('slug=eq.pokemon');
      expect(queryParam).not.toContain('slug=eq.pokmon');
    });
  });

  test('Pokemon spin-off titles should work correctly', () => {
    const spinoffs = [
      'Pokémon Mystery Dungeon: Red Rescue Team',
      'Pokémon Ranger',
      'Pokémon Conquest',
      'Pokémon Snap',
      'Pokémon Stadium',
      'Pokémon Colosseum',
      'Pokémon XD: Gale of Darkness',
      'Pokémon Trozei!',
      'Pokémon Dash',
      'Pokémon Rumble',
      'Pokémon Art Academy',
      'Pokémon Shuffle',
      'Pokémon Picross',
      'Pokémon GO',
      'Pokémon Quest',
      'Pokémon Café Mix',
      'Pokémon UNITE',
      'New Pokémon Snap'
    ];

    spinoffs.forEach(title => {
      const slug = generateSlug(title);
      
      // All should contain 'pokemon' not 'pokmon'
      if (title.toLowerCase().includes('pokémon') || title.toLowerCase().includes('pokemon')) {
        expect(slug).toContain('pokemon');
        expect(slug).not.toContain('pokmon');
      }
      
      // Should be database-query safe
      expect(slug).toMatch(/^[a-z0-9-]*$/);
    });
  });
});