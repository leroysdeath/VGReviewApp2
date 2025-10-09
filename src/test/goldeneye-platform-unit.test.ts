/**
 * Goldeneye Platform Issue - Unit Test (No Server Required)
 *
 * This test simulates the platform data transformation to identify
 * where incorrect platform data might be introduced
 */

import { describe, it, expect } from '@jest/globals';

describe('Platform Data Transformation Analysis', () => {
  /**
   * Test 1: Simulate IGDB data with rumored platforms
   */
  it('should identify how platforms array is transformed from IGDB', () => {
    // Simulating what IGDB might return for Goldeneye
    const mockIGDBGameWithRumoredPlatform = {
      id: 113,
      name: 'GoldenEye 007',
      platforms: [
        { id: 4, name: 'Nintendo 64' },      // Actual release
        { id: 6, name: 'Super Nintendo (SNES)' }  // Rumored/cancelled
      ],
      release_dates: [
        { platform: 4, status: 0, human: 'Aug 25, 1997' },  // Released
        { platform: 6, status: 6, human: 'TBD' }            // Rumored (status 6)
      ]
    };

    // This is how sync-igdb.js transforms the data (line 252)
    const platformsArray = mockIGDBGameWithRumoredPlatform.platforms?.map(p => p.name) || null;

    console.log('\n=== PLATFORM TRANSFORMATION TEST ===');
    console.log('Input platforms:', mockIGDBGameWithRumoredPlatform.platforms);
    console.log('Transformed platforms:', platformsArray);
    console.log('Release dates:', mockIGDBGameWithRumoredPlatform.release_dates);

    // The issue: we're taking ALL platforms, not filtering by release status
    expect(platformsArray).toContain('Nintendo 64');
    expect(platformsArray).toContain('Super Nintendo (SNES)'); // This shouldn't be here!

    console.log('\n❌ ISSUE FOUND: All platforms are included regardless of release status');
  });

  /**
   * Test 2: Demonstrate the fix - filter by released platforms only
   */
  it('should demonstrate filtering platforms by release status', () => {
    const mockIGDBGame = {
      id: 113,
      name: 'GoldenEye 007',
      platforms: [
        { id: 4, name: 'Nintendo 64' },
        { id: 6, name: 'Super Nintendo (SNES)' }
      ],
      release_dates: [
        { platform: 4, status: 0, human: 'Aug 25, 1997' },  // Released (0)
        { platform: 6, status: 6, human: 'TBD' }            // Rumored (6)
      ]
    };

    // Current (incorrect) transformation
    const currentTransform = mockIGDBGame.platforms?.map(p => p.name) || null;

    // Proposed fix: only include platforms with released games (status 0)
    const releasedPlatformIds = new Set(
      mockIGDBGame.release_dates
        .filter(rd => rd.status === 0)  // Status 0 = Released
        .map(rd => rd.platform)
    );

    const fixedTransform = mockIGDBGame.platforms
      ?.filter(p => releasedPlatformIds.has(p.id))
      .map(p => p.name) || null;

    console.log('\n=== PLATFORM FILTERING FIX ===');
    console.log('Current (wrong):', currentTransform);
    console.log('Fixed (correct):', fixedTransform);

    expect(currentTransform).toEqual(['Nintendo 64', 'Super Nintendo (SNES)']);
    expect(fixedTransform).toEqual(['Nintendo 64']);

    console.log('\n✅ Fix verified: Only released platforms included');
  });

  /**
   * Test 3: Check IGDB status codes
   */
  it('should document IGDB release status codes', () => {
    const statusCodes = {
      0: 'Released',
      1: 'Alpha',
      2: 'Beta',
      3: 'Early Access',
      4: 'Offline',
      5: 'Cancelled',
      6: 'Rumored',
      7: 'Delisted'
    };

    console.log('\n=== IGDB RELEASE STATUS CODES ===');
    Object.entries(statusCodes).forEach(([code, status]) => {
      console.log(`${code}: ${status}`);
    });

    console.log('\n💡 We should filter to status 0 (Released) only');
    console.log('   Status 6 (Rumored) should be excluded from platforms array');
  });

  /**
   * Test 4: Test with multiple games scenarios
   */
  it('should handle various platform scenarios correctly', () => {
    const testCases = [
      {
        name: 'Game with only released platforms',
        game: {
          name: 'Super Mario 64',
          platforms: [{ id: 4, name: 'Nintendo 64' }],
          release_dates: [{ platform: 4, status: 0 }]
        },
        expected: ['Nintendo 64']
      },
      {
        name: 'Game with released and cancelled platforms',
        game: {
          name: 'Star Fox 2',
          platforms: [
            { id: 6, name: 'Super Nintendo (SNES)' },
            { id: 130, name: 'Nintendo Switch' }
          ],
          release_dates: [
            { platform: 6, status: 5 },   // Cancelled
            { platform: 130, status: 0 }  // Released
          ]
        },
        expected: ['Nintendo Switch']
      },
      {
        name: 'Multiplatform game',
        game: {
          name: 'Resident Evil 4',
          platforms: [
            { id: 8, name: 'PlayStation 2' },
            { id: 11, name: 'GameCube' },
            { id: 12, name: 'Wii' }
          ],
          release_dates: [
            { platform: 8, status: 0 },
            { platform: 11, status: 0 },
            { platform: 12, status: 0 }
          ]
        },
        expected: ['PlayStation 2', 'GameCube', 'Wii']
      }
    ];

    console.log('\n=== PLATFORM FILTERING TEST CASES ===');

    testCases.forEach(testCase => {
      const releasedPlatformIds = new Set(
        testCase.game.release_dates
          .filter(rd => rd.status === 0)
          .map(rd => rd.platform)
      );

      const filteredPlatforms = testCase.game.platforms
        .filter(p => releasedPlatformIds.has(p.id))
        .map(p => p.name);

      console.log(`\n${testCase.name}:`);
      console.log(`  Game: ${testCase.game.name}`);
      console.log(`  All platforms: ${testCase.game.platforms.map(p => p.name).join(', ')}`);
      console.log(`  Filtered platforms: ${filteredPlatforms.join(', ')}`);
      console.log(`  Expected: ${testCase.expected.join(', ')}`);

      expect(filteredPlatforms).toEqual(testCase.expected);
      console.log('  ✅ Passed');
    });
  });

  /**
   * Test 5: Edge case - what if release_dates is missing?
   */
  it('should handle missing release_dates gracefully', () => {
    const gameWithoutReleaseDates = {
      name: 'Unreleased Game',
      platforms: [{ id: 130, name: 'Nintendo Switch' }],
      release_dates: undefined
    };

    // Current approach (no filtering)
    const currentApproach = gameWithoutReleaseDates.platforms?.map(p => p.name) || null;

    // Safe filtering approach
    const releasedPlatformIds = new Set(
      (gameWithoutReleaseDates.release_dates || [])
        .filter(rd => rd.status === 0)
        .map(rd => rd.platform)
    );

    const safeFiltered = releasedPlatformIds.size > 0
      ? gameWithoutReleaseDates.platforms?.filter(p => releasedPlatformIds.has(p.id)).map(p => p.name)
      : gameWithoutReleaseDates.platforms?.map(p => p.name) || null; // Fallback to all platforms if no release_dates

    console.log('\n=== EDGE CASE: Missing release_dates ===');
    console.log('Current approach:', currentApproach);
    console.log('Safe filtered approach:', safeFiltered);
    console.log('💡 When release_dates is missing, we should either:');
    console.log('   1. Keep all platforms (conservative approach)');
    console.log('   2. Skip the game (strict approach)');
    console.log('   3. Fetch release_dates separately from IGDB');

    expect(currentApproach).toEqual(safeFiltered);
  });
});

describe('Proposed Platform Filtering Function', () => {
  /**
   * Utility function to extract only released platforms
   */
  function getReleasedPlatforms(igdbGame: any): string[] | null {
    if (!igdbGame.platforms || igdbGame.platforms.length === 0) {
      return null;
    }

    // If no release_dates, fall back to all platforms
    if (!igdbGame.release_dates || igdbGame.release_dates.length === 0) {
      console.warn(`⚠️  Game "${igdbGame.name}" has platforms but no release_dates - using all platforms`);
      return igdbGame.platforms.map((p: any) => p.name);
    }

    // Get platform IDs with released status (status 0)
    const releasedPlatformIds = new Set(
      igdbGame.release_dates
        .filter((rd: any) => rd.status === 0)
        .map((rd: any) => rd.platform)
    );

    // If no released platforms, fall back to all platforms
    if (releasedPlatformIds.size === 0) {
      console.warn(`⚠️  Game "${igdbGame.name}" has no released platforms - using all platforms`);
      return igdbGame.platforms.map((p: any) => p.name);
    }

    // Filter platforms to only those with released games
    return igdbGame.platforms
      .filter((p: any) => releasedPlatformIds.has(p.id))
      .map((p: any) => p.name);
  }

  it('should correctly filter Goldeneye platforms', () => {
    const goldeneye = {
      name: 'GoldenEye 007',
      platforms: [
        { id: 4, name: 'Nintendo 64' },
        { id: 6, name: 'Super Nintendo (SNES)' }
      ],
      release_dates: [
        { platform: 4, status: 0 },
        { platform: 6, status: 6 }
      ]
    };

    const result = getReleasedPlatforms(goldeneye);

    console.log('\n=== PROPOSED FUNCTION TEST ===');
    console.log('Input:', goldeneye.name);
    console.log('Result:', result);

    expect(result).toEqual(['Nintendo 64']);
  });

  it('should provide implementation guidance', () => {
    console.log('\n=== IMPLEMENTATION GUIDANCE ===');
    console.log('\n📝 Files to update:');
    console.log('   1. scripts/sync-igdb.js (line 252)');
    console.log('   2. Any IGDB service that fetches game data');
    console.log('\n🔧 Change needed in sync-igdb.js:');
    console.log('   OLD: platforms: igdbGame.platforms?.map(p => p.name) || null,');
    console.log('   NEW: platforms: getReleasedPlatforms(igdbGame),');
    console.log('\n📊 Impact:');
    console.log('   - Fixes games showing wrong platforms (like Goldeneye on SNES)');
    console.log('   - Removes rumored/cancelled platforms from database');
    console.log('   - More accurate platform data for users');
    console.log('\n⚠️  Considerations:');
    console.log('   - May need to update IGDB query to include release_dates');
    console.log('   - Should add release_dates to the fields fetched (line 186)');
    console.log('   - Consider migrating existing games to fix historical data');
  });
});
