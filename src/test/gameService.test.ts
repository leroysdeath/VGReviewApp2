import { gameService } from '../services/gameService';
import { supabase } from '../services/supabase';

jest.mock('../services/supabase', () => ({
  supabase: {
    from: jest.fn()
  }
}));

jest.mock('../services/igdbService', () => ({
  igdbService: {
    getGameById: jest.fn(),
    transformGame: jest.fn()
  }
}));

jest.mock('../services/igdbServiceV2', () => ({
  igdbServiceV2: {
    searchGames: jest.fn()
  }
}));

describe('GameService - Consolidated Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    gameService.clearCache();
  });

  describe('CRUD Operations', () => {
    describe('getGameById', () => {
      it('should fetch game by database ID', async () => {
        const mockGame = {
          id: 1,
          name: 'Test Game',
          igdb_id: 100,
          ratings: [{ rating: 8 }, { rating: 9 }]
        };

        (supabase.from as jest.Mock).mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockGame, error: null })
            })
          })
        });

        const result = await gameService.getGameById(1);

        expect(result).toBeDefined();
        expect(result?.name).toBe('Test Game');
        expect(result?.averageUserRating).toBeCloseTo(8.5, 1);
        expect(result?.totalUserRatings).toBe(2);
      });

      it('should return null if game not found', async () => {
        (supabase.from as jest.Mock).mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } })
            })
          })
        });

        const result = await gameService.getGameById(999);
        expect(result).toBeNull();
      });

      it('should calculate ratings correctly', async () => {
        const mockGame = {
          id: 1,
          name: 'Test Game',
          ratings: [{ rating: 7 }, { rating: 8 }, { rating: 9 }, { rating: 10 }]
        };

        (supabase.from as jest.Mock).mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockGame, error: null })
            })
          })
        });

        const result = await gameService.getGameById(1);

        expect(result?.averageUserRating).toBeCloseTo(8.5, 1);
        expect(result?.totalUserRatings).toBe(4);
      });
    });

    describe('getGameByIGDBId', () => {
      it('should fetch game by IGDB ID', async () => {
        const mockGame = {
          id: 1,
          name: 'IGDB Game',
          igdb_id: 500,
          summary: 'Complete data',
          developer: 'Test Dev',
          publisher: 'Test Pub',
          cover_url: 'https://example.com/cover.jpg',
          ratings: []
        };

        (supabase.from as jest.Mock).mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockGame, error: null })
            })
          })
        });

        const result = await gameService.getGameByIGDBId(500);

        expect(result).toBeDefined();
        expect(result?.name).toBe('IGDB Game');
        expect(result?.igdb_id).toBe(500);
      });

      it('should fallback to game_id field if igdb_id not found', async () => {
        const mockGame = {
          id: 1,
          name: 'Fallback Game',
          game_id: '500',
          ratings: []
        };

        (supabase.from as jest.Mock)
          .mockReturnValueOnce({
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } })
              })
            })
          })
          .mockReturnValueOnce({
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockGame, error: null })
              })
            })
          });

        const result = await gameService.getGameByIGDBId(500);

        expect(result).toBeDefined();
        expect(result?.name).toBe('Fallback Game');
      });

      it('should detect and refresh incomplete data', async () => {
        const incompleteGame = {
          id: 1,
          name: 'Incomplete Game',
          igdb_id: 500,
          summary: null,
          developer: null,
          publisher: null,
          cover_url: null
        };

        (supabase.from as jest.Mock).mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: incompleteGame, error: null })
            })
          })
        });

        const { igdbService } = require('../services/igdbService');
        igdbService.getGameById.mockResolvedValue({
          id: 500,
          name: 'Complete Game',
          summary: 'Updated summary'
        });

        igdbService.transformGame.mockReturnValue({
          igdb_id: 500,
          name: 'Complete Game',
          summary: 'Updated summary',
          developer: 'New Dev',
          publisher: 'New Pub',
          cover_url: 'https://example.com/new.jpg'
        });

        const result = await gameService.getGameByIGDBId(500);

        expect(igdbService.getGameById).toHaveBeenCalledWith(500);
      });

      it('should fallback to database data when IGDB fetch fails', async () => {
        const incompleteGame = {
          id: 1,
          name: 'GoldenEye 007',
          igdb_id: 338824, // Invalid IGDB ID that causes 404
          summary: 'A game with incomplete data',
          developer: null,
          publisher: null,
          cover_url: null,
          ratings: [{ rating: 9 }]
        };

        (supabase.from as jest.Mock).mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: incompleteGame, error: null })
            })
          })
        });

        const { igdbService } = require('../services/igdbService');
        igdbService.getGameById.mockRejectedValue(new Error('IGDB API error: 404'));

        const result = await gameService.getGameByIGDBId(338824);

        expect(result).toBeDefined();
        expect(result?.name).toBe('GoldenEye 007');
        expect(result?.averageUserRating).toBe(9);
        expect(igdbService.getGameById).toHaveBeenCalledWith(338824);
      });

      it('should return null when no database data and IGDB fails', async () => {
        (supabase.from as jest.Mock)
          .mockReturnValueOnce({
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } })
              })
            })
          })
          .mockReturnValueOnce({
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } })
              })
            })
          });

        const { igdbService } = require('../services/igdbService');
        igdbService.getGameById.mockRejectedValue(new Error('IGDB API error: 404'));

        const result = await gameService.getGameByIGDBId(999999);
        expect(result).toBeNull();
      });
    });

    describe('getGameBySlug', () => {
      it('should fetch game by slug', async () => {
        const mockGame = {
          id: 1,
          name: 'Slugged Game',
          slug: 'slugged-game',
          ratings: [{ rating: 9 }]
        };

        (supabase.from as jest.Mock).mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockGame, error: null })
            })
          })
        });

        const result = await gameService.getGameBySlug('slugged-game');

        expect(result).toBeDefined();
        expect(result?.name).toBe('Slugged Game');
        expect(result?.slug).toBe('slugged-game');
      });

      it('should return null for non-existent slug', async () => {
        (supabase.from as jest.Mock).mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } })
            })
          })
        });

        const result = await gameService.getGameBySlug('non-existent-slug');
        expect(result).toBeNull();
      });
    });

    describe('getGameWithFullReviews', () => {
      it('should fetch game with reviews', async () => {
        const mockGame = {
          id: 1,
          name: 'Game with Reviews',
          igdb_id: 100,
          summary: 'Test',
          developer: 'Dev',
          publisher: 'Pub',
          cover_url: 'https://example.com/cover.jpg'
        };

        const mockReviews = [
          { id: 1, user_id: 1, game_id: 1, rating: 9, review: 'Great!', post_date_time: '2025-01-01', user: { id: 1, name: 'User 1' } },
          { id: 2, user_id: 2, game_id: 1, rating: 8, review: 'Good', post_date_time: '2025-01-02', user: { id: 2, name: 'User 2' } }
        ];

        (supabase.from as jest.Mock)
          .mockReturnValueOnce({
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockGame, error: null })
              })
            })
          })
          .mockReturnValueOnce({
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({ data: mockReviews, error: null })
              })
            })
          });

        const result = await gameService.getGameWithFullReviews(100);

        expect(result.game).toBeDefined();
        expect(result.game?.name).toBe('Game with Reviews');
        expect(result.reviews).toHaveLength(2);
        expect(result.reviews[0].rating).toBe(9);
      });

      it('should return empty reviews if game not found', async () => {
        (supabase.from as jest.Mock).mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } })
            })
          })
        });

        const { igdbService } = require('../services/igdbService');
        igdbService.getGameById.mockResolvedValue(null);

        const result = await gameService.getGameWithFullReviews(999);

        expect(result.game).toBeNull();
        expect(result.reviews).toEqual([]);
      });

      it('should fallback to database data when IGDB fails via getGameWithFullReviews', async () => {
        const incompleteGame = {
          id: 1,
          name: 'GoldenEye 007',
          igdb_id: 338824,
          summary: 'Classic N64 shooter',
          developer: null,
          publisher: null,
          cover_url: null
        };

        const mockReviews = [
          { id: 1, user_id: 1, game_id: 1, rating: 9, review: 'Classic!', post_date_time: '2025-01-01', user: { id: 1, name: 'User 1' } }
        ];

        (supabase.from as jest.Mock)
          .mockReturnValueOnce({
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: incompleteGame, error: null })
              })
            })
          })
          .mockReturnValueOnce({
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({ data: mockReviews, error: null })
              })
            })
          });

        const { igdbService } = require('../services/igdbService');
        igdbService.getGameById.mockRejectedValue(new Error('IGDB API error: 404'));

        const result = await gameService.getGameWithFullReviews(338824);

        expect(result.game).toBeDefined();
        expect(result.game?.name).toBe('GoldenEye 007');
        expect(result.reviews).toHaveLength(1);
        expect(result.reviews[0].review).toBe('Classic!');
      });
    });
  });

  describe('Search Operations', () => {
    describe('searchGames', () => {
      it('should search games with caching', async () => {
        const mockGames = [
          { id: 1, name: 'Mario Kart', ratings: [] },
          { id: 2, name: 'Super Mario', ratings: [] }
        ];

        (supabase.from as jest.Mock).mockReturnValue({
          select: jest.fn().mockReturnValue({
            ilike: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: mockGames, error: null })
            })
          })
        });

        const result1 = await gameService.searchGames('mario');
        const result2 = await gameService.searchGames('mario');

        expect(result1).toHaveLength(2);
        expect(result2).toHaveLength(2);
        expect(supabase.from).toHaveBeenCalledTimes(1);
      });

      it('should apply genre filters', async () => {
        const mockGames = [
          { id: 1, name: 'RPG Game', genres: ['RPG'], ratings: [] }
        ];

        const mockQuery = {
          select: jest.fn().mockReturnValue({
            ilike: jest.fn().mockReturnValue({
              contains: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({ data: mockGames, error: null })
              })
            })
          })
        };

        (supabase.from as jest.Mock).mockReturnValue(mockQuery);

        const result = await gameService.searchGames('game', { genres: ['RPG'] });

        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('RPG Game');
      });

      it('should apply release year filters', async () => {
        const mockGames = [
          { id: 1, name: '2020 Game', release_date: '2020-06-15', ratings: [] }
        ];

        const mockQuery = {
          select: jest.fn().mockReturnValue({
            ilike: jest.fn().mockReturnValue({
              gte: jest.fn().mockReturnValue({
                lte: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({ data: mockGames, error: null })
                })
              })
            })
          })
        };

        (supabase.from as jest.Mock).mockReturnValue(mockQuery);

        const result = await gameService.searchGames('game', { releaseYear: 2020 });

        expect(result).toHaveLength(1);
      });

      it('should filter by minimum rating', async () => {
        const mockGames = [
          { id: 1, name: 'High Rated', ratings: [{ rating: 9 }, { rating: 10 }] },
          { id: 2, name: 'Low Rated', ratings: [{ rating: 5 }] }
        ];

        (supabase.from as jest.Mock).mockReturnValue({
          select: jest.fn().mockReturnValue({
            ilike: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: mockGames, error: null })
            })
          })
        });

        const result = await gameService.searchGames('game', { minRating: 8 });

        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('High Rated');
      });

      it('should handle empty search results', async () => {
        (supabase.from as jest.Mock).mockReturnValue({
          select: jest.fn().mockReturnValue({
            ilike: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: [], error: null })
            })
          })
        });

        const result = await gameService.searchGames('nonexistent');
        expect(result).toEqual([]);
      });

      it('should sanitize search queries', async () => {
        (supabase.from as jest.Mock).mockReturnValue({
          select: jest.fn().mockReturnValue({
            ilike: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: [], error: null })
            })
          })
        });

        const result = await gameService.searchGames('');
        expect(result).toEqual([]);
      });
    });

    describe('getPopularGames', () => {
      it('should return games sorted by rating count', async () => {
        const mockGames = [
          { id: 1, name: 'Popular Game', ratings: [{ rating: 9 }, { rating: 10 }, { rating: 8 }] },
          { id: 2, name: 'Less Popular', ratings: [{ rating: 9 }] },
          { id: 3, name: 'Unpopular', ratings: [] }
        ];

        (supabase.from as jest.Mock).mockReturnValue({
          select: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({ data: mockGames, error: null })
          })
        });

        const result = await gameService.getPopularGames(10);

        expect(result).toHaveLength(2);
        expect(result[0].name).toBe('Popular Game');
        expect(result[1].name).toBe('Less Popular');
      });

      it('should exclude games with no ratings', async () => {
        const mockGames = [
          { id: 1, name: 'Rated Game', ratings: [{ rating: 9 }] },
          { id: 2, name: 'Unrated Game', ratings: [] }
        ];

        (supabase.from as jest.Mock).mockReturnValue({
          select: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({ data: mockGames, error: null })
          })
        });

        const result = await gameService.getPopularGames(10);

        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('Rated Game');
      });
    });
  });

  describe('Cache Management', () => {
    it('should cache search results', async () => {
      const mockGames = [{ id: 1, name: 'Cached Game', ratings: [] }];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          ilike: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({ data: mockGames, error: null })
          })
        })
      });

      await gameService.searchGames('test');
      await gameService.searchGames('test');

      expect(supabase.from).toHaveBeenCalledTimes(1);
    });

    it('should clear cache on demand', async () => {
      const mockGames = [{ id: 1, name: 'Test Game', ratings: [] }];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          ilike: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({ data: mockGames, error: null })
          })
        })
      });

      await gameService.searchGames('test');
      gameService.clearCache();
      await gameService.searchGames('test');

      expect(supabase.from).toHaveBeenCalledTimes(2);
    });

    it('should use different cache keys for different filters', async () => {
      const mockGames = [{ id: 1, name: 'Test Game', ratings: [] }];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          ilike: jest.fn().mockReturnValue({
            contains: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: mockGames, error: null })
            }),
            limit: jest.fn().mockResolvedValue({ data: mockGames, error: null })
          })
        })
      });

      await gameService.searchGames('test', { genres: ['RPG'] });
      await gameService.searchGames('test', { genres: ['Action'] });

      expect(supabase.from).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockRejectedValue(new Error('Database error'))
          })
        })
      });

      const result = await gameService.getGameById(1);
      expect(result).toBeNull();
    });

    it('should handle search errors gracefully', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          ilike: jest.fn().mockReturnValue({
            limit: jest.fn().mockRejectedValue(new Error('Search error'))
          })
        })
      });

      const result = await gameService.searchGames('test');
      expect(result).toEqual([]);
    });
  });
});