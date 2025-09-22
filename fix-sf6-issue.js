// Script to fix Street Fighter 6 and Apex Legends IGDB ID conflict

async function getIGDBData() {
  console.log('=== Fetching correct IGDB IDs ===\n');

  // Test queries to get correct IDs
  const queries = [
    {
      name: 'Street Fighter 6',
      query: `
        fields id, name, first_release_date, cover.url, developer, publisher, summary,
               platforms.name, genres.name, involved_companies.company.name,
               involved_companies.developer, involved_companies.publisher;
        search "Street Fighter 6";
        where category = (0,8,9,10);
        limit 5;
      `
    },
    {
      name: 'Apex Legends',
      query: `
        fields id, name, first_release_date, cover.url, developer, publisher, summary,
               platforms.name, genres.name, involved_companies.company.name,
               involved_companies.developer, involved_companies.publisher;
        search "Apex Legends";
        where category = (0,8,9,10);
        limit 5;
      `
    }
  ];

  for (const { name, query } of queries) {
    console.log(`Searching for: ${name}`);
    console.log('-------------------');

    try {
      const response = await fetch('http://localhost:8888/.netlify/functions/igdb-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isBulkRequest: true,
          endpoint: 'games',
          requestBody: query
        })
      });

      const data = await response.json();

      if (data.success && data.games) {
        data.games.forEach(game => {
          const developer = game.involved_companies?.find(c => c.developer)?.company?.name || 'N/A';
          const publisher = game.involved_companies?.find(c => c.publisher)?.company?.name || 'N/A';

          console.log(`Game: ${game.name}`);
          console.log(`IGDB ID: ${game.id}`);
          console.log(`Developer: ${developer}`);
          console.log(`Publisher: ${publisher}`);
          console.log(`Release Date: ${game.first_release_date ? new Date(game.first_release_date * 1000).toLocaleDateString() : 'N/A'}`);
          console.log(`Cover: ${game.cover?.url || 'N/A'}`);
          console.log('');
        });
      } else {
        console.log('No results or error:', data.error);
      }
    } catch (error) {
      console.log('Request failed:', error.message);
    }

    console.log('\n');
  }
}

// Run the test
getIGDBData().catch(console.error);