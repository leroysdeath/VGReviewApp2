// Test script for enhanced franchise-based filtering
// Test with: node test-franchise-filtering.js

console.log('🧪 Testing Enhanced Franchise-Based Filtering...\n');

// Mock the filtering functions for testing
const mockTestCases = [
  // Case 1: Nintendo mod with category 5 - should be FILTERED
  {
    id: 1,
    name: "Metroid mod: Samus Goes to the Fridge to Get a Glass of Milk",
    developer: "Fan Developer",
    publisher: "Homebrew",
    category: 5, // IGDB Category 5 = Mod
    summary: "A humorous mod for Metroid where Samus goes to get milk",
    expectedResult: "FILTERED",
    expectedReason: "Nintendo franchise (AGGRESSIVE) + Category 5 (Mod)"
  },
  
  // Case 2: Official Nintendo game - should be ALLOWED
  {
    id: 2,
    name: "Metroid Prime Remastered",
    developer: "Retro Studios",
    publisher: "Nintendo",
    category: 0, // IGDB Category 0 = Main Game
    summary: "Official remaster of Metroid Prime",
    expectedResult: "ALLOWED",
    expectedReason: "Official Nintendo game"
  },
  
  // Case 3: Bethesda mod with category 5 - should be ALLOWED (MOD_FRIENDLY)
  {
    id: 3,
    name: "Skyrim: Thomas the Tank Engine Mod",
    developer: "Community Modder",
    publisher: "Nexus Mods", 
    category: 5, // IGDB Category 5 = Mod
    summary: "Popular Skyrim mod replacing dragons with Thomas the Tank Engine",
    expectedResult: "ALLOWED",
    expectedReason: "Bethesda is MOD_FRIENDLY, allows category 5"
  },
  
  // Case 4: Square Enix franchise mod - should be FILTERED
  {
    id: 4,
    name: "Final Fantasy VII: Last Order",
    developer: "Fan Studio",
    publisher: "Independent",
    category: 5, // IGDB Category 5 = Mod
    summary: "Unofficial remake of Final Fantasy VII",
    expectedResult: "FILTERED",
    expectedReason: "Square Enix franchise (AGGRESSIVE) + Category 5 (Mod)"
  }
];

console.log('Test Cases:');
mockTestCases.forEach((testCase, index) => {
  console.log(`${index + 1}. ${testCase.name}`);
  console.log(`   Developer: ${testCase.developer}`);
  console.log(`   Publisher: ${testCase.publisher}`);
  console.log(`   Category: ${testCase.category} (${getCategoryLabel(testCase.category)})`);
  console.log(`   Expected: ${testCase.expectedResult}`);
  console.log(`   Reason: ${testCase.expectedReason}`);
  console.log('');
});

// Helper function to get category label
function getCategoryLabel(category) {
  const labels = {
    0: 'Main game',
    1: 'DLC/Add-on', 
    2: 'Expansion',
    3: 'Bundle',
    4: 'Standalone expansion',
    5: 'Mod',
    6: 'Episode',
    7: 'Season',
    8: 'Remake',
    9: 'Remaster',
    10: 'Expanded game',
    11: 'Port',
    12: 'Fork',
    13: 'Pack',
    14: 'Update'
  };
  return labels[category] || 'Unknown';
}

console.log('✅ Test cases prepared!');
console.log('🎯 The new filtering logic should:');
console.log('1. Detect "metroid" in the name and identify Nintendo as franchise owner');
console.log('2. Override developer/publisher copyright level with Nintendo AGGRESSIVE level');
console.log('3. Block category 5 (Mod) content for AGGRESSIVE companies');
console.log('4. Allow category 5 (Mod) content for MOD_FRIENDLY companies like Bethesda');
console.log('');
console.log('📋 Key enhancement: Franchise detection now happens BEFORE copyright level determination');
console.log('📋 This ensures fan-made Nintendo content gets Nintendo\'s AGGRESSIVE filtering');