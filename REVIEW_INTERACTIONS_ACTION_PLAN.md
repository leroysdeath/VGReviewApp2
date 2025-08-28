# Review Interactions - Implementation Action Plan

## Overview
Fix the commenting and liking functionality for reviews by correcting table/column name mismatches between the service layer and database.

## Action Plan for Fixing Review Comments & Likes

### **Phase 1: Fix Service Layer** (30 minutes)
**Priority: CRITICAL - This unblocks everything**

1. **Update reviewService.ts table references**:
   - Find & replace all `review_comment` → `comment`
   - Find & replace all `review_id` → `rating_id`
   - Find & replace all `comment_hearts` → `content_like`

2. **Fix the query structure**:
   - Update SELECT queries to use correct column names
   - Fix JOIN conditions to match actual foreign keys
   - Ensure INSERT statements match the schema

3. **Update the like/unlike logic**:
   - Change to use `content_like` table
   - Add `is_like: true` condition for like queries
   - Ensure proper user_id and rating_id/comment_id relationships

### **Phase 2: Fix ReviewPage Component** (20 minutes)
**Priority: HIGH - Enables full functionality on review details**

1. **Remove broken duplicate code**:
   - Delete the custom comment fetching useEffect
   - Remove the inline comment rendering logic
   - Remove references to non-existent `review_comments` and `comment_hearts`

2. **Integrate the working ReviewInteractions component**:
   - Import `ReviewInteractions` from components
   - Replace custom comment section with `<ReviewInteractions />`
   - Pass proper props (reviewId, etc.)

### **Phase 3: Verify ReviewCard** (10 minutes)
**Priority: MEDIUM - Should work once Phase 1 is complete**

1. **Check existing implementation**:
   - Verify it's using `useReviewInteractions` hook
   - Ensure it's passing correct reviewId prop
   - Confirm like/comment buttons are wired up

### **Phase 4: Test Everything** (15 minutes)
**Priority: HIGH - Ensures fix is complete**

1. **Test on ReviewCard (list view)**:
   - Click like button → count increases
   - Click again → unlike and count decreases
   - Click comment → form appears
   - Submit comment → appears in list

2. **Test on ReviewPage (detail view)**:
   - All ReviewCard tests
   - Reply to a comment → nested reply appears
   - Multiple comments display correctly
   - Page refresh maintains state

### **Phase 5: Handle Edge Cases** (10 minutes)
**Priority: LOW - Nice to have**

1. **Add error handling**:
   - Show toast on failed like/comment
   - Handle network errors gracefully
   - Add retry logic for failed operations

2. **Performance optimizations**:
   - Add pagination for comments if > 20
   - Implement lazy loading for nested replies
   - Cache like status to prevent flicker

## Implementation Order & Dependencies

```
Phase 1 (Service Layer) 
    ↓ [Must complete first - everything depends on this]
Phase 2 (ReviewPage) + Phase 3 (ReviewCard)
    ↓ [Can be done in parallel]
Phase 4 (Testing)
    ↓ [Required before deployment]
Phase 5 (Edge Cases)
    [Optional improvements]
```

## Quick Win Strategy

**If time is limited, just do Phase 1!** 

The ReviewCard component already uses the correct components and hooks, so fixing the service layer alone should make likes and comments work on the review cards immediately. This would give you 70% of the functionality in 30 minutes.

## Risk Mitigation

1. **Before starting**: Take a database backup or note current migration state
2. **Test in dev first**: Run locally before deploying
3. **Incremental testing**: Test each phase before moving to next
4. **Easy rollback**: All changes are in application code, not database

## Success Metrics

- [ ] No "table not found" errors in console
- [ ] Like counts update immediately when clicked
- [ ] Comments post successfully and display
- [ ] Nested replies work
- [ ] Both ReviewCard and ReviewPage have working interactions

## Time Estimate

- **Minimum viable fix**: 30 minutes (Phase 1 only)
- **Full implementation**: 75 minutes (Phases 1-4)
- **With enhancements**: 85 minutes (All phases)

## Key Files to Modify

### Phase 1 Files:
- `/src/services/reviewService.ts` - Main service layer fixes

### Phase 2 Files:
- `/src/pages/ReviewPage.tsx` - Remove duplicate code, integrate ReviewInteractions

### Phase 3 Files:
- `/src/components/ReviewCard.tsx` - Verify implementation (likely no changes needed)

### Supporting Files (Reference Only):
- `/src/components/ReviewInteractions.tsx` - Working component (no changes)
- `/src/hooks/useReviewInteractions.ts` - Working hook (no changes)
- Database schema in `/supabase/migrations/` - Already correct

## Database Schema Reference (Correct)

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

## Note
The key insight is that **this is primarily a naming issue, not a functionality issue**. The hard work of building the UI, state management, and database schema is already done. We just need to connect the dots by fixing the table/column references.