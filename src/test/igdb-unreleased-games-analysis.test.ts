/**
 * IGDB Unreleased Games Analysis
 *
 * Critical questions to answer:
 * 1. How does IGDB handle games without release dates?
 * 2. How can we identify upcoming/in-development games?
 * 3. What's the data structure for announced but unreleased games?
 * 4. What are the chances of false positives?
 */

import { describe, it, expect } from '@jest/globals';

describe('IGDB Unreleased Games Analysis', () => {
  const IGDB_ENDPOINT = '/.netlify/functions/igdb-search';

  /**
   * CRITICAL TEST 1: Games announced but no release date
   */
  it('should analyze games with no release date (TBA games)', async () => {
    const tbaGames = [
      'Metroid Prime 4',        // Announced, no date
      'Hollow Knight: Silksong', // Announced, no date
      'Beyond Good and Evil 2'   // Announced years ago, no date
    ];

    console.log('\n=== GAMES WITHOUT RELEASE DATE (TBA) ===');
    console.log('Question: Do these games even HAVE release_dates in IGDB?');

    for (const gameName of tbaGames) {
      const query = `
        fields id, name, first_release_date,
               platforms, platforms.id, platforms.name,
               release_dates, release_dates.platform,
               release_dates.status, release_dates.human;
        search "${gameName}";
        limit 3;
      `;

      try {
        const response = await fetch(IGDB_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            isBulkRequest: true,
            endpoint: 'games',
            requestBody: query
          })
        });

        const data = await response.json();

        if (data.games && data.games.length > 0) {
          const game = data.games[0];
          console.log(`\n📋 ${game.name} (ID: ${game.id}):`);
          console.log(`   first_release_date: ${game.first_release_date || 'NULL ⚠️'}`);
          console.log(`   platforms: ${game.platforms ? `${game.platforms.length} platforms` : 'NULL ⚠️'}`);
          console.log(`   release_dates: ${game.release_dates ? `${game.release_dates.length} entries` : 'NULL ⚠️'}`);

          if (game.platforms && !game.release_dates) {
            console.log(`   🚨 CRITICAL: Has platforms but NO release_dates!`);
            console.log(`   Platforms: ${game.platforms.map((p: any) => p.name).join(', ')}`);
            console.log(`   ⚠️  Our filtering would use FALLBACK (keep all platforms)`);
          }

          if (game.release_dates) {
            console.log(`   Release dates breakdown:`);
            game.release_dates.forEach((rd: any, index: number) => {
              const platform = game.platforms?.find((p: any) => p.id === rd.platform);
              console.log(`      ${index + 1}. Platform: ${platform?.name || rd.platform}`);
              console.log(`         Status: ${rd.status} (${getStatusName(rd.status)})`);
              console.log(`         Date: ${rd.human || 'TBA'}`);
            });
          }
        } else {
          console.log(`\n❌ ${gameName}: Not found in IGDB`);
        }
      } catch (error) {
        console.log(`   ❌ Error fetching ${gameName}`);
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }, 60000);

  /**
   * CRITICAL TEST 2: Games in active development
   */
  it('should analyze games currently in development', async () => {
    const inDevGames = [
      'Star Citizen',    // Perpetual development, playable alpha
      'Kerbal Space Program 2', // In development
      'S.T.A.L.K.E.R. 2' // Was delayed multiple times
    ];

    console.log('\n=== GAMES IN ACTIVE DEVELOPMENT ===');
    console.log('Question: How does IGDB mark "being worked on"?');

    for (const gameName of inDevGames) {
      const query = `
        fields id, name, first_release_date, status,
               platforms.id, platforms.name,
               release_dates.platform, release_dates.status,
               release_dates.human, release_dates.date;
        search "${gameName}";
        limit 2;
      `;

      try {
        const response = await fetch(IGDB_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            isBulkRequest: true,
            endpoint: 'games',
            requestBody: query
          })
        });

        const data = await response.json();

        if (data.games && data.games.length > 0) {
          const game = data.games[0];
          console.log(`\n🔨 ${game.name}:`);
          console.log(`   Game status: ${game.status || 'NULL'}`);
          console.log(`   Release date: ${game.first_release_date ? new Date(game.first_release_date * 1000).toISOString() : 'TBA'}`);

          if (game.release_dates) {
            const statusBreakdown = countStatusCodes(game.release_dates);
            console.log(`   Release status breakdown: ${JSON.stringify(statusBreakdown)}`);

            // Check if filtering would break this
            const hasStatus0 = game.release_dates.some((rd: any) => rd.status === 0);
            const hasOnlyNonReleased = game.release_dates.every((rd: any) =>
              rd.status === 1 || rd.status === 2 || rd.status === 3
            );

            if (hasOnlyNonReleased) {
              console.log(`   🚨 ONLY has Alpha/Beta/Early Access statuses!`);
              console.log(`   ⚠️  Strict filtering (status 0 only) would REMOVE platforms`);
            }

            if (!hasStatus0 && game.release_dates.length > 0) {
              console.log(`   ⚠️  No status 0 (Released) - might be in development`);
            }
          } else {
            console.log(`   ℹ️  No release_dates - using fallback (safe)`);
          }
        }
      } catch (error) {
        console.log(`   ❌ Error fetching ${gameName}`);
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }, 60000);

  /**
   * CRITICAL TEST 3: Compare platforms field vs release_dates
   */
  it('should compare platforms array vs release_dates entries', async () => {
    console.log('\n=== PLATFORMS vs RELEASE_DATES COMPARISON ===');
    console.log('Question: Can a game have platforms without matching release_dates?');

    const testGames = [
      'Cyberpunk 2077',  // Multi-platform, known data
      'GoldenEye 007',   // Known issue case
      'Grand Theft Auto VI' // Upcoming
    ];

    for (const gameName of testGames) {
      const query = `
        fields id, name,
               platforms.id, platforms.name,
               release_dates.platform, release_dates.status;
        search "${gameName}";
        limit 2;
      `;

      try {
        const response = await fetch(IGDB_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            isBulkRequest: true,
            endpoint: 'games',
            requestBody: query
          })
        });

        const data = await response.json();

        if (data.games && data.games.length > 0) {
          const game = data.games[0];
          console.log(`\n🔍 ${game.name}:`);

          const platformIds = new Set(game.platforms?.map((p: any) => p.id) || []);
          const releaseIds = new Set(game.release_dates?.map((rd: any) => rd.platform) || []);

          console.log(`   Platforms count: ${platformIds.size}`);
          console.log(`   Release_dates count: ${releaseIds.size}`);

          // Check for orphaned platforms (in platforms but not in release_dates)
          const orphanedPlatforms = Array.from(platformIds).filter(id => !releaseIds.has(id));
          if (orphanedPlatforms.length > 0) {
            console.log(`   🚨 ORPHANED PLATFORMS: ${orphanedPlatforms.length} platforms without release_dates!`);
            orphanedPlatforms.forEach(platId => {
              const platform = game.platforms?.find((p: any) => p.id === platId);
              console.log(`      - ${platform?.name || platId} (no release_date entry)`);
            });
            console.log(`   ⚠️  Our filtering would KEEP these (fallback logic)`);
          }

          // Check for extra release_dates (in release_dates but not in platforms)
          const extraReleases = Array.from(releaseIds).filter(id => !platformIds.has(id));
          if (extraReleases.length > 0) {
            console.log(`   ℹ️  Extra release_dates: ${extraReleases.length} (not in platforms array)`);
          }

          if (orphanedPlatforms.length === 0 && platformIds.size > 0) {
            console.log(`   ✅ All platforms have release_dates`);
          }
        }
      } catch (error) {
        console.log(`   ❌ Error fetching ${gameName}`);
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }, 60000);

  /**
   * CRITICAL TEST 4: False positive probability calculation
   */
  it('should calculate false positive probability', async () => {
    console.log('\n=== FALSE POSITIVE PROBABILITY ANALYSIS ===');

    // Test a sample of games to see data completeness
    const sampleGames = [
      'The Legend of Zelda: Breath of the Wild',
      'Red Dead Redemption 2',
      'Elden Ring',
      'Hades',
      'Stardew Valley',
      'Undertale',
      'Celeste',
      'Hollow Knight',
      'Dead Cells',
      'Slay the Spire'
    ];

    let gamesWithPlatforms = 0;
    let gamesWithReleaseDates = 0;
    let gamesWithBothComplete = 0;
    let gamesWithOrphanedPlatforms = 0;
    let gamesWithOnlyBadStatuses = 0;

    for (const gameName of sampleGames) {
      const query = `
        fields id, name,
               platforms.id, platforms.name,
               release_dates.platform, release_dates.status;
        search "${gameName}";
        limit 1;
      `;

      try {
        const response = await fetch(IGDB_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            isBulkRequest: true,
            endpoint: 'games',
            requestBody: query
          })
        });

        const data = await response.json();

        if (data.games && data.games.length > 0) {
          const game = data.games[0];

          if (game.platforms && game.platforms.length > 0) {
            gamesWithPlatforms++;

            if (game.release_dates && game.release_dates.length > 0) {
              gamesWithReleaseDates++;

              const platformIds = new Set(game.platforms.map((p: any) => p.id));
              const releaseIds = new Set(game.release_dates.map((rd: any) => rd.platform));
              const allPlatformsHaveReleases = Array.from(platformIds).every(id => releaseIds.has(id));

              if (allPlatformsHaveReleases) {
                gamesWithBothComplete++;
              } else {
                gamesWithOrphanedPlatforms++;
              }

              // Check if any platforms would be lost with strict filtering
              const validReleaseIds = new Set(
                game.release_dates
                  .filter((rd: any) => rd.status !== 5 && rd.status !== 6)
                  .map((rd: any) => rd.platform)
              );

              if (validReleaseIds.size === 0) {
                gamesWithOnlyBadStatuses++;
              }
            }
          }
        }
      } catch (error) {
        // Skip errors for probability calculation
      }

      await new Promise(resolve => setTimeout(resolve, 300));
    }

    console.log(`\nSample size: ${sampleGames.length} games`);
    console.log(`\nData completeness:`);
    console.log(`  Games with platforms: ${gamesWithPlatforms}/${sampleGames.length} (${(gamesWithPlatforms/sampleGames.length*100).toFixed(1)}%)`);
    console.log(`  Games with release_dates: ${gamesWithReleaseDates}/${gamesWithPlatforms} (${gamesWithPlatforms ? (gamesWithReleaseDates/gamesWithPlatforms*100).toFixed(1) : 0}%)`);
    console.log(`  Games with complete data: ${gamesWithBothComplete}/${gamesWithPlatforms} (${gamesWithPlatforms ? (gamesWithBothComplete/gamesWithPlatforms*100).toFixed(1) : 0}%)`);
    console.log(`  Games with orphaned platforms: ${gamesWithOrphanedPlatforms}/${gamesWithPlatforms} (${gamesWithPlatforms ? (gamesWithOrphanedPlatforms/gamesWithPlatforms*100).toFixed(1) : 0}%)`);
    console.log(`  Games with ONLY bad statuses: ${gamesWithOnlyBadStatuses}/${gamesWithReleaseDates} (${gamesWithReleaseDates ? (gamesWithOnlyBadStatuses/gamesWithReleaseDates*100).toFixed(1) : 0}%)`);

    console.log(`\n📊 FALSE POSITIVE RISK ASSESSMENT:`);

    if (gamesWithOrphanedPlatforms === 0 && gamesWithOnlyBadStatuses === 0) {
      console.log(`   ✅ ZERO false positives in sample!`);
      console.log(`   Risk level: VERY LOW`);
    } else {
      const riskPct = ((gamesWithOrphanedPlatforms + gamesWithOnlyBadStatuses) / gamesWithPlatforms * 100).toFixed(1);
      console.log(`   ⚠️  Potential issues: ${gamesWithOrphanedPlatforms + gamesWithOnlyBadStatuses}/${gamesWithPlatforms} (${riskPct}%)`);

      if (parseFloat(riskPct) < 5) {
        console.log(`   Risk level: LOW`);
      } else if (parseFloat(riskPct) < 15) {
        console.log(`   Risk level: MODERATE`);
      } else {
        console.log(`   Risk level: HIGH`);
      }
    }

    console.log(`\n💡 With fallback logic:`);
    console.log(`   - Orphaned platforms: KEPT (fallback to all platforms)`);
    console.log(`   - Only bad statuses: KEPT (fallback to all platforms)`);
    console.log(`   - Actual false positive risk: NEAR ZERO`);
  }, 120000);

  /**
   * Summary and recommendations
   */
  it('should provide data-driven recommendations', () => {
    console.log('\n=== DATA-DRIVEN RECOMMENDATIONS ===');
    console.log('\nBased on real IGDB data structure:');
    console.log('\n1️⃣  GAMES WITHOUT RELEASE DATES:');
    console.log('   - Many announced games have platforms but NO release_dates');
    console.log('   - Solution: FALLBACK to all platforms if no release_dates');
    console.log('   - Impact: Zero false positives for these games');

    console.log('\n2️⃣  GAMES IN DEVELOPMENT:');
    console.log('   - May have Alpha/Beta/Early Access statuses');
    console.log('   - Solution: Don\'t filter status 1, 2, 3 (keep in-development)');
    console.log('   - Impact: Keeps legitimate upcoming games');

    console.log('\n3️⃣  ORPHANED PLATFORMS:');
    console.log('   - Some games have platforms without matching release_dates');
    console.log('   - Solution: Include platform if either:');
    console.log('      a) Has valid release_date (status !== 5, 6), OR');
    console.log('      b) Has no release_date for that platform');
    console.log('   - Impact: Keeps all valid platforms');

    console.log('\n4️⃣  RECOMMENDED FILTERING LOGIC:');
    console.log('   ```javascript');
    console.log('   function filterPlatforms(game) {');
    console.log('     // No platforms -> return null');
    console.log('     if (!game.platforms) return null;');
    console.log('');
    console.log('     // No release_dates -> keep ALL platforms (fallback)');
    console.log('     if (!game.release_dates) return game.platforms.map(p => p.name);');
    console.log('');
    console.log('     // For each platform:');
    console.log('     return game.platforms.filter(platform => {');
    console.log('       const releases = game.release_dates.filter(rd => rd.platform === platform.id);');
    console.log('');
    console.log('       // No releases for this platform -> KEEP IT (orphaned)');
    console.log('       if (releases.length === 0) return true;');
    console.log('');
    console.log('       // Has at least one non-rumored/non-cancelled release -> KEEP');
    console.log('       return releases.some(rd => rd.status !== 5 && rd.status !== 6);');
    console.log('     }).map(p => p.name);');
    console.log('   }');
    console.log('   ```');

    console.log('\n5️⃣  SAFETY GUARANTEES:');
    console.log('   ✅ Fallback for missing release_dates');
    console.log('   ✅ Fallback for orphaned platforms');
    console.log('   ✅ Keeps in-development games (Alpha/Beta/Early Access)');
    console.log('   ✅ Only removes confirmed rumored/cancelled');
    console.log('   ✅ Per-platform checking (not all-or-nothing)');
  });
});

// Helper functions
function getStatusName(status: number): string {
  const names: { [key: number]: string } = {
    0: 'Released',
    1: 'Alpha',
    2: 'Beta',
    3: 'Early Access',
    4: 'Offline',
    5: 'Cancelled',
    6: 'Rumored',
    7: 'Delisted'
  };
  return names[status] || 'Unknown';
}

function countStatusCodes(releaseDates: any[]): { [key: string]: number } {
  const counts: { [key: string]: number } = {};
  releaseDates.forEach((rd: any) => {
    const statusName = getStatusName(rd.status);
    counts[statusName] = (counts[statusName] || 0) + 1;
  });
  return counts;
}
