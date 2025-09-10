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

// Generate games efficiently without object recreation
export function generateMockGames(count: number, namePrefix = 'Game'): any[] {
  const games = new Array(count);
  for (let i = 0; i < count; i++) {
    games[i] = {
      ...MOCK_GAME_TEMPLATE,
      id: i + 1,
      igdb_id: i + 12345,
      name: `${namePrefix} ${i + 1}`
    };
  }
  return games;
}

// Fast franchise lookup (O(1) instead of O(n))
const FRANCHISE_LOOKUP = new Map([
  ['mario', { count: 47, developer: 'Nintendo' }],
  ['zelda', { count: 35, developer: 'Nintendo' }],
  ['pokemon', { count: 29, developer: 'Game Freak' }],
  ['mega man', { count: 19, developer: 'Capcom' }],
  ['metal gear', { count: 8, developer: 'Konami' }]
]);

export function getFranchiseInfo(query: string) {
  const key = query.toLowerCase().trim();
  for (const [franchise, info] of FRANCHISE_LOOKUP) {
    if (key.includes(franchise) || franchise.includes(key)) {
      return info;
    }
  }
  return { count: 5, developer: 'Unknown' };
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