/**
 * Game Type Scoring System
 * Boosts games based on genre relevance to search franchise
 */

interface GameTypeBoost {
  score: number;
  reason: string;
}

/**
 * Calculate game type relevance boost based on franchise and genres
 */
export function calculateGameTypeBoost(game: any, searchQuery: string): GameTypeBoost {
  if (!searchQuery || !game.genres) {
    return { score: 0, reason: 'No search query or genres' };
  }

  const query = searchQuery.toLowerCase().trim();
  const genres = game.genres.map((g: any) => (g.name || g).toLowerCase());
  
  // Detect franchise from search query
  const franchise = detectSearchFranchise(query);
  if (!franchise) {
    return { score: 0, reason: 'No franchise detected' };
  }

  return calculateFranchiseGenreBoost(franchise, genres);
}

/**
 * Detect franchise from search query
 */
function detectSearchFranchise(query: string): string | null {
  const franchisePatterns = {
    mario: ['mario', 'super mario'],
    zelda: ['zelda', 'legend of zelda'],
    metroid: ['metroid'],
    pokemon: ['pokemon', 'pokémon'],
    'final fantasy': ['final fantasy', 'ff'],
    'street fighter': ['street fighter'],
    'mega man': ['mega man', 'megaman'],
    sonic: ['sonic'],
    'metal gear': ['metal gear'],
    halo: ['halo'],
    'god of war': ['god of war'],
    witcher: ['witcher'],
    fallout: ['fallout'],
    elderscrolls: ['elder scrolls', 'skyrim'],
    assassins: ['assassins creed', 'assassin'],
    'grand theft auto': ['gta', 'grand theft auto'],
    battlefield: ['battlefield'],
    'call of duty': ['call of duty', 'cod']
  };

  for (const [franchise, patterns] of Object.entries(franchisePatterns)) {
    if (patterns.some(pattern => query.includes(pattern))) {
      return franchise;
    }
  }

  return null;
}

/**
 * Calculate genre relevance boost for specific franchises
 */
function calculateFranchiseGenreBoost(franchise: string, genres: string[]): GameTypeBoost {
  const franchiseGenreMap: Record<string, { preferred: string[], bonus: number, penalty: string[] }> = {
    mario: {
      preferred: ['platform', 'platformer', 'adventure', 'action'],
      bonus: 50,
      penalty: ['party', 'sports', 'fighting'] // Unless specifically searching for Mario Party
    },
    zelda: {
      preferred: ['adventure', 'action', 'action-adventure', 'role-playing game'],
      bonus: 50,
      penalty: ['fighting', 'racing', 'party']
    },
    pokemon: {
      preferred: ['role-playing game', 'rpg', 'adventure', 'turn-based strategy'],
      bonus: 40,
      penalty: ['fighting', 'racing', 'party']
    },
    metroid: {
      preferred: ['action', 'adventure', 'platformer', 'shooter'],
      bonus: 45,
      penalty: ['party', 'racing', 'fighting']
    },
    'final fantasy': {
      preferred: ['role-playing game', 'rpg', 'jrpg', 'adventure'],
      bonus: 45,
      penalty: ['fighting', 'racing', 'party']
    },
    'street fighter': {
      preferred: ['fighting', 'arcade', 'action'],
      bonus: 45,
      penalty: ['role-playing game', 'adventure', 'platformer']
    },
    'mega man': {
      preferred: ['platformer', 'action', 'shooter'],
      bonus: 45,
      penalty: ['rpg', 'racing', 'party']
    },
    sonic: {
      preferred: ['platformer', 'action', 'adventure'],
      bonus: 45,
      penalty: ['rpg', 'party', 'fighting']
    },
    'metal gear': {
      preferred: ['action', 'stealth', 'adventure', 'tactical'],
      bonus: 45,
      penalty: ['racing', 'party', 'sports']
    },
    halo: {
      preferred: ['shooter', 'first-person shooter', 'action', 'sci-fi'],
      bonus: 45,
      penalty: ['rpg', 'platformer', 'party']
    },
    'god of war': {
      preferred: ['action', 'adventure', 'hack and slash'],
      bonus: 45,
      penalty: ['racing', 'party', 'sports']
    },
    witcher: {
      preferred: ['role-playing game', 'rpg', 'action', 'adventure'],
      bonus: 45,
      penalty: ['racing', 'party', 'sports']
    },
    fallout: {
      preferred: ['role-playing game', 'rpg', 'action', 'adventure', 'post-apocalyptic'],
      bonus: 45,
      penalty: ['racing', 'party', 'sports']
    },
    elderscrolls: {
      preferred: ['role-playing game', 'rpg', 'adventure', 'fantasy'],
      bonus: 45,
      penalty: ['racing', 'party', 'sports']
    },
    assassins: {
      preferred: ['action', 'adventure', 'stealth', 'open world'],
      bonus: 45,
      penalty: ['racing', 'party', 'sports']
    },
    'grand theft auto': {
      preferred: ['action', 'adventure', 'open world', 'crime'],
      bonus: 45,
      penalty: ['rpg', 'party', 'sports']
    },
    battlefield: {
      preferred: ['shooter', 'first-person shooter', 'action', 'war'],
      bonus: 45,
      penalty: ['rpg', 'platformer', 'party']
    },
    'call of duty': {
      preferred: ['shooter', 'first-person shooter', 'action', 'war'],
      bonus: 45,
      penalty: ['rpg', 'platformer', 'party']
    }
  };

  const franchiseConfig = franchiseGenreMap[franchise];
  if (!franchiseConfig) {
    return { score: 0, reason: `No genre mapping for franchise: ${franchise}` };
  }

  // Check for preferred genres
  const hasPreferredGenre = franchiseConfig.preferred.some(preferredGenre => 
    genres.some(genre => genre.includes(preferredGenre) || preferredGenre.includes(genre))
  );

  if (hasPreferredGenre) {
    const matchedGenre = franchiseConfig.preferred.find(preferredGenre => 
      genres.some(genre => genre.includes(preferredGenre) || preferredGenre.includes(genre))
    );
    return { 
      score: franchiseConfig.bonus, 
      reason: `${franchise} franchise prefers ${matchedGenre} games` 
    };
  }

  // Check for penalty genres (reduce score)
  const hasPenaltyGenre = franchiseConfig.penalty.some(penaltyGenre => 
    genres.some(genre => genre.includes(penaltyGenre) || penaltyGenre.includes(genre))
  );

  if (hasPenaltyGenre) {
    const matchedPenalty = franchiseConfig.penalty.find(penaltyGenre => 
      genres.some(genre => genre.includes(penaltyGenre) || penaltyGenre.includes(genre))
    );
    return { 
      score: -20, 
      reason: `${franchise} franchise penalizes ${matchedPenalty} games` 
    };
  }

  return { score: 0, reason: `Neutral genres for ${franchise} franchise` };
}

/**
 * Apply game type boost to games based on search franchise relevance
 */
export function applyGameTypeBoost(games: any[], searchQuery: string): any[] {
  return games.map(game => {
    const boost = calculateGameTypeBoost(game, searchQuery);
    
    if (boost.score !== 0) {
      console.log(`🎯 Game type boost: "${game.name}" ${boost.score > 0 ? '+' : ''}${boost.score} (${boost.reason})`);
      
      // Store boost for prioritization system
      (game as any)._gameTypeBoost = boost.score;
      (game as any)._gameTypeReason = boost.reason;
    }
    
    return game;
  });
}

/**
 * Calculate Olympic/Party game penalty for core franchise searches
 */
export function calculateOlympicPartyPenalty(game: any, searchQuery: string): number {
  const gameName = game.name?.toLowerCase() || '';
  const query = searchQuery.toLowerCase();
  
  // Don't penalize if user is specifically searching for Olympic or Party games
  if (query.includes('olympic') || query.includes('party')) {
    return 0;
  }
  
  // Penalize Olympic games for core franchise searches
  if (gameName.includes('olympic')) {
    return -30;
  }
  
  // Penalize party games for non-party franchise searches
  if (gameName.includes('party') && !query.includes('party')) {
    return -25;
  }
  
  // Penalize sports games for platformer franchises
  const isPlatformerFranchise = ['mario', 'sonic', 'mega man'].some(franchise => 
    query.includes(franchise)
  );
  if (isPlatformerFranchise && game.genres?.some((g: any) => 
    (g.name || g).toLowerCase().includes('sport'))) {
    return -20;
  }
  
  return 0;
}

/**
 * Apply Olympic/Party penalty to reduce priority of irrelevant games
 */
export function applyOlympicPartyPenalty(games: any[], searchQuery: string): any[] {
  return games.map(game => {
    const penalty = calculateOlympicPartyPenalty(game, searchQuery);
    
    if (penalty < 0) {
      console.log(`🏴 Olympic/Party penalty: "${game.name}" ${penalty} (reduced priority for core franchise search)`);
      (game as any)._olympicPartyPenalty = penalty;
    }
    
    return game;
  });
}