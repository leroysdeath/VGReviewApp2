/**
 * useABTest Hook
 * React hook for A/B testing integration
 * Privacy-compliant and performant
 */

import { useState, useEffect, useCallback } from 'react';
import { abTestingService, ABTestVariant } from '../services/abTestingService';
import { trackingService } from '../services/trackingService';

interface UseABTestOptions {
  experimentId: string;
  defaultConfig?: Record<string, any>;
  autoTrackPageView?: boolean;
}

interface UseABTestResult {
  variant: ABTestVariant | null;
  config: Record<string, any>;
  isLoading: boolean;
  error: string | null;
  trackConversion: (eventType: string, value?: number) => Promise<void>;
}

/**
 * Hook for A/B testing integration
 * 
 * @param options - Configuration options
 * @returns A/B test variant and tracking functions
 * 
 * @example
 * ```tsx
 * const { variant, config, trackConversion } = useABTest({
 *   experimentId: 'homepage_cta_test',
 *   defaultConfig: { buttonColor: 'blue', buttonText: 'Sign Up' }
 * });
 * 
 * return (
 *   <button 
 *     style={{ backgroundColor: config.buttonColor }}
 *     onClick={() => trackConversion('cta_click')}
 *   >
 *     {config.buttonText}
 *   </button>
 * );
 * ```
 */
export function useABTest({
  experimentId,
  defaultConfig = {},
  autoTrackPageView = true
}: UseABTestOptions): UseABTestResult {
  const [variant, setVariant] = useState<ABTestVariant | null>(null);
  const [config, setConfig] = useState<Record<string, any>>(defaultConfig);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get session ID (create if doesn't exist)
  const getSessionId = useCallback((): string => {
    let sessionId = sessionStorage.getItem('ab_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('ab_session_id', sessionId);
    }
    return sessionId;
  }, []);

  // Initialize A/B test
  useEffect(() => {
    let mounted = true;
    
    const initializeABTest = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const sessionId = getSessionId();

        // Initialize session (assigns to experiments if eligible)
        await abTestingService.initializeSession(sessionId);

        // Get variant for this experiment
        const testVariant = await abTestingService.getVariant(sessionId, experimentId);

        if (mounted) {
          if (testVariant) {
            setVariant(testVariant);
            setConfig({ ...defaultConfig, ...testVariant.config });

            // Auto-track page view if enabled
            if (autoTrackPageView) {
              await abTestingService.trackConversion(sessionId, experimentId, 'page_view');
            }
          } else {
            // User not in experiment, use default config
            setVariant(null);
            setConfig(defaultConfig);
          }
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to initialize A/B test');
          setConfig(defaultConfig); // Fallback to default
          console.error('A/B test initialization failed:', err);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeABTest();

    return () => {
      mounted = false;
    };
  }, [experimentId, defaultConfig, autoTrackPageView, getSessionId]);

  // Track conversion events
  const trackConversion = useCallback(async (eventType: string, value?: number) => {
    try {
      const sessionId = getSessionId();
      await abTestingService.trackConversion(sessionId, experimentId, eventType, value);
    } catch (err) {
      console.error('Failed to track A/B test conversion:', err);
      // Don't throw error - tracking failures shouldn't break the UI
    }
  }, [experimentId, getSessionId]);

  return {
    variant,
    config,
    isLoading,
    error,
    trackConversion
  };
}

/**
 * Simplified hook for feature flags / simple A/B tests
 * 
 * @param experimentId - The experiment ID
 * @param featureName - The feature flag name
 * @param defaultValue - Default value if not in experiment
 * @returns The feature value and tracking function
 * 
 * @example
 * ```tsx
 * const { value: showNewDesign, trackConversion } = useFeatureFlag(
 *   'homepage_redesign',
 *   'showNewDesign',
 *   false
 * );
 * 
 * return showNewDesign ? <NewDesign /> : <OldDesign />;
 * ```
 */
export function useFeatureFlag<T>(
  experimentId: string,
  featureName: string,
  defaultValue: T
): { value: T; trackConversion: (eventType: string, value?: number) => Promise<void> } {
  const { config, trackConversion } = useABTest({
    experimentId,
    defaultConfig: { [featureName]: defaultValue },
    autoTrackPageView: false // Don't auto-track for simple feature flags
  });

  return {
    value: config[featureName] ?? defaultValue,
    trackConversion
  };
}

/**
 * Hook for multivariate testing
 * 
 * @param experiments - Array of experiment configurations
 * @returns Combined configuration from all active experiments
 * 
 * @example
 * ```tsx
 * const { config, trackConversion } = useMultivariateTest([
 *   { experimentId: 'button_color_test', defaultConfig: { buttonColor: 'blue' } },
 *   { experimentId: 'button_text_test', defaultConfig: { buttonText: 'Sign Up' } }
 * ]);
 * ```
 */
export function useMultivariateTest(
  experiments: Array<{ experimentId: string; defaultConfig: Record<string, any> }>
): { 
  config: Record<string, any>; 
  trackConversion: (experimentId: string, eventType: string, value?: number) => Promise<void>;
  isLoading: boolean;
} {
  const [combinedConfig, setCombinedConfig] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  
  const sessionId = sessionStorage.getItem('ab_session_id') || 
    `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  useEffect(() => {
    const loadExperiments = async () => {
      setIsLoading(true);
      const configs: Record<string, any> = {};
      
      // Load all experiments in parallel
      await Promise.all(
        experiments.map(async ({ experimentId, defaultConfig }) => {
          try {
            const variant = await abTestingService.getVariant(sessionId, experimentId);
            Object.assign(configs, variant ? variant.config : defaultConfig);
          } catch (err) {
            Object.assign(configs, defaultConfig);
          }
        })
      );
      
      setCombinedConfig(configs);
      setIsLoading(false);
    };

    loadExperiments();
  }, [experiments, sessionId]);

  const trackConversion = useCallback(
    async (experimentId: string, eventType: string, value?: number) => {
      try {
        await abTestingService.trackConversion(sessionId, experimentId, eventType, value);
      } catch (err) {
        console.error('Failed to track multivariate conversion:', err);
      }
    },
    [sessionId]
  );

  return { config: combinedConfig, trackConversion, isLoading };
}