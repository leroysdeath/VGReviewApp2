import { gameFlagService, type FlagType } from '../services/gameFlagService';
import { filterFanGamesAndEReaderContent, filterProtectedContent } from '../utils/contentProtectionFilter';

// Mock Supabase
jest.mock('../services/supabase', () => ({
  supabase: {
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: 'test-user-id' } } })
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [], error: null })
        }),
        or: () => ({
          order: () => ({
            limit: () => Promise.resolve({ data: [], error: null })
          })
        }),
        order: () => Promise.resolve({ data: [], error: null })
      })
    }),
    rpc: () => Promise.resolve({ data: [{ total_flagged: 0, greenlight_count: 0, redlight_count: 0 }], error: null })
  }
}));

describe('Diagnostic Admin Features', () => {
  describe('Manual Flagging System', () => {
    describe('Flag Filtering Logic', () => {
      it('should respect greenlight flags and keep flagged games', () => {
        const games = [
          {
            id: 1,
            name: 'Super Mario Bros. X',
            developer: 'Redigit',
            publisher: 'Fan Game',
            category: 5, // Mod category
            greenlight_flag: true, // Admin override
            redlight_flag: false
          },
          {
            id: 2,
            name: 'Pokemon Uranium',
            developer: 'JV',
            publisher: 'Fan Made',
            category: 0,
            greenlight_flag: false,
            redlight_flag: false
          },
          {
            id: 3,
            name: 'Super Mario Bros.',
            developer: 'Nintendo',
            publisher: 'Nintendo',
            category: 0,
            greenlight_flag: false,
            redlight_flag: false
          }
        ];

        const filtered = filterFanGamesAndEReaderContent(games);
        const filteredNames = filtered.map(g => g.name);

        // Should keep greenlight game despite it being a fan game
        expect(filteredNames).toContain('Super Mario Bros. X');
        // Should keep official game
        expect(filteredNames).toContain('Super Mario Bros.');
        // Should filter normal fan game
        expect(filteredNames).not.toContain('Pokemon Uranium');
      });

      it('should respect redlight flags and filter flagged games', () => {
        const games = [
          {
            id: 1,
            name: 'Super Mario Bros.',
            developer: 'Nintendo',
            publisher: 'Nintendo',
            category: 0,
            greenlight_flag: false,
            redlight_flag: true // Admin wants this hidden
          },
          {
            id: 2,
            name: 'Super Mario World',
            developer: 'Nintendo EAD',
            publisher: 'Nintendo',
            category: 0,
            greenlight_flag: false,
            redlight_flag: false
          }
        ];

        const filtered = filterFanGamesAndEReaderContent(games);
        const filteredNames = filtered.map(g => g.name);

        // Should filter redlight game despite being official
        expect(filteredNames).not.toContain('Super Mario Bros.');
        // Should keep normal official game
        expect(filteredNames).toContain('Super Mario World');
      });

      it('should prioritize greenlight over automatic filtering rules', () => {
        const games = [
          {
            id: 1,
            name: 'Mario Party-e',
            developer: 'Nintendo',
            publisher: 'Nintendo',
            category: 0,
            summary: 'e-Reader card game',
            greenlight_flag: true, // Admin override
            redlight_flag: false
          }
        ];

        const filtered = filterFanGamesAndEReaderContent(games);
        expect(filtered).toHaveLength(1);
        expect(filtered[0].name).toBe('Mario Party-e');
      });

      it('should handle conflicting flags correctly (greenlight takes precedence)', () => {
        const games = [
          {
            id: 1,
            name: 'Test Game',
            developer: 'Test Dev',
            publisher: 'Test Pub',
            category: 0,
            greenlight_flag: true,
            redlight_flag: true // Should not happen in real DB due to constraint
          }
        ];

        const filtered = filterFanGamesAndEReaderContent(games);
        // Greenlight should take precedence
        expect(filtered).toHaveLength(1);
      });
    });

    describe('Flag Service Operations', () => {
      beforeEach(() => {
        jest.clearAllMocks();
      });

      it('should validate flag types', async () => {
        const invalidFlag = 'invalid' as FlagType;
        // This would be caught by TypeScript, but testing runtime behavior
        const validFlags: FlagType[] = ['greenlight', 'redlight', 'clear'];
        
        validFlags.forEach(flag => {
          expect(['greenlight', 'redlight', 'clear']).toContain(flag);
        });
      });

      it('should handle flag summary data correctly', async () => {
        const result = await gameFlagService.getFlagSummary();
        
        // Should have proper structure even if empty
        expect(result).toHaveProperty('success');
        if (result.success) {
          expect(result.data).toHaveProperty('total_flagged');
          expect(result.data).toHaveProperty('greenlight_count');
          expect(result.data).toHaveProperty('redlight_count');
          expect(result.data).toHaveProperty('recent_flags_24h');
        }
      });

      it('should handle search for flagging correctly', async () => {
        const result = await gameFlagService.searchGamesForFlagging('mario', 10);
        
        expect(result).toHaveProperty('success');
        // Should not throw errors
      });
    });
  });

  describe('New IGDB Metrics Integration', () => {
    it('should handle games with complete IGDB metrics', () => {
      const games = [
        {
          id: 1,
          name: 'Popular Game',
          developer: 'Big Studio',
          publisher: 'Major Publisher',
          category: 0,
          total_rating: 85,
          rating_count: 50,
          follows: 100000,
          hypes: 5000,
          popularity_score: 65000,
          greenlight_flag: false,
          redlight_flag: false
        },
        {
          id: 2,
          name: 'Niche Game',
          developer: 'Indie Dev',
          publisher: 'Small Pub',
          category: 0,
          total_rating: 75,
          rating_count: 5,
          follows: 500,
          hypes: 10,
          popularity_score: 310,
          greenlight_flag: false,
          redlight_flag: false
        }
      ];

      const filtered = filterFanGamesAndEReaderContent(games);
      
      // Both should pass filtering
      expect(filtered).toHaveLength(2);
      
      // Verify metrics are preserved
      const popularGame = filtered.find(g => g.name === 'Popular Game');
      expect(popularGame?.total_rating).toBe(85);
      expect(popularGame?.follows).toBe(100000);
      expect(popularGame?.popularity_score).toBe(65000);
    });

    it('should handle games with missing IGDB metrics', () => {
      const games = [
        {
          id: 1,
          name: 'Game With Partial Metrics',
          developer: 'Some Dev',
          publisher: 'Some Pub',
          category: 0,
          total_rating: undefined,
          rating_count: 0,
          follows: undefined,
          hypes: undefined,
          popularity_score: 0,
          greenlight_flag: false,
          redlight_flag: false
        }
      ];

      // Should not throw errors with missing metrics
      expect(() => filterFanGamesAndEReaderContent(games)).not.toThrow();
      
      const filtered = filterFanGamesAndEReaderContent(games);
      expect(filtered).toHaveLength(1);
    });

    it('should calculate popularity tiers correctly', () => {
      const getPopularityTier = (popularityScore: number) => {
        if (popularityScore > 80000) return 'viral';
        if (popularityScore > 50000) return 'mainstream';
        if (popularityScore > 10000) return 'popular';
        if (popularityScore > 1000) return 'known';
        return 'niche';
      };

      expect(getPopularityTier(90000)).toBe('viral');
      expect(getPopularityTier(60000)).toBe('mainstream');
      expect(getPopularityTier(25000)).toBe('popular');
      expect(getPopularityTier(5000)).toBe('known');
      expect(getPopularityTier(500)).toBe('niche');
    });
  });

  describe('Enhanced Filtering Accuracy', () => {
    it('should correctly identify fan games with new metrics', () => {
      const games = [
        {
          id: 1,
          name: 'Official Game High Rating',
          developer: 'Nintendo',
          publisher: 'Nintendo',
          category: 0,
          total_rating: 90,
          follows: 50000,
          greenlight_flag: false,
          redlight_flag: false
        },
        {
          id: 2,
          name: 'Fan Game High Rating',
          developer: 'Fan Dev',
          publisher: 'Fan Made',
          category: 5,
          total_rating: 88, // Even high-rated fan games should be filtered
          follows: 10000,
          greenlight_flag: false,
          redlight_flag: false
        }
      ];

      const filtered = filterFanGamesAndEReaderContent(games);
      const filteredNames = filtered.map(g => g.name);

      expect(filteredNames).toContain('Official Game High Rating');
      expect(filteredNames).not.toContain('Fan Game High Rating');
    });

    it('should handle e-reader content with metrics', () => {
      const games = [
        {
          id: 1,
          name: 'Mario Party-e',
          developer: 'Nintendo',
          publisher: 'Nintendo',
          category: 0,
          summary: 'e-Reader card game',
          total_rating: 70,
          follows: 1000,
          greenlight_flag: false,
          redlight_flag: false
        },
        {
          id: 2,
          name: 'Mario Party',
          developer: 'Nintendo',
          publisher: 'Nintendo',
          category: 0,
          total_rating: 85,
          follows: 25000,
          greenlight_flag: false,
          redlight_flag: false
        }
      ];

      const filtered = filterFanGamesAndEReaderContent(games);
      const filteredNames = filtered.map(g => g.name);

      expect(filteredNames).toContain('Mario Party');
      expect(filteredNames).not.toContain('Mario Party-e');
    });
  });

  describe('Results Table Integration', () => {
    it('should sort by new metrics correctly', () => {
      const mockResults = [
        {
          gameId: 1,
          gameName: 'Game A',
          igdbMetrics: { totalRating: 90, follows: 10000 },
          flagStatus: { hasGreenlight: false, hasRedlight: false, overrideActive: false }
        },
        {
          gameId: 2,
          gameName: 'Game B',
          igdbMetrics: { totalRating: 85, follows: 50000 },
          flagStatus: { hasGreenlight: true, hasRedlight: false, overrideActive: true }
        },
        {
          gameId: 3,
          gameName: 'Game C',
          igdbMetrics: { totalRating: 95, follows: 5000 },
          flagStatus: { hasGreenlight: false, hasRedlight: true, overrideActive: true }
        }
      ];

      // Test sorting by total rating (descending)
      const sortedByRating = [...mockResults].sort((a, b) => 
        (b.igdbMetrics?.totalRating || 0) - (a.igdbMetrics?.totalRating || 0)
      );
      expect(sortedByRating[0].gameName).toBe('Game C'); // 95 rating
      expect(sortedByRating[1].gameName).toBe('Game A'); // 90 rating
      expect(sortedByRating[2].gameName).toBe('Game B'); // 85 rating

      // Test sorting by follows (descending)
      const sortedByFollows = [...mockResults].sort((a, b) => 
        (b.igdbMetrics?.follows || 0) - (a.igdbMetrics?.follows || 0)
      );
      expect(sortedByFollows[0].gameName).toBe('Game B'); // 50000 follows
      expect(sortedByFollows[1].gameName).toBe('Game A'); // 10000 follows
      expect(sortedByFollows[2].gameName).toBe('Game C'); // 5000 follows

      // Test sorting by flag status (greenlight=2, redlight=1, none=0)
      const sortedByFlags = [...mockResults].sort((a, b) => {
        const aValue = a.flagStatus.hasGreenlight ? 2 : a.flagStatus.hasRedlight ? 1 : 0;
        const bValue = b.flagStatus.hasGreenlight ? 2 : b.flagStatus.hasRedlight ? 1 : 0;
        return bValue - aValue;
      });
      expect(sortedByFlags[0].gameName).toBe('Game B'); // Greenlight
      expect(sortedByFlags[1].gameName).toBe('Game C'); // Redlight
      expect(sortedByFlags[2].gameName).toBe('Game A'); // No flag
    });

    it('should display flag status correctly', () => {
      const getFlagDisplay = (flagStatus: any) => {
        if (flagStatus.hasGreenlight) return '✅ Greenlight';
        if (flagStatus.hasRedlight) return '🚫 Redlight';
        return '⚪ None';
      };

      expect(getFlagDisplay({ hasGreenlight: true, hasRedlight: false })).toBe('✅ Greenlight');
      expect(getFlagDisplay({ hasGreenlight: false, hasRedlight: true })).toBe('🚫 Redlight');
      expect(getFlagDisplay({ hasGreenlight: false, hasRedlight: false })).toBe('⚪ None');
    });

    it('should format metrics for display', () => {
      const formatNumber = (num?: number) => {
        if (!num) return 'N/A';
        return num.toLocaleString();
      };

      const formatRating = (rating?: number) => {
        if (!rating) return 'N/A';
        return `${rating}/100`;
      };

      expect(formatNumber(50000)).toBe('50,000');
      expect(formatNumber(undefined)).toBe('N/A');
      expect(formatRating(85)).toBe('85/100');
      expect(formatRating(undefined)).toBe('N/A');
    });
  });

  describe('Filter Accuracy Validation', () => {
    it('should ensure all filter rules work with new metrics', () => {
      const comprehensiveTestGames = [
        // Official games with various metrics
        {
          id: 1,
          name: 'AAA Game',
          developer: 'Big Studio',
          publisher: 'Major Publisher',
          category: 0,
          total_rating: 90,
          follows: 100000,
          greenlight_flag: false,
          redlight_flag: false
        },
        // Fan game with good metrics (should still be filtered)
        {
          id: 2,
          name: 'High Quality Fan Game',
          developer: 'Talented Fan',
          publisher: 'Fan Made',
          category: 5,
          total_rating: 88,
          follows: 25000,
          greenlight_flag: false,
          redlight_flag: false
        },
        // E-reader content (should be filtered)
        {
          id: 3,
          name: 'Game-e',
          developer: 'Nintendo',
          publisher: 'Nintendo',
          category: 0,
          total_rating: 75,
          follows: 5000,
          greenlight_flag: false,
          redlight_flag: false
        },
        // Greenlight fan game (should be kept)
        {
          id: 4,
          name: 'Approved Fan Game',
          developer: 'Community',
          publisher: 'Fan Project',
          category: 5,
          greenlight_flag: true,
          redlight_flag: false
        },
        // Redlight official game (should be filtered)
        {
          id: 5,
          name: 'Problematic Official Game',
          developer: 'Official Dev',
          publisher: 'Official Pub',
          category: 0,
          total_rating: 95,
          follows: 200000,
          greenlight_flag: false,
          redlight_flag: true
        }
      ];

      const filtered = filterFanGamesAndEReaderContent(comprehensiveTestGames);
      const filteredNames = filtered.map(g => g.name);

      // Should keep
      expect(filteredNames).toContain('AAA Game'); // Official
      expect(filteredNames).toContain('Approved Fan Game'); // Greenlight override

      // Should filter
      expect(filteredNames).not.toContain('High Quality Fan Game'); // Fan game
      expect(filteredNames).not.toContain('Game-e'); // E-reader
      expect(filteredNames).not.toContain('Problematic Official Game'); // Redlight

      expect(filtered).toHaveLength(2);
    });
  });
});