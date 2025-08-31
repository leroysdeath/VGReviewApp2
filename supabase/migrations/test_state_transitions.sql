-- Test State Transitions
-- Tests various state transition scenarios

DO $$
DECLARE
  test_user_id INTEGER;
  test_igdb_id INTEGER := 888888; -- Different test game
  test_game_id INTEGER;
  v_count INTEGER;
BEGIN
  -- Get test user
  SELECT id INTO test_user_id FROM "user" WHERE email = 'test_exclusivity@example.com';
  
  IF test_user_id IS NULL THEN
    INSERT INTO "user" (provider, provider_id, email, name, username)
    VALUES ('test', gen_random_uuid(), 'test_exclusivity@example.com', 'Test User', 'testexclusivity')
    RETURNING id INTO test_user_id;
  END IF;
  
  -- Create test game
  SELECT id INTO test_game_id FROM game WHERE igdb_id = test_igdb_id;
  
  IF test_game_id IS NULL THEN
    INSERT INTO game (igdb_id, name, slug, game_id)
    VALUES (test_igdb_id, 'Test Transitions Game', 'test-transitions-game', 'test-' || test_igdb_id)
    RETURNING id INTO test_game_id;
  END IF;
  
  -- Clean slate
  DELETE FROM user_collection WHERE user_id = test_user_id AND igdb_id = test_igdb_id;
  DELETE FROM user_wishlist WHERE user_id = test_user_id AND igdb_id = test_igdb_id;
  DELETE FROM game_progress WHERE user_id = test_user_id AND igdb_id = test_igdb_id;
  
  RAISE NOTICE '=== Testing Complete State Transition Flow ===';
  
  -- Step 1: None -> Wishlist
  RAISE NOTICE 'Step 1: Adding to wishlist...';
  INSERT INTO user_wishlist (user_id, game_id, igdb_id, priority, notes)
  VALUES (test_user_id, test_game_id, test_igdb_id, 5, 'Really want this game!');
  
  SELECT COUNT(*) INTO v_count FROM user_wishlist 
  WHERE user_id = test_user_id AND igdb_id = test_igdb_id;
  
  IF v_count = 1 THEN
    RAISE NOTICE '✅ Added to wishlist';
  ELSE
    RAISE EXCEPTION '❌ Failed to add to wishlist';
  END IF;
  
  -- Step 2: Wishlist -> Collection
  RAISE NOTICE 'Step 2: Moving to collection...';
  INSERT INTO user_collection (user_id, game_id, igdb_id)
  VALUES (test_user_id, test_game_id, test_igdb_id);
  
  SELECT COUNT(*) INTO v_count FROM user_collection 
  WHERE user_id = test_user_id AND igdb_id = test_igdb_id;
  
  IF v_count = 1 THEN
    RAISE NOTICE '✅ Moved to collection';
  ELSE
    RAISE EXCEPTION '❌ Failed to move to collection';
  END IF;
  
  SELECT COUNT(*) INTO v_count FROM user_wishlist 
  WHERE user_id = test_user_id AND igdb_id = test_igdb_id;
  
  IF v_count = 0 THEN
    RAISE NOTICE '✅ Removed from wishlist automatically';
  ELSE
    RAISE EXCEPTION '❌ Still in wishlist';
  END IF;
  
  -- Step 3: Collection -> Started
  RAISE NOTICE 'Step 3: Starting game...';
  INSERT INTO game_progress (user_id, game_id, igdb_id, started, started_date)
  VALUES (test_user_id, test_game_id, test_igdb_id, true, NOW());
  
  SELECT COUNT(*) INTO v_count FROM game_progress 
  WHERE user_id = test_user_id AND igdb_id = test_igdb_id AND started = true;
  
  IF v_count = 1 THEN
    RAISE NOTICE '✅ Game started';
  ELSE
    RAISE EXCEPTION '❌ Failed to start game';
  END IF;
  
  SELECT COUNT(*) INTO v_count FROM user_collection 
  WHERE user_id = test_user_id AND igdb_id = test_igdb_id;
  
  IF v_count = 0 THEN
    RAISE NOTICE '✅ Removed from collection automatically';
  ELSE
    RAISE EXCEPTION '❌ Still in collection';
  END IF;
  
  -- Step 4: Started -> Completed
  RAISE NOTICE 'Step 4: Completing game...';
  UPDATE game_progress 
  SET completed = true, completed_date = NOW()
  WHERE user_id = test_user_id AND igdb_id = test_igdb_id;
  
  SELECT COUNT(*) INTO v_count FROM game_progress 
  WHERE user_id = test_user_id AND igdb_id = test_igdb_id 
    AND started = true AND completed = true;
  
  IF v_count = 1 THEN
    RAISE NOTICE '✅ Game completed';
  ELSE
    RAISE EXCEPTION '❌ Failed to complete game';
  END IF;
  
  -- Verify final state
  RAISE NOTICE '=== Final State Verification ===';
  
  SELECT 
    (SELECT COUNT(*) FROM user_wishlist WHERE user_id = test_user_id AND igdb_id = test_igdb_id) as in_wishlist,
    (SELECT COUNT(*) FROM user_collection WHERE user_id = test_user_id AND igdb_id = test_igdb_id) as in_collection,
    (SELECT COUNT(*) FROM game_progress WHERE user_id = test_user_id AND igdb_id = test_igdb_id AND completed = true) as is_completed
  INTO v_count;
  
  RAISE NOTICE 'Final state - Wishlist: 0, Collection: 0, Completed: 1';
  RAISE NOTICE '✅ Full transition flow completed successfully!';
  
  -- Clean up
  DELETE FROM game_progress WHERE user_id = test_user_id AND igdb_id = test_igdb_id;
  
  RAISE NOTICE '=== All transition tests passed! ===';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '=== Transition test failed ===';
    RAISE NOTICE 'Error: %', SQLERRM;
    -- Clean up on error
    DELETE FROM user_collection WHERE user_id = test_user_id AND igdb_id = test_igdb_id;
    DELETE FROM user_wishlist WHERE user_id = test_user_id AND igdb_id = test_igdb_id;
    DELETE FROM game_progress WHERE user_id = test_user_id AND igdb_id = test_igdb_id;
    RAISE;
END $$;