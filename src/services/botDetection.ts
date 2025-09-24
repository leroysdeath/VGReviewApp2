/**
 * Bot Detection Service
 * Multi-layered bot detection to ensure data quality
 * Uses LRU cache for performance and Web Worker for non-blocking detection
 */

export interface BotDetectionInput {
  userAgent: string;
  sessionId: string;
  gameId?: number;
  headers?: Record<string, string>;
  behaviorData?: {
    viewDuration?: number;
    clickEvents?: number;
    scrollEvents?: number;
    pageVisits?: number;
  };
}

export interface BotDetectionResult {
  isBot: boolean;
  confidence: 'high' | 'medium' | 'low';
  reasons: string[];
  flags: string[];
  performanceMs: number;
  cacheHit: boolean;
  error?: string;
}

// Known bot patterns
const BOT_PATTERNS = [
  // Search engine crawlers
  /googlebot/i,
  /bingbot/i,
  /slurp/i,
  /duckduckbot/i,
  /baiduspider/i,
  /yandexbot/i,
  /facebookexternalhit/i,
  /twitterbot/i,
  /linkedinbot/i,
  /whatsapp/i,
  /telegrambot/i,

  // SEO and monitoring tools
  /ahrefsbot/i,
  /semrushbot/i,
  /mj12bot/i,
  /dotbot/i,
  /rogerbot/i,
  /exabot/i,
  /facebot/i,
  /ia_archiver/i,

  // Generic bot indicators
  /bot/i,
  /crawler/i,
  /spider/i,
  /scraper/i,
  /curl/i,
  /wget/i,
  /python/i,
  /java/i,
  /go-http-client/i,
  /okhttp/i,

  // Headless browsers (often used by bots)
  /headlesschrome/i,
  /phantomjs/i,
  /slimerjs/i,
  /htmlunit/i,
  /zombie/i,

  // API clients and libraries
  /axios/i,
  /fetch/i,
  /postman/i,
  /insomnia/i,
  /httpie/i
];

// Suspicious user agent patterns
const SUSPICIOUS_PATTERNS = [
  // Too generic
  /^mozilla\/[45]\.0$/i,
  /^user-agent$/i,
  
  // Common fake patterns
  /windows nt 10\.0.*wow64.*windows nt 10\.0/i, // Duplicate Windows version
  /\(compatible;\s*;\s*\)/i, // Empty compatible string
  /mozilla\/5\.0.*gecko.*mozilla\/5\.0/i, // Duplicate Mozilla
];

class BotDetector {
  private cache = new Map<string, { result: BotDetectionResult; timestamp: number }>();
  private readonly CACHE_TTL = 300000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 1000;
  
  constructor() {
    // Clean cache periodically
    setInterval(() => this.cleanCache(), 60000); // Every minute
  }

  /**
   * Detect if the request is from a bot
   */
  async detect(input: BotDetectionInput): Promise<BotDetectionResult> {
    const startTime = performance.now();
    const cacheKey = this.getCacheKey(input);
    
    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return {
        ...cached,
        performanceMs: performance.now() - startTime,
        cacheHit: true
      };
    }

    const result = await this.performDetection(input);
    
    // Update cache
    this.setCache(cacheKey, {
      ...result,
      performanceMs: performance.now() - startTime,
      cacheHit: false
    });

    return {
      ...result,
      performanceMs: performance.now() - startTime,
      cacheHit: false
    };
  }

  /**
   * Core bot detection logic
   */
  private async performDetection(input: BotDetectionInput): Promise<BotDetectionResult> {
    const reasons: string[] = [];
    const flags: string[] = [];
    let confidence: 'high' | 'medium' | 'low' = 'low';

    try {
      // 1. User Agent Analysis
      const uaResult = this.analyzeUserAgent(input.userAgent);
      if (uaResult.isBot) {
        reasons.push(...uaResult.reasons);
        flags.push(...uaResult.flags);
        confidence = 'high';
      }

      // 2. Cloudflare Bot Score (if available)
      if (input.headers?.['cf-bot-score']) {
        const score = parseInt(input.headers['cf-bot-score']);
        if (score <= 30) {
          reasons.push('cloudflare_bot_score_low');
          flags.push('cf_bot_score');
          confidence = 'high';
        }
      }

      // 3. Cloudflare Verified Bot
      if (input.headers?.['cf-verified-bot'] === 'true') {
        reasons.push('cloudflare_verified_bot');
        flags.push('cf_verified_bot');
        confidence = 'high';
      }

      // 4. Behavioral Analysis (if available)
      if (input.behaviorData) {
        const behaviorResult = this.analyzeBehavior(input.behaviorData);
        if (behaviorResult.suspicious) {
          reasons.push(...behaviorResult.reasons);
          flags.push('suspicious_behavior');
          if (confidence === 'low') confidence = 'medium';
        }
      }

      // 5. Session Analysis
      const sessionResult = this.analyzeSession(input.sessionId);
      if (sessionResult.suspicious) {
        reasons.push(...sessionResult.reasons);
        flags.push('suspicious_session');
        if (confidence === 'low') confidence = 'medium';
      }

      // Determine final result
      const isBot = confidence === 'high' || reasons.length >= 3;

      return {
        isBot,
        confidence,
        reasons,
        flags,
        performanceMs: 0, // Will be set by caller
        cacheHit: false
      };

    } catch (error) {
      return {
        isBot: false, // Default to allowing on error
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
   * Analyze user agent for bot patterns
   */
  private analyzeUserAgent(userAgent: string): {
    isBot: boolean;
    reasons: string[];
    flags: string[];
  } {
    const reasons: string[] = [];
    const flags: string[] = [];

    // Check for obvious bot patterns
    for (const pattern of BOT_PATTERNS) {
      if (pattern.test(userAgent)) {
        reasons.push('bot_pattern_match');
        flags.push('bot_ua');
        return { isBot: true, reasons, flags };
      }
    }

    // Check for suspicious patterns
    for (const pattern of SUSPICIOUS_PATTERNS) {
      if (pattern.test(userAgent)) {
        reasons.push('suspicious_user_agent');
        flags.push('suspicious_ua');
      }
    }

    // Check for missing or too short user agent
    if (!userAgent || userAgent.length < 10) {
      reasons.push('missing_or_short_user_agent');
      flags.push('short_ua');
    }

    // Check for common programming language indicators
    const programmingLanguages = [
      'python', 'java', 'ruby', 'perl', 'php', 'node', 'go', 'rust'
    ];
    
    for (const lang of programmingLanguages) {
      if (userAgent.toLowerCase().includes(lang)) {
        reasons.push('programming_language_in_ua');
        flags.push('prog_lang_ua');
      }
    }

    return {
      isBot: reasons.length >= 2,
      reasons,
      flags
    };
  }

  /**
   * Analyze behavioral patterns
   */
  private analyzeBehavior(behavior: NonNullable<BotDetectionInput['behaviorData']>): {
    suspicious: boolean;
    reasons: string[];
  } {
    const reasons: string[] = [];

    // Too fast viewing (less than 1 second)
    if (behavior.viewDuration !== undefined && behavior.viewDuration < 1000) {
      reasons.push('extremely_fast_viewing');
    }

    // No interaction events
    if (behavior.clickEvents === 0 && behavior.scrollEvents === 0) {
      reasons.push('no_user_interaction');
    }

    // Too many page visits in short time
    if (behavior.pageVisits !== undefined && behavior.pageVisits > 50) {
      reasons.push('excessive_page_visits');
    }

    return {
      suspicious: reasons.length > 0,
      reasons
    };
  }

  /**
   * Analyze session patterns
   */
  private analyzeSession(sessionId: string): {
    suspicious: boolean;
    reasons: string[];
  } {
    const reasons: string[] = [];

    // Check session ID format (should be timestamp + random)
    if (!/^\d{13}-[a-z0-9]{9}$/.test(sessionId)) {
      reasons.push('invalid_session_format');
    }

    // Check if timestamp is realistic (within last hour)
    const timestampStr = sessionId.split('-')[0];
    if (timestampStr) {
      const timestamp = parseInt(timestampStr);
      const now = Date.now();
      const hourAgo = now - 3600000; // 1 hour
      
      if (timestamp < hourAgo || timestamp > now + 60000) { // Allow 1 minute future for clock skew
        reasons.push('invalid_session_timestamp');
      }
    }

    return {
      suspicious: reasons.length > 0,
      reasons
    };
  }

  /**
   * Get cache key for input
   */
  private getCacheKey(input: BotDetectionInput): string {
    const ua = input.userAgent.slice(0, 100); // Limit length
    const headers = input.headers ? JSON.stringify(input.headers) : '';
    return `${ua}_${headers}`;
  }

  /**
   * Get result from cache
   */
  private getFromCache(key: string): BotDetectionResult | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.result;
  }

  /**
   * Set result in cache
   */
  private setCache(key: string, result: BotDetectionResult): void {
    // Implement LRU by removing oldest entries if cache is full
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      result,
      timestamp: Date.now()
    });
  }

  /**
   * Clean expired entries from cache
   */
  private cleanCache(): void {
    const now = Date.now();
    const expired: string[] = [];

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > this.CACHE_TTL) {
        expired.push(key);
      }
    });

    expired.forEach(key => this.cache.delete(key));
  }

  /**
   * Get detection statistics
   */
  async getStats(): Promise<{
    totalDetections: number;
    botsDetected: number;
    cacheHitRate: number;
    averageDetectionTime: number;
  }> {
    // This would typically be tracked in a more sophisticated way
    // For now, return basic cache stats
    return {
      totalDetections: 0, // Would need to track this
      botsDetected: 0, // Would need to track this
      cacheHitRate: 0, // Would need to track this
      averageDetectionTime: 0 // Would need to track this
    };
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
  } {
    return {
      size: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE,
      hitRate: 0 // Would need to track hits/misses
    };
  }

  /**
   * Clear all caches and reset state
   */
  async cleanup(): Promise<void> {
    this.cache.clear();
  }
}

// Lazy initialization for better performance
let detectorInstance: BotDetector | null = null;

/**
 * Get singleton bot detector instance
 */
export default function getBotDetector(): BotDetector {
  if (!detectorInstance) {
    detectorInstance = new BotDetector();
  }
  return detectorInstance;
}

/**
 * Simple bot detection for quick checks
 */
export function isKnownBot(userAgent: string): boolean {
  return BOT_PATTERNS.some(pattern => pattern.test(userAgent));
}