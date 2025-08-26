# Slug-First URL System - Action Plan v2

## Overview
Implement a slug-based URL system for game pages, replacing database IDs with human-readable slugs while maintaining backward compatibility with IGDB IDs.

**Goal**: Transform `/game/32` → `/game/the-legend-of-zelda`

## Current State After Recent Updates
- ✅ **Database**: `slug` field exists and is populated (124,510 out of 124,518 games have slugs)
- ✅ **GamePage**: Enhanced with DLC, Mod, and Parent Game sections, category detection
- ✅ **gameDataService**: Updated with enhanced search and IGDB fallback methods
- ⚠️ **Routes**: Still using `/game/:id` (expecting IGDB ID)
- ⚠️ **ProfileData**: Still using database IDs in links (causing the bug)
- ✅ **Modals**: Correctly fetching and using IGDB IDs

## Critical Issue
**URGENT BUG**: ProfileData (Top 5/10) uses database IDs instead of IGDB IDs, causing users to navigate to incorrect games.

## New URL Strategy
- **Primary**: `/game/the-legend-of-zelda` (slug-based)
- **Fallback**: `/game/1022` (IGDB ID for backward compatibility)
- **Single Route**: `/game/:identifier` handles both patterns intelligently

---

## Independent Actions

### Action 1: Create URL Helper Utility ✅ Independent
**Priority**: HIGH  
**Files**: Create new file  
**Dependencies**: None  
**Estimated Time**: 10 minutes

```typescript
// src/utils/gameUrls.ts
export const getGameUrl = (game: {
  slug?: string | null;
  igdb_id?: number;
  id: number;
  name?: string;
}) => {
  // Priority 1: Use slug if available
  if (game.slug) {
    return `/game/${game.slug}`;
  }
  
  // Priority 2: Use IGDB ID (backward compatibility)
  if (game.igdb_id) {
    return `/game/${game.igdb_id}`;
  }
  
  // Priority 3: Generate slug from name (temporary)
  if (game.name) {
    const tempSlug = game.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');
    return `/game/${tempSlug}`;
  }
  
  // Last resort: Use database ID (should rarely happen)
  return `/game/${game.id}`;
};

export const getGameUrlFromIGDB = (igdbId: number) => {
  return `/game/${igdbId}`;
};

// Helper to determine if identifier is numeric (IGDB ID)
export const isNumericIdentifier = (identifier: string): boolean => {
  return /^\d+$/.test(identifier);
};

// Helper to generate slug from name
export const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};
```

**Testing**:
```typescript
expect(getGameUrl({ slug: 'zelda' })).toBe('/game/zelda');
expect(getGameUrl({ igdb_id: 1022 })).toBe('/game/1022');
expect(getGameUrl({ name: 'The Legend of Zelda', id: 32 })).toBe('/game/the-legend-of-zelda');
```

---

### Action 2: Add getGameBySlug to Service ✅ Independent
**Priority**: HIGH  
**Files**: `src/services/gameDataService.ts`  
**Dependencies**: None  
**Estimated Time**: 15 minutes

Add method to existing GameDataService class:
```typescript
/**
 * Get game by slug with ratings
 */
async getGameBySlug(slug: string): Promise<GameWithCalculatedFields | null> {
  try {
    console.log('🔍 gameDataService.getGameBySlug called with:', slug);
    
    const { data, error } = await supabase
      .from('game')
      .select(`
        *,
        rating(rating)
      `)
      .eq('slug', slug)
      .single();
    
    if (error || !data) {
      console.error('Game not found by slug:', slug, error);
      return null;
    }
    
    console.log('✅ Game found by slug:', data.name);
    return this.transformGameWithRatings(data as GameWithRating);
  } catch (error) {
    console.error('Error in getGameBySlug:', error);
    return null;
  }
}

/**
 * Get game with full reviews by slug
 */
async getGameWithFullReviewsBySlug(slug: string): Promise<{
  game: GameWithCalculatedFields | null;
  reviews: Array<{
    id: number;
    user_id: number;
    game_id: number;
    rating: number;
    review: string | null;
    post_date_time: string;
    user?: {
      id: number;
      name: string;
      avatar_url?: string;
    };
  }>;
}> {
  try {
    // Get game by slug
    const { data: gameData, error: gameError } = await supabase
      .from('game')
      .select('*')
      .eq('slug', slug)
      .single();

    if (gameError || !gameData) {
      console.log(`Game with slug ${slug} not found in database`);
      return { game: null, reviews: [] };
    }

    // Get reviews using the game's database ID
    const { data: reviewsData, error: reviewsError } = await supabase
      .from('rating')
      .select(`
        *,
        user!rating_user_id_fkey(
          id,
          name,
          avatar_url
        )
      `)
      .eq('game_id', gameData.id)
      .order('post_date_time', { ascending: false });
    
    if (reviewsError) {
      console.error('Error fetching reviews:', reviewsError);
    }
    
    const reviews = reviewsData || [];
    
    // Transform game data for calculated fields
    const game = this.transformGameWithRatings({
      ...gameData,
      rating: reviews.map((r: any) => ({ rating: r.rating }))
    } as GameWithRating);

    console.log(`✅ Loaded game "${game.name}" by slug with ${reviews.length} reviews`);

    return { game, reviews };
  } catch (error) {
    console.error('Error in getGameWithFullReviewsBySlug:', error);
    return { game: null, reviews: [] };
  }
}
```

**Testing**: Can test via direct database queries
```sql
SELECT * FROM game WHERE slug = 'the-legend-of-zelda';
```

---

### Action 3: Fix ProfileData Top 5/10 Links 🔥 URGENT
**Priority**: CRITICAL - Fixes current bug  
**Files**: `src/components/ProfileData.tsx`  
**Dependencies**: Requires Action 1 (URL helper)  
**Estimated Time**: 20 minutes

**Step 3a**: Update data fetching (Line ~203)
```typescript
// Update the fetchTopGames query
const { data, error } = await supabase
  .from('rating')
  .select(`
    rating,
    game:game_id (
      id,
      igdb_id,    // ADD THIS
      slug,       // ADD THIS
      name,
      cover_url,
      genre
    )
  `)
  .eq('user_id', parseInt(userId))
  .order('rating', { ascending: false })
  .limit(limit);
```

**Step 3b**: Update data mapping (Line ~218)
```typescript
const processedGames = (data || [])
  .filter(item => item.game)
  .map(item => ({
    id: item.game.id,
    igdb_id: item.game.igdb_id,  // ADD
    slug: item.game.slug,         // ADD
    name: item.game.name,
    cover_url: item.game.cover_url || '/default-cover.png',
    genre: item.game.genre || '',
    rating: item.rating
  }));
```

**Step 3c**: Update user top games query (Line ~244)
```typescript
// Update fetchUserTopGames query
const { data, error } = await supabase
  .from('user_top_games')
  .select(`
    position,
    game:game_id (
      id,
      igdb_id,    // ADD THIS
      slug,       // ADD THIS
      name,
      cover_url,
      genre
    )
  `)
  .eq('user_id', parseInt(userId))
  .order('position');
```

**Step 3d**: Import and use URL helper
```typescript
// Add import at top of file
import { getGameUrl } from '../utils/gameUrls';

// Replace all 8 instances of hardcoded URLs:
// Lines: 79, 123, 671, 729, 858, 911, 975, 1028
// OLD: to={`/game/${game.id}`}
// NEW: to={getGameUrl(game)}
```

**Impact**: Immediately fixes broken Top 5/10 links by using proper ID resolution

---

### Action 4: Generate Missing Slugs ✅ Independent
**Priority**: MEDIUM  
**Files**: Database migration  
**Dependencies**: None  
**Estimated Time**: 5 minutes

```sql
-- Complete slug generation for remaining games
UPDATE game 
SET slug = COALESCE(
  slug,
  lower(regexp_replace(regexp_replace(name, '[^a-zA-Z0-9\s-]', ''), '\s+', '-', 'g'))
)
WHERE slug IS NULL OR slug = '';

-- Handle potential duplicates by appending game ID
UPDATE game 
SET slug = slug || '-' || id
WHERE id IN (
  SELECT id FROM (
    SELECT id, slug, COUNT(*) OVER (PARTITION BY slug) as count
    FROM game 
    WHERE slug IS NOT NULL
  ) t WHERE count > 1
);
```

**Verification**:
```sql
SELECT COUNT(*) FROM game WHERE slug IS NULL;
-- Should return 0

SELECT slug, COUNT(*) FROM game GROUP BY slug HAVING COUNT(*) > 1;
-- Should return no duplicates
```

---

### Action 5: Update GamePage Route Resolution
**Priority**: HIGH  
**Files**: `src/pages/GamePage.tsx`  
**Dependencies**: Requires Action 2 (getGameBySlug methods)  
**Estimated Time**: 25 minutes

**Step 5a**: Update useParams and add smart resolver
```typescript
// Change from 'id' to 'identifier'
const { identifier } = useParams<{ identifier: string }>();
const { isAuthenticated, user } = useAuth();

// Update validation logic
const isValidIdentifier = identifier && identifier.length > 0;
```

**Step 5b**: Create smart game resolution logic
```typescript
// Replace the main useEffect with smart resolution
useEffect(() => {
  const loadGameData = async () => {
    if (!isValidIdentifier) {
      dispatch({ type: 'SET_GAME_ERROR', payload: new Error('Invalid or missing game identifier') });
      return;
    }

    dispatch({ type: 'SET_GAME_LOADING', payload: true });
    dispatch({ type: 'SET_REVIEWS_LOADING', payload: true });

    try {
      console.log('Loading game with identifier:', identifier);
      
      let gameData = null;
      let reviewData = [];

      // Smart resolution: check if identifier is numeric (IGDB ID) or slug
      if (/^\d+$/.test(identifier)) {
        console.log('🔢 Treating as IGDB ID:', identifier);
        // Try as IGDB ID first (backward compatibility)
        const result = await gameDataService.getGameWithFullReviews(parseInt(identifier));
        gameData = result.game;
        reviewData = result.reviews;
      } else {
        console.log('🔤 Treating as slug:', identifier);
        // Try as slug
        const result = await gameDataService.getGameWithFullReviewsBySlug(identifier);
        gameData = result.game;
        reviewData = result.reviews;
      }
      
      if (gameData) {
        console.log('✅ Game loaded successfully:', gameData.name);
        console.log(`✅ Loaded ${reviewData.length} reviews`);
        dispatch({ type: 'LOAD_GAME_SUCCESS', payload: { game: gameData, reviews: reviewData } });
      } else {
        console.log('❌ Game not found for identifier:', identifier);
        dispatch({ type: 'LOAD_GAME_ERROR', payload: new Error('Game not found') });
      }
    } catch (error) {
      console.error('❌ Failed to load game:', error);
      dispatch({ type: 'LOAD_GAME_ERROR', payload: error as Error });
    }
  };

  loadGameData();
}, [identifier, isValidIdentifier]);
```

**Step 5c**: Update other effects that depend on ID
```typescript
// Update progress loading effect
useEffect(() => {
  const loadGameProgress = async () => {
    if (!game || !identifier || !isAuthenticated) return;

    dispatch({ type: 'SET_PROGRESS_LOADING', payload: true });
    try {
      // Use IGDB ID for progress tracking
      const igdbId = game.igdb_id || parseInt(identifier);
      console.log('Loading game progress for IGDB ID:', igdbId);
      const result = await getGameProgress(igdbId);
      // ... rest of logic unchanged
    } catch (error) {
      console.error('❌ Error loading game progress:', error);
      dispatch({ type: 'SET_PROGRESS', payload: { isStarted: false, isCompleted: false }});
    } finally {
      dispatch({ type: 'SET_PROGRESS_LOADING', payload: false });
    }
  };

  loadGameProgress();
}, [game, identifier, isAuthenticated]);

// Similar updates for other effects...
```

---

### Action 6: Update App.tsx Route Pattern
**Priority**: HIGH  
**Files**: `src/App.tsx`  
**Dependencies**: Must deploy with Action 5  
**Estimated Time**: 2 minutes

```tsx
// Line 94 - Change route parameter name
<Route path="/game/:identifier" element={<GamePage />} />
```

**⚠️ Important**: Actions 5 & 6 must be deployed together since they both change the parameter name from `id` to `identifier`.

---

### Action 7: Update ReviewsModal Links
**Priority**: LOW  
**Files**: `src/components/ReviewsModal.tsx`  
**Dependencies**: Requires Action 1 (URL helper)  
**Estimated Time**: 15 minutes

**Step 7a**: Add slug to query (Line ~44)
```typescript
game:game_id (
  id,
  igdb_id,
  slug,  // ADD
  name,
  pic_url
)
```

**Step 7b**: Update data mapping to include slug
```typescript
const reviewsData = (data || [])
  .filter(item => item.game && item.review)
  .map(item => ({
    id: item.id.toString(),
    gameId: item.game.igdb_id ? item.game.igdb_id.toString() : item.game.id.toString(),
    gameSlug: item.game.slug, // ADD THIS
    gameTitle: item.game.name || 'Unknown Game',
    gameCover: item.game.pic_url || '/default-cover.png',
    rating: item.rating || 0,
    reviewText: item.review,
    postDate: item.post_date_time
  }));
```

**Step 7c**: Update link generation
```typescript
import { getGameUrl } from '../utils/gameUrls';

// Replace link usage (around lines 231, 248)
to={getGameUrl({ 
  slug: review.gameSlug,
  igdb_id: parseInt(review.gameId),
  id: parseInt(review.gameId) // fallback
})}
```

---

### Action 8: Update GamesModal Links
**Priority**: LOW  
**Files**: `src/components/GamesModal.tsx`  
**Dependencies**: Requires Action 1 (URL helper)  
**Estimated Time**: 15 minutes

Similar pattern to Action 7:

**Step 8a**: Add slug to all game queries
```typescript
// Lines ~64, ~117, ~170 - Add slug to SELECT statements
game:game_id (
  id,
  igdb_id,
  slug,  // ADD
  name,
  pic_url,
  genre,
  release_date
)
```

**Step 8b**: Update data mapping to include slug
**Step 8c**: Replace hardcoded links with getGameUrl helper

---

### Action 9: Add Canonical URL Redirects
**Priority**: MEDIUM  
**Files**: `src/pages/GamePage.tsx`  
**Dependencies**: Requires Action 5 (smart resolver)  
**Estimated Time**: 10 minutes

```typescript
// Add redirect effect after game loads
useEffect(() => {
  // If accessed via IGDB ID and we have a slug, redirect to slug URL
  if (game && /^\d+$/.test(identifier) && game.slug) {
    console.log('🔄 Redirecting to canonical slug URL:', game.slug);
    navigate(`/game/${game.slug}`, { replace: true });
  }
}, [game, identifier, navigate]);
```

**Note**: Import `useNavigate` from react-router-dom if not already imported.

---

### Action 10: Add Database Constraints
**Priority**: LOW  
**Files**: Database migration  
**Dependencies**: Requires Action 4 (slugs must exist)  
**Estimated Time**: 5 minutes

```sql
-- Add unique constraint (only if not already exists)
ALTER TABLE game 
ADD CONSTRAINT unique_game_slug UNIQUE (slug);

-- Add index for performance (only if not already exists)
CREATE INDEX IF NOT EXISTS idx_game_slug ON game(slug);

-- Verify constraints
SELECT 
  conname as constraint_name,
  contype as constraint_type
FROM pg_constraint 
WHERE conrelid = 'game'::regclass;
```

---

### Action 11: Update Other Game Links
**Priority**: MEDIUM  
**Files**: Various components  
**Dependencies**: Requires Action 1 (URL helper)  
**Estimated Time**: 30 minutes

**Step 11a**: Find all game links in codebase
```bash
# Search for hardcoded game links
grep -r "/game/" src/ --include="*.tsx" --include="*.ts"
```

**Step 11b**: Common patterns to update:
- Search result components
- Game cards
- Review cards with game links
- Navigation menus
- Breadcrumbs

**Step 11c**: Replace with getGameUrl helper consistently

---

### Action 12: Add SEO Meta Tags
**Priority**: LOW  
**Files**: `src/pages/GamePage.tsx`  
**Dependencies**: Best after Action 9  
**Estimated Time**: 15 minutes

```typescript
import { Helmet } from 'react-helmet-async';

// Add to GamePage component return
<Helmet>
  <title>{game?.name || 'Game'} - VG Review App</title>
  <meta name="description" content={game?.summary || `Reviews and ratings for ${game?.name}`} />
  <link rel="canonical" href={`https://yoursite.com/game/${game?.slug || identifier}`} />
  <meta property="og:title" content={game?.name || 'Game'} />
  <meta property="og:description" content={game?.summary || `Reviews and ratings for ${game?.name}`} />
  <meta property="og:url" content={`https://yoursite.com/game/${game?.slug || identifier}`} />
  <meta property="og:image" content={game?.cover_url || '/default-game.jpg'} />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={game?.name || 'Game'} />
  <meta name="twitter:description" content={game?.summary || `Reviews and ratings for ${game?.name}`} />
  <meta name="twitter:image" content={game?.cover_url || '/default-game.jpg'} />
</Helmet>
```

---

## Deployment Schedule

### Day 1: Foundation (No User Impact) - 30 minutes
1. **Action 1**: Create URL helper utility (10 min)
2. **Action 4**: Generate missing slugs (5 min) 
3. **Action 2**: Add getGameBySlug methods (15 min)

### Day 2: Fix Critical Bug - 20 minutes
4. **Action 3**: Fix ProfileData Top 5/10 links (20 min) 🔥

### Day 3: Core Resolution - 30 minutes
5. **Actions 5 & 6**: Deploy GamePage + Route together (27 min + 3 min)

### Day 4: Component Updates - 45 minutes
6. **Action 7**: Update ReviewsModal (15 min)
7. **Action 8**: Update GamesModal (15 min)
8. **Action 11**: Update other components (15 min)

### Day 5: Polish & Optimization - 30 minutes
9. **Action 9**: Add canonical redirects (10 min)
10. **Action 10**: Add database constraints (5 min)
11. **Action 12**: Add SEO meta tags (15 min)

**Total Implementation Time**: ~2.5 hours across 5 days

---

## Minimal Fix Path

To just fix the immediate bug (broken Top 5/10 links):

1. **Action 1**: Create URL helper (10 min)
2. **Action 3**: Fix ProfileData (20 min)

**Total**: 30 minutes to fix the critical bug.

---

## Testing Checklist

### After Action 3 (Bug Fix):
- [ ] ProfileData Top 5 links navigate to correct games
- [ ] ProfileData Top 10 links navigate to correct games
- [ ] Links use IGDB IDs instead of database IDs
- [ ] No broken links in profile pages

### After Actions 5 & 6 (Smart Resolution):
- [ ] `/game/the-legend-of-zelda` loads correctly
- [ ] `/game/1022` still works (backward compatibility)
- [ ] `/game/999999` returns 404 (invalid IGDB ID)
- [ ] `/game/invalid-slug` returns 404 (invalid slug)
- [ ] Console logs show proper identifier type detection

### After Action 9 (Canonical Redirects):
- [ ] `/game/1022` redirects to `/game/the-legend-of-zelda`
- [ ] Direct slug URLs don't redirect unnecessarily
- [ ] Browser history shows clean URLs

### Final Comprehensive Test:
- [ ] All game links throughout app use slugs
- [ ] No hardcoded `/game/{id}` patterns remain
- [ ] SEO meta tags show correct canonical URLs
- [ ] Performance is acceptable (slug lookups are fast)
- [ ] Database constraints prevent duplicate slugs

---

## Rollback Strategy

Each action has a clean rollback path:

| Action | Rollback Method |
|--------|-----------------|
| Action 1 | Delete gameUrls.ts file |
| Action 2 | Remove getGameBySlug methods |
| Action 3 | Revert ProfileData queries and links |
| Action 4 | No rollback needed (slugs don't break anything) |
| Action 5 | Revert GamePage parameter name and resolution |
| Action 6 | Revert App.tsx route pattern |
| Actions 7-8 | Revert modal queries and links |
| Action 9 | Remove redirect effect |
| Action 10 | Drop constraints (if problematic) |
| Action 11 | Revert individual component changes |
| Action 12 | Remove Helmet tags |

---

## Success Metrics

### Immediate (After Day 2):
- ✅ Zero reports of "wrong game" navigation from Top 5/10 sections
- ✅ All profile page links navigate correctly

### Short-term (After Day 3):
- ✅ All game URLs use human-readable slugs
- ✅ Backward compatibility maintained for bookmarked IGDB URLs
- ✅ URL structure is consistent across the application

### Long-term (After Day 5):
- ✅ Improved SEO rankings from better URL structure
- ✅ Enhanced user experience with readable URLs
- ✅ Maintainable codebase with centralized URL generation

---

## Risk Assessment

### Low Risk Actions:
- Actions 1, 2, 4, 10, 12 (Independent utilities and database work)

### Medium Risk Actions:
- Actions 3, 7, 8, 11 (Component updates - can be reverted easily)

### High Risk Actions:
- Actions 5, 6, 9 (Core routing changes - require careful testing)

### Mitigation Strategies:
1. **Staging Environment**: Test all actions in staging first
2. **Feature Flags**: Use environment variables to toggle new behavior
3. **Monitoring**: Track 404 rates and user navigation patterns
4. **Gradual Rollout**: Deploy during low-traffic periods
5. **Quick Rollback**: Have rollback scripts ready for high-risk actions

---

## Notes

- **Current Bug**: Affects all users viewing profile pages - high priority fix
- **Database**: Slug field already exists with 99.99% coverage
- **Backward Compatibility**: Essential for existing bookmarks and external links
- **Performance**: Slug lookups should be fast with proper indexing
- **SEO Impact**: Significant positive improvement expected from readable URLs

The plan is designed to fix the critical bug quickly while building toward a comprehensive slug-based URL system that improves user experience and SEO.