/**
 * Polyfills for TensorFlow.js and other Node.js dependencies
 *
 * TensorFlow.js expects certain Node.js globals to be available in the browser.
 * This file provides those polyfills.
 */

import { Buffer } from 'buffer';
import process from 'process';

// Make Buffer available globally
if (typeof window !== 'undefined') {
  (window as any).Buffer = Buffer;
  (window as any).process = process;
  (window as any).global = window;
}

// Ensure process.env exists
if (!process.env) {
  process.env = {};
}

export {};
