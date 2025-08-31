# ReviewPage Commenting/Liking Fix Action Plan

## Problem Summary
Users are experiencing RLS (Row Level Security) policy violations when trying to like reviews or post comments on ReviewPage. The errors indicate `new row violates row-level security policy for table "rating"` even though the operations are on `content_like` and `comment` tables.

## Root Cause Analysis
1. **Missing `disabled` prop implementation** - ReviewInteractions component receives but doesn't use the disabled prop
2. **Undefined user ID handling** - Operations are attempted before dbUserId is loaded
3. **Race condition** - Components try to interact with database before user ID is available
4. **Data flow issues** - ResponsiveLandingPage doesn't pass user ID to ReviewCard components

## Action Plan

### Phase 1: Fix Immediate Blocking Issues ✅ (Most Likely to Solve) - COMPLETED

**1.1 Implement the `disabled` prop in ReviewInteractions component**
- [x] Add `disabled?: boolean` to ReviewInteractionsProps interface
- [x] Disable like button when `disabled` is true
- [x] Disable comment form submission when `disabled` is true
- [x] Add visual feedback (opacity, cursor) for disabled state

**1.2 Fix useReviewInteractions hook to handle undefined userId**
- [x] Skip `hasUserLikedReview` call in useEffect if userId is undefined
- [x] Add early return in `toggleLike` if userId is undefined
- [x] Ensure `postComment` validates userId before attempting operation
- [x] Prevent optimistic updates when userId is undefined

**1.3 Add debug logging to trace actual values**
- [x] Log dbUserId value in ReviewPage when it changes
- [x] Log userId being passed to service functions
- [x] Log RLS errors with full context
- [x] Add console warnings for undefined user ID attempts

### Phase 2: Fix Data Flow Issues

**2.1 Ensure dbUserId is properly loaded**
- [ ] Review useAuth hook for proper dbUserId setting
- [ ] Verify user lookup in database is succeeding
- [ ] Check provider_id matching is working correctly
- [ ] Add timeout handling for user ID loading

**2.2 Add loading states to prevent premature interactions**
- [ ] Show loading spinner on buttons while dbUserIdLoading
- [ ] Disable all interactive elements until user ID confirmed
- [ ] Add "Loading user data..." message
- [ ] Implement skeleton UI for interaction buttons

### Phase 3: Fix Root Cause Database Issues

**3.1 Investigate "rating" table error source**
- [ ] Check for database triggers on content_like/comment tables
- [ ] Review foreign key constraints and cascades
- [ ] Verify RLS policies on all related tables
- [ ] Check if there are any computed columns or views involved

**3.2 Test is_user_owner function**
- [ ] Test with null/undefined inputs
- [ ] Verify correct user record matching
- [ ] Check function permissions and security definer
- [ ] Test with non-existent user IDs

**3.3 Verify user record creation**
- [ ] Ensure users created in public.user table on signup
- [ ] Check provider_id is set correctly
- [ ] Verify integer ID generation
- [ ] Test user creation trigger

### Phase 4: Comprehensive Testing & Validation

**4.1 Add robust error handling**
- [ ] Differentiate RLS errors from validation errors
- [ ] Provide user-friendly error messages
- [ ] Add retry logic for transient failures
- [ ] Implement error boundaries

**4.2 Create integration tests**
- [ ] Test full flow from login to liking/commenting
- [ ] Test edge cases (rapid clicks, slow loading)
- [ ] Verify behavior when switching users
- [ ] Test offline/online transitions

### Phase 5: Apply Fixes to ResponsiveLandingPage

**5.1 Extract dbUserId from useAuth**
- [ ] Add `dbUserId` and `dbUserIdLoading` to destructured values
- [ ] Pass `currentUserId={dbUserId}` to ReviewCard components
- [ ] Handle undefined gracefully

**5.2 Handle loading states in ReviewCard**
- [ ] Disable interactions while loading
- [ ] Show appropriate UI feedback
- [ ] Implement same patterns as ReviewPage

## Implementation Priority

1. **Start with Phase 1** - Most likely to immediately fix the issue
2. **Phase 2 if needed** - Addresses timing and data flow issues
3. **Phase 3 for investigation** - Only if simpler fixes don't work
4. **Phase 4 for hardening** - Once working, prevent regressions
5. **Phase 5 to propagate** - Apply to other affected components

## Success Criteria

- [ ] Users can like reviews without RLS errors
- [ ] Users can post comments without RLS errors
- [ ] Interactions are properly disabled during loading
- [ ] Clear error messages when authentication required
- [ ] Consistent behavior across all review components

## Testing Checklist

- [ ] Test as logged-out user (should see "login required" message)
- [ ] Test as newly logged-in user (should wait for ID to load)
- [ ] Test rapid clicking (should not cause errors)
- [ ] Test with slow network (loading states should show)
- [ ] Test user switching (should update correctly)