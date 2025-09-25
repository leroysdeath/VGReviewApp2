/**
 * useABTest Hook Tests
 * Tests React integration for A/B testing
 * Privacy-compliant hook testing with performance validation
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { renderHook, act, waitFor } from '@testing-library/react';

// Mock A/B testing service
const mockABTestingService = {
  initializeSession: jest.fn(() => Promise.resolve()),
  getVariant: jest.fn(() => Promise.resolve(null)),
  trackConversion: jest.fn(() => Promise.resolve())
};

jest.mock('../services/abTestingService', () => ({
  abTestingService: mockABTestingService
}));

// Mock sessionStorage
const mockSessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage
});

// Import hooks after mocking
import { useABTest, useFeatureFlag, useMultivariateTest } from '../hooks/useABTest';
import type { ABTestVariant } from '../services/abTestingService';

describe('useABTest Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSessionStorage.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should initialize with loading state', () => {
      const { result } = renderHook(() => 
        useABTest({ 
          experimentId: 'test_experiment',
          defaultConfig: { buttonColor: 'blue' }
        })
      );

      expect(result.current.isLoading).toBe(true);
      expect(result.current.variant).toBeNull();
      expect(result.current.config).toEqual({ buttonColor: 'blue' });
      expect(result.current.error).toBeNull();
    });

    it('should generate session ID if none exists', async () => {
      mockSessionStorage.getItem.mockReturnValue(null);
      
      renderHook(() => 
        useABTest({ 
          experimentId: 'test_experiment',
          defaultConfig: { buttonColor: 'blue' }
        })
      );

      await waitFor(() => {
        expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
          'ab_session_id',
          expect.stringMatching(/^session_\d+_[a-z0-9]{9}$/)
        );
      });
    });

    it('should use existing session ID', async () => {
      mockSessionStorage.getItem.mockReturnValue('existing_session_123');
      
      renderHook(() => 
        useABTest({ 
          experimentId: 'test_experiment',
          defaultConfig: { buttonColor: 'blue' }
        })
      );

      await waitFor(() => {
        expect(mockABTestingService.initializeSession).toHaveBeenCalledWith('existing_session_123');
      });

      expect(mockSessionStorage.setItem).not.toHaveBeenCalled();
    });

    it('should apply variant configuration when user is in experiment', async () => {
      const mockVariant: ABTestVariant = {
        id: 'variant_a',
        name: 'Variant A',
        description: 'Test variant',
        weight: 50,
        config: { buttonColor: 'red', buttonText: 'Try Now' },
        isControl: false
      };

      mockSessionStorage.getItem.mockReturnValue('session_123');
      mockABTestingService.getVariant.mockResolvedValue(mockVariant);

      const { result } = renderHook(() => 
        useABTest({ 
          experimentId: 'test_experiment',
          defaultConfig: { buttonColor: 'blue', buttonText: 'Sign Up' }
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.variant).toEqual(mockVariant);
      expect(result.current.config).toEqual({
        buttonColor: 'red',
        buttonText: 'Try Now'
      });
      expect(result.current.error).toBeNull();
    });

    it('should use default config when user is not in experiment', async () => {
      mockSessionStorage.getItem.mockReturnValue('session_123');
      mockABTestingService.getVariant.mockResolvedValue(null);

      const { result } = renderHook(() => 
        useABTest({ 
          experimentId: 'test_experiment',
          defaultConfig: { buttonColor: 'blue', buttonText: 'Sign Up' }
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.variant).toBeNull();
      expect(result.current.config).toEqual({
        buttonColor: 'blue',
        buttonText: 'Sign Up'
      });
    });

    it('should auto-track page view by default', async () => {
      const mockVariant: ABTestVariant = {
        id: 'variant_a',
        name: 'Variant A',
        description: 'Test variant',
        weight: 50,
        config: { buttonColor: 'red' },
        isControl: false
      };

      mockSessionStorage.getItem.mockReturnValue('session_123');
      mockABTestingService.getVariant.mockResolvedValue(mockVariant);

      renderHook(() => 
        useABTest({ 
          experimentId: 'test_experiment',
          defaultConfig: { buttonColor: 'blue' }
        })
      );

      await waitFor(() => {
        expect(mockABTestingService.trackConversion).toHaveBeenCalledWith(
          'session_123',
          'test_experiment',
          'page_view'
        );
      });
    });

    it('should not auto-track page view when disabled', async () => {
      mockSessionStorage.getItem.mockReturnValue('session_123');
      mockABTestingService.getVariant.mockResolvedValue(null);

      renderHook(() => 
        useABTest({ 
          experimentId: 'test_experiment',
          defaultConfig: { buttonColor: 'blue' },
          autoTrackPageView: false
        })
      );

      await waitFor(() => {
        expect(mockABTestingService.initializeSession).toHaveBeenCalled();
      });

      expect(mockABTestingService.trackConversion).not.toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'page_view'
      );
    });
  });

  describe('Conversion Tracking', () => {
    it('should track conversions with correct parameters', async () => {
      mockSessionStorage.getItem.mockReturnValue('session_123');
      mockABTestingService.getVariant.mockResolvedValue(null);

      const { result } = renderHook(() => 
        useABTest({ 
          experimentId: 'test_experiment',
          defaultConfig: { buttonColor: 'blue' },
          autoTrackPageView: false
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.trackConversion('button_click', 1.5);
      });

      expect(mockABTestingService.trackConversion).toHaveBeenCalledWith(
        'session_123',
        'test_experiment',
        'button_click',
        1.5
      );
    });

    it('should handle tracking errors gracefully', async () => {
      mockSessionStorage.getItem.mockReturnValue('session_123');
      mockABTestingService.getVariant.mockResolvedValue(null);
      mockABTestingService.trackConversion.mockRejectedValue(new Error('Tracking failed'));

      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => 
        useABTest({ 
          experimentId: 'test_experiment',
          defaultConfig: { buttonColor: 'blue' },
          autoTrackPageView: false
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.trackConversion('button_click');
      });

      expect(consoleError).toHaveBeenCalledWith('Failed to track A/B test conversion:', expect.any(Error));

      consoleError.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should handle initialization errors gracefully', async () => {
      mockSessionStorage.getItem.mockReturnValue('session_123');
      mockABTestingService.initializeSession.mockRejectedValue(new Error('Service unavailable'));

      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => 
        useABTest({ 
          experimentId: 'test_experiment',
          defaultConfig: { buttonColor: 'blue' }
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Service unavailable');
      expect(result.current.config).toEqual({ buttonColor: 'blue' });

      consoleError.mockRestore();
    });

    it('should handle variant fetch errors gracefully', async () => {
      mockSessionStorage.getItem.mockReturnValue('session_123');
      mockABTestingService.getVariant.mockRejectedValue(new Error('Database error'));

      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => 
        useABTest({ 
          experimentId: 'test_experiment',
          defaultConfig: { buttonColor: 'blue' }
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Database error');
      expect(result.current.config).toEqual({ buttonColor: 'blue' });

      consoleError.mockRestore();
    });

    it('should handle cleanup when component unmounts', async () => {
      mockSessionStorage.getItem.mockReturnValue('session_123');
      mockABTestingService.getVariant.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(null), 100))
      );

      const { unmount } = renderHook(() => 
        useABTest({ 
          experimentId: 'test_experiment',
          defaultConfig: { buttonColor: 'blue' }
        })
      );

      // Unmount before promise resolves
      unmount();

      // Wait for promise to resolve
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should not throw errors or cause memory leaks
    });
  });

  describe('Performance', () => {
    it('should memoize trackConversion function', async () => {
      mockSessionStorage.getItem.mockReturnValue('session_123');
      mockABTestingService.getVariant.mockResolvedValue(null);

      const { result, rerender } = renderHook(() => 
        useABTest({ 
          experimentId: 'test_experiment',
          defaultConfig: { buttonColor: 'blue' }
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const trackConversion1 = result.current.trackConversion;

      rerender();

      const trackConversion2 = result.current.trackConversion;

      expect(trackConversion1).toBe(trackConversion2);
    });

    it('should handle rapid consecutive calls efficiently', async () => {
      mockSessionStorage.getItem.mockReturnValue('session_123');
      mockABTestingService.getVariant.mockResolvedValue(null);

      const { result } = renderHook(() => 
        useABTest({ 
          experimentId: 'test_experiment',
          defaultConfig: { buttonColor: 'blue' },
          autoTrackPageView: false
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const startTime = Date.now();

      // Make 10 rapid tracking calls
      await act(async () => {
        await Promise.all([
          result.current.trackConversion('event1'),
          result.current.trackConversion('event2'),
          result.current.trackConversion('event3'),
          result.current.trackConversion('event4'),
          result.current.trackConversion('event5'),
          result.current.trackConversion('event6'),
          result.current.trackConversion('event7'),
          result.current.trackConversion('event8'),
          result.current.trackConversion('event9'),
          result.current.trackConversion('event10')
        ]);
      });

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(100); // Should complete quickly
      expect(mockABTestingService.trackConversion).toHaveBeenCalledTimes(10);
    });
  });
});

describe('useFeatureFlag Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSessionStorage.getItem.mockReturnValue('session_123');
  });

  it('should return default value when not in experiment', async () => {
    mockABTestingService.getVariant.mockResolvedValue(null);

    const { result } = renderHook(() => 
      useFeatureFlag('feature_test', 'showNewFeature', false)
    );

    await waitFor(() => {
      expect(result.current.value).toBe(false);
    });
  });

  it('should return variant value when in experiment', async () => {
    const mockVariant: ABTestVariant = {
      id: 'variant_a',
      name: 'Variant A',
      description: 'Test variant',
      weight: 50,
      config: { showNewFeature: true },
      isControl: false
    };

    mockABTestingService.getVariant.mockResolvedValue(mockVariant);

    const { result } = renderHook(() => 
      useFeatureFlag('feature_test', 'showNewFeature', false)
    );

    await waitFor(() => {
      expect(result.current.value).toBe(true);
    });
  });

  it('should provide tracking function', async () => {
    mockABTestingService.getVariant.mockResolvedValue(null);

    const { result } = renderHook(() => 
      useFeatureFlag('feature_test', 'showNewFeature', false)
    );

    await waitFor(() => {
      expect(typeof result.current.trackConversion).toBe('function');
    });

    await act(async () => {
      await result.current.trackConversion('feature_used');
    });

    expect(mockABTestingService.trackConversion).toHaveBeenCalledWith(
      'session_123',
      'feature_test',
      'feature_used'
    );
  });
});

describe('useMultivariateTest Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSessionStorage.getItem.mockReturnValue('session_123');
  });

  it('should combine configurations from multiple experiments', async () => {
    const mockVariant1: ABTestVariant = {
      id: 'variant_a',
      name: 'Variant A',
      description: 'Test variant',
      weight: 50,
      config: { buttonColor: 'red' },
      isControl: false
    };

    const mockVariant2: ABTestVariant = {
      id: 'variant_b',
      name: 'Variant B',
      description: 'Test variant',
      weight: 50,
      config: { buttonText: 'Try Now' },
      isControl: false
    };

    mockABTestingService.getVariant
      .mockResolvedValueOnce(mockVariant1)
      .mockResolvedValueOnce(mockVariant2);

    const { result } = renderHook(() => 
      useMultivariateTest([
        { experimentId: 'color_test', defaultConfig: { buttonColor: 'blue' } },
        { experimentId: 'text_test', defaultConfig: { buttonText: 'Sign Up' } }
      ])
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.config).toEqual({
      buttonColor: 'red',
      buttonText: 'Try Now'
    });
  });

  it('should use default config when not in experiments', async () => {
    mockABTestingService.getVariant
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    const { result } = renderHook(() => 
      useMultivariateTest([
        { experimentId: 'color_test', defaultConfig: { buttonColor: 'blue' } },
        { experimentId: 'text_test', defaultConfig: { buttonText: 'Sign Up' } }
      ])
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.config).toEqual({
      buttonColor: 'blue',
      buttonText: 'Sign Up'
    });
  });

  it('should provide experiment-specific tracking', async () => {
    mockABTestingService.getVariant
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    const { result } = renderHook(() => 
      useMultivariateTest([
        { experimentId: 'color_test', defaultConfig: { buttonColor: 'blue' } },
        { experimentId: 'text_test', defaultConfig: { buttonText: 'Sign Up' } }
      ])
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.trackConversion('color_test', 'button_clicked');
    });

    expect(mockABTestingService.trackConversion).toHaveBeenCalledWith(
      'session_123',
      'color_test',
      'button_clicked'
    );
  });

  it('should handle experiment failures gracefully', async () => {
    mockABTestingService.getVariant
      .mockRejectedValueOnce(new Error('Failed'))
      .mockResolvedValueOnce(null);

    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => 
      useMultivariateTest([
        { experimentId: 'color_test', defaultConfig: { buttonColor: 'blue' } },
        { experimentId: 'text_test', defaultConfig: { buttonText: 'Sign Up' } }
      ])
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should fallback to defaults for failed experiments
    expect(result.current.config).toEqual({
      buttonColor: 'blue',
      buttonText: 'Sign Up'
    });

    consoleError.mockRestore();
  });
});