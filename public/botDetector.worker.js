/**
 * Bot Detection Web Worker
 * Runs bot detection logic in a background thread for zero UI impact
 */

// Known bot user agents patterns (simplified for performance)
const BOT_PATTERNS = [
  /bot/i,
  /crawler/i,
  /spider/i,
  /scraper/i,
  /curl/i,
  /wget/i,
  /python/i,
  /java(?!script)/i,
  /ruby/i,
  /perl/i,
  /php/i,
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
  /slackbot/i,
  /discordbot/i,
  /telegrambot/i,
  /semrushbot/i,
  /ahrefs/i,
  /mj12bot/i,
  /dotbot/i,
  /seznambot/i,
  /panscient/i,
  /ia_archiver/i,
  /alexa/i,
  /uptimerobot/i,
  /pingdom/i,
  /newrelic/i,
  /datadog/i,
  /zabbix/i,
  /nagios/i,
  /prometheus/i,
  /grafana/i
];

// Browser validation patterns
const BROWSER_PATTERNS = [
  /chrome/i,
  /safari/i,
  /firefox/i,
  /edge/i,
  /opera/i,
  /brave/i,
  /vivaldi/i
];

// Mobile app patterns
const MOBILE_APP_PATTERNS = [
  /instagram/i,
  /pinterest/i,
  /flipboard/i,
  /linkedin/i,
  /twitter/i,
  /facebook/i,
  /snapchat/i
];

// Rate limiting storage
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_VIEWS_PER_MINUTE = 30;
const CLEANUP_INTERVAL = 300000; // 5 minutes

// Performance monitoring
let checksPerformed = 0;
let cacheHits = 0;
let cacheMisses = 0;

/**
 * Check if user agent is a known bot
 */
function isBot(userAgent) {
  if (!userAgent) return true;
  
  const ua = userAgent.toLowerCase();
  
  // Quick check for common bot indicators
  if (ua.includes('bot') || ua.includes('crawler') || ua.includes('spider')) {
    return true;
  }
  
  // Check against bot patterns
  for (const pattern of BOT_PATTERNS) {
    if (pattern.test(ua)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if user agent is a legitimate browser
 */
function isLegitBrowser(userAgent) {
  if (!userAgent) return false;
  
  const ua = userAgent.toLowerCase();
  
  // Must have browser identifier
  let hasBrowser = false;
  for (const pattern of BROWSER_PATTERNS) {
    if (pattern.test(ua)) {
      hasBrowser = true;
      break;
    }
  }
  
  // Check for mobile apps (considered legitimate)
  if (!hasBrowser) {
    for (const pattern of MOBILE_APP_PATTERNS) {
      if (pattern.test(ua)) {
        return true;
      }
    }
  }
  
  return hasBrowser;
}

/**
 * Check rate limiting
 */
function checkRateLimit(sessionId, gameId) {
  const now = Date.now();
  const key = `${sessionId}-${gameId}`;
  
  // Get or create rate limit entry
  let entry = rateLimitMap.get(key);
  if (!entry) {
    entry = {
      views: [],
      lastCleanup: now
    };
    rateLimitMap.set(key, entry);
  }
  
  // Clean old entries
  entry.views = entry.views.filter(time => now - time < RATE_LIMIT_WINDOW);
  
  // Check if rate limit exceeded
  if (entry.views.length >= 1) {
    // Already viewed this game in the last minute
    return {
      allowed: false,
      reason: 'rate_limit_per_game',
      resetIn: RATE_LIMIT_WINDOW - (now - entry.views[0])
    };
  }
  
  // Check overall rate limit for session
  const sessionKey = sessionId;
  let sessionEntry = rateLimitMap.get(sessionKey);
  if (!sessionEntry) {
    sessionEntry = {
      views: [],
      lastCleanup: now
    };
    rateLimitMap.set(sessionKey, sessionEntry);
  }
  
  sessionEntry.views = sessionEntry.views.filter(time => now - time < RATE_LIMIT_WINDOW);
  
  if (sessionEntry.views.length >= MAX_VIEWS_PER_MINUTE) {
    return {
      allowed: false,
      reason: 'rate_limit_overall',
      resetIn: RATE_LIMIT_WINDOW - (now - sessionEntry.views[0])
    };
  }
  
  // Add to rate limit tracking
  entry.views.push(now);
  sessionEntry.views.push(now);
  
  return {
    allowed: true
  };
}

/**
 * Analyze behavior patterns
 */
function analyzeBehavior(sessionData) {
  const { viewHistory, totalViews, sessionDuration } = sessionData;
  
  // Check for suspicious patterns
  const suspiciousPatterns = [];
  
  // Too many views in short time
  if (totalViews > 100 && sessionDuration < 600000) { // 100 views in 10 minutes
    suspiciousPatterns.push('rapid_viewing');
  }
  
  // Sequential game IDs (crawling pattern)
  if (viewHistory && viewHistory.length > 5) {
    let sequential = 0;
    for (let i = 1; i < viewHistory.length; i++) {
      if (Math.abs(viewHistory[i].gameId - viewHistory[i-1].gameId) === 1) {
        sequential++;
      }
    }
    if (sequential > viewHistory.length * 0.7) {
      suspiciousPatterns.push('sequential_crawling');
    }
  }
  
  // No interaction time (instant navigation)
  if (viewHistory && viewHistory.length > 10) {
    const avgTime = viewHistory.reduce((sum, v) => sum + (v.duration || 0), 0) / viewHistory.length;
    if (avgTime < 1000) { // Less than 1 second average
      suspiciousPatterns.push('no_interaction');
    }
  }
  
  return {
    suspicious: suspiciousPatterns.length > 0,
    patterns: suspiciousPatterns,
    score: suspiciousPatterns.length * 25 // 0-100 score
  };
}

/**
 * Check Cloudflare headers (when available)
 */
function checkCloudflareHeaders(headers) {
  if (!headers) return null;
  
  const result = {
    isBot: false,
    confidence: 'low',
    source: 'cloudflare'
  };
  
  // Check CF-Bot-Score (1-99, lower is more bot-like)
  if (headers['cf-bot-score']) {
    const score = parseInt(headers['cf-bot-score']);
    if (score < 30) {
      result.isBot = true;
      result.confidence = score < 10 ? 'high' : 'medium';
    }
  }
  
  // Check CF-Verified-Bot
  if (headers['cf-verified-bot'] === 'true') {
    result.isBot = true;
    result.confidence = 'high';
    result.verifiedBot = true;
  }
  
  return result;
}

/**
 * Main detection function
 */
function detectBot(data) {
  const startTime = performance.now();
  checksPerformed++;
  
  const {
    userAgent,
    sessionId,
    gameId,
    headers,
    sessionData,
    cacheKey
  } = data;
  
  // Initialize result
  const result = {
    isBot: false,
    confidence: 'low',
    reasons: [],
    flags: [],
    performanceMs: 0,
    cacheHit: false
  };
  
  try {
    // 1. Check Cloudflare headers (highest priority)
    if (headers) {
      const cfResult = checkCloudflareHeaders(headers);
      if (cfResult && cfResult.confidence === 'high') {
        result.isBot = cfResult.isBot;
        result.confidence = cfResult.confidence;
        result.reasons.push('cloudflare_verified');
        result.performanceMs = performance.now() - startTime;
        return result;
      }
    }
    
    // 2. Check user agent
    if (isBot(userAgent)) {
      result.isBot = true;
      result.confidence = 'high';
      result.reasons.push('bot_user_agent');
      result.flags.push('known_bot');
    } else if (!isLegitBrowser(userAgent)) {
      result.isBot = true;
      result.confidence = 'medium';
      result.reasons.push('unknown_user_agent');
      result.flags.push('suspicious_ua');
    }
    
    // 3. Check rate limiting (only if not already flagged as bot)
    if (!result.isBot && sessionId && gameId) {
      const rateLimit = checkRateLimit(sessionId, gameId);
      if (!rateLimit.allowed) {
        result.isBot = true;
        result.confidence = 'medium';
        result.reasons.push(rateLimit.reason);
        result.rateLimitResetIn = rateLimit.resetIn;
      }
    }
    
    // 4. Analyze behavior patterns
    if (sessionData && !result.isBot) {
      const behavior = analyzeBehavior(sessionData);
      if (behavior.suspicious) {
        result.isBot = true;
        result.confidence = behavior.score > 50 ? 'high' : 'medium';
        result.reasons.push(...behavior.patterns);
        result.behaviorScore = behavior.score;
      }
    }
    
    // 5. Additional checks
    if (!userAgent || userAgent.length < 10) {
      result.flags.push('missing_ua');
      if (!result.isBot) {
        result.isBot = true;
        result.confidence = 'low';
        result.reasons.push('invalid_user_agent');
      }
    }
    
  } catch (error) {
    console.error('Bot detection error:', error);
    result.error = error.message;
  }
  
  result.performanceMs = performance.now() - startTime;
  return result;
}

/**
 * Clean up old rate limit entries
 */
function cleanupRateLimits() {
  const now = Date.now();
  const keysToDelete = [];
  
  rateLimitMap.forEach((entry, key) => {
    // Remove entries with no recent views
    if (!entry.views || entry.views.length === 0) {
      keysToDelete.push(key);
    } else {
      // Clean old views
      entry.views = entry.views.filter(time => now - time < RATE_LIMIT_WINDOW * 2);
      if (entry.views.length === 0) {
        keysToDelete.push(key);
      }
    }
  });
  
  keysToDelete.forEach(key => rateLimitMap.delete(key));
}

// Set up periodic cleanup
setInterval(cleanupRateLimits, CLEANUP_INTERVAL);

/**
 * Handle messages from main thread
 */
self.onmessage = function(event) {
  const { type, data, id } = event.data;
  
  switch (type) {
    case 'detect':
      const result = detectBot(data);
      self.postMessage({
        type: 'result',
        id,
        data: result
      });
      break;
      
    case 'getStats':
      self.postMessage({
        type: 'stats',
        id,
        data: {
          checksPerformed,
          cacheHits,
          cacheMisses,
          rateLimitMapSize: rateLimitMap.size,
          memoryEstimate: rateLimitMap.size * 200 // Rough estimate in bytes
        }
      });
      break;
      
    case 'clear':
      rateLimitMap.clear();
      checksPerformed = 0;
      cacheHits = 0;
      cacheMisses = 0;
      self.postMessage({
        type: 'cleared',
        id
      });
      break;
      
    case 'cleanup':
      cleanupRateLimits();
      self.postMessage({
        type: 'cleaned',
        id,
        data: {
          remaining: rateLimitMap.size
        }
      });
      break;
      
    default:
      self.postMessage({
        type: 'error',
        id,
        error: 'Unknown message type'
      });
  }
};