#!/usr/bin/env node

// Test Content Filter with New Four-Tier System
// Since we can't directly import TS files, we'll test the logic concepts

console.log('🧪 Testing New Four-Tier Content Protection Filter');
console.log('=' .repeat(80));

// Simulate the game data structure and testing
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
  
  // Fan-made games (should be filtered for aggressive companies)
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
  },
  
  // Bethesda game (MOD_FRIENDLY - should allow fan content)
  {
    id: 104,
    name: "Skyrim: Epic Dragons Mod",
    developer: "Modding Community",
    publisher: "Bethesda Softworks", // Mods often still have original publisher
    summary: "A comprehensive mod for Skyrim adding new dragons"
  },
  
  // Official Bethesda game (should never be filtered)
  {
    id: 105,
    name: "The Elder Scrolls V: Skyrim",
    developer: "Bethesda Game Studios",
    publisher: "Bethesda Softworks",
    summary: "Official Skyrim game"
  }
];

// Simulate the copyright levels based on our policy mapping
const COPYRIGHT_LEVELS = {
  BLOCK_ALL: 'BLOCK_ALL',
  AGGRESSIVE: 'AGGRESSIVE', 
  MODERATE: 'MODERATE',
  MOD_FRIENDLY: 'MOD_FRIENDLY'
};

// Simulate company policies
const COMPANY_POLICIES = {
  'square enix': COPYRIGHT_LEVELS.AGGRESSIVE,
  'square': COPYRIGHT_LEVELS.AGGRESSIVE,
  'nintendo': COPYRIGHT_LEVELS.AGGRESSIVE,
  'nintendo r&d2': COPYRIGHT_LEVELS.AGGRESSIVE,
  'capcom': COPYRIGHT_LEVELS.AGGRESSIVE,
  'bethesda game studios': COPYRIGHT_LEVELS.MOD_FRIENDLY,
  'bethesda softworks': COPYRIGHT_LEVELS.MOD_FRIENDLY,
  'unknown': COPYRIGHT_LEVELS.MODERATE,
  'fan developer': COPYRIGHT_LEVELS.MODERATE,
  'indie studio': COPYRIGHT_LEVELS.MODERATE,
  'community developer': COPYRIGHT_LEVELS.MODERATE,
  'modding community': COPYRIGHT_LEVELS.MODERATE
};

// Official companies that should never be filtered
const OFFICIAL_COMPANIES = [
  'square enix', 'square', 'nintendo', 'nintendo r&d2', 'capcom', 
  'bethesda game studios', 'bethesda softworks'
];

// Fan content indicators
const FAN_INDICATORS = ['mod', 'fan', 'hack', 'rom hack', 'fan-made', 'fan made'];

function getCompanyCopyrightLevel(company) {
  if (!company) return COPYRIGHT_LEVELS.MODERATE;
  const normalized = company.toLowerCase();
  return COMPANY_POLICIES[normalized] || COPYRIGHT_LEVELS.MODERATE;
}

function isOfficialCompany(game) {
  const dev = (game.developer || '').toLowerCase();
  const pub = (game.publisher || '').toLowerCase();
  return OFFICIAL_COMPANIES.some(company => dev.includes(company) || pub.includes(company));
}

function hasFanIndicators(game) {
  const searchText = [game.name, game.developer, game.publisher, game.summary]
    .filter(Boolean).join(' ').toLowerCase();
  return FAN_INDICATORS.some(indicator => searchText.includes(indicator));
}

function simulateFilteringLogic(game) {
  const companies = [game.developer, game.publisher].filter(Boolean);
  const searchText = [game.name, game.developer, game.publisher, game.summary]
    .filter(Boolean).join(' ').toLowerCase();
  
  // Find the most restrictive copyright level from involved companies
  let maxLevel = COPYRIGHT_LEVELS.MODERATE;
  let responsibleCompany = '';
  
  for (const company of companies) {
    const level = getCompanyCopyrightLevel(company);
    
    // Priority: BLOCK_ALL > AGGRESSIVE > MODERATE > MOD_FRIENDLY
    if (level === COPYRIGHT_LEVELS.BLOCK_ALL) {
      maxLevel = level;
      responsibleCompany = company;
    } else if (level === COPYRIGHT_LEVELS.AGGRESSIVE && maxLevel !== COPYRIGHT_LEVELS.BLOCK_ALL) {
      maxLevel = level;
      responsibleCompany = company;
    } else if (level === COPYRIGHT_LEVELS.MOD_FRIENDLY && 
               maxLevel !== COPYRIGHT_LEVELS.BLOCK_ALL && 
               maxLevel !== COPYRIGHT_LEVELS.AGGRESSIVE) {
      maxLevel = level;
      responsibleCompany = company;
    } else if (!responsibleCompany) {
      maxLevel = level;
      responsibleCompany = company;
    }
  }
  
  const hasExplicitFanContent = hasFanIndicators(game);
  const isOfficial = isOfficialCompany(game);
  
  switch (maxLevel) {
    case COPYRIGHT_LEVELS.BLOCK_ALL:
      return { filtered: true, reason: `BLOCKED ALL content from ${responsibleCompany}` };
      
    case COPYRIGHT_LEVELS.AGGRESSIVE:
      if (isOfficial) {
        return { filtered: false, reason: `Official game allowed despite aggressive company: ${responsibleCompany}` };
      }
      if (hasExplicitFanContent) {
        return { filtered: true, reason: `Aggressive filtering: Fan content by ${responsibleCompany}` };
      }
      return { filtered: false, reason: `Allowed by aggressive company: ${responsibleCompany}` };
      
    case COPYRIGHT_LEVELS.MODERATE:
      if (hasExplicitFanContent) {
        return { filtered: true, reason: `Moderate filtering: Explicit fan content` };
      }
      return { filtered: false, reason: `Moderate policy allows this content` };
      
    case COPYRIGHT_LEVELS.MOD_FRIENDLY:
      // Bethesda-style: allow almost everything including mods
      return { filtered: false, reason: `Mod-friendly company supports fan content: ${responsibleCompany}` };
      
    default:
      if (hasExplicitFanContent) {
        return { filtered: true, reason: `Default filtering: Fan content by unknown policy` };
      }
      return { filtered: false, reason: `Default policy allows this content` };
  }
}

console.log('Testing games with new four-tier filtering system:\n');

testGames.forEach((game, index) => {
  const result = simulateFilteringLogic(game);
  const status = result.filtered ? '🛡️  FILTERED' : '✅ ALLOWED';
  
  console.log(`${index + 1}. ${status}: "${game.name}"`);
  console.log(`   Developer: ${game.developer}`);
  console.log(`   Publisher: ${game.publisher}`);
  console.log(`   🔍 ${result.reason}`);
  console.log('');
});

console.log('=' .repeat(80));
console.log('✅ Four-tier filtering test completed!');
console.log('\nExpected behavior:');
console.log('- Official games from any company: ALLOWED');
console.log('- Fan content from AGGRESSIVE companies (Nintendo, Square, Capcom): FILTERED');
console.log('- Fan content from MOD_FRIENDLY companies (Bethesda): ALLOWED');
console.log('- Fan content from MODERATE companies: FILTERED if explicit indicators');
console.log('- BLOCK_ALL companies: Everything filtered (none in test)');