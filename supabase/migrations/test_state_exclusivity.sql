-- Test State Exclusivity
-- Run this after triggers are installed to verify they work correctly
-- This file tests various scenarios to ensure exclusivity is enforced

-- Create a test user if needed
DO $$
DECLARE
  test_user_id INTEGER;
  test_igdb_id INTEGER := 999999; -- Use a high number unlikely to conflict
  test_game_id INTEGER;
BEGIN
  -- Get or create a test user
  SELECT id INTO test_user_id FROM "user" WHERE email = 'test_exclusivity@example.com';
  
  IF test_user_id IS NULL THEN
    INSERT INTO "user" (provider, provider_id, email, name, username)
    VALUES ('test', gen_random_uuid(), 'test_exclusivity@example.com', 'Test User', 'testexclusivity')
    RETURNING id INTO test_user_id;
  END IF;
  
  -- Get or create a test game
  SELECT id INTO test_game_id FROM game WHERE igdb_id = test_igdb_id;
  
  IF test_game_id IS NULL THEN
    INSERT INTO game (igdb_id, name, slug, game_id)
    VALUES (test_igdb_id, 'Test Game for Exclusivity', 'test-game-exclusivity', 'test-' || test_igdb_id)
    RETURNING id INTO test_game_id;
  END IF;
  
  RAISE NOTICE 'Test User ID: %, Test Game ID: %, Test IGDB ID: %', test_user_id, test_game_id, test_igdb_id;
  
  -- Clean up any existing test data
  DELETE FROM user_collection WHERE user_id = test_user_id AND igdb_id = test_igdb_id;
  DELETE FROM user_wishlist WHERE user_id = test_user_id AND igdb_id = test_igdb_id;
  DELETE FROM game_progress WHERE user_id = test_user_id AND igdb_id = test_igdb_id;
  
  RAISE NOTICE '=== TEST 1: Add to wishlist then collection (should remove from wishlist) ===';
  
  -- Add to wishlist
  INSERT INTO user_wishlist (user_id, game_id, igdb_id) 
  VALUES (test_user_id, test_game_id, test_igdb_id);
  
  -- Verify it's in wishlist
  IF EXISTS (SELECT 1 FROM user_wishlist WHERE user_id = test_user_id AND igdb_id = test_igdb_id) THEN
    RAISE NOTICE '✅ Game added to wishlist';
  ELSE
    RAISE EXCEPTION '❌ Failed to add to wishlist';
  END IF;
  
  -- Add to collection (should remove from wishlist)
  INSERT INTO user_collection (user_id, game_id, igdb_id)
  VALUES (test_user_id, test_game_id, test_igdb_id);
  
  -- Verify it's in collection and NOT in wishlist
  IF EXISTS (SELECT 1 FROM user_collection WHERE user_id = test_user_id AND igdb_id = test_igdb_id) THEN
    RAISE NOTICE '✅ Game added to collection';
  ELSE
    RAISE EXCEPTION '❌ Failed to add to collection';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM user_wishlist WHERE user_id = test_user_id AND igdb_id = test_igdb_id) THEN
    RAISE NOTICE '✅ Game removed from wishlist (exclusivity enforced)';
  ELSE
    RAISE EXCEPTION '❌ Game still in wishlist (exclusivity NOT enforced)';
  END IF;
  
  RAISE NOTICE '=== TEST 2: Mark as started (should remove from collection) ===';
  
  -- Mark as started
  INSERT INTO game_progress (user_id, game_id, igdb_id, started, started_date)
  VALUES (test_user_id, test_game_id, test_igdb_id, true, NOW())
  ON CONFLICT (user_id, igdb_id) DO UPDATE SET started = true, started_date = NOW();
  
  -- Verify it's started and NOT in collection
  IF EXISTS (SELECT 1 FROM game_progress WHERE user_id = test_user_id AND igdb_id = test_igdb_id AND started = true) THEN
    RAISE NOTICE '✅ Game marked as started';
  ELSE
    RAISE EXCEPTION '❌ Failed to mark as started';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM user_collection WHERE user_id = test_user_id AND igdb_id = test_igdb_id) THEN
    RAISE NOTICE '✅ Game removed from collection (exclusivity enforced)';
  ELSE
    RAISE EXCEPTION '❌ Game still in collection (exclusivity NOT enforced)';
  END IF;
  
  RAISE NOTICE '=== TEST 3: Try to add started game to wishlist (should fail) ===';
  
  BEGIN
    INSERT INTO user_wishlist (user_id, game_id, igdb_id)
    VALUES (test_user_id, test_game_id, test_igdb_id);
    RAISE EXCEPTION '❌ Should not be able to add started game to wishlist';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%already started or completed%' THEN
        RAISE NOTICE '✅ Correctly prevented adding started game to wishlist';
      ELSE
        RAISE EXCEPTION '❌ Wrong error: %', SQLERRM;
      END IF;
  END;
  
  RAISE NOTICE '=== TEST 4: Try to add started game to collection (should fail) ===';
  
  BEGIN
    INSERT INTO user_collection (user_id, game_id, igdb_id)
    VALUES (test_user_id, test_game_id, test_igdb_id);
    RAISE EXCEPTION '❌ Should not be able to add started game to collection';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%already started or completed%' THEN
        RAISE NOTICE '✅ Correctly prevented adding started game to collection';
      ELSE
        RAISE EXCEPTION '❌ Wrong error: %', SQLERRM;
      END IF;
  END;
  
  -- Clean up test data
  DELETE FROM game_progress WHERE user_id = test_user_id AND igdb_id = test_igdb_id;
  DELETE FROM user_collection WHERE user_id = test_user_id AND igdb_id = test_igdb_id;
  DELETE FROM user_wishlist WHERE user_id = test_user_id AND igdb_id = test_igdb_id;
  
  RAISE NOTICE '=== ALL TESTS PASSED ✅ ===';
  RAISE NOTICE 'State exclusivity triggers are working correctly!';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '=== TEST FAILED ❌ ===';
    RAISE NOTICE 'Error: %', SQLERRM;
    RAISE;
END $$;