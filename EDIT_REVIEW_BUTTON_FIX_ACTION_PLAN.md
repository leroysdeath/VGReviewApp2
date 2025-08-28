# Action Plan: Fix "Edit Review" Button Issue

**Issue**: The "Write a Review" button no longer changes to "Edit Review" when a user has already submitted a review for a game.

**Root Cause**: The `getUserReviewForGame` function is being called with `game.igdb_id` but expects a database `game.id`, causing the review check to always fail.

## Action Steps

### Step 1: Verify the Problem (5 minutes)
- [ ] Check `reviewService.ts` to confirm what ID type `getUserReviewForGame` expects
- [ ] Verify if there's already a function that accepts IGDB IDs
- [ ] Check the current button rendering logic in GamePage to ensure it's checking `userHasReviewed`

### Step 2: Fix the ID Mismatch (15 minutes)

#### Option A: Quick Fix (Recommended)
In GamePage.tsx, change the review check to use the database ID:
```javascript
// Change from:
const result = await getUserReviewForGame(game.igdb_id);

// To:
const result = await getUserReviewForGame(game.id);
```

#### Option B: Service Enhancement
Create a new function `getUserReviewForGameByIGDBId` in reviewService that properly queries using IGDB ID:
```javascript
async getUserReviewForGameByIGDBId(igdbId: number): Promise<ServiceResult<Review | null>> {
  try {
    const { data, error } = await supabase
      .from('rating')
      .select('*')
      .eq('user_id', currentUserId)
      .eq('igdb_id', igdbId)
      .maybeSingle();
    
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

### Step 3: Update Button Rendering (10 minutes)
Ensure the button properly switches between states:

```javascript
{userReviewLoading ? (
  <button disabled className="px-4 py-2 bg-gray-600 text-gray-400 rounded-md">
    <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
    Loading...
  </button>
) : userHasReviewed ? (
  <Link 
    to={`/review/${game.igdb_id}`} 
    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
  >
    <Edit className="h-4 w-4 inline mr-2" />
    Edit Review
  </Link>
) : (
  <Link 
    to={`/review/${game.igdb_id}`} 
    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
  >
    <PenTool className="h-4 w-4 inline mr-2" />
    Write a Review
  </Link>
)}
```

### Step 4: Handle Edge Cases (10 minutes)

#### 4.1 Ensure Review Check Triggers
The review check should run when:
- [ ] Game data loads successfully
- [ ] User authentication state changes
- [ ] After user submits/updates a review

#### 4.2 Add Proper Dependencies
Update the useEffect dependencies:
```javascript
useEffect(() => {
  const checkUserReview = async () => {
    if (!game || !game.igdb_id || !isAuthenticated) {
      dispatch({ type: 'SET_USER_REVIEW_STATUS', payload: { hasReviewed: false, loading: false }});
      return;
    }
    
    // Fixed: Use correct ID type
    const result = await getUserReviewForGame(game.id);
    
    if (result.success) {
      dispatch({ type: 'SET_USER_REVIEW_STATUS', payload: { 
        hasReviewed: !!result.data, 
        loading: false 
      }});
    }
  };
  
  checkUserReview();
}, [game, isAuthenticated]); // Proper dependencies
```

### Step 5: Fix Review Form Navigation (10 minutes)

#### 5.1 ReviewFormPage Updates
The ReviewFormPage should:
- [ ] Detect if a review exists when mounting
- [ ] Load existing review data if in edit mode
- [ ] Show "Update Review" button instead of "Submit Review" when editing
- [ ] Handle both create and update operations

```javascript
// In ReviewFormPage
useEffect(() => {
  const loadExistingReview = async () => {
    if (gameId && isAuthenticated) {
      const result = await getUserReviewForGame(gameId);
      if (result.success && result.data) {
        setIsEditMode(true);
        setReviewData(result.data);
        // Pre-populate form fields
        setRating(result.data.rating);
        setReviewText(result.data.review);
      }
    }
  };
  
  loadExistingReview();
}, [gameId, isAuthenticated]);
```

#### 5.2 Update vs Create Logic
```javascript
const handleSubmit = async () => {
  if (isEditMode) {
    // Update existing review
    const result = await updateReview(reviewId, { rating, review: reviewText });
  } else {
    // Create new review
    const result = await createReview({ game_id: gameId, rating, review: reviewText });
  }
  
  // Navigate back to game page after success
  if (result.success) {
    navigate(`/game/${game.slug || game.igdb_id}`);
  }
};
```

### Step 6: Test the Complete Flow (10 minutes)

#### Test Scenarios
- [ ] User with no review → Should see "Write a Review"
- [ ] Submit a review → Button should immediately change to "Edit Review"
- [ ] Click "Edit Review" → Should load existing review in form
- [ ] Update review → Should save changes and reflect on game page
- [ ] Test with different games to ensure review status is game-specific
- [ ] Test logout/login → Review status should persist correctly

## Implementation Priority

### Critical (Do First)
1. Fix the ID type in `getUserReviewForGame` call (Step 2A)
2. Verify button rendering logic (Step 3)

### Important (Do Next)
3. Handle loading states properly (Step 4)
4. Fix review form to support editing (Step 5)

### Nice to Have
5. Add optimistic updates after review submission
6. Cache review status to avoid repeated API calls
7. Add animation/transition when button changes state

## Potential Complications

### 1. Database Constraints
The rating table might have a unique constraint on `(user_id, game_id)` or `(user_id, igdb_id)` that needs to be considered when updating reviews.

### 2. Review Identification
Need to ensure the review is identified correctly when editing - using the right combination of user_id and game identifier.

### 3. State Synchronization
After creating/updating a review, need to update the `userHasReviewed` state without requiring a page refresh.

### 4. ID Mapping Issues
The ongoing confusion between IGDB IDs and database IDs needs to be resolved consistently across all review-related operations.

## Code Locations

### Files to Modify
- `src/pages/GamePage.tsx` - Fix review check and button rendering
- `src/services/reviewService.ts` - Verify/fix ID handling
- `src/pages/ReviewFormPage.tsx` - Add edit mode support
- `src/components/ReviewCard.tsx` - Ensure edit links work

### Key Functions
- `getUserReviewForGame()` - Needs ID type verification
- `checkUserReview()` - In GamePage useEffect
- `handleSubmit()` - In ReviewFormPage

## Estimated Time
- **Quick Fix**: 15 minutes (just fix the ID issue)
- **Complete Implementation**: 1 hour (all steps including testing)
- **With Optimizations**: 1.5 hours (including caching and UX improvements)

## Success Criteria
- [ ] "Edit Review" button appears for games user has reviewed
- [ ] Clicking "Edit Review" loads the existing review data
- [ ] Updates to reviews are saved correctly
- [ ] Button state updates without page refresh
- [ ] No performance degradation from review checks

## Notes
This issue is marked as **CRITICAL** because it blocks users from editing their existing reviews, which is a core functionality of the application. The quick fix (Option A in Step 2) should be implemented immediately to restore functionality, with the complete implementation following as soon as possible.