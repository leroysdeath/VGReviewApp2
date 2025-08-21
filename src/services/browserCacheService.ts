// src/services/browserCacheService.ts

interface BrowserCacheItem {
  data: any;
  timestamp: number;
  expiresAt: number;
}

class BrowserCacheService {
  private memoryCache = new Map<string, BrowserCacheItem>();
  private readonly maxMemoryItems = 100; // Limit memory cache size

  /**
   * Get item from browser cache (memory first, then check if still valid)
   */
  get(key: string): any | null {
    // Check memory cache first
    const memoryItem = this.memoryCache.get(key);
    if (memoryItem && memoryItem.expiresAt > Date.now()) {
      return memoryItem.data;
    }

    // Clean up expired memory cache item
    if (memoryItem) {
      this.memoryCache.delete(key);
    }

    return null;
  }

  /**
   * Set item in browser cache
   */
  set(key: string, data: any, ttlSeconds: number = 300): void {
    const expiresAt = Date.now() + (ttlSeconds * 1000);
    
    // Add to memory cache
    this.memoryCache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt,
    });

    // Limit memory cache size
    if (this.memoryCache.size > this.maxMemoryItems) {
      // Remove oldest items
      const entries = Array.from(this.memoryCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      // Remove oldest 20% of items
      const itemsToRemove = Math.floor(this.maxMemoryItems * 0.2);
      for (let i = 0; i < itemsToRemove; i++) {
        this.memoryCache.delete(entries[i][0]);
      }
    }
  }

  /**
   * Remove item from cache
   */
  remove(key: string): void {
    this.memoryCache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.memoryCache.clear();
  }

  /**
   * Clean expired items
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.memoryCache.entries()) {
      if (item.expiresAt <= now) {
        this.memoryCache.delete(key);
      }
    }
  }

  /**
   * Get cache stats
   */
  getStats() {
    const now = Date.now();
    let validItems = 0;
    let expiredItems = 0;

    for (const item of this.memoryCache.values()) {
      if (item.expiresAt > now) {
        validItems++;
      } else {
        expiredItems++;
      }
    }

    return {
      totalItems: this.memoryCache.size,
      validItems,
      expiredItems,
      maxItems: this.maxMemoryItems,
    };
  }
}

export const browserCache = new BrowserCacheService();

// MEMORY LEAK FIX: Properly managed cleanup interval with enhanced lifecycle management
class BrowserCacheManager {
  private cleanupInterval: NodeJS.Timeout | null = null;
  private isDestroyed: boolean = false;
  private readonly CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
  
  constructor() {
    if (typeof window !== 'undefined') {
      // Only initialize in browser environment
      this.startCleanupInterval();
      this.setupEventListeners();
    }
  }
  
  private setupEventListeners() {
    if (typeof window === 'undefined') return;
    
    // Clean up on page unload
    window.addEventListener('beforeunload', this.handleBeforeUnload);
    
    // Clean up on page hide (mobile/tab switching)
    window.addEventListener('pagehide', this.handleBeforeUnload);
    
    // Cleanup on visibility change (tab switching)
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }
  
  private handleBeforeUnload = () => {
    this.destroy();
  };
  
  private handleVisibilityChange = () => {
    if (document.hidden) {
      // Page is hidden, stop cleanup to save resources
      this.stopCleanupInterval();
    } else if (!this.isDestroyed) {
      // Page is visible again, restart cleanup
      this.startCleanupInterval();
    }
  };
  
  private startCleanupInterval() {
    if (this.isDestroyed) return;
    
    // Clear any existing interval
    this.stopCleanupInterval();
    
    try {
      // Start new cleanup interval with error handling
      this.cleanupInterval = setInterval(() => {
        try {
          if (!this.isDestroyed && browserCache) {
            browserCache.cleanup();
          }
        } catch (error) {
          console.error('Cache cleanup failed:', error);
          // Don't stop the interval for this error, just log it
        }
      }, this.CLEANUP_INTERVAL_MS);
      
      console.log('✅ Cache cleanup interval started');
    } catch (error) {
      console.error('Failed to start cache cleanup interval:', error);
    }
  }
  
  private stopCleanupInterval() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('🛑 Cache cleanup interval stopped');
    }
  }
  
  private removeEventListeners() {
    if (typeof window === 'undefined') return;
    
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    window.removeEventListener('pagehide', this.handleBeforeUnload);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }
  
  public destroy() {
    if (this.isDestroyed) return;
    
    console.log('🧹 Destroying cache manager...');
    this.isDestroyed = true;
    this.stopCleanupInterval();
    this.removeEventListeners();
    
    // Perform final cleanup
    try {
      if (browserCache) {
        browserCache.cleanup();
      }
    } catch (error) {
      console.error('Final cache cleanup failed:', error);
    }
  }
  
  public restart() {
    if (!this.isDestroyed) {
      this.startCleanupInterval();
    }
  }
  
  public getStatus() {
    return {
      isActive: !!this.cleanupInterval,
      isDestroyed: this.isDestroyed,
      intervalMs: this.CLEANUP_INTERVAL_MS
    };
  }
}

// Initialize proper cleanup management with singleton pattern
let cacheManager: BrowserCacheManager | null = null;

// Only create manager in browser environment
if (typeof window !== 'undefined') {
  cacheManager = new BrowserCacheManager();
  
  // Export for debugging/testing
  (window as any).__cacheManager = cacheManager;
}

// Export manager for testing purposes
export { cacheManager };
