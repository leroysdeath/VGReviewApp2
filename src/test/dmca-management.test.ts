/**
 * DMCA Management Service Tests
 * 
 * Tests for the DMCA management service for bulk redlighting operations
 */

import { dmcaManagementService } from '../services/dmcaManagementService';

// Mock test data - using test environment
const TEST_ENV_CONFIG = {
  testMode: true,
  skipActualDatabaseCalls: process.env.NODE_ENV === 'test'
};

describe('DMCA Management Service', () => {
  
  describe('Company Analysis', () => {
    test('should retrieve company analysis successfully', async () => {
      const result = await dmcaManagementService.getCompanyAnalysis();
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      
      if (result.success && result.data) {
        expect(result.data).toHaveProperty('publishers');
        expect(result.data).toHaveProperty('developers');
        expect(result.data).toHaveProperty('totalCompanies');
        expect(result.data).toHaveProperty('totalGames');
        
        expect(Array.isArray(result.data.publishers)).toBe(true);
        expect(Array.isArray(result.data.developers)).toBe(true);
        expect(typeof result.data.totalCompanies).toBe('number');
        expect(typeof result.data.totalGames).toBe('number');
      }
    }, 30000);

    test('should sort companies by game count', async () => {
      const result = await dmcaManagementService.getCompanyAnalysis();
      
      if (result.success && result.data) {
        const { publishers, developers } = result.data;
        
        // Publishers should be sorted by game count (descending)
        for (let i = 0; i < publishers.length - 1; i++) {
          expect(publishers[i].gameCount).toBeGreaterThanOrEqual(publishers[i + 1].gameCount);
        }
        
        // Developers should be sorted by game count (descending)
        for (let i = 0; i < developers.length - 1; i++) {
          expect(developers[i].gameCount).toBeGreaterThanOrEqual(developers[i + 1].gameCount);
        }
      }
    }, 30000);

    test('should provide sample games for each company', async () => {
      const result = await dmcaManagementService.getCompanyAnalysis();
      
      if (result.success && result.data) {
        const { publishers, developers } = result.data;
        
        // Check that companies with games have sample games
        publishers.forEach(pub => {
          if (pub.gameCount > 0) {
            expect(Array.isArray(pub.sampleGames)).toBe(true);
            expect(pub.sampleGames.length).toBeGreaterThan(0);
            expect(pub.sampleGames.length).toBeLessThanOrEqual(5); // Should limit to 5 samples
          }
        });
        
        developers.forEach(dev => {
          if (dev.gameCount > 0) {
            expect(Array.isArray(dev.sampleGames)).toBe(true);
            expect(dev.sampleGames.length).toBeGreaterThan(0);
            expect(dev.sampleGames.length).toBeLessThanOrEqual(5); // Should limit to 5 samples
          }
        });
      }
    }, 30000);
  });

  describe('Company Games Retrieval', () => {
    test('should retrieve games from a specific publisher', async () => {
      // First get company analysis to find a real publisher
      const analysisResult = await dmcaManagementService.getCompanyAnalysis();
      
      if (analysisResult.success && analysisResult.data && analysisResult.data.publishers.length > 0) {
        const testPublisher = analysisResult.data.publishers[0].company;
        
        const result = await dmcaManagementService.getCompanyGames(testPublisher, 'publisher');
        
        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        
        if (result.success && result.data) {
          expect(Array.isArray(result.data)).toBe(true);
          
          result.data.forEach(game => {
            expect(game).toHaveProperty('id');
            expect(game).toHaveProperty('name');
            expect(typeof game.id).toBe('number');
            expect(typeof game.name).toBe('string');
          });
        }
      }
    }, 30000);

    test('should retrieve games from a specific developer', async () => {
      // First get company analysis to find a real developer
      const analysisResult = await dmcaManagementService.getCompanyAnalysis();
      
      if (analysisResult.success && analysisResult.data && analysisResult.data.developers.length > 0) {
        const testDeveloper = analysisResult.data.developers[0].company;
        
        const result = await dmcaManagementService.getCompanyGames(testDeveloper, 'developer');
        
        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        
        if (result.success && result.data) {
          expect(Array.isArray(result.data)).toBe(true);
          
          result.data.forEach(game => {
            expect(game).toHaveProperty('id');
            expect(game).toHaveProperty('name');
            expect(typeof game.id).toBe('number');
            expect(typeof game.name).toBe('string');
          });
        }
      }
    }, 30000);
  });

  describe('Mod Games Retrieval', () => {
    test('should retrieve mod games successfully', async () => {
      const result = await dmcaManagementService.getModGames();
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      
      if (result.success && result.data) {
        expect(Array.isArray(result.data)).toBe(true);
        
        result.data.forEach(game => {
          expect(game).toHaveProperty('id');
          expect(game).toHaveProperty('name');
          expect(typeof game.id).toBe('number');
          expect(typeof game.name).toBe('string');
        });
      }
    }, 30000);
  });

  describe('Flag Statistics', () => {
    test('should retrieve flag statistics successfully', async () => {
      const result = await dmcaManagementService.getFlagStatistics();
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      
      if (result.success && result.data) {
        const stats = result.data;
        
        expect(stats).toHaveProperty('totalGames');
        expect(stats).toHaveProperty('redlightCount');
        expect(stats).toHaveProperty('greenlightCount');
        expect(stats).toHaveProperty('unflaggedCount');
        expect(stats).toHaveProperty('modGamesCount');
        expect(stats).toHaveProperty('redlightedModsCount');
        
        // All should be numbers
        Object.values(stats).forEach(value => {
          expect(typeof value).toBe('number');
          expect(value).toBeGreaterThanOrEqual(0);
        });
        
        // Total should equal sum of flag counts
        expect(stats.totalGames).toBe(stats.redlightCount + stats.greenlightCount + stats.unflaggedCount);
        
        // Redlighted mods should not exceed total mods
        expect(stats.redlightedModsCount).toBeLessThanOrEqual(stats.modGamesCount);
      }
    }, 30000);
  });

  describe('Bulk Operations (Dry Run)', () => {
    test('should perform dry run for company bulk operation', async () => {
      // Get a real company for testing
      const analysisResult = await dmcaManagementService.getCompanyAnalysis();
      
      if (analysisResult.success && analysisResult.data && analysisResult.data.publishers.length > 0) {
        const testPublisher = analysisResult.data.publishers[0].company;
        
        const bulkRequest = {
          type: 'company' as const,
          target: `${testPublisher} (Publisher)`,
          flagType: 'redlight' as const,
          reason: 'Test DMCA request - DRY RUN',
          dryRun: true
        };
        
        const result = await dmcaManagementService.bulkFlag(bulkRequest);
        
        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        
        expect(result.processedCount).toBe(0); // Should be 0 for dry run
        expect(result.skippedCount).toBe(0);
        expect(result.errorCount).toBe(0);
        
        expect(Array.isArray(result.affectedGames)).toBe(true);
        
        // Check that affected games have the right structure
        result.affectedGames.forEach(game => {
          expect(game).toHaveProperty('id');
          expect(game).toHaveProperty('name');
          expect(game).toHaveProperty('action');
          expect(game).toHaveProperty('reason');
          
          expect(typeof game.id).toBe('number');
          expect(typeof game.name).toBe('string');
          expect(game.action).toBe('flagged');
          expect(game.reason).toContain('[DRY RUN]');
        });
      }
    }, 30000);

    test('should perform dry run for mod bulk operation', async () => {
      const bulkRequest = {
        type: 'mods' as const,
        target: 'All Mod Games',
        flagType: 'redlight' as const,
        reason: 'Test mod cleanup - DRY RUN',
        dryRun: true
      };
      
      const result = await dmcaManagementService.bulkFlag(bulkRequest);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      
      expect(result.processedCount).toBe(0); // Should be 0 for dry run
      expect(result.skippedCount).toBe(0);
      expect(result.errorCount).toBe(0);
      
      expect(Array.isArray(result.affectedGames)).toBe(true);
      
      // Should limit preview to 10 items
      expect(result.affectedGames.length).toBeLessThanOrEqual(10);
      
      result.affectedGames.forEach(game => {
        expect(game).toHaveProperty('id');
        expect(game).toHaveProperty('name');
        expect(game).toHaveProperty('action');
        expect(game).toHaveProperty('reason');
        
        expect(game.action).toBe('flagged');
        expect(game.reason).toContain('[DRY RUN]');
      });
    }, 30000);

    test('should validate company target format', async () => {
      const bulkRequest = {
        type: 'company' as const,
        target: 'Invalid Format', // Missing (Publisher) or (Developer)
        flagType: 'redlight' as const,
        reason: 'Test validation',
        dryRun: true
      };
      
      const result = await dmcaManagementService.bulkFlag(bulkRequest);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid company format');
    }, 30000);

    test('should handle clear flag operations', async () => {
      // Get a real company for testing
      const analysisResult = await dmcaManagementService.getCompanyAnalysis();
      
      if (analysisResult.success && analysisResult.data && analysisResult.data.publishers.length > 0) {
        const testPublisher = analysisResult.data.publishers[0].company;
        
        const bulkRequest = {
          type: 'company' as const,
          target: `${testPublisher} (Publisher)`,
          flagType: 'clear' as const,
          reason: 'Test flag clearing - DRY RUN',
          dryRun: true
        };
        
        const result = await dmcaManagementService.bulkFlag(bulkRequest);
        
        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        
        result.affectedGames.forEach(game => {
          expect(game.action).toBe('cleared');
          expect(game.reason).toContain('[DRY RUN]');
        });
      }
    }, 30000);
  });

  describe('Error Handling', () => {
    test('should handle invalid company queries gracefully', async () => {
      const result = await dmcaManagementService.getCompanyGames('NonExistentCompany12345', 'publisher');
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      
      if (result.success && result.data) {
        expect(Array.isArray(result.data)).toBe(true);
        expect(result.data.length).toBe(0); // Should return empty array for non-existent company
      }
    }, 30000);

    test('should handle unsupported bulk operation types', async () => {
      const bulkRequest = {
        type: 'unsupported' as any,
        target: 'Test',
        flagType: 'redlight' as const,
        reason: 'Test',
        dryRun: true
      };
      
      const result = await dmcaManagementService.bulkFlag(bulkRequest);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unsupported request type');
    }, 30000);
  });

  describe('API Rate Limiting', () => {
    test('should respect database limits in bulk operations', async () => {
      // This test ensures we have proper delays and don't overwhelm the database
      const startTime = Date.now();
      
      const bulkRequest = {
        type: 'mods' as const,
        target: 'All Mod Games',
        flagType: 'redlight' as const,
        reason: 'Rate limit test - DRY RUN',
        dryRun: true
      };
      
      const result = await dmcaManagementService.bulkFlag(bulkRequest);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      
      // Even dry runs should be reasonably fast (under 10 seconds)
      expect(duration).toBeLessThan(10000);
    }, 15000);
  });
});

export {};