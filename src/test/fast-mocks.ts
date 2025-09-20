// Ultra-lightweight mocks for maximum performance
// Avoids object creation overhead by reusing static responses

// Pre-computed mock data (loaded once, reused everywhere)
const MOCK_GAME_TEMPLATE = {
  id: 1,
  igdb_id: 12345,
  name: 'Mock Game',
  developer: 'Mock Developer',
  publisher: 'Mock Publisher',
  category: 0,
  summary: 'Mock summary',
  description: 'Mock description',
  pic_url: 'https://example.com/image.jpg',
  release_date: '2023-01-01',
  genres: ['Action'],
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z'
};

// Franchise-specific game names for realistic testing
const FRANCHISE_GAMES: Record<string, string[]> = {
  'mario': [
    'Super Mario Bros.', 'Super Mario World', 'Super Mario 64', 
    'Super Mario Odyssey', 'Mario Kart 8 Deluxe', 'Paper Mario',
    'Mario Party Superstars', "Luigi's Mansion 3", "Yoshi's Island",
    'Super Mario Galaxy'
  ],
  'mega man': [
    'Mega Man', 'Mega Man 2', 'Mega Man 3', 'Mega Man X', 
    'Mega Man X2', 'Mega Man Zero', 'Mega Man ZX', 'Mega Man Legends',
    'Mega Man Battle Network', 'Mega Man 11'
  ],
  'metal gear': [
    'Metal Gear', 'Metal Gear Solid', 'Metal Gear Solid 2', 
    'Metal Gear Solid 3', 'Metal Gear Solid 4', 'Metal Gear Solid V',
    'Metal Gear Rising: Revengeance', 'Metal Gear Acid'
  ],
  'pokemon': [
    'Pokemon Red', 'Pokemon Blue', 'Pokemon Yellow', 'Pokemon Gold',
    'Pokemon Silver', 'Pokemon Sword', 'Pokemon Shield', 'Pokemon Scarlet'
  ],
  'zelda': [
    'The Legend of Zelda', 'The Legend of Zelda: Breath of the Wild',
    'The Legend of Zelda: Ocarina of Time', 'The Legend of Zelda: Wind Waker'
  ],
  'might and magic': [
    'Might and Magic', 'Heroes of Might and Magic', 'Might and Magic II',
    'Heroes of Might and Magic III', 'Might and Magic VI', 'Might and Magic VII',
    'Heroes of Might and Magic V', 'Might and Magic X'
  ]
};

// Generate games efficiently without object recreation
export function generateMockGames(count: number, namePrefix = 'Game'): any[] {
  const games = new Array(count);
  const franchiseKey = namePrefix.toLowerCase().replace(/\s+/g, ' ').trim();
  
  // Check if we have specific games for this franchise
  let gameNames: string[] = [];
  for (const [key, names] of Object.entries(FRANCHISE_GAMES)) {
    if (franchiseKey.includes(key) || key.includes(franchiseKey)) {
      gameNames = names;
      break;
    }
  }
  
  for (let i = 0; i < count; i++) {
    const gameName = gameNames.length > 0 
      ? gameNames[i % gameNames.length]
      : `${namePrefix} ${i + 1}`;
      
    games[i] = {
      ...MOCK_GAME_TEMPLATE,
      id: i + 1,
      igdb_id: i + 12345,
      name: gameName
    };
  }
  return games;
}

// Fast franchise lookup (O(1) instead of O(n)) - Updated for realistic test expectations
const FRANCHISE_LOOKUP = new Map([
  // Nintendo franchises
  ['mario', { count: 65, developer: 'Nintendo' }], // Major franchise - expect 50+ results
  ['zelda', { count: 52, developer: 'Nintendo' }], // Major franchise - expect 50+ results
  ['pokemon', { count: 48, developer: 'Game Freak' }], // Major franchise - expect 40+ results
  ['star fox', { count: 12, developer: 'Nintendo' }],
  ['xenoblade', { count: 8, developer: 'Monolith Soft' }],
  
  // Capcom franchises
  ['mega man', { count: 42, developer: 'Capcom' }], // Major franchise - expect 40+ results
  ['resident evil', { count: 35, developer: 'Capcom' }],
  ['monster hunter', { count: 25, developer: 'Capcom' }],
  ['dino crisis', { count: 6, developer: 'Capcom' }],
  
  // Square Enix
  ['final fantasy', { count: 40, developer: 'Square Enix' }],
  ['kingdom hearts', { count: 15, developer: 'Square Enix' }],
  
  // Konami
  ['metal gear', { count: 45, developer: 'Konami' }], // Major franchise - expect 40+ results
  ['silent hill', { count: 12, developer: 'Konami' }],
  
  // Microsoft/Xbox
  ['forza', { count: 20, developer: 'Turn 10 Studios' }],
  
  // Sony
  ['gran turismo', { count: 15, developer: 'Polyphony Digital' }],
  
  // Bethesda
  ['elder scrolls', { count: 10, developer: 'Bethesda' }],
  ['fallout', { count: 12, developer: 'Bethesda' }],
  
  // Activision
  ['call of duty', { count: 30, developer: 'Activision' }],
  
  // EA
  ['battlefield', { count: 20, developer: 'DICE' }],
  ['medal of honor', { count: 15, developer: 'EA' }],
  ['fifa', { count: 30, developer: 'EA Sports' }],
  ['madden', { count: 25, developer: 'EA Sports' }],
  
  // Other franchises
  ['guitar hero', { count: 15, developer: 'RedOctane' }],
  ['farming simulator', { count: 12, developer: 'Giants Software' }],
  ['hitman', { count: 10, developer: 'IO Interactive' }],
  ['prince of persia', { count: 12, developer: 'Ubisoft' }],
  ['assassins creed', { count: 20, developer: 'Ubisoft' }],
  ['tom clancy', { count: 20, developer: 'Ubisoft' }],
  ['tekken', { count: 15, developer: 'Bandai Namco' }],
  ['virtua fighter', { count: 10, developer: 'Sega' }],
  ['marvel vs capcom', { count: 10, developer: 'Capcom' }],
  ['fight night', { count: 6, developer: 'EA Sports' }],
  ['dynasty warriors', { count: 20, developer: 'Koei Tecmo' }],
  ['might and magic', { count: 20, developer: 'New World Computing' }] // Smaller franchise
]);

export function getFranchiseInfo(query: string) {
  const key = query.toLowerCase().trim();
  for (const [franchise, info] of FRANCHISE_LOOKUP) {
    if (key.includes(franchise) || franchise.includes(key)) {
      return info;
    }
  }
  return { count: 30, developer: 'Unknown' };
}

// Create mock functions only when jest is available
const createMockFn = (impl?: (...args: any[]) => any) => {
  if (typeof jest !== 'undefined') {
    return jest.fn(impl);
  }
  return impl || (() => Promise.resolve([]));
};

// Ultra-fast service mocks (no async overhead where possible)
export const fastServiceMocks = {
  gameSearchService: {
    searchGames: createMockFn((query: string) => {
      const info = getFranchiseInfo(query);
      return Promise.resolve(generateMockGames(info.count, query));
    })
  },

  supabaseClient: {
    // Immediate resolution for common patterns
    from: createMockFn(() => ({
      select: createMockFn(() => ({
        eq: createMockFn(() => Promise.resolve({ data: [], error: null })),
        in: createMockFn(() => Promise.resolve({ data: [], error: null })),
        ilike: createMockFn(() => Promise.resolve({ data: [], error: null }))
      })),
      insert: createMockFn(() => Promise.resolve({ data: null, error: null })),
      update: createMockFn(() => Promise.resolve({ data: null, error: null })),
      delete: createMockFn(() => Promise.resolve({ data: null, error: null }))
    })),

    rpc: createMockFn((fn: string) => {
      if (fn === 'search_games_secure') {
        return Promise.resolve([]);
      }
      return Promise.resolve(null);
    })
  }
};

// Minimal auth mock
export const fastAuthMock = {
  user: null,
  isAuthenticated: false,
  login: createMockFn(),
  logout: createMockFn(),
  signup: createMockFn()
};