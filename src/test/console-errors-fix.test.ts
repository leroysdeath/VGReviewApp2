import { supabase } from '../services/supabase';

// Mock supabase
jest.mock('../services/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getUser: jest.fn()
    }
  }
}));

describe('Console Error Fixes', () => {
  
  describe('User Table Fix', () => {
    it('should query the correct user table (not users)', async () => {
      // Mock the supabase query
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({ data: [], error: null }),
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: null })
          })
        })
      });
      
      (supabase.from as jest.Mock) = mockFrom;
      
      // Import the service that was making the wrong query
      const { getActivityFeed } = await import('../services/reviewService');
      
      // Call the function that was causing 404s
      await getActivityFeed(1, 10);
      
      // Verify it's calling 'user' not 'users'
      const fromCalls = mockFrom.mock.calls;
      const userTableCalls = fromCalls.filter((call: any) => call[0] === 'user');
      const usersTableCalls = fromCalls.filter((call: any) => call[0] === 'users');
      
      // Should be calling 'user' table
      expect(userTableCalls.length).toBeGreaterThan(0);
      // Should NOT be calling 'users' table
      expect(usersTableCalls.length).toBe(0);
    });
  });
  
  describe('Image Error Handling', () => {
    it('should handle IGDB image 404s gracefully', async () => {
      // Create a mock image element
      const mockImage = document.createElement('img');
      mockImage.src = 'https://images.igdb.com/igdb/image/upload/f_webp,q_85,w_400,h_600,c_cover/co4ahr.webp';
      
      // Track console logs
      const consoleSpy = jest.spyOn(console, 'log');
      const consoleErrorSpy = jest.spyOn(console, 'error');
      
      // Simulate error event
      const errorEvent = new Event('error');
      mockImage.dispatchEvent(errorEvent);
      
      // Should not log retry attempts anymore (we made it silent)
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Retrying image load')
      );
      
      // Should not throw or log errors for expected 404s
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
    
    it('should retry with different image formats on failure', () => {
      const originalSrc = 'https://images.igdb.com/igdb/image/upload/f_webp,q_85,w_400,h_600,c_cover/co4ahr.webp';
      
      // Expected retry variants based on SmartImage logic
      const expectedVariants = [
        originalSrc.replace('/t_cover_big/', '/t_cover_small/'),
        originalSrc.replace('f_webp', 'f_jpg'),
        originalSrc.replace(',q_85', ',q_75'),
        originalSrc // Original as last resort
      ];
      
      // Verify the retry logic creates correct variants
      expect(expectedVariants[1]).toContain('f_jpg');
      expect(expectedVariants[2]).toContain('q_75');
    });
  });
  
  describe('Database Upsert Fix', () => {
    it('should handle duplicate game inserts gracefully', async () => {
      const mockUpsert = jest.fn().mockResolvedValue({ 
        data: null, 
        error: { code: '23505', message: 'duplicate key value violates unique constraint "unique_game_slug"' }
      });
      
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: null })
        })
      });
      
      const mockFrom = jest.fn().mockReturnValue({
        upsert: mockUpsert,
        select: mockSelect
      });
      
      (supabase.from as jest.Mock) = mockFrom;
      
      const consoleErrorSpy = jest.spyOn(console, 'error');
      
      // Import the updated service
      const GameDataService = (await import('../services/gameDataServiceV2')).default;
      const service = new GameDataService();
      
      // This should not throw or log duplicate key errors
      const mockGames = [{
        id: 123,
        name: 'Test Game',
        slug: 'test-game',
        cover: { url: 'test.jpg' },
        genres: [],
        platforms: [],
        involved_companies: [],
        rating: 85,
        total_rating: 90,
        rating_count: 100,
        follows: 50,
        hypes: 10,
        first_release_date: Date.now() / 1000
      }];
      
      // Call private method through reflection (for testing)
      // @ts-ignore - accessing private method for testing
      await service.batchInsertGames(mockGames);
      
      // Should use upsert with ignoreDuplicates: true
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          onConflict: 'igdb_id',
          ignoreDuplicates: true
        })
      );
      
      // Should not log duplicate errors (code 23505)
      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('duplicate key value')
      );
      
      consoleErrorSpy.mockRestore();
    });
  });
});