import { filterProtectedContent } from '../utils/contentProtectionFilter';

describe('Zero Mods for AGGRESSIVE Companies', () => {
  it('should show ZERO mods for Nintendo (AGGRESSIVE company)', () => {
    const testGames = [
      // Official Nintendo games
      {
        id: 1,
        name: 'Super Mario Bros.',
        developer: 'Nintendo',
        publisher: 'Nintendo',
        category: 0
      },
      {
        id: 2,
        name: 'Pokemon Red',
        developer: 'Game Freak',
        publisher: 'Nintendo',
        category: 0
      },
      
      // Nintendo mods (Category 5) - ALL should be filtered
      {
        id: 3,
        name: 'Super Mario Bros. ROM Hack',
        developer: 'Fan Developer',
        publisher: 'Homebrew',
        category: 5
      },
      {
        id: 4,
        name: 'Mario Kart Custom Tracks',
        developer: 'Modding Community',
        publisher: 'Fan Made',
        category: 5
      },
      {
        id: 5,
        name: 'Zelda Randomizer',
        developer: 'Community',
        publisher: 'Fan Project',
        category: 5
      },
      {
        id: 6,
        name: 'Pokemon Crystal Clear',
        developer: 'ShockSlayer',
        publisher: 'ROM Hack',
        category: 5
      },
      
      // Specific ROM hacks user reported (Category 0 - deceptive)
      {
        id: 7,
        name: 'Super Mario Bros: Odyssey - Chapter 1',
        developer: 'Fan Developer',
        publisher: 'Homebrew',
        category: 0
      },
      {
        id: 8,
        name: 'Super Mario Storm 1',
        developer: 'ROM Hacker',
        publisher: 'Fan Made',
        category: 0
      },
      {
        id: 9,
        name: 'Sui Mario 2',
        developer: 'Community',
        publisher: 'Homebrew',
        category: 0
      }
    ];

    const filteredGames = filterProtectedContent(testGames);
    
    // Count ALL Nintendo mods/ROM hacks that made it through (any category)
    const nintendoMods = filteredGames.filter(game => {
      const name = game.name.toLowerCase();
      const isNintendoFranchise = name.includes('mario') || name.includes('zelda') || name.includes('pokemon');
      const isMod = game.category === 5;
      const isRomHack = name.includes('hack') || name.includes('storm') || name.includes('sui mario') || name.includes('chapter');
      
      return isNintendoFranchise && (isMod || isRomHack);
    });
    
    // CRITICAL REQUIREMENT: Zero Nintendo mods/ROM hacks
    expect(nintendoMods).toHaveLength(0);
    
    // Verify official games still pass
    const officialGames = filteredGames.filter(game => game.category === 0 && 
      (game.developer?.includes('Nintendo') || game.publisher?.includes('Nintendo'))
    );
    expect(officialGames.length).toBeGreaterThan(0);
  });

  it('should show ZERO mods for Disney (AGGRESSIVE company)', () => {
    const testGames = [
      // Official Disney/licensed games
      {
        id: 1,
        name: 'Star Wars Jedi: Fallen Order',
        developer: 'Respawn Entertainment',
        publisher: 'Electronic Arts',
        category: 0
      },
      {
        id: 2,
        name: 'Kingdom Hearts III',
        developer: 'Square Enix',
        publisher: 'Square Enix',
        category: 0
      },
      
      // Disney mods (Category 5) - ALL should be filtered
      {
        id: 3,
        name: 'Star Wars Battlefront Mod',
        developer: 'Modding Community',
        publisher: 'Fan Made',
        category: 5
      },
      {
        id: 4,
        name: 'Kingdom Hearts Fan Game',
        developer: 'Independent Team',
        publisher: 'Fan Project',
        category: 5
      },
      {
        id: 5,
        name: 'Marvel vs Capcom ROM Hack',
        developer: 'ROM Hacker',
        publisher: 'Homebrew',
        category: 5
      },
      {
        id: 6,
        name: 'Mickey Mouse Fan Game',
        developer: 'Disney Fan',
        publisher: 'Fan Made',
        category: 5
      },
      {
        id: 7,
        name: 'Toy Story Custom Levels',
        developer: 'Community Modder',
        publisher: 'Homebrew',
        category: 5
      },
      
      // Deceptive Disney mods (Category 0)
      {
        id: 8,
        name: 'Star Wars: Custom Campaign',
        developer: 'Fan Team',
        publisher: 'Community',
        category: 0
      },
      {
        id: 9,
        name: 'Marvel Heroes: Fan Edition',
        developer: 'Indie Developer',
        publisher: 'Fan Project',
        category: 0
      }
    ];

    const filteredGames = filterProtectedContent(testGames);
    
    // Count ALL Disney mods/fan games that made it through (any category)
    const disneyMods = filteredGames.filter(game => {
      const name = game.name.toLowerCase();
      const isDisneyFranchise = name.includes('star wars') || name.includes('kingdom hearts') || 
                               name.includes('marvel') || name.includes('mickey') || name.includes('toy story');
      const isMod = game.category === 5;
      const isFanMade = name.includes('fan') || name.includes('custom') || name.includes('mod') || 
                       game.developer?.toLowerCase().includes('fan') || 
                       game.publisher?.toLowerCase().includes('fan');
      
      return isDisneyFranchise && (isMod || isFanMade);
    });
    
    // CRITICAL REQUIREMENT: Zero Disney mods/fan content
    expect(disneyMods).toHaveLength(0);
    
    // Verify official licensed games still pass
    const officialGames = filteredGames.filter(game => game.category === 0 && 
      !game.name.toLowerCase().includes('fan') && !game.name.toLowerCase().includes('custom')
    );
    expect(officialGames.length).toBeGreaterThan(0);
  });

  it('should show ZERO mods for ALL AGGRESSIVE companies', () => {
    const aggressiveMods = [
      // Nintendo mods
      {
        id: 1,
        name: 'Super Mario 64 Randomizer',
        developer: 'Fan Developer',
        publisher: 'Community',
        category: 5
      },
      
      // Square Enix mods
      {
        id: 2,
        name: 'Final Fantasy VII Mod',
        developer: 'Modder',
        publisher: 'Fan Made',
        category: 5
      },
      
      // Capcom mods
      {
        id: 3,
        name: 'Street Fighter Alpha Mod',
        developer: 'Fighting Community',
        publisher: 'Fan Project',
        category: 5
      },
      
      // Take-Two mods
      {
        id: 4,
        name: 'GTA San Andreas Mod',
        developer: 'Modding Team',
        publisher: 'Community',
        category: 5
      },
      
      // Disney mods
      {
        id: 5,
        name: 'Star Wars Mod',
        developer: 'Fan Team',
        publisher: 'Fan Made',
        category: 5
      }
    ];

    const filteredGames = filterProtectedContent(aggressiveMods);
    
    // CRITICAL: No mods should survive filtering for AGGRESSIVE companies
    const remainingMods = filteredGames.filter(game => game.category === 5);
    expect(remainingMods).toHaveLength(0);
    
    // Verify all specific mods are filtered
    expect(filteredGames).toHaveLength(0);
  });
});