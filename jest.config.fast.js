/** @type {import('jest').Config} */
// Fast development configuration - optimized for speed
export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
    customExportConditions: [''],
  },
  
  // Aggressive performance settings
  maxWorkers: '75%',
  cache: true,
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',
  
  // Global setup (reuse from Phase 1)
  globalSetup: '<rootDir>/src/test/global-setup.ts',
  globalTeardown: '<rootDir>/src/test/global-teardown.ts',
  
  setupFiles: ['<rootDir>/src/test/jest-setup.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup-basic.ts'],
  
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^.*\\/services\\/supabase$': '<rootDir>/src/test/supabase-test.ts',
    '^.*\\/.*\\/services\\/supabase$': '<rootDir>/src/test/supabase-test.ts',
    '^../services/supabase$': '<rootDir>/src/test/supabase-test.ts',
    '^../../services/supabase$': '<rootDir>/src/test/supabase-test.ts',
    '^../../../services/supabase$': '<rootDir>/src/test/supabase-test.ts',
    '^.*\\/services\\/env$': '<rootDir>/src/test/env-test.ts',
    '^../services/env$': '<rootDir>/src/test/env-test.ts',
    '^../../services/env$': '<rootDir>/src/test/env-test.ts',
    '^./env$': '<rootDir>/src/test/env-test.ts',
    '^.*\\/services\\/(.*)$': '<rootDir>/src/services/$1',
  },
  
  // Fast test matching - only fast tests
  testMatch: [
    '<rootDir>/src/**/*(simple|basic|fast|unit)*.{test,spec}.{js,jsx,ts,tsx}',
    '<rootDir>/src/test/simple.test.ts',
    '<rootDir>/src/test/search-basic.test.ts',
    '<rootDir>/src/test/game-quality-scoring.test.ts'
  ],
  
  // No coverage for fast runs
  collectCoverage: false,
  
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      useESM: false,
      tsconfig: {
        module: 'commonjs',
        moduleResolution: 'node',
        target: 'es2020',
        jsx: 'react-jsx',
        isolatedModules: true
      }
    }]
  },
  
  // Aggressive timeouts for development speed
  testTimeout: 8000, 
  slowTestThreshold: 3, // Flag anything slower than 3s
  
  // Fail fast for quick feedback
  bail: 1,
  verbose: false,
  
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$))'
  ],
  extensionsToTreatAsEsm: ['.ts', '.tsx']
};