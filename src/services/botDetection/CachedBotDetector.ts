/**
 * Cached Bot Detector
 * Implements multi-layer caching with LRU eviction
 */

import {
  BotDetectionRequest,
  BotDetectionResult,
  CacheEntry,
  CacheStats,
  BotDetectorConfig
} from './types';

interface LRUNode<T> {
  key: string;
  value: T;
  prev: LRUNode<T> | null;
  next: LRUNode<T> | null;
  timestamp: number;
  size: number;
}

class LRUCache<T> {
  private cache: Map<string, LRUNode<T>> = new Map();
  private head: LRUNode<T> | null = null;
  private tail: LRUNode<T> | null = null;
  private currentSize = 0;
  private hits = 0;
  private misses = 0;
  
  constructor(
    private maxSize: number,
    private ttlMs: number,
    private estimateSize: (value: T) => number
  ) {}

  /**
   * Get value from cache
   */
  get(key: string): T | null {
    const node = this.cache.get(key);
    
    if (!node) {
      this.misses++;
      return null;
    }

    // Check TTL
    if (Date.now() - node.timestamp > this.ttlMs) {
      this.remove(key);
      this.misses++;
      return null;
    }

    // Move to front (most recently used)
    this.moveToFront(node);
    this.hits++;
    
    return node.value;
  }

  /**
   * Set value in cache
   */
  set(key: string, value: T): void {
    // Remove existing if present
    if (this.cache.has(key)) {
      this.remove(key);
    }

    const size = this.estimateSize(value);
    
    // Evict if necessary
    while (this.currentSize + size > this.maxSize && this.tail) {
      this.remove(this.tail.key);
    }

    // Create new node
    const node: LRUNode<T> = {
      key,
      value,
      prev: null,
      next: this.head,
      timestamp: Date.now(),
      size
    };

    // Update links
    if (this.head) {
      this.head.prev = node;
    }
    this.head = node;
    
    if (!this.tail) {
      this.tail = node;
    }

    this.cache.set(key, node);
    this.currentSize += size;
  }

  /**
   * Remove entry from cache
   */
  private remove(key: string): void {
    const node = this.cache.get(key);
    if (!node) return;

    // Update links
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }

    this.cache.delete(key);
    this.currentSize -= node.size;
  }

  /**
   * Move node to front
   */
  private moveToFront(node: LRUNode<T>): void {
    if (node === this.head) return;

    // Remove from current position
    if (node.prev) {
      node.prev.next = node.next;
    }
    if (node.next) {
      node.next.prev = node.prev;
    }
    if (node === this.tail) {
      this.tail = node.prev;
    }

    // Move to front
    node.prev = null;
    node.next = this.head;
    if (this.head) {
      this.head.prev = node;
    }
    this.head = node;
  }

  /**
   * Clear old entries
   */
  cleanup(): number {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((node, key) => {
      if (now - node.timestamp > this.ttlMs) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.remove(key));
    return keysToDelete.length;
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    hits: number;
    misses: number;
    hitRate: number;
    memoryBytes: number;
  } {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
      memoryBytes: this.currentSize
    };
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
    this.head = null;
    this.tail = null;
    this.currentSize = 0;
    this.hits = 0;
    this.misses = 0;
  }
}

export class CachedBotDetector {
  private userAgentCache: LRUCache<BotDetectionResult>;
  private sessionCache: LRUCache<BotDetectionResult>;
  private combinedCache: LRUCache<BotDetectionResult>;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private debug: boolean;
  private performanceMarks = new Map<string, number>();

  constructor(private config: BotDetectorConfig = {}) {
    this.debug = config.debug || false;
    
    // Initialize caches with default or configured values
    const maxSize = config.cacheMaxSize || 1000;
    const ttl = config.cacheTTL || {};
    
    // User agent cache (1 hour default)
    this.userAgentCache = new LRUCache(
      maxSize * 100, // Bytes
      ttl.userAgent || 3600000,
      this.estimateResultSize
    );

    // Session cache (24 hours default)
    this.sessionCache = new LRUCache(
      maxSize * 100,
      ttl.session || 86400000,
      this.estimateResultSize
    );

    // Combined cache (5 minutes default for fast lookup)
    this.combinedCache = new LRUCache(
      maxSize * 200,
      ttl.combined || 300000,
      this.estimateResultSize
    );

    // Set up periodic cleanup
    this.startCleanup();

    if (this.debug) {
      console.log('[CachedBotDetector] Initialized with config:', config);
    }
  }

  /**
   * Get cached result or compute new one
   */
  async get(
    request: BotDetectionRequest,
    computeFn: () => Promise<BotDetectionResult>
  ): Promise<BotDetectionResult> {
    const startTime = performance.now();
    
    // Generate cache keys
    const uaKey = this.getUserAgentKey(request.userAgent);
    const sessionKey = this.getSessionKey(request.sessionId);
    const combinedKey = this.getCombinedKey(request);

    // Check combined cache first (fastest)
    let result = this.combinedCache.get(combinedKey);
    if (result) {
      if (this.debug) {
        console.log('[CachedBotDetector] Combined cache hit:', combinedKey);
      }
      return this.enrichResult(result, true, performance.now() - startTime);
    }

    // Check session cache
    if (request.sessionId) {
      result = this.sessionCache.get(sessionKey);
      if (result) {
        if (this.debug) {
          console.log('[CachedBotDetector] Session cache hit:', sessionKey);
        }
        // Also store in combined cache for next time
        this.combinedCache.set(combinedKey, result);
        return this.enrichResult(result, true, performance.now() - startTime);
      }
    }

    // Check user agent cache
    result = this.userAgentCache.get(uaKey);
    if (result) {
      if (this.debug) {
        console.log('[CachedBotDetector] UA cache hit:', uaKey);
      }
      // Store in higher level caches
      if (request.sessionId) {
        this.sessionCache.set(sessionKey, result);
      }
      this.combinedCache.set(combinedKey, result);
      return this.enrichResult(result, true, performance.now() - startTime);
    }

    // Cache miss - compute result
    if (this.debug) {
      console.log('[CachedBotDetector] Cache miss, computing...');
    }

    try {
      result = await computeFn();
      
      // Store in all applicable caches
      this.userAgentCache.set(uaKey, result);
      if (request.sessionId) {
        this.sessionCache.set(sessionKey, result);
      }
      this.combinedCache.set(combinedKey, result);

      return this.enrichResult(result, false, performance.now() - startTime);
    } catch (error) {
      console.error('[CachedBotDetector] Compute error:', error);
      throw error;
    }
  }

  /**
   * Generate user agent cache key
   */
  private getUserAgentKey(userAgent: string): string {
    return `ua_${this.hash(userAgent || 'unknown')}`;
  }

  /**
   * Generate session cache key
   */
  private getSessionKey(sessionId: string): string {
    return `session_${sessionId || 'anonymous'}`;
  }

  /**
   * Generate combined cache key
   */
  private getCombinedKey(request: BotDetectionRequest): string {
    const parts = [
      request.userAgent || 'unknown',
      request.sessionId || 'anonymous',
      request.gameId?.toString() || 'nogame'
    ];
    return `combined_${this.hash(parts.join('_'))}`;
  }

  /**
   * Simple hash function for cache keys
   */
  private hash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Estimate size of result object in bytes
   */
  private estimateResultSize(result: BotDetectionResult): number {
    // Rough estimation
    return JSON.stringify(result).length * 2; // 2 bytes per character
  }

  /**
   * Enrich result with cache info
   */
  private enrichResult(
    result: BotDetectionResult,
    cacheHit: boolean,
    lookupTime: number
  ): BotDetectionResult {
    return {
      ...result,
      cacheHit,
      performanceMs: cacheHit ? lookupTime : result.performanceMs
    };
  }

  /**
   * Start periodic cleanup
   */
  private startCleanup(): void {
    // Clean every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 300000);
  }

  /**
   * Cleanup old cache entries
   */
  cleanup(): void {
    const start = performance.now();
    
    const uaCleaned = this.userAgentCache.cleanup();
    const sessionCleaned = this.sessionCache.cleanup();
    const combinedCleaned = this.combinedCache.cleanup();
    
    if (this.debug) {
      const duration = performance.now() - start;
      console.log(`[CachedBotDetector] Cleanup completed in ${duration.toFixed(2)}ms`, {
        userAgent: uaCleaned,
        session: sessionCleaned,
        combined: combinedCleaned
      });
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const uaStats = this.userAgentCache.getStats();
    const sessionStats = this.sessionCache.getStats();
    const combinedStats = this.combinedCache.getStats();

    return {
      userAgentCache: uaStats,
      sessionCache: sessionStats,
      combinedCache: combinedStats,
      totalMemoryBytes: uaStats.memoryBytes + sessionStats.memoryBytes + combinedStats.memoryBytes
    };
  }

  /**
   * Clear all caches
   */
  clear(): void {
    this.userAgentCache.clear();
    this.sessionCache.clear();
    this.combinedCache.clear();
    
    if (this.debug) {
      console.log('[CachedBotDetector] All caches cleared');
    }
  }

  /**
   * Destroy and cleanup
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }

  /**
   * Warm up cache with known bot user agents
   */
  warmUp(knownBots: string[]): void {
    const result: BotDetectionResult = {
      isBot: true,
      confidence: 'high',
      reasons: ['known_bot_warmup'],
      flags: [],
      performanceMs: 0,
      cacheHit: false
    };

    knownBots.forEach(ua => {
      const key = this.getUserAgentKey(ua);
      this.userAgentCache.set(key, result);
    });

    if (this.debug) {
      console.log(`[CachedBotDetector] Warmed up with ${knownBots.length} known bots`);
    }
  }
}