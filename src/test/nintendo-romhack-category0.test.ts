import { filterProtectedContent } from '../utils/contentProtectionFilter';

describe('Nintendo ROM Hacks with Category 0 (MainGame)', () => {
  it('should filter ROM hacks even when IGDB categorizes them as MainGame', () => {
    const problematicGames = [
      // The actual ROM hacks you're seeing - testing with Category 0
      {
        id: 1,
        name: 'Super Mario Bros: Odyssey - Chapter 1',
        developer: 'Fan Developer', 
        publisher: 'Homebrew',
        category: 0 // MainGame in IGDB (deceptive)
      },
      {
        id: 2,
        name: 'Super Mario Storm 1',
        developer: 'ROM Hacker',
        publisher: 'Fan Made',
        category: 0 // MainGame in IGDB (deceptive)
      },
      {
        id: 3,
        name: 'Sui Mario 2',
        developer: 'Community',
        publisher: 'Homebrew',
        category: 0 // MainGame in IGDB (deceptive)
      },
      
      // Official Mario games for comparison
      {
        id: 4,
        name: 'Super Mario Bros.',
        developer: 'Nintendo',
        publisher: 'Nintendo',
        category: 0
      },
      {
        id: 5,
        name: 'Super Mario Odyssey',
        developer: 'Nintendo EPD',
        publisher: 'Nintendo',
        category: 0
      }
    ];

    const filteredGames = filterProtectedContent(problematicGames);
    
    // The enhanced Nintendo ROM hack detection should catch these
    const filteredNames = filteredGames.map(g => g.name);
    
    // These ROM hacks should be filtered despite having Category 0
    expect(filteredNames).not.toContain('Super Mario Bros: Odyssey - Chapter 1');
    expect(filteredNames).not.toContain('Super Mario Storm 1');
    expect(filteredNames).not.toContain('Sui Mario 2');
    
    // Official games should still pass
    expect(filteredNames).toContain('Super Mario Bros.');
    expect(filteredNames).toContain('Super Mario Odyssey');
  });

  it('should count zero total mods for Nintendo regardless of IGDB category', () => {
    const allNintendoMods = [
      // Category 5 mods
      {
        id: 1,
        name: 'Mario ROM Hack',
        developer: 'Fan',
        publisher: 'Homebrew',
        category: 5
      },
      // Category 0 ROM hacks (deceptive IGDB data)
      {
        id: 2,
        name: 'Sui Mario 2',
        developer: 'Fan',
        publisher: 'Community',
        category: 0
      },
      {
        id: 3,
        name: 'Super Mario Storm 1',
        developer: 'ROM Team',
        publisher: 'Fan Made',
        category: 0
      }
    ];

    const filteredGames = filterProtectedContent(allNintendoMods);
    
    // Count ALL Nintendo-related mods (any category)
    const nintendoMods = filteredGames.filter(game => 
      game.name.toLowerCase().includes('mario') && 
      (game.category === 5 || // Traditional mod category
       game.name.includes('Storm') || // Deceptive naming
       game.name.includes('Sui Mario')) // Obvious ROM hack naming
    );
    
    // REQUIREMENT: Zero mods for Nintendo
    expect(nintendoMods).toHaveLength(0);
  });
});