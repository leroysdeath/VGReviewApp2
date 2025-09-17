/**
 * Tests for IGDB API request formatting to prevent 406 errors
 */

describe('IGDB API Request Formatting', () => {
  describe('Query sanitization', () => {
    test('should sanitize search queries for IGDB API', () => {
      const problematicQueries = [
        'pokémon', // Accented character
        'café society', // Accented character
        'naïve bayes', // Diaeresis
        'señor', // Tilde
        'Zürich racing', // Umlaut
        '北京 olympics', // Non-Latin characters
        'game🎮test', // Emoji
        'multiple   spaces', // Multiple spaces
        'trailing space ', // Trailing space
        ' leading space', // Leading space
        'quotes"test"', // Quotes
        "apostrophe's test", // Apostrophes
        'special!@#$%^&*()chars', // Special characters
        'new\nline\ntest', // Newlines
        'tab\ttest', // Tabs
        '', // Empty string
        '   ', // Only spaces
      ];

      problematicQueries.forEach(query => {
        try {
          // Simulate the sanitization that should happen before IGDB API call
          const sanitized = sanitizeIGDBQuery(query);
          
          // Should not contain problematic characters
          expect(sanitized).not.toMatch(/[éèêëáàâäãåíìîïóòôöõúùûüñçÿý]/);
          expect(sanitized).not.toMatch(/[北京🎮]/);
          expect(sanitized).not.toMatch(/[!@#$%^*()]/); // & is allowed for game titles
          expect(sanitized).not.toMatch(/["\n\t]/);
          
          // Should not have leading/trailing spaces
          expect(sanitized).toBe(sanitized.trim());
          
          // Should not have multiple consecutive spaces
          expect(sanitized).not.toMatch(/\s{2,}/);
          
          console.log(`"${query}" -> "${sanitized}"`);
        } catch (error) {
          // Empty or invalid queries should throw errors
          if (query === '' || query === '   ') {
            expect(error.message).toMatch(/Query (must be a non-empty string|cannot be empty after sanitization)/);
            console.log(`"${query}" -> ERROR (expected)`);
          } else {
            throw error; // Re-throw unexpected errors
          }
        }
      });
    });

    test('should preserve valid search terms', () => {
      const validQueries = [
        'pokemon',
        'mario',
        'zelda',
        'final fantasy',
        'call of duty',
        'grand theft auto',
        'world of warcraft',
        'league of legends',
        'counter strike',
        'half life',
      ];

      validQueries.forEach(query => {
        const sanitized = sanitizeIGDBQuery(query);
        
        // Valid queries should remain mostly unchanged (except normalization)
        expect(sanitized.toLowerCase()).toBe(query.toLowerCase());
        expect(sanitized.length).toBeGreaterThan(0);
      });
    });

    test('should handle Pokemon-specific queries', () => {
      const pokemonQueries = [
        'pokémon',
        'Pokémon Red',
        'Pokémon Blue Version',
        'Pokémon Mystery Dungeon: Blue Rescue Team',
        'Pokémon Legends: Arceus',
        'Pokémon Scarlet & Violet',
      ];

      pokemonQueries.forEach(query => {
        const sanitized = sanitizeIGDBQuery(query);
        
        // Should convert to 'pokemon'
        expect(sanitized.toLowerCase()).toContain('pokemon');
        expect(sanitized.toLowerCase()).not.toContain('pokémon');
        
        // Should be safe for IGDB API
        expect(sanitized).toMatch(/^[a-zA-Z0-9\s\-:&]+$/);
        
        console.log(`Pokemon: "${query}" -> "${sanitized}"`);
      });
    });
  });

  describe('IGDB request body formatting', () => {
    test('should format search request body correctly', () => {
      const testCases = [
        { query: 'pokemon', limit: 20 },
        { query: 'mario', limit: 50 },
        { query: 'final fantasy', limit: 10 },
        { query: 'zelda breath of the wild', limit: 5 },
      ];

      testCases.forEach(({ query, limit }) => {
        const requestBody = formatIGDBSearchRequest(query, limit);
        
        // Should contain required fields
        expect(requestBody).toContain('fields');
        expect(requestBody).toContain('search');
        expect(requestBody).toContain('limit');
        
        // Should have proper syntax
        expect(requestBody).toMatch(/fields [^;]+;/);
        expect(requestBody).toMatch(/search "[^"]+";/);
        expect(requestBody).toMatch(/limit \d+;/);
        
        // Should not contain problematic characters in the search term
        const searchMatch = requestBody.match(/search "([^"]+)";/);
        if (searchMatch) {
          const searchTerm = searchMatch[1];
          expect(searchTerm).not.toMatch(/[éèêëáàâäãåíìîïóòôöõúùûüñçÿý]/);
        }
        
        console.log(`Request for "${query}":`, requestBody);
      });
    });

    test('should format getById request correctly', () => {
      const gameIds = [1511, 1512, 8284, 2320];
      
      gameIds.forEach(gameId => {
        const requestBody = formatIGDBByIdRequest(gameId);
        
        // Should contain required fields and where clause
        expect(requestBody).toContain('fields');
        expect(requestBody).toContain('where');
        expect(requestBody).toContain(`id = ${gameId}`);
        
        // Should have proper syntax
        expect(requestBody).toMatch(/fields [^;]+;/);
        expect(requestBody).toMatch(/where id = \d+;/);
        
        console.log(`Request for ID ${gameId}:`, requestBody);
      });
    });
  });

  describe('Error prevention', () => {
    test('should prevent empty or invalid queries', () => {
      const invalidQueries = ['', '   ', null, undefined];
      
      invalidQueries.forEach(query => {
        expect(() => {
          const sanitized = sanitizeIGDBQuery(query);
          if (!sanitized || sanitized.trim().length === 0) {
            throw new Error('Invalid query');
          }
        }).toThrow();
      });
    });

    test('should handle very long queries', () => {
      const longQuery = 'a'.repeat(1000);
      const sanitized = sanitizeIGDBQuery(longQuery);
      
      // Should be truncated to reasonable length
      expect(sanitized.length).toBeLessThan(500);
    });
  });
});

// Helper functions that should exist in the actual IGDB service

function sanitizeIGDBQuery(query: string | null | undefined): string {
  if (!query || typeof query !== 'string') {
    throw new Error('Query must be a non-empty string');
  }
  
  // Normalize accented characters
  const normalized = query
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  
  // Remove problematic characters and normalize spaces
  const sanitized = normalized
    .replace(/[^\w\s\-:&]/g, '') // Keep only word chars, spaces, hyphens, colons, ampersands
    .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
    .trim();
  
  if (sanitized.length === 0) {
    throw new Error('Query cannot be empty after sanitization');
  }
  
  // Truncate if too long
  if (sanitized.length > 200) {
    return sanitized.substring(0, 200).trim();
  }
  
  return sanitized;
}

function formatIGDBSearchRequest(query: string, limit: number = 20): string {
  const sanitizedQuery = sanitizeIGDBQuery(query);
  
  const fields = [
    'name',
    'summary', 
    'storyline',
    'slug',
    'first_release_date',
    'rating',
    'category',
    'cover.url',
    'screenshots.url',
    'genres.name',
    'platforms.name',
    'involved_companies.company.name',
    'involved_companies.developer',
    'involved_companies.publisher',
    'alternative_names.name',
    'collection.name',
    'franchise.name',
    'franchises.name',
    'parent_game',
    'url',
    'dlcs',
    'expansions',
    'similar_games',
    'hypes',
    'follows',
    'total_rating',
    'total_rating_count',
    'rating_count'
  ].join(', ');
  
  return `fields ${fields}; search "${sanitizedQuery}"; limit ${limit};`;
}

function formatIGDBByIdRequest(gameId: number): string {
  if (!gameId || !Number.isInteger(gameId) || gameId <= 0) {
    throw new Error('Game ID must be a positive integer');
  }
  
  const fields = [
    'name',
    'summary',
    'storyline', 
    'slug',
    'first_release_date',
    'rating',
    'category',
    'cover.url',
    'screenshots.url',
    'genres.name',
    'platforms.name',
    'involved_companies.company.name',
    'involved_companies.developer',
    'involved_companies.publisher',
    'alternative_names.name',
    'collection.name',
    'franchise.name',
    'franchises.name',
    'parent_game',
    'url',
    'dlcs',
    'expansions',
    'similar_games',
    'hypes',
    'follows',
    'total_rating',
    'total_rating_count',
    'rating_count'
  ].join(', ');
  
  return `fields ${fields}; where id = ${gameId};`;
}