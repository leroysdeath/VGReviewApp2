import { AdvancedSearchCoordination } from '../services/advancedSearchCoordination';
import { filterFanGamesAndEReaderContent } from '../utils/contentProtectionFilter';

describe('Search Integration - Fan Game & E-Reader Filtering', () => {
  let searchCoordination: AdvancedSearchCoordination;

  beforeEach(() => {
    searchCoordination = new AdvancedSearchCoordination();
  });

  describe('Advanced Search Coordination Filtering', () => {
    it('should filter fan games and e-reader content from search results', async () => {
      // Mock search results with mixed content
      const mockResults = [
        { id: 1, name: 'Super Mario Bros.', developer: 'Nintendo', publisher: 'Nintendo', category: 0, source: 'database' as const },
        { id: 2, name: 'Super Mario Bros. X', developer: 'Redigit', publisher: 'Fan Game', category: 5, source: 'database' as const },
        { id: 3, name: 'Mario Party-e', developer: 'Nintendo', publisher: 'Nintendo', category: 0, summary: 'e-Reader card game', source: 'database' as const },
        { id: 4, name: 'Super Mario Odyssey', developer: 'Nintendo EPD', publisher: 'Nintendo', category: 0, source: 'database' as const },
      ];

      // Test the filter directly
      const filtered = filterFanGamesAndEReaderContent(mockResults);
      const filteredNames = filtered.map(g => g.name);

      // Should keep official games
      expect(filteredNames).toContain('Super Mario Bros.');
      expect(filteredNames).toContain('Super Mario Odyssey');

      // Should filter out fan games and e-reader content
      expect(filteredNames).not.toContain('Super Mario Bros. X');
      expect(filteredNames).not.toContain('Mario Party-e');

      expect(filtered.length).toBe(2);
    });

    it('should filter Pokemon fan games', async () => {
      const mockResults = [
        { id: 1, name: 'Pokemon Red', developer: 'Game Freak', publisher: 'Nintendo', category: 0, source: 'database' as const },
        { id: 2, name: 'Pokemon Uranium', developer: 'JV', publisher: 'Fan Made', category: 0, source: 'database' as const },
        { id: 3, name: 'Pokemon Insurgence', developer: 'thesuzerain', publisher: 'Community', category: 0, source: 'database' as const },
        { id: 4, name: 'Pokémon-e Trading Card Game', developer: 'Nintendo', publisher: 'Nintendo', category: 0, source: 'database' as const },
        { id: 5, name: 'Pokemon Scarlet', developer: 'Game Freak', publisher: 'Nintendo', category: 0, source: 'database' as const },
      ];

      const filtered = filterFanGamesAndEReaderContent(mockResults);
      const filteredNames = filtered.map(g => g.name);

      expect(filteredNames).toContain('Pokemon Red');
      expect(filteredNames).toContain('Pokemon Scarlet');
      expect(filteredNames).not.toContain('Pokemon Uranium');
      expect(filteredNames).not.toContain('Pokemon Insurgence');
      expect(filteredNames).not.toContain('Pokémon-e Trading Card Game');

      expect(filtered.length).toBe(2);
    });

    it('should filter Metroid fan games including AM2R', async () => {
      const mockResults = [
        { id: 1, name: 'Metroid', developer: 'Nintendo R&D1', publisher: 'Nintendo', category: 0, source: 'database' as const },
        { id: 2, name: 'Super Metroid', developer: 'Nintendo R&D1', publisher: 'Nintendo', category: 0, source: 'database' as const },
        { id: 3, name: 'AM2R: Another Metroid 2 Remake', developer: 'DoctorM64', publisher: 'Fan Project', category: 5, source: 'database' as const },
        { id: 4, name: 'Metroid Prime 2D', developer: 'Team SCU', publisher: 'Fan Game', category: 5, source: 'database' as const },
        { id: 5, name: 'Metroid Dread', developer: 'MercurySteam', publisher: 'Nintendo', category: 0, source: 'database' as const },
      ];

      const filtered = filterFanGamesAndEReaderContent(mockResults);
      const filteredNames = filtered.map(g => g.name);

      expect(filteredNames).toContain('Metroid');
      expect(filteredNames).toContain('Super Metroid');
      expect(filteredNames).toContain('Metroid Dread');
      expect(filteredNames).not.toContain('AM2R: Another Metroid 2 Remake');
      expect(filteredNames).not.toContain('Metroid Prime 2D');

      expect(filtered.length).toBe(3);
    });

    it('should filter Zelda fan games', async () => {
      const mockResults = [
        { id: 1, name: 'The Legend of Zelda', developer: 'Nintendo', publisher: 'Nintendo', category: 0, source: 'database' as const },
        { id: 2, name: 'Zelda Classic', developer: 'Armageddon Games', publisher: 'Fan Project', category: 5, source: 'database' as const },
        { id: 3, name: 'The Legend of Zelda: Mystery of Solarus', developer: 'Solarus Team', publisher: 'Fan Game', category: 5, source: 'database' as const },
        { id: 4, name: 'The Legend of Zelda: Breath of the Wild', developer: 'Nintendo EPD', publisher: 'Nintendo', category: 0, source: 'database' as const },
        { id: 5, name: 'Zelda: The Wand of Gamelon', developer: 'Animation Magic', publisher: 'Philips', category: 0, source: 'database' as const },
      ];

      const filtered = filterFanGamesAndEReaderContent(mockResults);
      const filteredNames = filtered.map(g => g.name);

      expect(filteredNames).toContain('The Legend of Zelda');
      expect(filteredNames).toContain('The Legend of Zelda: Breath of the Wild');
      expect(filteredNames).toContain('Zelda: The Wand of Gamelon'); // Official, even if bad
      expect(filteredNames).not.toContain('Zelda Classic');
      expect(filteredNames).not.toContain('The Legend of Zelda: Mystery of Solarus');

      expect(filtered.length).toBe(3);
    });
  });

  describe('Navbar Search Integration', () => {
    it('should filter e-reader content in navbar dropdown', async () => {
      const mockResults = [
        { id: 1, name: 'Super Mario Advance 4: Super Mario Bros. 3', developer: 'Nintendo', publisher: 'Nintendo', category: 0, source: 'database' as const },
        { id: 2, name: 'Super Mario Advance 4: Super Mario Bros. 3-e', developer: 'Nintendo', publisher: 'Nintendo', category: 1, summary: 'E-Reader card levels', source: 'database' as const },
        { id: 3, name: 'Excitebike-e', developer: 'Nintendo', publisher: 'Nintendo', category: 0, source: 'database' as const },
        { id: 4, name: 'Donkey Kong 3-e', developer: 'Nintendo', publisher: 'Nintendo', category: 0, summary: 'e-Reader card game', source: 'database' as const },
      ];

      const filtered = filterFanGamesAndEReaderContent(mockResults);
      const filteredNames = filtered.map(g => g.name);

      expect(filteredNames).toContain('Super Mario Advance 4: Super Mario Bros. 3');
      expect(filteredNames).not.toContain('Super Mario Advance 4: Super Mario Bros. 3-e');
      expect(filteredNames).not.toContain('Excitebike-e');
      expect(filteredNames).not.toContain('Donkey Kong 3-e');

      expect(filtered.length).toBe(1);
    });

    it('should detect fan games by publisher patterns', async () => {
      const mockResults = [
        { id: 1, name: 'Sonic the Hedgehog', developer: 'Sonic Team', publisher: 'Sega', category: 0, source: 'database' as const },
        { id: 2, name: 'Sonic Before the Sequel', developer: 'LakeFeperd', publisher: 'Fangame', category: 5, source: 'database' as const },
        { id: 3, name: 'Sonic After the Sequel', developer: 'LakeFeperd', publisher: 'Fan-made', category: 5, source: 'database' as const },
        { id: 4, name: 'Freedom Planet', developer: 'GalaxyTrail', publisher: 'GalaxyTrail', category: 0, summary: 'Sonic-inspired but original', source: 'database' as const },
      ];

      const filtered = filterFanGamesAndEReaderContent(mockResults);
      const filteredNames = filtered.map(g => g.name);

      expect(filteredNames).toContain('Sonic the Hedgehog');
      expect(filteredNames).toContain('Freedom Planet'); // Original game, not fan game
      expect(filteredNames).not.toContain('Sonic Before the Sequel');
      expect(filteredNames).not.toContain('Sonic After the Sequel');

      expect(filtered.length).toBe(2);
    });
  });

  describe('Search Results Page Integration', () => {
    it('should handle mixed franchise search results', async () => {
      const mockResults = [
        // Official Mario
        { id: 1, name: 'Super Mario Bros.', developer: 'Nintendo', publisher: 'Nintendo', category: 0, source: 'database' as const },
        { id: 2, name: 'Super Mario World', developer: 'Nintendo EAD', publisher: 'Nintendo', category: 0, source: 'database' as const },
        
        // Mario fan games
        { id: 3, name: 'Super Mario Bros. X', developer: 'Redigit', publisher: 'Fan Game', category: 5, source: 'database' as const },
        { id: 4, name: 'Mario Forever', developer: 'Buziol Games', publisher: 'Buziol', category: 5, source: 'database' as const },
        
        // Official Zelda
        { id: 5, name: 'The Legend of Zelda', developer: 'Nintendo', publisher: 'Nintendo', category: 0, source: 'database' as const },
        
        // Zelda fan game
        { id: 6, name: 'Zelda Classic', developer: 'Community', publisher: 'Fan Project', category: 5, source: 'database' as const },
        
        // E-Reader content
        { id: 7, name: 'Mario Party-e', developer: 'Nintendo', publisher: 'Nintendo', category: 0, summary: 'e-Reader card game', source: 'database' as const },
      ];

      const filtered = filterFanGamesAndEReaderContent(mockResults);
      const filteredNames = filtered.map(g => g.name);

      // Should only have official non-e-reader games
      expect(filteredNames).toContain('Super Mario Bros.');
      expect(filteredNames).toContain('Super Mario World');
      expect(filteredNames).toContain('The Legend of Zelda');
      
      // Should not have fan games or e-reader content
      expect(filteredNames).not.toContain('Super Mario Bros. X');
      expect(filteredNames).not.toContain('Mario Forever');
      expect(filteredNames).not.toContain('Zelda Classic');
      expect(filteredNames).not.toContain('Mario Party-e');

      expect(filtered.length).toBe(3);
    });

    it('should correctly identify franchise games from unknown publishers', async () => {
      const mockResults = [
        { id: 1, name: 'Super Mario 64', developer: 'Nintendo EAD', publisher: 'Nintendo', category: 0, source: 'database' as const },
        { id: 2, name: 'Mario Reborn', developer: 'Unknown Studio', publisher: '', category: 0, source: 'database' as const },
        { id: 3, name: 'Mario Revolution', developer: 'IndieGames', publisher: 'Indie', category: 0, source: 'database' as const },
        { id: 4, name: 'Paper Mario', developer: 'Intelligent Systems', publisher: 'Nintendo', category: 0, source: 'database' as const },
      ];

      const filtered = filterFanGamesAndEReaderContent(mockResults);
      const filteredNames = filtered.map(g => g.name);

      expect(filteredNames).toContain('Super Mario 64');
      expect(filteredNames).toContain('Paper Mario');
      expect(filteredNames).not.toContain('Mario Reborn'); // Unknown publisher
      expect(filteredNames).not.toContain('Mario Revolution'); // Indie publisher with "revolution" in name

      expect(filtered.length).toBe(2);
    });
  });
});