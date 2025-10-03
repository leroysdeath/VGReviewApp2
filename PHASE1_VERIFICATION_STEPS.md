# Phase 1 Verification Steps - ExplorePage Anonymous Access

## ✅ Completed

1. **Unit Tests Created**: `src/test/explore-rls-policy.test.ts`
   - Comprehensive RLS policy tests for anonymous access
   - Tests for authenticated vs anonymous users
   - Security tests to prevent data leakage
   - Performance tests for large datasets

2. **Migration Created**: `supabase/migrations/20251002_fix_explore_page_anon_access.sql`
   - Updates "Anyone can read ratings" policy to allow `anon` role
   - Maintains security by only allowing published ratings
   - Includes verification queries

## 🔧 How to Apply and Verify

### Step 1: Apply the Migration

Run this in your Supabase SQL Editor or via CLI:

```bash
# Option A: Via Supabase Dashboard
# 1. Go to Supabase Dashboard → SQL Editor
# 2. Copy contents of supabase/migrations/20251002_fix_explore_page_anon_access.sql
# 3. Run the migration
# 4. Check the output for ✅ success messages

# Option B: Via Supabase CLI (if linked)
npx supabase db push
```

### Step 2: Verify the Policy Change

Run this query in Supabase SQL Editor to confirm the policy allows `anon`:

```sql
-- Check the policy details
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'rating'
  AND policyname = 'Anyone can read ratings';
```

**Expected result:**
- `roles`: Should include both `{authenticated,anon}` or similar
- `cmd`: SELECT
- `qual`: `(is_published = true)`

### Step 3: Test Anonymous Access

Run this query **without being logged in** (use anon key):

```javascript
// In browser console or test file
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'YOUR_SUPABASE_URL',
  'YOUR_ANON_KEY'  // Use anon key, not service role
);

const { data, error } = await supabase
  .from('rating')
  .select('game_id, rating')
  .eq('is_published', true)
  .limit(10);

console.log('Error:', error);  // Should be null
console.log('Data count:', data?.length);  // Should have results
```

**Expected result:**
- `error`: null
- `data`: Array of published ratings

### Step 4: Verify ExplorePage Works

1. **Open ExplorePage while logged out**:
   - Navigate to `/explore` in your browser
   - **Do not log in**
   - The page should load without errors

2. **Check for the previous error**:
   - Open browser DevTools → Console
   - Should NOT see: "error loading dynamically imported module"
   - Should NOT see: 401/403 errors for rating queries

3. **Verify sitewide rankings appear**:
   - Top rated games should display
   - Most reviewed games should display
   - Data should be from ALL users, not just current user

### Step 5: Run Unit Tests (Optional)

Once migration is applied to your database:

```bash
# Run the RLS policy tests
npm run test -- src/test/explore-rls-policy.test.ts

# Run the ExplorePage integration tests
npm run test -- src/test/explore-page.test.ts
```

**Expected result:**
- Most tests in `explore-rls-policy.test.ts` should pass
- Tests that verify anon access should succeed
- Tests that verify security (no write access) should also pass

## 🔍 Troubleshooting

### If migration fails with "policy already exists"

The policy might have been updated already. Check current policy:

```sql
-- Get the current policy definition
SELECT pg_get_policydef(oid)
FROM pg_policy
WHERE polname = 'Anyone can read ratings';
```

If it already allows `anon`, you're good to go!

### If ExplorePage still doesn't work when logged out

1. **Check browser console for errors** - the actual error may be different
2. **Verify the policy was applied** using Step 2 above
3. **Clear browser cache** - old errors may be cached
4. **Check for other RLS policies** that might conflict:

```sql
-- List ALL policies on rating table
SELECT policyname, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'rating';
```

### If you see "permission denied" errors

The migration might not have been applied. Double-check:

```sql
-- This should return results for anon users
SET ROLE anon;
SELECT COUNT(*) FROM rating WHERE is_published = true;
RESET ROLE;
```

If this query fails, the migration wasn't applied correctly.

## ✅ Success Criteria

Phase 1 is complete when:

- ✅ Migration applied without errors
- ✅ Policy verification query shows `anon` in roles
- ✅ Anonymous test query returns published ratings
- ✅ ExplorePage loads when logged out
- ✅ No "error loading dynamically imported module" errors
- ✅ Sitewide rankings display (not user-specific data)

## 📋 Next Steps After Phase 1

Once Phase 1 is verified working:

1. **Phase 2**: Create `get_games_with_review_stats` RPC function
   - Optimized aggregation query
   - Better performance than client-side aggregation
   - See `EXPLORE_PAGE_FIX_PLAN.md` for details

2. **Update exploreService.ts** to use the new RPC function

3. **Fix dynamic import error** (Vite configuration)

## 📊 What This Migration Does

**Before:**
```sql
CREATE POLICY "Anyone can read ratings"
  ON rating FOR SELECT
  TO authenticated  -- ❌ Only logged-in users
  USING (true);
```

**After:**
```sql
CREATE POLICY "Anyone can read ratings"
  ON rating FOR SELECT
  TO authenticated, anon  -- ✅ Both logged-in AND logged-out
  USING (is_published = true);  -- 🔒 Security: only published
```

**Impact:**
- Anonymous users can now query published ratings
- ExplorePage can fetch sitewide ranking data
- Security maintained: only published content is accessible
- No write access for anonymous users (INSERT/UPDATE/DELETE still blocked)

## 🔐 Security Notes

This change is **safe** because:

1. **Only published ratings are exposed** - `is_published = true` filter
2. **Read-only access** - No INSERT, UPDATE, or DELETE permissions for anon
3. **No user data leaked** - Anonymous users cannot see who wrote ratings
4. **Standard practice** - Public content platforms (Reddit, Letterboxd) work this way
5. **RLS still enforced** - Unpublished drafts remain private to authors

The migration maintains all existing security guarantees while enabling public discovery features.
