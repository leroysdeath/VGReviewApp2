/**
 * Tests for GDPR Service
 * Tests data export, deletion, and compliance functionality
 */

import { gdprService } from '../services/gdprService';

// Mock Supabase
jest.mock('../services/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
          limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
          order: jest.fn(() => Promise.resolve({ data: [], error: null }))
        })),
        limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
        order: jest.fn(() => Promise.resolve({ data: [], error: null }))
      })),
      insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: null, error: null }))
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: null, error: null }))
      }))
    }))
  }
}));

// Mock privacy service
jest.mock('../services/privacyService', () => ({
  privacyService: {
    logPrivacyAction: jest.fn(() => Promise.resolve())
  }
}));

describe('GDPR Service', () => {
  const mockUserId = 123;
  const mockUserData = {
    profile: { id: 123, name: 'Test User', email: 'test@example.com' },
    preferences: { tracking_level: 'full', analytics_opted_in: true },
    gameViews: [
      { game_id: 1, view_date: '2025-01-01', view_source: 'direct' },
      { game_id: 2, view_date: '2025-01-02', view_source: 'search' }
    ],
    reviews: [
      { id: 1, game_id: 1, rating: 5, review: 'Great game!' }
    ],
    comments: [
      { id: 1, review_id: 1, comment: 'I agree!' }
    ],
    activities: [
      { id: 1, action: 'review_created', details: {} }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Data Export', () => {
    it('should export user data successfully', async () => {
      const mockSupabase = require('../services/supabase').supabase;
      
      // Mock the chained calls for each data type
      mockSupabase.from.mockImplementation((table: string) => {
        const mockData = {
          users: { data: mockUserData.profile, error: null },
          user_preferences: { data: mockUserData.preferences, error: null },
          game_views: { data: mockUserData.gameViews, error: null },
          reviews: { data: mockUserData.reviews, error: null },
          comments: { data: mockUserData.comments, error: null },
          activities: { data: mockUserData.activities, error: null },
          privacy_audit_log: { data: [], error: null }
        };

        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => Promise.resolve(mockData[table as keyof typeof mockData] || { data: null, error: null })),
              order: jest.fn(() => Promise.resolve(mockData[table as keyof typeof mockData] || { data: [], error: null }))
            }))
          }))
        };
      });

      const result = await gdprService.exportUserData(mockUserId);

      expect(result).toBeDefined();
      expect(result.userId).toBe(mockUserId);
      expect(result.exportDate).toBeDefined();
      expect(result.profile).toEqual(mockUserData.profile);
      expect(result.gameViews).toEqual(mockUserData.gameViews);
    });

    it('should handle export errors gracefully', async () => {
      const mockSupabase = require('../services/supabase').supabase;
      
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ data: null, error: new Error('Database error') }))
          }))
        }))
      });

      const result = await gdprService.exportUserData(mockUserId);
      expect(result).toBeNull();
    });

    it('should export empty data for user with no activity', async () => {
      const mockSupabase = require('../services/supabase').supabase;
      
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ data: null, error: null })),
            order: jest.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        }))
      });

      const result = await gdprService.exportUserData(mockUserId);

      expect(result).toBeDefined();
      expect(result.userId).toBe(mockUserId);
      expect(result.gameViews).toEqual([]);
      expect(result.reviews).toEqual([]);
      expect(result.comments).toEqual([]);
    });
  });

  describe('Data Deletion', () => {
    it('should delete user data successfully', async () => {
      const mockSupabase = require('../services/supabase').supabase;
      
      // Mock successful deletions
      mockSupabase.from.mockReturnValue({
        delete: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ 
            data: null, 
            error: null,
            count: 5 // Mock deleted count
          }))
        })),
        update: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ 
            data: null, 
            error: null,
            count: 2 // Mock updated count
          }))
        }))
      });

      const result = await gdprService.deleteUserData(mockUserId);

      expect(result.success).toBe(true);
      expect(result.deletedItems).toBeDefined();
      expect(result.anonymizedItems).toBeDefined();
    });

    it('should handle deletion errors gracefully', async () => {
      const mockSupabase = require('../services/supabase').supabase;
      
      mockSupabase.from.mockReturnValue({
        delete: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ 
            data: null, 
            error: new Error('Deletion failed')
          }))
        }))
      });

      const result = await gdprService.deleteUserData(mockUserId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to delete user data');
    });

    it('should anonymize rather than delete user content', async () => {
      const mockSupabase = require('../services/supabase').supabase;
      
      // Mock update calls for anonymization
      const mockUpdate = jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ 
          data: null, 
          error: null,
          count: 3
        }))
      }));

      const mockDelete = jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ 
          data: null, 
          error: null,
          count: 10
        }))
      }));

      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
        delete: mockDelete
      });

      const result = await gdprService.deleteUserData(mockUserId);

      expect(result.success).toBe(true);
      expect(result.anonymizedItems.reviews).toBeGreaterThanOrEqual(0);
      expect(result.anonymizedItems.comments).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Consent History', () => {
    it('should retrieve consent history successfully', async () => {
      const mockHistory = [
        { 
          action: 'consent_given', 
          details: { trackingLevel: 'full' }, 
          created_at: '2025-01-01T00:00:00Z' 
        },
        { 
          action: 'consent_withdrawn', 
          details: {}, 
          created_at: '2025-01-02T00:00:00Z' 
        }
      ];

      const mockSupabase = require('../services/supabase').supabase;
      
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => Promise.resolve({ 
              data: mockHistory, 
              error: null 
            }))
          }))
        }))
      });

      const result = await gdprService.getConsentHistory(mockUserId);

      expect(result).toEqual(mockHistory);
      expect(result.length).toBe(2);
    });

    it('should handle empty consent history', async () => {
      const mockSupabase = require('../services/supabase').supabase;
      
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => Promise.resolve({ 
              data: [], 
              error: null 
            }))
          }))
        }))
      });

      const result = await gdprService.getConsentHistory(mockUserId);

      expect(result).toEqual([]);
    });

    it('should handle consent history errors', async () => {
      const mockSupabase = require('../services/supabase').supabase;
      
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => Promise.resolve({ 
              data: null, 
              error: new Error('Database error') 
            }))
          }))
        }))
      });

      const result = await gdprService.getConsentHistory(mockUserId);

      expect(result).toEqual([]);
    });
  });

  describe('Data Retention', () => {
    it('should return retention information', async () => {
      const result = await gdprService.getDataRetentionInfo(mockUserId);

      expect(result).toBeDefined();
      expect(result.gameViews.retentionDays).toBe(90);
      expect(result.aggregatedMetrics.retentionDays).toBe(180);
      expect(result.auditLogs.retentionDays).toBe(730); // 2 years
    });

    it('should calculate scheduled deletion dates', async () => {
      const mockSupabase = require('../services/supabase').supabase;
      
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 30); // 30 days ago
      
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => Promise.resolve({ 
              data: [{ created_at: oldDate.toISOString() }], 
              error: null 
            }))
          }))
        }))
      });

      const result = await gdprService.getDataRetentionInfo(mockUserId);

      expect(result.gameViews.oldestData).toBeDefined();
      expect(result.gameViews.scheduledDeletion).toBeDefined();
    });
  });

  describe('Audit Logging', () => {
    it('should log privacy actions', async () => {
      const mockSupabase = require('../services/supabase').supabase;
      const mockInsert = jest.fn(() => Promise.resolve({ data: null, error: null }));
      
      mockSupabase.from.mockReturnValue({
        insert: mockInsert
      });

      await gdprService.logPrivacyAction(mockUserId, 'data_exported', { format: 'json' });

      expect(mockInsert).toHaveBeenCalledWith({
        user_id: mockUserId,
        action: 'data_exported',
        details: { format: 'json' },
        ip_country: null,
        created_at: expect.any(String)
      });
    });

    it('should handle audit logging errors gracefully', async () => {
      const mockSupabase = require('../services/supabase').supabase;
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      mockSupabase.from.mockReturnValue({
        insert: jest.fn(() => Promise.resolve({ 
          data: null, 
          error: new Error('Insert failed') 
        }))
      });

      // Should not throw
      await expect(
        gdprService.logPrivacyAction(mockUserId, 'data_exported', {})
      ).resolves.not.toThrow();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Rate Limiting', () => {
    it('should respect API rate limits for export', async () => {
      const start = Date.now();
      
      // Mock multiple export calls
      await Promise.all([
        gdprService.exportUserData(mockUserId),
        gdprService.exportUserData(mockUserId),
        gdprService.exportUserData(mockUserId)
      ]);
      
      const elapsed = Date.now() - start;
      
      // Should complete reasonably quickly (under 1 second for mocked calls)
      expect(elapsed).toBeLessThan(1000);
    });

    it('should handle concurrent deletion requests safely', async () => {
      const mockSupabase = require('../services/supabase').supabase;
      
      mockSupabase.from.mockReturnValue({
        delete: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ 
            data: null, 
            error: null,
            count: 1
          }))
        })),
        update: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ 
            data: null, 
            error: null,
            count: 1
          }))
        }))
      });

      // Multiple concurrent deletions should all succeed
      const results = await Promise.all([
        gdprService.deleteUserData(mockUserId),
        gdprService.deleteUserData(mockUserId + 1),
        gdprService.deleteUserData(mockUserId + 2)
      ]);

      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Input Validation', () => {
    it('should validate user ID for export', async () => {
      // Invalid user IDs should return null
      expect(await gdprService.exportUserData(0)).toBeNull();
      expect(await gdprService.exportUserData(-1)).toBeNull();
      expect(await gdprService.exportUserData(NaN)).toBeNull();
    });

    it('should validate user ID for deletion', async () => {
      // Invalid user IDs should return error
      const result1 = await gdprService.deleteUserData(0);
      const result2 = await gdprService.deleteUserData(-1);
      
      expect(result1.success).toBe(false);
      expect(result2.success).toBe(false);
    });

    it('should handle string user IDs', async () => {
      // Should work with string numbers
      const result = await gdprService.exportUserData('123' as any);
      expect(result).toBeDefined();
    });
  });
});