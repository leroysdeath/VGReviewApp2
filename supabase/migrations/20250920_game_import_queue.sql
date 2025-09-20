-- Migration: Game Import Queue and Data Pipeline
-- Date: 2025-09-20
-- Purpose: Support automatic import of games from IGDB when searched but not found locally

-- Create game import queue table
CREATE TABLE IF NOT EXISTS game_import_queue (
  id SERIAL PRIMARY KEY,
  igdb_id INTEGER NOT NULL UNIQUE,
  priority INTEGER DEFAULT 0,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  imported_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'importing', 'completed', 'failed')),
  error_message TEXT,
  requested_by UUID REFERENCES auth.users(id),
  game_data JSONB, -- Store IGDB data for import
  search_query TEXT -- Store the original search that triggered this
);

-- Add indexes for efficient processing
CREATE INDEX IF NOT EXISTS idx_import_queue_status ON game_import_queue(status) WHERE status IN ('pending', 'importing');
CREATE INDEX IF NOT EXISTS idx_import_queue_priority ON game_import_queue(priority DESC, requested_at ASC) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_import_queue_igdb_id ON game_import_queue(igdb_id);
CREATE INDEX IF NOT EXISTS idx_import_queue_requested_at ON game_import_queue(requested_at DESC);

-- Add sync metadata to game table
ALTER TABLE game
ADD COLUMN IF NOT EXISTS last_synced TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sync_version BIGINT,
ADD COLUMN IF NOT EXISTS data_source TEXT DEFAULT 'manual' CHECK (data_source IN ('manual', 'igdb', 'user_submitted', 'auto_import'));

-- Create a view for monitoring import queue status
CREATE OR REPLACE VIEW game_import_queue_status AS
SELECT
  status,
  COUNT(*) as count,
  MIN(requested_at) as oldest_request,
  MAX(requested_at) as newest_request,
  AVG(EXTRACT(EPOCH FROM (COALESCE(imported_at, NOW()) - requested_at))) as avg_processing_time_seconds
FROM game_import_queue
GROUP BY status;

-- Function to queue a game for import
CREATE OR REPLACE FUNCTION queue_game_for_import(
  p_igdb_id INTEGER,
  p_priority INTEGER DEFAULT 0,
  p_search_query TEXT DEFAULT NULL,
  p_game_data JSONB DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  -- Check if game already exists locally
  IF EXISTS (SELECT 1 FROM game WHERE igdb_id = p_igdb_id) THEN
    RETURN FALSE; -- Game already exists
  END IF;

  -- Insert or update the queue entry
  INSERT INTO game_import_queue (
    igdb_id,
    priority,
    search_query,
    game_data,
    requested_by,
    status
  ) VALUES (
    p_igdb_id,
    p_priority,
    p_search_query,
    p_game_data,
    p_user_id,
    'pending'
  )
  ON CONFLICT (igdb_id) DO UPDATE SET
    priority = GREATEST(game_import_queue.priority, EXCLUDED.priority),
    requested_at = NOW(),
    status = CASE
      WHEN game_import_queue.status IN ('failed', 'completed') THEN 'pending'
      ELSE game_import_queue.status
    END;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to import a game from the queue
CREATE OR REPLACE FUNCTION import_game_from_queue(
  p_queue_id INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_queue_record RECORD;
  v_game_id INTEGER;
BEGIN
  -- Get the queue record
  SELECT * INTO v_queue_record
  FROM game_import_queue
  WHERE id = p_queue_id AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Mark as importing
  UPDATE game_import_queue
  SET status = 'importing'
  WHERE id = p_queue_id;

  -- Insert the game (basic implementation - expand based on your needs)
  BEGIN
    INSERT INTO game (
      igdb_id,
      name,
      slug,
      summary,
      cover_url,
      first_release_date,
      genres,
      platforms,
      total_rating,
      follows,
      hypes,
      data_source,
      last_synced
    )
    SELECT
      (v_queue_record.game_data->>'id')::INTEGER,
      v_queue_record.game_data->>'name',
      LOWER(REGEXP_REPLACE(v_queue_record.game_data->>'name', '[^a-zA-Z0-9]+', '-', 'g')),
      v_queue_record.game_data->>'summary',
      v_queue_record.game_data->'cover'->>'url',
      CASE
        WHEN v_queue_record.game_data->>'first_release_date' IS NOT NULL
        THEN (v_queue_record.game_data->>'first_release_date')::BIGINT
        ELSE NULL
      END,
      ARRAY(SELECT jsonb_array_elements_text(v_queue_record.game_data->'genres')),
      ARRAY(SELECT jsonb_array_elements_text(v_queue_record.game_data->'platforms')),
      (v_queue_record.game_data->>'total_rating')::NUMERIC,
      (v_queue_record.game_data->>'follows')::INTEGER,
      (v_queue_record.game_data->>'hypes')::INTEGER,
      'auto_import',
      NOW()
    WHERE v_queue_record.game_data IS NOT NULL
    RETURNING id INTO v_game_id;

    -- Mark as completed
    UPDATE game_import_queue
    SET
      status = 'completed',
      imported_at = NOW()
    WHERE id = p_queue_id;

    RETURN TRUE;

  EXCEPTION WHEN OTHERS THEN
    -- Mark as failed with error message
    UPDATE game_import_queue
    SET
      status = 'failed',
      error_message = SQLERRM
    WHERE id = p_queue_id;

    RETURN FALSE;
  END;
END;
$$ LANGUAGE plpgsql;

-- Function to get next games to import
CREATE OR REPLACE FUNCTION get_pending_imports(
  p_limit INTEGER DEFAULT 10
) RETURNS TABLE (
  queue_id INTEGER,
  igdb_id INTEGER,
  priority INTEGER,
  search_query TEXT,
  game_data JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    id as queue_id,
    game_import_queue.igdb_id,
    game_import_queue.priority,
    game_import_queue.search_query,
    game_import_queue.game_data
  FROM game_import_queue
  WHERE status = 'pending'
  ORDER BY priority DESC, requested_at ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Table for game requests (when users request a game that doesn't exist)
CREATE TABLE IF NOT EXISTS game_requests (
  id SERIAL PRIMARY KEY,
  query TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_game_requests_processed ON game_requests(processed, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_requests_user ON game_requests(user_id);

-- Function to request a game
CREATE OR REPLACE FUNCTION request_game(
  p_query TEXT,
  p_user_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO game_requests (query, user_id)
  VALUES (p_query, p_user_id);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT ON game_import_queue_status TO authenticated;
GRANT EXECUTE ON FUNCTION queue_game_for_import TO authenticated;
GRANT EXECUTE ON FUNCTION request_game TO authenticated;
GRANT SELECT ON game_requests TO authenticated;
GRANT INSERT ON game_requests TO authenticated;

-- Admin permissions for import functions
-- Note: You may want to restrict these to admin users only
GRANT EXECUTE ON FUNCTION import_game_from_queue TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_imports TO authenticated;
GRANT ALL ON game_import_queue TO authenticated;

-- Add RLS policies
ALTER TABLE game_import_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can view the import queue
CREATE POLICY "Import queue viewable by all" ON game_import_queue
  FOR SELECT USING (true);

-- Users can only see their own requests
CREATE POLICY "Users can view own requests" ON game_requests
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() IN (
    SELECT id FROM auth.users WHERE email LIKE '%@admin%' -- Adjust admin detection as needed
  ));

-- Users can create requests
CREATE POLICY "Users can create requests" ON game_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add comments
COMMENT ON TABLE game_import_queue IS 'Queue for games to be imported from IGDB';
COMMENT ON TABLE game_requests IS 'User requests for games not found in database';
COMMENT ON FUNCTION queue_game_for_import IS 'Adds a game to the import queue from IGDB';
COMMENT ON FUNCTION import_game_from_queue IS 'Imports a game from the queue into the main game table';
COMMENT ON FUNCTION get_pending_imports IS 'Gets pending games to import from the queue';
COMMENT ON FUNCTION request_game IS 'Records a user request for a game to be added';