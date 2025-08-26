# Slug-First URL System - Action Plan

## Overview
Implement a slug-based URL system for game pages, replacing database IDs with human-readable slugs while maintaining backward compatibility with IGDB IDs.

**Goal**: Transform `/game/32` → `/game/the-legend-of-zelda`

## Current Issues
- **CRITICAL BUG**: ProfileData (Top 5/10) uses database IDs instead of IGDB IDs, causing incorrect game links
- **URL Quality**: Current URLs use numeric IDs which aren't user-friendly or SEO-optimal
- **Inconsistency**: Different components use different ID systems

## New URL Strategy
- **Primary**: `/game/the-legend-of-zelda` (slug-based)
- **Fallback**: `/game/1022` (IGDB ID for backward compatibility)
- **Single Route**: `/game/:identifier` handles both patterns

## Independent Actions

### Action 1: Create URL Helper Utility ✅ Independent
**Priority**: HIGH  
**Files**: Create new file  
**Dependencies**: None

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
  
  // Last resort: Use database ID
  return `/game/${game.id}`;
};

export const getGameUrlFromIGDB = (igdbId: number) => {
  return `/game/${igdbId}`;
};
```

**Testing**:
```typescript
expect(getGameUrl({ slug: 'zelda' })).toBe('/game/zelda');
expect(getGameUrl({ igdb_id: 1022 })).toBe('/game/1022');
```

---

### Action 2: Add getGameBySlug to Service ✅ Independent
**Priority**: HIGH  
**Files**: `src/services/gameDataService.ts`  
**Dependencies**: None

Add method to gameDataService:
```typescript
async getGameBySlug(slug: string): Promise<GameWithCalculatedFields | null> {
  try {
    const { data, error } = await supabase
      .from('game')
      .select(`
        *,
        ratings:rating(rating)
      `)
      .eq('slug', slug)
      .single();
    
    if (error || !data) {
      console.error('Game not found by slug:', slug);
      return null;
    }
    
    return this.transformGameWithRatings(data as GameWithRating);
  } catch (error) {
    console.error('Error in getGameBySlug:', error);
    return null;
  }
}
```

**Testing**: Can test via direct Supabase queries

---

### Action 3: Fix ProfileData Top 5/10 Links 🔥 URGENT
**Priority**: CRITICAL - Fixes current bug  
**Files**: `src/components/ProfileData.tsx`  
**Dependencies**: Requires Action 1 (URL helper)

**Step 3a**: Update data fetching (Line ~198)
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
```

**Step 3b**: Update data mapping (Line ~217)
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

**Step 3c**: Replace all links
```typescript
// Import at top
import { getGameUrl } from '../utils/gameUrls';

// Replace all 8 instances:
// Lines: 79, 123, 671, 729, 858, 911, 975, 1028
// OLD: to={`/game/${game.id}`}
// NEW: to={getGameUrl(game)}
```

**Impact**: Immediately fixes broken Top 5/10 links

---

### Action 4: Generate Missing Slugs ✅ Independent
**Priority**: MEDIUM  
**Files**: Database migration  
**Dependencies**: None

```sql
-- Only 8 games need slugs
UPDATE game 
SET slug = COALESCE(
  slug,
  lower(regexp_replace(regexp_replace(name, '[^a-zA-Z0-9\s-]', ''), '\s+', '-', 'g'))
)
WHERE slug IS NULL;
```

**Verification**:
```sql
SELECT COUNT(*) FROM game WHERE slug IS NULL;
-- Should return 0
```

---

### Action 5: Update GamePage Route Resolution
**Priority**: HIGH  
**Files**: `src/pages/GamePage.tsx`  
**Dependencies**: Requires Action 2 (getGameBySlug method)

```typescript
// Change parameter name
const { identifier } = useParams<{ identifier: string }>();

// Replace game loading logic
const resolveGame = async () => {
  // Check if identifier is numeric (likely IGDB ID)
  if (/^\d+$/.test(identifier)) {
    const igdbId = parseInt(identifier);
    
    // Try IGDB ID first (backward compatibility)
    const gameByIGDB = await gameDataService.getGameByIGDBId(igdbId);
    if (gameByIGDB) return gameByIGDB;
    
    // Fallback to database ID
    return await gameDataService.getGameById(igdbId);
  }
  
  // Non-numeric = slug
  return await gameDataService.getGameBySlug(identifier);
};
```

---

### Action 6: Update App.tsx Route Pattern
**Priority**: HIGH  
**Files**: `src/App.tsx`  
**Dependencies**: Must deploy with Action 5

```tsx
// Line 67 - Change route parameter
<Route path="/game/:identifier" element={<GamePage />} />
```

**Note**: Actions 5 & 6 must be deployed together

---

### Action 7: Update ReviewsModal Links
**Priority**: LOW  
**Files**: `src/components/ReviewsModal.tsx`  
**Dependencies**: Requires Action 1 (URL helper)

Add slug to query (Line ~44):
```typescript
game:game_id (
  id,
  igdb_id,
  slug,  // ADD
  name,
  pic_url
)
```

Update link generation:
```typescript
import { getGameUrl } from '../utils/gameUrls';

// Replace link generation
to={getGameUrl({ 
  slug: item.game.slug,
  igdb_id: item.game.igdb_id,
  id: item.game.id 
})}
```

---

### Action 8: Update GamesModal Links
**Priority**: LOW  
**Files**: `src/components/GamesModal.tsx`  
**Dependencies**: Requires Action 1 (URL helper)

Similar pattern to Action 7 - add slug to queries and use getGameUrl helper.

---

### Action 9: Add Canonical URL Redirects
**Priority**: MEDIUM  
**Files**: `src/pages/GamePage.tsx`  
**Dependencies**: Requires Action 5

```typescript
useEffect(() => {
  // If accessed via IGDB ID and we have a slug, redirect to slug URL
  if (game && /^\d+$/.test(identifier) && game.slug) {
    navigate(`/game/${game.slug}`, { replace: true });
  }
}, [game, identifier, navigate]);
```

---

### Action 10: Add Database Constraints
**Priority**: LOW  
**Files**: Database migration  
**Dependencies**: Requires Action 4 (slugs must exist)

```sql
-- Add unique constraint
ALTER TABLE game 
ADD CONSTRAINT unique_game_slug UNIQUE (slug);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_game_slug ON game(slug);
```

---

### Action 11: Update Other Game Links
**Priority**: MEDIUM  
**Files**: Various components  
**Dependencies**: Requires Action 1 (URL helper)

Search for and update:
- Search results pages
- Game cards
- Any component with `/game/` links

---

### Action 12: Add SEO Meta Tags
**Priority**: LOW  
**Files**: `src/pages/GamePage.tsx`  
**Dependencies**: Best after Action 9

```typescript
import { Helmet } from 'react-helmet-async';

// In component
<Helmet>
  <link rel="canonical" href={`https://yoursite.com/game/${game.slug}`} />
  <meta property="og:url" content={`https://yoursite.com/game/${game.slug}`} />
</Helmet>
```

---

## Deployment Schedule

### Day 1: Foundation (No User Impact)
1. **Action 1**: Create URL helper utility
2. **Action 4**: Generate missing slugs
3. **Action 2**: Add getGameBySlug method

### Day 2: Fix Critical Bug
4. **Action 3**: Fix ProfileData Top 5/10 links 🔥

### Day 3: Core Resolution
5. **Actions 5 & 6**: Deploy GamePage + Route together

### Day 4: Component Updates
6. **Action 7**: Update ReviewsModal
7. **Action 8**: Update GamesModal
8. **Action 11**: Update other components

### Day 5: Polish & Optimization
9. **Action 9**: Add canonical redirects
10. **Action 10**: Add database constraints
11. **Action 12**: Add SEO meta tags

---

## Minimal Fix Path

To just fix the immediate bug:

1. **Action 1**: Create URL helper (5 minutes)
2. **Action 3**: Fix ProfileData (15 minutes)

This alone fixes the Top 5/10 broken links issue.

---

## Testing Checklist

### After Action 3 (Bug Fix):
- [ ] ProfileData Top 5 links work correctly
- [ ] ProfileData Top 10 links work correctly
- [ ] Links go to correct games (not wrong IDs)

### After Actions 5 & 6:
- [ ] `/game/the-legend-of-zelda` loads correctly
- [ ] `/game/1022` still works (backward compatibility)
- [ ] `/game/999999` returns 404
- [ ] `/game/invalid-slug` returns 404

### After Action 9:
- [ ] `/game/1022` redirects to `/game/the-legend-of-zelda`
- [ ] Direct slug URLs don't redirect

### Final Verification:
- [ ] All game links use slugs
- [ ] No broken links in app
- [ ] SEO meta tags present
- [ ] Performance acceptable

---

## Rollback Plan

Each action is independently reversible:

- **URL Helper**: Delete the file
- **Service Method**: Remove the method
- **Component Updates**: Revert to hardcoded URLs
- **Database**: Slugs don't affect existing functionality
- **Route Changes**: Revert route pattern in App.tsx

---

## Success Metrics

- **Immediate**: Top 5/10 links navigate to correct games
- **Short-term**: All game URLs use slugs
- **Long-term**: Improved SEO rankings, better user experience

---

## Notes

- Database already has slug field (99.99% populated)
- Current bug affects all users viewing profiles
- Backward compatibility is essential for existing links
- Each action can be tested independently