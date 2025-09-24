/**
 * Unit tests for Privacy Service
 * Tests user consent management and GDPR compliance functions
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { privacyService, TrackingLevel } from '../services/privacyService';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

// Mock supabase
const supabaseMock = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn()
      }))
    })),
    upsert: jest.fn(),
    insert: jest.fn()
  }))
};

// Mock crypto.subtle for session hashing
const cryptoMock = {
  subtle: {
    digest: jest.fn(() => Promise.resolve(new ArrayBuffer(32)))
  }
};

describe('Privacy Service', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    });

    // Mock crypto
    Object.defineProperty(global, 'crypto', {
      value: cryptoMock,
      writable: true
    });

    // Reset service state
    privacyService.clearLocalData();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Session Management', () => {
    it('should generate and hash session IDs', async () => {
      // Mock crypto.subtle.digest to return a consistent hash
      const mockHash = new ArrayBuffer(32);
      const mockHashArray = new Uint8Array(mockHash);
      mockHashArray.fill(0xAB); // Fill with 0xAB for consistent hash
      cryptoMock.subtle.digest.mockResolvedValue(mockHash);

      const sessionHash = await privacyService.getCurrentSessionHash();
      
      expect(sessionHash).toBeDefined();
      expect(typeof sessionHash).toBe('string');
      expect(sessionHash.length).toBe(64); // SHA-256 produces 64 hex characters
      expect(cryptoMock.subtle.digest).toHaveBeenCalledWith('SHA-256', expect.any(Uint8Array));
    });

    it('should persist session ID across calls', async () => {
      localStorageMock.getItem.mockReturnValue('1234567890123-abcdefghi');

      const hash1 = await privacyService.getCurrentSessionHash();
      const hash2 = await privacyService.getCurrentSessionHash();

      expect(hash1).toBe(hash2);
      expect(localStorageMock.getItem).toHaveBeenCalledWith('gamevault_session_id');
    });
  });

  describe('Consent Management', () => {
    it('should show consent banner when no consent exists', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const shouldShow = privacyService.shouldShowConsentBanner();
      
      expect(shouldShow).toBe(true);
      expect(localStorageMock.getItem).toHaveBeenCalledWith('gamevault_consent_shown');
    });

    it('should not show consent banner when consent exists', () => {
      localStorageMock.getItem
        .mockReturnValueOnce('true') // consent_shown
        .mockReturnValueOnce('{"analyticsOptedIn":true}'); // consent data

      const shouldShow = privacyService.shouldShowConsentBanner();
      
      expect(shouldShow).toBe(false);
    });

    it('should save local consent', async () => {
      const consent = {
        analyticsOptedIn: true,
        trackingLevel: 'anonymous' as TrackingLevel
      };

      const result = await privacyService.saveConsent(consent);

      expect(result.success).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'gamevault_privacy_consent',
        expect.stringContaining('"analyticsOptedIn":true')
      );
    });

    it('should retrieve local consent', () => {
      const mockConsent = {
        analyticsOptedIn: true,
        trackingLevel: 'full',
        timestamp: new Date().toISOString()
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockConsent));

      const consent = privacyService.getLocalConsent();

      expect(consent).toEqual({
        analyticsOptedIn: true,
        trackingLevel: 'full'
      });
    });

    it('should handle malformed consent data gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid-json');

      const consent = privacyService.getLocalConsent();

      expect(consent).toBeNull();
    });
  });

  describe('Tracking Permissions', () => {
    it('should check tracking consent from local storage', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        analyticsOptedIn: true,
        trackingLevel: 'anonymous'
      }));

      const hasConsent = await privacyService.hasTrackingConsent();
      
      expect(hasConsent).toBe(true);
    });

    it('should return correct tracking level', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        analyticsOptedIn: true,
        trackingLevel: 'full'
      }));

      const level = await privacyService.getTrackingLevel();
      
      expect(level).toBe('full');
    });

    it('should default to anonymous when no consent exists', async () => {
      localStorageMock.getItem.mockReturnValue(null);

      const level = await privacyService.getTrackingLevel();
      
      expect(level).toBe('anonymous');
    });

    it('should determine if tracking should be allowed', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        analyticsOptedIn: true,
        trackingLevel: 'anonymous'
      }));

      const result = await privacyService.shouldTrack();

      expect(result.allowed).toBe(true);
      expect(result.level).toBe('anonymous');
      expect(result.sessionHash).toBeDefined();
    });

    it('should block tracking when consent is withdrawn', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        analyticsOptedIn: false,
        trackingLevel: 'none'
      }));

      const result = await privacyService.shouldTrack();

      expect(result.allowed).toBe(false);
      expect(result.level).toBe('none');
    });
  });

  describe('Data Management', () => {
    it('should clear all local privacy data', () => {
      privacyService.clearLocalData();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('gamevault_privacy_consent');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('gamevault_session_id');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('gamevault_consent_shown');
    });

    it('should mark consent banner as shown', () => {
      privacyService.markConsentBannerShown();

      expect(localStorageMock.setItem).toHaveBeenCalledWith('gamevault_consent_shown', 'true');
    });
  });

  describe('Country Detection', () => {
    it('should get user country from IP geolocation API', async () => {
      // Mock fetch
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve('US ')
        } as Response)
      );

      const country = await privacyService.getUserCountry();

      expect(country).toBe('US');
      expect(fetch).toHaveBeenCalledWith('https://ipapi.co/country/', {
        method: 'GET',
        headers: {
          'Accept': 'text/plain'
        }
      });
    });

    it('should handle API errors gracefully', async () => {
      global.fetch = jest.fn(() => Promise.reject(new Error('Network error')));

      const country = await privacyService.getUserCountry();

      expect(country).toBeNull();
    });
  });

  describe('Withdrawal Process', () => {
    it('should properly withdraw consent', async () => {
      const result = await privacyService.withdrawConsent();

      expect(result.success).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'gamevault_privacy_consent',
        expect.stringContaining('"analyticsOptedIn":false')
      );
    });
  });
});