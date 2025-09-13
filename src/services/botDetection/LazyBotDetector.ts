/**
 * Lazy Bot Detector
 * Handles lazy loading and preloading strategies
 */

import {
  BotDetectionRequest,
  BotDetectionResult,
  BotDetectorStats,
  CacheStats,
  BotDetectorConfig
} from './types';

type BotDetectorImplementation = {
  detect: (request: BotDetectionRequest) => Promise<BotDetectionResult>;
  getStats: () => Promise<BotDetectorStats>;
  getCacheStats: () => CacheStats;
  clear: () => Promise<void>;
  cleanup: () => Promise<void>;
  destroy: () => void;
};

export class LazyBotDetector {
  private implementation: BotDetectorImplementation | null = null;
  private loadingPromise: Promise<void> | null = null;
  private pendingQueue: Array<{
    request: BotDetectionRequest;
    resolve: (result: BotDetectionResult) => void;
    reject: (error: Error) => void;
  }> = [];
  private clickCount = 0;
  private preloadThreshold = 2;
  private idleCallbackId: number | null = null;
  private debug: boolean;
  private config: BotDetectorConfig;
  private isDestroyed = false;

  constructor(config: BotDetectorConfig = {}) {
    this.config = config;
    this.debug = config.debug || false;
    
    if (this.debug) {
      console.log('[LazyBotDetector] Initialized with config:', config);
    }

    // Set up preloading strategies
    this.setupPreloadStrategies();
  }

  /**
   * Set up preloading strategies
   */
  private setupPreloadStrategies(): void {
    // Strategy 1: Preload on idle
    if ('requestIdleCallback' in window) {
      this.idleCallbackId = requestIdleCallback(
        () => {
          if (!this.implementation && !this.loadingPromise && !this.isDestroyed) {
            if (this.debug) {
              console.log('[LazyBotDetector] Preloading on idle');
            }
            this.load().catch(console.error);
          }
        },
        { timeout: 10000 } // Wait max 10 seconds
      );
    }

    // Strategy 2: Track clicks for preloading
    this.trackUserInteraction();
  }

  /**
   * Track user interaction for preloading
   */
  private trackUserInteraction(): void {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Check if click is on a game-related link
      if (target.closest('a[href*="/game"]') || 
          target.closest('[data-game-id]') ||
          target.closest('.game-card')) {
        this.clickCount++;
        
        if (this.clickCount >= this.preloadThreshold && 
            !this.implementation && 
            !this.loadingPromise &&
            !this.isDestroyed) {
          if (this.debug) {
            console.log('[LazyBotDetector] Preloading after', this.clickCount, 'game clicks');
          }
          this.load().catch(console.error);
          
          // Remove listener after preloading
          document.removeEventListener('click', handleClick);
        }
      }
    };

    document.addEventListener('click', handleClick);
  }

  /**
   * Load the implementation
   */
  private async load(): Promise<void> {
    if (this.implementation || this.loadingPromise || this.isDestroyed) {
      return this.loadingPromise || Promise.resolve();
    }

    const startTime = performance.now();
    
    this.loadingPromise = this.doLoad();
    
    try {
      await this.loadingPromise;
      
      if (this.debug) {
        const loadTime = performance.now() - startTime;
        console.log(`[LazyBotDetector] Loaded in ${loadTime.toFixed(2)}ms`);
      }
      
      // Process pending queue
      this.processPendingQueue();
    } catch (error) {
      console.error('[LazyBotDetector] Failed to load:', error);
      
      // Reject pending requests
      this.pendingQueue.forEach(item => {
        item.reject(new Error('Failed to load bot detector'));
      });
      this.pendingQueue = [];
      
      throw error;
    } finally {
      this.loadingPromise = null;
    }
  }

  /**
   * Do the actual loading
   */
  private async doLoad(): Promise<void> {
    try {
      // Dynamic import with webpack magic comment
      const module = await import(
        /* webpackChunkName: "bot-detector" */
        /* webpackPreload: true */
        './BotDetectorImplementation'
      );
      
      if (this.isDestroyed) {
        // Component was destroyed while loading
        return;
      }
      
      this.implementation = new module.BotDetectorImplementation(this.config);
      
      // Cancel idle callback if still pending
      if (this.idleCallbackId !== null) {
        cancelIdleCallback(this.idleCallbackId);
        this.idleCallbackId = null;
      }
    } catch (error) {
      console.error('[LazyBotDetector] Import failed:', error);
      
      // Provide no-op fallback
      this.implementation = this.createNoOpImplementation();
    }
  }

  /**
   * Create no-op implementation as fallback
   */
  private createNoOpImplementation(): BotDetectorImplementation {
    return {
      detect: async (request: BotDetectionRequest): Promise<BotDetectionResult> => ({
        isBot: false,
        confidence: 'low',
        reasons: ['no_op_fallback'],
        flags: [],
        performanceMs: 0,
        cacheHit: false,
        error: 'Bot detector failed to load'
      }),
      getStats: async () => ({
        checksPerformed: 0,
        cacheHits: 0,
        cacheMisses: 0,
        rateLimitMapSize: 0,
        memoryEstimate: 0
      }),
      getCacheStats: () => ({
        userAgentCache: { size: 0, hits: 0, misses: 0, hitRate: 0, memoryBytes: 0 },
        sessionCache: { size: 0, hits: 0, misses: 0, hitRate: 0, memoryBytes: 0 },
        combinedCache: { size: 0, hits: 0, misses: 0, hitRate: 0, memoryBytes: 0 },
        totalMemoryBytes: 0
      }),
      clear: async () => {},
      cleanup: async () => {},
      destroy: () => {}
    };
  }

  /**
   * Process pending detection queue
   */
  private processPendingQueue(): void {
    if (!this.implementation) return;
    
    const queue = [...this.pendingQueue];
    this.pendingQueue = [];
    
    queue.forEach(item => {
      this.implementation!.detect(item.request)
        .then(item.resolve)
        .catch(item.reject);
    });
    
    if (this.debug && queue.length > 0) {
      console.log(`[LazyBotDetector] Processed ${queue.length} pending requests`);
    }
  }

  /**
   * Detect if request is from a bot
   */
  async detect(request: BotDetectionRequest): Promise<BotDetectionResult> {
    // If already loaded, use directly
    if (this.implementation) {
      return this.implementation.detect(request);
    }

    // If currently loading, queue the request
    if (this.loadingPromise) {
      return new Promise((resolve, reject) => {
        this.pendingQueue.push({ request, resolve, reject });
      });
    }

    // Load and then detect
    await this.load();
    
    if (!this.implementation) {
      throw new Error('Failed to load bot detector');
    }
    
    return this.implementation.detect(request);
  }

  /**
   * Preload the implementation
   */
  async preload(): Promise<void> {
    if (!this.implementation && !this.loadingPromise && !this.isDestroyed) {
      await this.load();
    }
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<BotDetectorStats> {
    if (!this.implementation) {
      return {
        checksPerformed: 0,
        cacheHits: 0,
        cacheMisses: 0,
        rateLimitMapSize: 0,
        memoryEstimate: 0
      };
    }
    
    return this.implementation.getStats();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    if (!this.implementation) {
      return {
        userAgentCache: { size: 0, hits: 0, misses: 0, hitRate: 0, memoryBytes: 0 },
        sessionCache: { size: 0, hits: 0, misses: 0, hitRate: 0, memoryBytes: 0 },
        combinedCache: { size: 0, hits: 0, misses: 0, hitRate: 0, memoryBytes: 0 },
        totalMemoryBytes: 0
      };
    }
    
    return this.implementation.getCacheStats();
  }

  /**
   * Clear all state
   */
  async clear(): Promise<void> {
    if (this.implementation) {
      await this.implementation.clear();
    }
  }

  /**
   * Cleanup old entries
   */
  async cleanup(): Promise<void> {
    if (this.implementation) {
      await this.implementation.cleanup();
    }
  }

  /**
   * Check if loaded
   */
  get isLoaded(): boolean {
    return this.implementation !== null;
  }

  /**
   * Get loading state
   */
  get isLoading(): boolean {
    return this.loadingPromise !== null;
  }

  /**
   * Get queue size
   */
  get queueSize(): number {
    return this.pendingQueue.length;
  }

  /**
   * Destroy and cleanup
   */
  destroy(): void {
    this.isDestroyed = true;
    
    // Cancel idle callback
    if (this.idleCallbackId !== null) {
      cancelIdleCallback(this.idleCallbackId);
      this.idleCallbackId = null;
    }

    // Clear pending queue
    this.pendingQueue.forEach(item => {
      item.reject(new Error('Bot detector destroyed'));
    });
    this.pendingQueue = [];

    // Destroy implementation if loaded
    if (this.implementation) {
      this.implementation.destroy();
      this.implementation = null;
    }

    if (this.debug) {
      console.log('[LazyBotDetector] Destroyed');
    }
  }
}