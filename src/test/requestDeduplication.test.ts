/**
 * Unit tests for Request Deduplication
 */

import {
  deduplicateRequest,
  generateCacheKey,
  clearPendingRequests,
  getDeduplicationStats,
  resetDeduplicationStats,
  getPendingRequestCount,
  isRequestPending,
  createDeduplicationWrapper,
  invalidateCache,
  invalidateCacheMultiple
} from '../utils/requestDeduplication';

describe('Request Deduplication', () => {
  beforeEach(() => {
    clearPendingRequests();
    resetDeduplicationStats();
  });

  describe('deduplicateRequest', () => {
    it('should execute request only once for concurrent calls', async () => {
      let callCount = 0;
      const mockRequest = () => {
        callCount++;
        return Promise.resolve({ data: 'test', count: callCount });
      };

      // Make 5 concurrent requests with same key
      const promises = Array.from({ length: 5 }, () =>
        deduplicateRequest('test-key', mockRequest)
      );

      const results = await Promise.all(promises);

      // Should only call the function once
      expect(callCount).toBe(1);

      // All promises should resolve to the same result
      results.forEach(result => {
        expect(result).toEqual({ data: 'test', count: 1 });
      });
    });

    it('should execute separate requests for different keys', async () => {
      let callCount = 0;
      const mockRequest = () => {
        callCount++;
        return Promise.resolve({ count: callCount });
      };

      const result1 = await deduplicateRequest('key-1', mockRequest);
      const result2 = await deduplicateRequest('key-2', mockRequest);

      expect(callCount).toBe(2);
      expect(result1.count).toBe(1);
      expect(result2.count).toBe(2);
    });

    it('should allow new requests after previous completes', async () => {
      let callCount = 0;
      const mockRequest = () => {
        callCount++;
        return Promise.resolve({ count: callCount });
      };

      const result1 = await deduplicateRequest('test-key', mockRequest);
      const result2 = await deduplicateRequest('test-key', mockRequest);

      expect(callCount).toBe(2);
      expect(result1.count).toBe(1);
      expect(result2.count).toBe(2);
    });

    it('should handle rejected promises correctly', async () => {
      let callCount = 0;
      const mockRequest = () => {
        callCount++;
        return Promise.reject(new Error('Test error'));
      };

      const promises = Array.from({ length: 3 }, () =>
        deduplicateRequest('error-key', mockRequest).catch(err => err)
      );

      const results = await Promise.all(promises);

      // Should only call once even on error
      expect(callCount).toBe(1);

      // All should receive the same error
      results.forEach(result => {
        expect(result).toBeInstanceOf(Error);
        expect(result.message).toBe('Test error');
      });
    });

    it('should clean up pending requests after completion', async () => {
      const mockRequest = () => Promise.resolve('test');

      expect(getPendingRequestCount()).toBe(0);

      const promise = deduplicateRequest('test-key', mockRequest);
      expect(getPendingRequestCount()).toBe(1);

      await promise;
      expect(getPendingRequestCount()).toBe(0);
    });

    it('should clean up pending requests after error', async () => {
      const mockRequest = () => Promise.reject(new Error('fail'));

      expect(getPendingRequestCount()).toBe(0);

      const promise = deduplicateRequest('error-key', mockRequest).catch(() => {});
      expect(getPendingRequestCount()).toBe(1);

      await promise;
      expect(getPendingRequestCount()).toBe(0);
    });
  });

  describe('generateCacheKey', () => {
    it('should generate consistent keys from multiple parameters', () => {
      const key1 = generateCacheKey('service', 'method', 123, 'param');
      const key2 = generateCacheKey('service', 'method', 123, 'param');

      expect(key1).toBe(key2);
      expect(key1).toBe('service:method:123:param');
    });

    it('should handle different parameter types', () => {
      const key = generateCacheKey('service', 'method', 123, true, 'string');
      expect(key).toBe('service:method:123:true:string');
    });

    it('should filter out undefined and null values', () => {
      const key = generateCacheKey('service', 'method', undefined, 123, null, 'value');
      expect(key).toBe('service:method:123:value');
    });

    it('should generate different keys for different parameters', () => {
      const key1 = generateCacheKey('service', 'method', 1);
      const key2 = generateCacheKey('service', 'method', 2);

      expect(key1).not.toBe(key2);
    });
  });

  describe('Statistics', () => {
    it('should track deduplication stats correctly', async () => {
      const mockRequest = () => Promise.resolve('test');

      // Make 10 requests, 5 with key-1, 5 with key-2
      const promises = [
        ...Array.from({ length: 5 }, () => deduplicateRequest('key-1', mockRequest)),
        ...Array.from({ length: 5 }, () => deduplicateRequest('key-2', mockRequest))
      ];

      await Promise.all(promises);

      const stats = getDeduplicationStats();

      expect(stats.totalRequests).toBe(10);
      expect(stats.uniqueRequests).toBe(2); // Only 2 unique keys
      expect(stats.deduplicatedRequests).toBe(8); // 8 deduplicated (4 + 4)
      expect(stats.savingsRate).toBeCloseTo(80, 1); // 80% savings
    });

    it('should track cache hits per key', async () => {
      const mockRequest = () => Promise.resolve('test');

      // 3 requests for key-1, 2 requests for key-2
      await Promise.all([
        deduplicateRequest('key-1', mockRequest),
        deduplicateRequest('key-1', mockRequest),
        deduplicateRequest('key-1', mockRequest),
        deduplicateRequest('key-2', mockRequest),
        deduplicateRequest('key-2', mockRequest)
      ]);

      const stats = getDeduplicationStats();

      expect(stats.cacheHits['key-1']).toBe(2); // First call isn't a "hit"
      expect(stats.cacheHits['key-2']).toBe(1);
    });

    it('should reset stats correctly', async () => {
      const mockRequest = () => Promise.resolve('test');

      await Promise.all([
        deduplicateRequest('key-1', mockRequest),
        deduplicateRequest('key-1', mockRequest)
      ]);

      let stats = getDeduplicationStats();
      expect(stats.totalRequests).toBe(2);

      resetDeduplicationStats();

      stats = getDeduplicationStats();
      expect(stats.totalRequests).toBe(0);
      expect(stats.uniqueRequests).toBe(0);
      expect(stats.deduplicatedRequests).toBe(0);
      expect(Object.keys(stats.cacheHits)).toHaveLength(0);
    });
  });

  describe('Utility Functions', () => {
    it('should detect pending requests', async () => {
      let resolveRequest: () => void;
      const mockRequest = () => new Promise<void>(resolve => {
        resolveRequest = resolve;
      });

      expect(isRequestPending('test-key')).toBe(false);

      const promise = deduplicateRequest('test-key', mockRequest);
      expect(isRequestPending('test-key')).toBe(true);

      resolveRequest!();
      await promise;

      expect(isRequestPending('test-key')).toBe(false);
    });

    it('should clear all pending requests', async () => {
      let resolveRequest: () => void;
      const mockRequest = () => new Promise<void>(resolve => {
        resolveRequest = resolve;
      });

      deduplicateRequest('key-1', mockRequest);
      deduplicateRequest('key-2', mockRequest);

      expect(getPendingRequestCount()).toBe(2);

      clearPendingRequests();

      expect(getPendingRequestCount()).toBe(0);
      expect(isRequestPending('key-1')).toBe(false);
      expect(isRequestPending('key-2')).toBe(false);
    });
  });

  describe('createDeduplicationWrapper', () => {
    it('should create a wrapper function that deduplicates requests', async () => {
      const dedupe = createDeduplicationWrapper('TestService');
      let callCount = 0;

      const mockRequest = () => {
        callCount++;
        return Promise.resolve({ count: callCount });
      };

      // Make concurrent calls with same params
      const promises = Array.from({ length: 3 }, () =>
        dedupe('getItem', { id: 1 }, mockRequest)
      );

      const results = await Promise.all(promises);

      expect(callCount).toBe(1);
      results.forEach(result => {
        expect(result.count).toBe(1);
      });
    });

    it('should deduplicate based on service, method, and params', async () => {
      const dedupe = createDeduplicationWrapper('TestService');
      let callCount = 0;

      const mockRequest = () => {
        callCount++;
        return Promise.resolve({ count: callCount });
      };

      // Different params should not deduplicate
      const result1 = await dedupe('getItem', { id: 1 }, mockRequest);
      const result2 = await dedupe('getItem', { id: 2 }, mockRequest);

      expect(callCount).toBe(2);
      expect(result1.count).toBe(1);
      expect(result2.count).toBe(2);
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate exact cache key', async () => {
      let resolveRequest: () => void;
      const mockRequest = () => new Promise<void>(resolve => {
        resolveRequest = resolve;
      });

      // Start a request
      const promise = deduplicateRequest('test-key', mockRequest);
      expect(isRequestPending('test-key')).toBe(true);

      // Invalidate it
      const invalidated = invalidateCache('test-key');
      expect(invalidated).toBe(1);
      expect(isRequestPending('test-key')).toBe(false);

      // Cleanup
      resolveRequest!();
      await promise.catch(() => {});
    });

    it('should invalidate cache by pattern with wildcards', async () => {
      let resolveRequests: (() => void)[] = [];
      const mockRequest = () => new Promise<void>(resolve => {
        resolveRequests.push(resolve);
      });

      // Start multiple requests with same prefix
      deduplicateRequest('service:method1:123', mockRequest);
      deduplicateRequest('service:method2:456', mockRequest);
      deduplicateRequest('other:method:789', mockRequest);

      expect(getPendingRequestCount()).toBe(3);

      // Invalidate all 'service:*' requests
      const invalidated = invalidateCache('service:*');
      expect(invalidated).toBe(2);
      expect(getPendingRequestCount()).toBe(1);
      expect(isRequestPending('other:method:789')).toBe(true);

      // Cleanup
      resolveRequests.forEach(resolve => resolve());
    });

    it('should invalidate multiple patterns at once', async () => {
      let resolveRequests: (() => void)[] = [];
      const mockRequest = () => new Promise<void>(resolve => {
        resolveRequests.push(resolve);
      });

      // Start requests across multiple services
      deduplicateRequest('gameService:getGame:1', mockRequest);
      deduplicateRequest('gameService:getGame:2', mockRequest);
      deduplicateRequest('reviewService:getReview:1', mockRequest);
      deduplicateRequest('collectionService:check:1', mockRequest);

      expect(getPendingRequestCount()).toBe(4);

      // Invalidate multiple patterns
      const invalidated = invalidateCacheMultiple([
        'gameService:*',
        'reviewService:*'
      ]);

      expect(invalidated).toBe(3);
      expect(getPendingRequestCount()).toBe(1);
      expect(isRequestPending('collectionService:check:1')).toBe(true);

      // Cleanup
      resolveRequests.forEach(resolve => resolve());
    });

    it('should not invalidate if pattern does not match', () => {
      let resolveRequest: () => void;
      const mockRequest = () => new Promise<void>(resolve => {
        resolveRequest = resolve;
      });

      deduplicateRequest('gameService:getGame:123', mockRequest);
      expect(getPendingRequestCount()).toBe(1);

      // Try to invalidate non-matching pattern
      const invalidated = invalidateCache('reviewService:*');
      expect(invalidated).toBe(0);
      expect(getPendingRequestCount()).toBe(1);

      // Cleanup
      resolveRequest!();
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle rapid sequential requests efficiently', async () => {
      let callCount = 0;
      const mockApiCall = (id: number) => {
        callCount++;
        return new Promise(resolve => {
          setTimeout(() => resolve({ id, data: `Game ${id}` }), 10);
        });
      };

      // Simulate 100 rapid requests for same game
      const promises = Array.from({ length: 100 }, () =>
        deduplicateRequest('game-123', () => mockApiCall(123))
      );

      const results = await Promise.all(promises);

      expect(callCount).toBe(1); // Only 1 API call made
      expect(results).toHaveLength(100); // All 100 requests got result
      results.forEach(result => {
        expect(result).toEqual({ id: 123, data: 'Game 123' });
      });

      const stats = getDeduplicationStats();
      expect(stats.savingsRate).toBeCloseTo(99, 0); // ~99% savings
    });

    it('should handle mixed concurrent and sequential requests', async () => {
      let callCount = 0;
      const mockApiCall = () => {
        callCount++;
        return Promise.resolve({ count: callCount });
      };

      // First batch - concurrent (should deduplicate)
      const batch1 = Array.from({ length: 5 }, () =>
        deduplicateRequest('test-key', mockApiCall)
      );
      await Promise.all(batch1);

      // Second batch - concurrent (should deduplicate)
      const batch2 = Array.from({ length: 5 }, () =>
        deduplicateRequest('test-key', mockApiCall)
      );
      await Promise.all(batch2);

      // Should have 2 actual calls (one per batch)
      expect(callCount).toBe(2);

      const stats = getDeduplicationStats();
      expect(stats.totalRequests).toBe(10);
      expect(stats.uniqueRequests).toBe(2);
      expect(stats.deduplicatedRequests).toBe(8);
    });

    it('should handle mutation invalidation pattern', async () => {
      let callCount = 0;
      const mockFetch = () => {
        callCount++;
        return Promise.resolve({ inCollection: callCount === 1 });
      };

      // Initial concurrent checks (should deduplicate)
      const checks1 = Array.from({ length: 5 }, () =>
        deduplicateRequest('collectionService:isInCollection:123', mockFetch)
      );
      const results1 = await Promise.all(checks1);

      expect(callCount).toBe(1);
      results1.forEach(result => expect(result.inCollection).toBe(true));

      // Simulate mutation (add to collection)
      invalidateCache('collectionService:*');

      // New concurrent checks (should make fresh call)
      const checks2 = Array.from({ length: 5 }, () =>
        deduplicateRequest('collectionService:isInCollection:123', mockFetch)
      );
      const results2 = await Promise.all(checks2);

      expect(callCount).toBe(2); // One more call after invalidation
      results2.forEach(result => expect(result.inCollection).toBe(false));
    });
  });
});
