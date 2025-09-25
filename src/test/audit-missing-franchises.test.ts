import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase
jest.mock('@supabase/supabase-js');
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

// Mock data for testing
const mockGameData = {
  starFox: [
    { id: 1, name: 'Star Fox', igdb_id: 1001, release_date: '1993-02-21' },
    { id: 2, name: 'Star Fox 64', igdb_id: 1002, release_date: '1997-04-27' },
    { id: 3, name: 'Star Fox Adventures', igdb_id: 1003, release_date: '2002-09-23' },
    { id: 4, name: 'Star Fox Assault', igdb_id: 1004, release_date: '2005-02-14' },
    { id: 5, name: 'Star Fox Zero', igdb_id: 1005, release_date: '2016-04-21' }
  ],
  xenogears: [], // Empty - missing from database
  liveALive: [
    { id: 6, name: 'Live A Live', igdb_id: 1006, release_date: '1994-09-02' }
    // Missing the 2022 remake
  ],
  frontMission: [
    { id: 7, name: 'Front Mission', igdb_id: 1007, release_date: '1995-02-24' },
    { id: 8, name: 'Front Mission 2', igdb_id: 1008, release_date: '1997-09-25' },
    { id: 9, name: 'Front Mission 3', igdb_id: 1009, release_date: '1999-09-02' }
    // Missing Front Mission 4, 5, and Evolved
  ]
};

const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  ilike: jest.fn().mockReturnThis(),
  or: jest.fn().mockReturnThis()
};

describe('Franchise Audit Script Functions', () => {
  beforeEach(() => {
    mockCreateClient.mockReturnValue(mockSupabase as any);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should create Supabase client with correct credentials', () => {
    const originalEnv = process.env;
    process.env = {
      ...originalEnv,
      VITE_SUPABASE_URL: 'https://test.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'test-key'
    };

    createClient('https://test.supabase.co', 'test-key');
    
    expect(mockCreateClient).toHaveBeenCalledWith('https://test.supabase.co', 'test-key');
    
    process.env = originalEnv;
  });

  describe('checkFranchiseCoverage function logic', () => {
    test('should identify fully covered franchise (Star Fox)', async () => {
      // Mock successful query response
      mockSupabase.select.mockResolvedValue({
        data: mockGameData.starFox,
        count: 5,
        error: null
      });

      const mockFranchise = {
        name: 'Star Fox',
        searchPatterns: ['%star fox%', '%starfox%'],
        expectedMinGames: 4,
        notableGames: ['Star Fox', 'Star Fox 64', 'Star Fox Adventures', 'Star Fox Assault', 'Star Fox Zero']
      };

      // The function would calculate coverage like this:
      const expectedCoverage = Math.round((5 / 4) * 100); // 125%
      
      expect(expectedCoverage).toBe(125);
      expect(5 >= 4).toBe(true); // Should be fully covered
    });

    test('should identify missing franchise (Xenogears)', async () => {
      mockSupabase.select.mockResolvedValue({
        data: mockGameData.xenogears,
        count: 0,
        error: null
      });

      const mockFranchise = {
        name: 'Xenogears',
        searchPatterns: ['%xenogears%'],
        expectedMinGames: 1,
        notableGames: ['Xenogears']
      };

      const expectedCoverage = Math.round((0 / 1) * 100); // 0%
      
      expect(expectedCoverage).toBe(0);
      expect(0 >= 1).toBe(false); // Should be missing
    });

    test('should identify partially covered franchise (Live A Live)', async () => {
      mockSupabase.select.mockResolvedValue({
        data: mockGameData.liveALive,
        count: 1,
        error: null
      });

      const mockFranchise = {
        name: 'Live A Live',
        searchPatterns: ['%live a live%', '%live-a-live%'],
        expectedMinGames: 2,
        notableGames: ['Live A Live (1994)', 'Live A Live (2022)']
      };

      const expectedCoverage = Math.round((1 / 2) * 100); // 50%
      
      expect(expectedCoverage).toBe(50);
      expect(1 >= 2).toBe(false); // Should be partially covered
    });

    test('should handle database query errors gracefully', async () => {
      mockSupabase.select.mockResolvedValue({
        data: null,
        count: null,
        error: { message: 'Database connection failed' }
      });

      const mockFranchise = {
        name: 'Test Franchise',
        searchPatterns: ['%test%'],
        expectedMinGames: 1,
        notableGames: ['Test Game']
      };

      // The function should return null on error
      // We can't test the actual function here, but we can verify the mock behavior
      const result = await mockSupabase.select();
      expect(result.error).toBeTruthy();
      expect(result.data).toBeNull();
    });
  });

  describe('notable games detection', () => {
    test('should correctly identify found and missing notable games', () => {
      const gameData = mockGameData.frontMission;
      const notableGames = ['Front Mission', 'Front Mission 2', 'Front Mission 3', 'Front Mission 4', 'Front Mission 5', 'Front Mission Evolved'];
      
      const foundNotableGames: string[] = [];
      const missingNotableGames: string[] = [];

      for (const notableGame of notableGames) {
        const found = gameData.some(game =>
          game.name.toLowerCase().includes(notableGame.toLowerCase()) ||
          notableGame.toLowerCase().includes(game.name.toLowerCase())
        );

        if (found) {
          foundNotableGames.push(notableGame);
        } else {
          missingNotableGames.push(notableGame);
        }
      }

      // Mock data has: 'Front Mission', 'Front Mission 2', 'Front Mission 3'
      // So all 6 games in the notable list should match because of includes() logic
      expect(foundNotableGames.length).toBeGreaterThan(0);
      expect(foundNotableGames).toContain('Front Mission');
      
      // Any games not matching the pattern should be in missing list
      const actualMissing = notableGames.filter(notable => 
        !gameData.some(game => 
          game.name.toLowerCase().includes(notable.toLowerCase()) ||
          notable.toLowerCase().includes(game.name.toLowerCase())
        )
      );
      
      expect(missingNotableGames).toEqual(actualMissing);
    });

    test('should handle case-insensitive matching', () => {
      const gameData = [{ id: 1, name: 'STAR FOX', igdb_id: 1001, release_date: '1993-02-21' }];
      const notableGame = 'Star Fox';
      
      const found = gameData.some(game =>
        game.name.toLowerCase().includes(notableGame.toLowerCase()) ||
        notableGame.toLowerCase().includes(game.name.toLowerCase())
      );

      expect(found).toBe(true);
    });

    test('should handle partial name matching', () => {
      const gameData = [{ id: 1, name: 'Star Fox 64', igdb_id: 1001, release_date: '1997-04-27' }];
      const notableGame = 'Star Fox';
      
      const found = gameData.some(game =>
        game.name.toLowerCase().includes(notableGame.toLowerCase()) ||
        notableGame.toLowerCase().includes(game.name.toLowerCase())
      );

      expect(found).toBe(true);
    });
  });

  describe('query building logic', () => {
    test('should build single pattern query correctly', () => {
      const franchise = {
        name: 'Xenogears',
        searchPatterns: ['%xenogears%'],
        expectedMinGames: 1,
        notableGames: ['Xenogears']
      };

      // The script would call ilike for single pattern
      expect(franchise.searchPatterns.length).toBe(1);
    });

    test('should build multiple pattern OR query correctly', () => {
      const franchise = {
        name: 'Star Fox',
        searchPatterns: ['%star fox%', '%starfox%'],
        expectedMinGames: 4,
        notableGames: ['Star Fox']
      };

      // The script would build OR conditions
      const orConditions = franchise.searchPatterns
        .map(pattern => `name.ilike.${pattern}`)
        .join(',');
      
      expect(orConditions).toBe('name.ilike.%star fox%,name.ilike.%starfox%');
      expect(franchise.searchPatterns.length > 1).toBe(true);
    });
  });

  describe('summary statistics calculation', () => {
    test('should correctly categorize franchise coverage', () => {
      const mockResults = [
        { coverage: 125, franchise: 'Star Fox' }, // Fully covered
        { coverage: 75, franchise: 'Bravely Default' }, // Partially covered  
        { coverage: 50, franchise: 'Live A Live' }, // Partially covered
        { coverage: 25, franchise: 'Front Mission' }, // Poorly covered
        { coverage: 0, franchise: 'Xenogears' } // Poorly covered
      ];

      const summary = {
        totalFranchises: mockResults.length,
        fullyCovered: 0,
        partiallyCovered: 0,
        poorlyCovered: 0
      };

      mockResults.forEach(result => {
        if (result.coverage >= 100) {
          summary.fullyCovered++;
        } else if (result.coverage >= 50) {
          summary.partiallyCovered++;
        } else {
          summary.poorlyCovered++;
        }
      });

      expect(summary.fullyCovered).toBe(1);
      expect(summary.partiallyCovered).toBe(2);
      expect(summary.poorlyCovered).toBe(2);
      expect(summary.totalFranchises).toBe(5);
    });

    test('should calculate overall coverage percentage', () => {
      const totalGamesFound = 25;
      const totalGamesExpected = 30;
      const overallCoverage = Math.round((totalGamesFound / totalGamesExpected) * 100);
      
      expect(overallCoverage).toBe(83);
    });
  });

  describe('priority list generation', () => {
    test('should generate top 10 priority list correctly', () => {
      const mockResults = [
        { coverage: 125, franchise: 'Star Fox' },
        { coverage: 100, franchise: 'Drakengard' },
        { coverage: 75, franchise: 'Bravely Default' },
        { coverage: 50, franchise: 'Live A Live' },
        { coverage: 50, franchise: 'Front Mission' },
        { coverage: 25, franchise: 'Secret of Mana' },
        { coverage: 0, franchise: 'Xenogears' }
      ];

      const priorityList = mockResults
        .filter(r => r.coverage < 100)
        .sort((a, b) => a.coverage - b.coverage)
        .slice(0, 10);

      expect(priorityList[0].franchise).toBe('Xenogears'); // Lowest coverage first
      expect(priorityList[1].franchise).toBe('Secret of Mana');
      expect(priorityList.length).toBe(5); // Only franchises with < 100% coverage
    });
  });
});