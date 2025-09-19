/**
 * Privacy Service
 * Manages user consent, preferences, and privacy settings
 * GDPR and privacy-compliant implementation
 */

import { supabase } from './supabase';

// Types
export type TrackingLevel = 'none' | 'anonymous' | 'full';

export interface UserPreferences {
  user_id: number;
  analytics_opted_in: boolean;
  tracking_level: TrackingLevel;
  consent_date?: string;
  consent_ip_country?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ConsentUpdate {
  analyticsOptedIn: boolean;
  trackingLevel: TrackingLevel;
  ipCountry?: string;
}

export interface PrivacyAuditLog {
  id?: number;
  user_id: number;
  action: 'consent_given' | 'consent_withdrawn' | 'data_exported' | 'data_deleted' | 'preferences_updated';
  details?: Record<string, any>;
  ip_country?: string;
  created_at?: string;
}

// Local storage keys
const CONSENT_KEY = 'gamevault_privacy_consent';
const SESSION_KEY = 'gamevault_session_id';
const CONSENT_SHOWN_KEY = 'gamevault_consent_shown';

class PrivacyService {
  private userPreferences: UserPreferences | null = null;
  private sessionId: string | null = null;

  constructor() {
    this.initializeSession();
  }

  /**
   * Initialize or retrieve session ID
   */
  private initializeSession(): void {
    let sessionId = localStorage.getItem(SESSION_KEY);
    if (!sessionId) {
      // Generate a random session ID
      sessionId = this.generateSessionId();
      localStorage.setItem(SESSION_KEY, sessionId);
    }
    this.sessionId = sessionId;
  }

  /**
   * Generate a random session ID
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Hash session ID using Web Crypto API
   */
  async hashSessionId(sessionId: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(sessionId);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Get current session hash
   */
  async getCurrentSessionHash(): Promise<string> {
    if (!this.sessionId) {
      this.initializeSession();
    }
    return this.hashSessionId(this.sessionId!);
  }

  /**
   * Check if consent banner should be shown
   */
  shouldShowConsentBanner(): boolean {
    const consentShown = localStorage.getItem(CONSENT_SHOWN_KEY);
    const localConsent = localStorage.getItem(CONSENT_KEY);
    return !consentShown || !localConsent;
  }

  /**
   * Mark consent banner as shown
   */
  markConsentBannerShown(): void {
    localStorage.setItem(CONSENT_SHOWN_KEY, 'true');
  }

  /**
   * Get user's privacy preferences
   */
  async getUserPreferences(userId: number): Promise<UserPreferences | null> {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching user preferences:', error);
        return null;
      }

      this.userPreferences = data;
      return data;
    } catch (error) {
      console.error('Error in getUserPreferences:', error);
      return null;
    }
  }

  /**
   * Save user consent (both locally and to database if authenticated)
   */
  async saveConsent(
    consent: ConsentUpdate,
    userId?: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Save to localStorage for immediate effect
      localStorage.setItem(CONSENT_KEY, JSON.stringify({
        analyticsOptedIn: consent.analyticsOptedIn,
        trackingLevel: consent.trackingLevel,
        timestamp: new Date().toISOString()
      }));

      // If user is authenticated, save to database
      if (userId) {
        const preferences: Partial<UserPreferences> = {
          user_id: userId,
          analytics_opted_in: consent.analyticsOptedIn,
          tracking_level: consent.trackingLevel,
          consent_date: new Date().toISOString(),
          consent_ip_country: consent.ipCountry
        };

        const { error } = await supabase
          .from('user_preferences')
          .upsert(preferences, {
            onConflict: 'user_id'
          });

        if (error) {
          console.error('Error saving user preferences:', error);
          return { success: false, error: error.message };
        }

        // Log the consent action
        await this.logPrivacyAction(
          userId,
          consent.analyticsOptedIn ? 'consent_given' : 'consent_withdrawn',
          { tracking_level: consent.trackingLevel },
          consent.ipCountry
        );

        // Update cached preferences
        this.userPreferences = { ...preferences } as UserPreferences;
      }

      return { success: true };
    } catch (error) {
      console.error('Error saving consent:', error);
      return { success: false, error: 'Failed to save consent' };
    }
  }

  /**
   * Withdraw consent
   */
  async withdrawConsent(userId?: number): Promise<{ success: boolean; error?: string }> {
    return this.saveConsent({
      analyticsOptedIn: false,
      trackingLevel: 'none'
    }, userId);
  }

  /**
   * Get local consent (from localStorage)
   */
  getLocalConsent(): { analyticsOptedIn: boolean; trackingLevel: TrackingLevel } | null {
    const consent = localStorage.getItem(CONSENT_KEY);
    if (!consent) return null;

    try {
      const parsed = JSON.parse(consent);
      return {
        analyticsOptedIn: parsed.analyticsOptedIn || false,
        trackingLevel: parsed.trackingLevel || 'anonymous'
      };
    } catch {
      return null;
    }
  }

  /**
   * Check if user has consented to tracking
   */
  async hasTrackingConsent(userId?: number): Promise<boolean> {
    // Check local consent first
    const localConsent = this.getLocalConsent();
    if (localConsent) {
      return localConsent.analyticsOptedIn;
    }

    // If user is authenticated, check database
    if (userId) {
      const preferences = await this.getUserPreferences(userId);
      return preferences?.analytics_opted_in || false;
    }

    return false;
  }

  /**
   * Get user's tracking level
   */
  async getTrackingLevel(userId?: number): Promise<TrackingLevel> {
    // Check local consent first
    const localConsent = this.getLocalConsent();
    if (localConsent) {
      return localConsent.trackingLevel;
    }

    // If user is authenticated, check database
    if (userId) {
      const preferences = await this.getUserPreferences(userId);
      return preferences?.tracking_level || 'anonymous';
    }

    return 'anonymous';
  }

  /**
   * Log privacy-related action for audit trail
   */
  async logPrivacyAction(
    userId: number,
    action: PrivacyAuditLog['action'],
    details?: Record<string, any>,
    ipCountry?: string
  ): Promise<void> {
    try {
      await supabase
        .from('privacy_audit_log')
        .insert({
          user_id: userId,
          action,
          details,
          ip_country: ipCountry
        });
    } catch (error) {
      console.error('Error logging privacy action:', error);
    }
  }

  /**
   * Get user's IP country (for consent logging)
   * Uses a privacy-respecting IP geolocation service
   */
  async getUserCountry(): Promise<string | null> {
    try {
      // Using ipapi.co as it's privacy-friendly and doesn't require API key for basic usage
      const response = await fetch('https://ipapi.co/country/', {
        method: 'GET',
        headers: {
          'Accept': 'text/plain'
        }
      });

      if (response.ok) {
        const country = await response.text();
        return country.trim();
      }
    } catch (error) {
      console.error('Error getting user country:', error);
    }
    return null;
  }

  /**
   * Clear all local privacy data
   */
  clearLocalData(): void {
    localStorage.removeItem(CONSENT_KEY);
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(CONSENT_SHOWN_KEY);
    this.userPreferences = null;
    this.sessionId = null;
    this.initializeSession(); // Generate new session
  }

  /**
   * Sync local consent with database preferences
   */
  async syncConsentWithDatabase(userId: number): Promise<void> {
    try {
      const preferences = await this.getUserPreferences(userId);
      if (preferences) {
        // Update local storage with database preferences
        localStorage.setItem(CONSENT_KEY, JSON.stringify({
          analyticsOptedIn: preferences.analytics_opted_in,
          trackingLevel: preferences.tracking_level,
          timestamp: preferences.consent_date || new Date().toISOString()
        }));
      } else {
        // If no database preferences, save local consent to database
        const localConsent = this.getLocalConsent();
        if (localConsent) {
          await this.saveConsent(localConsent, userId);
        }
      }
    } catch (error) {
      console.error('Error syncing consent:', error);
    }
  }

  /**
   * Check if tracking should be allowed for current context
   */
  async shouldTrack(userId?: number): Promise<{
    allowed: boolean;
    level: TrackingLevel;
    sessionHash: string;
  }> {
    const hasConsent = await this.hasTrackingConsent(userId);
    const trackingLevel = await this.getTrackingLevel(userId);
    const sessionHash = await this.getCurrentSessionHash();

    // Determine if tracking is allowed based on consent and level
    const allowed = hasConsent && trackingLevel !== 'none';

    return {
      allowed,
      level: trackingLevel,
      sessionHash
    };
  }

  /**
   * Get privacy statistics for transparency
   */
  async getPrivacyStats(): Promise<{
    totalUsers: number;
    optedIn: number;
    optedOut: number;
    anonymousOnly: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('analytics_opted_in, tracking_level');

      if (error) {
        console.error('Error fetching privacy stats:', error);
        return {
          totalUsers: 0,
          optedIn: 0,
          optedOut: 0,
          anonymousOnly: 0
        };
      }

      const stats = {
        totalUsers: data?.length || 0,
        optedIn: data?.filter(p => p.analytics_opted_in).length || 0,
        optedOut: data?.filter(p => !p.analytics_opted_in).length || 0,
        anonymousOnly: data?.filter(p => p.tracking_level === 'anonymous').length || 0
      };

      return stats;
    } catch (error) {
      console.error('Error calculating privacy stats:', error);
      return {
        totalUsers: 0,
        optedIn: 0,
        optedOut: 0,
        anonymousOnly: 0
      };
    }
  }
}

// Export singleton instance
export const privacyService = new PrivacyService();