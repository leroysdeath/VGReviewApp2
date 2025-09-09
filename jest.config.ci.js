/** @type {import('jest').Config} */
// CI configuration - comprehensive but optimized
export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
    customExportConditions: [''],
  },
  
  // Moderate performance settings for stability
  maxWorkers: '50%',
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
  
  // All tests except problematic ones
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{js,jsx,ts,tsx}'
  ],
  
  // Exclude problematic tests that need separate handling
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/src/test/search-coordination-simple.test.ts',
    '<rootDir>/src/test/phase1-coverage-improvement.test.ts',
    '<rootDir>/src/test/phase2-enhanced-detection.test.ts'
  ],
  
  // Full coverage for CI
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/test/**',
    '!src/tests/**',
    '!src/**/*.config.{js,ts}',
    '!src/data/mockData.ts',
    '!backup/**',
    '!netlify/**',
    '!supabase/**'
  ],
  coverageReporters: ['text', 'json', 'html'],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 70,
      statements: 70
    }
  },
  
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
  
  // Longer timeouts for CI stability
  testTimeout: 20000,
  slowTestThreshold: 10,
  
  // Run all tests in CI
  bail: 0,
  verbose: true,
  
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$))'
  ],
  extensionsToTreatAsEsm: ['.ts', '.tsx']
};