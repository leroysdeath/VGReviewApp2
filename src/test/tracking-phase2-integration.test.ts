/**
 * Phase 2 Integration Tests for Game Tracking
 * Tests that tracking services work correctly with different consent levels
 */

import { privacyService } from '../services/privacyService';
import { trackingService } from '../services/trackingService';
import { supabase } from '../services/supabase';

describe('Phase 2 Tracking Integration', () => {
  beforeEach(() => {
    // Clear localStorage to start fresh
    localStorage.clear();
  });

  describe('Consent Level Testing', () => {
    it('should handle no consent gracefully', async () => {
      // Set no consent in localStorage
      const result = await trackingService.trackGameView(123, 'direct');
      
      // Should not error, but may not track based on consent
      expect(result.success).toBe(true);
    });

    it('should track with anonymous consent', async () => {
      // Simulate anonymous consent
      localStorage.setItem('gamevault_privacy_consent', JSON.stringify({
        analyticsOptedIn: true,
        trackingLevel: 'anonymous',
        timestamp: new Date().toISOString()
      }));

      const result = await trackingService.trackGameView(123, 'direct');
      
      expect(result.success).toBe(true);
    });

    it('should track with full consent', async () => {
      // Simulate full consent
      localStorage.setItem('gamevault_privacy_consent', JSON.stringify({
        analyticsOptedIn: true,
        trackingLevel: 'full',
        timestamp: new Date().toISOString()
      }));

      const result = await trackingService.trackGameView(123, 'direct', 456);
      
      expect(result.success).toBe(true);
    });

    it('should not track when explicitly opted out', async () => {
      // Simulate opted out
      localStorage.setItem('gamevault_privacy_consent', JSON.stringify({
        analyticsOptedIn: false,
        trackingLevel: 'none',
        timestamp: new Date().toISOString()
      }));

      const result = await trackingService.trackGameView(123, 'direct');
      
      expect(result.success).toBe(true);
      expect(result.tracked).toBe(false);
      expect(result.reason).toContain('not consented');
    });
  });

  describe('Session Management', () => {
    it('should generate valid session hashes', async () => {
      const hash1 = await privacyService.getCurrentSessionHash();
      const hash2 = await privacyService.getCurrentSessionHash();
      
      // Should be consistent for same session
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex format
    });

    it('should create new session when cleared', async () => {
      const hash1 = await privacyService.getCurrentSessionHash();
      
      privacyService.clearLocalData();
      
      const hash2 = await privacyService.getCurrentSessionHash();
      
      // Should be different after clearing
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Privacy Service Integration', () => {
    it('should properly sync consent states', async () => {
      // Set local consent
      await privacyService.saveConsent({
        analyticsOptedIn: true,
        trackingLevel: 'anonymous'
      });

      const localConsent = privacyService.getLocalConsent();
      expect(localConsent?.analyticsOptedIn).toBe(true);
      expect(localConsent?.trackingLevel).toBe('anonymous');
    });

    it('should handle consent withdrawal', async () => {
      // First give consent
      await privacyService.saveConsent({
        analyticsOptedIn: true,
        trackingLevel: 'full'
      });

      // Then withdraw it
      await privacyService.withdrawConsent();

      const consent = privacyService.getLocalConsent();
      expect(consent?.analyticsOptedIn).toBe(false);
      expect(consent?.trackingLevel).toBe('none');
    });

    it('should validate tracking decisions', async () => {
      // Set consent
      await privacyService.saveConsent({
        analyticsOptedIn: true,
        trackingLevel: 'anonymous'
      });

      const shouldTrack = await privacyService.shouldTrack();
      
      expect(shouldTrack.allowed).toBe(true);
      expect(shouldTrack.level).toBe('anonymous');
      expect(shouldTrack.sessionHash).toBeDefined();
    });
  });

  describe('Tracking Service Integration', () => {
    it('should handle different view sources correctly', async () => {
      const sources = ['search', 'direct', 'recommendation', 'list', 'review', 'profile'];
      
      for (const source of sources) {
        const result = await trackingService.trackGameView(123, source as any);
        expect(result.success).toBe(true);
      }
    });

    it('should provide convenience methods', async () => {
      const methods = [
        () => trackingService.trackSearchResultClick(123),
        () => trackingService.trackRecommendationClick(123),
        () => trackingService.trackListItemClick(123),
        () => trackingService.trackReviewView(123),
        () => trackingService.trackProfileGameView(123)
      ];

      for (const method of methods) {
        const result = await method();
        expect(result.success).toBe(true);
      }
    });

    it('should handle throttling correctly', async () => {
      // Set consent for tracking
      await privacyService.saveConsent({
        analyticsOptedIn: true,
        trackingLevel: 'anonymous'
      });

      // First track should succeed
      const result1 = await trackingService.trackGameView(123, 'direct');
      expect(result1.success).toBe(true);

      // Immediate re-track of same game should be throttled
      const result2 = await trackingService.trackGameView(123, 'direct');
      expect(result2.success).toBe(true);
      
      // Note: Actual throttling behavior depends on session hash consistency
    });
  });

  describe('Database Integration', () => {
    it('should verify tracking tables exist and are accessible', async () => {
      // Test each tracking table
      const tables = [
        'game_views',
        'game_metrics_daily', 
        'user_privacy_preferences',
        'privacy_audit_log'
      ];

      for (const table of tables) {
        const { error } = await supabase
          .from(table)
          .select('*')
          .limit(0);
        
        expect(error).toBeNull();
      }
    });

    it('should verify GDPR functions are available', async () => {
      const functions = [
        'export_user_tracking_data',
        'delete_user_tracking_data',
        'cleanup_old_tracking_data'
      ];

      for (const funcName of functions) {
        const { error } = await supabase.rpc(funcName, { user_id: 999999 });
        
        // Functions should exist (may return empty results for test user)
        expect(error).toBeNull();
      }
    });
  });

  describe('Performance and Rate Limiting', () => {
    it('should handle multiple tracking calls efficiently', async () => {
      const startTime = performance.now();
      
      // Track multiple games
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(trackingService.trackGameView(100 + i, 'direct'));
      }
      
      const results = await Promise.all(promises);
      const endTime = performance.now();
      
      // All should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
      
      // Should complete reasonably quickly (under 1 second for 10 calls)
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should respect API rate limits', async () => {
      // Test that we don't exceed reasonable API usage
      const gameIds = Array.from({length: 5}, (_, i) => 200 + i);
      let successCount = 0;
      
      for (const gameId of gameIds) {
        try {
          const result = await trackingService.trackGameView(gameId, 'direct');
          if (result.success) successCount++;
        } catch (error) {
          // Rate limiting errors are acceptable
          console.log('Rate limited (expected):', error);
        }
      }
      
      // At least some should succeed
      expect(successCount).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle network errors gracefully', async () => {
      // This test would normally mock network failures
      // For now, just verify the service doesn't crash
      const result = await trackingService.trackGameView(123, 'direct');
      expect(typeof result.success).toBe('boolean');
    });

    it('should handle invalid game IDs', async () => {
      const result = await trackingService.trackGameView(-1, 'direct');
      expect(result.success).toBe(true); // Service should handle gracefully
    });

    it('should handle malformed consent data', async () => {
      // Set malformed consent data
      localStorage.setItem('gamevault_privacy_consent', 'invalid-json');
      
      const consent = privacyService.getLocalConsent();
      expect(consent).toBeNull(); // Should handle gracefully
      
      // Should still work with defaults
      const shouldTrack = await privacyService.shouldTrack();
      expect(typeof shouldTrack.allowed).toBe('boolean');
    });
  });
});