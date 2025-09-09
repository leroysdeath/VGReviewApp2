// Phase 2 optimized test utilities 
import { server } from './global-setup';
import { fastServiceMocks } from './fast-mocks';
import { SHARED_FIXTURES, clearFixtureCache } from './shared-fixtures';
import { selectMockScenario, setupMocksForTest } from './selective-mocks';

// Ultra-fast reset (no server recreation)
export function resetMSWHandlers() {
  server.resetHandlers();
}

// Optimized test environment setup
export function createTestEnvironment(testType: 'unit' | 'integration' | 'performance' = 'unit') {
  const mocks = setupMocksForTest(testType);
  
  return {
    // Use shared constants
    userId: SHARED_FIXTURES.TEST_USER_ID,
    gameId: SHARED_FIXTURES.TEST_GAME_ID,
    timestamp: SHARED_FIXTURES.MOCK_TIMESTAMP,
    
    // Fast operations
    resetHandlers: resetMSWHandlers,
    clearCache: clearFixtureCache,
    
    // Selective mocking
    enabledMocks: mocks,
    
    // Performance optimized mocks
    mocks: fastServiceMocks
  };
}

// Quick test setup for common patterns
export const testSetup = {
  // Fastest - minimal mocks
  unit: () => createTestEnvironment('unit'),
  
  // Balanced - realistic but fast
  integration: () => createTestEnvironment('integration'),
  
  // Comprehensive - for performance testing
  performance: () => createTestEnvironment('performance')
};

// Smart mock auto-selection
export function autoMock(testName: string) {
  return selectMockScenario(testName);
}

// Batch operations for efficiency
export const batchOperations = {
  // Set up multiple mocks at once
  setupMocks: (mockConfigs: Array<{ name: string; implementation: jest.Mock }>) => {
    mockConfigs.forEach(({ name, implementation }) => {
      jest.mocked(implementation);
    });
  },
  
  // Reset multiple mocks efficiently
  resetMocks: (...mocks: jest.Mock[]) => {
    mocks.forEach(mock => mock.mockReset());
  },
  
  // Clear multiple mocks
  clearMocks: (...mocks: jest.Mock[]) => {
    mocks.forEach(mock => mock.mockClear());
  }
};