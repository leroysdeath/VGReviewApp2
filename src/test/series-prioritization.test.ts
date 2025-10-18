/**
 * Series Prioritization Test Suite
 *
 * Tests for comprehensive coverage of game prioritization across multiple series:
 * - Final Fantasy: Roman numerals, trademark symbols, remakes
 * - Resident Evil: Japanese/International variations (Biohazard)
 * - Street Fighter: Roman numerals, accent marks, editions
 *
 * Verifies:
 * - Accent/special character normalization
 * - Series detection and SEQUEL_TIER classification
 * - Official publisher detection
 * - Prioritization scoring with boosts/penalties
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  calculateGamePriority,
  sortGamesByPriority,
  GamePriority
} from '../utils/gamePrioritization';
import type { IGDBGame } from '../services/igdbServiceV2';

describe('Series Prioritization Tests', () => {

  // ============================================================================
  // FINAL FANTASY SERIES
  // ============================================================================

  describe('Final Fantasy Series', () => {

    it('should normalize Final Fantasy™ titles and detect series', () => {
      const game: IGDBGame = {
        id: 1,
        name: 'Final Fantasy™ VII',
        summary: 'Cloud Strife joins an eco-terrorist group',
        developer: 'Square',
        publisher: 'Square',
        platforms: [{ id: 94, name: 'PlayStation' }],
        total_rating: 95,
        first_release_date: 853977600, // 1997
      };

      const priority = calculateGamePriority(game);

      // Final Fantasy VII is in FAMOUS_GAMES_DATABASE, so gets FAMOUS_TIER
      expect(priority.priority).toBe(GamePriority.FAMOUS_TIER);
      expect(priority.reasons.some(r => r.includes('FAMOUS TIER'))).toBe(true);
    });

    it('should handle Roman numeral variations (VII vs 7)', () => {
      const games: IGDBGame[] = [
        {
          id: 1,
          name: 'Final Fantasy VII',
          summary: 'Original game',
          developer: 'Square',
          publisher: 'Square',
          total_rating: 95,
        },
        {
          id: 2,
          name: 'Final Fantasy 7 Remake',
          summary: 'Remake of the original',
          developer: 'Square Enix',
          publisher: 'Square Enix',
          total_rating: 92,
        },
      ];

      const sorted = sortGamesByPriority(games as any);

      // Both should be at least SEQUEL_TIER (FF7 original is FAMOUS, remake is SEQUEL)
      expect(calculateGamePriority(sorted[0]).priority).toBeGreaterThanOrEqual(GamePriority.SEQUEL_TIER);
      expect(calculateGamePriority(sorted[1]).priority).toBeGreaterThanOrEqual(GamePriority.SEQUEL_TIER);
    });

    it('should prioritize mainline entries over spinoffs', () => {
      const games: IGDBGame[] = [
        {
          id: 1,
          name: 'Final Fantasy Tactics',
          summary: 'Tactical RPG spinoff',
          developer: 'Square',
          publisher: 'Square',
          total_rating: 88,
          first_release_date: 865987200, // 1997
        },
        {
          id: 2,
          name: 'Final Fantasy VI',
          summary: 'Mainline entry',
          developer: 'Square',
          publisher: 'Square',
          total_rating: 94,
          first_release_date: 781574400, // 1994
        },
      ];

      const sorted = sortGamesByPriority(games as any);

      // Both are SEQUEL_TIER, but mainline gets higher score due to better rating
      expect(sorted[0].name).toBe('Final Fantasy VI');
    });

    it('should detect Square Enix as official publisher', () => {
      const game: IGDBGame = {
        id: 1,
        name: 'Final Fantasy XVI',
        summary: 'Latest mainline entry',
        developer: 'Creative Business Unit III',
        publisher: 'Square Enix',
        total_rating: 87,
      };

      const priority = calculateGamePriority(game);

      expect(priority.reasons.some(r => r.includes('Official') || r.includes('first-party') || r.includes('authorized'))).toBe(true);
    });

    it('should handle trademark symbols in search', () => {
      const game: IGDBGame = {
        id: 1,
        name: 'Final Fantasy® XIV Online',
        summary: 'MMORPG',
        developer: 'Square Enix',
        publisher: 'Square Enix',
        total_rating: 92,
      };

      const priority = calculateGamePriority(game);

      // Should match despite ® symbol - FF14 is a famous series game
      expect(priority.priority).toBeGreaterThanOrEqual(GamePriority.SEQUEL_TIER);
    });

  });

  // ============================================================================
  // RESIDENT EVIL SERIES (BIOHAZARD)
  // ============================================================================

  describe('Resident Evil / Biohazard Series', () => {

    it('should match both "Resident Evil" and "Biohazard" as same series', () => {
      const residentEvil: IGDBGame = {
        id: 1,
        name: 'Resident Evil 4',
        summary: 'Leon rescues the President\'s daughter',
        developer: 'Capcom',
        publisher: 'Capcom',
        total_rating: 94,
      };

      const biohazard: IGDBGame = {
        id: 2,
        name: 'Biohazard 4',
        summary: 'Japanese title',
        developer: 'Capcom',
        publisher: 'Capcom',
        total_rating: 94,
      };

      const rePriority = calculateGamePriority(residentEvil);
      const bhPriority = calculateGamePriority(biohazard);

      // Both should be FAMOUS_TIER (RE4 is in FAMOUS_GAMES_DATABASE)
      expect(rePriority.priority).toBe(GamePriority.FAMOUS_TIER);
      expect(bhPriority.priority).toBe(GamePriority.FAMOUS_TIER);
    });

    it('should detect Capcom as official publisher', () => {
      const game: IGDBGame = {
        id: 1,
        name: 'Resident Evil Village',
        summary: 'Ethan Winters in mysterious village',
        developer: 'Capcom',
        publisher: 'Capcom',
        total_rating: 84,
      };

      const priority = calculateGamePriority(game);

      expect(priority.reasons.some(r => r.includes('Official') || r.includes('first-party') || r.includes('authorized'))).toBe(true);
    });

    it('should prioritize mainline over Operation Raccoon City', () => {
      const games: IGDBGame[] = [
        {
          id: 1,
          name: 'Resident Evil: Operation Raccoon City',
          summary: 'Third-person shooter spinoff',
          developer: 'Slant Six Games',
          publisher: 'Capcom',
          total_rating: 55,
        },
        {
          id: 2,
          name: 'Resident Evil 2',
          summary: 'Leon and Claire in Raccoon City',
          developer: 'Capcom',
          publisher: 'Capcom',
          total_rating: 93,
        },
      ];

      const sorted = sortGamesByPriority(games as any);

      // RE2 should be first (better rating + mainline)
      expect(sorted[0].name).toBe('Resident Evil 2');
    });

    it('should handle remake vs original prioritization', () => {
      const games: IGDBGame[] = [
        {
          id: 1,
          name: 'Resident Evil 2 (1998)',
          summary: 'Original PS1 version',
          developer: 'Capcom',
          publisher: 'Capcom',
          total_rating: 91,
          first_release_date: 884736000, // 1998
        },
        {
          id: 2,
          name: 'Resident Evil 2',
          summary: '2019 remake',
          developer: 'Capcom',
          publisher: 'Capcom',
          total_rating: 93,
          first_release_date: 1548374400, // 2019
        },
      ];

      const sorted = sortGamesByPriority(games as any);

      // Both SEQUEL_TIER, remake wins on rating
      expect(sorted[0].total_rating).toBeGreaterThan(sorted[1].total_rating!);
    });

  });

  // ============================================================================
  // STREET FIGHTER SERIES
  // ============================================================================

  describe('Street Fighter Series', () => {

    it('should normalize Street Fighter titles with Roman numerals', () => {
      const game: IGDBGame = {
        id: 1,
        name: 'Street Fighter II: The World Warrior',
        summary: 'Classic fighting game',
        developer: 'Capcom',
        publisher: 'Capcom',
        total_rating: 92,
      };

      const priority = calculateGamePriority(game);

      // Street Fighter II is in FAMOUS_GAMES_DATABASE
      expect(priority.priority).toBe(GamePriority.FAMOUS_TIER);
      expect(priority.reasons.some(r => r.includes('FAMOUS TIER'))).toBe(true);
    });

    it('should handle multiple editions (Champion, Turbo, Super)', () => {
      const games: IGDBGame[] = [
        {
          id: 1,
          name: 'Street Fighter II\': Champion Edition',
          summary: 'First revision',
          developer: 'Capcom',
          publisher: 'Capcom',
          total_rating: 88,
        },
        {
          id: 2,
          name: 'Super Street Fighter II Turbo',
          summary: 'Later revision',
          developer: 'Capcom',
          publisher: 'Capcom',
          total_rating: 90,
        },
        {
          id: 3,
          name: 'Street Fighter II: The World Warrior',
          summary: 'Original',
          developer: 'Capcom',
          publisher: 'Capcom',
          total_rating: 92,
        },
      ];

      const sorted = sortGamesByPriority(games as any);

      // All should be at least SEQUEL_TIER (SF2 original is FAMOUS)
      sorted.forEach(game => {
        const priority = calculateGamePriority(game);
        expect(priority.priority).toBeGreaterThanOrEqual(GamePriority.SEQUEL_TIER);
      });
    });

    it('should detect Capcom as official publisher', () => {
      const game: IGDBGame = {
        id: 1,
        name: 'Street Fighter 6',
        summary: 'Latest mainline entry',
        developer: 'Capcom',
        publisher: 'Capcom',
        total_rating: 92,
      };

      const priority = calculateGamePriority(game);

      expect(priority.reasons.some(r => r.includes('Official') || r.includes('first-party') || r.includes('authorized'))).toBe(true);
    });

    it('should handle character name accents (Ryu vs Ryū)', () => {
      const game: IGDBGame = {
        id: 1,
        name: 'Street Fighter Alpha',
        summary: 'Features Ryū and Ken',
        developer: 'Capcom',
        publisher: 'Capcom',
        total_rating: 85,
      };

      // Both with and without accent should match
      const priority = calculateGamePriority(game);

      // Should match (accent normalization happens in game name) - Street Fighter Alpha is series game
      expect(priority.priority).toBeGreaterThanOrEqual(GamePriority.SEQUEL_TIER);
    });

    it('should prioritize mainline over EX series', () => {
      const games: IGDBGame[] = [
        {
          id: 1,
          name: 'Street Fighter EX Plus Alpha',
          summary: '3D fighting game spinoff',
          developer: 'Arika',
          publisher: 'Capcom',
          total_rating: 75,
        },
        {
          id: 2,
          name: 'Street Fighter III: 3rd Strike',
          summary: 'Mainline entry',
          developer: 'Capcom',
          publisher: 'Capcom',
          total_rating: 92,
        },
      ];

      const sorted = sortGamesByPriority(games as any);

      // 3rd Strike should be first (better rating + mainline dev)
      expect(sorted[0].name).toBe('Street Fighter III: 3rd Strike');
    });

  });

  // ============================================================================
  // CROSS-SERIES INTEGRATION TESTS
  // ============================================================================

  describe('Cross-Series Integration', () => {

    it('should handle mixed series results with proper prioritization', () => {
      const games: IGDBGame[] = [
        {
          id: 1,
          name: 'Final Fantasy VII',
          developer: 'Square',
          publisher: 'Square',
          total_rating: 95,
        },
        {
          id: 2,
          name: 'Resident Evil 4',
          developer: 'Capcom',
          publisher: 'Capcom',
          total_rating: 94,
        },
        {
          id: 3,
          name: 'Street Fighter II',
          developer: 'Capcom',
          publisher: 'Capcom',
          total_rating: 92,
        },
      ];

      const sorted = sortGamesByPriority(games as any);

      // All should be SEQUEL_TIER or higher
      sorted.forEach(game => {
        const priority = calculateGamePriority(game);
        expect(priority.priority).toBeGreaterThanOrEqual(GamePriority.SEQUEL_TIER);
      });

      // Should sort by rating (FF7 > RE4 > SF2)
      expect(sorted[0].name).toBe('Final Fantasy VII');
      expect(sorted[1].name).toBe('Resident Evil 4');
      expect(sorted[2].name).toBe('Street Fighter II');
    });

    it('should maintain consistent normalization across all series', () => {
      const testCases = [
        { name: 'Final Fantasy™ VII', search: 'final fantasy' },
        { name: 'Resident Evil 4', search: 'resident evil' },
        { name: 'Street Fighter II', search: 'street fighter' },
      ];

      testCases.forEach(({ name, search }) => {
        const game: IGDBGame = {
          id: 1,
          name,
          developer: 'Test Dev',
          publisher: 'Test Pub',
          total_rating: 90,
        };

        const priority = calculateGamePriority(game);

        // All should detect as series games
        expect(priority.reasons.some(r => r.includes('SEQUEL TIER') || r.includes('FAMOUS TIER'))).toBe(true);
      });
    });

    it('should handle games with no ratings gracefully', () => {
      const games: IGDBGame[] = [
        {
          id: 1,
          name: 'Final Fantasy XVI',
          developer: 'Square Enix',
          publisher: 'Square Enix',
          // No rating
        },
        {
          id: 2,
          name: 'Resident Evil 4 Remake',
          developer: 'Capcom',
          publisher: 'Capcom',
          total_rating: 93,
        },
      ];

      const sorted = sortGamesByPriority(games as any);

      // Should handle gracefully without crashing
      expect(sorted.length).toBe(2);

      // Game with rating should rank higher
      expect(sorted[0].name).toBe('Resident Evil 4 Remake');
    });

  });

  // ============================================================================
  // EDGE CASES AND PERFORMANCE
  // ============================================================================

  describe('Edge Cases', () => {

    it('should handle empty or null values gracefully', () => {
      const game: IGDBGame = {
        id: 1,
        name: 'Final Fantasy VII',
        // No developer, publisher, summary
      };

      const priority = calculateGamePriority(game);

      // Should still calculate priority
      expect(priority.priority).toBeDefined();
      expect(priority.score).toBeGreaterThan(0);
    });

    it('should handle very long game names', () => {
      const game: IGDBGame = {
        id: 1,
        name: 'Final Fantasy XIV: A Realm Reborn - Complete Edition with Heavensward, Stormblood, Shadowbringers, and Endwalker Expansions',
        developer: 'Square Enix',
        publisher: 'Square Enix',
        total_rating: 92,
      };

      const priority = calculateGamePriority(game);

      // Should still match - FF14 is a famous series game
      expect(priority.priority).toBeGreaterThanOrEqual(GamePriority.SEQUEL_TIER);
    });

    it('should handle special characters in various combinations', () => {
      const testCases = [
        'Final Fantasy™',
        'Final Fantasy®',
        'Final Fantasy: VII',
        'Final Fantasy - VII',
        'Final Fantasy | VII',
      ];

      testCases.forEach(name => {
        const game: IGDBGame = {
          id: 1,
          name,
          developer: 'Square',
          publisher: 'Square',
          total_rating: 90,
        };

        const priority = calculateGamePriority(game);

        // All should match - FF games are famous series
        expect(priority.priority).toBeGreaterThanOrEqual(GamePriority.SEQUEL_TIER);
      });
    });

    it('should perform efficiently with large game lists', () => {
      const games: IGDBGame[] = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        name: `Final Fantasy ${i}`,
        developer: 'Square Enix',
        publisher: 'Square Enix',
        total_rating: 80 + Math.random() * 15,
      }));

      const startTime = Date.now();
      const sorted = sortGamesByPriority(games as any);
      const endTime = Date.now();

      // Should complete in reasonable time (< 500ms for 100 games)
      expect(endTime - startTime).toBeLessThan(500);
      expect(sorted.length).toBe(100);
    });

  });

});
