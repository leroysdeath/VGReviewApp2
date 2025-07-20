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

// Auto cleanup every 5 minutes
setInterval(() => {
  browserCache.cleanup();
}, 5 * 60 * 1000);
