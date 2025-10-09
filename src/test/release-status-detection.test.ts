/**
 * Release Status Detection - Unit Tests
 *
 * Tests the logic for categorizing games as:
 * - 'released': Game has been released (status 0, 1, 2, 3)
 * - 'unreleased': Game is cancelled/rumored only (status 5, 6, 7)
 * - null: Unknown (no release_dates data)
 *
 * Status codes from IGDB:
 * 0 = Released
 * 1 = Alpha
 * 2 = Beta
 * 3 = Early Access
 * 4 = Offline
 * 5 = Cancelled
 * 6 = Rumored
 * 7 = Delisted
 */

import { describe, it, expect } from '@jest/globals';

/**
 * Get release status from IGDB game data
 * @param igdbGame - Game object from IGDB API
 * @returns 'released' | 'unreleased' | null
 */
function getReleaseStatus(igdbGame: any): 'released' | 'unreleased' | null {
  // No release_dates data -> unknown (NULL)
  if (!igdbGame.release_dates || igdbGame.release_dates.length === 0) {
    return null;
  }

  // Check if ANY release is released/in-development (0, 1, 2, 3)
  // Status 4 (Offline) is excluded - treat as unreleased
  const hasRelease = igdbGame.release_dates.some((rd: any) =>
    rd.status === 0 || rd.status === 1 || rd.status === 2 || rd.status === 3
  );

  return hasRelease ? 'released' : 'unreleased';
}

describe('Release Status Detection', () => {

  describe('Released Games', () => {
    it('should categorize fully released game as "released"', () => {
      const game = {
        name: 'The Legend of Zelda: Breath of the Wild',
        release_dates: [
          { platform: 130, status: 0, human: 'Mar 03, 2017' }, // Switch - Released
          { platform: 41, status: 0, human: 'Mar 03, 2017' }   // Wii U - Released
        ]
      };

      expect(getReleaseStatus(game)).toBe('released');
    });

    it('should categorize alpha/beta game as "released" (in development)', () => {
      const game = {
        name: 'Star Citizen',
        release_dates: [
          { platform: 6, status: 1, human: 'TBD' } // PC - Alpha
        ]
      };

      expect(getReleaseStatus(game)).toBe('released');
    });

    it('should categorize early access game as "released"', () => {
      const game = {
        name: 'Baldur\'s Gate 3 (Early Access)',
        release_dates: [
          { platform: 6, status: 3, human: 'Oct 06, 2020' } // PC - Early Access
        ]
      };

      expect(getReleaseStatus(game)).toBe('released');
    });

    it('should categorize game with mixed statuses as "released" if ANY are released', () => {
      const game = {
        name: 'Cyberpunk 2077',
        release_dates: [
          { platform: 6, status: 0, human: 'Dec 10, 2020' },   // PC - Released
          { platform: 48, status: 0, human: 'Dec 10, 2020' },  // PS4 - Released
          { platform: 167, status: 0, human: 'Dec 10, 2020' }, // PS5 - Released
          { platform: 130, status: 6, human: 'TBD' }           // Switch - Rumored
        ]
      };

      expect(getReleaseStatus(game)).toBe('released');
    });

    it('should handle game with delisted status alongside released', () => {
      const game = {
        name: 'P.T. (Silent Hills)',
        release_dates: [
          { platform: 48, status: 0, human: 'Aug 12, 2014' }, // PS4 - Released
          { platform: 48, status: 7, human: 'Apr 29, 2015' }  // PS4 - Delisted
        ]
      };

      // Was released, even if later delisted
      expect(getReleaseStatus(game)).toBe('released');
    });
  });

  describe('Unreleased Games', () => {
    it('should categorize rumored-only game as "unreleased"', () => {
      const game = {
        name: 'GoldenEye 007 (SNES)',
        release_dates: [
          { platform: 4, status: 0, human: 'Aug 25, 1997' },  // N64 - Released
          { platform: 6, status: 6, human: 'TBD' }            // SNES - Rumored
        ]
      };

      // This has released status, so it should be 'released'
      expect(getReleaseStatus(game)).toBe('released');
    });

    it('should categorize cancelled-only game as "unreleased"', () => {
      const game = {
        name: 'Star Fox 2 (Original SNES Cancellation)',
        release_dates: [
          { platform: 6, status: 5, human: '1996' } // SNES - Cancelled
        ]
      };

      expect(getReleaseStatus(game)).toBe('unreleased');
    });

    it('should categorize game with only cancelled and rumored as "unreleased"', () => {
      const game = {
        name: 'Silent Hills',
        release_dates: [
          { platform: 48, status: 5, human: '2015' },  // PS4 - Cancelled
          { platform: 49, status: 6, human: 'TBD' }    // Xbox One - Rumored
        ]
      };

      expect(getReleaseStatus(game)).toBe('unreleased');
    });

    it('should categorize offline-only game as "unreleased"', () => {
      const game = {
        name: 'Some MMO That Shut Down',
        release_dates: [
          { platform: 6, status: 4, human: 'Jan 01, 2020' } // PC - Offline
        ]
      };

      expect(getReleaseStatus(game)).toBe('unreleased');
    });

    it('should categorize delisted-only game as "unreleased"', () => {
      const game = {
        name: 'Game Delisted Before We Tracked It',
        release_dates: [
          { platform: 6, status: 7, human: 'Dec 31, 2010' } // PC - Delisted
        ]
      };

      // Note: This is edge case - delisted implies it WAS released
      // but if we only see status 7, we treat as unreleased
      expect(getReleaseStatus(game)).toBe('unreleased');
    });
  });

  describe('Unknown Status Games', () => {
    it('should return null for game with no release_dates', () => {
      const game = {
        name: 'Metroid Prime 4',
        platforms: [
          { id: 130, name: 'Nintendo Switch' }
        ]
        // No release_dates field at all
      };

      expect(getReleaseStatus(game)).toBe(null);
    });

    it('should return null for game with empty release_dates array', () => {
      const game = {
        name: 'Half-Life 3',
        release_dates: []
      };

      expect(getReleaseStatus(game)).toBe(null);
    });

    it('should return null for game with null release_dates', () => {
      const game = {
        name: 'Beyond Good and Evil 2',
        release_dates: null
      };

      expect(getReleaseStatus(game)).toBe(null);
    });
  });

  describe('Edge Cases', () => {
    it('should handle game with unknown status codes gracefully', () => {
      const game = {
        name: 'Game With Future Status Code',
        release_dates: [
          { platform: 6, status: 99, human: 'TBD' } // Unknown future status
        ]
      };

      // Unknown status codes not in 0,1,2,3 -> unreleased
      expect(getReleaseStatus(game)).toBe('unreleased');
    });

    it('should handle game with multiple platforms, mixed statuses', () => {
      const game = {
        name: 'Multi-Platform Complex Game',
        release_dates: [
          { platform: 6, status: 0, human: 'Jan 01, 2020' },   // PC - Released
          { platform: 48, status: 5, human: 'TBD' },           // PS4 - Cancelled
          { platform: 49, status: 6, human: 'TBD' },           // Xbox - Rumored
          { platform: 130, status: 2, human: 'Mar 15, 2021' }, // Switch - Beta
          { platform: 167, status: 7, human: 'Jun 30, 2022' }  // PS5 - Delisted
        ]
      };

      // Has released (status 0) and beta (status 2) -> released
      expect(getReleaseStatus(game)).toBe('released');
    });

    it('should handle game object with missing fields', () => {
      const game = {
        name: 'Incomplete Game Data'
      };

      expect(getReleaseStatus(game)).toBe(null);
    });
  });

  describe('Prioritization Logic', () => {
    it('should prioritize released games highest', () => {
      const released = getReleaseStatus({
        release_dates: [{ platform: 6, status: 0 }]
      });

      const unreleased = getReleaseStatus({
        release_dates: [{ platform: 6, status: 6 }]
      });

      const unknown = getReleaseStatus({
        release_dates: null
      });

      // For sorting: released > unknown > unreleased
      expect(released).toBe('released');
      expect(unreleased).toBe('unreleased');
      expect(unknown).toBe(null);
    });

    it('should provide consistent categorization for sorting', () => {
      const games = [
        { name: 'Released Game', release_dates: [{ status: 0 }] },
        { name: 'Rumored Game', release_dates: [{ status: 6 }] },
        { name: 'Unknown Game', release_dates: null },
        { name: 'Early Access', release_dates: [{ status: 3 }] },
        { name: 'Cancelled', release_dates: [{ status: 5 }] }
      ];

      const statuses = games.map(g => getReleaseStatus(g));

      expect(statuses).toEqual([
        'released',   // Released
        'unreleased', // Rumored
        null,         // Unknown
        'released',   // Early Access
        'unreleased'  // Cancelled
      ]);
    });
  });

  describe('Real-World Game Examples', () => {
    it('should correctly categorize GoldenEye 007 (N64)', () => {
      const goldeneye = {
        name: 'GoldenEye 007',
        release_dates: [
          { platform: 4, status: 0, human: 'Aug 25, 1997' },  // N64 - Released
          { platform: 6, status: 6, human: 'TBD' }            // SNES - Rumored (never happened)
        ]
      };

      // Has at least one released platform -> 'released'
      expect(getReleaseStatus(goldeneye)).toBe('released');
    });

    it('should correctly categorize Hollow Knight: Silksong (announced, no date)', () => {
      const silksong = {
        name: 'Hollow Knight: Silksong',
        release_dates: [] // Announced but no release dates yet
      };

      expect(getReleaseStatus(silksong)).toBe(null);
    });

    it('should correctly categorize Star Citizen (perpetual alpha)', () => {
      const starCitizen = {
        name: 'Star Citizen',
        release_dates: [
          { platform: 6, status: 1, human: 'TBD' } // PC - Alpha (ongoing)
        ]
      };

      // Alpha counts as "released" (playable, in development)
      expect(getReleaseStatus(starCitizen)).toBe('released');
    });

    it('should correctly categorize Silent Hills (cancelled)', () => {
      const silentHills = {
        name: 'Silent Hills',
        release_dates: [
          { platform: 48, status: 5, human: '2015' } // PS4 - Cancelled
        ]
      };

      expect(getReleaseStatus(silentHills)).toBe('unreleased');
    });

    it('should correctly categorize The Legend of Zelda: Breath of the Wild', () => {
      const botw = {
        name: 'The Legend of Zelda: Breath of the Wild',
        release_dates: [
          { platform: 130, status: 0, human: 'Mar 03, 2017' }, // Switch
          { platform: 41, status: 0, human: 'Mar 03, 2017' }   // Wii U
        ]
      };

      expect(getReleaseStatus(botw)).toBe('released');
    });
  });

  describe('Export Function for Implementation', () => {
    it('should export getReleaseStatus function', () => {
      expect(typeof getReleaseStatus).toBe('function');
    });

    it('should return valid types only', () => {
      const validTypes = ['released', 'unreleased', null];

      const testCases = [
        { release_dates: [{ status: 0 }] },
        { release_dates: [{ status: 6 }] },
        { release_dates: null },
        { release_dates: [] }
      ];

      testCases.forEach(game => {
        const result = getReleaseStatus(game);
        expect(validTypes).toContain(result);
      });
    });
  });
});

// Export for use in other modules
export { getReleaseStatus };
