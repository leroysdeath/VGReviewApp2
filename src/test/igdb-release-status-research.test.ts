/**
 * IGDB Release Status Research Test
 *
 * Purpose: Investigate IGDB's release_dates.status codes in real-world data
 * to understand the risk of filtering out valid upcoming games
 */

import { describe, it, expect } from '@jest/globals';

describe('IGDB Release Status Research', () => {
  const IGDB_ENDPOINT = '/.netlify/functions/igdb-search';

  /**
   * Test upcoming games to see their status codes
   */
  it('should investigate status codes for announced upcoming games', async () => {
    // Games that are announced with release dates
    const upcomingGames = [
      'Grand Theft Auto VI',    // Announced, 2025
      'Metroid Prime 4',        // Announced, TBA
      'Hollow Knight: Silksong' // Announced, TBA
    ];

    console.log('\n=== UPCOMING GAMES STATUS ANALYSIS ===');

    for (const gameName of upcomingGames) {
      const query = `
        fields id, name, first_release_date,
               platforms.id, platforms.name,
               release_dates.platform, release_dates.status,
               release_dates.date, release_dates.human,
               release_dates.region, release_dates.category;
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
          console.log(`\n📅 ${game.name} (IGDB ID: ${game.id}):`);
          console.log(`   First Release Date: ${game.first_release_date ? new Date(game.first_release_date * 1000).toISOString() : 'TBA'}`);
          console.log(`   Platforms: ${game.platforms?.map((p: any) => p.name).join(', ') || 'None'}`);

          if (game.release_dates) {
            console.log(`   Release Dates (${game.release_dates.length} entries):`);
            game.release_dates.forEach((rd: any) => {
              const platform = game.platforms?.find((p: any) => p.id === rd.platform);
              console.log(`      - Platform: ${platform?.name || 'Unknown'}`);
              console.log(`        Status: ${rd.status} (${getStatusName(rd.status)})`);
              console.log(`        Date: ${rd.human || 'TBA'}`);
              console.log(`        Region: ${rd.region || 'Unknown'}`);
            });
          } else {
            console.log('   ⚠️  No release_dates data');
          }
        }
      } catch (error) {
        console.log(`   ❌ Error fetching ${gameName}`);
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }, 60000);

  /**
   * Test recently released games to verify status 0
   */
  it('should verify recently released games have status 0', async () => {
    // Games released in last 2 years
    const recentGames = [
      'Baldurs Gate 3',
      'The Legend of Zelda: Tears of the Kingdom',
      'Starfield'
    ];

    console.log('\n=== RECENTLY RELEASED GAMES STATUS ===');

    for (const gameName of recentGames) {
      const query = `
        fields id, name, first_release_date,
               platforms.id, platforms.name,
               release_dates.platform, release_dates.status,
               release_dates.human;
        search "${gameName}";
        where first_release_date > 1640995200;
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
          console.log(`\n✅ ${game.name}:`);

          const statusCounts = countStatusCodes(game.release_dates || []);
          console.log(`   Status breakdown: ${JSON.stringify(statusCounts)}`);

          const hasNonReleased = game.release_dates?.some((rd: any) => rd.status !== 0);
          if (hasNonReleased) {
            console.log('   ⚠️  Has non-released platforms:');
            game.release_dates?.forEach((rd: any) => {
              if (rd.status !== 0) {
                const platform = game.platforms?.find((p: any) => p.id === rd.platform);
                console.log(`      - ${platform?.name}: Status ${rd.status} (${getStatusName(rd.status)})`);
              }
            });
          }
        }
      } catch (error) {
        console.log(`   ❌ Error fetching ${gameName}`);
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }, 60000);

  /**
   * Test old games to see if they have rumored platforms
   */
  it('should check if old games have rumored platforms', async () => {
    const oldGames = [
      'GoldenEye 007',      // Known issue: SNES rumored
      'Super Mario 64',     // Should be clean
      'Perfect Dark',       // Might have rumored platforms
      'Banjo-Kazooie'       // Might have rumored platforms
    ];

    console.log('\n=== OLD GAMES RUMORED PLATFORM CHECK ===');

    for (const gameName of oldGames) {
      const query = `
        fields id, name, first_release_date,
               platforms.id, platforms.name,
               release_dates.platform, release_dates.status,
               release_dates.human;
        search "${gameName}";
        where first_release_date < 1000000000;
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
          const statusCounts = countStatusCodes(game.release_dates || []);

          console.log(`\n${game.name}:`);
          console.log(`   Total platforms: ${game.platforms?.length || 0}`);
          console.log(`   Status breakdown: ${JSON.stringify(statusCounts)}`);

          // Check for rumored/cancelled
          const problematic = game.release_dates?.filter((rd: any) =>
            rd.status === 5 || rd.status === 6
          ) || [];

          if (problematic.length > 0) {
            console.log(`   🚨 Found ${problematic.length} rumored/cancelled platforms:`);
            problematic.forEach((rd: any) => {
              const platform = game.platforms?.find((p: any) => p.id === rd.platform);
              console.log(`      - ${platform?.name}: Status ${rd.status} (${getStatusName(rd.status)})`);
            });
          } else {
            console.log('   ✅ No rumored/cancelled platforms');
          }
        }
      } catch (error) {
        console.log(`   ❌ Error fetching ${gameName}`);
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }, 60000);

  /**
   * Test what happens with Early Access games
   */
  it('should investigate Early Access games status codes', async () => {
    const earlyAccessGames = [
      'Hades',           // Was early access, now released
      'Baldurs Gate 3',  // Was early access, now released
      'Valheim'          // Was early access, now released
    ];

    console.log('\n=== EARLY ACCESS GAMES ANALYSIS ===');
    console.log('Testing if Early Access (status 3) affects current platforms');

    for (const gameName of earlyAccessGames) {
      const query = `
        fields id, name, first_release_date,
               platforms.id, platforms.name,
               release_dates.platform, release_dates.status,
               release_dates.human, release_dates.category;
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
          console.log(`\n${game.name}:`);

          const statusCounts = countStatusCodes(game.release_dates || []);
          console.log(`   Status breakdown: ${JSON.stringify(statusCounts)}`);

          // Check if any platforms are still marked as Early Access
          const earlyAccess = game.release_dates?.filter((rd: any) => rd.status === 3) || [];
          if (earlyAccess.length > 0) {
            console.log(`   ⚠️  Has ${earlyAccess.length} Early Access entries`);
          }

          // Check if filtering to status 0 would remove platforms
          const status0Platforms = new Set(
            game.release_dates?.filter((rd: any) => rd.status === 0).map((rd: any) => rd.platform) || []
          );
          const wouldLosePlatforms = game.platforms?.filter((p: any) => !status0Platforms.has(p.id)) || [];

          if (wouldLosePlatforms.length > 0) {
            console.log(`   🚨 Filtering to status 0 would remove: ${wouldLosePlatforms.map((p: any) => p.name).join(', ')}`);
          } else {
            console.log('   ✅ Filtering to status 0 is safe');
          }
        }
      } catch (error) {
        console.log(`   ❌ Error fetching ${gameName}`);
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }, 60000);

  /**
   * Summary test with recommendations
   */
  it('should provide filtering strategy recommendations', () => {
    console.log('\n=== FILTERING STRATEGY RECOMMENDATIONS ===');
    console.log('\nIGDB Status Codes:');
    console.log('  0: Released ✅ (INCLUDE)');
    console.log('  1: Alpha ⚠️');
    console.log('  2: Beta ⚠️');
    console.log('  3: Early Access ⚠️');
    console.log('  4: Offline ❌');
    console.log('  5: Cancelled ❌ (EXCLUDE)');
    console.log('  6: Rumored ❌ (EXCLUDE)');
    console.log('  7: Delisted ⚠️');

    console.log('\n📊 SAFE FILTERING OPTIONS:');

    console.log('\nOption 1: STRICT (Only Released)');
    console.log('  Filter: status === 0');
    console.log('  Risk: May exclude Early Access games still in development');
    console.log('  Benefit: Clean data, only confirmed releases');

    console.log('\nOption 2: MODERATE (Exclude only Rumored/Cancelled)');
    console.log('  Filter: status !== 5 && status !== 6');
    console.log('  Risk: May include Alpha/Beta/Early Access');
    console.log('  Benefit: Keeps upcoming games, removes false platforms');

    console.log('\nOption 3: CONSERVATIVE (Exclude only Rumored)');
    console.log('  Filter: status !== 6');
    console.log('  Risk: May include cancelled games');
    console.log('  Benefit: Maximum game coverage');

    console.log('\n💡 RECOMMENDED: Option 2 (Moderate)');
    console.log('Rationale:');
    console.log('  - Fixes Goldeneye-style issues (rumored platforms)');
    console.log('  - Removes cancelled platforms');
    console.log('  - Keeps Early Access and upcoming games');
    console.log('  - Low risk of false positives');
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
