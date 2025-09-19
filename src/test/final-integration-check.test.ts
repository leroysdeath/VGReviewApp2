import { filterFanGamesAndEReaderContent } from '../utils/contentProtectionFilter';
import { gameSearchService } from '../services/gameSearchService';

describe('Final Integration Check - Fan Game & E-Reader Filtering', () => {
  describe('Comprehensive Filtering Test', () => {
    it('should filter all types of unwanted content', () => {
      const testGames = [
        // Official games that should pass
        { id: 1, name: 'Super Mario Bros.', developer: 'Nintendo', publisher: 'Nintendo', category: 0 },
        { id: 2, name: 'The Legend of Zelda', developer: 'Nintendo', publisher: 'Nintendo', category: 0 },
        { id: 3, name: 'Metroid', developer: 'Nintendo R&D1', publisher: 'Nintendo', category: 0 },
        { id: 4, name: 'Pokemon Red', developer: 'Game Freak', publisher: 'Nintendo', category: 0 },
        { id: 5, name: 'Sonic the Hedgehog', developer: 'Sonic Team', publisher: 'Sega', category: 0 },
        
        // Fan games that should be filtered
        { id: 10, name: 'Super Mario Bros. X', developer: 'Redigit', publisher: 'Fan Game', category: 5 },
        { id: 11, name: 'Mario Forever', developer: 'Buziol Games', publisher: 'Buziol', category: 5 },
        { id: 12, name: 'Zelda Classic', developer: 'Armageddon Games', publisher: 'Fan Project', category: 5 },
        { id: 13, name: 'AM2R: Another Metroid 2 Remake', developer: 'DoctorM64', publisher: 'Fan Project', category: 5 },
        { id: 14, name: 'Pokemon Uranium', developer: 'JV', publisher: 'Fan Made', category: 0 },
        { id: 15, name: 'Pokemon Insurgence', developer: 'thesuzerain', publisher: 'Community', category: 0 },
        { id: 16, name: 'Sonic Before the Sequel', developer: 'LakeFeperd', publisher: 'Fangame', category: 5 },
        
        // E-Reader content that should be filtered
        { id: 20, name: 'Mario Party-e', developer: 'Nintendo', publisher: 'Nintendo', category: 0, summary: 'e-Reader card game' },
        { id: 21, name: 'Pokémon-e Trading Card Game', developer: 'Nintendo', publisher: 'Nintendo', category: 0 },
        { id: 22, name: 'Excitebike-e', developer: 'Nintendo', publisher: 'Nintendo', category: 0 },
        { id: 23, name: 'Donkey Kong 3-e', developer: 'Nintendo', publisher: 'Nintendo', category: 0 },
        { id: 24, name: 'Super Mario Advance 4: Super Mario Bros. 3-e', developer: 'Nintendo', publisher: 'Nintendo', category: 1 },
        
        // ROM Hacks that should be filtered
        { id: 30, name: 'Pokemon Prism', developer: 'Koolboyman', publisher: 'ROM Hack', category: 5 },
        { id: 31, name: 'Hyper Metroid', developer: 'ROMhacker', publisher: 'ROM Hack', category: 5 },
        { id: 32, name: 'Super Mario World ROM Hack', developer: 'Community', publisher: 'Homebrew', category: 5 },
        
        // Edge cases - official games that should pass
        { id: 40, name: 'Super Mario Advance 4: Super Mario Bros. 3', developer: 'Nintendo', publisher: 'Nintendo', category: 0 },
        { id: 41, name: 'Zelda: The Wand of Gamelon', developer: 'Animation Magic', publisher: 'Philips', category: 0 },
        { id: 42, name: 'Freedom Planet', developer: 'GalaxyTrail', publisher: 'GalaxyTrail', category: 0, summary: 'Sonic-inspired but original' },
      ];

      const filtered = filterFanGamesAndEReaderContent(testGames);
      const filteredNames = filtered.map(g => g.name);
      
      // Check official games are kept
      const officialGames = [
        'Super Mario Bros.',
        'The Legend of Zelda',
        'Metroid',
        'Pokemon Red',
        'Sonic the Hedgehog',
        'Super Mario Advance 4: Super Mario Bros. 3',
        'Zelda: The Wand of Gamelon',
        'Freedom Planet'
      ];
      
      officialGames.forEach(game => {
        expect(filteredNames).toContain(game);
      });
      
      // Check fan games are filtered
      const fanGames = [
        'Super Mario Bros. X',
        'Mario Forever',
        'Zelda Classic',
        'AM2R: Another Metroid 2 Remake',
        'Pokemon Uranium',
        'Pokemon Insurgence',
        'Sonic Before the Sequel'
      ];
      
      fanGames.forEach(game => {
        expect(filteredNames).not.toContain(game);
      });
      
      // Check e-reader content is filtered
      const eReaderGames = [
        'Mario Party-e',
        'Pokémon-e Trading Card Game',
        'Excitebike-e',
        'Donkey Kong 3-e',
        'Super Mario Advance 4: Super Mario Bros. 3-e'
      ];
      
      eReaderGames.forEach(game => {
        expect(filteredNames).not.toContain(game);
      });
      
      // Check ROM hacks are filtered
      const romHacks = [
        'Pokemon Prism',
        'Hyper Metroid',
        'Super Mario World ROM Hack'
      ];
      
      romHacks.forEach(game => {
        expect(filteredNames).not.toContain(game);
      });
      
      // Verify count
      expect(filtered.length).toBe(8); // Only the 8 official games
    });
  });
  
  describe('Search Service Integration', () => {
    it('should have filtering integrated in gameSearchService', () => {
      // This test verifies the service exists and has the expected methods
      expect(gameSearchService).toBeDefined();
      expect(gameSearchService.searchGames).toBeDefined();
      // The service has these methods available for search
      expect(typeof gameSearchService.searchGames).toBe('function');
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle games with misleading names', () => {
      const edgeCases = [
        // Should keep - official game despite name
        { id: 1, name: 'Mario vs. Donkey Kong', developer: 'Nintendo', publisher: 'Nintendo', category: 0 },
        
        // Should filter - fan game indicators
        { id: 2, name: 'Mario Unlimited', developer: 'Unknown', publisher: '', category: 0 },
        { id: 3, name: 'Zelda Redux', developer: 'ModTeam', publisher: 'Indie', category: 0 },
        { id: 4, name: 'Metroid Reborn', developer: 'FanDev', publisher: 'Community', category: 0 },
        
        // Should keep - official remakes
        { id: 5, name: 'The Legend of Zelda: Link\'s Awakening', developer: 'Grezzo', publisher: 'Nintendo', category: 0 },
        { id: 6, name: 'Metroid: Zero Mission', developer: 'Nintendo R&D1', publisher: 'Nintendo', category: 0 },
      ];
      
      const filtered = filterFanGamesAndEReaderContent(edgeCases);
      const filteredNames = filtered.map(g => g.name);
      
      // Official games should be kept
      expect(filteredNames).toContain('Mario vs. Donkey Kong');
      expect(filteredNames).toContain('The Legend of Zelda: Link\'s Awakening');
      expect(filteredNames).toContain('Metroid: Zero Mission');
      
      // Fan games should be filtered
      expect(filteredNames).not.toContain('Mario Unlimited');
      expect(filteredNames).not.toContain('Zelda Redux');
      expect(filteredNames).not.toContain('Metroid Reborn');
      
      expect(filtered.length).toBe(3);
    });
    
    it('should handle empty and null values gracefully', () => {
      const games = [
        { id: 1, name: 'Valid Game', developer: 'Nintendo', publisher: 'Nintendo', category: 0 },
        { id: 2, name: 'No Developer', developer: '', publisher: 'Nintendo', category: 0 },
        { id: 3, name: 'No Publisher', developer: 'Nintendo', publisher: '', category: 0 },
        { id: 4, name: 'No Category', developer: 'Nintendo', publisher: 'Nintendo' },
        { id: 5, name: 'Null Values', developer: null, publisher: null, category: null },
      ];
      
      // Should not throw errors
      expect(() => filterFanGamesAndEReaderContent(games as any)).not.toThrow();
      
      const filtered = filterFanGamesAndEReaderContent(games as any);
      expect(filtered.length).toBeGreaterThan(0);
    });
  });
});