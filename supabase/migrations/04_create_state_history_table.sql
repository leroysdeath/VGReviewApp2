-- Create State History Table (Optional)
-- Tracks all game state transitions for auditing purposes

BEGIN;

-- Create state history table for tracking transitions
CREATE TABLE IF NOT EXISTS game_state_history (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES "user"(id),
  igdb_id INTEGER NOT NULL,
  game_id INTEGER REFERENCES game(id),
  from_state VARCHAR(20),
  to_state VARCHAR(20) NOT NULL,
  transition_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes separately
CREATE INDEX IF NOT EXISTS idx_state_history_user_game 
ON game_state_history(user_id, igdb_id);

CREATE INDEX IF NOT EXISTS idx_state_history_created 
ON game_state_history(created_at DESC);

-- Add comments
COMMENT ON TABLE game_state_history IS 'Audit log of all game state transitions between wishlist, collection, and progress';
COMMENT ON COLUMN game_state_history.from_state IS 'Previous state: wishlist, collection, started, completed, or null';
COMMENT ON COLUMN game_state_history.to_state IS 'New state: wishlist, collection, started, completed';
COMMENT ON COLUMN game_state_history.transition_reason IS 'Optional reason for the state change';

-- Create function to log state transitions
CREATE OR REPLACE FUNCTION log_game_state_transition()
RETURNS TRIGGER AS $$
DECLARE
  v_from_state VARCHAR(20);
  v_to_state VARCHAR(20);
  v_game_id INTEGER;
BEGIN
  -- Get game_id if not present
  IF NEW.game_id IS NULL THEN
    SELECT id INTO v_game_id FROM game WHERE igdb_id = NEW.igdb_id LIMIT 1;
  ELSE
    v_game_id := NEW.game_id;
  END IF;

  -- Determine the state transition based on the table
  IF TG_TABLE_NAME = 'user_collection' THEN
    IF TG_OP = 'INSERT' THEN
      v_to_state := 'collection';
      -- Check if it was in wishlist before
      IF EXISTS (
        SELECT 1 FROM game_state_history 
        WHERE user_id = NEW.user_id 
          AND igdb_id = NEW.igdb_id 
          AND to_state = 'wishlist'
        ORDER BY created_at DESC 
        LIMIT 1
      ) THEN
        v_from_state := 'wishlist';
      END IF;
    ELSIF TG_OP = 'DELETE' THEN
      v_from_state := 'collection';
      RETURN OLD;
    END IF;
    
  ELSIF TG_TABLE_NAME = 'user_wishlist' THEN
    IF TG_OP = 'INSERT' THEN
      v_to_state := 'wishlist';
    ELSIF TG_OP = 'DELETE' THEN
      v_from_state := 'wishlist';
      RETURN OLD;
    END IF;
    
  ELSIF TG_TABLE_NAME = 'game_progress' THEN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
      -- Determine state based on flags
      IF NEW.completed = true THEN
        v_to_state := 'completed';
      ELSIF NEW.started = true THEN
        v_to_state := 'started';
      END IF;
      
      -- For updates, check what changed
      IF TG_OP = 'UPDATE' THEN
        IF OLD.completed = false AND NEW.completed = true THEN
          v_from_state := 'started';
          v_to_state := 'completed';
        ELSIF OLD.started = false AND NEW.started = true THEN
          -- Check if it was in collection before
          IF EXISTS (
            SELECT 1 FROM game_state_history 
            WHERE user_id = NEW.user_id 
              AND igdb_id = NEW.igdb_id 
              AND to_state = 'collection'
            ORDER BY created_at DESC 
            LIMIT 1
          ) THEN
            v_from_state := 'collection';
          END IF;
          v_to_state := 'started';
        END IF;
      END IF;
    END IF;
  END IF;

  -- Only log if we have a state transition
  IF v_to_state IS NOT NULL OR v_from_state IS NOT NULL THEN
    INSERT INTO game_state_history (
      user_id, 
      igdb_id, 
      game_id, 
      from_state, 
      to_state, 
      transition_reason
    ) VALUES (
      COALESCE(NEW.user_id, OLD.user_id),
      COALESCE(NEW.igdb_id, OLD.igdb_id),
      v_game_id,
      v_from_state,
      COALESCE(v_to_state, 'removed'),
      CASE 
        WHEN TG_OP = 'INSERT' THEN 'Added to ' || v_to_state
        WHEN TG_OP = 'UPDATE' THEN 'Status updated'
        WHEN TG_OP = 'DELETE' THEN 'Removed from ' || v_from_state
      END
    );
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to log state transitions
DROP TRIGGER IF EXISTS log_collection_transitions ON user_collection;
CREATE TRIGGER log_collection_transitions
  AFTER INSERT OR DELETE ON user_collection
  FOR EACH ROW
  EXECUTE FUNCTION log_game_state_transition();

DROP TRIGGER IF EXISTS log_wishlist_transitions ON user_wishlist;
CREATE TRIGGER log_wishlist_transitions
  AFTER INSERT OR DELETE ON user_wishlist
  FOR EACH ROW
  EXECUTE FUNCTION log_game_state_transition();

DROP TRIGGER IF EXISTS log_progress_transitions ON game_progress;
CREATE TRIGGER log_progress_transitions
  AFTER INSERT OR UPDATE OF started, completed ON game_progress
  FOR EACH ROW
  EXECUTE FUNCTION log_game_state_transition();

-- Create a view for easy state history viewing
CREATE OR REPLACE VIEW user_game_state_timeline AS
SELECT 
  h.id,
  h.user_id,
  u.username,
  h.igdb_id,
  g.name as game_name,
  h.from_state,
  h.to_state,
  h.transition_reason,
  h.created_at
FROM game_state_history h
LEFT JOIN "user" u ON h.user_id = u.id
LEFT JOIN game g ON h.game_id = g.id
ORDER BY h.created_at DESC;

COMMENT ON VIEW user_game_state_timeline IS 'User-friendly view of game state transitions with user and game names';

-- Verify the table and triggers were created
SELECT 
  'Table created' as status,
  COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'game_state_history';

SELECT 
  trigger_name,
  event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name LIKE 'log_%_transitions'
ORDER BY trigger_name;

COMMIT;