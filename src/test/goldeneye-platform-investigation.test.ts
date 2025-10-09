/**
 * Goldeneye Platform Investigation Test
 *
 * Purpose: Diagnose why Goldeneye shows as SNES when it was N64 exclusive
 * Theory: IGDB may have rumored/unreleased platform data
 */

import { describe, it, expect } from '@jest/globals';

describe('Goldeneye Platform Investigation', () => {
  const IGDB_ENDPOINT = '/.netlify/functions/igdb-search';

  /**
   * Test 1: Query IGDB API directly for Goldeneye
   */
  it('should fetch Goldeneye data from IGDB API', async () => {
    const query = `
      fields id, name, platforms.name, platforms.id,
             first_release_date, release_dates.platform,
             release_dates.date, release_dates.human,
             release_dates.region, release_dates.status;
      search "GoldenEye 007";
      limit 5;
    `;

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
    console.log('\n=== GOLDENEYE IGDB RAW DATA ===');
    console.log(JSON.stringify(data, null, 2));

    expect(data.success).toBe(true);
    expect(data.games).toBeDefined();

    // Find the N64 Goldeneye (1997)
    const goldeneye = data.games.find((g: any) =>
      g.name === 'GoldenEye 007' &&
      g.first_release_date &&
      new Date(g.first_release_date * 1000).getFullYear() === 1997
    );

    if (goldeneye) {
      console.log('\n=== GOLDENEYE 007 (1997) ===');
      console.log('Name:', goldeneye.name);
      console.log('IGDB ID:', goldeneye.id);
      console.log('Release Date:', new Date(goldeneye.first_release_date * 1000).toISOString());
      console.log('Platforms:', goldeneye.platforms);
      console.log('Release Dates:', goldeneye.release_dates);

      // Check if SNES is in the platforms
      const hasSNES = goldeneye.platforms?.some((p: any) =>
        p.name?.toLowerCase().includes('snes') ||
        p.name?.toLowerCase().includes('super nintendo')
      );

      const hasN64 = goldeneye.platforms?.some((p: any) =>
        p.name?.toLowerCase().includes('n64') ||
        p.name?.toLowerCase().includes('nintendo 64')
      );

      console.log('\n=== PLATFORM CHECK ===');
      console.log('Has SNES in platforms?', hasSNES);
      console.log('Has N64 in platforms?', hasN64);

      // Check release_dates for status (released vs rumored)
      if (goldeneye.release_dates) {
        console.log('\n=== RELEASE DATE DETAILS ===');
        goldeneye.release_dates.forEach((rd: any) => {
          const platformInfo = goldeneye.platforms?.find((p: any) => p.id === rd.platform);
          console.log(`Platform: ${platformInfo?.name || rd.platform}, Status: ${rd.status}, Date: ${rd.human}`);
        });
      }
    }
  }, 30000);

  /**
   * Test 2: Check how our sync script handles platform data
   */
  it('should examine platform data transformation in sync', async () => {
    // Query IGDB with the same fields our sync script uses
    const syncQuery = `
      fields id, name, summary, first_release_date, rating, total_rating, total_rating_count,
             cover.url, genres.name, platforms.name,
             involved_companies.company.name, involved_companies.developer, involved_companies.publisher,
             category, franchise.name, franchises.name;
      search "GoldenEye 007";
      limit 3;
    `;

    const response = await fetch(IGDB_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        isBulkRequest: true,
        endpoint: 'games',
        requestBody: syncQuery
      })
    });

    const data = await response.json();
    console.log('\n=== SYNC QUERY FORMAT ===');

    if (data.games) {
      data.games.forEach((game: any) => {
        console.log(`\nGame: ${game.name} (${game.id})`);
        console.log('Platforms in sync format:', game.platforms?.map((p: any) => p.name));
      });
    }
  }, 30000);

  /**
   * Test 3: Check similar N64-exclusive games for platform issues
   */
  it('should check other N64-exclusive games for similar issues', async () => {
    const n64Games = [
      'Super Mario 64',
      'The Legend of Zelda: Ocarina of Time',
      'Perfect Dark',
      'Banjo-Kazooie'
    ];

    console.log('\n=== CHECKING OTHER N64 EXCLUSIVES ===');

    for (const gameName of n64Games) {
      const query = `
        fields id, name, platforms.name, first_release_date;
        search "${gameName}";
        limit 3;
      `;

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
        console.log('Platforms:', game.platforms?.map((p: any) => p.name).join(', '));

        // Check for incorrect platforms
        const platforms = game.platforms?.map((p: any) => p.name.toLowerCase()) || [];
        const hasWrongPlatform = platforms.some((p: string) =>
          p.includes('snes') || p.includes('genesis') || p.includes('playstation') && !p.includes('2')
        );

        if (hasWrongPlatform) {
          console.log('⚠️  WARNING: Game has potentially incorrect platforms!');
        }
      }

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }, 60000);

  /**
   * Test 4: Query IGDB for platform release status codes
   */
  it('should investigate IGDB release status codes', async () => {
    const query = `
      fields id, name, platforms.name, release_dates.platform,
             release_dates.status, release_dates.human, release_dates.region;
      search "GoldenEye 007";
      where first_release_date >= 867024000 & first_release_date <= 883612800;
      limit 5;
    `;

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

    console.log('\n=== RELEASE STATUS CODES ===');
    console.log('IGDB Status Codes:');
    console.log('0 = Released');
    console.log('1 = Alpha');
    console.log('2 = Beta');
    console.log('3 = Early Access');
    console.log('4 = Offline');
    console.log('5 = Cancelled');
    console.log('6 = Rumored');
    console.log('7 = Delisted');

    if (data.games) {
      data.games.forEach((game: any) => {
        if (game.name.includes('GoldenEye')) {
          console.log(`\n${game.name} (${game.id}):`);
          if (game.release_dates) {
            game.release_dates.forEach((rd: any) => {
              const platform = game.platforms?.find((p: any) => p.id === rd.platform);
              console.log(`  Platform: ${platform?.name || 'Unknown'}`);
              console.log(`  Status: ${rd.status} (${rd.status === 0 ? 'Released' : rd.status === 6 ? 'RUMORED' : 'Other'})`);
              console.log(`  Date: ${rd.human || 'Unknown'}`);
              console.log(`  Region: ${rd.region || 'Unknown'}`);
            });
          }
        }
      });
    }
  }, 30000);
});
