/**
 * Comprehensive Privacy Service Tests
 * Tests core privacy functionality to prevent regressions during backend refinements
 */

import { privacyService, TrackingLevel, ConsentUpdate } from '../services/privacyService';

// Mock Supabase
const mockSupabase = {
  from: jest.fn(),
  rpc: jest.fn(),
};

jest.mock('../services/supabase', () => ({
  supabase: mockSupabase
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock crypto for session hashing with realistic hashing
Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      digest: jest.fn(async (algorithm, data) => {
        // Create a simple hash based on the input data
        const text = new TextDecoder().decode(data);
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
          const char = text.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash; // Convert to 32bit integer
        }
        // Return a buffer with the hash repeated to fill 32 bytes
        const buffer = new ArrayBuffer(32);
        const view = new Uint8Array(buffer);
        for (let i = 0; i < 32; i++) {
          view[i] = (hash >> (i % 4) * 8) & 0xff;
        }
        return buffer;
      })
    }
  }
});

describe('Privacy Service - Comprehensive Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();

    // Initialize session by creating a new instance effect
    const sessionKey = 'gamevault_session_id';
    if (!localStorageMock.getItem(sessionKey)) {
      localStorageMock.setItem(sessionKey, `${Date.now()}-test123`);
    }

    // Default mock implementations
    mockSupabase.from.mockReturnValue({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: { code: 'PGRST116' } }))
        }))
      })),
      insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
      upsert: jest.fn(() => Promise.resolve({ data: null, error: null }))
    });
  });

  describe('Session Management', () => {
    test('should initialize session on first load', () => {
      const sessionId = localStorageMock.getItem('gamevault_session_id');
      expect(sessionId).toBeTruthy();
      expect(typeof sessionId).toBe('string');
    });

    test('should maintain same session across multiple calls', async () => {
      const hash1 = await privacyService.getCurrentSessionHash();
      const hash2 = await privacyService.getCurrentSessionHash();
      expect(hash1).toBe(hash2);
    });

    test('should generate new session after clearing data', async () => {
      const hash1 = await privacyService.getCurrentSessionHash();
      privacyService.clearLocalData();
      const hash2 = await privacyService.getCurrentSessionHash();
      expect(hash1).not.toBe(hash2);
    });

    test('should hash session IDs consistently', async () => {
      const sessionId = 'test-session-123';
      const hash1 = await privacyService.hashSessionId(sessionId);
      const hash2 = await privacyService.hashSessionId(sessionId);
      expect(hash1).toBe(hash2);
    });
  });

  describe('Consent Banner Management', () => {
    test('should show banner when no consent exists', () => {
      localStorageMock.clear();
      expect(privacyService.shouldShowConsentBanner()).toBe(true);
    });

    test('should not show banner after consent given', () => {
      localStorageMock.setItem('gamevault_consent_shown', 'true');
      localStorageMock.setItem('gamevault_privacy_consent', JSON.stringify({
        analyticsOptedIn: true,
        trackingLevel: 'anonymous'
      }));
      expect(privacyService.shouldShowConsentBanner()).toBe(false);
    });

    test('should mark banner as shown', () => {
      privacyService.markConsentBannerShown();
      expect(localStorageMock.getItem('gamevault_consent_shown')).toBe('true');
    });
  });

  describe('Local Consent Storage', () => {
    test('should return null when no local consent exists', () => {
      localStorageMock.clear();
      const consent = privacyService.getLocalConsent();
      expect(consent).toBeNull();
    });

    test('should retrieve stored local consent', () => {
      localStorageMock.setItem('gamevault_privacy_consent', JSON.stringify({
        analyticsOptedIn: true,
        trackingLevel: 'full',
        timestamp: new Date().toISOString()
      }));

      const consent = privacyService.getLocalConsent();
      expect(consent).toEqual({
        analyticsOptedIn: true,
        trackingLevel: 'full'
      });
    });

    test('should handle corrupted local consent gracefully', () => {
      localStorageMock.setItem('gamevault_privacy_consent', 'invalid-json{');
      const consent = privacyService.getLocalConsent();
      expect(consent).toBeNull();
    });

    test('should default to anonymous tracking level', () => {
      localStorageMock.setItem('gamevault_privacy_consent', JSON.stringify({
        analyticsOptedIn: true
      }));

      const consent = privacyService.getLocalConsent();
      expect(consent?.trackingLevel).toBe('anonymous');
    });
  });

  describe('Consent Saving', () => {
    test('should save consent to localStorage', async () => {
      const consentUpdate: ConsentUpdate = {
        analyticsOptedIn: true,
        trackingLevel: 'anonymous'
      };

      const result = await privacyService.saveConsent(consentUpdate);

      expect(result.success).toBe(true);
      const stored = localStorageMock.getItem('gamevault_privacy_consent');
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      expect(parsed.analyticsOptedIn).toBe(true);
      expect(parsed.trackingLevel).toBe('anonymous');
    });

    test('should save consent to database when userId provided', async () => {
      const mockUpsert = jest.fn(() => Promise.resolve({ data: null, error: null }));
      const mockInsert = jest.fn(() => Promise.resolve({ data: null, error: null }));

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'user_preferences') {
          return { upsert: mockUpsert };
        }
        if (table === 'privacy_audit_log') {
          return { insert: mockInsert };
        }
        return { upsert: mockUpsert, insert: mockInsert };
      });

      const result = await privacyService.saveConsent({
        analyticsOptedIn: true,
        trackingLevel: 'full',
        ipCountry: 'US'
      }, 123);

      expect(result.success).toBe(true);
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 123,
          analytics_opted_in: true,
          tracking_level: 'full',
          consent_ip_country: 'US'
        }),
        { onConflict: 'user_id' }
      );
    });

    test('should handle database errors gracefully', async () => {
      mockSupabase.from.mockImplementation(() => ({
        upsert: jest.fn(() => Promise.resolve({
          data: null,
          error: { message: 'Database error' }
        })),
        insert: jest.fn(() => Promise.resolve({ data: null, error: null }))
      }));

      const result = await privacyService.saveConsent({
        analyticsOptedIn: true,
        trackingLevel: 'full'
      }, 123);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });

    test('should save all tracking levels correctly', async () => {
      const levels: TrackingLevel[] = ['none', 'anonymous', 'full'];

      for (const level of levels) {
        await privacyService.saveConsent({
          analyticsOptedIn: level !== 'none',
          trackingLevel: level
        });

        const consent = privacyService.getLocalConsent();
        expect(consent?.trackingLevel).toBe(level);
      }
    });
  });

  describe('Consent Withdrawal', () => {
    test('should set tracking to none when withdrawing consent', async () => {
      const result = await privacyService.withdrawConsent();

      expect(result.success).toBe(true);
      const consent = privacyService.getLocalConsent();
      expect(consent?.analyticsOptedIn).toBe(false);
      expect(consent?.trackingLevel).toBe('none');
    });

    test('should withdraw consent in database when userId provided', async () => {
      const mockUpsert = jest.fn(() => Promise.resolve({ data: null, error: null }));
      const mockInsert = jest.fn(() => Promise.resolve({ data: null, error: null }));

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'user_preferences') {
          return { upsert: mockUpsert };
        }
        if (table === 'privacy_audit_log') {
          return { insert: mockInsert };
        }
        return { upsert: mockUpsert, insert: mockInsert };
      });

      await privacyService.withdrawConsent(123);

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          analytics_opted_in: false,
          tracking_level: 'none'
        }),
        { onConflict: 'user_id' }
      );
    });
  });

  describe('Tracking Consent Checks', () => {
    test('should return false when no consent given', async () => {
      localStorageMock.clear();
      const hasConsent = await privacyService.hasTrackingConsent();
      expect(hasConsent).toBe(false);
    });

    test('should return true when consent given locally', async () => {
      localStorageMock.setItem('gamevault_privacy_consent', JSON.stringify({
        analyticsOptedIn: true,
        trackingLevel: 'anonymous'
      }));

      const hasConsent = await privacyService.hasTrackingConsent();
      expect(hasConsent).toBe(true);
    });

    test('should return false when consent withdrawn', async () => {
      localStorageMock.setItem('gamevault_privacy_consent', JSON.stringify({
        analyticsOptedIn: false,
        trackingLevel: 'none'
      }));

      const hasConsent = await privacyService.hasTrackingConsent();
      expect(hasConsent).toBe(false);
    });

    test('should check database when userId provided and no local consent', async () => {
      localStorageMock.removeItem('gamevault_privacy_consent');

      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: { analytics_opted_in: true },
              error: null
            }))
          }))
        }))
      }));

      const hasConsent = await privacyService.hasTrackingConsent(123);
      expect(hasConsent).toBe(true);
    });
  });

  describe('Tracking Level Management', () => {
    test('should return anonymous as default tracking level', async () => {
      localStorageMock.clear();
      const level = await privacyService.getTrackingLevel();
      expect(level).toBe('anonymous');
    });

    test('should return correct tracking level from local storage', async () => {
      localStorageMock.setItem('gamevault_privacy_consent', JSON.stringify({
        analyticsOptedIn: true,
        trackingLevel: 'full'
      }));

      const level = await privacyService.getTrackingLevel();
      expect(level).toBe('full');
    });

    test('should fetch tracking level from database when no local consent', async () => {
      localStorageMock.removeItem('gamevault_privacy_consent');

      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: { tracking_level: 'full' },
              error: null
            }))
          }))
        }))
      }));

      const level = await privacyService.getTrackingLevel(123);
      expect(level).toBe('full');
    });
  });

  describe('Tracking Permission Check', () => {
    test('should deny tracking when no consent', async () => {
      localStorageMock.clear();
      const result = await privacyService.shouldTrack();

      expect(result.allowed).toBe(false);
      expect(result.level).toBe('anonymous');
    });

    test('should allow tracking with anonymous level', async () => {
      localStorageMock.setItem('gamevault_privacy_consent', JSON.stringify({
        analyticsOptedIn: true,
        trackingLevel: 'anonymous'
      }));

      const result = await privacyService.shouldTrack();

      expect(result.allowed).toBe(true);
      expect(result.level).toBe('anonymous');
      expect(result.sessionHash).toBeTruthy();
    });

    test('should allow tracking with full level', async () => {
      localStorageMock.setItem('gamevault_privacy_consent', JSON.stringify({
        analyticsOptedIn: true,
        trackingLevel: 'full'
      }));

      const result = await privacyService.shouldTrack();

      expect(result.allowed).toBe(true);
      expect(result.level).toBe('full');
    });

    test('should deny tracking with none level', async () => {
      localStorageMock.setItem('gamevault_privacy_consent', JSON.stringify({
        analyticsOptedIn: false,
        trackingLevel: 'none'
      }));

      const result = await privacyService.shouldTrack();

      expect(result.allowed).toBe(false);
      expect(result.level).toBe('none');
    });

    test('should include session hash in result', async () => {
      localStorageMock.setItem('gamevault_privacy_consent', JSON.stringify({
        analyticsOptedIn: true,
        trackingLevel: 'full'
      }));

      const result = await privacyService.shouldTrack();

      expect(result.sessionHash).toBeTruthy();
      expect(typeof result.sessionHash).toBe('string');
    });
  });

  describe('User Preferences Database Operations', () => {
    test('should fetch user preferences from database', async () => {
      const mockPrefs = {
        user_id: 123,
        analytics_opted_in: true,
        tracking_level: 'full',
        consent_date: '2024-01-01T00:00:00Z'
      };

      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ data: mockPrefs, error: null }))
          }))
        }))
      }));

      const prefs = await privacyService.getUserPreferences(123);

      expect(prefs).toEqual(mockPrefs);
    });

    test('should return null when no preferences exist', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: null,
              error: { code: 'PGRST116' }
            }))
          }))
        }))
      });

      const prefs = await privacyService.getUserPreferences(123);
      expect(prefs).toBeNull();
    });

    test('should handle database errors gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: null,
              error: { code: 'ERROR', message: 'Database error' }
            }))
          }))
        }))
      });

      const prefs = await privacyService.getUserPreferences(123);
      expect(prefs).toBeNull();
    });
  });

  describe('Consent Synchronization', () => {
    test('should sync database preferences to local storage', async () => {
      const mockPrefs = {
        user_id: 123,
        analytics_opted_in: true,
        tracking_level: 'full' as TrackingLevel,
        consent_date: '2024-01-01T00:00:00Z'
      };

      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ data: mockPrefs, error: null }))
          }))
        }))
      }));

      await privacyService.syncConsentWithDatabase(123);

      const localConsent = privacyService.getLocalConsent();
      expect(localConsent?.analyticsOptedIn).toBe(true);
      expect(localConsent?.trackingLevel).toBe('full');
    });

    test('should save local consent to database when no database preferences exist', async () => {
      localStorageMock.setItem('gamevault_privacy_consent', JSON.stringify({
        analyticsOptedIn: true,
        trackingLevel: 'anonymous',
        timestamp: new Date().toISOString()
      }));

      const mockUpsert = jest.fn(() => Promise.resolve({ data: null, error: null }));
      const mockInsert = jest.fn(() => Promise.resolve({ data: null, error: null }));

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'user_preferences') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => Promise.resolve({
                  data: null,
                  error: { code: 'PGRST116' }
                }))
              }))
            })),
            upsert: mockUpsert
          };
        }
        if (table === 'privacy_audit_log') {
          return { insert: mockInsert };
        }
        return {
          upsert: mockUpsert,
          insert: mockInsert
        };
      });

      await privacyService.syncConsentWithDatabase(123);

      expect(mockUpsert).toHaveBeenCalled();
    });
  });

  describe('Data Clearing', () => {
    test('should clear all local privacy data', () => {
      localStorageMock.setItem('gamevault_privacy_consent', 'test');
      localStorageMock.setItem('gamevault_session_id', 'test');
      localStorageMock.setItem('gamevault_consent_shown', 'test');

      privacyService.clearLocalData();

      expect(localStorageMock.getItem('gamevault_privacy_consent')).toBeNull();
      expect(localStorageMock.getItem('gamevault_consent_shown')).toBeNull();
      // Session should be regenerated
      expect(localStorageMock.getItem('gamevault_session_id')).toBeTruthy();
    });

    test('should generate new session after clearing', async () => {
      const hash1 = await privacyService.getCurrentSessionHash();
      privacyService.clearLocalData();
      const hash2 = await privacyService.getCurrentSessionHash();

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Privacy Audit Logging', () => {
    test('should log privacy actions to database', async () => {
      const mockInsert = jest.fn(() => Promise.resolve({ data: null, error: null }));

      mockSupabase.from.mockImplementation(() => ({
        insert: mockInsert
      }));

      await privacyService.logPrivacyAction(
        123,
        'consent_given',
        { tracking_level: 'full' },
        'US'
      );

      expect(mockInsert).toHaveBeenCalledWith({
        user_id: 123,
        action: 'consent_given',
        details: { tracking_level: 'full' },
        ip_country: 'US'
      });
    });

    test('should handle audit logging errors gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        insert: jest.fn(() => Promise.reject(new Error('Database error')))
      });

      // Should not throw
      await expect(
        privacyService.logPrivacyAction(123, 'consent_given')
      ).resolves.not.toThrow();
    });
  });

  describe('Privacy Statistics', () => {
    test('should fetch privacy statistics', async () => {
      const mockData = [
        { analytics_opted_in: true, tracking_level: 'full' },
        { analytics_opted_in: true, tracking_level: 'anonymous' },
        { analytics_opted_in: false, tracking_level: 'none' },
        { analytics_opted_in: true, tracking_level: 'anonymous' }
      ];

      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn(() => Promise.resolve({ data: mockData, error: null }))
      }));

      const stats = await privacyService.getPrivacyStats();

      expect(stats.totalUsers).toBe(4);
      expect(stats.optedIn).toBe(3);
      expect(stats.optedOut).toBe(1);
      expect(stats.anonymousOnly).toBe(2);
    });

    test('should handle empty statistics', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => Promise.resolve({ data: [], error: null }))
      });

      const stats = await privacyService.getPrivacyStats();

      expect(stats.totalUsers).toBe(0);
      expect(stats.optedIn).toBe(0);
      expect(stats.optedOut).toBe(0);
      expect(stats.anonymousOnly).toBe(0);
    });

    test('should handle statistics errors gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => Promise.resolve({
          data: null,
          error: { message: 'Database error' }
        }))
      });

      const stats = await privacyService.getPrivacyStats();

      expect(stats.totalUsers).toBe(0);
    });
  });

  describe('User Country Detection', () => {
    test('should fetch user country from IP API', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve('US')
        })
      ) as jest.Mock;

      const country = await privacyService.getUserCountry();
      expect(country).toBe('US');
    });

    test('should handle IP API failures gracefully', async () => {
      global.fetch = jest.fn(() =>
        Promise.reject(new Error('Network error'))
      ) as jest.Mock;

      const country = await privacyService.getUserCountry();
      expect(country).toBeNull();
    });

    test('should handle non-OK responses', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500
        })
      ) as jest.Mock;

      const country = await privacyService.getUserCountry();
      expect(country).toBeNull();
    });
  });

  describe('Integration Scenarios', () => {
    test('should handle complete consent flow', async () => {
      // 1. Check if banner should show (should be true initially)
      expect(privacyService.shouldShowConsentBanner()).toBe(true);

      // 2. User accepts consent
      const result = await privacyService.saveConsent({
        analyticsOptedIn: true,
        trackingLevel: 'anonymous',
        ipCountry: 'US'
      });
      expect(result.success).toBe(true);

      // 3. Mark banner as shown
      privacyService.markConsentBannerShown();

      // 4. Check consent state
      const hasConsent = await privacyService.hasTrackingConsent();
      expect(hasConsent).toBe(true);

      // 5. Verify tracking is allowed
      const shouldTrack = await privacyService.shouldTrack();
      expect(shouldTrack.allowed).toBe(true);
      expect(shouldTrack.level).toBe('anonymous');
    });

    test('should handle consent withdrawal flow', async () => {
      // 1. Give consent first
      await privacyService.saveConsent({
        analyticsOptedIn: true,
        trackingLevel: 'full'
      });

      expect(await privacyService.hasTrackingConsent()).toBe(true);

      // 2. Withdraw consent
      const result = await privacyService.withdrawConsent();
      expect(result.success).toBe(true);

      // 3. Verify consent is withdrawn
      expect(await privacyService.hasTrackingConsent()).toBe(false);

      const shouldTrack = await privacyService.shouldTrack();
      expect(shouldTrack.allowed).toBe(false);
      expect(shouldTrack.level).toBe('none');
    });

    test('should handle tracking level changes', async () => {
      // Start with anonymous
      await privacyService.saveConsent({
        analyticsOptedIn: true,
        trackingLevel: 'anonymous'
      });

      expect(await privacyService.getTrackingLevel()).toBe('anonymous');

      // Upgrade to full
      await privacyService.saveConsent({
        analyticsOptedIn: true,
        trackingLevel: 'full'
      });

      expect(await privacyService.getTrackingLevel()).toBe('full');

      // Downgrade to anonymous
      await privacyService.saveConsent({
        analyticsOptedIn: true,
        trackingLevel: 'anonymous'
      });

      expect(await privacyService.getTrackingLevel()).toBe('anonymous');
    });
  });
});
