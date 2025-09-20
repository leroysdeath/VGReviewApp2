/**
 * Bot Detection Types
 */

export type BotConfidence = 'low' | 'medium' | 'high';

export interface BotDetectionResult {
  isBot: boolean;
  confidence: BotConfidence;
  reasons: string[];
  flags: string[];
  performanceMs: number;
  cacheHit: boolean;
  rateLimitResetIn?: number;
  behaviorScore?: number;
  error?: string;
}

export interface BotDetectionRequest {
  userAgent: string;
  sessionId: string;
  gameId?: number;
  headers?: Record<string, string>;
  sessionData?: SessionData;
  cacheKey?: string;
}

export interface SessionData {
  viewHistory: ViewHistoryItem[];
  totalViews: number;
  sessionDuration: number;
  startTime: number;
}

export interface ViewHistoryItem {
  gameId: number;
  timestamp: number;
  duration?: number;
  source?: string;
}

export interface BotDetectorStats {
  checksPerformed: number;
  cacheHits: number;
  cacheMisses: number;
  rateLimitMapSize: number;
  memoryEstimate: number;
}

export interface CacheEntry {
  result: BotDetectionResult;
  timestamp: number;
  hits: number;
}

export interface CacheStats {
  userAgentCache: {
    size: number;
    hits: number;
    misses: number;
    hitRate: number;
  };
  sessionCache: {
    size: number;
    hits: number;
    misses: number;
    hitRate: number;
  };
  combinedCache: {
    size: number;
    hits: number;
    misses: number;
    hitRate: number;
  };
  totalMemoryBytes: number;
}

export interface BotDetectorConfig {
  enableWorker?: boolean;
  enableCache?: boolean;
  cacheMaxSize?: number;
  cacheTTL?: {
    userAgent?: number;
    session?: number;
    combined?: number;
  };
  debug?: boolean;
  performanceTracking?: boolean;
}