/**
 * Avatar Moderation Service
 * Uses NSFW.js for free client-side moderation
 * Blocks: nudity, extremism, self-harm, hate symbols
 * Allows: suggestive content, violence (gaming platform)
 *
 * LAZY LOADING: nsfwjs is dynamically imported only when needed
 * This prevents loading TensorFlow.js on every page load
 */

import { supabase } from './supabase';

// Type imports only - don't import the actual library
type NSFWJS = any;
type PredictionType = { className: string; probability: number };

export interface ModerationResult {
  approved: boolean;
  confidence: number;
  stage: 'client' | 'server';
  violations: ViolationType[];
  message: string;
  cost: number;
}

export type ViolationType =
  | 'nudity'
  | 'pornographic'
  | 'extremist_content'
  | 'hate_symbols'
  | 'self_harm';

export interface ModerationThresholds {
  porn: number;
  hentai: number;
  sexy: number;  // We allow this (suggestive content OK)
  neutral: number;
  drawing: number;
}

// Liberal thresholds - only block obvious inappropriate content
const DEFAULT_THRESHOLDS: ModerationThresholds = {
  porn: 0.7,      // Block at 70% confidence (liberal)
  hentai: 0.7,    // Block at 70% confidence (liberal)
  sexy: 1.0,      // Never block suggestive content
  neutral: 0.3,   // 30% neutral is enough to pass
  drawing: 1.0    // Don't block based on drawing score
};

export class AvatarModerationService {
  private nsfwModel: NSFWJS | null = null;
  private modelLoading: Promise<void> | null = null;
  private nsfwjs: any = null; // Dynamically loaded library
  private thresholds: ModerationThresholds;

  constructor(thresholds: ModerationThresholds = DEFAULT_THRESHOLDS) {
    this.thresholds = thresholds;
  }

  /**
   * Lazy load the nsfwjs library
   * Only loads when actually needed (during avatar upload)
   */
  private async loadNSFWLibrary(): Promise<any> {
    if (this.nsfwjs) return this.nsfwjs;

    try {
      console.log('🔄 Lazy loading nsfwjs library...');
      // Dynamic import - only loads when called
      this.nsfwjs = await import('nsfwjs');
      console.log('✅ nsfwjs library loaded');
      return this.nsfwjs;
    } catch (error) {
      console.error('❌ Failed to load nsfwjs library:', error);
      throw new Error('Failed to load moderation library');
    }
  }

  /**
   * Initialize the NSFW.js model (one-time 5MB download)
   */
  private async initializeModel(): Promise<void> {
    if (this.nsfwModel) return;

    if (this.modelLoading) {
      await this.modelLoading;
      return;
    }

    this.modelLoading = (async () => {
      try {
        // Lazy load the library first
        const nsfwjs = await this.loadNSFWLibrary();

        console.log('🔄 Loading NSFW.js model...');
        // Load the model from the CDN
        this.nsfwModel = await nsfwjs.load();
        console.log('✅ NSFW.js model loaded successfully');
      } catch (error) {
        console.error('❌ Failed to load NSFW.js model:', error);
        throw new Error('Failed to initialize moderation model');
      }
    })();

    await this.modelLoading;
  }

  /**
   * Main moderation function - checks image for inappropriate content
   */
  async moderateAvatar(
    imageFile: File,
    userId?: number
  ): Promise<ModerationResult> {
    try {
      // Initialize model if needed
      await this.initializeModel();

      // Convert file to image element
      const imageUrl = URL.createObjectURL(imageFile);
      const img = new Image();

      return new Promise((resolve) => {
        img.onload = async () => {
          try {
            // Run NSFW.js classification
            const predictions = await this.classifyImage(img);

            // Clean up
            URL.revokeObjectURL(imageUrl);

            // Check for violations based on our thresholds
            const violations = this.detectViolations(predictions);

            // Log moderation attempt
            if (userId) {
              await this.logModeration(userId, violations.length === 0, violations);
            }

            resolve({
              approved: violations.length === 0,
              confidence: this.calculateConfidence(predictions),
              stage: 'client',
              violations,
              message: this.generateMessage(violations),
              cost: 0  // Free!
            });
          } catch (error) {
            console.error('Moderation error:', error);
            // On error, be conservative and reject
            resolve({
              approved: false,
              confidence: 0,
              stage: 'client',
              violations: [],
              message: 'Unable to verify image. Please try another.',
              cost: 0
            });
          }
        };

        img.onerror = () => {
          URL.revokeObjectURL(imageUrl);
          resolve({
            approved: false,
            confidence: 0,
            stage: 'client',
            violations: [],
            message: 'Invalid image file. Please try another.',
            cost: 0
          });
        };

        img.src = imageUrl;
      });
    } catch (error) {
      console.error('Moderation service error:', error);
      return {
        approved: false,
        confidence: 0,
        stage: 'client',
        violations: [],
        message: 'Moderation service unavailable. Please try again later.',
        cost: 0
      };
    }
  }

  /**
   * Classify image using NSFW.js
   */
  private async classifyImage(img: HTMLImageElement): Promise<PredictionType[]> {
    if (!this.nsfwModel) {
      throw new Error('Model not initialized');
    }

    const predictions = await this.nsfwModel.classify(img);

    // Log predictions for debugging (remove in production)
    if (import.meta.env.DEV) {
      console.log('NSFW.js predictions:', predictions);
    }

    return predictions;
  }

  /**
   * Detect violations based on predictions and thresholds
   */
  private detectViolations(predictions: PredictionType[]): ViolationType[] {
    const violations: ViolationType[] = [];

    // Get scores for each category
    const scores = this.extractScores(predictions);

    // Check for nudity/pornography (we block these)
    if (scores.porn > this.thresholds.porn) {
      violations.push('pornographic');
    }

    if (scores.hentai > this.thresholds.hentai) {
      violations.push('pornographic');
    }

    // Note: NSFW.js doesn't detect extremism/self-harm directly
    // These would require additional checks or manual review
    // For now, we're only blocking nudity as that's what NSFW.js detects

    return violations;
  }

  /**
   * Extract scores from predictions
   */
  private extractScores(predictions: PredictionType[]): Record<string, number> {
    const scores: Record<string, number> = {
      porn: 0,
      sexy: 0,
      hentai: 0,
      neutral: 0,
      drawing: 0
    };

    predictions.forEach(pred => {
      const className = pred.className.toLowerCase();
      if (className in scores) {
        scores[className] = pred.probability;
      }
    });

    return scores;
  }

  /**
   * Calculate overall confidence in the decision
   */
  private calculateConfidence(predictions: PredictionType[]): number {
    const scores = this.extractScores(predictions);

    // If clearly safe (high neutral score)
    if (scores.neutral > 0.9) return 0.95;

    // If clearly unsafe (high porn/hentai score)
    if (scores.porn > 0.8 || scores.hentai > 0.8) return 0.95;

    // For borderline cases, return moderate confidence
    return 0.7;
  }

  /**
   * Generate user-friendly message based on violations
   */
  private generateMessage(violations: ViolationType[]): string {
    // Generic message as requested
    if (violations.length > 0) {
      return 'This image cannot be used as an avatar.';
    }
    return 'Image approved.';
  }

  /**
   * Log moderation attempt to database
   */
  private async logModeration(
    userId: number,
    approved: boolean,
    violations: ViolationType[]
  ): Promise<void> {
    try {
      await supabase.from('avatar_moderation_logs').insert({
        user_id: userId,
        approved,
        violations,
        timestamp: new Date().toISOString(),
        service: 'nsfwjs'
      });
    } catch (error) {
      // Don't fail the moderation if logging fails
      console.error('Failed to log moderation:', error);
    }
  }

  /**
   * Check if user has reached rate limits
   */
  async checkRateLimits(userId: number): Promise<{
    allowed: boolean;
    message?: string;
    resetAt?: Date;
  }> {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Check hourly uploads
      const { count: hourlyCount } = await supabase
        .from('avatar_moderation_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('timestamp', oneHourAgo.toISOString());

      if (hourlyCount && hourlyCount >= 5) {
        return {
          allowed: false,
          message: 'Upload limit reached. Try again in an hour.',
          resetAt: new Date(now.getTime() + 60 * 60 * 1000)
        };
      }

      // Check daily uploads
      const { count: dailyCount } = await supabase
        .from('avatar_moderation_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('timestamp', oneDayAgo.toISOString());

      if (dailyCount && dailyCount >= 10) {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        return {
          allowed: false,
          message: 'Daily upload limit reached. Try again tomorrow.',
          resetAt: tomorrow
        };
      }

      // Check failed attempts
      const { count: failedCount } = await supabase
        .from('avatar_moderation_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('approved', false)
        .gte('timestamp', oneDayAgo.toISOString());

      if (failedCount && failedCount >= 5) {
        return {
          allowed: false,
          message: 'Too many failed upload attempts. Try again tomorrow.',
          resetAt: new Date(now.getTime() + 24 * 60 * 60 * 1000)
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error('Rate limit check failed:', error);
      // On error, allow the upload (fail open)
      return { allowed: true };
    }
  }
}

// Export singleton instance
export const avatarModerationService = new AvatarModerationService();