import '@testing-library/jest-dom';
import { afterEach } from '@jest/globals';
import { cleanup } from '@testing-library/react';
import { resetMSWHandlers } from './test-utils';

// Lightweight cleanup after each test
afterEach(() => {
  cleanup();
  resetMSWHandlers(); // Reset MSW handlers instead of recreating server
  jest.clearAllMocks();
});

// Essential mocks only - lazy loaded when needed
let mockMatchMedia: jest.Mock;
let mockIntersectionObserver: jest.Mock;

// Lazy load match media mock
Object.defineProperty(window, 'matchMedia', {
  get() {
    if (!mockMatchMedia) {
      mockMatchMedia = jest.fn(() => ({
        matches: false,
        addListener: jest.fn(),
        removeListener: jest.fn(),
      }));
    }
    return mockMatchMedia;
  },
  configurable: true
});

// Lazy load intersection observer mock
Object.defineProperty(global, 'IntersectionObserver', {
  get() {
    if (!mockIntersectionObserver) {
      mockIntersectionObserver = jest.fn(() => ({
        observe: jest.fn(),
        unobserve: jest.fn(),
        disconnect: jest.fn(),
      }));
    }
    return mockIntersectionObserver;
  },
  configurable: true
});