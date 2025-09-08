/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
    customExportConditions: [''],
  },
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
        target: 'es2020'
      }
    }]
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$))'
  ],
  extensionsToTreatAsEsm: ['.ts', '.tsx']
};