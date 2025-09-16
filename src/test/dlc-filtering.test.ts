/**
 * Test suite to validate DLC filtering
 * 
 * Ensures that:
 * 1. Small DLC (Category 1) is filtered out
 * 2. Major expansions (Category 1 with expansion keywords) are kept
 * 3. Expansions (Category 2) are always kept
 * 4. Standalone expansions (Category 4) are always kept
 * 5. Main games remain unaffected
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { filterProtectedContent } from '../utils/contentProtectionFilter';

describe('DLC and Expansion Filtering', () => {
  // Mock game data for comprehensive DLC testing
  const mockGames = [
    // Main games that should always be kept
    {
      id: 1,
      name: 'The Elder Scrolls V: Skyrim',
      developer: 'Bethesda Game Studios',
      publisher: 'Bethesda Softworks',
      category: 0, // Main game
      igdb_rating: 94,
      release_date: '2011-11-11'
    },
    {
      id: 2,
      name: 'The Witcher 3: Wild Hunt',
      developer: 'CD Projekt Red',
      publisher: 'CD Projekt',
      category: 0, // Main game
      igdb_rating: 93,
      release_date: '2015-05-19'
    },
    {
      id: 3,
      name: 'Fallout: New Vegas',
      developer: 'Obsidian Entertainment',
      publisher: 'Bethesda Softworks',
      category: 0, // Main game
      igdb_rating: 84,
      release_date: '2010-10-19'
    },
    
    // Major expansions (Category 1) that should be KEPT
    {
      id: 4,
      name: 'The Elder Scrolls V: Skyrim - Dawnguard',
      developer: 'Bethesda Game Studios',
      publisher: 'Bethesda Softworks',
      category: 1, // DLC/Add-on (but major expansion)
      igdb_rating: 78,
      summary: 'A major expansion that adds vampires and the Dawnguard faction with hours of new content'
    },
    {
      id: 5,
      name: 'The Elder Scrolls V: Skyrim - Dragonborn',
      developer: 'Bethesda Game Studios',
      publisher: 'Bethesda Softworks',
      category: 1, // DLC/Add-on (but major expansion)
      igdb_rating: 80,
      summary: 'Journey to the island of Solstheim in this large expansion'
    },
    {
      id: 6,
      name: 'The Witcher 3: Blood and Wine',
      developer: 'CD Projekt Red',
      publisher: 'CD Projekt',
      category: 1, // DLC/Add-on (but major expansion)
      igdb_rating: 92,
      summary: 'A massive expansion adding 30+ hours of content and a new region'
    },
    {
      id: 7,
      name: 'The Witcher 3: Hearts of Stone',
      developer: 'CD Projekt Red',
      publisher: 'CD Projekt',
      category: 1, // DLC/Add-on (but major expansion)
      igdb_rating: 88,
      summary: 'A substantial story expansion with dozens of hours of new content'
    },
    {
      id: 8,
      name: 'Fallout: New Vegas - Old World Blues',
      developer: 'Obsidian Entertainment',
      publisher: 'Bethesda Softworks',
      category: 1, // DLC/Add-on (but major expansion)
      igdb_rating: 81,
      summary: 'A major expansion that takes place in the Big MT research facility'
    },
    
    // Small DLC (Category 1) that should be FILTERED
    {
      id: 9,
      name: 'Skyrim - Horse Armor Pack',
      developer: 'Bethesda Game Studios',
      publisher: 'Bethesda Softworks',
      category: 1, // DLC/Add-on (small cosmetic DLC)
      summary: 'Cosmetic armor for horses'
    },
    {
      id: 10,
      name: 'The Witcher 3 - Temerian Armor Set',
      developer: 'CD Projekt Red',
      publisher: 'CD Projekt',
      category: 1, // DLC/Add-on (cosmetic DLC)
      summary: 'Cosmetic outfit for Geralt'
    },
    {
      id: 11,
      name: 'Fallout New Vegas - Weapon Pack DLC',
      developer: 'Obsidian Entertainment',
      publisher: 'Bethesda Softworks',
      category: 1, // DLC/Add-on (weapon pack)
      summary: 'Additional weapon pack with new guns'
    },
    {
      id: 12,
      name: 'Skyrim - Premium Skin Pack',
      developer: 'Bethesda Game Studios',
      publisher: 'Bethesda Softworks',
      category: 1, // DLC/Add-on (skin pack)
      summary: 'Character skin pack for customization'
    },
    {
      id: 13,
      name: 'Game Soundtrack DLC',
      developer: 'Music Studio',
      publisher: 'Game Publisher',
      category: 1, // DLC/Add-on (soundtrack)
      summary: 'Digital soundtrack and music pack'
    },
    
    // Category 2 (Expansion) - should ALWAYS be kept
    {
      id: 14,
      name: 'The Elder Scrolls IV: Oblivion - Shivering Isles',
      developer: 'Bethesda Game Studios',
      publisher: 'Bethesda Softworks',
      category: 2, // Expansion (always keep)
      igdb_rating: 85,
      summary: 'The realm of Sheogorath awaits in this full expansion'
    },
    {
      id: 15,
      name: 'Diablo II: Lord of Destruction',
      developer: 'Blizzard North',
      publisher: 'Blizzard Entertainment',
      category: 2, // Expansion (always keep)
      igdb_rating: 88,
      summary: 'Major expansion adding Act V and new character classes'
    },
    
    // Category 4 (Standalone expansion) - should ALWAYS be kept
    {
      id: 16,
      name: 'Fallout: New Vegas - Gun Runners\' Arsenal',
      developer: 'Obsidian Entertainment',
      publisher: 'Bethesda Softworks',
      category: 4, // Standalone expansion (always keep)
      igdb_rating: 75,
      summary: 'Standalone expansion with new weapons and modifications'
    },
    {
      id: 17,
      name: 'Far Cry 3: Blood Dragon',
      developer: 'Ubisoft Montreal',
      publisher: 'Ubisoft',
      category: 4, // Standalone expansion (always keep)
      igdb_rating: 81,
      summary: 'Standalone expansion set in an 80s-inspired cyberpunk world'
    },
    
    // Edge cases - ambiguous DLCs
    {
      id: 18,
      name: 'Mystery Game - Extra Levels',
      developer: 'Game Studio',
      publisher: 'Publisher',
      category: 1, // DLC/Add-on (unclear if major or minor)
      summary: 'Additional levels for the main game'
    },
    {
      id: 19,
      name: 'Strategy Game - New Campaign',
      developer: 'Strategy Studio',
      publisher: 'Strategy Publisher',
      category: 1, // DLC/Add-on (campaign sounds substantial)
      summary: 'Brand new campaign with additional storyline and missions'
    },
    {
      id: 20,
      name: 'Racing Game - Track Pack',
      developer: 'Racing Studio',
      publisher: 'Racing Publisher',
      category: 1, // DLC/Add-on (track pack is typically small)
      summary: 'Additional racing track pack with 5 new tracks'
    }
  ];

  describe('Major Expansion Detection', () => {
    it('should keep major expansions like Dawnguard and Dragonborn', () => {
      const filtered = filterProtectedContent(mockGames);
      
      const dawnguard = filtered.find(g => g.id === 4); // Dawnguard
      const dragonborn = filtered.find(g => g.id === 5); // Dragonborn
      
      expect(dawnguard).toBeDefined();
      expect(dragonborn).toBeDefined();
      
      console.log(`Dawnguard preserved: ${dawnguard ? '✅' : '❌'}`);
      console.log(`Dragonborn preserved: ${dragonborn ? '✅' : '❌'}`);
    });

    it('should keep Witcher 3 major expansions', () => {
      const filtered = filterProtectedContent(mockGames);
      
      const bloodAndWine = filtered.find(g => g.id === 6); // Blood and Wine
      const heartsOfStone = filtered.find(g => g.id === 7); // Hearts of Stone
      
      expect(bloodAndWine).toBeDefined();
      expect(heartsOfStone).toBeDefined();
      
      console.log(`Blood and Wine preserved: ${bloodAndWine ? '✅' : '❌'}`);
      console.log(`Hearts of Stone preserved: ${heartsOfStone ? '✅' : '❌'}`);
    });

    it('should keep Fallout New Vegas major expansions', () => {
      const filtered = filterProtectedContent(mockGames);
      
      const oldWorldBlues = filtered.find(g => g.id === 8); // Old World Blues
      
      expect(oldWorldBlues).toBeDefined();
      console.log(`Old World Blues preserved: ${oldWorldBlues ? '✅' : '❌'}`);
    });
  });

  describe('Small DLC Filtering', () => {
    it('should filter out cosmetic DLC', () => {
      const filtered = filterProtectedContent(mockGames);
      
      const horseArmor = filtered.find(g => g.id === 9); // Horse Armor
      const temerianArmor = filtered.find(g => g.id === 10); // Temerian Armor
      
      expect(horseArmor).toBeUndefined();
      expect(temerianArmor).toBeUndefined();
      
      console.log(`Horse Armor filtered: ${!horseArmor ? '✅' : '❌'}`);
      console.log(`Temerian Armor filtered: ${!temerianArmor ? '✅' : '❌'}`);
    });

    it('should filter out weapon and skin packs', () => {
      const filtered = filterProtectedContent(mockGames);
      
      const weaponPack = filtered.find(g => g.id === 11); // Weapon Pack
      const skinPack = filtered.find(g => g.id === 12); // Skin Pack
      
      expect(weaponPack).toBeUndefined();
      expect(skinPack).toBeUndefined();
      
      console.log(`Weapon Pack filtered: ${!weaponPack ? '✅' : '❌'}`);
      console.log(`Skin Pack filtered: ${!skinPack ? '✅' : '❌'}`);
    });

    it('should filter out soundtrack and music DLC', () => {
      const filtered = filterProtectedContent(mockGames);
      
      const soundtrack = filtered.find(g => g.id === 13); // Soundtrack DLC
      
      expect(soundtrack).toBeUndefined();
      console.log(`Soundtrack DLC filtered: ${!soundtrack ? '✅' : '❌'}`);
    });
  });

  describe('Category-Based Filtering', () => {
    it('should always keep Category 2 (Expansion) games', () => {
      const filtered = filterProtectedContent(mockGames);
      
      const shiveringIsles = filtered.find(g => g.id === 14); // Shivering Isles
      const lordOfDestruction = filtered.find(g => g.id === 15); // Lord of Destruction
      
      expect(shiveringIsles).toBeDefined();
      expect(lordOfDestruction).toBeDefined();
      
      console.log(`Shivering Isles (Cat 2) preserved: ${shiveringIsles ? '✅' : '❌'}`);
      console.log(`Lord of Destruction (Cat 2) preserved: ${lordOfDestruction ? '✅' : '❌'}`);
    });

    it('should always keep Category 4 (Standalone expansion) games', () => {
      const filtered = filterProtectedContent(mockGames);
      
      const gunRunnersArsenal = filtered.find(g => g.id === 16); // Gun Runners' Arsenal
      const bloodDragon = filtered.find(g => g.id === 17); // Blood Dragon
      
      expect(gunRunnersArsenal).toBeDefined();
      expect(bloodDragon).toBeDefined();
      
      console.log(`Gun Runners Arsenal (Cat 4) preserved: ${gunRunnersArsenal ? '✅' : '❌'}`);
      console.log(`Blood Dragon (Cat 4) preserved: ${bloodDragon ? '✅' : '❌'}`);
    });
  });

  describe('Edge Case Detection', () => {
    it('should handle ambiguous DLC based on keywords', () => {
      const filtered = filterProtectedContent(mockGames);
      
      const newCampaign = filtered.find(g => g.id === 19); // New Campaign (should be kept)
      const trackPack = filtered.find(g => g.id === 20); // Track Pack (should be filtered)
      
      expect(newCampaign).toBeDefined(); // "campaign" is a major expansion keyword
      expect(trackPack).toBeUndefined(); // "track pack" is a small DLC keyword
      
      console.log(`New Campaign kept: ${newCampaign ? '✅' : '❌'}`);
      console.log(`Track Pack filtered: ${!trackPack ? '✅' : '❌'}`);
    });

    it('should filter ambiguous DLC without clear expansion keywords', () => {
      const filtered = filterProtectedContent(mockGames);
      
      const extraLevels = filtered.find(g => g.id === 18); // Extra Levels (ambiguous)
      
      // Should be filtered since no clear major expansion keywords
      expect(extraLevels).toBeUndefined();
      console.log(`Extra Levels (ambiguous) filtered: ${!extraLevels ? '✅' : '❌'}`);
    });
  });

  describe('Main Game Preservation', () => {
    it('should preserve all main games (Category 0)', () => {
      const filtered = filterProtectedContent(mockGames);
      
      const skyrim = filtered.find(g => g.id === 1);
      const witcher3 = filtered.find(g => g.id === 2);
      const newVegas = filtered.find(g => g.id === 3);
      
      expect(skyrim).toBeDefined();
      expect(witcher3).toBeDefined();
      expect(newVegas).toBeDefined();
      
      console.log(`Main games preserved: ${[skyrim, witcher3, newVegas].filter(Boolean).length}/3`);
    });
  });

  describe('Overall DLC Filtering Statistics', () => {
    it('should provide comprehensive filtering summary', () => {
      const filtered = filterProtectedContent(mockGames);
      const removedCount = mockGames.length - filtered.length;
      
      console.log('\\n=== DLC FILTERING SUMMARY ===');
      console.log(`Total games: ${mockGames.length}`);
      console.log(`After filtering: ${filtered.length}`);
      console.log(`Removed: ${removedCount} items`);
      
      // Count by category
      const dlcCounts = {
        majorExpansionsKept: mockGames.filter(g => g.category === 1 && [4,5,6,7,8,19].includes(g.id)).length,
        smallDLCFiltered: mockGames.filter(g => g.category === 1 && [9,10,11,12,13,18,20].includes(g.id)).length,
        expansionsKept: mockGames.filter(g => g.category === 2).length,
        standaloneExpansionsKept: mockGames.filter(g => g.category === 4).length,
        mainGamesKept: mockGames.filter(g => g.category === 0).length
      };
      
      console.log('\\nBreakdown:');
      console.log(`- Main games kept: ${dlcCounts.mainGamesKept}`);
      console.log(`- Major expansions kept (Cat 1): ${dlcCounts.majorExpansionsKept}`);
      console.log(`- Small DLC filtered (Cat 1): ${dlcCounts.smallDLCFiltered}`);
      console.log(`- Expansions kept (Cat 2): ${dlcCounts.expansionsKept}`);
      console.log(`- Standalone expansions kept (Cat 4): ${dlcCounts.standaloneExpansionsKept}`);
      
      console.log('\\nRemaining games:');
      filtered.forEach((game, index) => {
        const categoryLabel = game.category === 0 ? 'Main' : 
                            game.category === 1 ? 'DLC/Major' :
                            game.category === 2 ? 'Expansion' :
                            game.category === 4 ? 'Standalone' : 'Other';
        console.log(`${index + 1}. ${game.name} (${categoryLabel})`);
      });
      
      // Should keep main games + major expansions + category 2&4
      const expectedKept = dlcCounts.mainGamesKept + dlcCounts.majorExpansionsKept + 
                          dlcCounts.expansionsKept + dlcCounts.standaloneExpansionsKept;
      expect(filtered.length).toBe(expectedKept);
    });
  });
});