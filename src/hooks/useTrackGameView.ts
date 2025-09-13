/**
 * React Hook for Game View Tracking with Bot Detection
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from './useAuth';
import { trackingService, ViewSource } from '../services/trackingService';
import { privacyService } from '../services/privacyService';
import getBotDetector, { BotDetectionResult } from '../services/botDetection';

interface UseTrackGameViewOptions {
  gameId?: number;
  source?: ViewSource;
  autoTrack?: boolean;
  enabled?: boolean;
  debug?: boolean;
}

interface UseTrackGameViewResult {
  trackView: (gameId?: number, source?: ViewSource) => Promise<void>;
  isBot: boolean | null;
  botCheckResult: BotDetectionResult | null;
  isTracking: boolean;
  error: Error | null;
  stats: {
    tracked: number;
    blocked: number;
    errors: number;
  };
}

export function useTrackGameView(options: UseTrackGameViewOptions = {}): UseTrackGameViewResult {
  const {
    gameId,
    source = 'direct',
    autoTrack = true,
    enabled = true,
    debug = false
  } = options;

  const { user } = useAuth();
  const [isBot, setIsBot] = useState<boolean | null>(null);
  const [botCheckResult, setBotCheckResult] = useState<BotDetectionResult | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [stats, setStats] = useState({
    tracked: 0,
    blocked: 0,
    errors: 0
  });

  const hasTracked = useRef(false);
  const sessionId = useRef<string>('');
  const detector = useRef(getBotDetector());
  const mounted = useRef(true);

  // Initialize session
  useEffect(() => {
    // Get or create session ID
    const getSessionId = async () => {
      const hash = await privacyService.getCurrentSessionHash();
      sessionId.current = hash;
    };
    
    getSessionId();

    // Cleanup on unmount
    return () => {
      mounted.current = false;
      
      // Cleanup detector if needed
      if (detector.current) {
        detector.current.cleanup().catch(console.error);
      }
    };
  }, []);

  /**
   * Perform bot detection
   */
  const checkBot = useCallback(async (): Promise<BotDetectionResult> => {
    try {
      const userAgent = navigator.userAgent;
      const headers: Record<string, string> = {};

      // Add Cloudflare headers if available (from meta tags or custom headers)
      const cfBotScore = document.querySelector('meta[name="cf-bot-score"]')?.getAttribute('content');
      const cfVerifiedBot = document.querySelector('meta[name="cf-verified-bot"]')?.getAttribute('content');
      
      if (cfBotScore) headers['cf-bot-score'] = cfBotScore;
      if (cfVerifiedBot) headers['cf-verified-bot'] = cfVerifiedBot;

      const result = await detector.current.detect({
        userAgent,
        sessionId: sessionId.current,
        gameId,
        headers: Object.keys(headers).length > 0 ? headers : undefined
      });

      if (debug) {
        console.log('[useTrackGameView] Bot detection result:', result);
      }

      return result;
    } catch (err) {
      console.error('[useTrackGameView] Bot detection error:', err);
      
      // Default to allowing tracking on error
      return {
        isBot: false,
        confidence: 'low',
        reasons: ['detection_error'],
        flags: [],
        performanceMs: 0,
        cacheHit: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }
  }, [gameId, debug]);

  /**
   * Track a game view
   */
  const trackView = useCallback(async (
    overrideGameId?: number,
    overrideSource?: ViewSource
  ): Promise<void> => {
    if (!enabled) {
      if (debug) {
        console.log('[useTrackGameView] Tracking disabled');
      }
      return;
    }

    const trackGameId = overrideGameId || gameId;
    if (!trackGameId) {
      if (debug) {
        console.log('[useTrackGameView] No game ID provided');
      }
      return;
    }

    setIsTracking(true);
    setError(null);

    try {
      // Check for bot
      const botResult = await checkBot();
      
      if (mounted.current) {
        setIsBot(botResult.isBot);
        setBotCheckResult(botResult);
      }

      if (botResult.isBot) {
        if (debug) {
          console.log('[useTrackGameView] Bot detected, blocking tracking:', botResult.reasons);
        }
        
        setStats(prev => ({
          ...prev,
          blocked: prev.blocked + 1
        }));
        
        return;
      }

      // Check privacy consent
      const hasConsent = await privacyService.hasTrackingConsent(user?.databaseId);
      
      if (!hasConsent) {
        if (debug) {
          console.log('[useTrackGameView] No tracking consent');
        }
        return;
      }

      // Track the view
      const trackResult = await trackingService.trackGameView(
        trackGameId,
        overrideSource || source,
        user?.databaseId
      );

      if (trackResult.tracked) {
        setStats(prev => ({
          ...prev,
          tracked: prev.tracked + 1
        }));
        
        if (debug) {
          console.log('[useTrackGameView] View tracked successfully');
        }
      } else if (debug) {
        console.log('[useTrackGameView] View not tracked:', trackResult.reason);
      }

    } catch (err) {
      console.error('[useTrackGameView] Tracking error:', err);
      
      if (mounted.current) {
        setError(err instanceof Error ? err : new Error('Tracking failed'));
        setStats(prev => ({
          ...prev,
          errors: prev.errors + 1
        }));
      }
    } finally {
      if (mounted.current) {
        setIsTracking(false);
      }
    }
  }, [enabled, gameId, source, user, debug, checkBot]);

  // Auto-track on mount or game change
  useEffect(() => {
    if (autoTrack && gameId && !hasTracked.current && enabled) {
      hasTracked.current = true;
      trackView();
    }
  }, [autoTrack, gameId, enabled, trackView]);

  // Reset tracking flag when game changes
  useEffect(() => {
    hasTracked.current = false;
  }, [gameId]);

  // Get detector stats for debugging
  useEffect(() => {
    if (debug) {
      const interval = setInterval(async () => {
        const detectorStats = await detector.current.getStats();
        const cacheStats = detector.current.getCacheStats();
        
        console.log('[useTrackGameView] Detector stats:', {
          detector: detectorStats,
          cache: cacheStats,
          tracking: stats
        });
      }, 30000); // Every 30 seconds

      return () => clearInterval(interval);
    }
  }, [debug, stats]);

  return {
    trackView,
    isBot,
    botCheckResult,
    isTracking,
    error,
    stats
  };
}

/**
 * Simplified hook for automatic tracking
 */
export function useAutoTrackGameView(
  gameId: number | undefined,
  source: ViewSource = 'direct'
): void {
  const { trackView } = useTrackGameView({
    gameId,
    source,
    autoTrack: true,
    enabled: true
  });

  useEffect(() => {
    if (gameId) {
      trackView();
    }
  }, [gameId, trackView]);
}