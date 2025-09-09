// Lightweight Jest setup - minimal polyfills only

import 'whatwg-fetch';
import { TextEncoder, TextDecoder } from 'util';

// Essential globals for MSW
global.TextEncoder = TextEncoder as any;
global.TextDecoder = TextDecoder as any;

// Minimal polyfills for MSW (only what's needed)
if (!global.TransformStream) {
  global.TransformStream = class TransformStream {
    readable: any;
    writable: any;
    
    constructor() {
      const passThrough = {
        getReader: () => ({ read: () => Promise.resolve({ done: true }) }),
        getWriter: () => ({ write: () => Promise.resolve() })
      };
      this.readable = passThrough;
      this.writable = passThrough;
    }
  } as any;
}

if (!global.BroadcastChannel) {
  global.BroadcastChannel = class BroadcastChannel {
    constructor(public name: string) {}
    postMessage() {}
    addEventListener() {}
    removeEventListener() {}
    close() {}
  } as any;
}

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