# Comment Loading Fix - Action Plan

## Problem Summary
Comments are successfully posted to the database but don't appear when the ReviewPage is reloaded. Users must post a new comment to see existing comments.

## Root Cause
The `useReviewInteractions` hook never automatically loads comments. It only loads review data (like count, comment count) but not the actual comments array. Comments are only fetched when explicitly calling `loadComments()`, which happens after posting but not on initial page load.

## Current Behavior
1. Page loads → Hook fetches review data (counts only)
2. Comments section hidden by default (`showComments = false`)
3. User clicks comment button → Shows comment section (empty)
4. User posts comment → `postComment` calls `loadComments()` → Comments appear
5. User refreshes page → Comments gone (never loaded)

## Action Plan - COMPLETED (Option C Implemented)

### Phase 1: Load Comments on Initial Page Load ✅

**1.1 Modify useReviewInteractions hook**
- [x] Add `loadComments()` call in the initial useEffect
- [x] Load comments alongside review data and like status
- [x] Ensure comments are loaded even if user not authenticated (for viewing)

**1.2 Update loading states**
- [x] Set `isLoadingComments` during initial load
- [x] Handle errors from initial comment load
- [x] Add debug logging for comment loading

### Phase 2: Optimize Comment Loading ✅

**2.1 Add smart loading triggers**
- [x] Load comments when `showComments` becomes true (if not already loaded)
- [x] Add a flag to track if comments have been loaded
- [x] Prevent duplicate loading requests

**2.2 Handle edge cases**
- [x] Ensure comments reload after successful post
- [x] Handle empty comment state properly
- [x] Maintain comment count accuracy

### Phase 3: Improve User Experience ✅

**3.1 Add visual feedback**
- [x] Show skeleton loader while comments load
- [x] Display comment count even when section collapsed
- [x] Add "Loading comments..." message (via pulse indicator)

**3.2 Performance optimization**
- [x] Background loading implemented
- [x] Prevent unnecessary reloads with `commentsLoaded` flag
- [x] Cache comments until reviewId changes

## Implementation Details

### Option A: Simple Fix (Recommended for immediate resolution)
```typescript
// In useReviewInteractions.ts, modify the initial useEffect:
useEffect(() => {
  const loadInitialData = async () => {
    try {
      // Get review data
      const reviewResponse = await getReview(reviewId);
      if (reviewResponse.success && reviewResponse.data) {
        setLikeCount(reviewResponse.data.likeCount || 0);
        setCommentCount(reviewResponse.data.commentCount || 0);
      }

      // Load comments immediately (NEW)
      const commentsResponse = await getCommentsForReview(reviewId);
      if (commentsResponse.success) {
        setComments(commentsResponse.data || []);
      }

      // Check if user has liked the review
      if (userId && userId > 0) {
        const likeResponse = await hasUserLikedReview(userId, reviewId);
        if (likeResponse.success) {
          setIsLiked(likeResponse.data || false);
        }
      }
    } catch (err) {
      setError('Failed to load review data');
      console.error('Error loading review data:', err);
    }
  };

  if (reviewId) {
    loadInitialData();
  }
}, [reviewId, userId]);
```

### Option B: Lazy Loading (More efficient)
```typescript
// Add state to track if comments have been loaded
const [commentsLoaded, setCommentsLoaded] = useState(false);

// In ReviewInteractions component, load when expanded:
const toggleComments = () => {
  const newShowState = !showComments;
  setShowComments(newShowState);
  
  if (newShowState && !commentsLoaded && !isLoadingComments) {
    loadComments();
    setCommentsLoaded(true);
  }
};
```

### Option C: Hybrid Approach (Best UX)
- Load comments in background after initial render
- Show immediately if user expands section
- Update count badge in real-time

## Success Criteria
- [ ] Comments visible immediately when comments section expanded
- [ ] Comments persist through page refreshes
- [ ] No duplicate loading of comments
- [ ] Loading states properly displayed
- [ ] Error states handled gracefully

## Testing Checklist
- [ ] Load page with existing comments → Comments appear when expanded
- [ ] Post new comment → Appears immediately
- [ ] Refresh page → Previous comments still visible
- [ ] Load page as unauthenticated user → Can view comments
- [ ] Test with review having 0 comments
- [ ] Test with review having many comments
- [ ] Test error scenarios (network failure, etc.)

## Files to Modify
1. `src/hooks/useReviewInteractions.ts` - Main changes here
2. `src/components/ReviewInteractions.tsx` - Minor updates for loading states
3. `src/services/reviewService.ts` - Verify getCommentsForReview works correctly

## Estimated Implementation Time
- Option A (Simple): 10 minutes
- Option B (Lazy): 20 minutes  
- Option C (Hybrid): 30 minutes

## Recommendation
Start with **Option A** for immediate fix, then enhance with Option B or C based on performance needs.