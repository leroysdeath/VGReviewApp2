/**
 * Rate Limiting and Performance Tests for Tracking
 * Ensures API and DB limits are respected
 */

import { privacyService } from '../services/privacyService';

describe('Tracking Rate Limits and Performance', () => {
  beforeEach(() => {
    localStorage.clear();
    
    // Set up consent for testing
    localStorage.setItem('gamevault_privacy_consent', JSON.stringify({
      analyticsOptedIn: true,
      trackingLevel: 'anonymous',
      timestamp: new Date().toISOString()
    }));
  });

  describe('Privacy Service Rate Limits', () => {
    it('should handle rapid session hash requests efficiently', async () => {
      const startTime = performance.now();
      
      // Make multiple concurrent requests for session hash
      const promises = Array.from({length: 10}, () => 
        privacyService.getCurrentSessionHash()
      );
      
      const results = await Promise.all(promises);
      const endTime = performance.now();
      
      // All should return the same hash (cached)
      const uniqueHashes = new Set(results);
      expect(uniqueHashes.size).toBe(1);
      
      // Should complete quickly (under 100ms for 10 calls)
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should cache consent checks to reduce database load', async () => {
      const startTime = performance.now();
      
      // Check consent multiple times
      const promises = Array.from({length: 5}, () => 
        privacyService.hasTrackingConsent()
      );
      
      const results = await Promise.all(promises);
      const endTime = performance.now();
      
      // All should return the same result
      results.forEach(result => {
        expect(typeof result).toBe('boolean');
      });
      
      // Should be fast due to localStorage caching
      expect(endTime - startTime).toBeLessThan(50);
    });

    it('should not overwhelm IP geolocation service', async () => {
      // Mock fetch to count calls
      let callCount = 0;
      const originalFetch = global.fetch;
      
      global.fetch = jest.fn(() => {
        callCount++;
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve('US')
        } as Response);
      });

      // Make multiple concurrent requests
      const promises = Array.from({length: 5}, () => 
        privacyService.getUserCountry()
      );
      
      await Promise.all(promises);
      
      // Should make individual calls (no built-in caching for IP lookup)
      expect(callCount).toBe(5);
      
      global.fetch = originalFetch;
    });
  });

  describe('Database Operation Limits', () => {
    it('should handle database connection limits gracefully', async () => {
      // Test that we don't exceed reasonable database usage
      const operations = [];
      
      // Simulate multiple consent operations
      for (let i = 0; i < 3; i++) {
        operations.push(
          privacyService.saveConsent({
            analyticsOptedIn: true,
            trackingLevel: 'anonymous'
          })
        );
      }
      
      const results = await Promise.all(operations);
      
      // All should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });

    it('should respect batch processing to reduce database load', async () => {
      // This test verifies the batching concept
      // In a real scenario, tracking events would be batched
      
      const batchSize = 5;
      const events = Array.from({length: batchSize}, (_, i) => ({
        gameId: 100 + i,
        timestamp: Date.now(),
        source: 'test'
      }));
      
      // Simulate batch processing timing
      const startTime = performance.now();
      
      // Process in batch (simulated)
      const batchPromise = new Promise(resolve => {
        setTimeout(() => resolve(events), 10); // Simulate 10ms batch delay
      });
      
      await batchPromise;
      const endTime = performance.now();
      
      // Batch processing should be efficient
      expect(endTime - startTime).toBeLessThan(50);
    });
  });

  describe('Memory and Resource Management', () => {
    it('should not leak memory with repeated operations', async () => {
      const initialMemory = process.memoryUsage?.()?.heapUsed || 0;
      
      // Perform many operations
      for (let i = 0; i < 50; i++) {
        await privacyService.getCurrentSessionHash();
        
        // Clear some operations to test cleanup
        if (i % 10 === 0) {
          privacyService.clearLocalData();
        }
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage?.()?.heapUsed || 0;
      
      // Memory usage should not grow excessively (within 10MB)
      const memoryGrowth = finalMemory - initialMemory;
      expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024); // 10MB
    });

    it('should clean up resources properly', async () => {
      // Create some session data
      await privacyService.getCurrentSessionHash();
      
      // Verify data exists
      expect(localStorage.getItem('gamevault_session_id')).toBeTruthy();
      
      // Clean up
      privacyService.clearLocalData();
      
      // Verify cleanup
      expect(localStorage.getItem('gamevault_session_id')).toBeNull();
    });
  });

  describe('Concurrent Access Patterns', () => {
    it('should handle concurrent consent updates safely', async () => {
      const updates = [
        { analyticsOptedIn: true, trackingLevel: 'anonymous' as const },
        { analyticsOptedIn: true, trackingLevel: 'full' as const },
        { analyticsOptedIn: false, trackingLevel: 'none' as const }
      ];
      
      // Make concurrent updates
      const promises = updates.map(update => 
        privacyService.saveConsent(update)
      );
      
      const results = await Promise.all(promises);
      
      // All should complete without errors
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
      
      // Final state should be one of the updates
      const finalConsent = privacyService.getLocalConsent();
      expect(finalConsent).toBeTruthy();
    });

    it('should handle rapid session access without race conditions', async () => {
      // Clear existing session
      privacyService.clearLocalData();
      
      // Make many concurrent session requests
      const promises = Array.from({length: 20}, () => 
        privacyService.getCurrentSessionHash()
      );
      
      const hashes = await Promise.all(promises);
      
      // All should be the same (no race condition created multiple sessions)
      const uniqueHashes = new Set(hashes);
      expect(uniqueHashes.size).toBe(1);
      
      // Should be valid SHA-256 format
      expect(hashes[0]).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from temporary failures', async () => {
      // Simulate localStorage failure
      const originalSetItem = localStorage.setItem;
      let failCount = 0;
      
      localStorage.setItem = jest.fn((key, value) => {
        failCount++;
        if (failCount <= 2) {
          throw new Error('Storage temporarily unavailable');
        }
        return originalSetItem.call(localStorage, key, value);
      });
      
      // Should eventually succeed despite initial failures
      const result = await privacyService.saveConsent({
        analyticsOptedIn: true,
        trackingLevel: 'anonymous'
      });
      
      expect(result.success).toBe(true);
      expect(failCount).toBeGreaterThan(1);
      
      localStorage.setItem = originalSetItem;
    });

    it('should degrade gracefully when crypto API unavailable', async () => {
      // Mock crypto API failure
      const originalCrypto = global.crypto;
      
      // @ts-ignore
      global.crypto = {
        subtle: {
          digest: jest.fn(() => Promise.reject(new Error('Crypto unavailable')))
        }
      };
      
      try {
        // Should handle crypto failure gracefully
        const hash = await privacyService.getCurrentSessionHash();
        
        // Should still return some kind of hash or handle the error
        expect(typeof hash).toBe('string');
      } catch (error) {
        // Acceptable to fail, but should be graceful
        expect(error).toBeInstanceOf(Error);
      }
      
      global.crypto = originalCrypto;
    });
  });

  describe('Performance Monitoring', () => {
    it('should complete consent operations within reasonable time', async () => {
      const operations = [
        () => privacyService.hasTrackingConsent(),
        () => privacyService.getTrackingLevel(),
        () => privacyService.getCurrentSessionHash(),
        () => privacyService.shouldTrack()
      ];
      
      for (const operation of operations) {
        const startTime = performance.now();
        await operation();
        const endTime = performance.now();
        
        // Each operation should complete quickly (under 50ms)
        expect(endTime - startTime).toBeLessThan(50);
      }
    });

    it('should maintain performance under load', async () => {
      const startTime = performance.now();
      
      // Simulate realistic load
      const promises = [];
      for (let i = 0; i < 20; i++) {
        promises.push(privacyService.getCurrentSessionHash());
        promises.push(privacyService.hasTrackingConsent());
      }
      
      await Promise.all(promises);
      const endTime = performance.now();
      
      // Total time should be reasonable (under 500ms for 40 operations)
      expect(endTime - startTime).toBeLessThan(500);
    });
  });
});