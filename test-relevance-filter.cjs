// Test script to check if BotW passes relevance filter
const { calculateSearchRelevance } = (() => {
  function fuzzyMatchScore(query, text) {
    if (!query || !text) return 0;
    const q = query.toLowerCase();
    const t = text.toLowerCase();
    if (t === q) return 1;
    if (t.includes(q) || q.includes(t)) return 0.8;
    return 0;
  }

  function calculateSearchRelevance(game, searchQuery) {
    if (!searchQuery || !searchQuery.trim()) return 1;

    const query = searchQuery.toLowerCase().trim();
    const gameName = (game.name || '').toLowerCase();
    const developer = ((game).developer || '').toLowerCase();
    const publisher = ((game).publisher || '').toLowerCase();
    const summary = (game.summary || '').toLowerCase();
    const genres = Array.isArray(game.genres) ? game.genres.join(' ').toLowerCase() : '';

    let relevanceScore = 0;
    let maxPossibleScore = 0;

    // Fuzzy name match (highest relevance) - enhanced with fuzzy matching
    maxPossibleScore += 100;
    const fuzzyScore = fuzzyMatchScore(query, game.name || '');
    if (fuzzyScore > 0.8) {
      // High fuzzy match
      relevanceScore += 100 * fuzzyScore;
    } else if (gameName === query) {
      relevanceScore += 100;
    } else if (gameName.includes(query) || query.includes(gameName)) {
      // Calculate how much of the name matches
      const matchRatio = Math.min(query.length, gameName.length) / Math.max(query.length, gameName.length);
      relevanceScore += 100 * matchRatio;
    } else if (fuzzyScore > 0.3) {
      // Lower fuzzy match still gets some points
      relevanceScore += 100 * fuzzyScore * 0.7;
    }

    // Alternative names fuzzy matching (high relevance)
    maxPossibleScore += 80;
    if (game.alternative_names && Array.isArray(game.alternative_names)) {
      let bestAltScore = 0;
      for (const altName of game.alternative_names) {
        const altFuzzyScore = fuzzyMatchScore(query, altName.name || altName || '');
        bestAltScore = Math.max(bestAltScore, altFuzzyScore);
      }
      if (bestAltScore > 0.3) {
        relevanceScore += 80 * bestAltScore;
      }
    }

    // Query words in name (very high relevance) - enhanced for variations
    maxPossibleScore += 60;
    const queryWords = query.split(/\s+/);
    const nameWords = gameName.split(/\s+/);
    let nameWordMatches = 0;
    queryWords.forEach(queryWord => {
      if (nameWords.some(nameWord => {
        // Exact match
        if (nameWord.includes(queryWord) || queryWord.includes(nameWord)) return true;
        // Fuzzy match for individual words
        return fuzzyMatchScore(queryWord, nameWord) > 0.6;
      })) {
        nameWordMatches++;
      }
    });
    if (queryWords.length > 0) {
      relevanceScore += 60 * (nameWordMatches / queryWords.length);
    }

    // Developer/Publisher match (medium relevance)
    maxPossibleScore += 30;
    queryWords.forEach(queryWord => {
      if (developer.includes(queryWord) || publisher.includes(queryWord)) {
        relevanceScore += 30 / queryWords.length;
      }
    });

    // Summary/Description match (lower relevance)
    maxPossibleScore += 20;
    queryWords.forEach(queryWord => {
      if (summary.includes(queryWord)) {
        relevanceScore += 20 / queryWords.length;
      }
    });

    // Genre match (lowest relevance)
    maxPossibleScore += 10;
    queryWords.forEach(queryWord => {
      if (genres.includes(queryWord)) {
        relevanceScore += 10 / queryWords.length;
      }
    });

    // Calculate final relevance as percentage
    const finalRelevance = maxPossibleScore > 0 ? (relevanceScore / maxPossibleScore) : 0;
    
    return finalRelevance;
  }

  return { calculateSearchRelevance };
})();

// Test Breath of the Wild against "zelda" query
const botwGame = {
  id: 7346,
  name: "The Legend of Zelda: Breath of the Wild",
  alternative_names: [
    { name: "TLoZ BotW" },
    { name: "BotW" },
    { name: "Breath of the Wild" }
  ],
  summary: "Step into a world of discovery, exploration, and adventure in The Legend of Zelda: Breath of the Wild.",
  genres: ["Adventure", "Role-playing (RPG)"],
  developer: "Nintendo",
  publisher: "Nintendo"
};

console.log('Testing Breath of the Wild relevance for "zelda" query:\n');
console.log('Game:', botwGame.name);
console.log('Query: "zelda"');

const relevance = calculateSearchRelevance(botwGame, 'zelda');
console.log('\nRelevance score:', relevance);
console.log('Threshold (standard):', 0.12);
console.log('Threshold (franchise):', 0.08);
console.log('Would pass standard filter?', relevance >= 0.12 ? '✅ YES' : '❌ NO');
console.log('Would pass franchise filter?', relevance >= 0.08 ? '✅ YES' : '❌ NO');

// Test with other queries
console.log('\n--- Testing other queries ---');
const testQueries = ['breath', 'breath of the wild', 'botw', 'legend'];
testQueries.forEach(q => {
  const r = calculateSearchRelevance(botwGame, q);
  console.log(`Query "${q}": ${r.toFixed(3)} - ${r >= 0.12 ? '✅ PASS' : '❌ FAIL'}`);
});