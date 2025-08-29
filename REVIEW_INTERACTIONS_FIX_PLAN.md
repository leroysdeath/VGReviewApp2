# Review Interactions (Comments & Likes) - Fix Plan

## Executive Summary
The commenting and liking features for reviews are **fully implemented in the UI** but **broken at the database query level** due to table name mismatches. The infrastructure exists but the pieces aren't connecting properly.

## Current State Analysis

### ✅ What's Working
1. **Database Schema** - Properly designed with:
   - `comment` table with support for nested replies
   - `content_like` table for both review and comment likes
   - Triggers for automatic like count updates
   - Proper indexes and RLS policies

2. **UI Components** - Complete implementation:
   - `ReviewCard` component with interaction buttons
   - `ReviewInteractions` component with full comment system
   - Forms with validation and character limits
   - Nested reply support

3. **State Management** - Comprehensive hook:
   - `useReviewInteractions` hook handles all interaction logic
   - Optimistic updates for instant feedback
   - Proper error handling and loading states

### ❌ What's Broken
1. **Table Name Inconsistencies**:
   - Database has: `comment` and `content_like`
   - ReviewService expects: `review_comment`
   - ReviewPage expects: `review_comments` and `comment_hearts`

2. **Column Name Mismatches**:
   - Database uses: `rating_id` to reference reviews
   - Service uses: `review_id`

3. **Duplicate Implementation**:
   - ReviewPage has its own broken implementation
   - Not using the working `ReviewInteractions` component

## Root Cause
The core issue is **inconsistent table naming and structure** between the database schema and service layer, preventing all database queries from executing successfully.

## Action Plan

### Phase 1: Fix Service Layer (30 minutes)

#### Task 1.1: Update Table References in reviewService.ts
```typescript
// Current (broken):
.from('review_comment')
.select('*, user:user_id(name, avatar_url)')
.eq('review_id', reviewId)

// Fix to:
.from('comment')
.select('*, user:user_id(name, avatar_url)')
.eq('rating_id', reviewId)
```

#### Task 1.2: Fix Like/Unlike Queries
```typescript
// Current (broken):
.from('comment_hearts')
.select('id')
.eq('comment_id', commentId)

// Fix to:
.from('content_like')
.select('id')
.eq('comment_id', commentId)
.eq('is_like', true)
```

#### Task 1.3: Update All Column References
- Change all `review_id` to `rating_id`
- Change all `review_comment` to `comment`
- Update INSERT and UPDATE statements to match schema

### Phase 2: Fix ReviewPage Integration (20 minutes)

#### Task 2.1: Remove Duplicate Code
- Remove custom comment fetching logic from ReviewPage
- Remove separate comment display implementation
- Remove references to non-existent tables

#### Task 2.2: Integrate Working Components
```typescript
// Add to ReviewPage.tsx:
import { ReviewInteractions } from '../components/ReviewInteractions';

// Replace custom comment section with:
<ReviewInteractions
  reviewId={reviewId}
  initialComments={[]}
  onCommentAdded={handleCommentAdded}
/>
```

### Phase 3: Testing & Verification (15 minutes)

#### Test Cases:
1. **ReviewCard Component**:
   - [ ] Like button increments/decrements count
   - [ ] Unlike removes like properly
   - [ ] Comment form submits successfully
   - [ ] Comments display with user info
   - [ ] Nested replies work

2. **ReviewPage**:
   - [ ] All ReviewCard tests pass here too
   - [ ] Comments persist on page refresh
   - [ ] Multiple users can interact

### Phase 4: Optional Enhancements (Future)
1. Add real-time updates using Supabase subscriptions
2. Implement comment editing functionality
3. Add soft delete for comments
4. Add more reaction types (love, funny, helpful, etc.)

## Database Schema Reference

### comment table
```sql
- id: SERIAL PRIMARY KEY
- user_id: INTEGER (references user.id)
- rating_id: INTEGER (references rating.id)
- parent_comment_id: INTEGER (self-reference for replies)
- content: TEXT
- is_spoiler: BOOLEAN
- is_published: BOOLEAN
- like_count: INTEGER
- created_at, updated_at: TIMESTAMPTZ
```

### content_like table
```sql
- id: SERIAL PRIMARY KEY
- user_id: INTEGER (references user.id)
- rating_id: INTEGER (optional, for review likes)
- comment_id: INTEGER (optional, for comment likes)
- is_like: BOOLEAN
- created_at: TIMESTAMPTZ
```

## File Locations

### Files to Modify:
- `/src/services/reviewService.ts` - Fix table/column names
- `/src/pages/ReviewPage.tsx` - Remove duplicate code, integrate ReviewInteractions
- `/src/components/comments/CommentItem.tsx` - Verify table references

### Working Files (No Changes Needed):
- `/src/components/ReviewCard.tsx`
- `/src/components/ReviewInteractions.tsx`
- `/src/hooks/useReviewInteractions.ts`
- `/supabase/migrations/*` - Database schema is correct

## Success Criteria
- [ ] Users can like/unlike reviews with real-time count updates
- [ ] Comments display under reviews with proper attribution
- [ ] Nested comment replies function correctly
- [ ] Both ReviewCard and ReviewPage have full interaction capabilities
- [ ] No console errors related to missing tables/columns

## Risk Assessment
- **Low Risk**: Changes are isolated to service layer and one page component
- **No Data Loss**: Database schema remains unchanged
- **Rollback**: Easy to revert if issues arise

## Estimated Time
- **Total Implementation**: ~65 minutes
- **Testing**: 15 minutes
- **Total**: ~80 minutes

## Notes
- 90% of the work is already complete
- UI and database are properly designed
- Only the connection layer needs fixing
- Once fixed, the system should work immediately without additional changes