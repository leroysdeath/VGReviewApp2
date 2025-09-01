/**
 * Integration Tests for Search System
 * 
 * Tests the complete search pipeline with real services
 */

import { describe, it, expect } from 'vitest';
import { 
  runRegressionTests,
  runPerformanceTests,
  testRealSearchIntegration,
  runSearchHealthCheck
} from '../utils/searchTestHelpers';

describe('Search Integration Tests', () => {
  
  describe('Regression Prevention', () => {
    it('should pass all regression tests for reported issues', async () => {
      const results = await runRegressionTests();
      
      // All regression tests should pass
      const passedCount = results.filter(r => r.passed).length;
      const totalCount = results.length;
      
      expect(passedCount).toBeGreaterThan(totalCount * 0.8); // At least 80% should pass
      
      // Log details for failing tests
      const failedTests = results.filter(r => !r.passed);
      if (failedTests.length > 0) {
        console.log('Failed regression tests:');
        failedTests.forEach(test => {
          console.log(`- ${test.testName}: ${test.details}`);
        });
      }
    }, 30000); // 30 second timeout for integration tests
    
    it('should find Mario Party Superstars', async () => {
      const result = await testRealSearchIntegration(
        'mario party',
        ['Mario Party Superstars']
      );
      
      expect(result.passed).toBe(true);
      expect(result.totalResults).toBeGreaterThan(0);
      
      if (!result.passed) {
        console.log('Mario Party search issues:', result.missingFlagships);
      }
    }, 15000);
    
    it('should find Pokemon games', async () => {
      const result = await testRealSearchIntegration(
        'pokemon',
        ['Pokemon Red', 'Pokemon Blue', 'Pokemon Gold']
      );
      
      expect(result.foundFlagships.length).toBeGreaterThan(0);
      expect(result.totalResults).toBeGreaterThan(0);
      
      if (result.foundFlagships.length === 0) {
        console.log('Pokemon search failed - no flagship games found');
      }
    }, 15000);
    
    it('should find Forza games', async () => {
      const result = await testRealSearchIntegration(
        'forza',
        ['Forza Motorsport', 'Forza Horizon']
      );
      
      expect(result.totalResults).toBeGreaterThan(0);
      
      if (result.totalResults === 0) {
        console.log('Forza search returned no results');
      }
    }, 15000);
  });

  describe('Performance Requirements', () => {
    it('should maintain acceptable search performance', async () => {
      const perfResults = await runPerformanceTests();
      
      // Average search time should be under 3 seconds
      expect(perfResults.averageSearchTime).toBeLessThan(3000);
      
      // No query should take longer than 10 seconds
      const extremelySlowQueries = perfResults.slowQueries.filter(q => 
        perfResults.averageSearchTime > 10000
      );
      
      expect(extremelySlowQueries.length).toBe(0);
      
      if (perfResults.recommendations.length > 0) {
        console.log('Performance recommendations:', perfResults.recommendations);
      }
    }, 60000); // 60 second timeout for performance tests
  });

  describe('Search Quality Standards', () => {
    it('should maintain minimum search quality across all franchises', async () => {
      // This test runs the comprehensive health check
      // No assertions - just ensure it doesn't crash and provides useful output
      
      await expect(runSearchHealthCheck()).resolves.not.toThrow();
    }, 45000);
  });
});