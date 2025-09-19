/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
    customExportConditions: [''],
  },
  // Performance optimizations
  maxWorkers: '50%',
  cache: true,
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',
  
  // Global setup/teardown for MSW
  globalSetup: '<rootDir>/src/test/global-setup.ts',
  globalTeardown: '<rootDir>/src/test/global-teardown.ts',
  
  setupFiles: ['<rootDir>/src/test/jest-setup.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup-basic.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // Comprehensive Supabase service mapping
    '^.*\\/services\\/supabase$': '<rootDir>/src/test/supabase-test.ts',
    '^.*\\/.*\\/services\\/supabase$': '<rootDir>/src/test/supabase-test.ts',
    '^../services/supabase$': '<rootDir>/src/test/supabase-test.ts',
    '^../../services/supabase$': '<rootDir>/src/test/supabase-test.ts',
    '^../../../services/supabase$': '<rootDir>/src/test/supabase-test.ts',
    // Environment mapping for Jest
    '^.*\\/services\\/env$': '<rootDir>/src/test/env-test.ts',
    '^../services/env$': '<rootDir>/src/test/env-test.ts',
    '^../../services/env$': '<rootDir>/src/test/env-test.ts',
    '^./env$': '<rootDir>/src/test/env-test.ts',
    // Mock game services for tests
    '^.*\\/services\\/gameDataService$': '<rootDir>/src/test/mocks/gameDataService-mock.ts',
    '^.*\\/services\\/gameSearchService$': '<rootDir>/src/test/mocks/gameSearchService-mock.ts',
    // Additional service mappings for better resolution
    '^.*\\/services\\/(.*)$': '<rootDir>/src/services/$1',
  },
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{js,jsx,ts,tsx}'
  ],
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
        isolatedModules: true // Faster compilation
      }
    }]
  },
  
  // Smart timeout strategy 
  testTimeout: 15000, // Default 15s for complex tests
  slowTestThreshold: 8, // Warn about tests slower than 8s
  
  // Test categories with different timeouts
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{js,jsx,ts,tsx}'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$))'
  ],
  extensionsToTreatAsEsm: ['.ts', '.tsx']
};