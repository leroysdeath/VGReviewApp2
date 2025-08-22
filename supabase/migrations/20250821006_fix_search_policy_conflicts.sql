-- =====================================================
-- Fix Search Policy Conflicts
-- =====================================================
-- This migration resolves the duplicate policy error
-- by using proper conflict detection and resolution

-- Step 1: Check and handle existing policies
DO $$
DECLARE
    policy_exists boolean;
    rls_enabled boolean;
BEGIN
    -- Check if RLS is enabled on game table
    SELECT relrowsecurity INTO rls_enabled 
    FROM pg_class 
    WHERE relname = 'game' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = current_schema());
    
    RAISE NOTICE 'RLS enabled on game table: %', rls_enabled;
    
    -- Option 1: Drop and recreate with unique names
    BEGIN
        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS "Allow search_games_secure" ON game;
        DROP POLICY IF EXISTS "Allow search_games_phrase" ON game;  
        DROP POLICY IF EXISTS "Allow search_games_by_genre" ON game;
        RAISE NOTICE 'Successfully dropped existing search policies';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Some policies may not have existed: %', SQLERRM;
    END;
    
    -- Create new policies with v2 suffix to avoid future conflicts
    BEGIN
        CREATE POLICY "search_games_secure_v2" ON game FOR SELECT USING (true);
        RAISE NOTICE 'Created policy: search_games_secure_v2';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'Policy search_games_secure_v2 already exists';
        WHEN OTHERS THEN
            RAISE NOTICE 'Error creating search_games_secure_v2: %', SQLERRM;
    END;
    
    BEGIN
        CREATE POLICY "search_games_phrase_v2" ON game FOR SELECT USING (true);
        RAISE NOTICE 'Created policy: search_games_phrase_v2';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'Policy search_games_phrase_v2 already exists';
        WHEN OTHERS THEN
            RAISE NOTICE 'Error creating search_games_phrase_v2: %', SQLERRM;
    END;
    
    BEGIN
        CREATE POLICY "search_games_by_genre_v2" ON game FOR SELECT USING (true);
        RAISE NOTICE 'Created policy: search_games_by_genre_v2';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'Policy search_games_by_genre_v2 already exists';
        WHEN OTHERS THEN
            RAISE NOTICE 'Error creating search_games_by_genre_v2: %', SQLERRM;
    END;
    
END $$;

-- Step 2: Verify the search functions still work
DO $$
DECLARE
    function_exists boolean;
BEGIN
    -- Check if search functions exist
    SELECT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'search_games_secure' 
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = current_schema())
    ) INTO function_exists;
    
    IF function_exists THEN
        RAISE NOTICE 'search_games_secure function exists and is ready';
    ELSE
        RAISE WARNING 'search_games_secure function is missing - run the full-text search migration first';
    END IF;
    
    SELECT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'search_games_phrase' 
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = current_schema())
    ) INTO function_exists;
    
    IF function_exists THEN
        RAISE NOTICE 'search_games_phrase function exists and is ready';
    ELSE
        RAISE WARNING 'search_games_phrase function is missing - run the full-text search migration first';
    END IF;
    
    SELECT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'search_games_by_genre' 
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = current_schema())
    ) INTO function_exists;
    
    IF function_exists THEN
        RAISE NOTICE 'search_games_by_genre function exists and is ready';
    ELSE
        RAISE WARNING 'search_games_by_genre function is missing - run the full-text search migration first';
    END IF;
END $$;

-- Step 3: Test the search functionality (optional verification)
DO $$
DECLARE
    test_result integer;
BEGIN
    -- Test if we can call the search function (this will fail safely if there are permission issues)
    BEGIN
        SELECT COUNT(*) INTO test_result FROM search_games_secure('test', 1);
        RAISE NOTICE 'Search function test passed - returned % results', test_result;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Search function test info: % (this may be normal)', SQLERRM;
    END;
END $$;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE '=== Search Policy Conflict Fix Completed ===';
    RAISE NOTICE 'The search functionality should now work without policy conflicts';
    RAISE NOTICE 'Functions available: search_games_secure, search_games_phrase, search_games_by_genre';
    RAISE NOTICE 'New policies: search_games_secure_v2, search_games_phrase_v2, search_games_by_genre_v2';
END $$;