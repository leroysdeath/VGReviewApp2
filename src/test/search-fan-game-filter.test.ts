import { gameSearchService } from '../services/gameSearchService';
import { filterFanGamesAndEReaderContent } from '../utils/contentProtectionFilter';

describe('Search Results Fan Game and E-Reader Filtering', () => {
  describe('Mario Search Filtering', () => {
    it('should filter fan games from Mario search results', async () => {
      // Mock some Mario games including fan games
      const mockMarioGames = [
        { id: 1, name: 'Super Mario Bros.', developer: 'Nintendo', publisher: 'Nintendo', category: 0 },
        { id: 2, name: 'Super Mario World', developer: 'Nintendo EAD', publisher: 'Nintendo', category: 0 },
        { id: 3, name: 'Super Mario Bros. X', developer: 'Redigit', publisher: 'Fan Game', category: 5 },
        { id: 4, name: 'Mario Forever', developer: 'Buziol Games', publisher: 'Buziol', category: 5 },
        { id: 5, name: 'Super Mario Odyssey', developer: 'Nintendo EPD', publisher: 'Nintendo', category: 0 },
        { id: 6, name: 'Mario Party-e', developer: 'Nintendo', publisher: 'Nintendo', category: 0, summary: 'e-Reader card game' },
        { id: 7, name: 'Super Mario Advance 4-e', developer: 'Nintendo', publisher: 'Nintendo', category: 1 }
      ];

      const filtered = filterFanGamesAndEReaderContent(mockMarioGames);
      const filteredNames = filtered.map(g => g.name);

      // Should keep official Mario games
      expect(filteredNames).toContain('Super Mario Bros.');
      expect(filteredNames).toContain('Super Mario World');
      expect(filteredNames).toContain('Super Mario Odyssey');

      // Should filter out fan games
      expect(filteredNames).not.toContain('Super Mario Bros. X');
      expect(filteredNames).not.toContain('Mario Forever');

      // Should filter out e-reader content
      expect(filteredNames).not.toContain('Mario Party-e');
      expect(filteredNames).not.toContain('Super Mario Advance 4-e');

      // Verify significant filtering occurred
      expect(filtered.length).toBeLessThan(mockMarioGames.length);
      expect(filtered.length).toBe(3); // Only the 3 official main games
    });
  });

  describe('Zelda Search Filtering', () => {
    it('should filter fan games from Zelda search results', async () => {
      const mockZeldaGames = [
        { id: 1, name: 'The Legend of Zelda', developer: 'Nintendo', publisher: 'Nintendo', category: 0 },
        { id: 2, name: 'The Legend of Zelda: Breath of the Wild', developer: 'Nintendo EPD', publisher: 'Nintendo', category: 0 },
        { id: 3, name: 'Zelda Classic', developer: 'Armageddon Games', publisher: 'Fan Project', category: 5 },
        { id: 4, name: 'The Legend of Zelda: Mystery of Solarus', developer: 'Solarus Team', publisher: 'Fan Game', category: 5 },
        { id: 5, name: 'Zelda: Oni Link Begins', developer: 'Community', publisher: 'Homebrew', category: 5 },
        { id: 6, name: 'The Legend of Zelda: Ocarina of Time', developer: 'Nintendo EAD', publisher: 'Nintendo', category: 0 }
      ];

      const filtered = filterFanGamesAndEReaderContent(mockZeldaGames);
      const filteredNames = filtered.map(g => g.name);

      // Should keep official Zelda games
      expect(filteredNames).toContain('The Legend of Zelda');
      expect(filteredNames).toContain('The Legend of Zelda: Breath of the Wild');
      expect(filteredNames).toContain('The Legend of Zelda: Ocarina of Time');

      // Should filter out fan games
      expect(filteredNames).not.toContain('Zelda Classic');
      expect(filteredNames).not.toContain('The Legend of Zelda: Mystery of Solarus');
      expect(filteredNames).not.toContain('Zelda: Oni Link Begins');

      expect(filtered.length).toBe(3); // Only official games
    });
  });

  describe('Metroid Search Filtering', () => {
    it('should filter fan games from Metroid search results', async () => {
      const mockMetroidGames = [
        { id: 1, name: 'Metroid', developer: 'Nintendo R&D1', publisher: 'Nintendo', category: 0 },
        { id: 2, name: 'Super Metroid', developer: 'Nintendo R&D1', publisher: 'Nintendo', category: 0 },
        { id: 3, name: 'Metroid Prime', developer: 'Retro Studios', publisher: 'Nintendo', category: 0 },
        { id: 4, name: 'AM2R: Another Metroid 2 Remake', developer: 'DoctorM64', publisher: 'Fan Project', category: 5 },
        { id: 5, name: 'Metroid Prime 2D', developer: 'Team SCU', publisher: 'Fan Game', category: 5 },
        { id: 6, name: 'Hyper Metroid', developer: 'ROMhacker', publisher: 'ROM Hack', category: 5 },
        { id: 7, name: 'Metroid Dread', developer: 'MercurySteam', publisher: 'Nintendo', category: 0 }
      ];

      const filtered = filterFanGamesAndEReaderContent(mockMetroidGames);
      const filteredNames = filtered.map(g => g.name);

      // Should keep official Metroid games
      expect(filteredNames).toContain('Metroid');
      expect(filteredNames).toContain('Super Metroid');
      expect(filteredNames).toContain('Metroid Prime');
      expect(filteredNames).toContain('Metroid Dread');

      // Should filter out fan games
      expect(filteredNames).not.toContain('AM2R: Another Metroid 2 Remake');
      expect(filteredNames).not.toContain('Metroid Prime 2D');
      expect(filteredNames).not.toContain('Hyper Metroid');

      expect(filtered.length).toBe(4); // Only official games
    });
  });

  describe('Pokemon Search Filtering', () => {
    it('should filter fan games from Pokemon search results', async () => {
      const mockPokemonGames = [
        { id: 1, name: 'Pokemon Red', developer: 'Game Freak', publisher: 'Nintendo', category: 0 },
        { id: 2, name: 'Pokemon Blue', developer: 'Game Freak', publisher: 'Nintendo', category: 0 },
        { id: 3, name: 'Pokemon Uranium', developer: 'JV and Involuntary Twitch', publisher: 'Fan Made', category: 0 },
        { id: 4, name: 'Pokemon Insurgence', developer: 'thesuzerain', publisher: 'Community', category: 0 },
        { id: 5, name: 'Pokemon Prism', developer: 'Koolboyman', publisher: 'ROM Hack', category: 5 },
        { id: 6, name: 'Pokemon Scarlet', developer: 'Game Freak', publisher: 'Nintendo', category: 0 },
        { id: 7, name: 'Pokémon-e Trading Card Game', developer: 'Nintendo', publisher: 'Nintendo', category: 0 }
      ];

      const filtered = filterFanGamesAndEReaderContent(mockPokemonGames);
      const filteredNames = filtered.map(g => g.name);

      // Should keep official Pokemon games
      expect(filteredNames).toContain('Pokemon Red');
      expect(filteredNames).toContain('Pokemon Blue');
      expect(filteredNames).toContain('Pokemon Scarlet');

      // Should filter out fan games
      expect(filteredNames).not.toContain('Pokemon Uranium');
      expect(filteredNames).not.toContain('Pokemon Insurgence');
      expect(filteredNames).not.toContain('Pokemon Prism');

      // Should filter out e-reader content
      expect(filteredNames).not.toContain('Pokémon-e Trading Card Game');

      expect(filtered.length).toBe(3); // Only official non-e-reader games
    });
  });

  describe('Mixed Franchise Results', () => {
    it('should handle mixed franchise results correctly', async () => {
      const mixedGames = [
        // Official games
        { id: 1, name: 'Super Mario Bros.', developer: 'Nintendo', publisher: 'Nintendo', category: 0 },
        { id: 2, name: 'The Legend of Zelda', developer: 'Nintendo', publisher: 'Nintendo', category: 0 },
        { id: 3, name: 'Metroid', developer: 'Nintendo R&D1', publisher: 'Nintendo', category: 0 },
        { id: 4, name: 'Sonic the Hedgehog', developer: 'Sonic Team', publisher: 'Sega', category: 0 },
        
        // Fan games
        { id: 5, name: 'Super Mario Bros. X', developer: 'Redigit', publisher: 'Fan Game', category: 5 },
        { id: 6, name: 'Zelda Classic', developer: 'Community', publisher: 'Fan Project', category: 5 },
        { id: 7, name: 'AM2R', developer: 'DoctorM64', publisher: 'Fan Made', category: 5 },
        { id: 8, name: 'Sonic Before the Sequel', developer: 'LakeFeperd', publisher: 'Fangame', category: 5 },
        
        // E-Reader content
        { id: 9, name: 'Mario Party-e', developer: 'Nintendo', publisher: 'Nintendo', category: 0 },
        { id: 10, name: 'Excitebike-e', developer: 'Nintendo', publisher: 'Nintendo', category: 0 }
      ];

      const filtered = filterFanGamesAndEReaderContent(mixedGames);
      const filteredNames = filtered.map(g => g.name);

      // Should only have official non-e-reader games
      expect(filtered.length).toBe(4);
      expect(filteredNames).toContain('Super Mario Bros.');
      expect(filteredNames).toContain('The Legend of Zelda');
      expect(filteredNames).toContain('Metroid');
      expect(filteredNames).toContain('Sonic the Hedgehog');

      // Verify all fan games and e-reader content filtered
      const fanGameNames = ['Super Mario Bros. X', 'Zelda Classic', 'AM2R', 'Sonic Before the Sequel'];
      const eReaderNames = ['Mario Party-e', 'Excitebike-e'];
      
      fanGameNames.forEach(name => {
        expect(filteredNames).not.toContain(name);
      });
      
      eReaderNames.forEach(name => {
        expect(filteredNames).not.toContain(name);
      });
    });
  });
});