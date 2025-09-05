import { 
  calculateGameQuality, 
  findBestOriginalVersion, 
  prioritizeOriginalVersions,
  sortByGameQuality 
} from '../utils/gameQualityScoring';

describe('Game Quality Scoring System', () => {
  describe('calculateGameQuality', () => {
    it('should give high scores to high-rated original games', () => {
      const officialZeldaGame = {
        id: 1030,
        name: 'The Legend of Zelda: Majora\'s Mask',
        category: 0, // Main game
        rating: 86.8,
        rating_count: 786,
        total_rating: 88.4,
        total_rating_count: 786,
        first_release_date: 956793600, // 2000
        // No parent_game = original
        platforms: [{ id: 4, name: 'Nintendo 64' }],
        involved_companies: [
          { company: { name: 'Nintendo' }, publisher: true },
          { company: { name: 'Nintendo EAD' }, developer: true }
        ]
      };

      const quality = calculateGameQuality(officialZeldaGame);
      
      expect(quality.score).toBeGreaterThan(200); // Should get high score
      expect(quality.isHighQuality).toBe(true);
      expect(quality.isOriginal).toBe(true);
      expect(quality.isProbablyMod).toBe(false);
      expect(quality.reasons).toContain('High IGDB rating (86.8)');
      expect(quality.reasons).toContain('Original game (not a remake/port)');
      expect(quality.reasons).toContain('Main game category');
    });

    it('should heavily penalize mod content (Category 5)', () => {
      const modGame = {
        id: 172479,
        name: 'Majora\'s Mask Redux',
        category: 5, // Mod
        parent_game: 1030,
        platforms: [{ id: 4, name: 'Nintendo 64' }],
        involved_companies: [
          { company: { name: 'Maroc' }, developer: true }
        ]
      };

      const quality = calculateGameQuality(modGame);
      
      expect(quality.score).toBeLessThan(-100); // Heavy penalty for mods
      expect(quality.isHighQuality).toBe(false);
      expect(quality.isProbablyMod).toBe(true);
      expect(quality.reasons).toContain('IGDB Category 5 (Mod)');
    });

    it('should detect fan content by keywords and developers', () => {
      const fanGame = {
        id: 99999,
        name: 'Super Mario Bros ROM Hack',
        category: 0, // Deceptive - not marked as mod
        involved_companies: [
          { company: { name: 'Fan Developer' }, developer: true },
          { company: { name: 'Homebrew' }, publisher: true }
        ]
      };

      const quality = calculateGameQuality(fanGame);
      
      expect(quality.isProbablyMod).toBe(true);
      expect(quality.reasons).toContain('Detected as mod/fan content');
      expect(quality.score).toBeLessThan(0); // Should be negative due to mod detection
    });

    it('should penalize remasters less than mods', () => {
      const remasterGame = {
        id: 8593,
        name: 'The Legend of Zelda: Majora\'s Mask 3D',
        category: 8, // Port/Remaster
        rating: 90.4,
        rating_count: 169,
        parent_game: 1030, // Remake of original
        platforms: [{ id: 37, name: 'Nintendo 3DS' }],
        involved_companies: [
          { company: { name: 'Nintendo' }, publisher: true },
          { company: { name: 'Grezzo' }, developer: true }
        ]
      };

      const quality = calculateGameQuality(remasterGame);
      
      expect(quality.score).toBeGreaterThan(50); // Still positive, but penalized
      expect(quality.isOriginal).toBe(false);
      expect(quality.isProbablyMod).toBe(false);
      expect(quality.reasons).toContain('Remaster/special edition (lower priority than original)');
    });
  });

  describe('findBestOriginalVersion', () => {
    it('should prefer original N64 Majora\'s Mask over 3DS remake', () => {
      const games = [
        // 3DS Remake
        {
          id: 8593,
          name: 'The Legend of Zelda: Majora\'s Mask 3D',
          category: 8,
          rating: 90.4,
          parent_game: 1030
        },
        // Original N64 version
        {
          id: 1030,
          name: 'The Legend of Zelda: Majora\'s Mask',
          category: 0,
          rating: 86.8,
          // No parent_game = original
        }
      ];

      const best = findBestOriginalVersion(games);
      
      expect(best).not.toBeNull();
      expect(best!.id).toBe(1030); // Should pick original N64 version
      expect(best!.name).toBe('The Legend of Zelda: Majora\'s Mask');
    });

    it('should exclude obvious mods from consideration', () => {
      const games = [
        // Mod/fan content
        {
          id: 172479,
          name: 'Majora\'s Mask Redux',
          category: 5,
          parent_game: 1030
        },
        // Randomizer mod
        {
          id: 241860,
          name: 'The Legend of Zelda: Majora\'s Mask Randomizer',
          category: 5,
          parent_game: 1030
        }
      ];

      const best = findBestOriginalVersion(games);
      
      expect(best).toBeNull(); // Should find no acceptable original
    });
  });

  describe('prioritizeOriginalVersions', () => {
    it('should reorder Wind Waker results to show original first', () => {
      const games = [
        // HD version (appears first in IGDB)
        {
          id: 2276,
          name: 'The Legend of Zelda: The Wind Waker HD',
          category: 9, // Port
          parent_game: 1033,
          rating: 90.4
        },
        // Original GameCube version (appears later)
        {
          id: 1033,
          name: 'The Legend of Zelda: The Wind Waker',
          category: 0, // Main game
          rating: 87.3
          // No parent_game = original
        }
      ];

      const prioritized = prioritizeOriginalVersions(games);
      
      expect(prioritized[0].id).toBe(1033); // Original should be first
      expect(prioritized[0].name).toBe('The Legend of Zelda: The Wind Waker');
      expect(prioritized[1].id).toBe(2276); // HD version second
    });

    it('should handle games with no clear original', () => {
      const games = [
        {
          id: 1,
          name: 'Random Game A',
          category: 0
        },
        {
          id: 2,
          name: 'Random Game B',
          category: 0
        }
      ];

      const prioritized = prioritizeOriginalVersions(games);
      
      expect(prioritized).toHaveLength(2); // Should keep all games
      expect(prioritized.map(g => g.id)).toEqual(expect.arrayContaining([1, 2]));
    });
  });

  describe('sortByGameQuality', () => {
    it('should sort high quality games before low quality games', () => {
      const games = [
        // Low quality mod
        {
          id: 1,
          name: 'Some Random Mod',
          category: 5,
          rating: 60
        },
        // High quality original
        {
          id: 2,
          name: 'Classic Zelda Game',
          category: 0,
          rating: 95,
          rating_count: 1000
        },
        // Medium quality port
        {
          id: 3,
          name: 'Zelda HD Remaster',
          category: 8,
          rating: 85,
          parent_game: 2
        }
      ];

      const sorted = sortByGameQuality(games);
      
      expect(sorted[0].id).toBe(2); // High quality original first
      expect(sorted[1].id).toBe(3); // Medium quality port second
      expect(sorted[2].id).toBe(1); // Low quality mod last
    });
  });

  describe('Integration with existing systems', () => {
    it('should not interfere with copyright protection', () => {
      const nintendoMod = {
        id: 1,
        name: 'Super Mario Bros ROM Hack',
        category: 5,
        rating: 80, // Even if high rated
        involved_companies: [
          { company: { name: 'Fan Developer' }, developer: true }
        ]
      };

      const quality = calculateGameQuality(nintendoMod);
      
      // Quality scoring should detect this as problematic
      expect(quality.isProbablyMod).toBe(true);
      expect(quality.isHighQuality).toBe(false);
      expect(quality.score).toBeLessThan(0); // Should be negative
      
      // Copyright protection should still filter this separately
    });

    it('should preserve flagship game identification', () => {
      const flagshipGame = {
        id: 1030,
        name: 'The Legend of Zelda: Majora\'s Mask',
        category: 0,
        rating: 86.8,
        rating_count: 786,
        first_release_date: 956793600
      };

      const quality = calculateGameQuality(flagshipGame);
      
      expect(quality.isHighQuality).toBe(true);
      expect(quality.isOriginal).toBe(true);
      expect(quality.score).toBeGreaterThan(200);
      
      // This should work alongside flagship detection, not replace it
    });
  });
});