/**
 * A/B Testing Service
 * Privacy-compliant experimentation framework
 * Integrates with existing consent system and tracking infrastructure
 */

import { supabase } from './supabase';
import { privacyService } from './privacyService';
import { trackingService } from './trackingService';

// Types
export interface ABTestExperiment {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  startDate: string;
  endDate: string | null;
  targetPercentage: number; // 0-100, percentage of users to include
  variants: ABTestVariant[];
  metadata?: {
    createdBy?: string;
    tags?: string[];
    hypothesis?: string;
    successMetrics?: string[];
  };
}

export interface ABTestVariant {
  id: string;
  name: string;
  description: string;
  weight: number; // 0-100, relative weight for traffic allocation
  config: Record<string, any>; // Variant-specific configuration
  isControl: boolean;
}

export interface ABTestAssignment {
  userId: string | null; // null for anonymous users
  sessionId: string;
  experimentId: string;
  variantId: string;
  assignedAt: string;
  isActive: boolean;
}

export interface ABTestResult {
  experimentId: string;
  variantId: string;
  metrics: {
    participants: number;
    conversions: number;
    conversionRate: number;
    averageSessionTime: number;
    bounceRate: number;
  };
  significanceLevel: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
}

export interface ABTestAnalytics {
  experimentId: string;
  totalParticipants: number;
  variantResults: ABTestResult[];
  status: 'insufficient_data' | 'no_significant_difference' | 'significant_winner';
  winningVariant?: string;
  statisticalPower: number;
  duration: number; // in days
}

class ABTestingService {
  private readonly MAX_CONCURRENT_EXPERIMENTS = 5;
  private readonly MIN_SAMPLE_SIZE = 100;
  private readonly CONFIDENCE_LEVEL = 0.95;
  private cache: Map<string, ABTestAssignment> = new Map();

  /**
   * Initialize A/B testing for a user session
   */
  async initializeSession(sessionId: string, userId?: string): Promise<void> {
    try {
      // Check privacy consent first
      const hasConsent = userId 
        ? await privacyService.hasTrackingConsent(userId)
        : true; // Anonymous users can participate

      if (!hasConsent) {
        return; // Skip A/B testing for users without consent
      }

      // Get active experiments
      const activeExperiments = await this.getActiveExperiments();

      // Assign user to experiments
      for (const experiment of activeExperiments) {
        await this.assignToExperiment(sessionId, experiment, userId);
      }
    } catch (error) {
      console.error('Failed to initialize A/B testing session:', error);
      // Fail silently - A/B testing shouldn't break the app
    }
  }

  /**
   * Get variant configuration for a specific experiment
   */
  async getVariant(sessionId: string, experimentId: string): Promise<ABTestVariant | null> {
    try {
      // Check cache first
      const cacheKey = `${sessionId}-${experimentId}`;
      const cached = this.cache.get(cacheKey);

      if (cached && cached.isActive) {
        const experiment = await this.getExperiment(experimentId);
        return experiment?.variants.find(v => v.id === cached.variantId) || null;
      }

      // Query database
      const { data } = await supabase
        .from('ab_test_assignments')
        .select('variant_id, is_active')
        .eq('session_id', sessionId)
        .eq('experiment_id', experimentId)
        .eq('is_active', true)
        .single();

      if (!data) {
        return null;
      }

      // Get experiment and variant
      const experiment = await this.getExperiment(experimentId);
      const variant = experiment?.variants.find(v => v.id === data.variant_id);

      // Update cache
      if (variant) {
        this.cache.set(cacheKey, {
          userId: null,
          sessionId,
          experimentId,
          variantId: data.variant_id,
          assignedAt: new Date().toISOString(),
          isActive: data.is_active
        });
      }

      return variant || null;
    } catch (error) {
      console.error('Failed to get variant:', error);
      return null;
    }
  }

  /**
   * Track conversion event for A/B testing
   */
  async trackConversion(
    sessionId: string, 
    experimentId: string, 
    eventType: string, 
    value?: number
  ): Promise<void> {
    try {
      // Get user's variant assignment
      const assignment = await this.getAssignment(sessionId, experimentId);
      if (!assignment) {
        return;
      }

      // Record conversion with privacy compliance
      await supabase.from('ab_test_conversions').insert({
        session_id: sessionId,
        experiment_id: experimentId,
        variant_id: assignment.variantId,
        event_type: eventType,
        event_value: value,
        recorded_at: new Date().toISOString()
      });

      // Track in existing analytics (if consent allows)
      await trackingService.trackEvent('ab_test_conversion', {
        experimentId,
        variantId: assignment.variantId,
        eventType,
        value
      });
    } catch (error) {
      console.error('Failed to track conversion:', error);
    }
  }

  /**
   * Create a new A/B test experiment
   */
  async createExperiment(experiment: Omit<ABTestExperiment, 'id'>): Promise<string> {
    try {
      // Validate experiment configuration
      this.validateExperiment(experiment);

      // Check concurrent experiment limit
      const activeCount = await this.getActiveExperimentCount();
      if (activeCount >= this.MAX_CONCURRENT_EXPERIMENTS) {
        throw new Error('Maximum concurrent experiments reached');
      }

      // Generate experiment ID
      const experimentId = `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Insert experiment
      await supabase.from('ab_test_experiments').insert({
        id: experimentId,
        name: experiment.name,
        description: experiment.description,
        status: experiment.status,
        start_date: experiment.startDate,
        end_date: experiment.endDate,
        target_percentage: experiment.targetPercentage,
        variants: experiment.variants,
        metadata: experiment.metadata,
        created_at: new Date().toISOString()
      });

      return experimentId;
    } catch (error) {
      console.error('Failed to create experiment:', error);
      throw error;
    }
  }

  /**
   * Get experiment analytics and results
   */
  async getExperimentAnalytics(experimentId: string): Promise<ABTestAnalytics | null> {
    try {
      // Get experiment details
      const experiment = await this.getExperiment(experimentId);
      if (!experiment) {
        return null;
      }

      // Get assignment counts per variant
      const { data: assignments } = await supabase
        .from('ab_test_assignments')
        .select('variant_id, session_id')
        .eq('experiment_id', experimentId)
        .eq('is_active', true)
        .limit(10000); // Respect DB limits

      // Get conversion data per variant
      const { data: conversions } = await supabase
        .from('ab_test_conversions')
        .select('variant_id, event_type, event_value, session_id')
        .eq('experiment_id', experimentId)
        .limit(50000); // Respect DB limits

      if (!assignments || !conversions) {
        return null;
      }

      // Calculate results per variant
      const variantResults: ABTestResult[] = [];
      const totalParticipants = assignments.length;

      for (const variant of experiment.variants) {
        const variantAssignments = assignments.filter(a => a.variant_id === variant.id);
        const variantConversions = conversions.filter(c => c.variant_id === variant.id);

        const participants = variantAssignments.length;
        const conversionCount = new Set(variantConversions.map(c => c.session_id)).size;
        const conversionRate = participants > 0 ? conversionCount / participants : 0;

        // Calculate confidence interval (simplified)
        const margin = 1.96 * Math.sqrt((conversionRate * (1 - conversionRate)) / participants);
        
        variantResults.push({
          experimentId,
          variantId: variant.id,
          metrics: {
            participants,
            conversions: conversionCount,
            conversionRate,
            averageSessionTime: 0, // Would need session data
            bounceRate: 0 // Would need session data
          },
          significanceLevel: this.CONFIDENCE_LEVEL,
          confidenceInterval: {
            lower: Math.max(0, conversionRate - margin),
            upper: Math.min(1, conversionRate + margin)
          }
        });
      }

      // Determine statistical significance
      const { status, winningVariant } = this.calculateSignificance(variantResults);

      return {
        experimentId,
        totalParticipants,
        variantResults,
        status,
        winningVariant,
        statisticalPower: this.calculateStatisticalPower(variantResults),
        duration: this.calculateExperimentDuration(experiment)
      };
    } catch (error) {
      console.error('Failed to get experiment analytics:', error);
      return null;
    }
  }

  /**
   * Private helper methods
   */
  private async getActiveExperiments(): Promise<ABTestExperiment[]> {
    const { data } = await supabase
      .from('ab_test_experiments')
      .select('*')
      .eq('status', 'active')
      .lte('start_date', new Date().toISOString())
      .or('end_date.is.null,end_date.gte.' + new Date().toISOString())
      .limit(10); // Respect DB limits

    return data || [];
  }

  private async getExperiment(experimentId: string): Promise<ABTestExperiment | null> {
    const { data } = await supabase
      .from('ab_test_experiments')
      .select('*')
      .eq('id', experimentId)
      .single();

    return data || null;
  }

  private async assignToExperiment(
    sessionId: string, 
    experiment: ABTestExperiment, 
    userId?: string
  ): Promise<void> {
    // Check if already assigned
    const existing = await supabase
      .from('ab_test_assignments')
      .select('id')
      .eq('session_id', sessionId)
      .eq('experiment_id', experiment.id)
      .single();

    if (existing.data) {
      return; // Already assigned
    }

    // Determine if user should participate (based on target percentage)
    const random = Math.random() * 100;
    if (random > experiment.targetPercentage) {
      return; // User not in experiment
    }

    // Select variant based on weights
    const variant = this.selectVariant(experiment.variants);

    // Create assignment
    await supabase.from('ab_test_assignments').insert({
      user_id: userId || null,
      session_id: sessionId,
      experiment_id: experiment.id,
      variant_id: variant.id,
      assigned_at: new Date().toISOString(),
      is_active: true
    });
  }

  private selectVariant(variants: ABTestVariant[]): ABTestVariant {
    const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
    const random = Math.random() * totalWeight;
    
    let currentWeight = 0;
    for (const variant of variants) {
      currentWeight += variant.weight;
      if (random <= currentWeight) {
        return variant;
      }
    }
    
    return variants[0]; // Fallback
  }

  private async getAssignment(sessionId: string, experimentId: string): Promise<ABTestAssignment | null> {
    const { data } = await supabase
      .from('ab_test_assignments')
      .select('*')
      .eq('session_id', sessionId)
      .eq('experiment_id', experimentId)
      .eq('is_active', true)
      .single();

    return data ? {
      userId: data.user_id,
      sessionId: data.session_id,
      experimentId: data.experiment_id,
      variantId: data.variant_id,
      assignedAt: data.assigned_at,
      isActive: data.is_active
    } : null;
  }

  private validateExperiment(experiment: Omit<ABTestExperiment, 'id'>): void {
    if (!experiment.name || !experiment.description) {
      throw new Error('Experiment name and description are required');
    }

    if (experiment.variants.length < 2) {
      throw new Error('At least 2 variants required');
    }

    const totalWeight = experiment.variants.reduce((sum, v) => sum + v.weight, 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      throw new Error('Variant weights must sum to 100');
    }

    const controlVariants = experiment.variants.filter(v => v.isControl);
    if (controlVariants.length !== 1) {
      throw new Error('Exactly one control variant required');
    }
  }

  private async getActiveExperimentCount(): Promise<number> {
    const { count } = await supabase
      .from('ab_test_experiments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    return count || 0;
  }

  private calculateSignificance(results: ABTestResult[]): {
    status: 'insufficient_data' | 'no_significant_difference' | 'significant_winner',
    winningVariant?: string
  } {
    const control = results.find(r => r.variantId.includes('control'));
    if (!control || results.length < 2) {
      return { status: 'insufficient_data' };
    }

    // Check sample size
    if (control.metrics.participants < this.MIN_SAMPLE_SIZE) {
      return { status: 'insufficient_data' };
    }

    // Simple significance test (would use proper statistical tests in production)
    const variants = results.filter(r => !r.variantId.includes('control'));
    let bestVariant = control;
    let isSignificant = false;

    for (const variant of variants) {
      if (variant.metrics.participants >= this.MIN_SAMPLE_SIZE) {
        const confidenceIntervalsOverlap = !(
          variant.confidenceInterval.lower > control.confidenceInterval.upper ||
          control.confidenceInterval.lower > variant.confidenceInterval.upper
        );

        if (!confidenceIntervalsOverlap && variant.metrics.conversionRate > bestVariant.metrics.conversionRate) {
          bestVariant = variant;
          isSignificant = true;
        }
      }
    }

    return {
      status: isSignificant ? 'significant_winner' : 'no_significant_difference',
      winningVariant: isSignificant ? bestVariant.variantId : undefined
    };
  }

  private calculateStatisticalPower(results: ABTestResult[]): number {
    // Simplified power calculation
    const control = results.find(r => r.variantId.includes('control'));
    if (!control) return 0;

    const sampleSize = control.metrics.participants;
    const baseRate = control.metrics.conversionRate;
    
    // Basic power approximation
    return Math.min(1, sampleSize / (this.MIN_SAMPLE_SIZE * 2));
  }

  private calculateExperimentDuration(experiment: ABTestExperiment): number {
    const start = new Date(experiment.startDate);
    const end = experiment.endDate ? new Date(experiment.endDate) : new Date();
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }
}

export const abTestingService = new ABTestingService();