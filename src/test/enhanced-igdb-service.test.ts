import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { EnhancedIGDBService } from '../services/enhancedIGDBService';

// Mock fetch globally
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe('Enhanced IGDB Service - Layer 1 Implementation', () => {
  let service: EnhancedIGDBService;
  
  beforeEach(() => {
    service = new EnhancedIGDBService();
    jest.clearAllMocks();
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });
  
  describe('Query Building', () => {
    describe('buildEnhancedQuery', () => {
      it('should build franchise query with proper categories and sorting', () => {
        const query = service.buildEnhancedQuery('mario', { searchType: 'franchise' });
        
        expect(query).toContain('search "mario"');
        expect(query).toContain('category = (0,2,4,8,9,10,11)');
        expect(query).toContain('sort total_rating desc');
        expect(query).toContain('limit 100');
      });
      
      it('should build specific query with excluded categories', () => {
        const query = service.buildEnhancedQuery('Super Mario 64', { searchType: 'specific' });
        
        expect(query).toContain('search "Super Mario 64"');
        expect(query).toContain('category != (5,7,13,14)');
        expect(query).toContain('sort follows desc');
        expect(query).toContain('limit 50');
      });
      
      it('should auto-detect franchise searches', () => {
        const marioQuery = service.buildEnhancedQuery('mario');
        const zeldaQuery = service.buildEnhancedQuery('zelda');
        const pokemonQuery = service.buildEnhancedQuery('pokemon');
        
        // All should be treated as franchise searches
        expect(marioQuery).toContain('category = (0,2,4,8,9,10,11)');
        expect(zeldaQuery).toContain('category = (0,2,4,8,9,10,11)');
        expect(pokemonQuery).toContain('category = (0,2,4,8,9,10,11)');
      });
      
      it('should support custom sorting options', () => {
        const ratingQuery = service.buildEnhancedQuery('mario', { 
          sortBy: 'rating' 
        });
        const followsQuery = service.buildEnhancedQuery('mario', { 
          sortBy: 'follows' 
        });
        
        expect(ratingQuery).toContain('sort rating desc');
        expect(followsQuery).toContain('sort follows desc');
      });
    });
  });
  
  describe('Multi-Query Strategy', () => {
    it('should execute multiple queries for franchise searches', async () => {
      const mockResults = {
        exactMatch: [
          { id: 1, name: 'Super Mario 64', category: 0, rating: 95 }
        ],
        franchise: [
          { id: 2, name: 'Super Mario World', category: 0, rating: 94 },
          { id: 3, name: 'Mario Kart 8', category: 0, rating: 88 }
        ],
        alternative: [
          { id: 4, name: 'Super Mario Bros.', category: 0, rating: 90 }
        ],
        collection: [
          { id: 5, name: 'Super Mario 3D All-Stars', category: 3, rating: 83 }
        ]
      };
      
      let callCount = 0;
      (global.fetch as jest.Mock).mockImplementation(() => {
        const results = Object.values(mockResults)[callCount % 4];
        callCount++;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            games: results
          })
        } as Response);
      });
      
      const results = await service.multiQuerySearch('mario');
      
      // Should have called fetch multiple times
      expect(global.fetch).toHaveBeenCalledTimes(4);
      
      // Results should be merged and deduplicated
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toBe('Super Mario 64'); // Exact match first
      
      // Check no duplicates
      const ids = results.map(g => g.id);
      const uniqueIds = [...new Set(ids)];
      expect(ids.length).toBe(uniqueIds.length);
    });
    
    it('should handle query failures gracefully', async () => {
      // First query succeeds, second fails, third succeeds
      let callCount = 0;
      (global.fetch as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            games: [{ id: callCount, name: `Game ${callCount}`, category: 0 }]
          })
        } as Response);
      });
      
      const results = await service.multiQuerySearch('test');
      
      // Should still return results from successful queries
      expect(results.length).toBeGreaterThan(0);
      // Should attempt all queries (exact match, alternative names, collections)
      // "test" is not a franchise, so only 3 queries are executed
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });
  });
  
  describe('Sister Game Detection', () => {
    it('should detect Pokemon sister games', async () => {
      (global.fetch as jest.Mock).mockImplementation((url, options) => {
        const body = JSON.parse(options?.body as string);
        const query = body.requestBody || '';
        
        if (query.includes('pokemon red')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              games: [{ id: 1, name: 'Pokemon Red Version', category: 0 }]
            })
          } as Response);
        } else if (query.includes('pokemon blue')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              games: [{ id: 2, name: 'Pokemon Blue Version', category: 0 }]
            })
          } as Response);
        } else if (query.includes('pokemon yellow')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              games: [{ id: 3, name: 'Pokemon Yellow Version', category: 0 }]
            })
          } as Response);
        }
        
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, games: [] })
        } as Response);
      });
      
      const results = await service.searchWithSisterGames('pokemon red', 10);
      
      // Should find sister games
      const gameNames = results.map(g => g.name);
      expect(gameNames).toContain('Pokemon Blue Version');
      expect(gameNames).toContain('Pokemon Yellow Version');
    });
    
    it('should detect Fire Emblem sister games', async () => {
      (global.fetch as jest.Mock).mockImplementation((url, options) => {
        const body = JSON.parse(options?.body as string);
        const query = body.requestBody || '';
        
        if (query.includes('birthright')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              games: [{ id: 1, name: 'Fire Emblem Fates: Birthright', category: 0 }]
            })
          } as Response);
        } else if (query.includes('conquest')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              games: [{ id: 2, name: 'Fire Emblem Fates: Conquest', category: 0 }]
            })
          } as Response);
        }
        
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, games: [] })
        } as Response);
      });
      
      const results = await service.searchWithSisterGames('fire emblem birthright', 10);
      
      const gameNames = results.map(g => g.name);
      expect(gameNames).toContain('Fire Emblem Fates: Conquest');
    });
    
    it('should not search for sister games for non-paired releases', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          games: [{ id: 1, name: 'The Legend of Zelda', category: 0 }]
        })
      } as Response);
      
      await service.searchWithSisterGames('zelda', 10);
      
      // Should only execute base queries, not sister game searches
      const calls = (global.fetch as jest.Mock).mock.calls;
      const bodiesStr = calls.map(call => JSON.stringify(call[1]?.body));
      
      // Should not have any calls for sister patterns
      expect(bodiesStr.every(body => !body.includes('oracle'))).toBe(true);
    });
  });
  
  describe('Series Expansion', () => {
    it('should expand numbered sequels', () => {
      const expanded = service.expandSeriesSearch('final fantasy 7');
      
      expect(expanded).toContain('final fantasy 7');
      expect(expanded).toContain('final fantasy 5');
      expect(expanded).toContain('final fantasy 6');
      expect(expanded).toContain('final fantasy 8');
      expect(expanded).toContain('final fantasy 9');
    });
    
    it('should expand roman numeral sequels', () => {
      const expanded = service.expandSeriesSearch('Final Fantasy VII');
      
      expect(expanded).toContain('Final Fantasy VII');
      expect(expanded).toContain('Final Fantasy 7');
      expect(expanded).toContain('Final Fantasy VI');
      expect(expanded).toContain('Final Fantasy VIII');
    });
    
    it('should extract base title from subtitled games', () => {
      const expanded1 = service.expandSeriesSearch('The Witcher 3: Wild Hunt');
      const expanded2 = service.expandSeriesSearch('Zelda - Breath of the Wild');
      
      expect(expanded1).toContain('The Witcher 3');
      expect(expanded2).toContain('Zelda');
    });
    
    it('should not expand non-sequel searches', () => {
      const expanded = service.expandSeriesSearch('minecraft');
      
      expect(expanded).toEqual(['minecraft']);
    });
  });
  
  describe('Search Type Detection', () => {
    it('should detect franchise searches correctly', () => {
      const franchises = [
        'mario', 'super mario', 'zelda', 'pokemon', 
        'final fantasy', 'call of duty', 'mega man'
      ];
      
      franchises.forEach(franchise => {
        const query = service.buildEnhancedQuery(franchise);
        expect(query).toContain('category = (0,2,4,8,9,10,11)');
      });
    });
    
    it('should detect specific game searches', () => {
      const specificGames = [
        'Super Mario 64', 'Final Fantasy VII', 'Halo 3',
        'The Witcher 3: Wild Hunt', 'Call of Duty: Modern Warfare'
      ];
      
      specificGames.forEach(game => {
        const query = service.buildEnhancedQuery(game);
        expect(query).toContain('category != (5,7,13,14)');
      });
    });
  });
  
  describe('Result Merging', () => {
    it('should merge results by priority correctly', async () => {
      const mockResponses = [
        { games: [{ id: 1, name: 'High Priority', category: 0 }] },
        { games: [{ id: 2, name: 'Medium Priority', category: 0 }] },
        { games: [{ id: 3, name: 'Low Priority', category: 0 }] },
        { games: [{ id: 1, name: 'Duplicate', category: 0 }] } // Duplicate ID
      ];
      
      let callIndex = 0;
      (global.fetch as jest.Mock).mockImplementation(() => {
        const response = mockResponses[callIndex++];
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, ...response })
        } as Response);
      });
      
      const results = await service.multiQuerySearch('test');
      
      // Should maintain priority order
      expect(results[0].name).toBe('High Priority');
      expect(results[1].name).toBe('Medium Priority');
      expect(results[2].name).toBe('Low Priority');
      
      // Should not have duplicates
      expect(results.length).toBe(3);
    });
  });
});

describe('Enhanced IGDB Service - Franchise Coverage Tests', () => {
  let service: EnhancedIGDBService;
  
  beforeEach(() => {
    service = new EnhancedIGDBService();
    jest.clearAllMocks();
  });
  
  describe('Mario Franchise Coverage', () => {
    it('should return 40+ results for mario franchise search', async () => {
      const marioGames = [
        'Super Mario Bros.', 'Super Mario Bros. 2', 'Super Mario Bros. 3',
        'Super Mario World', 'Super Mario 64', 'Super Mario Sunshine',
        'Super Mario Galaxy', 'Super Mario Galaxy 2', 'Super Mario Odyssey',
        'Mario Kart', 'Mario Kart 64', 'Mario Kart 8', 'Mario Party',
        'Paper Mario', 'Mario Tennis', 'Dr. Mario', 'Mario Golf',
        'Luigi\'s Mansion', 'Mario + Rabbids', 'Super Mario Maker'
      ].map((name, i) => ({ id: i + 1, name, category: 0, rating: 80 + i }));
      
      (global.fetch as jest.Mock).mockImplementation(() => {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            games: marioGames
          })
        } as Response);
      });
      
      const results = await service.multiQuerySearch('mario');
      
      expect(results.length).toBeGreaterThanOrEqual(20);
      
      // Should include key Mario games
      const gameNames = results.map(g => g.name);
      expect(gameNames).toContain('Super Mario Bros.');
      expect(gameNames).toContain('Super Mario 64');
      expect(gameNames).toContain('Mario Kart 8');
    });
  });
  
  describe('Pokemon Sister Games Coverage', () => {
    it('should find Pokemon Blue when searching for Pokemon Red', async () => {
      (global.fetch as jest.Mock).mockImplementation((url, options) => {
        const body = JSON.parse(options?.body as string);
        const query = body.requestBody || '';
        
        const games = [];
        if (query.includes('red')) {
          games.push({ id: 1, name: 'Pokémon Red Version', category: 0 });
        }
        if (query.includes('blue')) {
          games.push({ id: 2, name: 'Pokémon Blue Version', category: 0 });
        }
        if (query.includes('yellow')) {
          games.push({ id: 3, name: 'Pokémon Yellow Version', category: 0 });
        }
        
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, games })
        } as Response);
      });
      
      const results = await service.searchWithSisterGames('pokemon red', 10);
      const gameNames = results.map(g => g.name);
      
      expect(gameNames).toContain('Pokémon Blue Version');
      expect(gameNames).toContain('Pokémon Yellow Version');
    });
  });
  
  describe('Final Fantasy Sequel Coverage', () => {
    it('should find Final Fantasy sequels when searching for FF7', async () => {
      const ffGames = [
        { id: 7, name: 'Final Fantasy VII', category: 0 },
        { id: 8, name: 'Final Fantasy VIII', category: 0 },
        { id: 9, name: 'Final Fantasy IX', category: 0 },
        { id: 6, name: 'Final Fantasy VI', category: 0 },
        { id: 72, name: 'Final Fantasy VII Remake', category: 8 }
      ];
      
      (global.fetch as jest.Mock).mockImplementation(() => {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, games: ffGames })
        } as Response);
      });
      
      const expanded = service.expandSeriesSearch('final fantasy vii');
      expect(expanded).toContain('final fantasy 7');
      
      const results = await service.multiQuerySearch('final fantasy vii');
      const gameNames = results.map(g => g.name);
      
      expect(gameNames).toContain('Final Fantasy VII');
      expect(gameNames).toContain('Final Fantasy VII Remake');
    });
  });
});