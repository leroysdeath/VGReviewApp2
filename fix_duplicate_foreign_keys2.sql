-- Fix code references to removed foreign key constraints
-- Date: 2025-08-24
-- Issue: UserPage and reviewService using incorrect constraint name rating_game_id_fkey
-- Solution: Update code to use the correct constraint name fk_rating_game

-- After running fix_duplicate_foreign_keys.sql, the following code updates are needed:
-- Replace all instances of: game:game!rating_game_id_fkey
-- With: game:game!fk_rating_game

-- Files that need updating:
-- 1. src/pages/UserPage.tsx (line 118)
--    FROM: game:game!rating_game_id_fkey(*)
--    TO:   game:game!fk_rating_game(*)

-- 2. src/services/reviewService.ts (multiple lines: 232, 368, 462, 578, 973)
--    FROM: game:game!rating_game_id_fkey(...)
--    TO:   game:game!fk_rating_game(...)

-- Current state after fix_duplicate_foreign_keys.sql:
-- game_progress table constraints:
--   - fk_game_progress_game (correct, references game.id)
-- rating table constraints:
--   - fk_rating_game (correct, references game.id)

-- Alternative: Use simple foreign key syntax without explicit constraint name
-- Instead of: game:game!fk_rating_game(*)
-- Can use:    game:game_id(*)
-- This will work as long as there's only one foreign key on the game_id column