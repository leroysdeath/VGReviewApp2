# Action Plan: Add to Collection & Add to Wishlist Features

## Overview
Implement two new features for tracking games: "Add to Collection" (owned games) and "Add to Wishlist" (games user wants to play). These features will integrate with the existing `game_progress` table structure and provide UI elements in both the UserPage Playlist tab and GamePage.

## Database Design

### Option 1: Extend `game_progress` table (Recommended)
- Add new columns to existing `game_progress` table:
  - `in_collection` (boolean) - marks game as owned/in collection
  - `in_wishlist` (boolean) - marks game as wishlisted
  - `added_to_collection_date` (timestamp)
  - `added_to_wishlist_date` (timestamp)
- Benefits: Leverages existing table structure, maintains single source of truth for game tracking
- Migration required to add columns

### Option 2: Create separate tables
- Create `user_collections` and `user_wishlists` tables
- More complex but allows for additional metadata per list type
- Not recommended given current simple requirements

## Component Architecture

### 1. Modal Strategy
- **Repurpose `GamePickerModal`** for both features (recommended)
  - Already has game search/selection functionality
  - Add a `mode` prop: `'collection' | 'wishlist' | 'top-games'`
  - Modify title and selection behavior based on mode
  - For collection/wishlist modes, fetch ALL games (not just reviewed ones)
  - Use IGDB search API for discovering new games to add

### 2. UserPage Playlist Tab Updates
- **Collection Subtab**:
  - Display games where `in_collection = true`
  - Add green "Add to Collection" button when user owns the profile
  - Button opens `GamePickerModal` in collection mode
  - Show game cards with cover art, title, and remove option
  
- **Wishlist Subtab**:
  - Display games where `in_wishlist = true`  
  - Add blue "Add to Wishlist" button when user owns the profile
  - Button opens `GamePickerModal` in wishlist mode
  - Show game cards with cover art, title, and remove option

### 3. GamePage Integration
- Add "Add to Wishlist" button:
  - Position: Left of "Started Game" checkbox
  - Style: Blue button similar to "Write a Review" button
  - States: 
    - Default: "Add to Wishlist" (outlined blue)
    - Added: "In Wishlist" (filled blue with check icon)
  - Click behavior: Toggle wishlist status directly (no modal needed)

## Service Layer Updates

### 1. Create `collectionService.ts`
```typescript
// Service methods to implement:
- addToCollection(igdbId: number) - Add game to user's collection
- removeFromCollection(igdbId: number) - Remove from collection
- getCollection(userId: number) - Get user's collection
- isInCollection(igdbId: number) - Check if game is in collection
```

### 2. Create `wishlistService.ts`
```typescript
// Service methods to implement:
- addToWishlist(igdbId: number) - Add game to wishlist
- removeFromWishlist(igdbId: number) - Remove from wishlist
- getWishlist(userId: number) - Get user's wishlist
- isInWishlist(igdbId: number) - Check if game is wishlisted
```

### 3. Update `gameProgressService.ts`
- Extend existing functions to handle collection/wishlist flags
- Ensure `ensureGameExists` is called before adding to collection/wishlist

## UI/UX Specifications

### Collection Button (UserPage)
- Color: Green (`bg-green-600 hover:bg-green-700`)
- Icon: Plus icon
- Text: "Add to Collection"
- Position: Top-right of Collection subtab content area

### Wishlist Buttons
- **UserPage Button**:
  - Color: Blue (`bg-blue-600 hover:bg-blue-700`)
  - Icon: Plus icon  
  - Text: "Add to Wishlist"
  - Position: Top-right of Wishlist subtab content area

- **GamePage Button**:
  - Color: Blue (outlined initially, filled when added)
  - Icon: Heart or Gift icon
  - Text: "Add to Wishlist" / "In Wishlist" (toggled)
  - Position: Left of "Started Game" checkbox, same row

## Implementation Steps

### Phase 1: Database Layer
1. **Create Migration**
   - Add columns to `game_progress` table
   - Create indexes for efficient queries
   - Add RLS policies for security

### Phase 2: Service Layer
1. **Implement Collection Service**
   - Create `collectionService.ts` with CRUD operations
   - Handle game existence checks
   - Implement proper error handling

2. **Implement Wishlist Service**
   - Create `wishlistService.ts` with CRUD operations
   - Share common logic with collection service
   - Add caching for performance

### Phase 3: Modal Updates
1. **Enhance GamePickerModal**
   - Add `mode` prop with type definition
   - Implement conditional data fetching based on mode
   - Add IGDB search integration for discovering new games
   - Update UI text based on mode (title, button labels)

### Phase 4: UserPage Integration
1. **Update PlaylistTabs Component**
   - Replace placeholder content with actual data
   - Implement data fetching hooks
   - Add loading and error states

2. **Create Collection Grid**
   - Display game cards with cover images
   - Add remove functionality with confirmation
   - Implement empty state messaging

3. **Create Wishlist Grid**
   - Similar to collection grid
   - Add "Move to Collection" quick action
   - Show release dates for upcoming games

### Phase 5: GamePage Integration
1. **Add Wishlist Button Component**
   - Create reusable button component
   - Implement toggle logic with optimistic updates
   - Add loading state during API calls

2. **Update GamePage State**
   - Add wishlist status to page state
   - Fetch initial status on page load
   - Handle authentication requirements

### Phase 6: Polish & Optimization
1. **Performance Optimization**
   - Implement pagination for large collections
   - Add virtual scrolling if needed
   - Optimize image loading

2. **User Experience**
   - Add toast notifications for actions
   - Implement undo functionality
   - Add keyboard shortcuts

## Edge Cases & Considerations

### Authentication
- Require login for collection/wishlist actions
- Show appropriate messaging for non-authenticated users
- Handle session expiry gracefully

### Data Integrity
- Ensure IGDB ID is properly stored and used
- Handle game merges/duplicates
- Validate data before database operations

### Performance
- Implement pagination for large collections (>50 items)
- Use SWR or React Query for caching
- Optimize database queries with proper indexes

### User Experience
- Provide clear visual feedback for all actions
- Implement optimistic updates for instant feedback
- Add confirmation dialogs for destructive actions

### Mobile Responsiveness
- Ensure buttons and modals work on mobile
- Optimize touch targets for mobile devices
- Consider swipe gestures for remove actions

### Error Handling
- Graceful failures with user-friendly messages
- Implement retry logic for network failures
- Log errors for debugging

### Real-time Updates
- Consider using Supabase subscriptions for live updates
- Sync state across multiple tabs/windows
- Handle concurrent modifications

## Success Metrics
- **Functionality**: Users can successfully add/remove games from collection and wishlist
- **Performance**: Actions complete within 200ms (optimistic updates)
- **Reliability**: 99.9% success rate for database operations
- **Usability**: Clear visual feedback for all game statuses
- **Data Persistence**: Proper data persistence across sessions
- **Discoverability**: Users can easily find and use the features

## Future Enhancements
1. **Import/Export**: Allow users to import collections from other platforms
2. **Sharing**: Share collection/wishlist with friends
3. **Statistics**: Show collection value, completion rate, etc.
4. **Recommendations**: Suggest games based on collection/wishlist
5. **Notifications**: Alert when wishlisted games go on sale
6. **Custom Lists**: Allow users to create custom game lists
7. **Sorting/Filtering**: Advanced organization options
8. **Bulk Operations**: Select multiple games for batch actions

## Technical Debt Considerations
- Refactor `game_progress` table if it becomes too wide
- Consider GraphQL for more efficient data fetching
- Implement proper state management (Zustand) if complexity grows
- Add comprehensive test coverage