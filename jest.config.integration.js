/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'node', // Use Node environment for real network requests

  // NO moduleNameMapper mocking - use real Supabase client
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // Only run integration tests
  testMatch: [
    '<rootDir>/src/test/*-integration.test.ts',
    '<rootDir>/src/test/**/*-integration.test.ts'
  ],

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

  // Longer timeouts for real network requests
  testTimeout: 30000, // 30 seconds for database operations

  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$))'
  ],

  // Verbose output for debugging
  verbose: true,
};
