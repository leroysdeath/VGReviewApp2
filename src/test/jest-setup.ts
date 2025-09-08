// Jest setup file for Node.js globals and polyfills

import 'whatwg-fetch';
import { TextEncoder, TextDecoder } from 'util';

// Add fetch to global scope for MSW
global.fetch = fetch;
global.Response = Response;
global.Request = Request;
global.Headers = Headers;

// Add Node.js globals for MSW
global.TextEncoder = TextEncoder as any;
global.TextDecoder = TextDecoder as any;

// Set environment variables for tests
process.env.NODE_ENV = 'test';
process.env.VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://test.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'test-anon-key';

// Mock import.meta for Jest environment
Object.defineProperty(globalThis, 'import', {
  value: {
    meta: {
      env: {
        VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
        VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
        DEV: false
      }
    }
  },
  writable: true,
  configurable: true
});