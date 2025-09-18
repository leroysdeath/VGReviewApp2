/**
 * Test suite to validate filtering of collections, ports, and remasters
 * 
 * Ensures that:
 * 1. Collections (Category 3) are filtered out
 * 2. Ports (Category 11) are filtered out
 * 3. Remasters (Category 9) are filtered out
 * 4. Packs (Category 13) are filtered out
 * 5. Name-based collection detection works
 * 6. Original games are preserved
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { filterProtectedContent } from '../utils/contentProtectionFilter';

describe('Collections, Ports, and Remasters Filtering', () => {
  // Mock game data for comprehensive testing
  const mockGames = [
    // Original games that should be kept
    {
      id: 1,
      name: 'Super Mario Bros.',
      developer: 'Nintendo EAD',
      publisher: 'Nintendo',
      category: 0, // Main game
      igdb_rating: 85,
      release_date: '1985-09-13'
    },
    {
      id: 2,
      name: 'The Legend of Zelda',
      developer: 'Nintendo EAD',
      publisher: 'Nintendo',
      category: 0, // Main game
      igdb_rating: 90,
      release_date: '1986-02-21'
    },
    {
      id: 3,
      name: 'Final Fantasy VII',
      developer: 'Square',
      publisher: 'Square Enix',
      category: 0, // Main game
      igdb_rating: 92,
      release_date: '1997-01-31'
    },
    
    // Collections that should be filtered (Category 3)
    {
      id: 4,
      name: 'Super Mario All-Stars',
      developer: 'Nintendo EAD',
      publisher: 'Nintendo',
      category: 3, // Bundle/Collection
      igdb_rating: 88,
      summary: 'A collection of remastered Super Mario Bros. games'
    },
    {
      id: 5,
      name: 'The Legend of Zelda: Collector\'s Edition',
      developer: 'Nintendo',
      publisher: 'Nintendo',
      category: 3, // Bundle/Collection
      igdb_rating: 85
    },
    
    // Ports that should be filtered (Category 11)
    {
      id: 6,
      name: 'Super Mario 64 (Nintendo Switch)',
      developer: 'Nintendo',
      publisher: 'Nintendo',
      category: 11, // Port
      igdb_rating: 94,
      summary: 'Port of the classic N64 game to Nintendo Switch'
    },
    {
      id: 7,
      name: 'Final Fantasy VII (PC)',
      developer: 'Square Enix',
      publisher: 'Square Enix',
      category: 11, // Port
      igdb_rating: 90
    },
    
    // Remasters that should be filtered (Category 9)
    {
      id: 8,
      name: 'The Legend of Zelda: Wind Waker HD',
      developer: 'Nintendo',
      publisher: 'Nintendo',
      category: 9, // Remaster
      igdb_rating: 92,
      summary: 'HD remaster of the GameCube classic'
    },
    {
      id: 9,
      name: 'Final Fantasy X HD Remaster',
      developer: 'Square Enix',
      publisher: 'Square Enix',
      category: 9, // Remaster
      igdb_rating: 85
    },
    
    // Packs that should be filtered (Category 13)
    {
      id: 10,
      name: 'Mario + Rabbids Kingdom Battle Gold Edition',
      developer: 'Ubisoft',
      publisher: 'Ubisoft',
      category: 13, // Pack
      igdb_rating: 85
    },
    
    // Collections detected by name (even if category is 0)
    {
      id: 11,
      name: 'Mega Man Legacy Collection',
      developer: 'Capcom',
      publisher: 'Capcom',
      category: 0, // Marked as main game but name indicates collection
      igdb_rating: 82
    },
    {
      id: 12,
      name: 'Castlevania Anniversary Collection',
      developer: 'Konami',
      publisher: 'Konami',
      category: 0, // Marked as main game but name indicates collection
      igdb_rating: 80
    },
    {
      id: 13,
      name: 'Street Fighter 30th Anniversary Collection',
      developer: 'Capcom',
      publisher: 'Capcom',
      category: 0,
      igdb_rating: 75
    },
    
    // Remasters detected by name
    {
      id: 14,
      name: 'Shadow of the Colossus Remastered',
      developer: 'Bluepoint Games',
      publisher: 'Sony',
      category: 0, // Marked as main game but name indicates remaster
      igdb_rating: 91
    },
    {
      id: 15,
      name: 'The Last of Us Remastered',
      developer: 'Naughty Dog',
      publisher: 'Sony',
      category: 0,
      igdb_rating: 95
    },
    
    // Edge cases - games with similar words but not collections
    {
      id: 16,
      name: 'Super Mario 3D All-Stars', // Should be filtered (All-Stars is a collection indicator)
      developer: 'Nintendo',
      publisher: 'Nintendo',
      category: 0,
      igdb_rating: 83
    },
    {
      id: 17,
      name: 'Sonic Origins', // Not explicitly a collection word, should be kept
      developer: 'Sega',
      publisher: 'Sega',
      category: 0, // Main game
      igdb_rating: 70
    },
    
    // Definitive and special editions
    {
      id: 18,
      name: 'Persona 5 Royal',
      developer: 'Atlus',
      publisher: 'Sega',
      category: 0, // Enhanced version but not marked as collection
      igdb_rating: 95
    },
    {
      id: 19,
      name: 'The Witcher 3: Wild Hunt - Complete Edition',
      developer: 'CD Projekt Red',
      publisher: 'CD Projekt',
      category: 0,
      igdb_rating: 92
    },
    {
      id: 20,
      name: 'Dragon Quest XI: Definitive Edition',
      developer: 'Square Enix',
      publisher: 'Square Enix',
      category: 0,
      igdb_rating: 91
    }
  ];

  describe('Category-based Filtering', () => {
    it('should filter out Category 3 (Bundle/Collection) games', () => {
      const filtered = filterProtectedContent(mockGames);
      
      const collections = filtered.filter(game => game.category === 3);
      expect(collections.length).toBe(0);
      
      // Specific games that should be filtered
      expect(filtered.find(g => g.id === 4)).toBeUndefined(); // Super Mario All-Stars
      expect(filtered.find(g => g.id === 5)).toBeUndefined(); // Zelda Collector's Edition
      
      console.log(`Filtered Category 3 games: ${mockGames.filter(g => g.category === 3).length} items removed`);
    });

    it('should filter out Category 11 (Port) games', () => {
      const filtered = filterProtectedContent(mockGames);
      
      const ports = filtered.filter(game => game.category === 11);
      expect(ports.length).toBe(0);
      
      // Specific games that should be filtered
      expect(filtered.find(g => g.id === 6)).toBeUndefined(); // Super Mario 64 Switch port
      expect(filtered.find(g => g.id === 7)).toBeUndefined(); // FF7 PC port
      
      console.log(`Filtered Category 11 games: ${mockGames.filter(g => g.category === 11).length} items removed`);
    });

    it('should filter out Category 9 (Remaster) games', () => {
      const filtered = filterProtectedContent(mockGames);
      
      const remasters = filtered.filter(game => game.category === 9);
      expect(remasters.length).toBe(0);
      
      // Specific games that should be filtered
      expect(filtered.find(g => g.id === 8)).toBeUndefined(); // Wind Waker HD
      expect(filtered.find(g => g.id === 9)).toBeUndefined(); // FFX HD Remaster
      
      console.log(`Filtered Category 9 games: ${mockGames.filter(g => g.category === 9).length} items removed`);
    });

    it('should filter out Category 13 (Pack) games', () => {
      const filtered = filterProtectedContent(mockGames);
      
      const packs = filtered.filter(game => game.category === 13);
      expect(packs.length).toBe(0);
      
      expect(filtered.find(g => g.id === 10)).toBeUndefined(); // Mario + Rabbids Gold
      
      console.log(`Filtered Category 13 games: ${mockGames.filter(g => g.category === 13).length} items removed`);
    });
  });

  describe('Name-based Filtering', () => {
    it('should filter games with "collection" in the name', () => {
      const filtered = filterProtectedContent(mockGames);
      
      expect(filtered.find(g => g.id === 11)).toBeUndefined(); // Mega Man Legacy Collection
      expect(filtered.find(g => g.id === 12)).toBeUndefined(); // Castlevania Anniversary Collection
      expect(filtered.find(g => g.id === 13)).toBeUndefined(); // SF 30th Anniversary Collection
      
      const collectionsInResults = filtered.filter(g => 
        g.name.toLowerCase().includes('collection')
      );
      expect(collectionsInResults.length).toBe(0);
      
      console.log(`Filtered games with "collection" in name: ${collectionsInResults.length === 0 ? '✅' : '❌'}`);
    });

    it('should filter games with "remastered" or "remaster" in the name', () => {
      const filtered = filterProtectedContent(mockGames);
      
      expect(filtered.find(g => g.id === 14)).toBeUndefined(); // Shadow of the Colossus Remastered
      expect(filtered.find(g => g.id === 15)).toBeUndefined(); // The Last of Us Remastered
      
      const remastersInResults = filtered.filter(g => 
        g.name.toLowerCase().includes('remaster')
      );
      expect(remastersInResults.length).toBe(0);
      
      console.log(`Filtered games with "remaster" in name: ${remastersInResults.length === 0 ? '✅' : '❌'}`);
    });

    it('should filter "complete edition" and "definitive edition" games', () => {
      const filtered = filterProtectedContent(mockGames);
      
      expect(filtered.find(g => g.id === 19)).toBeUndefined(); // Witcher 3 Complete Edition
      expect(filtered.find(g => g.id === 20)).toBeUndefined(); // DQ XI Definitive Edition
      
      console.log('Filtered complete/definitive editions: ✅');
    });

    it('should filter games with "all-stars" in the name', () => {
      const filtered = filterProtectedContent(mockGames);
      
      expect(filtered.find(g => g.id === 16)).toBeUndefined(); // Super Mario 3D All-Stars
      
      console.log('Filtered all-stars games: ✅');
    });
  });

  describe('Preservation of Original Games', () => {
    it('should keep original main games (Category 0)', () => {
      const filtered = filterProtectedContent(mockGames);
      
      // Original games that should be preserved
      expect(filtered.find(g => g.id === 1)).toBeDefined(); // Super Mario Bros.
      expect(filtered.find(g => g.id === 2)).toBeDefined(); // The Legend of Zelda
      expect(filtered.find(g => g.id === 3)).toBeDefined(); // Final Fantasy VII
      
      console.log(`Original games preserved: ${[1, 2, 3].filter(id => filtered.find(g => g.id === id)).length}/3`);
    });

    it('should keep enhanced versions that are not remasters', () => {
      const filtered = filterProtectedContent(mockGames);
      
      // Persona 5 Royal is an enhanced version but not a remaster/collection
      expect(filtered.find(g => g.id === 18)).toBeDefined();
      
      console.log('Enhanced versions (like Royal) preserved: ✅');
    });

    it('should keep games without collection/port/remaster indicators', () => {
      const filtered = filterProtectedContent(mockGames);
      
      // Sonic Origins doesn't have explicit collection words
      expect(filtered.find(g => g.id === 17)).toBeDefined();
      
      console.log('Regular games without filter indicators preserved: ✅');
    });
  });

  describe('Overall Filtering Statistics', () => {
    it('should provide comprehensive filtering summary', () => {
      const filtered = filterProtectedContent(mockGames);
      const removedCount = mockGames.length - filtered.length;
      
      console.log('\n=== FILTERING SUMMARY ===');
      console.log(`Total games: ${mockGames.length}`);
      console.log(`After filtering: ${filtered.length}`);
      console.log(`Removed: ${removedCount} games`);
      
      // Count by category
      const categoryCounts = {
        collections: mockGames.filter(g => g.category === 3).length,
        ports: mockGames.filter(g => g.category === 11).length,
        remasters: mockGames.filter(g => g.category === 9).length,
        packs: mockGames.filter(g => g.category === 13).length,
        nameBasedCollections: mockGames.filter(g => 
          g.category === 0 && g.name.toLowerCase().includes('collection')
        ).length,
        nameBasedRemasters: mockGames.filter(g => 
          g.category === 0 && g.name.toLowerCase().includes('remaster')
        ).length
      };
      
      console.log('\nFiltered by type:');
      console.log(`- Collections (Cat 3): ${categoryCounts.collections}`);
      console.log(`- Ports (Cat 11): ${categoryCounts.ports}`);
      console.log(`- Remasters (Cat 9): ${categoryCounts.remasters}`);
      console.log(`- Packs (Cat 13): ${categoryCounts.packs}`);
      console.log(`- Name-based collections: ${categoryCounts.nameBasedCollections}`);
      console.log(`- Name-based remasters: ${categoryCounts.nameBasedRemasters}`);
      
      // Expect significant filtering
      expect(removedCount).toBeGreaterThan(10);
      expect(filtered.length).toBeLessThan(10);
      
      console.log('\nRemaining games:');
      filtered.forEach((game, index) => {
        console.log(`${index + 1}. ${game.name} (Category: ${game.category})`);
      });
    });
  });
});