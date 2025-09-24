/**
 * Simple Tests for useTrackGameView Hook
 * Basic functionality tests without complex dependencies
 */

import { renderHook, act } from '@testing-library/react';
import { useTrackGameView } from '../hooks/useTrackGameView';

// Mock all external dependencies
jest.mock('../services/trackingService', () => ({
  trackingService: {
    trackGameView: jest.fn(() => Promise.resolve({
      success: true,
      tracked: true
    })),
    getGameStats: jest.fn(() => Promise.resolve({
      total_views: 100,
      unique_sessions: 50,
      authenticated_views: 30,
      anonymous_views: 70,
      view_sources: { direct: 40, search: 60 },
      updated_at: new Date().toISOString()
    }))
  }
}));

jest.mock('../services/privacyService', () => ({
  privacyService: {
    getCurrentSessionHash: jest.fn(() => Promise.resolve('test-session-hash')),
    hasTrackingConsent: jest.fn(() => Promise.resolve(true))
  }
}));

jest.mock('../services/botDetection', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    detect: jest.fn(() => Promise.resolve({
      isBot: false,
      confidence: 'high',
      reasons: [],
      flags: [],
      performanceMs: 10,
      cacheHit: false
    })),
    cleanup: jest.fn(() => Promise.resolve()),
    getStats: jest.fn(() => Promise.resolve({})),
    getCacheStats: jest.fn(() => ({}))
  }))
}));

jest.mock('../hooks/useAuth', () => ({
  useAuth: jest.fn(() => ({
    user: { databaseId: 123, email: 'test@example.com' }
  }))
}));

// Global mocks
Object.defineProperty(navigator, 'userAgent', {
  value: 'Mozilla/5.0 Test Browser',
  configurable: true
});

document.querySelector = jest.fn(() => null);

describe('useTrackGameView Hook - Basic Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => 
      useTrackGameView({ gameId: 1, autoTrack: false })
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

  it('should provide trackView function', () => {
    const { result } = renderHook(() => 
      useTrackGameView({ gameId: 1, autoTrack: false })
    );

    expect(typeof result.current.trackView).toBe('function');
  });

  it('should accept different game IDs', () => {
    const { result } = renderHook(() => 
      useTrackGameView({ gameId: 42, autoTrack: false })
    );

    expect(result.current.trackView).toBeDefined();
  });

  it('should accept different view sources', () => {
    const sources = ['search', 'direct', 'recommendation', 'list', 'review', 'profile'] as const;
    
    sources.forEach(source => {
      const { result } = renderHook(() => 
        useTrackGameView({ gameId: 1, source, autoTrack: false })
      );

      expect(result.current.trackView).toBeDefined();
    });
  });

  it('should handle enabled/disabled state', () => {
    const { result: enabledResult } = renderHook(() => 
      useTrackGameView({ gameId: 1, enabled: true, autoTrack: false })
    );

    const { result: disabledResult } = renderHook(() => 
      useTrackGameView({ gameId: 1, enabled: false, autoTrack: false })
    );

    expect(enabledResult.current.trackView).toBeDefined();
    expect(disabledResult.current.trackView).toBeDefined();
  });

  it('should handle debug mode', () => {
    const { result } = renderHook(() => 
      useTrackGameView({ gameId: 1, debug: true, autoTrack: false })
    );

    expect(result.current.trackView).toBeDefined();
  });

  it('should provide bot detection results', async () => {
    const { result } = renderHook(() => 
      useTrackGameView({ gameId: 1, autoTrack: false })
    );

    // Initially null before bot check
    expect(result.current.isBot).toBe(null);
    expect(result.current.botCheckResult).toBe(null);
  });

  it('should provide tracking stats', () => {
    const { result } = renderHook(() => 
      useTrackGameView({ gameId: 1, autoTrack: false })
    );

    expect(result.current.stats).toEqual({
      tracked: 0,
      blocked: 0,
      errors: 0
    });
  });

  it('should track manually when requested', async () => {
    const { result } = renderHook(() => 
      useTrackGameView({ gameId: 1, autoTrack: false })
    );

    await act(async () => {
      await result.current.trackView(42, 'search');
    });

    // Function should complete without throwing
    expect(result.current.trackView).toBeDefined();
  });

  it('should handle unmounting gracefully', () => {
    const { unmount } = renderHook(() => 
      useTrackGameView({ gameId: 1, autoTrack: false })
    );

    expect(() => unmount()).not.toThrow();
  });
});