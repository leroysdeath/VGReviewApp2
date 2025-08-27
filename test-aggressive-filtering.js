// Quick test script for enhanced AGGRESSIVE filtering
// Run with: node test-aggressive-filtering.js

// Mock console.log to capture test output
const originalLog = console.log;
const testOutput = [];

console.log = (...args) => {
  const message = args.join(' ');
  testOutput.push(message);
  originalLog(message);
};

// Import the enhanced filtering functions
import { 
  testEnhancedAggressiveFiltering, 
  testModDetectionPatterns,
  findFranchiseOwner,
  isAuthorizedPublisher
} from './src/utils/contentProtectionFilter.js';

async function runTests() {
  console.log('🚀 Starting Enhanced AGGRESSIVE Filtering Tests...\n');
  
  // Test 1: Mod Detection Patterns
  console.log('='.repeat(50));
  testModDetectionPatterns();
  console.log('='.repeat(50));
  
  // Test 2: Full AGGRESSIVE Filtering
  console.log('\n' + '='.repeat(50));
  testEnhancedAggressiveFiltering();
  console.log('='.repeat(50));
  
  // Test 3: Individual Component Tests
  console.log('\n🔧 Individual Component Tests:');
  
  // Test franchise detection
  const testGame = {
    id: 1,
    name: "Metroid mod: Samus Goes to the Fridge",
    developer: "Fan Developer",
    publisher: "Homebrew",
    summary: "A humorous mod for Metroid"
  };
  
  const franchiseOwner = findFranchiseOwner(testGame);
  console.log(`🎯 Franchise Owner for "${testGame.name}": ${franchiseOwner}`);
  
  if (franchiseOwner) {
    const isAuthorized = isAuthorizedPublisher(testGame.developer, testGame.publisher, franchiseOwner);
    console.log(`🔐 Is Authorized: ${isAuthorized}`);
  }
  
  console.log('\n✅ All tests completed!');
  console.log(`📊 Generated ${testOutput.length} test log entries`);
}

// Run the tests
runTests().catch(console.error);