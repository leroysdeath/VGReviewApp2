#!/usr/bin/env node

// Test Content Filter with Official Game Whitelisting
import { shouldFilterContent } from '../src/utils/contentProtectionFilter.js';

// Test games based on the IGDB results we saw
const testGames = [
  // Official Final Fantasy games (should NOT be filtered)
  {
    id: 127879,
    name: "Final Fantasy VII & Final Fantasy VIII Remastered Twin Pack",
    developer: "Square Enix",
    publisher: "Square Enix",
    summary: "The Twin Pack includes Final Fantasy VII and the remastered version of Final Fantasy VIII."
  },
  {
    id: 207026,
    name: "Final Fantasy VII",
    developer: "Square Enix",
    publisher: "Square Enix", 
    summary: "In addition to graphical resolution improvements to the previous port..."
  },
  {
    id: 427,
    name: "Final Fantasy VII",
    developer: "Square",
    publisher: "Square Enix",
    summary: "Final Fantasy VII is a role-playing game set in a post-modern, steampunk world..."
  },
  
  // Official Nintendo games (should NOT be filtered)
  {
    id: 1,
    name: "Super Mario World", 
    developer: "Nintendo R&D2",
    publisher: "Nintendo",
    summary: "Official Super Mario World game"
  },
  
  // Official Capcom games (should NOT be filtered) 
  {
    id: 2,
    name: "Mega Man X2",
    developer: "Capcom",
    publisher: "Capcom",
    summary: "Official Mega Man X2 game"
  },
  
  // Fan-made games (should be filtered)
  {
    id: 100,
    name: "Final Fantasy VII Fan Remake",
    developer: "Fan Developer",
    publisher: "Unknown",
    summary: "A fan-made remake of Final Fantasy VII"
  },
  {
    id: 101,
    name: "Super Mario World ROM Hack",
    developer: "Unknown",
    publisher: "Unknown", 
    summary: "A ROM hack of Super Mario World with new levels"
  },
  {
    id: 102,
    name: "Mega Man X2: Fan Edition",
    developer: "Community Developer",
    publisher: "Unknown",
    summary: "A mod of Mega Man X2 with new features"
  },
  
  // Protected franchise by unknown developer (should be filtered)
  {
    id: 103,
    name: "Final Fantasy: Lost Chronicles",
    developer: "Indie Studio",
    publisher: "Unknown",
    summary: "A new Final Fantasy adventure"
  }
];

console.log('🧪 Testing Content Protection Filter with Official Game Whitelisting');
console.log('=' .repeat(80));

testGames.forEach((game, index) => {
  const filtered = shouldFilterContent(game);
  const status = filtered ? '🛡️  FILTERED' : '✅ ALLOWED';
  
  console.log(`\n${index + 1}. ${status}: "${game.name}"`);
  console.log(`   Developer: ${game.developer}`);
  console.log(`   Publisher: ${game.publisher}`);
  
  if (filtered) {
    console.log(`   🔍 Reason: Likely fan-made or unauthorized content`);
  } else {
    console.log(`   🎮 Reason: Official game or no concerning indicators`);
  }
});

console.log('\n' + '=' .repeat(80));
console.log('✅ Content filter test completed!');
console.log('\nExpected results:');
console.log('- Official Final Fantasy, Mario, Mega Man games: ALLOWED');
console.log('- Fan-made/ROM hack/mod games: FILTERED');
console.log('- Unknown developers making protected franchise games: FILTERED');