require('dotenv').config();

async function searchPikminSwitch() {
  // Search for all Pikmin games with Switch platform
  const searches = [
    'pikmin 1',
    'pikmin 2', 
    'new play control',
    'pikmin deluxe',
    'pikmin collection'
  ];

  console.log('🔍 Searching for Pikmin Switch games...\n');

  for (const query of searches) {
    console.log(`\n📦 Searching: "${query}"`);
    
    try {
      const response = await fetch('http://localhost:8888/.netlify/functions/igdb-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, limit: 10, minimal: true })
      });

      const data = await response.json();
      
      if (data.success && data.games) {
        const switchGames = data.games.filter(g => 
          g.platforms?.some(p => p.name === 'Nintendo Switch')
        );

        if (switchGames.length > 0) {
          console.log(`   ✅ Found ${switchGames.length} Switch games:`);
          switchGames.forEach(g => {
            console.log(`      - ${g.name} (IGDB ID: ${g.id})`);
          });
        } else {
          console.log(`   ❌ No Switch games found`);
        }
      }
    } catch (err) {
      console.error(`   ❌ Error:`, err.message);
    }
  }
}

searchPikminSwitch();
