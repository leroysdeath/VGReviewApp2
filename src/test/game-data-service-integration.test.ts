import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { GameDataServiceV2 } from '../services/gameDataServiceV2';

describe('GameDataService V2 - Integration Tests', () => {
  let service: GameDataServiceV2;
  
  beforeEach(() => {
    service = new GameDataServiceV2();
    // Mock console methods to reduce test noise
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });
  
  describe('Basic Functionality', () => {
    it('should create service instance', () => {
      expect(service).toBeInstanceOf(GameDataServiceV2);
    });
    
    it('should have testEnhancedSearch method', () => {
      expect(typeof service.testEnhancedSearch).toBe('function');
    });
    
    it('should handle empty search queries', async () => {
      const results = await service.searchGames('');
      expect(results).toEqual([]);
    });
    
    it('should handle very short search queries', async () => {
      const results = await service.searchGames('a');
      expect(Array.isArray(results)).toBe(true);
    });
  });
  
  describe('Search Integration', () => {
    it('should perform enhanced search with IGDB integration', async () => {
      // This test uses real API calls through the Netlify function
      const testResult = await service.testEnhancedSearch('mario');
      
      expect(testResult).toHaveProperty('dbResults');
      expect(testResult).toHaveProperty('igdbUsed');
      expect(testResult).toHaveProperty('totalResults');
      expect(testResult).toHaveProperty('timeTaken');
      
      expect(typeof testResult.dbResults).toBe('number');
      expect(typeof testResult.igdbUsed).toBe('boolean');
      expect(typeof testResult.totalResults).toBe('number');
      expect(typeof testResult.timeTaken).toBe('number');
      
      expect(testResult.timeTaken).toBeGreaterThan(0);
    }, 30000); // Long timeout for real API call
    
    it('should handle franchise searches', async () => {
      const testResult = await service.testEnhancedSearch('zelda');
      
      expect(testResult.totalResults).toBeGreaterThan(0);
      expect(testResult.timeTaken).toBeGreaterThan(0);
    }, 30000);
    
    it('should handle specific game searches', async () => {
      const testResult = await service.testEnhancedSearch('super mario 64');
      
      expect(testResult.totalResults).toBeGreaterThan(0);
      expect(testResult.timeTaken).toBeGreaterThan(0);
    }, 30000);
  });
  
  describe('Search Quality', () => {
    it('should return reasonable results for popular franchises', async () => {
      const results = await service.searchGames('pokemon');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThan(100); // Reasonable upper bound
      
      // Check that results have required fields
      if (results.length > 0) {
        const firstResult = results[0];
        expect(firstResult).toHaveProperty('name');
        expect(firstResult).toHaveProperty('id');
        expect(typeof firstResult.name).toBe('string');
        expect(typeof firstResult.id).toBe('number');
      }
    }, 30000);
    
    it('should handle unknown search terms gracefully', async () => {
      const results = await service.searchGames('xyznonexistentgame123');
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeLessThan(10); // Should not return many irrelevant results
    }, 30000);
  });
  
  describe('Performance', () => {
    it('should complete searches within reasonable time', async () => {
      const startTime = Date.now();
      await service.searchGames('mario');
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    }, 15000);
  });
});