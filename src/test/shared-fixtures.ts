// Shared test fixtures - loaded once, cached for all tests
// Reduces memory allocation and object creation overhead

// Cache for expensive operations
const fixtureCache = new Map<string, any>();

// Pre-built common test data
export const SHARED_FIXTURES = {
  // Common franchise data (static, no recreation needed)
  MARIO_GAMES: [
    'Super Mario Bros.', 'Super Mario World', 'Super Mario 64', 'Super Mario Odyssey',
    'Mario Kart 8 Deluxe', 'Paper Mario', 'Mario Party Superstars', "Luigi's Mansion 3"
  ],

  ZELDA_GAMES: [
    'Breath of the Wild', 'Tears of the Kingdom', 'Ocarina of Time', "Majora's Mask",
    'Wind Waker', "Link's Awakening", 'A Link to the Past', 'Twilight Princess'
  ],

  POKEMON_GAMES: [
    'Pokemon Red', 'Pokemon Blue', 'Pokemon Yellow', 'Pokemon Gold', 'Pokemon Silver',
    'Pokemon Crystal', 'Pokemon Sword', 'Pokemon Shield', 'Pokemon Scarlet', 'Pokemon Violet'
  ],

  // Common test constants
  TEST_USER_ID: 'test-user-123',
  TEST_GAME_ID: 12345,
  MOCK_TIMESTAMP: '2023-01-01T00:00:00Z',
  
  // Response templates (reused, not recreated)
  SUCCESS_RESPONSE: { success: true, error: null },
  ERROR_RESPONSE: { success: false, error: 'Mock error' },
  EMPTY_DATA_RESPONSE: { data: [], error: null }
};

// Cached fixture generators (expensive operations done once)
export function getSharedFixture<T>(key: string, generator: () => T): T {
  if (!fixtureCache.has(key)) {
    fixtureCache.set(key, generator());
  }
  return fixtureCache.get(key);
}

// Pre-generated mock objects for common patterns
export const MOCK_TEMPLATES = {
  user: {
    id: SHARED_FIXTURES.TEST_USER_ID,
    email: 'test@example.com',
    username: 'testuser',
    created_at: SHARED_FIXTURES.MOCK_TIMESTAMP
  },

  game: {
    id: SHARED_FIXTURES.TEST_GAME_ID,
    igdb_id: SHARED_FIXTURES.TEST_GAME_ID + 10000,
    name: 'Test Game',
    developer: 'Test Developer',
    category: 0,
    created_at: SHARED_FIXTURES.MOCK_TIMESTAMP
  },

  review: {
    id: 1,
    user_id: SHARED_FIXTURES.TEST_USER_ID,
    game_id: SHARED_FIXTURES.TEST_GAME_ID,
    rating: 4.5,
    title: 'Great game!',
    content: 'Really enjoyed this game.',
    created_at: SHARED_FIXTURES.MOCK_TIMESTAMP
  }
};

// Fast array generators (avoid repeated object creation)
export function generateMockArray<T>(
  template: T, 
  count: number, 
  modifier?: (item: T, index: number) => Partial<T>
): T[] {
  const cacheKey = `array_${count}_${JSON.stringify(template)}`;
  return getSharedFixture(cacheKey, () => {
    const result = new Array(count);
    for (let i = 0; i < count; i++) {
      result[i] = modifier 
        ? { ...template, ...modifier(template, i) }
        : { ...template, id: i + 1 };
    }
    return result;
  });
}

// Clear cache when needed (for test isolation)
export function clearFixtureCache() {
  fixtureCache.clear();
}