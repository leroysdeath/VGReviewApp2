# ExplorePage Fix Plan

## Issues Identified

### 1. ❌ Dynamic Import Error (Module Loading Failure)
**Error**: `error loading dynamically imported module: http://localhost:5173/src/pages/ExplorePage.tsx`

**Root Cause**:
- This is a Vite HMR (Hot Module Replacement) issue, not a code issue
- Happens when the module changes while being lazy-loaded
- Common in development, rare in production

**Evidence**:
- ExplorePage.tsx exists and is properly exported
- LazyRoutes.tsx correctly imports it: `lazy(() => import('./pages/ExplorePage')...)`
- No circular dependencies detected

**Fix Priority**: MEDIUM (dev-only issue, works in production build)

### 2. ❌ Logged-Out Users Cannot Access Explore Page
**Issue**: Page only works when user is logged in

**Root Cause Analysis**:
```typescript
// exploreService.ts line 96
const { data: allRatings, error: ratingsError } = await supabase
  .from('rating')
  .select('game_id, rating');  // ← This query
```

**Current RLS Policy** (from migrations):
```sql
CREATE POLICY "Anyone can read ratings"
  ON rating
  FOR SELECT
  TO authenticated  -- ← ONLY authenticated users!
  USING (true);
```

**Problem**: The policy only grants access to `authenticated` users, not `anon` users. When logged out, the Supabase client uses the `anon` role, which has NO SELECT policy on the `rating` table.

**Fix Priority**: **HIGH** (breaks user experience)

### 3. ⚠️ Shows User-Specific Data Instead of Sitewide Rankings
**Issue**: "only shows games they've reviewed and not sitewide ranking"

**Root Cause Investigation**:

Looking at `exploreService.ts`:
```typescript
// Line 95-97: Fetches ALL ratings (not user-specific)
const { data: allRatings, error: ratingsError } = await supabase
  .from('rating')
  .select('game_id, rating');  // No WHERE clause filtering by user

// Line 105-109: Aggregates across ALL users
allRatings.forEach(rating => {
  const stats = gameStatsMap.get(rating.game_id) || { count: 0, total: 0, views: 0 };
  stats.count++;
  stats.total += rating.rating;
  gameStatsMap.set(rating.game_id, stats);
});
```

**Findings**:
- ✅ The code SHOULD show sitewide rankings (no user filtering)
- ❌ But due to RLS blocking anon users, it returns empty array for logged-out users
- ❌ For logged-in users, the query should work BUT may be affected by RLS policies

**Hypothesis**: The issue is ALSO caused by the RLS policy - when authenticated, the policy might be further restricted somewhere else, or there's a view/function filtering the data.

**Fix Priority**: **HIGH** (core functionality broken)

### 4. ⚠️ Missing Database RPC Function
**Issue**: `get_games_with_review_stats` RPC doesn't exist

**Evidence**:
```typescript
// exploreService.ts line 65-69
const { data: gamesWithStats, error } = await supabase
  .rpc('get_games_with_review_stats', { ... });

if (error) {
  console.warn('RPC function not available, using fallback query');
  return fetchGamesWithReviewMetricsFallback(sortBy, limit);
}
```

**Impact**: Falls back to less efficient JS-side aggregation
**Fix Priority**: MEDIUM (performance optimization, not blocking)

---

## Comprehensive Fix Plan

### Phase 1: Fix RLS Policies (CRITICAL - Unblocks Everything)

**Goal**: Allow anonymous users to read published ratings

**Changes Needed**:

1. **Update rating SELECT policy** to include `anon` role:

```sql
-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Anyone can read ratings" ON rating;

-- Create new policy that actually allows ANYONE (anon + authenticated)
CREATE POLICY "Anyone can read published ratings"
  ON rating
  FOR SELECT
  TO anon, authenticated
  USING (is_published = true);
```

**Why**:
- Anonymous users need to see published ratings to browse top games
- This aligns with typical review site behavior (read public, write authenticated)
- Security: Still filters to `is_published = true`, protecting draft reviews

2. **Verify no other restricting policies exist**:

```sql
-- Check current policies
SELECT schemaname, tablename, policyname, roles, qual, with_check
FROM pg_policies
WHERE tablename = 'rating';
```

**Testing Strategy**:
```typescript
// Test file: exploreService.test.ts
describe('Explore Service - RLS Access', () => {
  it('should allow anon users to fetch ratings', async () => {
    // Create anon client
    const { createClient } = require('@supabase/supabase-js');
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const { data, error } = await anonClient
      .from('rating')
      .select('id, rating, game_id')
      .eq('is_published', true)
      .limit(10);

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.length).toBeGreaterThan(0);
  });
});
```

---

### Phase 2: Create Missing RPC Function (PERFORMANCE)

**Goal**: Add database function for efficient aggregation

**Migration**:

```sql
-- File: 20251003_add_explore_rpc_function.sql

CREATE OR REPLACE FUNCTION get_games_with_review_stats(
  sort_by TEXT DEFAULT 'unified_score',
  result_limit INT DEFAULT 40
)
RETURNS TABLE (
  id INT,
  igdb_id INT,
  name VARCHAR(500),
  description TEXT,
  summary TEXT,
  release_date DATE,
  cover_url TEXT,
  platforms TEXT[],
  category INT,
  greenlight_flag BOOLEAN,
  redlight_flag BOOLEAN,
  avg_user_rating NUMERIC,
  user_rating_count BIGINT,
  unified_score FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER  -- Allows function to bypass RLS
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  WITH game_stats AS (
    SELECT
      r.game_id,
      AVG(r.rating)::NUMERIC as avg_rating,
      COUNT(r.id)::BIGINT as review_count
    FROM rating r
    WHERE r.is_published = true
    GROUP BY r.game_id
    HAVING COUNT(r.id) > 0
  ),
  scored_games AS (
    SELECT
      g.id,
      g.igdb_id,
      g.name,
      g.description,
      g.summary,
      g.release_date,
      g.cover_url,
      g.platforms,
      g.category,
      g.greenlight_flag,
      g.redlight_flag,
      gs.avg_rating as avg_user_rating,
      gs.review_count as user_rating_count,
      -- Calculate unified score
      (
        -- Normalized rating (0-1)
        (GREATEST(0, (gs.avg_rating - 1) / 9) * 0.5) +
        -- Log-scaled review count (0-1)
        (LOG(10, gs.review_count + 1) / LOG(10, 100) * 0.35) +
        -- Future: view score placeholder
        (0 * 0.15)
      )::FLOAT as unified_score
    FROM game g
    INNER JOIN game_stats gs ON g.id = gs.game_id
    WHERE g.redlight_flag IS NOT TRUE
  )
  SELECT *
  FROM scored_games
  ORDER BY unified_score DESC
  LIMIT result_limit;
END;
$$;

COMMENT ON FUNCTION get_games_with_review_stats IS
'Efficiently fetches top games with review statistics and unified scoring. Uses SECURITY DEFINER to bypass RLS for aggregation.';

-- Grant execute to anon and authenticated
GRANT EXECUTE ON FUNCTION get_games_with_review_stats TO anon, authenticated;
```

**Why SECURITY DEFINER**: The function needs to aggregate ALL ratings across ALL users, which requires bypassing RLS. The function itself enforces business logic (published ratings only, no redlighted games).

**Testing Strategy**:
```typescript
// Test: RPC function performance
describe('get_games_with_review_stats RPC', () => {
  it('should return games sorted by unified score', async () => {
    const { data, error } = await supabase
      .rpc('get_games_with_review_stats', {
        sort_by: 'unified_score',
        result_limit: 20
      });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.length).toBeLessThanOrEqual(20);

    // Verify sorting
    for (let i = 1; i < data.length; i++) {
      expect(data[i-1].unified_score).toBeGreaterThanOrEqual(data[i].unified_score);
    }
  });

  it('should work for anon users', async () => {
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await anonClient.rpc('get_games_with_review_stats');

    expect(error).toBeNull();
    expect(data?.length).toBeGreaterThan(0);
  });
});
```

---

### Phase 3: Fix Dynamic Import Error (DEV EXPERIENCE)

**Goal**: Prevent HMR-related module loading failures

**Option A: Add Error Boundary Fallback**

```typescript
// Update LazyRoutes.tsx
export const ExplorePage = lazy(() =>
  import('./pages/ExplorePage')
    .then(module => ({ default: module.ExplorePage }))
    .catch(error => {
      console.error('Failed to load ExplorePage:', error);
      // Return a fallback component
      return {
        default: () => (
          <div className="min-h-screen bg-gray-900 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-white mb-4">
                Page Loading Error
              </h1>
              <p className="text-gray-400 mb-4">
                There was an error loading this page.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                Reload Page
              </button>
            </div>
          </div>
        )
      };
    })
);
```

**Option B: Improve Vite Configuration** (Recommended)

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'explore': ['./src/pages/ExplorePage.tsx', './src/services/exploreService.ts']
        }
      }
    }
  },
  server: {
    hmr: {
      overlay: true  // Show errors in overlay instead of crashing
    }
  }
});
```

**Testing**:
- Manual testing: Navigate to /explore while server is running
- HMR test: Edit ExplorePage.tsx and save while /explore is open
- Production build test: `npm run build && npm run preview`

---

### Phase 4: Add Comprehensive Tests

**Test Suite Structure**:

```
src/test/
  ├── explore-page.test.ts          # Page component tests
  ├── explore-service.test.ts       # Service layer tests
  └── explore-rls.test.ts           # RLS policy tests
```

**Test 1: Page Accessibility**

```typescript
// src/test/explore-page.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { ExplorePage } from '../pages/ExplorePage';
import { BrowserRouter } from 'react-router-dom';
import { AuthModalProvider } from '../context/AuthModalContext';

describe('ExplorePage - Accessibility', () => {
  it('should render for anonymous users', async () => {
    // Mock exploreService to return sample data
    jest.mock('../services/exploreService', () => ({
      fetchGamesWithReviewMetrics: jest.fn().mockResolvedValue([
        { id: 1, name: 'Test Game', avg_user_rating: 8.5, user_rating_count: 10 }
      ])
    }));

    render(
      <BrowserRouter>
        <AuthModalProvider>
          <ExplorePage />
        </AuthModalProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Top Games by Popularity')).toBeInTheDocument();
      expect(screen.queryByText('Authentication Required')).not.toBeInTheDocument();
    });
  });

  it('should show loading state initially', () => {
    render(
      <BrowserRouter>
        <AuthModalProvider>
          <ExplorePage />
        </AuthModalProvider>
      </BrowserRouter>
    );

    expect(screen.getByText(/Loading top-ranked games/i)).toBeInTheDocument();
  });
});
```

**Test 2: Service Layer**

```typescript
// src/test/explore-service.test.ts
import { fetchGamesWithReviewMetrics } from '../services/exploreService';
import { createClient } from '@supabase/supabase-js';

describe('Explore Service', () => {
  beforeAll(() => {
    // Create test Supabase client with anon key
    global.supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.VITE_SUPABASE_ANON_KEY!
    );
  });

  it('should fetch games for anonymous users', async () => {
    const games = await fetchGamesWithReviewMetrics('unified_score', 10);

    expect(games).toBeDefined();
    expect(Array.isArray(games)).toBe(true);
    // Note: Might be empty if no ratings exist, but should not error
  });

  it('should return games sorted by unified score', async () => {
    const games = await fetchGamesWithReviewMetrics('unified_score', 20);

    if (games.length > 1) {
      // Verify descending order (if scores exist)
      for (let i = 1; i < games.length; i++) {
        const prevScore = (games[i-1] as any).unified_score || 0;
        const currScore = (games[i] as any).unified_score || 0;
        expect(prevScore).toBeGreaterThanOrEqual(currScore);
      }
    }
  });

  it('should handle empty results gracefully', async () => {
    // Should not throw even if no games have ratings
    const games = await fetchGamesWithReviewMetrics('unified_score', 10);
    expect(games).toBeDefined();
  });
});
```

**Test 3: RLS Policies**

```typescript
// src/test/explore-rls.test.ts
import { createClient } from '@supabase/supabase-js';

describe('Explore RLS Policies', () => {
  const anonClient = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!
  );

  it('should allow anon users to read published ratings', async () => {
    const { data, error } = await anonClient
      .from('rating')
      .select('id, rating, game_id, is_published')
      .eq('is_published', true)
      .limit(10);

    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  it('should NOT allow anon users to see unpublished ratings', async () => {
    const { data } = await anonClient
      .from('rating')
      .select('id')
      .eq('is_published', false)
      .limit(1);

    // Should return empty array (RLS filters out unpublished)
    expect(data).toEqual([]);
  });

  it('should allow RPC function execution for anon users', async () => {
    const { data, error } = await anonClient
      .rpc('get_games_with_review_stats', {
        sort_by: 'unified_score',
        result_limit: 5
      });

    expect(error).toBeNull();
  });
});
```

---

## Implementation Order

### Week 1: Critical Fixes

**Day 1-2: RLS Policy Fix** ⚠️ HIGHEST PRIORITY
- [ ] Create migration `20251003_fix_rating_rls_for_anon.sql`
- [ ] Update policy to allow anon SELECT
- [ ] Test with anon Supabase client
- [ ] Deploy to staging
- [ ] Verify explore page works logged out

**Day 3: RPC Function**
- [ ] Create migration `20251003_add_explore_rpc_function.sql`
- [ ] Add `get_games_with_review_stats` function
- [ ] Test function returns correct data
- [ ] Verify performance improvement

**Day 4-5: Testing**
- [ ] Write unit tests for exploreService
- [ ] Write integration tests for RLS
- [ ] Write component tests for ExplorePage
- [ ] Run full test suite

### Week 2: Polish & Monitoring

**Day 6: Dynamic Import Fix**
- [ ] Add error boundary with fallback
- [ ] Update Vite config for better HMR
- [ ] Test in development mode

**Day 7: Monitoring & Validation**
- [ ] Add error tracking to explore page
- [ ] Monitor query performance
- [ ] Verify sitewide rankings working
- [ ] User acceptance testing

---

## Success Criteria

### Must Have (P0)
- ✅ Anonymous users can access /explore without errors
- ✅ Page shows SITEWIDE rankings, not user-specific data
- ✅ No module loading errors in development
- ✅ All tests passing (unit + integration)

### Should Have (P1)
- ✅ RPC function improves query performance by 50%+
- ✅ Error boundaries handle edge cases gracefully
- ✅ Mobile view works correctly (list mode)

### Nice to Have (P2)
- ⭐ Loading skeleton instead of spinner
- ⭐ Pagination for more than 40 games
- ⭐ Filter by genre/platform
- ⭐ View count integration

---

## Rollback Plan

If issues arise after deployment:

1. **RLS Policy Rollback**:
```sql
-- Revert to authenticated-only access
DROP POLICY "Anyone can read published ratings" ON rating;
CREATE POLICY "Anyone can read ratings" ON rating
  FOR SELECT TO authenticated USING (true);
```

2. **RPC Function Rollback**:
```sql
DROP FUNCTION IF EXISTS get_games_with_review_stats;
```

3. **Code Rollback**:
- The fallback query in `exploreService.ts` handles missing RPC gracefully
- No code changes needed to rollback

---

## Estimated Effort

- **RLS Policy Fix**: 2 hours (coding + testing)
- **RPC Function**: 4 hours (migration + testing)
- **Dynamic Import Fix**: 2 hours
- **Comprehensive Tests**: 8 hours
- **Documentation**: 2 hours
- **QA & Deployment**: 2 hours

**Total**: ~20 hours (~3 days)

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| RLS policy too permissive | Low | Medium | Only allow published ratings, test thoroughly |
| RPC function performance | Low | Low | Use EXPLAIN ANALYZE, add indexes if needed |
| Breaking existing features | Low | High | Comprehensive test suite, staged rollout |
| Module loading still fails | Medium | Low | Production builds unaffected, dev-only issue |

---

## Questions to Resolve

1. ❓ Should we add pagination to explore page (currently hard-coded 40 games)?
2. ❓ Should we cache RPC results (e.g., 5-minute cache)?
3. ❓ Should we add filters (genre, platform, year) now or later?
4. ❓ Do we want to track view counts for unified score calculation?

---

## Notes

- The core issue is **RLS policies blocking anonymous access** - this is the root cause of both "doesn't work logged out" AND "shows wrong data"
- The "user-specific data" issue is likely a red herring - once RLS is fixed, sitewide data should show
- Dynamic import error is low priority (dev-only, HMR quirk)
- All fixes are backwards compatible and have fallbacks

**Recommendation**: Start with Phase 1 (RLS fix) and Phase 2 (RPC function) as these solve the core problems. Phase 3 can be addressed separately as a dev experience improvement.
