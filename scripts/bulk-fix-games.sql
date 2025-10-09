-- Bulk Game Fix SQL Script
-- Run this after fetching IGDB data into a staging table

-- 1. Create staging table for IGDB data
CREATE TABLE IF NOT EXISTS igdb_sync_staging (
  igdb_id INTEGER PRIMARY KEY,
  data JSONB,
  fetched_at TIMESTAMP DEFAULT NOW()
);

-- 2. Create function to bulk update games
CREATE OR REPLACE FUNCTION bulk_update_games_from_staging()
RETURNS void AS $$
BEGIN
  -- Update all games in a single pass
  UPDATE game g
  SET
    -- Basic info (only update if null)
    summary = COALESCE(g.summary, (s.data->>'summary')::TEXT),
    cover_url = COALESCE(g.cover_url,
      REPLACE(REPLACE(s.data->'cover'->>'url', '//images.igdb.com', 'https://images.igdb.com'), 't_thumb', 't_1080p')
    ),

    -- Release date
    release_date = COALESCE(g.release_date,
      CASE
        WHEN s.data->>'first_release_date' IS NOT NULL
        THEN to_timestamp((s.data->>'first_release_date')::bigint)::date
        ELSE NULL
      END
    ),

    -- Companies
    developer = COALESCE(g.developer,
      (SELECT (ic->'company'->>'name')::TEXT
       FROM jsonb_array_elements(s.data->'involved_companies') ic
       WHERE (ic->>'developer')::boolean = true
       LIMIT 1)
    ),
    publisher = COALESCE(g.publisher,
      (SELECT (ic->'company'->>'name')::TEXT
       FROM jsonb_array_elements(s.data->'involved_companies') ic
       WHERE (ic->>'publisher')::boolean = true
       LIMIT 1)
    ),

    -- Arrays
    platforms = COALESCE(
      CASE WHEN array_length(g.platforms, 1) > 0 THEN g.platforms ELSE NULL END,
      ARRAY(SELECT jsonb_array_elements_text(s.data->'platforms'->'name'))
    ),
    screenshots = COALESCE(
      CASE WHEN array_length(g.screenshots, 1) > 0 THEN g.screenshots ELSE NULL END,
      ARRAY(
        SELECT REPLACE(REPLACE(jsonb_array_elements_text(s.data->'screenshots'->'url'), '//images.igdb.com', 'https://images.igdb.com'), 't_thumb', 't_1080p')
      )
    ),
    alternative_names = ARRAY(SELECT jsonb_array_elements_text(s.data->'alternative_names'->'name')),

    -- IDs
    similar_game_ids = ARRAY(SELECT (jsonb_array_elements_text(s.data->'similar_games'))::INTEGER),
    dlc_ids = ARRAY(SELECT (jsonb_array_elements_text(s.data->'dlcs'))::INTEGER),
    expansion_ids = ARRAY(SELECT (jsonb_array_elements_text(s.data->'expansions'))::INTEGER),

    -- Ratings
    total_rating = COALESCE(g.total_rating, (s.data->>'total_rating')::INTEGER),
    igdb_rating = COALESCE(g.igdb_rating, (s.data->>'aggregated_rating')::INTEGER),
    rating_count = GREATEST(g.rating_count, COALESCE((s.data->>'total_rating_count')::INTEGER, 0)),

    -- Metadata
    franchise_name = COALESCE(g.franchise_name, s.data->'franchises'->0->>'name'),
    collection_name = COALESCE(g.collection_name, s.data->'collections'->0->>'name'),
    category = COALESCE(g.category, (s.data->>'category')::INTEGER),
    parent_game = COALESCE(g.parent_game, (s.data->>'parent_game')::INTEGER),

    -- Tracking
    last_synced = NOW(),
    data_source = 'igdb_bulk_fix',
    sync_status = 'completed'
  FROM igdb_sync_staging s
  WHERE g.igdb_id = s.igdb_id;

  -- Log the results
  RAISE NOTICE 'Updated % games', (SELECT COUNT(*) FROM igdb_sync_staging);
END;
$$ LANGUAGE plpgsql;

-- 3. Create index for faster updates
CREATE INDEX IF NOT EXISTS idx_staging_igdb ON igdb_sync_staging(igdb_id);

-- 4. Function to identify games needing sync
CREATE OR REPLACE FUNCTION get_games_needing_sync(
  batch_size INTEGER DEFAULT 1000,
  offset_val INTEGER DEFAULT 0
)
RETURNS TABLE (
  game_id VARCHAR(255),
  igdb_id INTEGER,
  priority_score INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    g.game_id,
    g.igdb_id,
    -- Priority score based on popularity and data completeness
    (
      COALESCE(g.rating_count, 0) * 10 +
      COALESCE(g.view_count, 0) +
      CASE WHEN g.cover_url IS NULL THEN 1000 ELSE 0 END +
      CASE WHEN g.summary IS NULL THEN 500 ELSE 0 END +
      CASE WHEN g.developer IS NULL THEN 200 ELSE 0 END +
      CASE WHEN g.release_date IS NULL THEN 100 ELSE 0 END
    )::INTEGER as priority_score
  FROM game g
  WHERE
    g.igdb_id IS NOT NULL
    AND (
      g.cover_url IS NULL OR
      g.summary IS NULL OR
      g.developer IS NULL OR
      g.publisher IS NULL OR
      g.release_date IS NULL OR
      g.last_synced IS NULL OR
      g.last_synced < NOW() - INTERVAL '30 days'
    )
  ORDER BY priority_score DESC
  LIMIT batch_size
  OFFSET offset_val;
END;
$$ LANGUAGE plpgsql;

-- 5. Quick stats function
CREATE OR REPLACE FUNCTION game_data_stats()
RETURNS TABLE (
  total_games BIGINT,
  has_igdb_id BIGINT,
  has_cover BIGINT,
  has_summary BIGINT,
  has_developer BIGINT,
  has_release_date BIGINT,
  synced_recently BIGINT,
  pct_complete NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*),
    COUNT(igdb_id),
    COUNT(cover_url),
    COUNT(summary),
    COUNT(developer),
    COUNT(release_date),
    COUNT(CASE WHEN last_synced > NOW() - INTERVAL '7 days' THEN 1 END),
    ROUND(
      (
        COUNT(cover_url)::numeric +
        COUNT(summary)::numeric +
        COUNT(developer)::numeric +
        COUNT(release_date)::numeric
      ) / (COUNT(*) * 4) * 100,
      2
    ) as pct_complete
  FROM game
  WHERE igdb_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- Usage:
-- 1. Populate staging table with IGDB data (from Node.js script)
-- 2. Run: SELECT bulk_update_games_from_staging();
-- 3. Check results: SELECT * FROM game_data_stats();