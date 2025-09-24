/**
 * Tests for useTrackGameView Hook
 * Tests privacy-compliant tracking with bot detection
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useTrackGameView } from '../hooks/useTrackGameView';
import { trackingService } from '../services/trackingService';
import { privacyService } from '../services/privacyService';
import getBotDetector from '../services/botDetection';

// Mock dependencies
jest.mock('../services/trackingService');
jest.mock('../services/privacyService');
jest.mock('../services/botDetection');
jest.mock('../hooks/useAuth', () => ({
  useAuth: jest.fn(() => ({
    user: { databaseId: 123, email: 'test@example.com' }
  }))
}));

describe('useTrackGameView Hook', () => {
  const mockBotDetector = {
    detect: jest.fn(),
    cleanup: jest.fn(),
    getStats: jest.fn(),
    getCacheStats: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    (getBotDetector as any).mockReturnValue(mockBotDetector);
    
    mockBotDetector.detect.mockResolvedValue({
      isBot: false,
      confidence: 'high',
      reasons: [],
      flags: [],
      performanceMs: 10,
      cacheHit: false
    });

    (privacyService.getCurrentSessionHash as any).mockResolvedValue('test-session-hash');
    (privacyService.hasTrackingConsent as any).mockResolvedValue(true);
    
    (trackingService.trackGameView as any).mockResolvedValue({
      success: true,
      tracked: true
    });

    (trackingService.getGameStats as any).mockResolvedValue({
      total_views: 100,
      unique_sessions: 50,
      authenticated_views: 30,
      anonymous_views: 70,
      view_sources: { direct: 40, search: 60 },
      updated_at: new Date().toISOString()
    });

    // Mock navigator.userAgent
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 Test Browser',
      configurable: true
    });

    // Mock document.querySelector for CF headers
    document.querySelector = jest.fn(() => null);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should initialize with correct default values', () => {
      const { result } = renderHook(() => 
        useTrackGameView({ gameId: 1 })
      );

      expect(result.current.isBot).toBe(null);
      expect(result.current.isTracking).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.stats).toEqual({
        tracked: 0,
        blocked: 0,
        errors: 0
      });
    });

    it('should auto-track when enabled', async () => {
      const { result } = renderHook(() => 
        useTrackGameView({ 
          gameId: 1, 
          source: 'search',
          autoTrack: true 
        })
      );

      await waitFor(() => {
        expect(trackingService.trackGameView).toHaveBeenCalledWith(
          1,
          'search',
          123 // user ID from mock
        );
      });

      await waitFor(() => {
        expect(result.current.stats.tracked).toBe(1);
      });
    });

    it('should not auto-track when disabled', async () => {
      renderHook(() => 
        useTrackGameView({ 
          gameId: 1,
          autoTrack: false 
        })
      );

      await waitFor(() => {
        expect(trackingService.trackGameView).not.toHaveBeenCalled();
      });
    });
  });

  describe('Bot Detection', () => {
    it('should block tracking when bot is detected', async () => {
      mockBotDetector.detect.mockResolvedValueOnce({
        isBot: true,
        confidence: 'high',
        reasons: ['user_agent_pattern'],
        flags: ['crawler'],
        performanceMs: 5,
        cacheHit: false
      });

      const { result } = renderHook(() => 
        useTrackGameView({ 
          gameId: 1,
          autoTrack: true 
        })
      );

      await waitFor(() => {
        expect(result.current.isBot).toBe(true);
      });

      expect(trackingService.trackGameView).not.toHaveBeenCalled();
      
      await waitFor(() => {
        expect(result.current.stats.blocked).toBe(1);
        expect(result.current.stats.tracked).toBe(0);
      });
    });

    it('should handle bot detection errors gracefully', async () => {
      mockBotDetector.detect.mockRejectedValueOnce(new Error('Detection failed'));

      const { result } = renderHook(() => 
        useTrackGameView({ 
          gameId: 1,
          autoTrack: true 
        })
      );

      // Should still track on bot detection error (defaults to not bot)
      await waitFor(() => {
        expect(trackingService.trackGameView).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(result.current.stats.tracked).toBe(1);
      });
    });

    it('should use Cloudflare headers when available', async () => {
      document.querySelector = jest.fn((selector: string) => {
        if (selector === 'meta[name="cf-bot-score"]') {
          return { getAttribute: () => '0.9' };
        }
        if (selector === 'meta[name="cf-verified-bot"]') {
          return { getAttribute: () => 'true' };
        }
        return null;
      }) as any;

      renderHook(() => 
        useTrackGameView({ 
          gameId: 1,
          autoTrack: true 
        })
      );

      await waitFor(() => {
        expect(mockBotDetector.detect).toHaveBeenCalledWith(
          expect.objectContaining({
            headers: {
              'cf-bot-score': '0.9',
              'cf-verified-bot': 'true'
            }
          })
        );
      });
    });
  });

  describe('Privacy Consent', () => {
    it('should not track without consent', async () => {
      (privacyService.hasTrackingConsent as any).mockResolvedValueOnce(false);

      const { result } = renderHook(() => 
        useTrackGameView({ 
          gameId: 1,
          autoTrack: true 
        })
      );

      await waitFor(() => {
        expect(mockBotDetector.detect).toHaveBeenCalled();
      });

      expect(trackingService.trackGameView).not.toHaveBeenCalled();
      
      await waitFor(() => {
        expect(result.current.stats.tracked).toBe(0);
      });
    });

    it('should check consent with user ID when authenticated', async () => {
      renderHook(() => 
        useTrackGameView({ 
          gameId: 1,
          autoTrack: true 
        })
      );

      await waitFor(() => {
        expect(privacyService.hasTrackingConsent).toHaveBeenCalledWith(123);
      });
    });
  });

  describe('Manual Tracking', () => {
    it('should allow manual tracking with custom parameters', async () => {
      const { result } = renderHook(() => 
        useTrackGameView({ 
          autoTrack: false 
        })
      );

      await result.current.trackView(42, 'recommendation');

      await waitFor(() => {
        expect(trackingService.trackGameView).toHaveBeenCalledWith(
          42,
          'recommendation',
          123
        );
      });
    });

    it('should handle tracking errors', async () => {
      const error = new Error('Tracking failed');
      (trackingService.trackGameView as any).mockRejectedValueOnce(error);

      const { result } = renderHook(() => 
        useTrackGameView({ 
          gameId: 1,
          autoTrack: true 
        })
      );

      await waitFor(() => {
        expect(result.current.error).toEqual(error);
        expect(result.current.stats.errors).toBe(1);
      });
    });

    it('should prevent duplicate tracking during request', async () => {
      const { result } = renderHook(() => 
        useTrackGameView({ 
          gameId: 1,
          autoTrack: false 
        })
      );

      // Start multiple tracking requests
      const promise1 = result.current.trackView();
      const promise2 = result.current.trackView();
      
      await Promise.all([promise1, promise2]);

      // Should only track once
      expect(trackingService.trackGameView).toHaveBeenCalledTimes(1);
    });
  });

  describe('View Source Tracking', () => {
    it('should track different view sources correctly', async () => {
      const sources = ['search', 'direct', 'recommendation', 'list', 'review', 'profile'] as const;
      
      for (const source of sources) {
        jest.clearAllMocks();
        
        const { result } = renderHook(() => 
          useTrackGameView({ 
            gameId: 1,
            source,
            autoTrack: true 
          })
        );

        await waitFor(() => {
          expect(trackingService.trackGameView).toHaveBeenCalledWith(
            1,
            source,
            123
          );
        });
      }
    });
  });

  describe('Debug Mode', () => {
    it('should log debug information when enabled', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      const { result } = renderHook(() => 
        useTrackGameView({ 
          gameId: 1,
          debug: true,
          autoTrack: true 
        })
      );

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('[useTrackGameView]'),
          expect.anything()
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Session Management', () => {
    it('should initialize session hash on mount', async () => {
      renderHook(() => 
        useTrackGameView({ gameId: 1 })
      );

      await waitFor(() => {
        expect(privacyService.getCurrentSessionHash).toHaveBeenCalled();
      });
    });

    it('should pass session ID to bot detector', async () => {
      renderHook(() => 
        useTrackGameView({ 
          gameId: 1,
          autoTrack: true 
        })
      );

      await waitFor(() => {
        expect(mockBotDetector.detect).toHaveBeenCalledWith(
          expect.objectContaining({
            sessionId: 'test-session-hash'
          })
        );
      });
    });
  });

  describe('Cleanup', () => {
    it('should cleanup bot detector on unmount', async () => {
      const { unmount } = renderHook(() => 
        useTrackGameView({ gameId: 1 })
      );

      unmount();

      await waitFor(() => {
        expect(mockBotDetector.cleanup).toHaveBeenCalled();
      });
    });

    it('should not update state after unmount', async () => {
      const { result, unmount } = renderHook(() => 
        useTrackGameView({ 
          gameId: 1,
          autoTrack: false 
        })
      );

      unmount();

      // Try to track after unmount
      await result.current.trackView();

      // Stats should not be updated
      expect(result.current.stats.tracked).toBe(0);
    });
  });

  describe('Performance', () => {
    it('should track performance metrics from bot detection', async () => {
      mockBotDetector.detect.mockResolvedValueOnce({
        isBot: false,
        confidence: 'high',
        reasons: [],
        flags: [],
        performanceMs: 25,
        cacheHit: true
      });

      const { result } = renderHook(() => 
        useTrackGameView({ 
          gameId: 1,
          autoTrack: true 
        })
      );

      await waitFor(() => {
        expect(result.current.botCheckResult?.performanceMs).toBe(25);
        expect(result.current.botCheckResult?.cacheHit).toBe(true);
      });
    });
  });
});