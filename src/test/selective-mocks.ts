// Selective mocking strategy - only mock what's actually used
// Avoids over-mocking and reduces test setup overhead

// Mock only external dependencies, not internal business logic
export const selectiveMocks = {
  // Only mock network calls, not business logic
  supabase: {
    shouldMock: true,
    reason: 'External service - network calls'
  },
  
  igdbService: {
    shouldMock: true, 
    reason: 'External API - network calls'
  },
  
  // Don't mock internal utilities - let them run
  gameSearchService: {
    shouldMock: false,
    reason: 'Internal business logic - should be tested'
  },
  
  contentProtectionFilter: {
    shouldMock: false,
    reason: 'Core business logic - should be tested'  
  },
  
  franchiseDetection: {
    shouldMock: false,
    reason: 'Core business logic - should be tested'
  }
};

// Conditional mock setup based on test type
export function setupMocksForTest(testType: 'unit' | 'integration' | 'performance') {
  const mocks: string[] = [];
  
  switch (testType) {
    case 'unit':
      // Mock everything external for fast, isolated tests
      mocks.push('supabase', 'igdbService', 'gameSearchService');
      break;
      
    case 'integration': 
      // Only mock external services, test integration logic
      mocks.push('supabase', 'igdbService');
      break;
      
    case 'performance':
      // Mock only network calls to avoid timing variability
      mocks.push('supabase', 'igdbService');
      break;
  }
  
  return mocks;
}

// Create mock functions safely
const safeMockFn = (impl?: (...args: any[]) => any) => {
  if (typeof jest !== 'undefined') {
    return jest.fn(impl);
  }
  return impl || (() => Promise.resolve(null));
};

// Fast mock implementations for specific test scenarios
export const scenarioMocks = {
  // For tests that just need "something returned"
  minimal: {
    searchGames: safeMockFn(() => Promise.resolve([])),
    getUser: safeMockFn(() => Promise.resolve(null)),
    addReview: safeMockFn(() => Promise.resolve({ success: true }))
  },
  
  // For tests that need realistic data
  realistic: {
    searchGames: safeMockFn((query: string) => 
      Promise.resolve([{ id: 1, name: `${query} Game 1` }])
    ),
    getUser: safeMockFn(() => Promise.resolve({ id: 'user1', email: 'test@test.com' })),
    addReview: safeMockFn(() => Promise.resolve({ success: true, id: 123 }))
  },
  
  // For tests that need to simulate errors
  error: {
    searchGames: safeMockFn(() => Promise.reject(new Error('Search failed'))),
    getUser: safeMockFn(() => Promise.reject(new Error('Auth failed'))),
    addReview: safeMockFn(() => Promise.resolve({ success: false, error: 'Validation failed' }))
  }
};

// Smart mock selector based on test name/description
export function selectMockScenario(testName: string) {
  if (testName.includes('error') || testName.includes('fail')) {
    return scenarioMocks.error;
  }
  
  if (testName.includes('integration') || testName.includes('realistic')) {
    return scenarioMocks.realistic;
  }
  
  return scenarioMocks.minimal; // Default to fastest
}

// Performance-focused mock utilities
export const performanceMocks = {
  // Immediate resolution (no Promise overhead)
  immediateSuccess: (result: any = null) => safeMockFn(() => result),
  immediateFailure: (error: any = null) => safeMockFn(() => { throw error; }),
  
  // Cached responses (compute once, reuse)
  cachedResponse: (() => {
    const cache = new Map();
    return (key: string, generator: () => any) => {
      if (!cache.has(key)) {
        cache.set(key, generator());
      }
      return safeMockFn(() => cache.get(key));
    };
  })()
};