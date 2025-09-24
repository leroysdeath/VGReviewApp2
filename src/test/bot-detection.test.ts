/**
 * Unit tests for Bot Detection Service
 * Tests multi-layered bot detection functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import getBotDetector, { isKnownBot, BotDetectionInput } from '../services/botDetection';

describe('Bot Detection Service', () => {
  let detector: ReturnType<typeof getBotDetector>;

  beforeEach(() => {
    vi.clearAllMocks();
    detector = getBotDetector();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Known Bot Detection', () => {
    const botUserAgents = [
      'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
      'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
      'Twitterbot/1.0',
      'curl/7.68.0',
      'python-requests/2.25.1',
      'Java/1.8.0_291',
      'Go-http-client/1.1',
      'bot crawler spider',
      'HeadlessChrome/90.0.4430.212',
      'PhantomJS/2.1.1'
    ];

    botUserAgents.forEach(userAgent => {
      it(`should detect "${userAgent}" as a bot`, () => {
        expect(isKnownBot(userAgent)).toBe(true);
      });
    });

    const humanUserAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1'
    ];

    humanUserAgents.forEach(userAgent => {
      it(`should NOT detect "${userAgent}" as a bot`, () => {
        expect(isKnownBot(userAgent)).toBe(false);
      });
    });
  });

  describe('Full Bot Detection', () => {
    it('should detect obvious bots with high confidence', async () => {
      const input: BotDetectionInput = {
        userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        sessionId: '1640995200000-abcdefghi' // Valid format
      };

      const result = await detector.detect(input);

      expect(result.isBot).toBe(true);
      expect(result.confidence).toBe('high');
      expect(result.reasons).toContain('bot_pattern_match');
      expect(result.flags).toContain('bot_ua');
    });

    it('should allow legitimate users', async () => {
      const input: BotDetectionInput = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        sessionId: `${Date.now()}-abcdefghi` // Current timestamp
      };

      const result = await detector.detect(input);

      expect(result.isBot).toBe(false);
      expect(result.confidence).toBe('low');
      expect(result.reasons.length).toBe(0);
    });

    it('should detect suspicious user agents', async () => {
      const suspiciousUserAgents = [
        'Mozilla/5.0', // Too short
        '', // Empty
        'User-Agent', // Generic
        'Mozilla/5.0 python/3.8', // Programming language
        'windows nt 10.0 wow64 windows nt 10.0' // Duplicate Windows version
      ];

      for (const userAgent of suspiciousUserAgents) {
        const input: BotDetectionInput = {
          userAgent,
          sessionId: `${Date.now()}-abcdefghi`
        };

        const result = await detector.detect(input);
        
        if (userAgent === 'Mozilla/5.0 python/3.8') {
          expect(result.reasons).toContain('programming_language_in_ua');
        }
        if (userAgent === '' || userAgent === 'Mozilla/5.0') {
          expect(result.reasons).toContain('missing_or_short_user_agent');
        }
      }
    });
  });

  describe('Cloudflare Integration', () => {
    it('should use Cloudflare bot score when available', async () => {
      const input: BotDetectionInput = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        sessionId: `${Date.now()}-abcdefghi`,
        headers: {
          'cf-bot-score': '15' // Low score indicates bot
        }
      };

      const result = await detector.detect(input);

      expect(result.isBot).toBe(true);
      expect(result.confidence).toBe('high');
      expect(result.reasons).toContain('cloudflare_bot_score_low');
      expect(result.flags).toContain('cf_bot_score');
    });

    it('should trust Cloudflare verified bots', async () => {
      const input: BotDetectionInput = {
        userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1)',
        sessionId: `${Date.now()}-abcdefghi`,
        headers: {
          'cf-verified-bot': 'true'
        }
      };

      const result = await detector.detect(input);

      expect(result.isBot).toBe(true);
      expect(result.confidence).toBe('high');
      expect(result.reasons).toContain('cloudflare_verified_bot');
      expect(result.flags).toContain('cf_verified_bot');
    });

    it('should allow high Cloudflare bot scores', async () => {
      const input: BotDetectionInput = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        sessionId: `${Date.now()}-abcdefghi`,
        headers: {
          'cf-bot-score': '85' // High score indicates human
        }
      };

      const result = await detector.detect(input);

      // Should not be flagged as bot based on CF score alone
      expect(result.reasons).not.toContain('cloudflare_bot_score_low');
    });
  });

  describe('Behavioral Analysis', () => {
    it('should detect extremely fast viewing as suspicious', async () => {
      const input: BotDetectionInput = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        sessionId: `${Date.now()}-abcdefghi`,
        behaviorData: {
          viewDuration: 100, // 100ms - too fast
          clickEvents: 0,
          scrollEvents: 0
        }
      };

      const result = await detector.detect(input);

      expect(result.reasons).toContain('extremely_fast_viewing');
      expect(result.flags).toContain('suspicious_behavior');
    });

    it('should detect lack of user interaction', async () => {
      const input: BotDetectionInput = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        sessionId: `${Date.now()}-abcdefghi`,
        behaviorData: {
          viewDuration: 5000,
          clickEvents: 0, // No clicks
          scrollEvents: 0 // No scrolling
        }
      };

      const result = await detector.detect(input);

      expect(result.reasons).toContain('no_user_interaction');
      expect(result.flags).toContain('suspicious_behavior');
    });

    it('should detect excessive page visits', async () => {
      const input: BotDetectionInput = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        sessionId: `${Date.now()}-abcdefghi`,
        behaviorData: {
          pageVisits: 100 // Too many visits
        }
      };

      const result = await detector.detect(input);

      expect(result.reasons).toContain('excessive_page_visits');
      expect(result.flags).toContain('suspicious_behavior');
    });

    it('should allow normal user behavior', async () => {
      const input: BotDetectionInput = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        sessionId: `${Date.now()}-abcdefghi`,
        behaviorData: {
          viewDuration: 15000, // 15 seconds
          clickEvents: 5,
          scrollEvents: 10,
          pageVisits: 3
        }
      };

      const result = await detector.detect(input);

      expect(result.isBot).toBe(false);
      expect(result.reasons).not.toContain('extremely_fast_viewing');
      expect(result.reasons).not.toContain('no_user_interaction');
      expect(result.reasons).not.toContain('excessive_page_visits');
    });
  });

  describe('Session Analysis', () => {
    it('should validate session ID format', async () => {
      const input: BotDetectionInput = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        sessionId: 'invalid-session-format'
      };

      const result = await detector.detect(input);

      expect(result.reasons).toContain('invalid_session_format');
      expect(result.flags).toContain('suspicious_session');
    });

    it('should validate session timestamp', async () => {
      const oldTimestamp = Date.now() - 7200000; // 2 hours ago
      const input: BotDetectionInput = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        sessionId: `${oldTimestamp}-abcdefghi`
      };

      const result = await detector.detect(input);

      expect(result.reasons).toContain('invalid_session_timestamp');
      expect(result.flags).toContain('suspicious_session');
    });

    it('should accept valid session IDs', async () => {
      const currentTimestamp = Date.now();
      const input: BotDetectionInput = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        sessionId: `${currentTimestamp}-abcdefghi`
      };

      const result = await detector.detect(input);

      expect(result.reasons).not.toContain('invalid_session_format');
      expect(result.reasons).not.toContain('invalid_session_timestamp');
    });
  });

  describe('Caching', () => {
    it('should cache detection results', async () => {
      const input: BotDetectionInput = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        sessionId: `${Date.now()}-abcdefghi`
      };

      // First call
      const result1 = await detector.detect(input);
      expect(result1.cacheHit).toBe(false);

      // Second call with same input should be cached
      const result2 = await detector.detect(input);
      expect(result2.cacheHit).toBe(true);
      expect(result2.isBot).toBe(result1.isBot);
    });

    it('should provide cache statistics', () => {
      const stats = detector.getCacheStats();
      
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('maxSize');
      expect(stats).toHaveProperty('hitRate');
      expect(typeof stats.size).toBe('number');
      expect(typeof stats.maxSize).toBe('number');
    });
  });

  describe('Performance', () => {
    it('should complete detection within reasonable time', async () => {
      const input: BotDetectionInput = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        sessionId: `${Date.now()}-abcdefghi`
      };

      const start = performance.now();
      const result = await detector.detect(input);
      const end = performance.now();

      expect(result.performanceMs).toBeGreaterThan(0);
      expect(end - start).toBeLessThan(100); // Should complete in under 100ms
    });

    it('should handle detection errors gracefully', async () => {
      // Mock performance.now to throw an error
      const originalPerformanceNow = performance.now;
      performance.now = vi.fn(() => { throw new Error('Performance error'); });

      const input: BotDetectionInput = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        sessionId: `${Date.now()}-abcdefghi`
      };

      const result = await detector.detect(input);

      // Should not crash and should default to allowing
      expect(result.isBot).toBe(false);
      expect(result.reasons).toContain('detection_error');
      expect(result.error).toBeDefined();

      // Restore original function
      performance.now = originalPerformanceNow;
    });
  });

  describe('Cleanup and Management', () => {
    it('should provide cleanup functionality', async () => {
      await expect(detector.cleanup()).resolves.not.toThrow();
    });

    it('should provide detection statistics', async () => {
      const stats = await detector.getStats();
      
      expect(stats).toHaveProperty('totalDetections');
      expect(stats).toHaveProperty('botsDetected');
      expect(stats).toHaveProperty('cacheHitRate');
      expect(stats).toHaveProperty('averageDetectionTime');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing user agent', async () => {
      const input: BotDetectionInput = {
        userAgent: '',
        sessionId: `${Date.now()}-abcdefghi`
      };

      const result = await detector.detect(input);
      
      expect(result.reasons).toContain('missing_or_short_user_agent');
    });

    it('should handle missing session ID', async () => {
      const input: BotDetectionInput = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        sessionId: ''
      };

      const result = await detector.detect(input);
      
      expect(result.reasons).toContain('invalid_session_format');
    });

    it('should handle unicode characters in user agent', async () => {
      const input: BotDetectionInput = {
        userAgent: 'Mozilla/5.0 测试浏览器 (Windows NT 10.0; Win64; x64)',
        sessionId: `${Date.now()}-abcdefghi`
      };

      const result = await detector.detect(input);
      
      // Should not crash with unicode characters
      expect(result).toBeDefined();
      expect(typeof result.isBot).toBe('boolean');
    });
  });
});