import { supabase } from './supabase';

export interface ReferralCode {
  code: string;
  owner_name: string;
  type: 'salesperson' | 'campaign';
}

export interface ReferralData {
  id: number;
  user_id: number;
  referral_code: string;
  signup_method: 'direct_code' | 'referral_url';
  signup_url?: string;
  created_at: string;
}

export interface ConversionMetrics {
  // Profile Completion
  email_verified: boolean;
  email_verified_at?: string;
  profile_photo_uploaded: boolean;
  profile_photo_uploaded_at?: string;
  bio_completed: boolean;
  bio_completed_at?: string;

  // Content Creation
  reviews_count: number;
  review_1_completed_at?: string;
  review_5_completed_at?: string;
  review_10_completed_at?: string;
  comments_count: number;
  comment_1_completed_at?: string;

  // Social Engagement
  top5_selected: boolean;
  top5_selected_at?: string;
  following_count: number;
  following_3plus: boolean;
  following_3plus_at?: string;
  likes_given_count: number;
  likes_3_completed_at?: string;

  // Retention
  active_days_week1: number;
  active_3_days_week1: boolean;
  active_3_days_week1_at?: string;

  // Subscription/Monetization
  converted_to_paid: boolean;
  converted_to_paid_at?: string;
  subscription_tier?: string;
  subscription_amount?: number;

  // Summary
  all_completed: boolean;
  all_completed_at?: string;
}

export const referralService = {
  /**
   * Validate a referral code
   */
  async validateCode(code: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('validate_referral_code', {
        code_input: code.toUpperCase()
      });

      if (error) {
        console.error('Error validating referral code:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('Error validating referral code:', error);
      return false;
    }
  },

  /**
   * Get referral code information
   */
  async getCodeInfo(code: string): Promise<ReferralCode | null> {
    try {
      const { data, error } = await supabase.rpc('get_referral_code_info', {
        code_input: code.toUpperCase()
      });

      if (error) {
        console.error('Error getting referral code info:', error);
        return null;
      }

      return data?.[0] || null;
    } catch (error) {
      console.error('Error getting referral code info:', error);
      return null;
    }
  },

  /**
   * Record a referral at signup
   */
  async recordReferral(
    userId: number,
    referralCode: string,
    signupMethod: 'direct_code' | 'referral_url',
    signupUrl?: string
  ): Promise<number | null> {
    try {
      const { data, error } = await supabase.rpc('record_referral', {
        p_user_id: userId,
        p_referral_code: referralCode.toUpperCase(),
        p_signup_method: signupMethod,
        p_signup_url: signupUrl || null
      });

      if (error) {
        console.error('Error recording referral:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error recording referral:', error);
      return null;
    }
  },

  /**
   * Get user's referral data
   */
  async getUserReferral(userId: number): Promise<ReferralData | null> {
    try {
      const { data, error } = await supabase
        .from('referrals')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No referral found
          return null;
        }
        console.error('Error getting user referral:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error getting user referral:', error);
      return null;
    }
  },

  /**
   * Update conversion metrics for a user
   */
  async updateConversionMetrics(
    userId: number,
    metrics: Partial<ConversionMetrics>
  ): Promise<boolean> {
    try {
      // First get the referral_id
      const referral = await this.getUserReferral(userId);
      if (!referral) {
        return false;
      }

      const { error } = await supabase
        .from('referral_conversions')
        .update(metrics)
        .eq('referral_id', referral.id);

      if (error) {
        console.error('Error updating conversion metrics:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating conversion metrics:', error);
      return false;
    }
  },

  /**
   * Track email verification
   */
  async trackEmailVerified(userId: number): Promise<void> {
    await this.updateConversionMetrics(userId, {
      email_verified: true,
      email_verified_at: new Date().toISOString()
    });
  },

  /**
   * Track profile photo upload
   */
  async trackProfilePhotoUploaded(userId: number): Promise<void> {
    await this.updateConversionMetrics(userId, {
      profile_photo_uploaded: true,
      profile_photo_uploaded_at: new Date().toISOString()
    });
  },

  /**
   * Track bio completion
   */
  async trackBioCompleted(userId: number): Promise<void> {
    await this.updateConversionMetrics(userId, {
      bio_completed: true,
      bio_completed_at: new Date().toISOString()
    });
  },

  /**
   * Track top 5 games selection
   */
  async trackTop5Selected(userId: number): Promise<void> {
    await this.updateConversionMetrics(userId, {
      top5_selected: true,
      top5_selected_at: new Date().toISOString()
    });
  },

  /**
   * Update review count and milestones
   */
  async updateReviewMilestones(userId: number): Promise<void> {
    try {
      const { error } = await supabase.rpc('update_review_milestones', {
        p_user_id: userId
      });

      if (error) {
        console.error('Error updating review milestones:', error);
      }
    } catch (error) {
      console.error('Error updating review milestones:', error);
    }
  },

  /**
   * Track comment creation
   */
  async trackCommentCreated(userId: number): Promise<void> {
    try {
      const referral = await this.getUserReferral(userId);
      if (!referral) return;

      // Get current comment count
      const { data: conversions } = await supabase
        .from('referral_conversions')
        .select('comments_count')
        .eq('referral_id', referral.id)
        .single();

      const newCount = (conversions?.comments_count || 0) + 1;
      const updates: Partial<ConversionMetrics> = {
        comments_count: newCount
      };

      // Set milestone timestamp if first comment
      if (newCount === 1) {
        updates.comment_1_completed_at = new Date().toISOString();
      }

      await this.updateConversionMetrics(userId, updates);
    } catch (error) {
      console.error('Error tracking comment:', error);
    }
  },

  /**
   * Track likes given
   */
  async trackLikeGiven(userId: number): Promise<void> {
    try {
      const referral = await this.getUserReferral(userId);
      if (!referral) return;

      // Get current likes count
      const { data: conversions } = await supabase
        .from('referral_conversions')
        .select('likes_given_count')
        .eq('referral_id', referral.id)
        .single();

      const newCount = (conversions?.likes_given_count || 0) + 1;
      const updates: Partial<ConversionMetrics> = {
        likes_given_count: newCount
      };

      // Set milestone timestamp if reached 3 likes
      if (newCount === 3) {
        updates.likes_3_completed_at = new Date().toISOString();
      }

      await this.updateConversionMetrics(userId, updates);
    } catch (error) {
      console.error('Error tracking like:', error);
    }
  },

  /**
   * Track user follows
   */
  async trackUserFollowed(userId: number): Promise<void> {
    try {
      const referral = await this.getUserReferral(userId);
      if (!referral) return;

      // Get current following count
      const { data: conversions } = await supabase
        .from('referral_conversions')
        .select('following_count')
        .eq('referral_id', referral.id)
        .single();

      const newCount = (conversions?.following_count || 0) + 1;
      const updates: Partial<ConversionMetrics> = {
        following_count: newCount
      };

      // Set milestone if reached 3+ follows
      if (newCount === 3) {
        updates.following_3plus = true;
        updates.following_3plus_at = new Date().toISOString();
      }

      await this.updateConversionMetrics(userId, updates);
    } catch (error) {
      console.error('Error tracking follow:', error);
    }
  },

  /**
   * Track daily activity for first week
   */
  async trackDailyActivity(userId: number): Promise<void> {
    try {
      const referral = await this.getUserReferral(userId);
      if (!referral) return;

      // Check if within first week
      const signupDate = new Date(referral.created_at);
      const now = new Date();
      const daysSinceSignup = Math.floor(
        (now.getTime() - signupDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceSignup > 7) return;

      // Track unique active days (would need more logic for actual implementation)
      // This is simplified - you'd want to track actual unique days
      const { data: conversions } = await supabase
        .from('referral_conversions')
        .select('active_days_week1')
        .eq('referral_id', referral.id)
        .single();

      const activeDays = conversions?.active_days_week1 || 0;
      const updates: Partial<ConversionMetrics> = {
        active_days_week1: activeDays + 1
      };

      if (activeDays + 1 >= 3) {
        updates.active_3_days_week1 = true;
        updates.active_3_days_week1_at = new Date().toISOString();
      }

      await this.updateConversionMetrics(userId, updates);
    } catch (error) {
      console.error('Error tracking daily activity:', error);
    }
  },

  /**
   * Track conversion to paid/pro membership
   */
  async trackPaidConversion(
    userId: number,
    subscriptionTier: string = 'pro',
    subscriptionAmount?: number
  ): Promise<void> {
    try {
      const { error } = await supabase.rpc('track_paid_conversion', {
        p_user_id: userId,
        p_subscription_tier: subscriptionTier,
        p_subscription_amount: subscriptionAmount || null
      });

      if (error) {
        console.error('Error tracking paid conversion:', error);
      }
    } catch (error) {
      console.error('Error tracking paid conversion:', error);
    }
  },

  /**
   * Get complete conversion metrics for a user
   */
  async getConversionMetrics(userId: number): Promise<ConversionMetrics | null> {
    try {
      const referral = await this.getUserReferral(userId);
      if (!referral) return null;

      const { data, error } = await supabase
        .from('referral_conversions')
        .select('*')
        .eq('referral_id', referral.id)
        .single();

      if (error) {
        console.error('Error getting conversion metrics:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error getting conversion metrics:', error);
      return null;
    }
  },

  /**
   * Get all referrals for a specific code (for admin dashboard)
   */
  async getReferralsByCode(code: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('referrals')
        .select(`
          *,
          user:user_id (*),
          conversions:referral_conversions (*)
        `)
        .eq('referral_code', code.toUpperCase())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error getting referrals by code:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting referrals by code:', error);
      return [];
    }
  },

  /**
   * Get summary metrics for a referral code (for admin dashboard)
   */
  async getCodeMetrics(code: string): Promise<any> {
    try {
      const referrals = await this.getReferralsByCode(code);

      const metrics = {
        total_signups: referrals.length,
        email_verified: 0,
        profile_photo_uploaded: 0,
        bio_completed: 0,
        review_1_written: 0,
        review_5_written: 0,
        review_10_written: 0,
        comment_1_written: 0,
        top5_selected: 0,
        following_3plus: 0,
        likes_3_given: 0,
        active_3_days_week1: 0,
        converted_to_paid: 0,
        all_completed: 0,
        total_revenue: 0
      };

      referrals.forEach(referral => {
        const conv = referral.conversions;
        if (!conv) return;

        if (conv.email_verified) metrics.email_verified++;
        if (conv.profile_photo_uploaded) metrics.profile_photo_uploaded++;
        if (conv.bio_completed) metrics.bio_completed++;
        if (conv.review_1_completed_at) metrics.review_1_written++;
        if (conv.review_5_completed_at) metrics.review_5_written++;
        if (conv.review_10_completed_at) metrics.review_10_written++;
        if (conv.comment_1_completed_at) metrics.comment_1_written++;
        if (conv.top5_selected) metrics.top5_selected++;
        if (conv.following_3plus) metrics.following_3plus++;
        if (conv.likes_3_completed_at) metrics.likes_3_given++;
        if (conv.active_3_days_week1) metrics.active_3_days_week1++;
        if (conv.converted_to_paid) {
          metrics.converted_to_paid++;
          metrics.total_revenue += conv.subscription_amount || 0;
        }
        if (conv.all_completed) metrics.all_completed++;
      });

      return metrics;
    } catch (error) {
      console.error('Error getting code metrics:', error);
      return null;
    }
  }
};