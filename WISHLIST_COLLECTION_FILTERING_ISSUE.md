# Wishlist/Collection Filtering Issue - Investigation Report

## Problem Statement
Games that have been marked as "started" or "finished" are still appearing in the Wishlist and Collection tabs on the user profile page. Additionally, these games are still showing up in the GamePickerModal search results when trying to add games to wishlist/collection.

## Current Implementation Analysis

### 1. PlaylistTabs Component (`src/components/profile/PlaylistTabs.tsx`)
- **Issue**: The `getCollection()` and `getWishlist()` methods fetch items WITHOUT filtering out started/finished games
- **Lines 56-57**: Calls `collectionWishlistService.getCollection()` and `getWishlist()`
- These methods display ALL items in the tables, regardless of game progress status

### 2. CollectionWishlistService (`src/services/collectionWishlistService.ts`)
- **Working correctly for adding**: 
  - `checkGameProgress()` method (lines 34-51) properly checks if a game is started/finished
  - `addToCollection()` (lines 169-176) and `addToWishlist()` (lines 197-204) prevent adding started/finished games
- **Issue with fetching**:
  - `getCollection()` (lines 295-328) and `getWishlist()` (lines 333-367) don't filter out started/finished games
  - They simply return ALL items from `user_collection` and `user_wishlist` tables

### 3. GamePickerModal Component (`src/components/GamePickerModal.tsx`)
- **Partial filtering implementation**:
  - Lines 73-87: Attempts to fetch started/finished games to exclude
  - **Critical Issue**: Uses `.select('game:game_id(igdb_id)')` which only works if `game_id` foreign key exists
  - Lines 124-128: Filters user's rated games based on exclusion list
  - Lines 169-191: Similar filtering for IGDB search results

## Root Cause Analysis

### Database Schema Issue
The `game_progress` table appears to have two ways to reference games:
1. **Direct `igdb_id` column**: Stores the IGDB ID directly
2. **Foreign key `game_id`**: References the `game` table

The GamePickerModal query `.select('game:game_id(igdb_id)')` only captures games with a valid `game_id` foreign key, missing games that only have `igdb_id` set directly.

## Proposed Solution

### Fix 1: Update GamePickerModal Query
Change the query to capture both direct `igdb_id` and foreign key relationships:

```typescript
// From:
.select('game:game_id(igdb_id)')

// To:
.select('igdb_id, game:game_id(igdb_id)')
```

Then combine both IDs into the exclusion set:
```typescript
progressData.forEach(item => {
  // Add direct igdb_id if present
  if (item.igdb_id) {
    excludedIgdbIds.add(item.igdb_id);
  }
  // Add igdb_id from foreign key if present
  if (item.game?.igdb_id) {
    excludedIgdbIds.add(item.game.igdb_id);
  }
});
```

### Fix 2: Update CollectionWishlistService Methods
Modify `getCollection()` and `getWishlist()` to exclude started/finished games:

```typescript
async getCollection(userId: number): Promise<ServiceResponse<CollectionItem[]>> {
  try {
    // First get started/finished game IDs
    const { data: progressData } = await supabase
      .from('game_progress')
      .select('igdb_id, game_id')
      .eq('user_id', userId)
      .or('started.eq.true,completed.eq.true');
    
    const excludedIgdbIds = new Set<number>();
    const excludedGameIds = new Set<number>();
    
    progressData?.forEach(item => {
      if (item.igdb_id) excludedIgdbIds.add(item.igdb_id);
      if (item.game_id) excludedGameIds.add(item.game_id);
    });
    
    // Then fetch collection items
    let query = supabase
      .from('user_collection')
      .select(`*, game:game_id(*)`)
      .eq('user_id', userId);
    
    const { data, error } = await query;
    
    // Filter out started/finished games
    const filtered = (data || []).filter(item => {
      if (item.igdb_id && excludedIgdbIds.has(item.igdb_id)) return false;
      if (item.game_id && excludedGameIds.has(item.game_id)) return false;
      return true;
    });
    
    return { success: true, data: filtered };
  } catch (error) {
    // Error handling...
  }
}
```

### Alternative: Database-Level Solution (Using SQL)
Create a more efficient query that excludes started/finished games at the database level:

```sql
SELECT uc.*, game.*
FROM user_collection uc
LEFT JOIN game ON game.id = uc.game_id
WHERE uc.user_id = $userId
  AND NOT EXISTS (
    SELECT 1 FROM game_progress gp
    WHERE gp.user_id = uc.user_id
      AND (
        (gp.igdb_id = uc.igdb_id AND uc.igdb_id IS NOT NULL)
        OR (gp.game_id = uc.game_id AND uc.game_id IS NOT NULL)
      )
      AND (gp.started = true OR gp.completed = true)
  )
ORDER BY uc.added_at DESC
```

## Implementation Priority

1. **Fix GamePickerModal** first - prevents adding duplicate games
2. **Fix CollectionWishlistService** second - cleans up the display
3. **Test thoroughly** - ensure no regressions

## Testing Checklist

- [ ] Games marked as started don't appear in Collection tab
- [ ] Games marked as started don't appear in Wishlist tab
- [ ] Games marked as finished don't appear in Collection tab
- [ ] Games marked as finished don't appear in Wishlist tab
- [ ] GamePickerModal doesn't show started games in search
- [ ] GamePickerModal doesn't show finished games in search
- [ ] Can't add a started game to collection via GamePickerModal
- [ ] Can't add a finished game to wishlist via GamePickerModal
- [ ] Performance remains acceptable with the new queries

## Notes

- No data migration needed since there are no active users
- The fix should be backward compatible with existing data
- Consider adding database indexes on `igdb_id` columns if performance becomes an issue