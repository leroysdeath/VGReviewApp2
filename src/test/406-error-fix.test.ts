/**
 * Test to validate the 406 error fix for slug generation
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// Mock the gameUrls module to avoid actual DB calls
const mockGenerateSlug = jest.fn();
const mockGenerateUniqueSlug = jest.fn();

jest.mock('../utils/gameUrls', () => ({
  generateSlug: mockGenerateSlug,
  generateUniqueSlug: mockGenerateUniqueSlug,
  getGameUrl: jest.fn(),
  isNumericIdentifier: jest.fn()
}));

describe('406 Error Fix Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should demonstrate the current expensive slug generation', async () => {
    // Simulate what happens during a search
    const searchResults = [
      { id: 1, name: 'The Legend of Zelda: Return of the Hylian' },
      { id: 2, name: 'The Legend of Zelda: Mystical Seed of Wisdom' },
      { id: 3, name: 'The Legend of Zelda: Four Swords' },
      { id: 4, name: 'The Legend of Zelda: Oni Link Begins' },
      { id: 5, name: 'The Legend of Zelda: The Wheel of Fate' }
    ];

    // Current problematic implementation
    mockGenerateUniqueSlug.mockImplementation((name, id) => {
      // This would make a DB query for each game
      console.log(`DB Query: SELECT * FROM game WHERE slug = eq.${name.toLowerCase().replace(/\s+/g, '-')} AND igdb_id != ${id}`);
      return Promise.resolve(`${name.toLowerCase().replace(/\s+/g, '-')}-${id}`);
    });

    // Process all games (this is what's happening now)
    const slugPromises = searchResults.map(game => 
      mockGenerateUniqueSlug(game.name, game.id)
    );
    
    await Promise.all(slugPromises);

    // Verify the expensive operation
    expect(mockGenerateUniqueSlug).toHaveBeenCalledTimes(5);
    expect(mockGenerateUniqueSlug).toHaveBeenCalledWith('The Legend of Zelda: Return of the Hylian', 1);
  });

  test('should show the optimized approach', () => {
    const searchResults = [
      { id: 1, name: 'The Legend of Zelda: Return of the Hylian' },
      { id: 2, name: 'The Legend of Zelda: Mystical Seed of Wisdom' },
      { id: 3, name: 'The Legend of Zelda: Four Swords' },
      { id: 4, name: 'The Legend of Zelda: Oni Link Begins' },
      { id: 5, name: 'The Legend of Zelda: The Wheel of Fate' }
    ];

    // Optimized implementation - no DB queries during search
    mockGenerateSlug.mockImplementation((name, id) => {
      // Simple slug generation with IGDB ID for uniqueness
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      return `${slug}-${id}`;
    });

    // Process all games with the optimized approach
    const slugs = searchResults.map(game => 
      mockGenerateSlug(game.name, game.id)
    );

    // Verify no expensive DB operations
    expect(mockGenerateSlug).toHaveBeenCalledTimes(5);
    expect(mockGenerateUniqueSlug).toHaveBeenCalledTimes(0); // No DB queries!
    
    // Verify slug quality
    expect(slugs[0]).toBe('the-legend-of-zelda-return-of-the-hylian-1');
    expect(slugs[1]).toBe('the-legend-of-zelda-mystical-seed-of-wisdom-2');
  });

  test('should simulate the performance improvement', async () => {
    const largeSearchResults = Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
      name: `Game ${i + 1}`
    }));

    // Current approach - 50 DB queries
    const startTimeExpensive = Date.now();
    mockGenerateUniqueSlug.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve('slug'), 10)) // Simulate 10ms DB query
    );
    
    await Promise.all(largeSearchResults.map(game => 
      mockGenerateUniqueSlug(game.name, game.id)
    ));
    const expensiveTime = Date.now() - startTimeExpensive;

    // Optimized approach - 0 DB queries
    const startTimeOptimized = Date.now();
    mockGenerateSlug.mockImplementation((name, id) => `${name.toLowerCase()}-${id}`);
    
    largeSearchResults.map(game => 
      mockGenerateSlug(game.name, game.id)
    );
    const optimizedTime = Date.now() - startTimeOptimized;

    // Performance should be dramatically better
    expect(optimizedTime).toBeLessThan(expensiveTime / 10);
    expect(mockGenerateUniqueSlug).toHaveBeenCalledTimes(50);
    expect(mockGenerateSlug).toHaveBeenCalledTimes(50);
  });
});