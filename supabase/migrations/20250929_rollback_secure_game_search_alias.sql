-- =====================================================
-- ROLLBACK Migration for secure_game_search Function
-- =====================================================
-- This migration safely removes the secure_game_search function
-- and returns the database to its previous state
--
-- USE THIS IF: The migration 20250929_create_secure_game_search_alias.sql
-- causes any issues or needs to be reverted
--
-- SAFETY: This only drops the secure_game_search function
-- It does NOT touch search_games_secure or any other existing functions

-- Step 1: Drop the secure_game_search function if it exists
DROP FUNCTION IF EXISTS secure_game_search(
    text,
    integer,
    boolean,
    text[],
    text[],
    integer,
    numeric
);

-- Step 2: Revoke permissions (if they were granted)
-- This is safe even if permissions weren't granted
DO $$
BEGIN
    -- Attempt to revoke, but don't fail if function doesn't exist
    EXECUTE 'REVOKE ALL ON FUNCTION secure_game_search(text, integer, boolean, text[], text[], integer, numeric) FROM authenticated'
    WHERE EXISTS (
        SELECT 1 FROM pg_proc
        WHERE proname = 'secure_game_search'
    );
EXCEPTION
    WHEN undefined_function THEN
        -- Function doesn't exist, nothing to revoke
        NULL;
END $$;

DO $$
BEGIN
    EXECUTE 'REVOKE ALL ON FUNCTION secure_game_search(text, integer, boolean, text[], text[], integer, numeric) FROM anon'
    WHERE EXISTS (
        SELECT 1 FROM pg_proc
        WHERE proname = 'secure_game_search'
    );
EXCEPTION
    WHEN undefined_function THEN
        NULL;
END $$;

-- Step 3: Verify rollback
DO $$
DECLARE
    func_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO func_count
    FROM pg_proc
    WHERE proname = 'secure_game_search';

    IF func_count = 0 THEN
        RAISE NOTICE '✓ Rollback successful: secure_game_search function removed';
    ELSE
        RAISE WARNING '⚠ Rollback incomplete: secure_game_search function still exists';
    END IF;

    -- Verify search_games_secure still exists (should not be affected)
    SELECT COUNT(*) INTO func_count
    FROM pg_proc
    WHERE proname = 'search_games_secure';

    IF func_count > 0 THEN
        RAISE NOTICE '✓ Original search_games_secure function intact';
    ELSE
        RAISE WARNING '⚠ WARNING: search_games_secure function is missing!';
    END IF;
END $$;

-- Log completion
COMMENT ON SCHEMA public IS 'Rollback completed: secure_game_search removed, search_games_secure preserved';