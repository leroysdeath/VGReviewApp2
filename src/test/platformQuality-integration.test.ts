/**
 * Platform Quality Integration Test
 * Verifies platform quality penalty is applied to game prioritization
 */

import { describe, it, expect } from '@jest/globals';
import { calculateGamePriority, sortGamesByPriority } from '../utils/gamePrioritization';
import { RELEASE_STATUS } from '../utils/platformQuality';

describe('Platform Quality Integration', () => {
  it('should penalize games with rumored platforms in prioritization', () => {
    const cleanGame = {
      id: 999991,
      name: 'Obscure Clean Release',
      platforms: [
        { id: 4, name: 'Nintendo 64' }
      ],
      release_dates: [
        { platform: 4, status: RELEASE_STATUS.RELEASED }
      ],
      category: 0,
      rating: 70,
      follows: 10
    };

    const rumoredGame = {
      id: 999992,
      name: 'Obscure Rumored Game',
      platforms: [
        { id: 4, name: 'Nintendo 64' }
      ],
      release_dates: [
        { platform: 4, status: RELEASE_STATUS.RUMORED }
      ],
      category: 0,
      rating: 70,
      follows: 10
    };

    const cleanPriority = calculateGamePriority(cleanGame);
    const rumoredPriority = calculateGamePriority(rumoredGame);

    console.log('\n=== Integration Test Results ===');
    console.log(`Clean Game Score: ${cleanPriority.score}`);
    console.log(`Clean Game Boosts: ${cleanPriority.boosts.join(', ') || 'None'}`);
    console.log(`Clean Game Penalties: ${cleanPriority.penalties.join(', ') || 'None'}`);
    console.log(`\nRumored Game Score: ${rumoredPriority.score}`);
    console.log(`Rumored Game Boosts: ${rumoredPriority.boosts.join(', ') || 'None'}`);
    console.log(`Rumored Game Penalties: ${rumoredPriority.penalties.join(', ')}`);

    // Rumored game should have platform quality penalty applied
    const cleanPlatformPenalty = cleanPriority.penalties.find(p => p.includes('Platform quality'));
    const rumoredPlatformPenalty = rumoredPriority.penalties.find(p => p.includes('Platform quality'));

    console.log(`\nClean Game Platform Penalty: ${cleanPlatformPenalty || 'None'}`);
    console.log(`Rumored Game Platform Penalty: ${rumoredPlatformPenalty}`);

    // The key test: rumored game should have platform quality penalty
    expect(rumoredPlatformPenalty).toBeDefined();

    // And the penalty should be negative (reducing score)
    const penaltyMatch = rumoredPlatformPenalty?.match(/\((-?\d+)\)/);
    if (penaltyMatch) {
      const penaltyValue = parseInt(penaltyMatch[1]);
      expect(penaltyValue).toBeLessThan(0);
    }

    // Rumored game should have platform quality penalty in penalties array
    const hasPlatformPenalty = rumoredPriority.penalties.some(p =>
      p.toLowerCase().includes('platform quality')
    );
    expect(hasPlatformPenalty).toBe(true);
  });

  it('should correctly sort games with different platform qualities', () => {
    const games = [
      {
        id: 1,
        name: 'Vaporware (Only Rumored)',
        platforms: [{ id: 1, name: 'PC' }],
        release_dates: [{ platform: 1, status: RELEASE_STATUS.RUMORED }],
        category: 0,
        rating: 80
      },
      {
        id: 2,
        name: 'Released Game',
        platforms: [{ id: 1, name: 'PC' }],
        release_dates: [{ platform: 1, status: RELEASE_STATUS.RELEASED }],
        category: 0,
        rating: 80
      },
      {
        id: 3,
        name: 'Mixed Quality',
        platforms: [{ id: 1, name: 'PC' }, { id: 2, name: 'PS5' }],
        release_dates: [
          { platform: 1, status: RELEASE_STATUS.RELEASED },
          { platform: 2, status: RELEASE_STATUS.RUMORED }
        ],
        category: 0,
        rating: 80
      }
    ];

    const sorted = sortGamesByPriority(games);

    console.log('\n=== Sorted Games ===');
    sorted.forEach((game, index) => {
      const priority = calculateGamePriority(game);
      console.log(`${index + 1}. ${game.name} (Score: ${priority.score})`);
    });

    // Released game should be first
    expect(sorted[0].name).toBe('Released Game');

    // Vaporware should be last
    expect(sorted[sorted.length - 1].name).toBe('Vaporware (Only Rumored)');
  });

  it('should not penalize games without release_dates (backward compatibility)', () => {
    const oldGameNoReleaseDates = {
      id: 1,
      name: 'Old Game (No Release Dates)',
      platforms: [{ id: 4, name: 'Nintendo 64' }],
      // No release_dates field
      category: 0,
      rating: 85
    };

    const priority = calculateGamePriority(oldGameNoReleaseDates);

    console.log('\n=== Backward Compatibility Test ===');
    console.log(`Game: ${oldGameNoReleaseDates.name}`);
    console.log(`Score: ${priority.score}`);
    console.log(`Penalties: ${priority.penalties.join(', ') || 'None'}`);

    // Should NOT have platform quality penalty (no release_dates to check)
    const hasPlatformPenalty = priority.penalties.some(p =>
      p.toLowerCase().includes('platform quality')
    );
    expect(hasPlatformPenalty).toBe(false);
  });

  it('should include debug info in penalty message', () => {
    const gameWithDebugInfo = {
      id: 1,
      name: 'Test Game',
      platforms: [
        { id: 1, name: 'PC' },
        { id: 2, name: 'PS5' }
      ],
      release_dates: [
        { platform: 1, status: RELEASE_STATUS.RELEASED },
        { platform: 2, status: RELEASE_STATUS.RUMORED }
      ],
      category: 0
    };

    const priority = calculateGamePriority(gameWithDebugInfo);

    const platformPenalty = priority.penalties.find(p =>
      p.toLowerCase().includes('platform quality')
    );

    console.log('\n=== Debug Info Test ===');
    console.log(`Penalty Message: ${platformPenalty}`);

    // Should include debug info about platforms and release_dates
    expect(platformPenalty).toContain('platforms');
    expect(platformPenalty).toContain('release_dates');
  });
});
