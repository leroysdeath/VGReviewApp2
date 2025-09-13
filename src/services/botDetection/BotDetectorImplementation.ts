/**
 * Bot Detector Implementation
 * Core logic with Worker, Caching, and Performance optimizations
 */

import { BotDetectorWorker } from './BotDetectorWorker';
import { CachedBotDetector } from './CachedBotDetector';
import {
  BotDetectionRequest,
  BotDetectionResult,
  BotDetectorStats,
  CacheStats,
  BotDetectorConfig,
  SessionData,
  ViewHistoryItem
} from './types';

export class BotDetectorImplementation {
  private worker: BotDetectorWorker;
  private cache: CachedBotDetector;
  private sessionData: Map<string, SessionData> = new Map();
  private config: BotDetectorConfig;
  private debug: boolean;
  private performanceEnabled: boolean;

  constructor(config: BotDetectorConfig = {}) {
    this.config = config;
    this.debug = config.debug || false;
    this.performanceEnabled = config.performanceTracking || false;

    // Initialize worker
    this.worker = new BotDetectorWorker(this.debug);
    
    // Initialize cache
    this.cache = new CachedBotDetector(config);

    // Initialize worker in background
    this.worker.initialize().catch(console.error);

    // Warm up cache with known bots
    this.warmUpCache();

    if (this.debug) {
      console.log('[BotDetectorImplementation] Initialized');
    }
  }

  /**
   * Detect if request is from a bot
   */
  async detect(request: BotDetectionRequest): Promise<BotDetectionResult> {
    const perfMark = this.startPerformanceMark('detect');

    try {
      // Update session data
      this.updateSessionData(request);

      // Get session data for behavior analysis
      const sessionData = this.sessionData.get(request.sessionId);

      // Enhance request with session data
      const enhancedRequest: BotDetectionRequest = {
        ...request,
        sessionData,
        cacheKey: this.generateCacheKey(request)
      };

      // Use cache with worker as compute function
      const result = await this.cache.get(
        enhancedRequest,
        () => this.worker.detect(enhancedRequest)
      );

      this.endPerformanceMark(perfMark);

      if (this.debug) {
        console.log('[BotDetectorImplementation] Detection result:', {
          isBot: result.isBot,
          confidence: result.confidence,
          cacheHit: result.cacheHit,
          performanceMs: result.performanceMs
        });
      }

      return result;
    } catch (error) {
      this.endPerformanceMark(perfMark);
      console.error('[BotDetectorImplementation] Detection error:', error);
      
      // Return safe default on error
      return {
        isBot: false,
        confidence: 'low',
        reasons: ['detection_error'],
        flags: [],
        performanceMs: 0,
        cacheHit: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update session data for behavior tracking
   */
  private updateSessionData(request: BotDetectionRequest): void {
    if (!request.sessionId) return;

    const now = Date.now();
    let data = this.sessionData.get(request.sessionId);

    if (!data) {
      data = {
        viewHistory: [],
        totalViews: 0,
        sessionDuration: 0,
        startTime: now
      };
      this.sessionData.set(request.sessionId, data);
    }

    // Update session duration
    data.sessionDuration = now - data.startTime;
    data.totalViews++;

    // Add to view history if game ID provided
    if (request.gameId) {
      // Calculate duration from last view
      const lastView = data.viewHistory[data.viewHistory.length - 1];
      const duration = lastView ? now - lastView.timestamp : 0;

      // Update last view duration
      if (lastView) {
        lastView.duration = duration;
      }

      // Add new view
      const viewItem: ViewHistoryItem = {
        gameId: request.gameId,
        timestamp: now
      };

      data.viewHistory.push(viewItem);

      // Keep only last 50 views
      if (data.viewHistory.length > 50) {
        data.viewHistory = data.viewHistory.slice(-50);
      }
    }

    // Clean up old sessions (older than 24 hours)
    this.cleanupSessions();
  }

  /**
   * Clean up old session data
   */
  private cleanupSessions(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    this.sessionData.forEach((data, sessionId) => {
      if (now - data.startTime > maxAge) {
        this.sessionData.delete(sessionId);
      }
    });
  }

  /**
   * Generate cache key for request
   */
  private generateCacheKey(request: BotDetectionRequest): string {
    const parts = [
      request.userAgent || 'unknown',
      request.sessionId || 'anonymous',
      request.gameId?.toString() || 'nogame'
    ];
    return parts.join('_');
  }

  /**
   * Warm up cache with known bot patterns
   */
  private warmUpCache(): void {
    const knownBots = [
      'Googlebot/2.1',
      'bingbot/2.0',
      'Slackbot-LinkExpanding',
      'facebookexternalhit/1.1',
      'Twitterbot/1.0',
      'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
      'Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)',
      'Mozilla/5.0 (compatible; DuckDuckBot/1.0; +http://duckduckgo.com/duckduckbot.html)'
    ];

    this.cache.warmUp(knownBots);
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<BotDetectorStats> {
    return this.worker.getStats();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    return this.cache.getStats();
  }

  /**
   * Clear all state
   */
  async clear(): Promise<void> {
    await this.worker.clear();
    this.cache.clear();
    this.sessionData.clear();
    
    if (this.debug) {
      console.log('[BotDetectorImplementation] Cleared all state');
    }
  }

  /**
   * Cleanup old entries
   */
  async cleanup(): Promise<void> {
    await this.worker.cleanup();
    this.cache.cleanup();
    this.cleanupSessions();
    
    if (this.debug) {
      console.log('[BotDetectorImplementation] Cleanup completed');
    }
  }

  /**
   * Destroy and cleanup resources
   */
  destroy(): void {
    this.worker.terminate();
    this.cache.destroy();
    this.sessionData.clear();
    
    if (this.debug) {
      console.log('[BotDetectorImplementation] Destroyed');
    }
  }

  /**
   * Start performance mark
   */
  private startPerformanceMark(name: string): string | null {
    if (!this.performanceEnabled) return null;
    
    const markName = `bot-detector-${name}-${Date.now()}`;
    performance.mark(`${markName}-start`);
    return markName;
  }

  /**
   * End performance mark and measure
   */
  private endPerformanceMark(markName: string | null): void {
    if (!markName || !this.performanceEnabled) return;
    
    performance.mark(`${markName}-end`);
    performance.measure(
      markName,
      `${markName}-start`,
      `${markName}-end`
    );
    
    if (this.debug) {
      const measure = performance.getEntriesByName(markName)[0];
      if (measure) {
        console.log(`[Performance] ${markName}: ${measure.duration.toFixed(2)}ms`);
      }
    }
    
    // Clean up marks
    performance.clearMarks(`${markName}-start`);
    performance.clearMarks(`${markName}-end`);
    performance.clearMeasures(markName);
  }

  /**
   * Get memory usage estimate
   */
  getMemoryEstimate(): number {
    const cacheStats = this.getCacheStats();
    const sessionDataSize = this.sessionData.size * 500; // Rough estimate
    
    return cacheStats.totalMemoryBytes + sessionDataSize;
  }

  /**
   * Check if request should be tracked
   */
  async shouldTrack(request: BotDetectionRequest): Promise<boolean> {
    const result = await this.detect(request);
    return !result.isBot;
  }
}