-- Create State Exclusivity Triggers
-- Enforces mutual exclusivity between collection, wishlist, and game_progress tables

BEGIN;

-- Drop existing trigger function if it exists
DROP FUNCTION IF EXISTS manage_game_state_exclusivity() CASCADE;

-- Create the main trigger function for managing game state exclusivity
CREATE OR REPLACE FUNCTION manage_game_state_exclusivity() 
RETURNS TRIGGER AS $$
DECLARE
  v_game_name TEXT;
BEGIN
  -- Get game name for better error messages
  SELECT name INTO v_game_name 
  FROM game 
  WHERE igdb_id = NEW.igdb_id 
  LIMIT 1;

  -- TRIGGER ON game_progress table
  IF TG_TABLE_NAME = 'game_progress' THEN
    -- Only enforce if game is being marked as started or completed
    IF NEW.started = true OR NEW.completed = true THEN
      -- Remove from collection if exists
      DELETE FROM user_collection 
      WHERE user_id = NEW.user_id 
        AND igdb_id = NEW.igdb_id;
      
      -- Remove from wishlist if exists
      DELETE FROM user_wishlist 
      WHERE user_id = NEW.user_id 
        AND igdb_id = NEW.igdb_id;
      
      -- Log the state transition
      RAISE NOTICE 'Game "%" (igdb_id: %) moved to progress, removed from collection/wishlist for user %', 
        COALESCE(v_game_name, 'Unknown'), NEW.igdb_id, NEW.user_id;
    END IF;
    
    RETURN NEW;
  END IF;
  
  -- TRIGGER ON user_collection table
  IF TG_TABLE_NAME = 'user_collection' THEN
    -- Check if game is already started or completed
    IF EXISTS (
      SELECT 1 FROM game_progress 
      WHERE user_id = NEW.user_id 
        AND igdb_id = NEW.igdb_id
        AND (started = true OR completed = true)
    ) THEN
      RAISE EXCEPTION 'Cannot add game "%" to collection: already started or completed', 
        COALESCE(v_game_name, 'igdb_id: ' || NEW.igdb_id);
    END IF;
    
    -- Remove from wishlist (mutual exclusivity between collection and wishlist)
    DELETE FROM user_wishlist 
    WHERE user_id = NEW.user_id 
      AND igdb_id = NEW.igdb_id;
    
    IF FOUND THEN
      RAISE NOTICE 'Game "%" moved from wishlist to collection for user %', 
        COALESCE(v_game_name, 'igdb_id: ' || NEW.igdb_id), NEW.user_id;
    END IF;
    
    RETURN NEW;
  END IF;
  
  -- TRIGGER ON user_wishlist table
  IF TG_TABLE_NAME = 'user_wishlist' THEN
    -- Check if game is already started or completed
    IF EXISTS (
      SELECT 1 FROM game_progress 
      WHERE user_id = NEW.user_id 
        AND igdb_id = NEW.igdb_id
        AND (started = true OR completed = true)
    ) THEN
      RAISE EXCEPTION 'Cannot add game "%" to wishlist: already started or completed', 
        COALESCE(v_game_name, 'igdb_id: ' || NEW.igdb_id);
    END IF;
    
    -- Remove from collection (mutual exclusivity between collection and wishlist)
    DELETE FROM user_collection 
    WHERE user_id = NEW.user_id 
      AND igdb_id = NEW.igdb_id;
    
    IF FOUND THEN
      RAISE NOTICE 'Game "%" moved from collection to wishlist for user %', 
        COALESCE(v_game_name, 'igdb_id: ' || NEW.igdb_id), NEW.user_id;
    END IF;
    
    RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers on all three tables

-- Trigger for game_progress table
DROP TRIGGER IF EXISTS enforce_state_exclusivity_on_progress ON game_progress;
CREATE TRIGGER enforce_state_exclusivity_on_progress
  BEFORE INSERT OR UPDATE ON game_progress
  FOR EACH ROW 
  EXECUTE FUNCTION manage_game_state_exclusivity();

-- Trigger for user_collection table  
DROP TRIGGER IF EXISTS enforce_state_exclusivity_on_collection ON user_collection;
CREATE TRIGGER enforce_state_exclusivity_on_collection
  BEFORE INSERT OR UPDATE ON user_collection
  FOR EACH ROW 
  EXECUTE FUNCTION manage_game_state_exclusivity();

-- Trigger for user_wishlist table
DROP TRIGGER IF EXISTS enforce_state_exclusivity_on_wishlist ON user_wishlist;
CREATE TRIGGER enforce_state_exclusivity_on_wishlist
  BEFORE INSERT OR UPDATE ON user_wishlist
  FOR EACH ROW 
  EXECUTE FUNCTION manage_game_state_exclusivity();

-- Add comments for documentation
COMMENT ON FUNCTION manage_game_state_exclusivity() IS 
'Enforces mutual exclusivity between game states:
- Games in progress (started/completed) cannot be in collection or wishlist
- Games cannot be in both collection and wishlist simultaneously
- Automatically removes from other states when adding to a new state';

COMMENT ON TRIGGER enforce_state_exclusivity_on_progress ON game_progress IS 
'Removes game from collection/wishlist when marked as started or completed';

COMMENT ON TRIGGER enforce_state_exclusivity_on_collection ON user_collection IS 
'Prevents adding started/completed games and removes from wishlist';

COMMENT ON TRIGGER enforce_state_exclusivity_on_wishlist ON user_wishlist IS 
'Prevents adding started/completed games and removes from collection';

-- Verify triggers were created
SELECT 
  t.trigger_name,
  t.event_manipulation,
  t.event_object_table,
  t.action_timing,
  t.action_orientation
FROM information_schema.triggers t
WHERE t.trigger_schema = 'public'
  AND t.trigger_name LIKE 'enforce_state_exclusivity%'
ORDER BY t.trigger_name;

COMMIT;