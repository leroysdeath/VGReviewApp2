import { describe, it, expect } from '@jest/globals';

// Simple test to verify sister game functionality is connected
describe('Sister Game Functionality - Simple Test', () => {
  
  it('should have gameDataService searchGames method available', async () => {
    console.log('🧪 Testing sister game functionality integration...');
    
    try {
      // Import the service
      const { gameDataService } = await import('../services/gameDataService');
      
      // Verify the method exists
      expect(typeof gameDataService.searchGames).toBe('function');
      console.log('✅ gameDataService.searchGames method exists');
      
      // Test with a simple query that shouldn't cause API calls in test environment
      const results = await gameDataService.searchGames('test');
      
      console.log(`📊 Search returned ${results.length} results`);
      
      // Verify it returns an array (even if empty in test environment)
      expect(Array.isArray(results)).toBe(true);
      console.log('✅ Sister game functionality is connected to frontend');
      
    } catch (error) {
      console.error('❌ Sister game functionality test failed:', error);
      
      // Log the specific error to understand what's happening
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      
      // Fail the test
      expect(false).toBe(true);
    }
  }, 15000); // 15 second timeout
  
  it('should have sister game detection utilities available', async () => {
    console.log('🧪 Testing sister game detection utilities...');
    
    try {
      // Import sister game detection
      const { detectGameSeries, generateSisterGameQueries } = await import('../utils/sisterGameDetection');
      
      // Test sister game detection
      const seriesInfo = detectGameSeries('Pokemon Red');
      console.log('Pokemon Red series detection:', seriesInfo);
      
      expect(seriesInfo).toBeDefined();
      if (seriesInfo) {
        expect(seriesInfo.seriesInfo.type).toBeDefined();
      }
      
      // Test sister game query generation
      const queries = generateSisterGameQueries('Pokemon Red');
      console.log('Generated sister game queries:', queries);
      
      expect(Array.isArray(queries)).toBe(true);
      expect(queries.length).toBeGreaterThan(0);
      
      console.log('✅ Sister game detection utilities working');
      
    } catch (error) {
      console.error('❌ Sister game detection test failed:', error);
      expect(false).toBe(true);
    }
  }, 10000);
});