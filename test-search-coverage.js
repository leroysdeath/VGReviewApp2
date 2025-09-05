// Quick search coverage test
const seriesTests = [
  { name: 'Super Mario', searchTerm: 'mario', acclaimed: ['Super Mario Bros.', 'Super Mario Bros. 3', 'Super Mario World', 'Super Mario 64', 'Super Mario Galaxy', 'Super Mario Odyssey'] },
  { name: 'Zelda', searchTerm: 'zelda', acclaimed: ['Ocarina of Time', 'Breath of the Wild', 'A Link to the Past', 'Majoras Mask', 'Tears of the Kingdom', 'Wind Waker'] },
  { name: 'Pokemon', searchTerm: 'pokemon', acclaimed: ['Pokemon Red', 'Pokemon Blue', 'Pokemon Gold', 'Pokemon Silver', 'Pokemon Ruby', 'Pokemon Sapphire'] },
  { name: 'Final Fantasy', searchTerm: 'final fantasy', acclaimed: ['Final Fantasy VII', 'Final Fantasy VI', 'Final Fantasy X', 'Final Fantasy IX'] },
  { name: 'GTA', searchTerm: 'grand theft auto', acclaimed: ['San Andreas', 'GTA V', 'Vice City', 'GTA III'] }
];

async function testCoverage() {
  console.log('🧪 SEARCH COVERAGE TEST');
  console.log('=======================');
  
  for (const series of seriesTests) {
    console.log(`\n🎮 ${series.name} - "${series.searchTerm}"`);
    
    try {
      const response = await fetch('http://localhost:8888/.netlify/functions/igdb-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchTerm: series.searchTerm, limit: 15 })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.games) {
          let foundCount = 0;
          
          series.acclaimed.forEach(title => {
            const found = data.games.some(game => {
              const gameName = game.name.toLowerCase();
              const titleName = title.toLowerCase();
              return gameName.includes(titleName) || titleName.includes(gameName);
            });
            if (found) foundCount++;
          });
          
          const coverage = (foundCount / series.acclaimed.length * 100).toFixed(1);
          console.log(`   📊 ${foundCount}/${series.acclaimed.length} (${coverage}%)`);
          
          if (parseFloat(coverage) < 50) {
            console.log(`   🚨 LOW COVERAGE`);
          }
        } else {
          console.log(`   ❌ API Error`);
        }
      } else {
        console.log(`   ❌ HTTP ${response.status}`);
      }
    } catch (error) {
      console.log(`   ❌ ${error.message}`);
    }
  }
}

testCoverage();