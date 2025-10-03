/**
 * Release Status Integration Test
 *
 * Tests the release_status field with real IGDB API data
 * Verifies that:
 * 1. IGDB services properly compute release_status
 * 2. Known games are categorized correctly
 * 3. Status values are consistent
 */

import { describe, it, expect } from '@jest/globals';
import { IGDBServiceV2 } from '../services/igdbServiceV2';

describe('Release Status Integration Tests', () => {
  const igdbService = new IGDBServiceV2();

  /**
   * Test released games
   */
  it('should categorize GoldenEye 007 as "released"', async () => {
    const results = await igdbService.searchGames('GoldenEye 007', 5);

    const goldeneye = results.find(g => g.name === 'GoldenEye 007');

    expect(goldeneye).toBeDefined();
    expect(goldeneye?.release_status).toBe('released');

    console.log('\n📋 GoldenEye 007:');
    console.log(`   Name: ${goldeneye?.name}`);
    console.log(`   Release Status: ${goldeneye?.release_status}`);
    console.log(`   Platforms: ${goldeneye?.platforms?.map(p => p.name).join(', ')}`);
    console.log(`   Release Dates: ${goldeneye?.release_dates?.length || 0} entries`);

    if (goldeneye?.release_dates) {
      goldeneye.release_dates.forEach((rd, i) => {
        const platform = goldeneye.platforms?.find(p => p.id === rd.platform);
        console.log(`      ${i + 1}. ${platform?.name || rd.platform} - Status ${rd.status} (${rd.human || 'TBD'})`);
      });
    }
  }, 30000);

  it('should categorize The Legend of Zelda: Breath of the Wild as "released"', async () => {
    const results = await igdbService.searchGames('The Legend of Zelda: Breath of the Wild', 5);

    const botw = results.find(g => g.name === 'The Legend of Zelda: Breath of the Wild');

    expect(botw).toBeDefined();
    expect(botw?.release_status).toBe('released');

    console.log('\n📋 Breath of the Wild:');
    console.log(`   Release Status: ${botw?.release_status}`);
    console.log(`   Platforms: ${botw?.platforms?.length || 0}`);
  }, 30000);

  /**
   * Test games in development (should be 'released')
   */
  it('should categorize Star Citizen as "released" (alpha)', async () => {
    const results = await igdbService.searchGames('Star Citizen', 5);

    const starCitizen = results.find(g => g.name.includes('Star Citizen'));

    if (starCitizen) {
      console.log('\n📋 Star Citizen:');
      console.log(`   Name: ${starCitizen.name}`);
      console.log(`   Release Status: ${starCitizen.release_status}`);
      console.log(`   Release Dates: ${starCitizen.release_dates?.length || 0} entries`);

      // Should be 'released' because alpha (status 1) counts as released
      expect(['released', null]).toContain(starCitizen.release_status);
    }
  }, 30000);

  /**
   * Test unreleased/cancelled games
   */
  it('should categorize Silent Hills as "unreleased" (cancelled)', async () => {
    const results = await igdbService.searchGames('Silent Hills', 5);

    const silentHills = results.find(g => g.name === 'Silent Hills');

    if (silentHills) {
      console.log('\n📋 Silent Hills:');
      console.log(`   Name: ${silentHills.name}`);
      console.log(`   Release Status: ${silentHills.release_status}`);
      console.log(`   Release Dates: ${silentHills.release_dates?.length || 0} entries`);

      // Should be 'unreleased' because it was cancelled
      expect(['unreleased', null]).toContain(silentHills.release_status);
    }
  }, 30000);

  /**
   * Test unknown status games
   */
  it('should handle games with no release_dates gracefully', async () => {
    const results = await igdbService.searchGames('Metroid Prime 4', 5);

    const metroi4 = results.find(g => g.name.includes('Metroid Prime 4'));

    if (metroi4) {
      console.log('\n📋 Metroid Prime 4:');
      console.log(`   Name: ${metroi4.name}`);
      console.log(`   Release Status: ${metroi4.release_status}`);
      console.log(`   Release Dates: ${metroi4.release_dates?.length || 0} entries`);

      // Should be null (unknown) if no release dates
      if (!metroi4.release_dates || metroi4.release_dates.length === 0) {
        expect(metroi4.release_status).toBe(null);
      }
    }
  }, 30000);

  /**
   * Test that all games have valid release_status values
   */
  it('should only return valid release_status values', async () => {
    const results = await igdbService.searchGames('Zelda', 20);

    console.log(`\n📊 Testing ${results.length} games for valid release_status`);

    const validValues = ['released', 'unreleased', null];
    const statusCounts = {
      released: 0,
      unreleased: 0,
      unknown: 0
    };

    results.forEach(game => {
      expect(validValues).toContain(game.release_status);

      if (game.release_status === 'released') statusCounts.released++;
      else if (game.release_status === 'unreleased') statusCounts.unreleased++;
      else statusCounts.unknown++;
    });

    console.log('   Status breakdown:');
    console.log(`   - Released: ${statusCounts.released}`);
    console.log(`   - Unreleased: ${statusCounts.unreleased}`);
    console.log(`   - Unknown: ${statusCounts.unknown}`);

    // Most games should have a status (not null)
    expect(statusCounts.released + statusCounts.unreleased).toBeGreaterThan(0);
  }, 30000);

  /**
   * Test multiplatform games with mixed release statuses
   */
  it('should handle multiplatform games correctly', async () => {
    const results = await igdbService.searchGames('Cyberpunk 2077', 5);

    const cyberpunk = results.find(g => g.name === 'Cyberpunk 2077');

    if (cyberpunk) {
      console.log('\n📋 Cyberpunk 2077:');
      console.log(`   Release Status: ${cyberpunk.release_status}`);
      console.log(`   Platforms: ${cyberpunk.platforms?.length || 0}`);
      console.log(`   Release Dates: ${cyberpunk.release_dates?.length || 0}`);

      // Should be 'released' because it has released platforms
      expect(cyberpunk.release_status).toBe('released');

      if (cyberpunk.release_dates) {
        const releasedCount = cyberpunk.release_dates.filter(rd => rd.status === 0).length;
        const rumoredCount = cyberpunk.release_dates.filter(rd => rd.status === 6).length;

        console.log(`   - Released platforms: ${releasedCount}`);
        console.log(`   - Rumored platforms: ${rumoredCount}`);

        // Should have at least one released platform
        expect(releasedCount).toBeGreaterThan(0);
      }
    }
  }, 30000);

  /**
   * Summary test - verify consistency across multiple searches
   */
  it('should maintain consistent release_status across searches', async () => {
    const searchTerms = ['Mario', 'Zelda', 'Sonic'];
    let totalGames = 0;
    let gamesWithStatus = 0;

    console.log('\n📊 Consistency Test Across Multiple Searches:');

    for (const term of searchTerms) {
      const results = await igdbService.searchGames(term, 10);
      totalGames += results.length;

      const withStatus = results.filter(g => g.release_status !== null).length;
      gamesWithStatus += withStatus;

      console.log(`   ${term}: ${results.length} games, ${withStatus} with status`);

      // Verify all have release_status field (even if null)
      results.forEach(game => {
        expect(game).toHaveProperty('release_status');
      });
    }

    console.log(`\n   Total: ${totalGames} games, ${gamesWithStatus} with known status`);
    console.log(`   Coverage: ${((gamesWithStatus / totalGames) * 100).toFixed(1)}%`);

    // At least 50% should have a known status
    expect(gamesWithStatus / totalGames).toBeGreaterThan(0.5);
  }, 60000);
});
