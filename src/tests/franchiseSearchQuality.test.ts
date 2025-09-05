/**
 * Franchise Search Quality Tests
 * Tests the search system to identify why popular games aren't appearing
 */

import { fuzzyMatchScore, normalizeTitle } from '../utils/fuzzySearch';

describe('Mario Franchise Search Quality', () => {
  const POPULAR_MARIO_GAMES = [
    'Super Mario Bros.',
    'Super Mario Bros. 2', 
    'Super Mario Bros. 3',
    'Super Mario World',
    'Super Mario 64',
    'Super Mario Sunshine',
    'New Super Mario Bros.',
    'Super Mario Galaxy',
    'Super Mario Galaxy 2',
    'Super Mario Odyssey'
  ];

  const MOCK_SEARCH_RESULTS = [
    { name: 'Mario & Sonic at the Olympic Games' },
    { name: 'Mario Kart Tour' },
    { name: 'Mario Party Superstars' },
    { name: 'Super Mario Bros.' },
    { name: 'Mario Tennis Aces' }
  ];

  test('should find most popular Mario games in search results', () => {
    let foundCount = 0;
    const foundGames = [];
    const missingGames = [];

    POPULAR_MARIO_GAMES.forEach(popularGame => {
      const found = MOCK_SEARCH_RESULTS.some(result => {
        const score = fuzzyMatchScore(popularGame, result.name);
        return score > 0.5; // Reasonable match threshold
      });
      
      if (found) {
        foundCount++;
        foundGames.push(popularGame);
      } else {
        missingGames.push(popularGame);
      }
    });

    console.log(`Mario Search Quality: ${foundCount}/${POPULAR_MARIO_GAMES.length} popular games found`);
    console.log('Found:', foundGames);
    console.log('Missing:', missingGames);

    // This test will likely fail, showing us the problem
    expect(foundCount).toBeGreaterThan(6); // Expect at least 60% of popular games
  });

  test('should rank flagship Mario games highly', () => {
    const flagshipGames = ['Super Mario Bros. 3', 'Super Mario 64', 'Super Mario Odyssey'];
    
    flagshipGames.forEach(flagshipGame => {
      const scores = MOCK_SEARCH_RESULTS.map(result => ({
        name: result.name,
        score: fuzzyMatchScore('mario', result.name)
      }));

      // Check if any flagship games would rank in top 3
      const topScores = scores.sort((a, b) => b.score - a.score).slice(0, 3);
      const flagshipInTop3 = topScores.some(result => 
        fuzzyMatchScore(flagshipGame, result.name) > 0.5
      );

      console.log(`${flagshipGame} ranking analysis:`, topScores);
      console.log(`${flagshipGame} in top 3: ${flagshipInTop3}`);
    });
  });
});

describe('Zelda Franchise Search Quality', () => {
  const POPULAR_ZELDA_GAMES = [
    'The Legend of Zelda',
    'Zelda II: The Adventure of Link',
    'The Legend of Zelda: A Link to the Past',
    'The Legend of Zelda: Link\'s Awakening',
    'The Legend of Zelda: Ocarina of Time',
    'The Legend of Zelda: Majora\'s Mask',
    'The Legend of Zelda: The Wind Waker',
    'The Legend of Zelda: Twilight Princess',
    'The Legend of Zelda: Breath of the Wild',
    'The Legend of Zelda: Tears of the Kingdom'
  ];

  const MOCK_ZELDA_RESULTS = [
    { name: 'The Legend of Zelda' },
    { name: 'Hyrule Warriors' },
    { name: 'The Legend of Zelda: Oracle of Ages' },
    { name: 'The Legend of Zelda: Oracle of Seasons' },
    { name: 'Zelda: Wand of Gamelon' } // CDi game
  ];

  test('should find core Zelda games in search results', () => {
    let foundCount = 0;
    const foundGames = [];
    const missingGames = [];

    POPULAR_ZELDA_GAMES.forEach(popularGame => {
      const found = MOCK_ZELDA_RESULTS.some(result => {
        const score = fuzzyMatchScore(popularGame, result.name);
        return score > 0.3; // Lower threshold for longer titles
      });
      
      if (found) {
        foundCount++;
        foundGames.push(popularGame);
      } else {
        missingGames.push(popularGame);
      }
    });

    console.log(`Zelda Search Quality: ${foundCount}/${POPULAR_ZELDA_GAMES.length} popular games found`);
    console.log('Found:', foundGames);
    console.log('Missing:', missingGames);

    expect(foundCount).toBeGreaterThan(7); // Expect at least 70% of popular games
  });
});

describe('Pokemon Franchise Search Quality', () => {
  const POPULAR_POKEMON_GAMES = [
    'Pokemon Red',
    'Pokemon Blue', 
    'Pokemon Green',
    'Pokemon Yellow',
    'Pokemon Gold',
    'Pokemon Silver',
    'Pokemon Crystal',
    'Pokemon Ruby',
    'Pokemon Sapphire',
    'Pokemon Emerald'
  ];

  test('should handle Pokemon search without crashing', () => {
    // Test that Pokemon searches don't return empty due to over-filtering
    const pokemonQuery = 'pokemon';
    const mockPokemonResults = [
      { name: 'Pokemon Stadium' },
      { name: 'Pokemon Mystery Dungeon' },
      { name: 'Pokemon GO' }
    ];

    let foundMainlineGames = 0;
    POPULAR_POKEMON_GAMES.forEach(game => {
      const found = mockPokemonResults.some(result => 
        fuzzyMatchScore(game, result.name) > 0.4
      );
      if (found) foundMainlineGames++;
    });

    console.log(`Pokemon mainline games found: ${foundMainlineGames}/${POPULAR_POKEMON_GAMES.length}`);
    
    // This will likely fail if Pokemon search is broken
    expect(foundMainlineGames).toBeGreaterThan(0);
  });
});

describe('Fuzzy Search Algorithm Testing', () => {
  test('should handle common title variations', () => {
    const variations = [
      ['Super Mario Bros. 3', 'Super Mario Brothers 3'],
      ['Super Mario Bros. 3', 'SMB3'],
      ['Super Mario 64', 'Mario 64'],
      ['Super Mario 64', 'SM64'],
      ['The Legend of Zelda: Ocarina of Time', 'Ocarina of Time'],
      ['The Legend of Zelda: Ocarina of Time', 'OoT'],
      ['Pokemon Red Version', 'Pokemon Red'],
      ['Metal Gear Solid', 'MGS']
    ];

    variations.forEach(([official, variation]) => {
      const score = fuzzyMatchScore(variation, official);
      console.log(`"${variation}" -> "${official}": ${score.toFixed(3)}`);
      expect(score).toBeGreaterThan(0.6); // Should recognize common variations
    });
  });

  test('should normalize titles correctly', () => {
    const normalizations = [
      ['Super Mario Bros.', 'super mario bros'],
      ['The Legend of Zelda: Breath of the Wild', 'the legend of zelda: breath of the wild'],
      ['Mega Man X', 'mega man x'],
      ['Baldur\'s Gate 3', 'baldurs gate iii']
    ];

    normalizations.forEach(([input, expected]) => {
      const normalized = normalizeTitle(input);
      console.log(`"${input}" -> "${normalized}"`);
      expect(normalized).toBe(expected);
    });
  });

  test('should identify when fuzzy matching is too restrictive', () => {
    // Test cases where fuzzy search might be failing
    const problematicCases = [
      { query: 'mario', title: 'Super Mario Galaxy', expectedMinScore: 0.7 },
      { query: 'mario', title: 'Super Mario Sunshine', expectedMinScore: 0.7 },
      { query: 'zelda', title: 'The Legend of Zelda: Majora\'s Mask', expectedMinScore: 0.6 },
      { query: 'pokemon', title: 'Pokemon Legends: Arceus', expectedMinScore: 0.8 }
    ];

    const failures = [];
    problematicCases.forEach(({ query, title, expectedMinScore }) => {
      const score = fuzzyMatchScore(query, title);
      console.log(`"${query}" -> "${title}": ${score.toFixed(3)} (min: ${expectedMinScore})`);
      
      if (score < expectedMinScore) {
        failures.push({ query, title, score, expectedMinScore });
      }
    });

    console.log(`Fuzzy search failures: ${failures.length}/${problematicCases.length}`);
    if (failures.length > 0) {
      console.log('Failed cases:', failures);
    }

    // This test will show us specific fuzzy search threshold issues
    expect(failures.length).toBeLessThan(2); // Allow some tolerance but flag major issues
  });
});

describe('Search Result Relevance Testing', () => {
  test('should prefer main series games over spin-offs', () => {
    const mainSeriesGames = [
      'Super Mario Bros.',
      'Super Mario Bros. 2', 
      'Super Mario Bros. 3',
      'Super Mario World',
      'Super Mario 64'
    ];

    const spinOffGames = [
      'Mario Party',
      'Mario Kart',
      'Mario Tennis',
      'Mario & Sonic at the Olympic Games'
    ];

    // Test that main series games get higher relevance for "mario" search
    mainSeriesGames.forEach(mainGame => {
      const mainScore = fuzzyMatchScore('mario', mainGame);
      
      spinOffGames.forEach(spinOff => {
        const spinOffScore = fuzzyMatchScore('mario', spinOff);
        console.log(`"${mainGame}": ${mainScore.toFixed(3)} vs "${spinOff}": ${spinOffScore.toFixed(3)}`);
        
        // Main series should generally score higher than spin-offs for generic franchise search
        if (mainScore <= spinOffScore) {
          console.warn(`⚠️ Ranking issue: "${spinOff}" scores higher than "${mainGame}" for "mario" search`);
        }
      });
    });
  });
});