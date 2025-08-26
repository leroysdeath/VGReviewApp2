# Slug-First URL System - Final Action Plan

## Overview
Implement a slug-based URL system for game pages, replacing database IDs with human-readable slugs while maintaining backward compatibility with IGDB IDs.

**Goal**: Transform `/game/32` → `/game/the-legend-of-zelda`

## Current State (Verified)
- ✅ **Database**: `slug` field exists with 99.99% coverage (124,510/124,518 games)
- ✅ **Index**: `idx_game_slug` exists for performance
- ⚠️ **Duplicate**: 1 duplicate slug found ("supaplex") - needs deduplication
- ❌ **No unique constraint** on slug field yet
- ✅ **GamePage**: Enhanced with DLC, Mod, and Parent Game sections
- ✅ **gameDataService**: Has enhanced search but NO slug methods
- ⚠️ **Routes**: Still using `/game/:id` expecting IGDB ID
- ❌ **ProfileData**: **CRITICAL BUG** - Using database IDs causing wrong game navigation
- ✅ **Modals**: Correctly using IGDB IDs

## Critical Issue Confirmed
**URGENT BUG**: ProfileData (Top 5/10) uses database IDs (`game.id`) instead of IGDB IDs, causing users to navigate to incorrect games. NOT fetching `igdb_id` or `slug` in queries.

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

---

### Action 2: Add getGameBySlug to Service ✅ Independent
**Priority**: HIGH  
**Files**: `src/services/gameDataService.ts`  
**Dependencies**: None  
**Estimated Time**: 15 minutes

Add these methods to the existing GameDataService class:

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

---

### Action 3: Fix ProfileData Top 5/10 Links 🔥 URGENT
**Priority**: CRITICAL - Fixes current bug  
**Files**: `src/components/ProfileData.tsx`  
**Dependencies**: Requires Action 1 (URL helper)  
**Estimated Time**: 20 minutes

**Step 3a**: Import URL helper at top of file
```typescript
import { getGameUrl } from '../utils/gameUrls';
```

**Step 3b**: Update fetchTopGames query (Line ~200-207)
```typescript
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

**Step 3c**: Update data mapping (Line ~217-223)
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

**Step 3d**: Update fetchUserTopGames query (Line ~246-251)
```typescript
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

**Step 3e**: Replace ALL hardcoded links (8 instances)
```typescript
// Lines: 79, 123, 671, 729, 858, 911, 975, 1028
// OLD: to={`/game/${game.id}`}
// NEW: to={getGameUrl(game)}

// For nested game objects (lines 671, 729):
// OLD: to={`/game/${gameData.game.id}`}
// NEW: to={getGameUrl(gameData.game)}
```

---

### Action 4: Generate Missing Slugs & Fix Duplicates ✅ Independent
**Priority**: MEDIUM  
**Files**: Database migration  
**Dependencies**: None  
**Estimated Time**: 5 minutes

```sql
-- Generate slugs for the 8 remaining games
UPDATE game 
SET slug = COALESCE(
  slug,
  lower(regexp_replace(regexp_replace(name, '[^a-zA-Z0-9\s-]', ''), '\s+', '-', 'g'))
)
WHERE slug IS NULL OR slug = '';

-- Fix the duplicate "supaplex" slug
UPDATE game 
SET slug = slug || '-' || id 
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY slug ORDER BY id) as rn
    FROM game WHERE slug = 'supaplex'
  ) t WHERE rn > 1
);

-- Handle any other potential duplicates
UPDATE game 
SET slug = slug || '-' || id
WHERE id IN (
  SELECT MIN(id) FROM game 
  GROUP BY slug 
  HAVING COUNT(*) > 1 AND MIN(id) != MAX(id)
);
```

---

### Action 5: Update GamePage Route Resolution
**Priority**: HIGH  
**Files**: `src/pages/GamePage.tsx`  
**Dependencies**: Requires Action 2 (getGameBySlug methods)  
**Estimated Time**: 25 minutes

**Step 5a**: Update imports and parameters
```typescript
import { useNavigate } from 'react-router-dom';  // Add if not present
import { isNumericIdentifier } from '../utils/gameUrls';  // Add

// Line 150: Change parameter name
const { identifier } = useParams<{ identifier: string }>();
const navigate = useNavigate();
const { isAuthenticated, user } = useAuth();

// Line 154: Update validation
const isValidIdentifier = identifier && identifier.length > 0;
```

**Step 5b**: Replace the main game loading effect (starting around line 180)
```typescript
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
      if (isNumericIdentifier(identifier)) {
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

**Step 5c**: Update all references from `id` to `identifier` in other effects
- Game progress loading effect
- User review checking effect
- Category fetching effect (uses game.igdb_id internally, so minimal changes)
- Refetch function

**Step 5d**: Update error messages to use `identifier` instead of `id`

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

⚠️ **Important**: Actions 5 & 6 must be deployed together

---

### Action 7: Update ReviewsModal Links (Optional Enhancement)
**Priority**: LOW  
**Files**: `src/components/ReviewsModal.tsx`  
**Dependencies**: Requires Action 1 (URL helper)  
**Estimated Time**: 10 minutes

Add slug to query and use getGameUrl helper for consistency.

---

### Action 8: Update GamesModal Links (Optional Enhancement)
**Priority**: LOW  
**Files**: `src/components/GamesModal.tsx`  
**Dependencies**: Requires Action 1 (URL helper)  
**Estimated Time**: 10 minutes

Add slug to queries and use getGameUrl helper for consistency.

---

### Action 9: Add Canonical URL Redirects
**Priority**: MEDIUM  
**Files**: `src/pages/GamePage.tsx`  
**Dependencies**: Requires Action 5  
**Estimated Time**: 10 minutes

```typescript
// Add after game loads successfully
useEffect(() => {
  // If accessed via IGDB ID and we have a slug, redirect to slug URL
  if (game && isNumericIdentifier(identifier) && game.slug) {
    console.log('🔄 Redirecting to canonical slug URL:', game.slug);
    navigate(`/game/${game.slug}`, { replace: true });
  }
}, [game, identifier, navigate]);
```

---

### Action 10: Add Database Constraints
**Priority**: LOW  
**Files**: Database migration  
**Dependencies**: Requires Action 4  
**Estimated Time**: 5 minutes

```sql
-- Add unique constraint (after fixing duplicates)
ALTER TABLE game 
ADD CONSTRAINT unique_game_slug UNIQUE (slug);

-- Index already exists (verified), but ensure it's there
CREATE INDEX IF NOT EXISTS idx_game_slug ON game(slug);
```

---

### Action 11: Update Other Game Links Throughout App
**Priority**: MEDIUM  
**Files**: Various components  
**Dependencies**: Requires Action 1  
**Estimated Time**: 30 minutes

Search and update any hardcoded `/game/` patterns with getGameUrl helper.

---

### Action 12: Add SEO Meta Tags
**Priority**: LOW  
**Files**: `src/pages/GamePage.tsx`  
**Dependencies**: Best after Action 9  
**Estimated Time**: 15 minutes

Add Helmet tags for better SEO with canonical URLs.

---

## Deployment Schedule

### Day 1: Foundation (30 min) ✅
1. **Action 1**: Create URL helper (10 min)
2. **Action 4**: Fix slugs & duplicates (5 min) 
3. **Action 2**: Add getGameBySlug methods (15 min)

### Day 2: Critical Bug Fix (20 min) 🔥
4. **Action 3**: Fix ProfileData Top 5/10 links

### Day 3: Core Resolution (27 min)
5. **Actions 5 & 6**: GamePage + Route together

### Day 4: Enhancements (45 min)
6. **Action 7-8**: Update modals (20 min)
7. **Action 11**: Update other components (25 min)

### Day 5: Polish (30 min)
8. **Action 9**: Canonical redirects (10 min)
9. **Action 10**: Database constraints (5 min)
10. **Action 12**: SEO meta tags (15 min)

**Total**: ~2.5 hours across 5 days

---

## Minimal Fix Path (30 minutes)

To just fix the critical bug:
1. **Action 1**: Create URL helper (10 min)
2. **Action 3**: Fix ProfileData (20 min)

This alone fixes the Top 5/10 navigation issue.

---

## Testing Checklist

### After Day 2 (Critical Fix):
- [ ] ProfileData Top 5 links go to correct games
- [ ] ProfileData Top 10 links go to correct games
- [ ] Verify with test: Click Zelda in Top 5 → Should go to IGDB 1022, not DB ID 32

### After Day 3 (Core Resolution):
- [ ] `/game/the-legend-of-zelda` loads correctly
- [ ] `/game/1022` still works
- [ ] `/game/supaplex-123` loads correct duplicate
- [ ] DLC/Mod sections still work
- [ ] Parent Game section still works

### After Day 5 (Complete):
- [ ] All game links use slugs
- [ ] No duplicate slug errors
- [ ] Canonical redirects work
- [ ] SEO meta tags present

---

## Special Considerations

### New GamePage Features
GamePage now includes:
- **DLCSection** component
- **ModSection** component  
- **ParentGameSection** component

These use `game.igdb_id` for API calls, so slug changes shouldn't affect them, but test thoroughly.

### Foreign Key Note
The database uses `rating_user_id_fkey` format for foreign key references. The code uses `user!rating_user_id_fkey` syntax in queries.

### Performance
With 124,518 games and an index on slug field, lookup performance should be excellent.

---

## Rollback Strategy

Each action is independently reversible:
- **Action 1**: Delete gameUrls.ts
- **Action 2**: Remove slug methods from service
- **Action 3**: Revert ProfileData changes
- **Action 4**: No rollback needed
- **Actions 5-6**: Revert parameter name to `:id`
- **Actions 7-12**: Revert individual changes

---

## Success Metrics

### Immediate (Day 2):
- ✅ Zero "wrong game" navigation reports from Top 5/10
- ✅ User satisfaction with profile page navigation

### Short-term (Day 3):
- ✅ Human-readable URLs in browser
- ✅ Backward compatibility maintained
- ✅ No 404 errors from old bookmarks

### Long-term (Day 5):
- ✅ Improved SEO rankings
- ✅ Better social media sharing (readable URLs)
- ✅ Easier debugging (slug in URL tells you the game)

---

## Risk Assessment

### Low Risk:
- Actions 1, 2, 4, 10, 12 (Independent utilities)

### Medium Risk:
- Actions 3, 7, 8, 11 (Component updates - easily reverted)

### High Risk:
- Actions 5, 6, 9 (Core routing - test thoroughly)

### Mitigation:
1. Test each action independently
2. Deploy during low-traffic periods
3. Monitor 404 rates closely
4. Have rollback scripts ready

---

## Final Notes

- **Critical bug confirmed**: ProfileData using wrong IDs is actively breaking user experience
- **Database ready**: 99.99% of games have slugs, index exists
- **Backward compatibility essential**: Many users have bookmarked IGDB URLs
- **New features stable**: DLC/Mod sections use IGDB IDs internally, won't be affected

**This plan has been verified against the current codebase and is ready for implementation.**