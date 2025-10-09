/**
 * Platform Quality Assessment - Unit Tests
 */

import { describe, it, expect } from '@jest/globals';
import {
  calculatePlatformQuality,
  getPlatformQualityLabel,
  shouldDeprioritizeGame,
  getPlatformQualityPenalty,
  getPlatformsWithQuality,
  RELEASE_STATUS,
  type IGDBGameWithReleases
} from '../utils/platformQuality';

describe('Platform Quality Assessment', () => {
  /**
   * Test Case 1: Goldeneye (Released N64 + Rumored SNES)
   */
  it('should deprioritize Goldeneye due to rumored SNES platform', () => {
    const goldeneye: IGDBGameWithReleases = {
      id: 113,
      name: 'GoldenEye 007',
      platforms: [
        { id: 4, name: 'Nintendo 64' },
        { id: 6, name: 'Super Nintendo (SNES)' }
      ],
      release_dates: [
        { platform: 4, status: RELEASE_STATUS.RELEASED }, // N64: Released
        { platform: 6, status: RELEASE_STATUS.RUMORED }   // SNES: Rumored
      ]
    };

    const quality = calculatePlatformQuality(goldeneye);

    console.log('\n=== Goldeneye Quality Analysis ===');
    console.log('Quality Score:', quality.score);
    console.log('Quality Label:', getPlatformQualityLabel(quality.score));
    console.log('Debug Info:', quality.debugInfo);
    console.log('Should Deprioritize?', shouldDeprioritizeGame(goldeneye));
    console.log('Priority Penalty:', getPlatformQualityPenalty(goldeneye));

    expect(quality.hasReleased).toBe(true);
    expect(quality.hasRumored).toBe(true);
    expect(quality.score).toBeLessThan(100); // Penalized for rumored platform
    expect(quality.score).toBeGreaterThan(0); // But not completely zeroed (has releases)
    expect(quality.score).toBe(70); // Mixed quality: released + rumored
    expect(shouldDeprioritizeGame(goldeneye)).toBe(false); // Score 70 > 50 threshold
    expect(getPlatformQualityPenalty(goldeneye)).toBe(-60); // But still gets penalty for sorting
  });

  /**
   * Test Case 2: Super Mario 64 (Clean release, N64 only)
   */
  it('should NOT deprioritize clean releases like Super Mario 64', () => {
    const mario64: IGDBGameWithReleases = {
      name: 'Super Mario 64',
      platforms: [
        { id: 4, name: 'Nintendo 64' }
      ],
      release_dates: [
        { platform: 4, status: RELEASE_STATUS.RELEASED }
      ]
    };

    const quality = calculatePlatformQuality(mario64);

    console.log('\n=== Super Mario 64 Quality Analysis ===');
    console.log('Quality Score:', quality.score);
    console.log('Quality Label:', getPlatformQualityLabel(quality.score));
    console.log('Should Deprioritize?', shouldDeprioritizeGame(mario64));

    expect(quality.hasReleased).toBe(true);
    expect(quality.hasRumored).toBe(false);
    expect(quality.hasCancelled).toBe(false);
    expect(quality.score).toBe(100); // Perfect score
    expect(shouldDeprioritizeGame(mario64)).toBe(false);
  });

  /**
   * Test Case 3: Star Fox 2 (Cancelled SNES, Released Switch)
   */
  it('should handle games with cancelled platforms like Star Fox 2', () => {
    const starFox2: IGDBGameWithReleases = {
      name: 'Star Fox 2',
      platforms: [
        { id: 6, name: 'Super Nintendo (SNES)' },
        { id: 130, name: 'Nintendo Switch' }
      ],
      release_dates: [
        { platform: 6, status: RELEASE_STATUS.CANCELLED }, // SNES: Cancelled (1995)
        { platform: 130, status: RELEASE_STATUS.RELEASED } // Switch: Released (2017)
      ]
    };

    const quality = calculatePlatformQuality(starFox2);

    console.log('\n=== Star Fox 2 Quality Analysis ===');
    console.log('Quality Score:', quality.score);
    console.log('Has Released:', quality.hasReleased);
    console.log('Has Cancelled:', quality.hasCancelled);
    console.log('Should Deprioritize?', shouldDeprioritizeGame(starFox2));

    expect(quality.hasReleased).toBe(true);
    expect(quality.hasCancelled).toBe(true);
    expect(quality.score).toBeLessThan(100); // Penalized for cancelled
    expect(quality.score).toBeGreaterThan(25); // But has actual release
  });

  /**
   * Test Case 4: Star Citizen (Early Access/Alpha)
   */
  it('should handle Early Access games like Star Citizen', () => {
    const starCitizen: IGDBGameWithReleases = {
      name: 'Star Citizen',
      platforms: [
        { id: 6, name: 'PC (Microsoft Windows)' }
      ],
      release_dates: [
        { platform: 6, status: RELEASE_STATUS.ALPHA }
      ]
    };

    const quality = calculatePlatformQuality(starCitizen);

    console.log('\n=== Star Citizen Quality Analysis ===');
    console.log('Quality Score:', quality.score);
    console.log('Has Early Access:', quality.hasEarlyAccess);
    console.log('Quality Label:', getPlatformQualityLabel(quality.score));
    console.log('Should Deprioritize?', shouldDeprioritizeGame(starCitizen));

    expect(quality.hasEarlyAccess).toBe(true);
    expect(quality.hasReleased).toBe(false);
    expect(quality.score).toBeGreaterThanOrEqual(50); // In development, moderate score
    expect(shouldDeprioritizeGame(starCitizen)).toBe(false); // Don't deprioritize legitimate games
  });

  /**
   * Test Case 5: Vaporware (Only rumored, never released)
   */
  it('should heavily deprioritize vaporware with only rumored platforms', () => {
    const vaporware: IGDBGameWithReleases = {
      name: 'Fake Rumored Game',
      platforms: [
        { id: 6, name: 'SNES' },
        { id: 7, name: 'Genesis' }
      ],
      release_dates: [
        { platform: 6, status: RELEASE_STATUS.RUMORED },
        { platform: 7, status: RELEASE_STATUS.RUMORED }
      ]
    };

    const quality = calculatePlatformQuality(vaporware);

    console.log('\n=== Vaporware Quality Analysis ===');
    console.log('Quality Score:', quality.score);
    console.log('Quality Label:', getPlatformQualityLabel(quality.score));
    console.log('Should Deprioritize?', shouldDeprioritizeGame(vaporware));
    console.log('Priority Penalty:', getPlatformQualityPenalty(vaporware));

    expect(quality.hasReleased).toBe(false);
    expect(quality.hasRumored).toBe(true);
    expect(quality.score).toBeLessThan(25); // Very low score
    expect(shouldDeprioritizeGame(vaporware)).toBe(true);
    expect(getPlatformQualityPenalty(vaporware)).toBeLessThan(-150); // Heavy penalty
  });

  /**
   * Test Case 6: Game with no release_dates (fallback)
   */
  it('should handle games with no release_dates gracefully', () => {
    const noReleaseDates: IGDBGameWithReleases = {
      name: 'Old Game',
      platforms: [
        { id: 6, name: 'PC' }
      ],
      release_dates: [] // Empty or missing
    };

    const quality = calculatePlatformQuality(noReleaseDates);

    console.log('\n=== No Release Dates Quality Analysis ===');
    console.log('Quality Score:', quality.score);
    console.log('Debug Info:', quality.debugInfo);

    expect(quality.score).toBe(90); // Assume released, slight penalty for incomplete data
    expect(quality.hasReleased).toBe(true);
    expect(shouldDeprioritizeGame(noReleaseDates)).toBe(false);
  });

  /**
   * Test Case 7: Multiplatform AAA game (all released)
   */
  it('should give perfect score to multiplatform AAA releases', () => {
    const aaa: IGDBGameWithReleases = {
      name: 'Red Dead Redemption 2',
      platforms: [
        { id: 48, name: 'PlayStation 4' },
        { id: 49, name: 'Xbox One' },
        { id: 6, name: 'PC' }
      ],
      release_dates: [
        { platform: 48, status: RELEASE_STATUS.RELEASED },
        { platform: 49, status: RELEASE_STATUS.RELEASED },
        { platform: 6, status: RELEASE_STATUS.RELEASED }
      ]
    };

    const quality = calculatePlatformQuality(aaa);

    console.log('\n=== Multiplatform AAA Quality Analysis ===');
    console.log('Quality Score:', quality.score);
    console.log('Status Breakdown:', quality.statusBreakdown);

    expect(quality.score).toBe(100);
    expect(quality.hasReleased).toBe(true);
    expect(shouldDeprioritizeGame(aaa)).toBe(false);
  });

  /**
   * Test Case 8: Penalty calculation
   */
  it('should calculate penalties correctly for sorting', () => {
    const perfect: IGDBGameWithReleases = {
      platforms: [{ id: 1, name: 'PC' }],
      release_dates: [{ platform: 1, status: RELEASE_STATUS.RELEASED }]
    };

    const rumored: IGDBGameWithReleases = {
      platforms: [{ id: 1, name: 'PC' }],
      release_dates: [{ platform: 1, status: RELEASE_STATUS.RUMORED }]
    };

    const perfectPenalty = getPlatformQualityPenalty(perfect);
    const rumoredPenalty = getPlatformQualityPenalty(rumored);

    console.log('\n=== Penalty Comparison ===');
    console.log('Perfect Release Penalty:', perfectPenalty);
    console.log('Rumored Release Penalty:', rumoredPenalty);

    expect(perfectPenalty).toBe(0); // No penalty
    expect(rumoredPenalty).toBeLessThan(-100); // Significant penalty
  });

  /**
   * Test Case 9: Debug metadata
   */
  it('should provide debug metadata for troubleshooting', () => {
    const game: IGDBGameWithReleases = {
      name: 'Test Game',
      platforms: [
        { id: 1, name: 'PC' },
        { id: 2, name: 'PS5' }
      ],
      release_dates: [
        { platform: 1, status: RELEASE_STATUS.RELEASED },
        { platform: 2, status: RELEASE_STATUS.RUMORED }
      ]
    };

    const metadata = getPlatformsWithQuality(game);

    console.log('\n=== Debug Metadata ===');
    console.log('Platforms:', metadata.platforms);
    console.log('Quality Score:', metadata.qualityScore);
    console.log('Quality Label:', metadata.qualityLabel);
    console.log('Debug Info:', metadata.debugInfo);

    expect(metadata.platforms).toEqual(['PC', 'PS5']);
    expect(metadata.qualityScore).toBeGreaterThan(0);
    expect(metadata.qualityLabel).toBeTruthy();
    expect(metadata.debugInfo).toContain('platforms');
    expect(metadata.debugInfo).toContain('release_dates');
  });

  /**
   * Test Case 10: Edge cases
   */
  it('should handle edge cases gracefully', () => {
    const noPlatforms: IGDBGameWithReleases = {
      platforms: []
    };

    const noPlatformsQuality = calculatePlatformQuality(noPlatforms);
    expect(noPlatformsQuality.score).toBe(50); // Neutral

    const undefined: IGDBGameWithReleases = {};
    const undefinedQuality = calculatePlatformQuality(undefined);
    expect(undefinedQuality.score).toBe(50); // Neutral
  });

  /**
   * Test scoring thresholds
   */
  it('should use correct scoring thresholds', () => {
    const scores = [100, 90, 75, 50, 25, 10];
    const labels = scores.map(s => getPlatformQualityLabel(s));

    console.log('\n=== Quality Labels by Score ===');
    scores.forEach((score, i) => {
      console.log(`Score ${score}: "${labels[i]}"`);
    });

    expect(getPlatformQualityLabel(100)).toBe('Released');
    expect(getPlatformQualityLabel(90)).toBe('Released');
    expect(getPlatformQualityLabel(70)).toBe('Released (some issues)');
    expect(getPlatformQualityLabel(50)).toBe('In Development');
    expect(getPlatformQualityLabel(25)).toBe('Partially Cancelled');
    expect(getPlatformQualityLabel(10)).toBe('Rumored/Cancelled');
  });

  /**
   * Real-world sorting scenario
   */
  it('should correctly sort games by quality in search results', () => {
    const games: IGDBGameWithReleases[] = [
      {
        name: 'Rumored Game',
        platforms: [{ id: 1, name: 'PC' }],
        release_dates: [{ platform: 1, status: RELEASE_STATUS.RUMORED }]
      },
      {
        name: 'Released Game',
        platforms: [{ id: 1, name: 'PC' }],
        release_dates: [{ platform: 1, status: RELEASE_STATUS.RELEASED }]
      },
      {
        name: 'Early Access Game',
        platforms: [{ id: 1, name: 'PC' }],
        release_dates: [{ platform: 1, status: RELEASE_STATUS.EARLY_ACCESS }]
      },
      {
        name: 'Mixed Quality Game',
        platforms: [{ id: 1, name: 'PC' }, { id: 2, name: 'PS5' }],
        release_dates: [
          { platform: 1, status: RELEASE_STATUS.RELEASED },
          { platform: 2, status: RELEASE_STATUS.RUMORED }
        ]
      }
    ];

    // Sort by quality penalty (higher penalty = lower in results)
    const sorted = games
      .map(game => ({
        game,
        penalty: getPlatformQualityPenalty(game),
        quality: calculatePlatformQuality(game)
      }))
      .sort((a, b) => b.penalty - a.penalty); // Higher penalty (more negative) = lower rank

    console.log('\n=== Sorted Games by Quality ===');
    sorted.forEach((item, index) => {
      console.log(`${index + 1}. ${item.game.name}`);
      console.log(`   Quality: ${item.quality.score}, Penalty: ${item.penalty}`);
    });

    // Verify sorting order
    expect(sorted[0].game.name).toBe('Released Game'); // Best quality
    expect(sorted[sorted.length - 1].game.name).toBe('Rumored Game'); // Worst quality
  });
});
