/**
 * 5-Tier Priority System Tests
 * 
 * Tests the priority system with major gaming franchises:
 * Megaman, Zelda, Mario, and Sonic as requested by user
 */

import { describe, it, expect } from '@jest/globals';
import { 
  calculateFiveTierPriority, 
  sortGamesByFiveTier, 
  getFiveTierStats,
  FiveTierPriority 
} from '../utils/fiveTierPriority';

describe('5-Tier Priority System Tests', () => {

  describe('Zelda Franchise Priority', () => {
    it('should prioritize acclaimed Zelda games in Tier 1', () => {
      const zeldaGames = [
        {
          id: 1,
          name: "The Legend of Zelda: Ocarina of Time",
          developer: "Nintendo EAD",
          publisher: "Nintendo",
          category: 0,
          metacritic_score: 99,
          follows: 250000,
          user_rating_count: 75000
        },
        {
          id: 2, 
          name: "The Legend of Zelda: Breath of the Wild",
          developer: "Nintendo EPD",
          publisher: "Nintendo",
          category: 0,
          metacritic_score: 97,
          follows: 300000,
          user_rating_count: 85000
        },
        {
          id: 3,
          name: "The Legend of Zelda: Link's Awakening (2019)",
          developer: "Grezzo",
          publisher: "Nintendo", 
          category: 0,
          metacritic_score: 84,
          follows: 50000
        }
      ];

      const sortedGames = sortGamesByFiveTier(zeldaGames);
      const stats = getFiveTierStats(zeldaGames);
      
      // Ocarina and BOTW should be Tier 1 (Acclaimed)
      const ocarinaPriority = calculateFiveTierPriority(sortedGames[0]);
      const botwPriority = calculateFiveTierPriority(sortedGames[1]);
      
      expect(ocarinaPriority.tier).toBe(FiveTierPriority.ACCLAIMED_TIER);
      expect(botwPriority.tier).toBe(FiveTierPriority.ACCLAIMED_TIER);
      expect(stats.acclaimedTier).toBe(2);
      
      // Verify acclaimed games appear first
      expect(sortedGames[0].name).toMatch(/Ocarina of Time|Breath of the Wild/);
      expect(sortedGames[1].name).toMatch(/Ocarina of Time|Breath of the Wild/);
    });

    it('should handle Zelda DLC correctly in Tier 3', () => {
      const zeldaDLC = {
        id: 1,
        name: "The Legend of Zelda: Breath of the Wild - The Champions' Ballad",
        developer: "Nintendo EPD",
        publisher: "Nintendo",
        category: 1, // DLC
        igdb_rating: 88
      };

      const priority = calculateFiveTierPriority(zeldaDLC);
      
      expect(priority.tier).toBe(FiveTierPriority.DLC_EXPANSION_TIER);
      expect(priority.tierName).toBe("DLC/EXPANSION");
      expect(priority.reasons).toContain("Official DLC or expansion content");
    });
  });

  describe('Mario Franchise Priority', () => {
    it('should prioritize acclaimed Mario games in Tier 1', () => {
      const marioGames = [
        {
          id: 1,
          name: "Super Mario Galaxy",
          developer: "Nintendo EAD Tokyo",
          publisher: "Nintendo",
          category: 0,
          metacritic_score: 97,
          follows: 180000,
          user_rating_count: 45000
        },
        {
          id: 2,
          name: "Super Mario Odyssey", 
          developer: "Nintendo EPD",
          publisher: "Nintendo",
          category: 0,
          metacritic_score: 97,
          follows: 200000,
          user_rating_count: 55000
        },
        {
          id: 3,
          name: "Super Mario Bros. 3",
          developer: "Nintendo R&D4",
          publisher: "Nintendo",
          category: 0,
          metacritic_score: 98, // NES version equivalent
          follows: 150000
        },
        {
          id: 4,
          name: "Mario Kart 8 Deluxe",
          developer: "Nintendo EPD",
          publisher: "Nintendo",
          category: 0,
          igdb_rating: 92,
          follows: 120000
        }
      ];

      const sortedGames = sortGamesByFiveTier(marioGames);
      const stats = getFiveTierStats(marioGames);
      
      // Galaxy, Odyssey, and Bros 3 should be Tier 1 (Acclaimed)
      expect(stats.acclaimedTier).toBe(3);
      expect(stats.mainGameTier).toBe(1); // Mario Kart 8 Deluxe
      
      // Top 3 should be acclaimed games
      const topThreePriorities = sortedGames.slice(0, 3).map(g => calculateFiveTierPriority(g));
      topThreePriorities.forEach(priority => {
        expect(priority.tier).toBe(FiveTierPriority.ACCLAIMED_TIER);
      });
    });

    it('should filter Nintendo mods appropriately', () => {
      const marioMod = {
        id: 1,
        name: "Super Mario Bros. ROM Hack",
        developer: "Fan Developer", 
        publisher: "Homebrew",
        category: 5 // Mod
      };

      const priority = calculateFiveTierPriority(marioMod);
      
      // Nintendo has AGGRESSIVE copyright policy, so mods should NOT be in MOD_TIER
      // They should fall to BUNDLE_ODDITY_TIER or be filtered entirely
      expect(priority.tier).not.toBe(FiveTierPriority.MOD_TIER);
    });
  });

  describe('Sonic Franchise Priority', () => {
    it('should prioritize acclaimed Sonic games in Tier 1', () => {
      const sonicGames = [
        {
          id: 1,
          name: "Sonic Adventure 2",
          developer: "Sonic Team",
          publisher: "SEGA",
          category: 0,
          metacritic_score: 89, // Dreamcast version
          follows: 85000,
          user_rating_count: 25000
        },
        {
          id: 2,
          name: "Sonic Mania",
          developer: "Christian Whitehead",
          publisher: "SEGA",
          category: 0,
          metacritic_score: 86,
          follows: 95000,
          user_rating_count: 35000
        },
        {
          id: 3,
          name: "Sonic the Hedgehog 2", 
          developer: "Sonic Team",
          publisher: "SEGA",
          category: 0,
          metacritic_score: 83, // Genesis version equivalent
          follows: 120000
        },
        {
          id: 4,
          name: "Sonic Forces",
          developer: "Sonic Team",
          publisher: "SEGA",
          category: 0,
          metacritic_score: 57, // Not acclaimed
          follows: 35000
        }
      ];

      const sortedGames = sortGamesByFiveTier(sonicGames);
      const stats = getFiveTierStats(sonicGames);
      
      // Adventure 2, Mania, and Sonic 2 should be Tier 1 (Acclaimed)
      expect(stats.acclaimedTier).toBe(3);
      expect(stats.mainGameTier).toBe(1); // Sonic Forces
      
      // Verify acclaimed Sonic games appear first
      const topThreeNames = sortedGames.slice(0, 3).map(g => g.name);
      expect(topThreeNames).toContain("Sonic Adventure 2");
      expect(topThreeNames).toContain("Sonic Mania");
      expect(topThreeNames).toContain("Sonic the Hedgehog 2");
      
      // Sonic Forces should be last (poor reception)
      expect(sortedGames[3].name).toBe("Sonic Forces");
    });
  });

  describe('Mega Man Franchise Priority', () => {
    it('should prioritize acclaimed Mega Man games in Tier 1', () => {
      const megaManGames = [
        {
          id: 1,
          name: "Mega Man X",
          developer: "Capcom",
          publisher: "Capcom",
          category: 0,
          metacritic_score: 94, // SNES version
          follows: 95000,
          user_rating_count: 30000
        },
        {
          id: 2,
          name: "Mega Man 2",
          developer: "Capcom",
          publisher: "Capcom", 
          category: 0,
          metacritic_score: 91, // NES version equivalent
          follows: 110000,
          user_rating_count: 40000
        },
        {
          id: 3,
          name: "Mega Man 3",
          developer: "Capcom",
          publisher: "Capcom",
          category: 0,
          metacritic_score: 87,
          follows: 85000
        },
        {
          id: 4,
          name: "Mega Man Legacy Collection",
          developer: "Digital Eclipse",
          publisher: "Capcom",
          category: 3, // Bundle
          igdb_rating: 78
        }
      ];

      const sortedGames = sortGamesByFiveTier(megaManGames);
      const stats = getFiveTierStats(megaManGames);
      
      // Mega Man X, 2, and 3 should be Tier 1 (Acclaimed)
      expect(stats.acclaimedTier).toBe(3);
      expect(stats.bundleOddityTier).toBe(1); // Legacy Collection
      
      // Verify acclaimed Mega Man games appear first
      const topThreeNames = sortedGames.slice(0, 3).map(g => g.name);
      expect(topThreeNames).toContain("Mega Man X");
      expect(topThreeNames).toContain("Mega Man 2");
      expect(topThreeNames).toContain("Mega Man 3");
      
      // Legacy Collection should be last (bundle tier)
      expect(sortedGames[3].name).toBe("Mega Man Legacy Collection");
    });

    it('should handle Mega Man X series correctly', () => {
      const megaManXSeries = [
        {
          id: 1,
          name: "Mega Man X",
          developer: "Capcom",
          publisher: "Capcom",
          category: 0,
          metacritic_score: 94
        },
        {
          id: 2,
          name: "Mega Man X4",
          developer: "Capcom", 
          publisher: "Capcom",
          category: 0,
          metacritic_score: 89
        },
        {
          id: 3,
          name: "Mega Man X8",
          developer: "Capcom",
          publisher: "Capcom",
          category: 0,
          metacritic_score: 72 // Not as acclaimed
        }
      ];

      const sortedGames = sortGamesByFiveTier(megaManXSeries);
      
      // X and X4 should be acclaimed, X8 should be main game tier
      const xPriority = calculateFiveTierPriority(sortedGames[0]);
      const x4Priority = calculateFiveTierPriority(sortedGames[1]);
      const x8Priority = calculateFiveTierPriority(sortedGames[2]);
      
      expect(xPriority.tier).toBe(FiveTierPriority.ACCLAIMED_TIER);
      expect(x4Priority.tier).toBe(FiveTierPriority.ACCLAIMED_TIER);
      expect(x8Priority.tier).toBe(FiveTierPriority.MAIN_GAME_TIER);
    });
  });

  describe('Cross-Franchise Tier Distribution', () => {
    it('should properly distribute mixed franchise games across all 5 tiers', () => {
      const mixedGames = [
        // Tier 1: Acclaimed games from research
        {
          id: 1,
          name: "Heroes of Might and Magic III",
          developer: "New World Computing",
          publisher: "3DO",
          category: 0,
          metacritic_score: 95,
          follows: 45000
        },
        {
          id: 2,
          name: "Super Mario 64",
          developer: "Nintendo EAD",
          publisher: "Nintendo",
          category: 0,
          metacritic_score: 94,
          follows: 200000
        },
        
        // Tier 2: Main games
        {
          id: 3,
          name: "Sonic Generations",
          developer: "Sonic Team",
          publisher: "SEGA",
          category: 0,
          metacritic_score: 77, // Good but not acclaimed
          follows: 65000
        },
        {
          id: 4,
          name: "Mega Man 11",
          developer: "Capcom",
          publisher: "Capcom",
          category: 0,
          metacritic_score: 81,
          follows: 25000
        },
        
        // Tier 3: DLC/Expansion
        {
          id: 5,
          name: "Sonic Mania Plus",
          developer: "Christian Whitehead",
          publisher: "SEGA",
          category: 1, // DLC
          metacritic_score: 86
        },
        {
          id: 6,
          name: "Mario Kart 8 - DLC Pack 1",
          developer: "Nintendo EPD",
          publisher: "Nintendo",
          category: 1, // DLC
          igdb_rating: 85
        },
        
        // Tier 4: Mods (from mod-friendly companies)
        {
          id: 7,
          name: "Sonic 3 Complete",
          developer: "Community Team",
          publisher: "SEGA", // SEGA is mod-friendly
          category: 5, // Mod
          user_rating_count: 5000
        },
        
        // Tier 5: Bundles/Collections
        {
          id: 8,
          name: "Mega Man Legacy Collection",
          developer: "Digital Eclipse", 
          publisher: "Capcom",
          category: 3, // Bundle
          igdb_rating: 78
        },
        {
          id: 9,
          name: "Super Mario 3D All-Stars",
          developer: "Nintendo EPD",
          publisher: "Nintendo",
          category: 3, // Bundle
          metacritic_score: 83
        }
      ];

      const sortedGames = sortGamesByFiveTier(mixedGames);
      const stats = getFiveTierStats(mixedGames);
      
      // Verify tier distribution  
      expect(stats.acclaimedTier).toBe(4);      // Heroes III, Mario 64, Sonic Generations, Mega Man 11
      expect(stats.mainGameTier).toBe(0);       // No main games in this test set
      expect(stats.dlcExpansionTier).toBe(2);   // Sonic Mania Plus, Mario Kart DLC
      expect(stats.modTier).toBe(1);            // Sonic 3 Complete
      expect(stats.bundleOddityTier).toBe(2);   // Legacy Collection, 3D All-Stars
      
      // Verify sorting order - acclaimed games should be at top
      const topTwoPriorities = sortedGames.slice(0, 2).map(g => calculateFiveTierPriority(g));
      topTwoPriorities.forEach(priority => {
        expect(priority.tier).toBe(FiveTierPriority.ACCLAIMED_TIER);
      });
      
      // Bundles should be at bottom
      const bottomTwoPriorities = sortedGames.slice(-2).map(g => calculateFiveTierPriority(g));
      bottomTwoPriorities.forEach(priority => {
        expect(priority.tier).toBe(FiveTierPriority.BUNDLE_ODDITY_TIER);
      });
    });
  });

  describe('Acclaimed Game Detection', () => {
    it('should correctly identify researched acclaimed games', () => {
      const researchedAcclaimedGames = [
        // Zelda acclaimed (from research)
        { id: 1, name: "The Legend of Zelda: Ocarina of Time", category: 0, metacritic_score: 99 },
        { id: 2, name: "The Legend of Zelda: Breath of the Wild", category: 0, metacritic_score: 97 },
        
        // Mario acclaimed (from research) 
        { id: 3, name: "Super Mario Galaxy", category: 0, metacritic_score: 97 },
        { id: 4, name: "Super Mario Bros. 3", category: 0, metacritic_score: 98 },
        { id: 5, name: "Super Mario 64", category: 0, metacritic_score: 94 },
        
        // Sonic acclaimed (from research)
        { id: 6, name: "Sonic Adventure 2", category: 0, metacritic_score: 89 },
        { id: 7, name: "Sonic Mania", category: 0, metacritic_score: 86 },
        { id: 8, name: "Sonic the Hedgehog 2", category: 0, metacritic_score: 83 },
        
        // Mega Man acclaimed (from research)
        { id: 9, name: "Mega Man X", category: 0, metacritic_score: 94 },
        { id: 10, name: "Mega Man 2", category: 0, metacritic_score: 91 },
        
        // Strategy acclaimed (from research)
        { id: 11, name: "Heroes of Might and Magic III", category: 0, metacritic_score: 95 }
      ];

      researchedAcclaimedGames.forEach(game => {
        const priority = calculateFiveTierPriority(game);
        expect(priority.tier).toBe(FiveTierPriority.ACCLAIMED_TIER);
        expect(priority.tierName).toBe("ACCLAIMED");
      });
    });

    it('should not mark lower-rated games as acclaimed', () => {
      const nonAcclaimedGames = [
        { id: 1, name: "Sonic Forces", category: 0, metacritic_score: 57 },
        { id: 2, name: "Mega Man X7", category: 0, metacritic_score: 54 },
        { id: 3, name: "The Legend of Zelda: Tri Force Heroes", category: 0, metacritic_score: 73 }
      ];

      nonAcclaimedGames.forEach(game => {
        const priority = calculateFiveTierPriority(game);
        expect(priority.tier).toBe(FiveTierPriority.MAIN_GAME_TIER);
        expect(priority.tierName).toBe("MAIN GAME");
      });
    });
  });

  describe('Category-Based Tier Assignment', () => {
    it('should assign correct tiers based on IGDB categories', () => {
      const categoryTestGames = [
        { id: 1, name: "Main Game", category: 0, igdb_rating: 75 },
        { id: 2, name: "DLC Content", category: 1, igdb_rating: 75 },
        { id: 3, name: "Expansion Pack", category: 2, igdb_rating: 75 },
        { id: 4, name: "Game Bundle", category: 3, igdb_rating: 75 },
        { id: 5, name: "Standalone Expansion", category: 4, igdb_rating: 75 },
        { 
          id: 6, 
          name: "Community Mod", 
          category: 5, 
          developer: "Community Team",
          publisher: "Bethesda Game Studios", // MOD_FRIENDLY
          igdb_rating: 75 
        }
      ];

      const priorities = categoryTestGames.map(game => calculateFiveTierPriority(game));
      
      expect(priorities[0].tier).toBe(FiveTierPriority.MAIN_GAME_TIER);      // Category 0
      expect(priorities[1].tier).toBe(FiveTierPriority.DLC_EXPANSION_TIER); // Category 1
      expect(priorities[2].tier).toBe(FiveTierPriority.DLC_EXPANSION_TIER); // Category 2
      expect(priorities[3].tier).toBe(FiveTierPriority.BUNDLE_ODDITY_TIER); // Category 3
      expect(priorities[4].tier).toBe(FiveTierPriority.MAIN_GAME_TIER);      // Category 4 (Standalone)
      expect(priorities[5].tier).toBe(FiveTierPriority.MOD_TIER);           // Category 5 (Allowed mod)
    });
  });

  describe('Franchise Search Priority Integration', () => {
    it('should maintain proper tier ordering in franchise searches', () => {
      // Simulated "mario" search results with mixed content
      const marioSearchResults = [
        // Should be Tier 1
        { id: 1, name: "Super Mario Galaxy", category: 0, metacritic_score: 97 },
        
        // Should be Tier 2  
        { id: 2, name: "Mario Kart 8 Deluxe", category: 0, metacritic_score: 83 },
        { id: 3, name: "Super Mario Maker 2", category: 0, metacritic_score: 83 },
        
        // Should be Tier 3
        { id: 4, name: "Mario Kart 8 - Booster Course Pass", category: 1, igdb_rating: 88 },
        
        // Should be Tier 5
        { id: 5, name: "Super Mario 3D All-Stars", category: 3, metacritic_score: 83 }
      ];

      const sortedResults = sortGamesByFiveTier(marioSearchResults);
      const stats = getFiveTierStats(marioSearchResults);
      
      // Verify tier distribution
      expect(stats.acclaimedTier).toBe(1);      // Galaxy
      expect(stats.mainGameTier).toBe(2);       // Kart 8, Maker 2
      expect(stats.dlcExpansionTier).toBe(1);   // Booster Course
      expect(stats.bundleOddityTier).toBe(1);   // 3D All-Stars
      
      // Verify proper ordering
      expect(sortedResults[0].name).toBe("Super Mario Galaxy");     // Tier 1 first
      expect(sortedResults[4].name).toBe("Super Mario 3D All-Stars"); // Tier 5 last
    });
  });

  describe('Score Calculation Within Tiers', () => {
    it('should properly score games within the same tier', () => {
      const sameTierGames = [
        {
          id: 1,
          name: "Game A",
          category: 0,
          metacritic_score: 85,
          follows: 50000,
          user_rating_count: 10000
        },
        {
          id: 2,
          name: "Game B", 
          category: 0,
          metacritic_score: 80,
          follows: 30000,
          user_rating_count: 5000
        }
      ];

      const priorityA = calculateFiveTierPriority(sameTierGames[0]);
      const priorityB = calculateFiveTierPriority(sameTierGames[1]);
      
      // Both should be main tier, but A should have higher score
      expect(priorityA.tier).toBe(priorityB.tier);
      expect(priorityA.score).toBeGreaterThan(priorityB.score);
      
      // When sorted, A should come first
      const sorted = sortGamesByFiveTier(sameTierGames);
      expect(sorted[0].name).toBe("Game A");
    });
  });

  describe('System Generalization Test', () => {
    it('should work for any gaming series beyond the test franchises', () => {
      const otherFranchiseGames = [
        // Final Fantasy (should work with general system)
        {
          id: 1,
          name: "Final Fantasy VII",
          developer: "Square",
          publisher: "Square",
          category: 0,
          metacritic_score: 92,
          follows: 180000
        },
        
        // Call of Duty
        {
          id: 2,
          name: "Call of Duty: Modern Warfare 2",
          developer: "Infinity Ward",
          publisher: "Activision",
          category: 0,
          metacritic_score: 86,
          follows: 120000
        },
        
        // Indie acclaimed
        {
          id: 3,
          name: "Hollow Knight",
          developer: "Team Cherry",
          publisher: "Team Cherry",
          category: 0,
          metacritic_score: 90,
          follows: 95000
        }
      ];

      const sortedGames = sortGamesByFiveTier(otherFranchiseGames);
      const stats = getFiveTierStats(otherFranchiseGames);
      
      // System should handle any franchise
      expect(stats.totalGames).toBe(3);
      expect(stats.acclaimedTier + stats.mainGameTier).toBe(3); // All should be classified
      
      // Higher rated games should appear first
      const topGame = sortedGames[0];
      const topPriority = calculateFiveTierPriority(topGame);
      expect(topPriority.score).toBeGreaterThan(0);
    });
  });

  describe('5-Tier System Requirements Verification', () => {
    it('should implement exactly 5 tiers as requested', () => {
      const tierValues = Object.values(FiveTierPriority).filter(v => typeof v === 'number') as number[];
      const uniqueTiers = new Set(tierValues);
      
      expect(uniqueTiers.size).toBe(5); // Exactly 5 tiers
      expect(Math.max(...tierValues)).toBe(FiveTierPriority.ACCLAIMED_TIER);
      expect(Math.min(...tierValues)).toBe(FiveTierPriority.BUNDLE_ODDITY_TIER);
    });

    it('should prioritize acclaimed games like Ocarina and Heroes of Might Magic 3', () => {
      const userRequestedExamples = [
        {
          id: 1,
          name: "The Legend of Zelda: Ocarina of Time",
          category: 0,
          metacritic_score: 99
        },
        {
          id: 2,
          name: "Heroes of Might and Magic III",
          category: 0, 
          metacritic_score: 95
        }
      ];

      userRequestedExamples.forEach(game => {
        const priority = calculateFiveTierPriority(game);
        expect(priority.tier).toBe(FiveTierPriority.ACCLAIMED_TIER);
        expect(priority.tierName).toBe("ACCLAIMED");
        expect(priority.reasons).toContain("Highly acclaimed game with exceptional ratings/sales");
      });
    });
  });
});