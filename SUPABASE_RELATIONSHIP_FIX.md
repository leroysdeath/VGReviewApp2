# Supabase Relationship Ambiguity Fix

## Problem
Multiple foreign keys exist between tables causing "Could not embed because more than one relationship was found" errors.

## Foreign Keys Found
### Rating Table
- `rating_user_id_fkey` -> user
- `fk_rating_user` -> user  
- `fk_rating_user_id` -> user
- `rating_game_id_fkey` -> game
- `fk_rating_game` -> game
- `fk_rating_game_id` -> game

## Solution
Use explicit relationship names in all queries:

### For User relationships:
```javascript
// OLD (ambiguous)
user:user_id(*)

// NEW (explicit)
user:user!rating_user_id_fkey(*)
```

### For Game relationships:
```javascript
// OLD (ambiguous)
game:game_id(*)

// NEW (explicit)
game:game!rating_game_id_fkey(*)
```

## Files That Need Fixing
1. src/pages/UserPage.tsx - FIXED
2. src/services/reviewService.ts - Multiple queries
3. src/services/activityService.ts - Multiple queries
4. src/services/gameDataService.ts - One query

## Testing
After fixing, test:
1. User profile pages load correctly
2. Reviews display with user and game info
3. Activity feeds work
4. Comments load properly