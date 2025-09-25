# Mario Bros Backlog Issue - Action Plan

## Issue Summary
Users are unable to add games (specifically Mario Bros with IGDB ID 231740) to their backlog due to HTTP 406 and 409 errors. The root causes are:
- Incorrect field name references in the code
- Missing required parameters in function calls
- Improper use of `.single()` method causing 406 errors when no rows exist
- Game ID conflicts causing 409 errors on insertion

## Action Plan

### Phase 1: Fix Immediate Errors (Critical)

#### 1.1 Fix the Field Name Mismatch
**File**: `src/services/collectionWishlistService.ts`
- **Line 80**: Change `gameId = ensureResult.data.id` to `gameId = ensureResult.data.gameId`
- **Impact**: Fixes undefined value that breaks subsequent operations

#### 1.2 Add Missing `id` Field
**File**: `src/services/collectionWishlistService.ts`
- **Lines 71-77**: Add `id: 0` to the `ensureGameExists` call
```typescript
const ensureResult = await ensureGameExists({
  id: 0, // Add this line
  igdb_id: igdbId,
  name: gameData.name || '',
  cover_url: gameData.cover_url,
  genre: gameData.genre,
  release_date: gameData.release_date
});
```
- **Impact**: Ensures the function receives all required parameters

#### 1.3 Fix `.single()` Error Handling
**File**: `src/services/collectionWishlistService.ts`
- **Lines 39-44**: Replace `.single()` with `.maybeSingle()` in `checkGameProgress`
- **Lines 86-90**: Replace `.single()` with `.maybeSingle()` in the game existence check

**File**: `src/services/reviewService.ts`
- **Lines 97-101**: Replace `.single()` with `.maybeSingle()` in the IGDB ID check
- **Impact**: Prevents 406 errors when no rows are found

### Phase 2: Fix the 409 Conflict Issue

#### 2.1 Fix `game_id` Generation
**File**: `src/services/reviewService.ts`
- **Line 133**: Change the `game_id` generation strategy
```typescript
// Current (problematic):
game_id: gameData.igdb_id.toString()

// Fixed:
game_id: `igdb_${gameData.igdb_id}`
```
- **Impact**: Prevents conflicts with existing games

#### 2.2 Add Proper Conflict Handling
- Wrap the insert operation in proper error handling
- If 409 conflict occurs, try to fetch the existing game instead
- Return the existing game's ID rather than failing

### Phase 3: Improve Error Messages

#### 3.1 Add Specific Error Handling
- Catch 406 errors and provide meaningful messages
- Distinguish between "game not found" and "authentication failed"
- Log the actual error details for debugging

#### 3.2 Improve User Feedback
Replace generic "Failed to load to database" with specific messages:
- "Game already in your collection"
- "Unable to verify game status"
- "Game data is being added, please try again"

### Phase 4: Testing & Verification

#### 4.1 Test the Fix
1. Build the app with the fixes: `npm run build`
2. Test adding Mario Bros (IGDB ID 231740) to backlog
3. Verify no 406 or 409 errors occur
4. Confirm game is properly added to database

#### 4.2 Test Edge Cases
- Games that already exist in database
- Games not in IGDB
- Unauthenticated users
- Games already in progress

### Phase 5: Long-term Improvements (Optional)

#### 5.1 Refactor Database Queries
- Use `.maybeSingle()` as default for all single-row queries
- Add a wrapper function that handles common Supabase errors
- Implement retry logic for transient failures

#### 5.2 Improve Game ID Strategy
- Consider removing the unique constraint on `game_id` if not critical
- Use a composite key approach
- Implement a more robust ID generation strategy

#### 5.3 Add Monitoring
- Log all 406 and 409 errors to a monitoring service
- Track which games fail to add most frequently
- Monitor authentication token expiration issues

## Implementation Order

1. **Phase 1** - Quick fixes that immediately resolve the 406 errors (30 minutes)
2. **Phase 2** - Fix the 409 conflict preventing game insertion (20 minutes)
3. **Phase 3** - Better error messages for users (15 minutes)
4. **Phase 4** - Thorough testing before deployment (30 minutes)
5. **Phase 5** - Future improvements (as time permits)

## Expected Outcome

After implementing Phases 1-3:
- ✅ Users can add Mario Bros and other games to their backlog
- ✅ No more 406 "Not Acceptable" errors on game checks
- ✅ No more 409 "Conflict" errors on game insertion
- ✅ Clear error messages when actual issues occur
- ✅ Graceful handling of games not in the database

## Files to Modify

1. `src/services/collectionWishlistService.ts`
   - Lines 39-44, 71-77, 80, 86-90

2. `src/services/reviewService.ts`
   - Lines 97-101, 133

## Testing Checklist

- [ ] Mario Bros (IGDB ID 231740) can be added to backlog
- [ ] No 406 errors in console
- [ ] No 409 errors in console
- [ ] Game appears in user's backlog after adding
- [ ] Error messages are user-friendly
- [ ] Existing games in progress cannot be added to backlog (business rule)
- [ ] Authentication works correctly for user ID 11

## Notes

- The root cause is a combination of code bugs and improper error handling
- The 406 errors are not actually authentication issues but rather Supabase's response when `.single()` finds no rows
- The 409 conflicts are due to non-unique `game_id` values
- These fixes maintain backward compatibility while improving reliability