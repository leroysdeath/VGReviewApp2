/**
 * Bot Detection Service
 * Main export with singleton instance
 */

import { LazyBotDetector } from './LazyBotDetector';
import { BotDetectorConfig } from './types';

// Export types
export * from './types';

// Create singleton instance with default config
const defaultConfig: BotDetectorConfig = {
  enableWorker: true,
  enableCache: true,
  cacheMaxSize: 1000,
  cacheTTL: {
    userAgent: 3600000,    // 1 hour
    session: 86400000,     // 24 hours
    combined: 300000       // 5 minutes
  },
  debug: process.env.NODE_ENV === 'development',
  performanceTracking: process.env.NODE_ENV === 'development'
};

// Create lazy-loaded singleton
let instance: LazyBotDetector | null = null;

/**
 * Get bot detector instance
 */
export function getBotDetector(config?: BotDetectorConfig): LazyBotDetector {
  if (!instance) {
    instance = new LazyBotDetector({
      ...defaultConfig,
      ...config
    });
  }
  return instance;
}

/**
 * Destroy bot detector instance
 */
export function destroyBotDetector(): void {
  if (instance) {
    instance.destroy();
    instance = null;
  }
}

// Default export
export default getBotDetector();