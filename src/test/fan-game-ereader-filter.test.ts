import { filterFanGamesAndEReaderContent } from '../utils/contentProtectionFilter';

describe('Fan Game and E-Reader Content Filtering', () => {
  describe('Fan Game Filtering', () => {
    it('should filter out Mario fan games and ROM hacks', () => {
      const games = [
        {
          id: 1,
          name: 'Super Mario Bros.',
          developer: 'Nintendo',
          publisher: 'Nintendo',
          category: 0
        },
        {
          id: 2,
          name: 'Super Mario Bros. X',
          developer: 'Redigit',
          publisher: 'Fan Game',
          category: 5,
          summary: 'A fan-made Mario game'
        },
        {
          id: 3,
          name: 'Mario Forever',
          developer: 'Buziol Games',
          publisher: 'Buziol Games',
          category: 5,
          summary: 'Unofficial Mario remake'
        },
        {
          id: 4,
          name: 'Another Mario Bros',
          developer: 'Community',
          publisher: 'Homebrew',
          category: 5
        },
        {
          id: 5,
          name: 'Super Mario Odyssey',
          developer: 'Nintendo EPD',
          publisher: 'Nintendo',
          category: 0
        }
      ];

      const filtered = filterFanGamesAndEReaderContent(games);
      const filteredNames = filtered.map(g => g.name);

      expect(filteredNames).toContain('Super Mario Bros.');
      expect(filteredNames).toContain('Super Mario Odyssey');
      expect(filteredNames).not.toContain('Super Mario Bros. X');
      expect(filteredNames).not.toContain('Mario Forever');
      expect(filteredNames).not.toContain('Another Mario Bros');
    });

    it('should filter out Zelda fan games', () => {
      const games = [
        {
          id: 1,
          name: 'The Legend of Zelda',
          developer: 'Nintendo',
          publisher: 'Nintendo',
          category: 0
        },
        {
          id: 2,
          name: 'Zelda Classic',
          developer: 'Armageddon Games',
          publisher: 'Fan Project',
          category: 5,
          summary: 'Fan-made Zelda engine'
        },
        {
          id: 3,
          name: 'The Legend of Zelda: Mystery of Solarus',
          developer: 'Solarus Team',
          publisher: 'Fan Game',
          category: 5
        },
        {
          id: 4,
          name: 'Zelda: The Wand of Gamelon',
          developer: 'Animation Magic',
          publisher: 'Philips',
          category: 0
        }
      ];

      const filtered = filterFanGamesAndEReaderContent(games);
      const filteredNames = filtered.map(g => g.name);

      expect(filteredNames).toContain('The Legend of Zelda');
      expect(filteredNames).toContain('Zelda: The Wand of Gamelon'); // Official, even if bad
      expect(filteredNames).not.toContain('Zelda Classic');
      expect(filteredNames).not.toContain('The Legend of Zelda: Mystery of Solarus');
    });

    it('should filter out Metroid fan games and AM2R', () => {
      const games = [
        {
          id: 1,
          name: 'Metroid',
          developer: 'Nintendo R&D1',
          publisher: 'Nintendo',
          category: 0
        },
        {
          id: 2,
          name: 'AM2R: Another Metroid 2 Remake',
          developer: 'DoctorM64',
          publisher: 'Fan Project',
          category: 5,
          summary: 'Unofficial Metroid II remake'
        },
        {
          id: 3,
          name: 'Metroid Prime 2D',
          developer: 'Team SCU',
          publisher: 'Fan Game',
          category: 5
        },
        {
          id: 4,
          name: 'Super Metroid',
          developer: 'Nintendo R&D1',
          publisher: 'Nintendo',
          category: 0
        }
      ];

      const filtered = filterFanGamesAndEReaderContent(games);
      const filteredNames = filtered.map(g => g.name);

      expect(filteredNames).toContain('Metroid');
      expect(filteredNames).toContain('Super Metroid');
      expect(filteredNames).not.toContain('AM2R: Another Metroid 2 Remake');
      expect(filteredNames).not.toContain('Metroid Prime 2D');
    });

    it('should detect fan games by keywords in name', () => {
      const games = [
        {
          id: 1,
          name: 'Pokemon Red',
          developer: 'Game Freak',
          publisher: 'Nintendo',
          category: 0
        },
        {
          id: 2,
          name: 'Pokemon Uranium',
          developer: 'JV and Involuntary Twitch',
          publisher: 'Fan Made',
          category: 0, // Even if marked as main game
          summary: 'Over 9 years in development'
        },
        {
          id: 3,
          name: 'Pokemon Insurgence',
          developer: 'thesuzerain',
          publisher: 'Community',
          category: 0
        },
        {
          id: 4,
          name: 'Pokemon Prism',
          developer: 'Koolboyman',
          publisher: 'ROM Hack',
          category: 5
        }
      ];

      const filtered = filterFanGamesAndEReaderContent(games);
      const filteredNames = filtered.map(g => g.name);

      expect(filteredNames).toContain('Pokemon Red');
      expect(filteredNames).not.toContain('Pokemon Uranium');
      expect(filteredNames).not.toContain('Pokemon Insurgence');
      expect(filteredNames).not.toContain('Pokemon Prism');
    });

    it('should detect fan games by developer/publisher patterns', () => {
      const games = [
        {
          id: 1,
          name: 'Sonic the Hedgehog',
          developer: 'Sonic Team',
          publisher: 'Sega',
          category: 0
        },
        {
          id: 2,
          name: 'Sonic Before the Sequel',
          developer: 'LakeFeperd',
          publisher: 'Fangame',
          category: 5
        },
        {
          id: 3,
          name: 'Sonic After the Sequel',
          developer: 'LakeFeperd',
          publisher: 'Fan-made',
          category: 5
        },
        {
          id: 4,
          name: 'Freedom Planet',
          developer: 'GalaxyTrail',
          publisher: 'GalaxyTrail',
          category: 0,
          summary: 'Sonic-inspired but original game'
        }
      ];

      const filtered = filterFanGamesAndEReaderContent(games);
      const filteredNames = filtered.map(g => g.name);

      expect(filteredNames).toContain('Sonic the Hedgehog');
      expect(filteredNames).toContain('Freedom Planet'); // Original game, not fan game
      expect(filteredNames).not.toContain('Sonic Before the Sequel');
      expect(filteredNames).not.toContain('Sonic After the Sequel');
    });
  });

  describe('E-Reader Content Filtering', () => {
    it('should filter out e-reader card content', () => {
      const games = [
        {
          id: 1,
          name: 'Super Mario Advance 4: Super Mario Bros. 3',
          developer: 'Nintendo',
          publisher: 'Nintendo',
          category: 0
        },
        {
          id: 2,
          name: 'Super Mario Advance 4: Super Mario Bros. 3-e',
          developer: 'Nintendo',
          publisher: 'Nintendo',
          category: 1, // DLC
          summary: 'E-Reader card levels for Super Mario Advance 4'
        },
        {
          id: 3,
          name: 'Mario Party-e',
          developer: 'Nintendo',
          publisher: 'Nintendo',
          category: 0,
          summary: 'Card game for the e-Reader'
        },
        {
          id: 4,
          name: 'Pokémon-e Trading Card Game',
          developer: 'Nintendo',
          publisher: 'Nintendo',
          category: 0
        }
      ];

      const filtered = filterFanGamesAndEReaderContent(games);
      const filteredNames = filtered.map(g => g.name);

      expect(filteredNames).toContain('Super Mario Advance 4: Super Mario Bros. 3');
      expect(filteredNames).not.toContain('Super Mario Advance 4: Super Mario Bros. 3-e');
      expect(filteredNames).not.toContain('Mario Party-e');
      expect(filteredNames).not.toContain('Pokémon-e Trading Card Game');
    });

    it('should filter e-reader content by summary keywords', () => {
      const games = [
        {
          id: 1,
          name: 'Animal Crossing',
          developer: 'Nintendo',
          publisher: 'Nintendo',
          category: 0
        },
        {
          id: 2,
          name: 'Animal Crossing Card Series',
          developer: 'Nintendo',
          publisher: 'Nintendo',
          category: 0,
          summary: 'E-Reader cards featuring Animal Crossing characters'
        },
        {
          id: 3,
          name: 'Donkey Kong Jr. Math',
          developer: 'Nintendo',
          publisher: 'Nintendo',
          category: 0,
          summary: 'Classic NES game, also available as e-Reader card'
        },
        {
          id: 4,
          name: 'NES Classic Series',
          developer: 'Nintendo',
          publisher: 'Nintendo',
          category: 0,
          summary: 'Game Boy Advance port, not e-reader content'
        }
      ];

      const filtered = filterFanGamesAndEReaderContent(games);
      const filteredNames = filtered.map(g => g.name);

      expect(filteredNames).toContain('Animal Crossing');
      expect(filteredNames).toContain('NES Classic Series');
      expect(filteredNames).not.toContain('Animal Crossing Card Series');
      // Donkey Kong Jr. Math should be kept even if summary mentions e-reader
      expect(filteredNames).toContain('Donkey Kong Jr. Math');
    });

    it('should filter micro-games and mini-games from e-reader', () => {
      const games = [
        {
          id: 1,
          name: 'WarioWare, Inc.: Mega Microgame$!',
          developer: 'Nintendo',
          publisher: 'Nintendo',
          category: 0
        },
        {
          id: 2,
          name: 'Manhole-e',
          developer: 'Nintendo',
          publisher: 'Nintendo',
          category: 0,
          summary: 'Game & Watch e-Reader version'
        },
        {
          id: 3,
          name: 'Donkey Kong 3-e',
          developer: 'Nintendo',
          publisher: 'Nintendo',
          category: 0,
          summary: 'e-Reader card game'
        },
        {
          id: 4,
          name: 'Excitebike-e',
          developer: 'Nintendo',
          publisher: 'Nintendo',
          category: 0
        }
      ];

      const filtered = filterFanGamesAndEReaderContent(games);
      const filteredNames = filtered.map(g => g.name);

      expect(filteredNames).toContain('WarioWare, Inc.: Mega Microgame$!');
      expect(filteredNames).not.toContain('Manhole-e');
      expect(filteredNames).not.toContain('Donkey Kong 3-e');
      expect(filteredNames).not.toContain('Excitebike-e');
    });
  });

  describe('Combined Filtering', () => {
    it('should filter both fan games and e-reader content in mixed results', () => {
      const games = [
        // Official games
        { id: 1, name: 'Super Mario Bros.', developer: 'Nintendo', publisher: 'Nintendo', category: 0 },
        { id: 2, name: 'The Legend of Zelda', developer: 'Nintendo', publisher: 'Nintendo', category: 0 },
        { id: 3, name: 'Metroid Prime', developer: 'Retro Studios', publisher: 'Nintendo', category: 0 },
        
        // Fan games
        { id: 4, name: 'Super Mario Bros. X', developer: 'Redigit', publisher: 'Fan Game', category: 5 },
        { id: 5, name: 'Zelda Classic', developer: 'Community', publisher: 'Fan Project', category: 5 },
        { id: 6, name: 'AM2R', developer: 'DoctorM64', publisher: 'Fan Made', category: 5 },
        
        // E-Reader content
        { id: 7, name: 'Mario Party-e', developer: 'Nintendo', publisher: 'Nintendo', category: 0, summary: 'e-Reader card game' },
        { id: 8, name: 'Pokémon-e TCG', developer: 'Nintendo', publisher: 'Nintendo', category: 0 },
        { id: 9, name: 'Excitebike-e', developer: 'Nintendo', publisher: 'Nintendo', category: 0 },
        
        // More official games
        { id: 10, name: 'Super Mario Odyssey', developer: 'Nintendo EPD', publisher: 'Nintendo', category: 0 },
        { id: 11, name: 'Zelda: Breath of the Wild', developer: 'Nintendo EPD', publisher: 'Nintendo', category: 0 }
      ];

      const filtered = filterFanGamesAndEReaderContent(games);
      const filteredNames = filtered.map(g => g.name);

      // Should keep official games
      expect(filteredNames).toContain('Super Mario Bros.');
      expect(filteredNames).toContain('The Legend of Zelda');
      expect(filteredNames).toContain('Metroid Prime');
      expect(filteredNames).toContain('Super Mario Odyssey');
      expect(filteredNames).toContain('Zelda: Breath of the Wild');

      // Should filter fan games
      expect(filteredNames).not.toContain('Super Mario Bros. X');
      expect(filteredNames).not.toContain('Zelda Classic');
      expect(filteredNames).not.toContain('AM2R');

      // Should filter e-reader content
      expect(filteredNames).not.toContain('Mario Party-e');
      expect(filteredNames).not.toContain('Pokémon-e TCG');
      expect(filteredNames).not.toContain('Excitebike-e');

      // Verify we're actually filtering things
      expect(filtered.length).toBeLessThan(games.length);
      expect(filtered.length).toBe(5); // Only the 5 official non-e-reader games
    });
  });
});