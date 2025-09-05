import { filterProtectedContent } from '../utils/contentProtectionFilter';

describe('Mario ROM Hack Filtering - Specific Issues', () => {
  it('should filter the specific ROM hacks appearing in Mario search', () => {
    const problematicGames = [
      // The actual ROM hacks showing up in user's search
      {
        id: 1,
        name: 'Super Mario Bros: Odyssey - Chapter 1',
        developer: 'Fan Developer', 
        publisher: 'Homebrew',
        category: 5 // Mod/ROM hack
      },
      {
        id: 2,
        name: 'Super Mario Storm 1',
        developer: 'ROM Hacker',
        publisher: 'Fan Made',
        category: 5
      },
      {
        id: 3,
        name: 'Sui Mario 2',
        developer: 'Community',
        publisher: 'Homebrew',
        category: 5
      },
      
      // Official Mario games - should pass
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
    
    // Count total mods that made it through filtering
    const totalMods = filteredGames.filter(game => game.category === 5).length;
    expect(totalMods).toBe(0); // ZERO mods should pass
    
    // Verify specific problematic games are filtered
    const filteredNames = filteredGames.map(g => g.name);
    expect(filteredNames).not.toContain('Super Mario Bros: Odyssey - Chapter 1');
    expect(filteredNames).not.toContain('Super Mario Storm 1');
    expect(filteredNames).not.toContain('Sui Mario 2');
    
    // Official games should still pass
    expect(filteredNames).toContain('Super Mario Bros.');
    expect(filteredNames).toContain('Super Mario Odyssey');
  });

  it('should filter mods even if they have misleading publisher data', () => {
    const misleadingGames = [
      // ROM hacks that might claim Nintendo as publisher in IGDB
      {
        id: 1,
        name: 'Super Mario Bros: Odyssey - Chapter 1',
        developer: 'Fan Developer',
        publisher: 'Nintendo', // Misleading - still should be filtered due to category
        category: 5
      },
      {
        id: 2,
        name: 'Mario Kart: Special Edition',
        developer: 'ROM Team',
        publisher: 'Nintendo', // Misleading
        category: 5
      }
    ];

    const filteredGames = filterProtectedContent(misleadingGames);
    
    // Even with Nintendo publisher, Category 5 mods should be filtered for AGGRESSIVE companies
    const modsCount = filteredGames.filter(game => game.category === 5).length;
    expect(modsCount).toBe(0);
  });
});

describe('Disney ROM Hack Filtering - Specific Issues', () => {
  it('should show ZERO mods for Disney franchises regardless of category data', () => {
    const disneyMods = [
      {
        id: 1,
        name: 'Star Wars: Empire Strikes Back ROM Hack',
        developer: 'Fan Team',
        publisher: 'Homebrew',
        category: 5
      },
      {
        id: 2,
        name: 'Mickey Mouse Castle Adventure',
        developer: 'Disney Fan',
        publisher: 'Fan Game',
        category: 5
      },
      {
        id: 3,
        name: 'Marvel Spider-Man Custom Levels',
        developer: 'Modding Community',
        publisher: 'Community',
        category: 5
      },
      {
        id: 4,
        name: 'Toy Story Game Mod',
        developer: 'Fan Developer',
        publisher: 'Fan Made',
        category: 5
      }
    ];

    const filteredGames = filterProtectedContent(disneyMods);
    
    // Count ALL Disney mods - should be ZERO
    const disneyModsCount = filteredGames.filter(game => game.category === 5).length;
    expect(disneyModsCount).toBe(0);
    
    // Verify NO Disney franchise mods pass through
    const filteredNames = filteredGames.map(g => g.name.toLowerCase());
    const hasStarWars = filteredNames.some(name => name.includes('star wars'));
    const hasMickey = filteredNames.some(name => name.includes('mickey'));
    const hasMarvel = filteredNames.some(name => name.includes('marvel'));
    const hasToyStory = filteredNames.some(name => name.includes('toy story'));
    
    expect(hasStarWars).toBe(false);
    expect(hasMickey).toBe(false);
    expect(hasMarvel).toBe(false);
    expect(hasToyStory).toBe(false);
  });
});