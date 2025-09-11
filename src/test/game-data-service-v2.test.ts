import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { GameDataServiceV2 } from '../services/gameDataServiceV2';

describe('GameDataService V2 - Integration Tests', () => {
  let service: GameDataServiceV2;
  
  const mockDBGame = {
    id: 1,
    igdb_id: 123,
    name: 'Super Mario Bros.',
    slug: 'super-mario-bros',
    summary: 'Classic platformer',
    release_date: '1985-09-13',
    cover_url: 'https://example.com/cover.jpg',
    genres: ['Platform'],
    platforms: ['NES'],
    developer: 'Nintendo',
    publisher: 'Nintendo',
    igdb_rating: 95,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    averageUserRating: 4.8,
    totalUserRatings: 150,
    ratings: []
  };
  
  const mockIGDBGame = {
    id: 456,
    name: 'Super Mario Bros. 3',
    summary: 'Third Mario game',
    first_release_date: 662688000, // 1991
    rating: 92,
    cover: { id: 1, url: '//images.igdb.com/igdb/image/upload/t_thumb/cover.jpg' },
    genres: [{ id: 1, name: 'Platform' }],
    platforms: [{ id: 1, name: 'NES' }],
    involved_companies: [
      { company: { name: 'Nintendo' }, developer: true, publisher: true }
    ]
  };
  
  beforeEach(() => {
    service = new GameDataServiceV2();
    mockSupabase = supabase as jest.Mocked<typeof supabase>;
    mockIgdbService = igdbServiceV2 as jest.Mocked<typeof igdbServiceV2>;
    jest.clearAllMocks();
    
    // Mock console methods to reduce test noise
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });
  
  describe('Database Threshold Logic', () => {
    function mockSupabaseQuery(data: any[]) {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          or: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data,
                error: null
              })
            })
          })
        }),
        upsert: jest.fn().mockResolvedValue({ error: null })
      } as any);
    }
    
    it('should query IGDB when database has < 3 results', async () => {
      // Setup: Database returns 2 results
      mockSupabaseQuery([mockDBGame, { ...mockDBGame, id: 2, name: 'Mario Bros.' }]);
      mockIgdbService.searchGames.mockResolvedValue([mockIGDBGame]);
      
      const results = await service.searchGames('mario');
      
      expect(mockIgdbService.searchGames).toHaveBeenCalledWith('mario', 30); // Franchise search
      expect(results.length).toBe(3); // 2 from DB + 1 from IGDB
    });
    
    it('should NOT query IGDB when database has 5+ results for non-franchise', async () => {
      // Setup: Database returns 5 results for non-franchise search
      const fiveGames = Array.from({ length: 5 }, (_, i) => ({
        ...mockDBGame,
        id: i + 1,
        name: `Game ${i + 1}`
      }));
      
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          or: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: fiveGames,
                error: null
              })
            })
          })
        }),
        upsert: jest.fn().mockResolvedValue({ error: null })
      } as any);
      
      const results = await service.searchGames('some random game');
      
      expect(mockIgdbService.searchGames).not.toHaveBeenCalled();
      expect(results.length).toBe(5);
    });
    
    it('should query IGDB for franchise searches with < 10 database results', async () => {
      // Setup: Database returns 8 results for franchise search  
      const eightGames = Array.from({ length: 8 }, (_, i) => ({
        ...mockDBGame,
        id: i + 1,
        name: `Mario Game ${i + 1}`
      }));
      
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          or: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: eightGames,
                error: null
              })
            })
          })
        }),
        upsert: jest.fn().mockResolvedValue({ error: null })
      } as any);
      
      mockIgdbService.searchGames.mockResolvedValue([mockIGDBGame]);
      
      const results = await service.searchGames('mario'); // Franchise search
      
      // Should query IGDB because we have 8 results (< 10 threshold for franchise)
      expect(mockIgdbService.searchGames).toHaveBeenCalledWith('mario', 30);
      expect(results.length).toBeGreaterThan(8); // Should include IGDB results
    });
    
    it('should NOT query IGDB for franchise searches with >= 10 fresh results', async () => {
      // Setup: Database returns 12 fresh results for franchise search
      const freshDate = new Date();
      freshDate.setHours(freshDate.getHours() - 1); // 1 hour ago
      
      const twelveGames = Array.from({ length: 12 }, (_, i) => ({
        ...mockDBGame,
        id: i + 1,
        name: `Mario Game ${i + 1}`,
        updated_at: freshDate.toISOString()
      }));
      
      // Mock Math.random to return > 0.1 to avoid the random refresh
      const mockRandom = jest.spyOn(Math, 'random').mockReturnValue(0.5);
      
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          or: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: twelveGames,
                error: null
              })
            })
          })
        }),
        upsert: jest.fn().mockResolvedValue({ error: null })
      } as any);
      
      const results = await service.searchGames('mario'); // Franchise search
      
      // Should NOT query IGDB - good coverage with fresh data
      expect(mockIgdbService.searchGames).not.toHaveBeenCalled();
      expect(results.length).toBe(12);
      
      mockRandom.mockRestore();
    });
  });
  
  describe('Franchise Detection', () => {
    it('should detect major gaming franchises', async () => {
      const franchises = [
        'mario', 'super mario', 'zelda', 'pokemon', 'final fantasy', 
        'call of duty', 'assassin', 'grand theft auto', 'mega man',
        'sonic', 'halo', 'god of war'
      ];
      
      // Mock minimal database results to force IGDB supplementation
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          or: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                  data: [], // Empty database
                  error: null
              })
            })
          })
        }),
        upsert: jest.fn().mockResolvedValue({ error: null })
      } as any);
      
      mockIgdbService.searchGames.mockResolvedValue([mockIGDBGame]);
      
      for (const franchise of franchises) {
        await service.searchGames(franchise);
        
        // Should use franchise limit (30) not specific limit (15)
        expect(mockIgdbService.searchGames).toHaveBeenCalledWith(franchise, 30);
        mockIgdbService.searchGames.mockClear();
      }
    });
    
    it('should use specific search limits for non-franchise terms', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          or: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                  data: [], // Empty database
                  error: null
              })
            })
          })
        }),
        upsert: jest.fn().mockResolvedValue({ error: null })
      } as any);
      
      mockIgdbService.searchGames.mockResolvedValue([mockIGDBGame]);
      
      await service.searchGames('random game name');
      
      // Should use specific limit (15) not franchise limit (30)
      expect(mockIgdbService.searchGames).toHaveBeenCalledWith('random game name', 15);
    });
  });
  
  describe('Stale Data Detection', () => {
    it('should query IGDB when database results are stale', async () => {
      const staleDate = new Date();
      staleDate.setDate(staleDate.getDate() - 10); // 10 days ago
      
      const staleGame = {
        ...mockDBGame,
        updated_at: staleDate.toISOString()
      };
      
      // Return 12 franchise games (above threshold) but stale
      const twelveStaleGames = Array.from({ length: 12 }, (_, i) => ({
        ...staleGame,
        id: i + 1,
        name: `Mario Game ${i + 1}`
      }));
      
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          or: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                  data: twelveStaleGames,
                  error: null
              })
            })
          })
        }),
        upsert: jest.fn().mockResolvedValue({ error: null })
      } as any);
      
      mockIgdbService.searchGames.mockResolvedValue([mockIGDBGame]);
      
      const results = await service.searchGames('mario');
      
      // Should query IGDB despite having 12 results because they're stale
      expect(mockIgdbService.searchGames).toHaveBeenCalledWith('mario', 30);
      expect(results.length).toBeGreaterThan(12);
    });
    
    it('should NOT query IGDB when database results are fresh', async () => {
      const freshDate = new Date();
      freshDate.setHours(freshDate.getHours() - 2); // 2 hours ago
      
      const freshGame = {
        ...mockDBGame,
        updated_at: freshDate.toISOString()
      };
      
      // Return 12 fresh franchise games
      const twelveFreshGames = Array.from({ length: 12 }, (_, i) => ({
        ...freshGame,
        id: i + 1,
        name: `Mario Game ${i + 1}`
      }));
      
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          or: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                  data: twelveFreshGames,
                  error: null
              })
            })
          })
        }),
        upsert: jest.fn().mockResolvedValue({ error: null })
      } as any);
      
      const results = await service.searchGames('mario');
      
      // Should NOT query IGDB - fresh results with good coverage
      expect(mockIgdbService.searchGames).not.toHaveBeenCalled();
      expect(results.length).toBe(12);
    });
  });
  
  describe('Smart Merging', () => {
    it('should merge database and IGDB results without duplicates', async () => {
      const dbGame1 = { ...mockDBGame, id: 1, igdb_id: 123, name: 'Mario 1' };
      const dbGame2 = { ...mockDBGame, id: 2, igdb_id: 456, name: 'Mario 2' };
      
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          or: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                  data: [dbGame1, dbGame2],
                  error: null
              })
            })
          })
        }),
        upsert: jest.fn().mockResolvedValue({ error: null })
      } as any);
      
      const igdbGame1 = { ...mockIGDBGame, id: 123, name: 'Mario 1' }; // Duplicate
      const igdbGame2 = { ...mockIGDBGame, id: 789, name: 'Mario 3' }; // New
      
      mockIgdbService.searchGames.mockResolvedValue([igdbGame1, igdbGame2]);
      
      const results = await service.searchGames('mario');
      
      // Should have 3 games: 2 from DB + 1 new from IGDB (duplicate filtered)
      expect(results.length).toBe(3);
      expect(results.find(g => g.name === 'Mario 1')).toBeDefined(); // From DB
      expect(results.find(g => g.name === 'Mario 2')).toBeDefined(); // From DB  
      expect(results.find(g => g.name === 'Mario 3')).toBeDefined(); // From IGDB
    });
    
    it('should handle name-based duplicate detection', async () => {
      const dbGame = { ...mockDBGame, id: 1, igdb_id: null, name: 'Super Mario Bros' };
      
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          or: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                  data: [dbGame],
                  error: null
              })
            })
          })
        }),
        upsert: jest.fn().mockResolvedValue({ error: null })
      } as any);
      
      // IGDB game with very similar name
      const similarGame = { ...mockIGDBGame, id: 999, name: 'Super Mario Bros.' };
      
      mockIgdbService.searchGames.mockResolvedValue([similarGame]);
      
      const results = await service.searchGames('mario');
      
      // Should filter out the similar name duplicate
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Super Mario Bros'); // Original DB version
    });
  });
  
  describe('Background Database Updates', () => {
    it('should update database asynchronously without blocking response', async () => {
      const mockUpsert = jest.fn().mockResolvedValue({ error: null });
      
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          or: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                  data: [], // Empty database
                  error: null
              })
            })
          })
        }),
        upsert: mockUpsert
      } as any);
      
      mockIgdbService.searchGames.mockResolvedValue([mockIGDBGame]);
      
      const startTime = Date.now();
      const results = await service.searchGames('mario');
      const responseTime = Date.now() - startTime;
      
      // Response should be fast (not waiting for database update)
      expect(responseTime).toBeLessThan(1000);
      expect(results.length).toBeGreaterThan(0);
      
      // Wait for background update
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Database update should have been called
      expect(mockUpsert).toHaveBeenCalled();
    });
    
    it('should handle database update failures gracefully', async () => {
      // Mock failing upsert
      const mockUpsert = jest.fn().mockResolvedValue({ 
        error: { message: 'Database error' }
      });
      
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          or: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                  data: [],
                  error: null
              })
            })
          })
        }),
        upsert: mockUpsert
      } as any);
      
      mockIgdbService.searchGames.mockResolvedValue([mockIGDBGame]);
      
      // Should not throw error even if background update fails
      await expect(service.searchGames('mario')).resolves.not.toThrow();
    });
  });
  
  describe('Performance and Error Handling', () => {
    it('should handle IGDB service failures gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          or: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                  data: [mockDBGame], // Some database results
                  error: null
              })
            })
          })
        }),
        upsert: jest.fn().mockResolvedValue({ error: null })
      } as any);
      
      mockIgdbService.searchGames.mockRejectedValue(new Error('IGDB API failed'));
      
      const results = await service.searchGames('mario');
      
      // Should return database results despite IGDB failure
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Super Mario Bros.');
    });
    
    it('should handle database failures gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          or: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Database error' }
              })
            })
          })
        }),
        upsert: jest.fn().mockResolvedValue({ error: null })
      } as any);
      
      const results = await service.searchGames('mario');
      
      // Should return empty array instead of throwing
      expect(results).toEqual([]);
    });
  });
  
  describe('Test Functionality', () => {
    it('should provide test method with performance metrics', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          or: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                  data: [mockDBGame],
                  error: null
              })
            })
          })
        }),
        upsert: jest.fn().mockResolvedValue({ error: null })
      } as any);
      
      mockIgdbService.searchGames.mockResolvedValue([mockIGDBGame]);
      
      const testResult = await service.testEnhancedSearch('mario');
      
      expect(testResult).toEqual({
        dbResults: 1,
        igdbUsed: true,
        totalResults: 2,
        timeTaken: expect.any(Number)
      });
      
      expect(testResult.timeTaken).toBeGreaterThan(0);
    });
  });
});