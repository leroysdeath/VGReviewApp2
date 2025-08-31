# pic_url to cover_url Migration

## Migration Date: December 30, 2024

## Objective
Standardize all image URL references from `pic_url` to `cover_url` across the codebase.

## Database Analysis
- 96,711 games have both `pic_url` and `cover_url` (99% identical values)
- 35 games have only `cover_url` (newer entries)
- 1 game has only `pic_url` (legacy)
- Both columns contain the same IGDB image URLs with `t_cover_big` quality

## Files to Update

### 1. Modal Components
- **ReviewsModal.tsx**
  - Line 56: Select query `pic_url` → `cover_url`
  - Line 90: `item.game.pic_url` → `item.game.cover_url`

- **GamesModal.tsx**
  - Line 70: Select query `pic_url` → `cover_url`
  - Line 88: `item.game.pic_url` → `item.game.cover_url`
  - Line 125: Select query `pic_url` → `cover_url`
  - Line 144: `item.game.pic_url` → `item.game.cover_url`
  - Line 180: Select query `pic_url` → `cover_url`
  - Line 197: `item.game.pic_url` → `item.game.cover_url`

- **GamePickerModal.tsx**
  - Line 10: Interface property `pic_url` → `cover_url`
  - Line 94: Select query `pic_url` → `cover_url`
  - Line 127: `item.game.pic_url` → `item.game.cover_url`
  - Line 410: `game.pic_url` → `game.cover_url`

### 2. Service Files
- **reviewService.ts**
  - Line 306: `pic_url: data.game.pic_url` → `cover_url: data.game.cover_url`
  - Line 352: Interface property `pic_url?` → `cover_url?`
  - Line 490: `pic_url: data.game.pic_url` → `cover_url: data.game.cover_url`
  - Line 606: `pic_url: data.game.pic_url` → `cover_url: data.game.cover_url`
  - Line 663: `pic_url: item.game.pic_url || item.game.cover_url` → `cover_url: item.game.cover_url`
  - Line 727: `pic_url: data.game.pic_url` → `cover_url: data.game.cover_url`
  - Line 1092: Select query `pic_url` → `cover_url`
  - Line 1123: `pic_url: item.game.pic_url || item.game.cover_url` → `cover_url: item.game.cover_url`

- **enhancedSearchService.ts**
  - Line 136: `pic_url: game.pic_url || game.cover_url` → `cover_url: game.cover_url`
  - Line 137: Remove redundant line (already has cover_url)
  - Line 197: `pic_url: igdbGame.cover?.url` → `cover_url: igdbGame.cover?.url`

- **collectionWishlistService.ts**
  - Line 52: `pic_url: gameData.pic_url` → `cover_url: gameData.cover_url`
  - Line 266: Select query `pic_url` → `cover_url`
  - Line 305: Select query `pic_url` → `cover_url`

- **activityService.ts**
  - Line 23: Interface property `pic_url?` → `cover_url?`
  - Line 73: Select query `pic_url` → `cover_url`

- **gameSearchService.ts**
  - Line 29: Interface property `pic_url?` → `cover_url?`
  - Line 363: `pic_url: game.pic_url` → `cover_url: game.cover_url`

- **igdbSyncService.ts**
  - Line 220: `pic_url: igdbGame.cover?.url` → `cover_url: igdbGame.cover?.url`

### 3. Component Files
- **HeaderSearchBar.tsx**
  - Line 548: `game.cover_url || game.pic_url` → `game.cover_url`
  - Line 550: `game.cover_url || game.pic_url` → `game.cover_url`

- **ProfileData.tsx**
  - Line 991: `game.pic_url` → `game.cover_url`
  - Line 1044: `game.pic_url` → `game.cover_url`

- **profile/PlaylistTabs.tsx**
  - Line 24: Interface property `pic_url?` → `cover_url?`
  - Line 145: `item.game?.cover_url || item.game?.pic_url` → `item.game?.cover_url`

- **ResponsiveLandingPage.tsx**
  - Line 68: `review.game?.pic_url` → `review.game?.cover_url`

### 4. Page Files
- **GamePage.tsx**
  - Line 607: `pic_url: game.pic_url` → `cover_url: game.cover_url`
  - Line 650: `pic_url: game.pic_url` → `cover_url: game.cover_url`

### 5. Utility Files
- **supabaseTransformers.ts**
  - Line 15: `supabaseGame.pic_url` → `supabaseGame.cover_url`

- **dataTransformers.ts**
  - Line 9: `dbGame.pic_url` → `dbGame.cover_url`

### 6. Type Definition Files
- **types/supabase.ts**
  - Line 76: `pic_url: string | null` → `cover_url: string | null`
  - Line 88: `pic_url?: string | null` → `cover_url?: string | null`
  - Line 100: `pic_url?: string | null` → `cover_url?: string | null`

### 7. Feature Files
- **features/activity/activityService.ts**
  - Line 19: Comment update `// Handle both cover_url and pic_url` → `// Handle cover_url`
  - Line 236: `row.game_cover || row.game_pic_url` → `row.game_cover || row.game_cover_url`
  - Line 237: Remove `gamePicUrl: row.game_pic_url,`

## Files EXCLUDED from Changes
- **SearchResultsPage.tsx** - Already handles fallback correctly
- **igdbService.ts** - Per user request

## Total Files to Update: 18

## Notes
- All changes are simple property renames from `pic_url` to `cover_url`
- No functional changes required
- Database already has cover_url populated for 99% of games
- This standardization will improve code maintainability