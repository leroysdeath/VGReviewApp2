// Test if fan content should be hidden for Nintendo games
import { getCompanyCopyrightLevel } from './src/utils/copyrightPolicies.ts';

// Test games Zelda (1022) and Super Mario 64 (1074)
const testGames = [
  {
    id: 1022,
    name: "The Legend of Zelda",
    developer: "Nintendo R&D4",
    publisher: "Nintendo",
    summary: "The first game in the Legend of Zelda series"
  },
  {
    id: 1074, 
    name: "Super Mario 64",
    developer: "Nintendo EAD",
    publisher: "Nintendo",
    summary: "3D platformer starring Mario"
  },
  {
    id: 1234,
    name: "Some Indie Game",
    developer: "Indie Developer", 
    publisher: "Independent",
    summary: "An indie game"
  }
];

console.log('🧪 Testing fan content hiding for Nintendo games:\n');

testGames.forEach(game => {
  console.log(`Game: "${game.name}"`);
  console.log(`  Developer: ${game.developer}`);
  console.log(`  Publisher: ${game.publisher}`);
  
  // Check copyright level for developer
  const devLevel = getCompanyCopyrightLevel(game.developer);
  const pubLevel = getCompanyCopyrightLevel(game.publisher);
  
  console.log(`  Developer copyright level: ${devLevel}`);
  console.log(`  Publisher copyright level: ${pubLevel}`);
  
  const shouldHide = devLevel === 'AGGRESSIVE' || devLevel === 'BLOCK_ALL' || 
                    pubLevel === 'AGGRESSIVE' || pubLevel === 'BLOCK_ALL';
  
  console.log(`  ${shouldHide ? '🛡️ HIDE fan content' : '✅ SHOW fan content'}`);
  console.log('');
});