# ReviewPage Liking Issue - Work Summary

## Issue Description
Users cannot like reviews on ReviewPage, receiving RLS policy violations and "relation does not exist" errors.

## Error Messages Encountered

### Initial Error
```
Error inserting like: 
Object { code: "42501", details: null, hint: null, message: 'new row violates row-level security policy for table "rating"' }
```

### Current Error (After Fixes)
```
Error inserting like: 
Object { code: "42P01", details: null, hint: null, message: 'relation "rating" does not exist' }
```

## Work Completed

### Phase 1: Application-Side Fixes

#### 1.1 ReviewInteractions Component (`src/components/ReviewInteractions.tsx`)
**Added `disabled` prop:**
- Added `disabled?: boolean` to ReviewInteractionsProps interface
- Implemented disabled state for like button and comment form
- Added visual feedback (opacity, cursor-not-allowed, loading text)
- Added console logging for debugging

**Enabled self-liking:**
- Removed the `isReviewAuthor` check that prevented self-liking
- Simplified the like button to be available for everyone

#### 1.2 useReviewInteractions Hook (`src/hooks/useReviewInteractions.ts`)
**Fixed undefined userId handling:**
- Added check for `userId && userId > 0` before API calls
- Added early returns with console warnings for invalid userId
- Prevented hook from checking likes when userId not loaded
- Added debug logging throughout

#### 1.3 Service Functions (`src/services/reviewService.ts`)
**Added comprehensive logging:**
- Added console.log at start of `likeReview` and `addComment` functions
- Added error logging with full context
- Added success logging after database operations

#### 1.4 ReviewPage Component (`src/pages/ReviewPage.tsx`)
**Fixed user ID handling:**
- Changed from `user.id` (UUID) to `dbUserId` (integer)
- Added check: `const currentUserId = dbUserId && dbUserId > 0 ? dbUserId : undefined`
- Added `dbUserIdLoading` to detect loading state
- Added debug logging for user ID status
- Passed `disabled={isAuthenticated && dbUserIdLoading}` to ReviewInteractions

### Phase 2: Database-Side Investigation & Fixes

#### 2.1 Discovered Database Triggers
Found triggers that update `rating` table when `content_like` or `comment` changes:
- `trigger_update_rating_like_count` - Updates rating.like_count
- `trigger_update_rating_comment_count` - Updates rating.comment_count

#### 2.2 Identified Root Cause
The triggers were trying to UPDATE the `rating` table but:
1. They ran with user privileges (not SECURITY DEFINER)
2. RLS policy on `rating` table only allows owner to update
3. When User A likes User B's review, trigger fails RLS check

#### 2.3 Created Migration Files

**File: `supabase/migrations/20250901_fix_rating_triggers_rls.sql`**
- Added SECURITY DEFINER to trigger functions
- Added explicit schema references (public.rating)
- Initial attempt with incorrect search_path syntax

**File: `supabase/migrations/20250901_fix_rating_triggers_and_self_like.sql`**
- Fixed schema qualification with public prefix
- Maintained SECURITY DEFINER
- Updated both like and comment triggers

**File: `supabase/migrations/20250901_fix_trigger_search_path.sql`**
- Fixed search_path syntax (changed from `SET search_path TO 'public'` to `SET search_path = public`)
- Simplified trigger functions
- Final version of the fix

## Current Status

### What's Working
- ✅ Comments can be posted successfully
- ✅ Debug logging shows correct user ID being sent (e.g., `user_id: 1`)
- ✅ Application-side validation is working
- ✅ Self-liking is enabled in UI

### What's Not Working
- ❌ Liking still fails with "relation 'rating' does not exist" error
- ❌ The trigger function cannot find the rating table despite migrations

## Database Migration Applied
The following was confirmed via SQL query:
```sql
-- Current state of update_rating_like_count function:
SECURITY DEFINER: true
Definition includes: public.rating references
Search path: SET search_path TO 'public', 'pg_catalog'
```

## Debug Information Collected

### Console Logs Show
```javascript
📤 Inserting like with: Object { user_id: 1, rating_id: 24 }
POST https://[supabase-url]/rest/v1/content_like [HTTP/2 404]
❌ Error inserting like: Object { code: "42P01", ... message: 'relation "rating" does not exist' }
```

### Database Checks Performed
1. Verified `rating` table exists in public schema ✅
2. Verified foreign keys exist (fk_rating_user, fk_rating_game) ✅
3. Verified triggers exist and are attached ✅
4. Verified trigger functions have SECURITY DEFINER ✅

## Remaining Issues to Investigate

1. **Search Path Syntax**: The applied migration shows `SET search_path TO 'public', 'pg_catalog'` which might be incorrect syntax
2. **Schema Resolution**: Despite explicit `public.rating` references, the trigger still can't find the table
3. **Trigger Execution Context**: Need to verify if SECURITY DEFINER is actually working as expected
4. **Alternative Approaches**: Consider removing triggers and updating counts in application code

## Files Modified

### Application Files
- `src/components/ReviewInteractions.tsx`
- `src/hooks/useReviewInteractions.ts`
- `src/services/reviewService.ts`
- `src/pages/ReviewPage.tsx`

### Migration Files Created
- `supabase/migrations/20250901_fix_rating_triggers_rls.sql`
- `supabase/migrations/20250901_fix_rating_triggers_and_self_like.sql`
- `supabase/migrations/20250901_fix_trigger_search_path.sql`

## Next Steps for Resolution

1. Verify the exact search_path syntax needed for PostgreSQL
2. Consider using fully qualified names everywhere (public.rating, public.content_like)
3. Test if removing and recreating the triggers completely resolves the issue
4. Consider alternative approach: Remove triggers and update counts via application code
5. Check if there are any other triggers or functions that might be interfering

## Related Documentation
- Original fix attempt documented in: `RLS_COMMENTING_LIKING_FIX.md`
- Action plan documented in: `REVIEW_INTERACTION_FIX_PLAN.md`