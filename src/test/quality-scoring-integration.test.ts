import { calculateGameQuality, sortByGameQuality, prioritizeOriginalVersions } from '../utils/gameQualityScoring';
import { filterProtectedContent } from '../utils/contentProtectionFilter';

describe('Quality Scoring Integration with Copyright Protection', () => {
  it('should preserve copyright filtering while improving game ordering', () => {
    const testGames = [
      // Nintendo mod - should be FILTERED by copyright, regardless of quality score
      {
        id: 1,
        name: 'Super Mario Bros ROM Hack',
        category: 5,
        rating: 90, // High rating doesn't matter
        developer: 'Fan Developer',
        publisher: 'Fan Developer'
      },
      
      // Official Nintendo game - should PASS copyright and get high quality score
      {
        id: 2,
        name: 'Super Mario Bros.',
        category: 0,
        rating: 87,
        rating_count: 500,
        developer: 'Nintendo',
        publisher: 'Nintendo'
      },
      
      // Nintendo remaster - should PASS copyright but get lower quality score than original
      {
        id: 3,
        name: 'Super Mario Bros. 3D HD Remaster',
        category: 8,
        rating: 86,
        parent_game: 2,
        developer: 'Nintendo',
        publisher: 'Nintendo'
      }
    ];

    // Step 1: Copyright protection should filter out mods
    const afterCopyright = filterProtectedContent(testGames);
    
    // Nintendo mod should be filtered out
    expect(afterCopyright).toHaveLength(2);
    expect(afterCopyright.find(g => g.id === 1)).toBeUndefined(); // Mod filtered
    expect(afterCopyright.find(g => g.id === 2)).toBeDefined(); // Original preserved
    expect(afterCopyright.find(g => g.id === 3)).toBeDefined(); // Remaster preserved
    
    // Step 2: Quality scoring should prioritize original over remaster
    const afterQuality = sortByGameQuality(afterCopyright);
    
    expect(afterQuality[0].id).toBe(2); // Original first
    expect(afterQuality[1].id).toBe(3); // Remaster second
    
    // Verify quality scores
    const originalQuality = calculateGameQuality(afterQuality[0]);
    const remasterQuality = calculateGameQuality(afterQuality[1]);
    
    expect(originalQuality.isOriginal).toBe(true);
    expect(remasterQuality.isOriginal).toBe(false);
    expect(originalQuality.score).toBeGreaterThan(remasterQuality.score);
  });

  it('should not affect existing flagship game prioritization', () => {
    const testGames = [
      // Non-flagship but high quality
      {
        id: 1,
        name: 'Some Great Game',
        category: 0,
        rating: 95,
        rating_count: 1000
      },
      
      // Flagship game (from flagshipGames.ts)
      {
        id: 2,
        name: 'Super Mario Bros. 3',
        category: 0,
        rating: 87,
        rating_count: 500
      }
    ];

    const sorted = sortByGameQuality(testGames);
    
    // Quality scoring should work alongside flagship detection
    // Both should be high quality, but flagship system will handle final prioritization
    const firstQuality = calculateGameQuality(sorted[0]);
    const secondQuality = calculateGameQuality(sorted[1]);
    
    expect(firstQuality.isHighQuality).toBe(true);
    expect(secondQuality.isHighQuality).toBe(true);
  });

  it('should handle missing Zelda games scenario', () => {
    // Simulate the actual IGDB response for "majoras mask"
    const majoras_mask_results = [
      // 3DS remake (appears first in IGDB)
      {
        id: 8593,
        name: 'The Legend of Zelda: Majora\'s Mask 3D',
        category: 8,
        rating: 90.42,
        rating_count: 169,
        parent_game: 1030
      },
      
      // Various mods and randomizers
      {
        id: 172479,
        name: 'Majora\'s Mask Redux',
        category: 5,
        parent_game: 1030
      },
      
      // Original N64 version (appears later in IGDB)
      {
        id: 1030,
        name: 'The Legend of Zelda: Majora\'s Mask',
        category: 0,
        rating: 86.83,
        rating_count: 786,
        first_release_date: 956793600
        // No parent_game = original
      }
    ];

    // Apply quality-based prioritization
    const prioritized = prioritizeOriginalVersions(majoras_mask_results);
    const sorted = sortByGameQuality(prioritized);
    
    // Original N64 version should now be first
    expect(sorted[0].id).toBe(1030);
    expect(sorted[0].name).toBe('The Legend of Zelda: Majora\'s Mask');
    
    // Verify the original gets highest quality score
    const originalQuality = calculateGameQuality(sorted[0]);
    expect(originalQuality.isOriginal).toBe(true);
    expect(originalQuality.isHighQuality).toBe(true);
    expect(originalQuality.isProbablyMod).toBe(false);
  });

  it('should handle Wind Waker original vs HD prioritization', () => {
    // Simulate IGDB response for "wind waker"
    const wind_waker_results = [
      // HD version (appears first in IGDB)
      {
        id: 2276,
        name: 'The Legend of Zelda: The Wind Waker HD',
        category: 9,
        rating: 90.43,
        rating_count: 368,
        parent_game: 1033
      },
      
      // Original GameCube version
      {
        id: 1033,
        name: 'The Legend of Zelda: The Wind Waker',
        category: 0,
        rating: 87.31,
        rating_count: 950,
        first_release_date: 1039737600 // 2002
        // No parent_game = original
      }
    ];

    const prioritized = prioritizeOriginalVersions(wind_waker_results);
    
    // Original should be prioritized despite lower rating
    expect(prioritized[0].id).toBe(1033);
    expect(prioritized[0].name).toBe('The Legend of Zelda: The Wind Waker');
    
    const originalQuality = calculateGameQuality(prioritized[0]);
    expect(originalQuality.isOriginal).toBe(true);
    expect(originalQuality.reasons).toContain('Original game (not a remake/port)');
  });

  it('should maintain zero mods policy for AGGRESSIVE companies', () => {
    const mixedNintendoContent = [
      // Official game
      {
        id: 1,
        name: 'Super Mario Bros.',
        category: 0,
        rating: 87,
        rating_count: 600,
        developer: 'Nintendo',
        publisher: 'Nintendo'
      },
      
      // Nintendo mod with high quality score
      {
        id: 2,
        name: 'Super Mario Bros Enhanced',
        category: 5,
        rating: 95, // Even with high rating
        rating_count: 1000,
        developer: 'Fan Developer',
        publisher: 'Fan Developer'
      }
    ];

    // Copyright protection should still filter the mod
    const afterCopyright = filterProtectedContent(mixedNintendoContent);
    expect(afterCopyright).toHaveLength(1);
    expect(afterCopyright[0].id).toBe(1); // Only official game remains
    
    // Quality scoring works on what remains
    const afterQuality = sortByGameQuality(afterCopyright);
    expect(afterQuality).toHaveLength(1);
    expect(afterQuality[0].name).toBe('Super Mario Bros.');
  });
});