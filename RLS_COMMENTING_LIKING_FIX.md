# ReviewPage Commenting and Liking Issues - RLS Policy Fix

## Problem Summary

Users were unable to like reviews or post comments on the ReviewPage, receiving Row Level Security (RLS) policy violations with the following errors:
- `new row violates row-level security policy for table "rating"` (when liking)
- `new row violates row-level security policy for table "rating"` (when commenting)
- HTTP 406 errors on API calls
- Foreign key relationship errors

## Root Cause Analysis

### 1. Database User ID Mismatch
The primary issue was a mismatch between the authenticated user's ID types:
- **Supabase Auth UUID**: `user.id` (e.g., "8c06387a-5ee0-413e-bd94-b8cb29610d9d")
- **Database User ID**: Integer ID from the `user` table (e.g., 1, 8)

The ReviewPage was incorrectly using `user.id` (UUID) and attempting to parse it as an integer, which failed.

### 2. RLS Policy Requirements
The RLS policies were examined and found to be correctly configured:

#### Comment Table Policy
```sql
INSERT: user_id IN (SELECT id FROM user WHERE provider_id = auth.uid())
```

#### Content_Like Table Policy
```sql
ALL operations: is_user_owner(user_id)
-- Function checks: user.id = user_id AND user.provider_id = auth.uid()
```

These policies require the database user ID (integer) that corresponds to the authenticated session's UUID.

### 3. Asynchronous Loading Issue
The `dbUserId` is loaded asynchronously after authentication, creating a timing issue where users could attempt interactions before their database ID was available.

### 4. API Method Issues
- Using `.single()` instead of `.maybeSingle()` caused 406 errors when no rows were found
- Wrong foreign key relationship name in comment queries

## Implemented Solutions

### 1. Fixed User ID Usage in ReviewPage.tsx

**Before:**
```javascript
const currentUserId = user?.id ? parseInt(user.id.toString()) : undefined;
```

**After:**
```javascript
const { isAuthenticated, user, dbUserId, dbUserIdLoading } = useAuth();
const currentUserId = dbUserId && dbUserId > 0 ? dbUserId : undefined;
```

### 2. Fixed Comment Heart Checking

**Before:**
```javascript
if (isAuthenticated && user?.id) {
  const { data: userLikeData } = await supabase
    .from('content_like')
    .select('id')
    .eq('comment_id', comment.id)
    .eq('user_id', user.id)  // Wrong: using UUID
    .single();
}
```

**After:**
```javascript
if (isAuthenticated && currentUserId) {
  const { data: userLikeData } = await supabase
    .from('content_like')
    .select('id')
    .eq('comment_id', comment.id)
    .eq('user_id', currentUserId)  // Correct: using database ID
    .maybeSingle();  // Handles no rows gracefully
}
```

### 3. Fixed API Queries in reviewService.ts

**Changed `.single()` to `.maybeSingle()` for checking likes:**
```javascript
// Before
const { data: existingLike, error: checkError } = await supabase
  .from('content_like')
  .select('id')
  .eq('user_id', userId)
  .eq('rating_id', reviewId)
  .single();

// After
const { data: existingLike, error: checkError } = await supabase
  .from('content_like')
  .select('id')
  .eq('user_id', userId)
  .eq('rating_id', reviewId)
  .maybeSingle();  // Prevents 406 errors
```

**Fixed foreign key relationship for comments:**
```javascript
// Before
.select(`
  *,
  user:user_id(id, username, name, avatar_url)
`)

// After
.select(`
  *,
  user:comment_user_id_fkey(id, username, name, avatar_url)
`)
```

### 4. Added Loading State Handling

Added a disabled state while the database user ID is loading:
```javascript
<ReviewInteractions
  // ... other props
  currentUserId={currentUserId}
  disabled={isAuthenticated && dbUserIdLoading}
/>
```

## Files Modified

1. **src/pages/ReviewPage.tsx**
   - Changed to use `dbUserId` instead of `user.id`
   - Added `dbUserIdLoading` check
   - Fixed comment heart checking to use correct user ID

2. **src/services/reviewService.ts**
   - Changed `.single()` to `.maybeSingle()` in `likeReview` and `hasUserLikedReview`
   - Fixed foreign key relationship names in `addComment` and `getCommentsForReview`

## Testing Confirmation

After these fixes:
- ✅ Users can successfully like reviews
- ✅ Users can successfully post comments
- ✅ No more RLS policy violations
- ✅ No more 406 HTTP errors
- ✅ Proper handling of async user ID loading

## Key Takeaways

1. **Always use the database user ID** (`dbUserId`) for database operations, not the auth UUID
2. **Use `.maybeSingle()`** instead of `.single()` when a query might return no rows
3. **Specify exact foreign key relationships** when there are multiple relationships between tables
4. **Handle async loading states** to prevent operations before required data is available
5. **RLS policies were correct** - the issue was in the application layer passing wrong user IDs

## Future Recommendations

1. Consider adding TypeScript types to clearly distinguish between auth UUIDs and database IDs
2. Add loading indicators when `dbUserIdLoading` is true to improve UX
3. Implement error boundaries to catch and display RLS errors more gracefully
4. Add integration tests for authenticated operations to catch these issues earlier