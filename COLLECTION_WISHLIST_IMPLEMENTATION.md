# Collection & Wishlist Implementation Plan (Optimized)

## Overview
Implementing "Add to Collection" and "Add to Wishlist" features using **separate tables** for optimal performance and clean architecture.

## Architecture Decision
**Using Option 1: Separate Tables** instead of extending `game_progress` table for:
- **Better Performance**: Focused indexes on dedicated tables
- **Cleaner Separation**: Collection/wishlist are distinct from progress tracking
- **Simpler Queries**: No complex WHERE clauses with multiple boolean flags
- **Better Scalability**: Can add specific features without cluttering existing tables

## Database Schema

### New Tables Structure
```sql
-- User's game collection (owned games)
CREATE TABLE user_collection (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_id INTEGER REFERENCES game(id) ON DELETE CASCADE,
  igdb_id INTEGER NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, igdb_id)
);

-- User's wishlist (games they want)
CREATE TABLE user_wishlist (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_id INTEGER REFERENCES game(id) ON DELETE CASCADE,
  igdb_id INTEGER NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  priority INTEGER DEFAULT 0, -- For future sorting
  UNIQUE(user_id, igdb_id)
);
```

### Performance Indexes
```sql
-- Collection indexes
CREATE INDEX idx_collection_user ON user_collection(user_id);
CREATE INDEX idx_collection_igdb ON user_collection(igdb_id);
CREATE INDEX idx_collection_user_igdb ON user_collection(user_id, igdb_id);
CREATE INDEX idx_collection_added ON user_collection(user_id, added_at DESC);

-- Wishlist indexes
CREATE INDEX idx_wishlist_user ON user_wishlist(user_id);
CREATE INDEX idx_wishlist_igdb ON user_wishlist(igdb_id);
CREATE INDEX idx_wishlist_user_igdb ON user_wishlist(user_id, igdb_id);
CREATE INDEX idx_wishlist_priority ON user_wishlist(user_id, priority DESC, added_at DESC);
```

### Row Level Security
```sql
-- Enable RLS
ALTER TABLE user_collection ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_wishlist ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view all collections" ON user_collection 
  FOR SELECT USING (true);
CREATE POLICY "Users can modify own collection" ON user_collection 
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view all wishlists" ON user_wishlist 
  FOR SELECT USING (true);
CREATE POLICY "Users can modify own wishlist" ON user_wishlist 
  FOR ALL USING (auth.uid() = user_id);
```

## Service Layer Architecture

### Single Unified Service: `collectionWishlistService.ts`
- Handles both collection and wishlist operations
- Reduces code duplication
- Maintains consistency across features

### Core Methods
```typescript
// Add/Remove operations
addToCollection(igdbId: number, gameData?: Partial<Game>)
removeFromCollection(igdbId: number)
addToWishlist(igdbId: number, gameData?: Partial<Game>)
removeFromWishlist(igdbId: number)

// Status checks
isInCollection(igdbId: number): Promise<boolean>
isInWishlist(igdbId: number): Promise<boolean>
checkBothStatuses(igdbId: number): Promise<{inCollection: boolean, inWishlist: boolean}>

// Bulk operations
getCollection(userId: number): Promise<CollectionItem[]>
getWishlist(userId: number): Promise<WishlistItem[]>
getCollectionAndWishlist(userId: number): Promise<{collection: Set<number>, wishlist: Set<number>}>
```

## Component Updates

### 1. GamePickerModal Enhancement
- Add `mode: 'top-games' | 'collection' | 'wishlist'` prop
- Fetch from IGDB search when in collection/wishlist mode
- Maintain backward compatibility for top-games functionality

### 2. PlaylistTabs Component
- Replace placeholder content with actual data fetching
- Implement virtual scrolling for large collections
- Add "Add to Collection" and "Add to Wishlist" buttons when user owns profile

### 3. GamePage Integration
- Add wishlist toggle button next to "Started Game" checkbox
- Visual states: outlined (not in wishlist) vs filled (in wishlist)
- Optimistic updates for instant feedback

## Implementation Steps

### Phase 1: Database Migration (30 min)
1. Create migration file with both tables
2. Add all indexes for optimal performance
3. Set up RLS policies
4. Test migration locally

### Phase 2: Service Layer (45 min)
1. Create `collectionWishlistService.ts`
2. Implement all CRUD operations
3. Add batch operations for performance
4. Include error handling and logging

### Phase 3: GamePage Wishlist Button (30 min)
1. Add wishlist button component
2. Implement toggle logic with optimistic updates
3. Add loading states
4. Test with authenticated/unauthenticated users

### Phase 4: Update PlaylistTabs (1 hour)
1. Replace placeholder content
2. Implement data fetching hooks
3. Add game grid displays
4. Implement remove functionality
5. Add empty states

### Phase 5: Enhance GamePickerModal (45 min)
1. Add mode prop and type definitions
2. Implement conditional data fetching
3. Add IGDB search integration
4. Update UI based on mode

## Performance Optimizations

1. **Denormalized IGDB ID**: Store directly to avoid joins
2. **Batch Operations**: Fetch collection + wishlist in parallel
3. **Set Operations**: Use Sets for O(1) lookup performance
4. **Virtual Scrolling**: Handle large collections efficiently
5. **Optimistic Updates**: Update UI immediately, sync in background
6. **Prepared Statements**: Reuse query patterns
7. **Compound Indexes**: Optimize for common query patterns

## Success Metrics
- Sub-200ms response time for add/remove operations
- Support for 1000+ games per collection without performance degradation
- Zero data loss on concurrent modifications
- Seamless experience across devices

## Total Implementation Time
Estimated: 3.5 hours for complete implementation