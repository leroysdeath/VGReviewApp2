// Test script to check Street Fighter VI search
async function testStreetFighterSearch() {
  console.log('Testing Street Fighter VI search...\n');

  // Test IGDB API directly
  const testQueries = [
    'Street Fighter VI',
    'Street Fighter 6',
    'Street Fighter',
    'SF6',
    'SFVI'
  ];

  for (const query of testQueries) {
    console.log(`\n=== Testing query: "${query}" ===`);

    try {
      const response = await fetch('http://localhost:8888/.netlify/functions/igdb-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isBulkRequest: true,
          endpoint: 'games',
          requestBody: `
            search "${query}";
            fields id, name, first_release_date, rating, total_rating, follows, hypes, category,
                   cover.*, genres.name, platforms.name, involved_companies.*,
                   alternative_names.*, collection.name, franchise.name;
            where category = (0,8,9,10,11) & version_parent = null;
            limit 20;
          `
        })
      });

      const data = await response.json();

      if (data.success && data.games) {
        console.log(`Found ${data.games.length} games:`);

        // Look for Street Fighter 6 specifically
        const sf6Games = data.games.filter(game =>
          game.name.toLowerCase().includes('street fighter') &&
          (game.name.includes('6') || game.name.toLowerCase().includes('vi'))
        );

        if (sf6Games.length > 0) {
          console.log('\nStreet Fighter VI/6 found:');
          sf6Games.forEach(game => {
            console.log(`- ${game.name} (ID: ${game.id}, Released: ${game.first_release_date ? new Date(game.first_release_date * 1000).getFullYear() : 'N/A'})`);
          });
        } else {
          console.log('Street Fighter VI/6 NOT found in results');

          // Show all Street Fighter games found
          const sfGames = data.games.filter(game =>
            game.name.toLowerCase().includes('street fighter')
          );

          if (sfGames.length > 0) {
            console.log('\nOther Street Fighter games found:');
            sfGames.forEach(game => {
              console.log(`- ${game.name} (ID: ${game.id})`);
            });
          }
        }
      } else {
        console.log('Error:', data.error || 'No games returned');
      }
    } catch (error) {
      console.log('Request failed:', error.message);
    }
  }

  // Now test exact IGDB ID lookup for Street Fighter 6
  console.log('\n\n=== Direct IGDB lookup for Street Fighter 6 (ID: 114795) ===');
  try {
    const response = await fetch('http://localhost:8888/.netlify/functions/igdb-search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        isBulkRequest: true,
        endpoint: 'games',
        requestBody: `
          fields id, name, first_release_date, rating, total_rating, follows, hypes, category,
                 cover.*, genres.name, platforms.name, involved_companies.*, summary;
          where id = 114795;
          limit 1;
        `
      })
    });

    const data = await response.json();

    if (data.success && data.games && data.games.length > 0) {
      const game = data.games[0];
      console.log('Game found:');
      console.log(`- Name: ${game.name}`);
      console.log(`- ID: ${game.id}`);
      console.log(`- Released: ${game.first_release_date ? new Date(game.first_release_date * 1000).toLocaleDateString() : 'N/A'}`);
      console.log(`- Summary: ${(game.summary || '').substring(0, 100)}...`);
    } else {
      console.log('Game not found or error:', data.error);
    }
  } catch (error) {
    console.log('Request failed:', error.message);
  }
}

// Run the test
testStreetFighterSearch().catch(console.error);