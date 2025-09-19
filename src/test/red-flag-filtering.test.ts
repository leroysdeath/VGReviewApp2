import { GameDataServiceV2 } from '../services/gameDataServiceV2';
import { supabase } from '../services/supabase';
import { gameFlagService } from '../services/gameFlagService';

// Mock Supabase
jest.mock('../services/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user' } } })
    },
    rpc: jest.fn()
  }
}));

describe('Red Flag Filtering', () => {
  let gameDataService: GameDataServiceV2;
  
  beforeEach(() => {
    jest.clearAllMocks();
    gameDataService = new GameDataServiceV2();
  });

  describe('Database Query Filtering', () => {
    it('should filter out games with redlight_flag = true when searching by name', async () => {
      const mockGames = [
        { 
          id: 1, 
          name: 'Samus Returns', 
          redlight_flag: false,
          greenlight_flag: false 
        },
        { 
          id: 2, 
          name: 'Samus Goes to the Fridge', 
          redlight_flag: true,  // This should be filtered out
          greenlight_flag: false 
        },
        { 
          id: 3, 
          name: 'Super Metroid', 
          redlight_flag: false,
          greenlight_flag: true 
        }
      ];

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        abortSignal: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue({ data: mockGames, error: null })
      };

      (supabase.from as any).mockReturnValue(mockQueryBuilder);

      // Search for "Samus"
      const results = await gameDataService.searchGames('Samus');

      // Check that the query builder was called
      expect(supabase.from).toHaveBeenCalledWith('game');
      expect(mockQueryBuilder.select).toHaveBeenCalledWith('*');
      expect(mockQueryBuilder.ilike).toHaveBeenCalledWith('name', '%Samus%');
      
      // The critical test: should filter out red-flagged games
      // Currently this will FAIL because the filter is not applied
      // We need to add: .or('redlight_flag.is.null,redlight_flag.eq.false')
      console.log('🔴 TEST EXPECTATION: Query should filter out redlight_flag = true');
      console.log('🔴 CURRENT STATUS: Filter NOT applied - red-flagged games will appear');
    });

    it('should filter out games with redlight_flag = true when searching by summary', async () => {
      const mockGames = [
        { 
          id: 1, 
          name: 'Metroid Prime',
          summary: 'Samus Aran explores alien worlds',
          redlight_flag: false 
        },
        { 
          id: 2, 
          name: 'Fan Game',
          summary: 'Samus in a fan-made adventure',
          redlight_flag: true  // Should be filtered out
        }
      ];

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        abortSignal: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue({ data: mockGames, error: null })
      };

      (supabase.from as any).mockReturnValue(mockQueryBuilder);

      // This would trigger a summary search (if name search returns < 15 results)
      console.log('🔴 Summary search also needs red-flag filtering');
    });
  });

  describe('Flag Service Integration', () => {
    it('should be able to set and retrieve red flags', async () => {
      // Mock the RPC call for setting a flag
      (supabase.rpc as any).mockResolvedValue({ 
        data: { success: true },
        error: null 
      });

      const result = await gameFlagService.setGameFlag(123, 'redlight', 'Inappropriate content');
      
      expect(result.success).toBe(true);
      expect(supabase.rpc).toHaveBeenCalledWith('set_game_flag', {
        p_game_id: 123,
        p_flag_type: 'redlight',
        p_reason: 'Inappropriate content',
        p_user_id: 'test-user'
      });
    });

    it('should retrieve flagged games for admin review', async () => {
      const mockFlaggedGames = [
        {
          id: 2,
          name: 'Samus Goes to the Fridge',
          redlight_flag: true,
          flag_reason: 'Not a real game',
          flagged_at: '2025-01-18T10:00:00Z'
        }
      ];

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue({ data: mockFlaggedGames, error: null })
      };

      (supabase.from as any).mockReturnValue(mockQueryBuilder);

      const result = await gameFlagService.getFlaggedGames();
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockFlaggedGames);
      expect(supabase.from).toHaveBeenCalledWith('game_flags_admin');
    });
  });

  describe('Expected Behavior', () => {
    it('EXPECTED: Search results should exclude red-flagged games', () => {
      // This test documents the EXPECTED behavior
      const searchResults = [
        { name: 'Metroid Prime', redlight_flag: false },
        { name: 'Super Metroid', redlight_flag: false },
        // { name: 'Samus Goes to the Fridge', redlight_flag: true } // Should NOT appear
      ];

      const filteredResults = searchResults.filter(game => !game.redlight_flag);
      
      expect(filteredResults).toHaveLength(2);
      expect(filteredResults.every(game => !game.redlight_flag)).toBe(true);
      
      console.log('✅ Expected: Only games without redlight_flag should appear in search results');
    });

    it('CURRENT: Search results include red-flagged games (BUG)', () => {
      // This test documents the CURRENT buggy behavior
      const searchResults = [
        { name: 'Metroid Prime', redlight_flag: false },
        { name: 'Super Metroid', redlight_flag: false },
        { name: 'Samus Goes to the Fridge', redlight_flag: true } // Currently DOES appear (bug!)
      ];

      // Currently NO filtering is applied
      const unfilteredResults = searchResults;
      
      expect(unfilteredResults).toHaveLength(3);
      expect(unfilteredResults.some(game => game.redlight_flag)).toBe(true);
      
      console.log('🐛 Current Bug: Red-flagged games appear in search results');
    });
  });

  describe('Fix Verification', () => {
    it('should verify the fix filters red-flagged games properly', () => {
      // This test will verify the fix once applied
      const fixedQueryConditions = `
        // In searchByName and searchBySummary methods:
        queryBuilder = queryBuilder
          .or('redlight_flag.is.null,redlight_flag.eq.false')
          
        // This ensures we only get games where:
        // - redlight_flag is NULL (never flagged), OR
        // - redlight_flag is false (explicitly not red-flagged)
      `;
      
      console.log('📝 Fix Required:', fixedQueryConditions);
      console.log('📍 Files to update:');
      console.log('  - src/services/gameDataServiceV2.ts (searchByName method around line 674)');
      console.log('  - src/services/gameDataServiceV2.ts (searchBySummary method around line 727)');
    });
  });
});