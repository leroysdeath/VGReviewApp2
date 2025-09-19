import { filterFanGamesAndEReaderContent } from '../utils/contentProtectionFilter';
import { gameFlagService } from '../services/gameFlagService';

describe('Flagging and Filter Integration Tests', () => {
  describe('Manual Flag Override Logic', () => {
    it('should respect greenlight flags and keep games that would normally be filtered', () => {
      const games = [
        {
          id: 1,
          name: 'Super Mario Bros. X', // This would normally be filtered as fan game
          developer: 'Redigit',
          publisher: 'Fan Game',
          category: 5, // Mod category
          greenlight_flag: true, // Admin override
          redlight_flag: false
        },
        {
          id: 2,
          name: 'Pokemon Uranium', // Fan game without override
          developer: 'JV',
          publisher: 'Fan Made',
          category: 0,
          greenlight_flag: false,
          redlight_flag: false
        },
        {
          id: 3,
          name: 'Super Mario Bros.', // Official game
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

    it('should respect redlight flags and filter games that would normally be kept', () => {
      const games = [
        {
          id: 1,
          name: 'Super Mario Bros.', // Official game but admin wants hidden
          developer: 'Nintendo',
          publisher: 'Nintendo',
          category: 0,
          greenlight_flag: false,
          redlight_flag: true // Admin override to hide
        },
        {
          id: 2,
          name: 'Super Mario World', // Normal official game
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

    it('should handle conflicting flags correctly (greenlight takes precedence)', () => {
      const games = [
        {
          id: 1,
          name: 'Test Game',
          developer: 'Test Dev',
          publisher: 'Test Pub',
          category: 0,
          greenlight_flag: true,
          redlight_flag: true // This shouldn't happen due to DB constraint, but test behavior
        }
      ];

      const filtered = filterFanGamesAndEReaderContent(games);
      // Greenlight should take precedence
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Test Game');
    });

    it('should handle games with missing flag properties gracefully', () => {
      const games = [
        {
          id: 1,
          name: 'Old Game Without Flags',
          developer: 'Nintendo',
          publisher: 'Nintendo',
          category: 0
          // Missing greenlight_flag and redlight_flag properties
        }
      ];

      // Should not crash
      expect(() => filterFanGamesAndEReaderContent(games)).not.toThrow();
      
      const filtered = filterFanGamesAndEReaderContent(games);
      expect(filtered).toHaveLength(1); // Should keep official game
    });
  });

  describe('E-reader Content with Manual Flags', () => {
    it('should allow greenlight to override e-reader filtering', () => {
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
        },
        {
          id: 2,
          name: 'Mario Party-e Cards',
          developer: 'Nintendo',
          publisher: 'Nintendo',
          category: 0,
          summary: 'e-Reader content',
          greenlight_flag: false,
          redlight_flag: false
        }
      ];

      const filtered = filterFanGamesAndEReaderContent(games);
      const filteredNames = filtered.map(g => g.name);

      // Should keep greenlight e-reader game
      expect(filteredNames).toContain('Mario Party-e');
      // Should filter normal e-reader game
      expect(filteredNames).not.toContain('Mario Party-e Cards');
    });
  });

  describe('Integration with New IGDB Metrics', () => {
    it('should preserve manual flags alongside new metrics', () => {
      const games = [
        {
          id: 1,
          name: 'High-Rated Fan Game',
          developer: 'Fan Developer',
          publisher: 'Fan Made',
          category: 5, // Mod
          total_rating: 95, // High rating
          follows: 100000,
          popularity_score: 80000,
          greenlight_flag: true, // Admin wants to keep despite being fan game
          redlight_flag: false
        },
        {
          id: 2,
          name: 'Low-Rated Official Game',
          developer: 'Nintendo',
          publisher: 'Nintendo',
          category: 0,
          total_rating: 30, // Low rating
          follows: 1000,
          popularity_score: 500,
          greenlight_flag: false,
          redlight_flag: true // Admin wants to hide despite being official
        }
      ];

      const filtered = filterFanGamesAndEReaderContent(games);
      const filteredNames = filtered.map(g => g.name);

      // Manual flags should override metrics and category
      expect(filteredNames).toContain('High-Rated Fan Game');
      expect(filteredNames).not.toContain('Low-Rated Official Game');
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle a mixed batch of games with various flag states', () => {
      const games = [
        // Official game, no flags
        {
          id: 1,
          name: 'Super Mario Bros.',
          developer: 'Nintendo',
          publisher: 'Nintendo',
          category: 0,
          greenlight_flag: false,
          redlight_flag: false
        },
        // Fan game, greenlight override
        {
          id: 2,
          name: 'Super Mario Bros. X',
          developer: 'Redigit',
          publisher: 'Fan Game',
          category: 5,
          greenlight_flag: true,
          redlight_flag: false
        },
        // E-reader content, no override
        {
          id: 3,
          name: 'Mario Party-e',
          developer: 'Nintendo',
          publisher: 'Nintendo',
          category: 0,
          summary: 'e-Reader card game',
          greenlight_flag: false,
          redlight_flag: false
        },
        // Official game, redlight override
        {
          id: 4,
          name: 'Mario Paint',
          developer: 'Nintendo',
          publisher: 'Nintendo',
          category: 0,
          greenlight_flag: false,
          redlight_flag: true
        },
        // Normal fan game, no override
        {
          id: 5,
          name: 'Pokemon Uranium',
          developer: 'JV',
          publisher: 'Fan Made',
          category: 0,
          greenlight_flag: false,
          redlight_flag: false
        }
      ];

      const filtered = filterFanGamesAndEReaderContent(games);
      const filteredNames = filtered.map(g => g.name);

      // Expected results
      expect(filteredNames).toContain('Super Mario Bros.'); // Official, no flags
      expect(filteredNames).toContain('Super Mario Bros. X'); // Fan game but greenlight
      expect(filteredNames).not.toContain('Mario Party-e'); // E-reader content
      expect(filteredNames).not.toContain('Mario Paint'); // Official but redlight
      expect(filteredNames).not.toContain('Pokemon Uranium'); // Fan game, no override

      expect(filtered).toHaveLength(2);
    });
  });
});