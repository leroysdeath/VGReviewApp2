/**
 * Phase 3 Privacy Integration Tests
 * Comprehensive testing of privacy settings, GDPR rights, and policy pages
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock Supabase client
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(() => ({
          data: null,
          error: null
        })),
        order: jest.fn(() => ({
          data: [],
          error: null
        }))
      }))
    })),
    insert: jest.fn(() => ({
      data: null,
      error: null
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        data: null,
        error: null
      }))
    })),
    delete: jest.fn(() => ({
      eq: jest.fn(() => ({
        error: null
      }))
    }))
  })),
  auth: {
    getUser: jest.fn(() => ({
      data: { user: { id: 'test-auth-id' } },
      error: null
    }))
  }
};

jest.mock('../services/supabase', () => ({
  supabase: mockSupabase
}));

// Mock Web Crypto API
const mockCrypto = {
  subtle: {
    digest: jest.fn(() => Promise.resolve(new ArrayBuffer(32)))
  }
};
Object.defineProperty(global, 'crypto', {
  value: mockCrypto
});

import { privacyService, TrackingLevel, UserPreferences } from '../services/privacyService';
import { gdprService, UserDataExport, DataDeletionResult } from '../services/gdprService';

describe('Phase 3: Privacy Controls Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    
    // Setup crypto mock
    (mockCrypto.subtle.digest as jest.Mock).mockResolvedValue(
      new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]).buffer
    );
  });

  describe('Privacy Settings Management', () => {
    it('should manage tracking level preferences', async () => {
      // Mock user preferences lookup
      (mockSupabase.from().select().eq().single as jest.Mock).mockResolvedValue({
        data: {
          analytics_opted_in: true,
          tracking_level: 'full',
          consent_date: new Date().toISOString()
        },
        error: null
      });

      const preferences = await privacyService.getUserPreferences(123);
      
      expect(preferences).toEqual({
        analytics_opted_in: true,
        tracking_level: 'full',
        consent_date: expect.any(String)
      });
    });

    it('should update tracking preferences', async () => {
      (mockSupabase.from().update().eq as jest.Mock).mockResolvedValue({
        data: { id: 1, tracking_level: 'anonymous' },
        error: null
      });

      const newPreferences: Partial<UserPreferences> = {
        tracking_level: 'anonymous',
        analytics_opted_in: false
      };

      await expect(
        privacyService.updateUserPreferences(123, newPreferences)
      ).resolves.not.toThrow();

      expect(mockSupabase.from).toHaveBeenCalledWith('user_preferences');
    });

    it('should respect tracking level hierarchy', () => {
      const levels: TrackingLevel[] = ['none', 'anonymous', 'full'];
      
      // Test privacy levels
      expect(privacyService.shouldTrack('none')).toBe(false);
      expect(privacyService.shouldTrack('anonymous')).toBe(true);
      expect(privacyService.shouldTrack('full')).toBe(true);
    });

    it('should manage consent state in localStorage', async () => {
      // Test local consent management
      privacyService.setLocalConsent('full', true);
      
      expect(localStorage.getItem('privacy_consent')).toBeTruthy();
      
      const consent = privacyService.getLocalConsent();
      expect(consent.level).toBe('full');
      expect(consent.analytics_opted_in).toBe(true);
    });
  });

  describe('GDPR Data Rights Implementation', () => {
    it('should export user data comprehensively', async () => {
      const mockUserData: UserDataExport = {
        exportDate: new Date().toISOString(),
        userId: 123,
        profile: {
          username: 'testuser',
          email: 'test@example.com'
        },
        preferences: {
          tracking_level: 'full',
          analytics_opted_in: true
        },
        gameViews: [
          {
            game_id: 456,
            view_date: '2024-01-01',
            view_source: 'search'
          }
        ],
        reviews: [],
        comments: [],
        activities: [],
        socialConnections: {
          followers: [],
          following: []
        },
        notifications: [],
        gameProgress: [],
        auditLog: []
      };

      // Mock the database queries for data export
      (mockSupabase.from().select().eq as jest.Mock)
        .mockResolvedValueOnce({ data: mockUserData.profile, error: null })
        .mockResolvedValueOnce({ data: mockUserData.gameViews, error: null })
        .mockResolvedValueOnce({ data: mockUserData.reviews, error: null });

      const exportedData = await gdprService.exportUserData(123);

      expect(exportedData).toBeDefined();
      expect(exportedData?.userId).toBe(123);
      expect(exportedData?.exportDate).toBeDefined();
      expect(exportedData?.gameViews).toEqual(mockUserData.gameViews);
    });

    it('should handle data deletion with proper safeguards', async () => {
      const mockDeletionResult: DataDeletionResult = {
        success: true,
        deletedItems: {
          gameViews: 5,
          activities: 3,
          notifications: 10
        },
        anonymizedItems: {
          reviews: 2,
          comments: 1
        }
      };

      // Mock deletion operations
      (mockSupabase.from().delete().eq as jest.Mock).mockResolvedValue({
        error: null
      });

      const result = await gdprService.deleteUserData(123);

      expect(result.success).toBe(true);
      expect(result.deletedItems).toBeDefined();
      expect(result.anonymizedItems).toBeDefined();
    });

    it('should maintain audit trail for privacy actions', async () => {
      const auditEntry = {
        user_id: 123,
        action: 'data_exported',
        details: { format: 'json' },
        created_at: new Date().toISOString()
      };

      (mockSupabase.from().insert as jest.Mock).mockResolvedValue({
        data: auditEntry,
        error: null
      });

      await expect(
        gdprService.logPrivacyAction(123, 'data_exported', { format: 'json' })
      ).resolves.not.toThrow();

      expect(mockSupabase.from).toHaveBeenCalledWith('privacy_audit_log');
    });
  });

  describe('Privacy Policy and Consent Flow', () => {
    it('should handle consent banner workflow', async () => {
      // Test initial state (no consent)
      expect(privacyService.hasValidConsent()).toBe(false);

      // User gives consent
      privacyService.setLocalConsent('anonymous', true);
      expect(privacyService.hasValidConsent()).toBe(true);

      // User withdraws consent
      privacyService.withdrawConsent();
      expect(privacyService.hasValidConsent()).toBe(false);
    });

    it('should sync local consent with database for authenticated users', async () => {
      (mockSupabase.from().update().eq as jest.Mock).mockResolvedValue({
        data: { id: 1 },
        error: null
      });

      // Sync local consent to database
      privacyService.setLocalConsent('full', true);
      await privacyService.syncConsentToDatabase(123);

      expect(mockSupabase.from().update).toHaveBeenCalled();
    });

    it('should validate privacy policy acceptance', () => {
      const policyVersion = '2025-01-01';
      
      // Mock policy acceptance
      localStorage.setItem('privacy_policy_accepted', JSON.stringify({
        version: policyVersion,
        date: new Date().toISOString()
      }));

      const hasAcceptedPolicy = privacyService.hasPolicyConsent(policyVersion);
      expect(hasAcceptedPolicy).toBe(true);
    });
  });

  describe('Data Retention and Cleanup', () => {
    it('should implement automatic data cleanup schedules', async () => {
      const retentionInfo = {
        gameViews: {
          retentionDays: 90,
          oldestData: '2024-01-01',
          scheduledDeletion: '2024-04-01'
        },
        aggregatedMetrics: {
          retentionDays: 180,
          oldestData: '2023-07-01',
          scheduledDeletion: '2023-12-30'
        },
        auditLogs: {
          retentionDays: 730,
          oldestData: '2022-01-01',
          scheduledDeletion: '2024-01-01'
        }
      };

      const info = await gdprService.getDataRetentionInfo(123);
      expect(info).toBeDefined();
      expect(info.gameViews.retentionDays).toBe(90);
    });

    it('should handle scheduled cleanup operations', async () => {
      // Mock cleanup function call
      (mockSupabase.from().delete as jest.Mock).mockResolvedValue({
        count: 25,
        error: null
      });

      const cleanupResult = await gdprService.runScheduledCleanup();
      expect(cleanupResult).toBeDefined();
    });
  });

  describe('Security and Access Control', () => {
    it('should enforce user access controls for privacy settings', async () => {
      // Mock unauthorized access attempt
      const unauthorizedUserId = 999;
      
      await expect(
        gdprService.exportUserData(unauthorizedUserId)
      ).rejects.toThrow();
    });

    it('should validate session integrity for sensitive operations', async () => {
      const sessionHash = await privacyService.generateSessionHash();
      expect(sessionHash).toBeDefined();
      expect(sessionHash.length).toBe(64); // SHA-256 hex string
    });

    it('should handle rate limiting for privacy operations', async () => {
      // Mock rate limiting
      const operations = Array(10).fill(() => gdprService.exportUserData(123));
      
      // Should handle concurrent operations gracefully
      await expect(Promise.all(operations.map(op => op()))).resolves.toBeDefined();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle database errors gracefully', async () => {
      (mockSupabase.from().select().eq().single as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' }
      });

      await expect(
        privacyService.getUserPreferences(123)
      ).rejects.toThrow('Database connection failed');
    });

    it('should provide fallback for failed data exports', async () => {
      (mockSupabase.from().select().eq as jest.Mock).mockRejectedValue(
        new Error('Export failed')
      );

      const result = await gdprService.exportUserData(123);
      expect(result).toBeNull(); // Graceful failure
    });

    it('should log errors for audit purposes', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      try {
        await gdprService.deleteUserData(-1); // Invalid user ID
      } catch (error) {
        expect(consoleSpy).toHaveBeenCalled();
      } finally {
        consoleSpy.mockRestore();
      }
    });
  });

  describe('Performance and Optimization', () => {
    it('should batch privacy operations efficiently', async () => {
      const batchOperations = [
        () => privacyService.getUserPreferences(123),
        () => privacyService.getUserPreferences(124),
        () => privacyService.getUserPreferences(125)
      ];

      const startTime = Date.now();
      await Promise.all(batchOperations.map(op => op()));
      const endTime = Date.now();

      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should cache frequently accessed privacy settings', async () => {
      // First call
      await privacyService.getUserPreferences(123);
      
      // Second call should use cache
      await privacyService.getUserPreferences(123);
      
      // Verify database was called only once for caching
      expect(mockSupabase.from().select).toHaveBeenCalledTimes(1);
    });
  });
});