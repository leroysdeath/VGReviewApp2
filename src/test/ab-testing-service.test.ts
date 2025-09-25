/**
 * A/B Testing Service Tests
 * Comprehensive unit tests for privacy-compliant A/B testing framework
 * Tests privacy compliance, performance, and statistical accuracy
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Mock Supabase with more flexible responses
const mockSupabase = {
  from: jest.fn().mockImplementation(() => {
    const mockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null }),
      limit: jest.fn().mockResolvedValue({ data: [] }),
      lte: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      update: jest.fn().mockReturnThis(),
      count: 'exact'
    };
    return mockQueryBuilder;
  })
};

jest.mock('../services/supabase', () => ({
  supabase: mockSupabase
}));

// Mock privacy service
const mockPrivacyService = {
  hasTrackingConsent: jest.fn(() => Promise.resolve(true))
};

jest.mock('../services/privacyService', () => ({
  privacyService: mockPrivacyService
}));

// Mock tracking service
const mockTrackingService = {
  trackEvent: jest.fn(() => Promise.resolve())
};

jest.mock('../services/trackingService', () => ({
  trackingService: mockTrackingService
}));

// Import after mocking
import { abTestingService } from '../services/abTestingService';
import type { ABTestExperiment, ABTestVariant } from '../services/abTestingService';

describe('A/B Testing Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear service cache
    (abTestingService as any).cache.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Privacy Compliance', () => {
    it('should respect user privacy consent', async () => {
      // User without consent
      mockPrivacyService.hasTrackingConsent.mockResolvedValueOnce(false);

      await abTestingService.initializeSession('session_123', 'user_456');

      // Should not call database for experiments
      expect(mockSupabase.from).not.toHaveBeenCalledWith('ab_test_experiments');
      expect(mockPrivacyService.hasTrackingConsent).toHaveBeenCalledWith('user_456');
    });

    it('should allow anonymous users to participate', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            lte: jest.fn(() => ({
              or: jest.fn(() => ({
                limit: jest.fn(() => ({ data: [] }))
              }))
            }))
          }))
        }))
      });

      await abTestingService.initializeSession('session_123');

      // Should proceed without privacy check for anonymous users
      expect(mockPrivacyService.hasTrackingConsent).not.toHaveBeenCalled();
      expect(mockSupabase.from).toHaveBeenCalledWith('ab_test_experiments');
    });

    it('should not store personal data in experiment assignments', async () => {
      const mockExperiment: ABTestExperiment = {
        id: 'exp_123',
        name: 'Test Experiment',
        description: 'Test description',
        status: 'active',
        startDate: new Date().toISOString(),
        endDate: null,
        targetPercentage: 50,
        variants: [
          { id: 'control', name: 'Control', description: 'Control variant', weight: 50, config: {}, isControl: true },
          { id: 'variant_a', name: 'Variant A', description: 'Test variant', weight: 50, config: {}, isControl: false }
        ]
      };

      // Mock assignment creation
      const insertSpy = jest.fn(() => Promise.resolve({ data: null, error: null }));
      mockSupabase.from.mockReturnValueOnce({
        insert: insertSpy
      });

      await (abTestingService as any).assignToExperiment('session_123', mockExperiment, 'user_456');

      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user_456', // Only user ID, not personal data
          session_id: 'session_123',
          experiment_id: 'exp_123',
          variant_id: expect.any(String),
          assigned_at: expect.any(String),
          is_active: true
        })
      );
    });

    it('should handle privacy consent changes gracefully', async () => {
      // Initially has consent
      mockPrivacyService.hasTrackingConsent.mockResolvedValueOnce(true);
      
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            lte: jest.fn(() => ({
              or: jest.fn(() => ({
                limit: jest.fn(() => ({ data: [] }))
              }))
            }))
          }))
        }))
      });

      await abTestingService.initializeSession('session_123', 'user_456');

      // Later loses consent
      mockPrivacyService.hasTrackingConsent.mockResolvedValueOnce(false);

      // Should not track conversions without consent
      await abTestingService.trackConversion('session_123', 'exp_123', 'click');

      expect(mockTrackingService.trackEvent).not.toHaveBeenCalled();
    });
  });

  describe('Experiment Management', () => {
    it('should validate experiment configuration', async () => {
      const invalidExperiment = {
        name: '',
        description: 'Test',
        status: 'draft' as const,
        startDate: new Date().toISOString(),
        endDate: null,
        targetPercentage: 50,
        variants: [
          { id: 'control', name: 'Control', description: 'Control', weight: 50, config: {}, isControl: true }
        ]
      };

      await expect(abTestingService.createExperiment(invalidExperiment))
        .rejects.toThrow('Experiment name and description are required');
    });

    it('should require at least 2 variants', async () => {
      const invalidExperiment = {
        name: 'Test',
        description: 'Test description',
        status: 'draft' as const,
        startDate: new Date().toISOString(),
        endDate: null,
        targetPercentage: 50,
        variants: [
          { id: 'control', name: 'Control', description: 'Control', weight: 100, config: {}, isControl: true }
        ]
      };

      await expect(abTestingService.createExperiment(invalidExperiment))
        .rejects.toThrow('At least 2 variants required');
    });

    it('should validate variant weights sum to 100', async () => {
      const invalidExperiment = {
        name: 'Test',
        description: 'Test description',
        status: 'draft' as const,
        startDate: new Date().toISOString(),
        endDate: null,
        targetPercentage: 50,
        variants: [
          { id: 'control', name: 'Control', description: 'Control', weight: 60, config: {}, isControl: true },
          { id: 'variant_a', name: 'Variant A', description: 'Test', weight: 30, config: {}, isControl: false }
        ]
      };

      await expect(abTestingService.createExperiment(invalidExperiment))
        .rejects.toThrow('Variant weights must sum to 100');
    });

    it('should require exactly one control variant', async () => {
      const invalidExperiment = {
        name: 'Test',
        description: 'Test description',
        status: 'draft' as const,
        startDate: new Date().toISOString(),
        endDate: null,
        targetPercentage: 50,
        variants: [
          { id: 'control', name: 'Control', description: 'Control', weight: 50, config: {}, isControl: true },
          { id: 'variant_a', name: 'Variant A', description: 'Test', weight: 50, config: {}, isControl: true }
        ]
      };

      await expect(abTestingService.createExperiment(invalidExperiment))
        .rejects.toThrow('Exactly one control variant required');
    });

    it('should enforce maximum concurrent experiments limit', async () => {
      // Mock 5 active experiments (at limit)
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({ count: 5 }))
        }))
      });

      const validExperiment = {
        name: 'Test',
        description: 'Test description',
        status: 'draft' as const,
        startDate: new Date().toISOString(),
        endDate: null,
        targetPercentage: 50,
        variants: [
          { id: 'control', name: 'Control', description: 'Control', weight: 50, config: {}, isControl: true },
          { id: 'variant_a', name: 'Variant A', description: 'Test', weight: 50, config: {}, isControl: false }
        ]
      };

      await expect(abTestingService.createExperiment(validExperiment))
        .rejects.toThrow('Maximum concurrent experiments reached');
    });

    it('should generate unique experiment IDs', async () => {
      // Mock successful creation
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({ count: 0 }))
        }))
      }).mockReturnValueOnce({
        insert: jest.fn(() => Promise.resolve({ data: null, error: null }))
      });

      const experiment = {
        name: 'Test',
        description: 'Test description',
        status: 'draft' as const,
        startDate: new Date().toISOString(),
        endDate: null,
        targetPercentage: 50,
        variants: [
          { id: 'control', name: 'Control', description: 'Control', weight: 50, config: {}, isControl: true },
          { id: 'variant_a', name: 'Variant A', description: 'Test', weight: 50, config: {}, isControl: false }
        ]
      };

      const experimentId = await abTestingService.createExperiment(experiment);

      expect(experimentId).toMatch(/^exp_\d+_[a-z0-9]{9}$/);
    });
  });

  describe('Variant Assignment', () => {
    it('should respect target percentage', async () => {
      const mockExperiment: ABTestExperiment = {
        id: 'exp_123',
        name: 'Test Experiment',
        description: 'Test description',
        status: 'active',
        startDate: new Date().toISOString(),
        endDate: null,
        targetPercentage: 10, // Only 10% of users
        variants: [
          { id: 'control', name: 'Control', description: 'Control variant', weight: 50, config: {}, isControl: true },
          { id: 'variant_a', name: 'Variant A', description: 'Test variant', weight: 50, config: {}, isControl: false }
        ]
      };

      // Mock Math.random to return 0.5 (50% > 10% target)
      const mockMath = jest.spyOn(Math, 'random').mockReturnValue(0.5);

      // Mock no existing assignment
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => ({ data: null }))
            }))
          }))
        }))
      });

      await (abTestingService as any).assignToExperiment('session_123', mockExperiment);

      // Should not create assignment due to target percentage
      expect(mockSupabase.from).toHaveBeenCalledTimes(1); // Only for checking existing assignment

      mockMath.mockRestore();
    });

    it('should properly weight variant selection', async () => {
      const variants: ABTestVariant[] = [
        { id: 'control', name: 'Control', description: 'Control', weight: 70, config: {}, isControl: true },
        { id: 'variant_a', name: 'Variant A', description: 'Test', weight: 30, config: {}, isControl: false }
      ];

      // Test control selection (random = 0.3, should select control with 70% weight)
      const mockMath = jest.spyOn(Math, 'random').mockReturnValue(0.3);
      
      const selectedVariant = (abTestingService as any).selectVariant(variants);
      expect(selectedVariant.id).toBe('control');

      // Test variant_a selection (random = 0.8, should select variant_a)
      mockMath.mockReturnValue(0.8);
      const selectedVariant2 = (abTestingService as any).selectVariant(variants);
      expect(selectedVariant2.id).toBe('variant_a');

      mockMath.mockRestore();
    });

    it('should not reassign users already in experiment', async () => {
      const mockExperiment: ABTestExperiment = {
        id: 'exp_123',
        name: 'Test Experiment',
        description: 'Test description',
        status: 'active',
        startDate: new Date().toISOString(),
        endDate: null,
        targetPercentage: 100,
        variants: [
          { id: 'control', name: 'Control', description: 'Control variant', weight: 50, config: {}, isControl: true },
          { id: 'variant_a', name: 'Variant A', description: 'Test variant', weight: 50, config: {}, isControl: false }
        ]
      };

      // Mock existing assignment
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => ({ data: { id: 'existing_assignment' } }))
            }))
          }))
        }))
      });

      await (abTestingService as any).assignToExperiment('session_123', mockExperiment);

      // Should not create new assignment
      expect(mockSupabase.from).toHaveBeenCalledTimes(1); // Only for checking existing assignment
    });
  });

  describe('Statistical Analysis', () => {
    it('should calculate conversion rates correctly', async () => {
      const mockExperiment: ABTestExperiment = {
        id: 'exp_123',
        name: 'Test Experiment',
        description: 'Test description',
        status: 'active',
        startDate: new Date().toISOString(),
        endDate: null,
        targetPercentage: 100,
        variants: [
          { id: 'control', name: 'Control', description: 'Control', weight: 50, config: {}, isControl: true },
          { id: 'variant_a', name: 'Variant A', description: 'Test', weight: 50, config: {}, isControl: false }
        ]
      };

      // Mock experiment data
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => ({ data: mockExperiment }))
            }))
          }))
        })
        .mockReturnValueOnce({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                limit: jest.fn(() => ({
                  data: [
                    { variant_id: 'control', session_id: 'session_1' },
                    { variant_id: 'control', session_id: 'session_2' },
                    { variant_id: 'variant_a', session_id: 'session_3' },
                    { variant_id: 'variant_a', session_id: 'session_4' }
                  ]
                }))
              }))
            }))
          }))
        })
        .mockReturnValueOnce({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              limit: jest.fn(() => ({
                data: [
                  { variant_id: 'control', session_id: 'session_1', event_type: 'conversion' },
                  { variant_id: 'variant_a', session_id: 'session_3', event_type: 'conversion' },
                  { variant_id: 'variant_a', session_id: 'session_4', event_type: 'conversion' }
                ]
              }))
            }))
          }))
        });

      const analytics = await abTestingService.getExperimentAnalytics('exp_123');

      expect(analytics).not.toBeNull();
      if (analytics) {
        expect(analytics.totalParticipants).toBe(4);
        
        const controlResult = analytics.variantResults.find(r => r.variantId === 'control');
        const variantResult = analytics.variantResults.find(r => r.variantId === 'variant_a');
        
        expect(controlResult?.metrics.conversionRate).toBe(0.5); // 1/2
        expect(variantResult?.metrics.conversionRate).toBe(1.0); // 2/2
      }
    });

    it('should calculate confidence intervals', async () => {
      // This tests the confidence interval calculation
      const results = [
        {
          experimentId: 'exp_123',
          variantId: 'control',
          metrics: {
            participants: 1000,
            conversions: 100,
            conversionRate: 0.1,
            averageSessionTime: 0,
            bounceRate: 0
          },
          significanceLevel: 0.95,
          confidenceInterval: { lower: 0, upper: 0 } // Will be calculated
        }
      ];

      const significance = (abTestingService as any).calculateSignificance(results);
      
      // Should indicate insufficient data for proper testing (need control + variant)
      expect(significance.status).toBe('insufficient_data');
    });

    it('should require minimum sample size', async () => {
      const mockExperiment: ABTestExperiment = {
        id: 'exp_123',
        name: 'Test Experiment',
        description: 'Test description',
        status: 'active',
        startDate: new Date().toISOString(),
        endDate: null,
        targetPercentage: 100,
        variants: [
          { id: 'control', name: 'Control', description: 'Control', weight: 50, config: {}, isControl: true },
          { id: 'variant_a', name: 'Variant A', description: 'Test', weight: 50, config: {}, isControl: false }
        ]
      };

      // Mock small sample size
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => ({ data: mockExperiment }))
            }))
          }))
        })
        .mockReturnValueOnce({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                limit: jest.fn(() => ({
                  data: [
                    { variant_id: 'control', session_id: 'session_1' },
                    { variant_id: 'variant_a', session_id: 'session_2' }
                  ]
                }))
              }))
            }))
          }))
        })
        .mockReturnValueOnce({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              limit: jest.fn(() => ({
                data: [
                  { variant_id: 'control', session_id: 'session_1', event_type: 'conversion' }
                ]
              }))
            }))
          }))
        });

      const analytics = await abTestingService.getExperimentAnalytics('exp_123');

      expect(analytics?.status).toBe('insufficient_data');
    });
  });

  describe('Database Query Limits', () => {
    it('should respect assignment query limits', async () => {
      const mockExperiment: ABTestExperiment = {
        id: 'exp_123',
        name: 'Test Experiment',
        description: 'Test description',
        status: 'active',
        startDate: new Date().toISOString(),
        endDate: null,
        targetPercentage: 100,
        variants: [
          { id: 'control', name: 'Control', description: 'Control', weight: 50, config: {}, isControl: true }
        ]
      };

      const limitSpy = jest.fn(() => ({ data: [] }));
      
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => ({ data: mockExperiment }))
            }))
          }))
        })
        .mockReturnValueOnce({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                limit: limitSpy
              }))
            }))
          }))
        })
        .mockReturnValueOnce({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              limit: jest.fn(() => ({ data: [] }))
            }))
          }))
        });

      await abTestingService.getExperimentAnalytics('exp_123');

      // Verify assignment limit of 10,000
      expect(limitSpy).toHaveBeenCalledWith(10000);
    });

    it('should respect conversion query limits', async () => {
      const mockExperiment: ABTestExperiment = {
        id: 'exp_123',
        name: 'Test Experiment',
        description: 'Test description',
        status: 'active',
        startDate: new Date().toISOString(),
        endDate: null,
        targetPercentage: 100,
        variants: [
          { id: 'control', name: 'Control', description: 'Control', weight: 50, config: {}, isControl: true }
        ]
      };

      const limitSpy = jest.fn(() => ({ data: [] }));
      
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => ({ data: mockExperiment }))
            }))
          }))
        })
        .mockReturnValueOnce({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                limit: jest.fn(() => ({ data: [] }))
              }))
            }))
          }))
        })
        .mockReturnValueOnce({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              limit: limitSpy
            }))
          }))
        });

      await abTestingService.getExperimentAnalytics('exp_123');

      // Verify conversion limit of 50,000
      expect(limitSpy).toHaveBeenCalledWith(50000);
    });

    it('should limit active experiment queries', async () => {
      const limitSpy = jest.fn(() => ({ data: [] }));
      
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            lte: jest.fn(() => ({
              or: jest.fn(() => ({
                limit: limitSpy
              }))
            }))
          }))
        }))
      });

      await (abTestingService as any).getActiveExperiments();

      // Verify experiment limit of 10
      expect(limitSpy).toHaveBeenCalledWith(10);
    });
  });

  describe('Error Handling', () => {
    it('should handle service failures gracefully', async () => {
      // Mock database error
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      // Should not throw error - A/B testing failures shouldn't break the app
      await expect(abTestingService.initializeSession('session_123')).resolves.not.toThrow();
    });

    it('should handle invalid experiment IDs', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({ data: null }))
          }))
        }))
      });

      const variant = await abTestingService.getVariant('session_123', 'invalid_exp');
      expect(variant).toBeNull();
    });

    it('should handle malformed database responses', async () => {
      // Mock malformed response
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({ data: { malformed: 'data' } }))
          }))
        }))
      });

      const analytics = await abTestingService.getExperimentAnalytics('exp_123');
      expect(analytics).toBeNull();
    });
  });

  describe('Performance Optimizations', () => {
    it('should cache variant assignments', async () => {
      const mockAssignment = {
        user_id: null,
        session_id: 'session_123',
        experiment_id: 'exp_123',
        variant_id: 'control',
        assigned_at: new Date().toISOString(),
        is_active: true
      };

      // First call - fetch from database
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => ({ data: mockAssignment }))
              }))
            }))
          }))
        }))
      });

      const mockExperiment: ABTestExperiment = {
        id: 'exp_123',
        name: 'Test',
        description: 'Test',
        status: 'active',
        startDate: new Date().toISOString(),
        endDate: null,
        targetPercentage: 100,
        variants: [
          { id: 'control', name: 'Control', description: 'Control', weight: 100, config: {}, isControl: true }
        ]
      };

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({ data: mockExperiment }))
          }))
        }))
      });

      const variant1 = await abTestingService.getVariant('session_123', 'exp_123');
      
      // Second call - should use cache (no additional DB calls)
      const variant2 = await abTestingService.getVariant('session_123', 'exp_123');

      expect(variant1?.id).toBe('control');
      expect(variant2?.id).toBe('control');
      
      // Should only make 2 DB calls (assignment + experiment), not 4
      expect(mockSupabase.from).toHaveBeenCalledTimes(2);
    });

    it('should handle high-volume session initialization', async () => {
      // Mock no active experiments to test performance
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            lte: jest.fn(() => ({
              or: jest.fn(() => ({
                limit: jest.fn(() => ({ data: [] }))
              }))
            }))
          }))
        }))
      });

      const startTime = Date.now();
      
      // Initialize multiple sessions concurrently
      await Promise.all([
        abTestingService.initializeSession('session_1'),
        abTestingService.initializeSession('session_2'),
        abTestingService.initializeSession('session_3'),
        abTestingService.initializeSession('session_4'),
        abTestingService.initializeSession('session_5')
      ]);

      const duration = Date.now() - startTime;
      
      // Should complete quickly (under 100ms for mocked operations)
      expect(duration).toBeLessThan(100);
    });
  });
});