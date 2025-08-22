-- =====================================================
-- Fix Security Issues - Supabase Database Linter
-- =====================================================

-- IMPORTANT: Drop all problematic views first to ensure clean recreation
DROP VIEW IF EXISTS game_with_ratings CASCADE;
DROP VIEW IF EXISTS game_backfill_status CASCADE;
DROP VIEW IF EXISTS game_backfill_recent CASCADE;

-- Fix 1: Recreate game_with_ratings view without SECURITY DEFINER
-- Use explicit SECURITY INVOKER to ensure it doesn't default to DEFINER
CREATE VIEW game_with_ratings WITH (security_invoker=true) AS
SELECT 
  g.*,
  COALESCE(rs.average_rating, 0) AS average_rating,
  COALESCE(rs.rating_count, 0) AS rating_count,
  COALESCE(rs.total_playtime_hours, 0) AS total_playtime_hours,
  COALESCE(rs.recommended_count, 0) AS recommended_count,
  COALESCE(rs.recommended_percentage, 0) AS recommended_percentage
FROM game g
LEFT JOIN (
  SELECT 
    game_id,
    AVG(rating)::NUMERIC(3,1) AS average_rating,
    COUNT(*) AS rating_count,
    SUM(playtime_hours) AS total_playtime_hours,
    COUNT(CASE WHEN is_recommended = true THEN 1 END) AS recommended_count,
    (COUNT(CASE WHEN is_recommended = true THEN 1 END)::FLOAT / 
     NULLIF(COUNT(CASE WHEN is_recommended IS NOT NULL THEN 1 END), 0) * 100)::NUMERIC(5,2) AS recommended_percentage
  FROM rating
  GROUP BY game_id
) rs ON g.id = rs.game_id;

-- Fix 2: Recreate game_backfill_status view with explicit SECURITY INVOKER
CREATE VIEW game_backfill_status WITH (security_invoker=true) AS
SELECT 
  'backfill_status' as status_type,
  COUNT(*) as total_games,
  COUNT(CASE WHEN igdb_id IS NOT NULL THEN 1 END) as games_with_igdb,
  COUNT(CASE WHEN cover_url IS NOT NULL THEN 1 END) as games_with_cover,
  COUNT(CASE WHEN summary IS NOT NULL AND summary != '' THEN 1 END) as games_with_summary,
  NOW() as updated_at
FROM game;

-- Fix 3: Recreate game_backfill_recent view with explicit SECURITY INVOKER
CREATE VIEW game_backfill_recent WITH (security_invoker=true) AS
SELECT 
  id,
  name,
  igdb_id,
  cover_url,
  summary,
  updated_at
FROM game
WHERE updated_at > NOW() - INTERVAL '24 hours'
ORDER BY updated_at DESC
LIMIT 100;

-- Fix 4: Create game_backfill_log table with RLS enabled (if it doesn't exist)
-- This table may not exist yet, so we create it if needed
CREATE TABLE IF NOT EXISTS game_backfill_log (
  id SERIAL PRIMARY KEY,
  operation_type VARCHAR(50) NOT NULL, -- 'fetch', 'update', 'error'
  game_id INTEGER REFERENCES game(id),
  igdb_id INTEGER,
  game_name VARCHAR(500),
  status VARCHAR(50) NOT NULL, -- 'success', 'failed', 'skipped'
  details JSONB,
  error_message TEXT,
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on game_backfill_log table
ALTER TABLE game_backfill_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for game_backfill_log
-- Policy: Only authenticated users can view backfill logs
DROP POLICY IF EXISTS "Users can view backfill logs" ON game_backfill_log;
CREATE POLICY "Users can view backfill logs" ON game_backfill_log
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policy: Only service role can insert/update backfill logs
DROP POLICY IF EXISTS "Service can manage backfill logs" ON game_backfill_log;
CREATE POLICY "Service can manage backfill logs" ON game_backfill_log
  FOR ALL USING (auth.role() = 'service_role');

-- Create indexes for better performance on the backfill log table
CREATE INDEX IF NOT EXISTS idx_game_backfill_log_created_at ON game_backfill_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_backfill_log_status ON game_backfill_log (status);
CREATE INDEX IF NOT EXISTS idx_game_backfill_log_game_id ON game_backfill_log (game_id);

-- =====================================================
-- Additional Security Improvements
-- =====================================================

-- Ensure proper RLS policies exist for main tables
-- These are defensive measures to ensure RLS is properly configured

-- Make sure the game table has proper RLS if not already enabled
-- (This is likely already configured, but we're being defensive)
-- ALTER TABLE game ENABLE ROW LEVEL SECURITY;

-- Make sure the rating table has proper RLS if not already enabled
-- ALTER TABLE rating ENABLE ROW LEVEL SECURITY;

-- Note: We're not enabling RLS on core tables like 'game' and 'rating' 
-- without checking existing policies as this could break the application.
-- The main security issue is the game_backfill_log table which we've fixed.

-- =====================================================
-- Force recreation of any potentially problematic views
-- =====================================================

-- Alternative approach: Use DO block to ensure views are properly recreated
DO $$
BEGIN
  -- Drop and recreate game_with_ratings if it exists with wrong properties
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema='public' AND table_name='game_with_ratings') THEN
    DROP VIEW game_with_ratings CASCADE;
  END IF;
  
  -- Drop and recreate game_backfill_status if it exists with wrong properties  
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema='public' AND table_name='game_backfill_status') THEN
    DROP VIEW game_backfill_status CASCADE;
  END IF;
  
  -- Drop and recreate game_backfill_recent if it exists with wrong properties
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema='public' AND table_name='game_backfill_recent') THEN
    DROP VIEW game_backfill_recent CASCADE;
  END IF;
END $$;

-- Now recreate them one more time to be absolutely sure they use SECURITY INVOKER
DROP VIEW IF EXISTS game_with_ratings CASCADE;
CREATE VIEW game_with_ratings WITH (security_invoker=true) AS
SELECT 
  g.*,
  COALESCE(rs.average_rating, 0) AS average_rating,
  COALESCE(rs.rating_count, 0) AS rating_count,
  COALESCE(rs.total_playtime_hours, 0) AS total_playtime_hours,
  COALESCE(rs.recommended_count, 0) AS recommended_count,
  COALESCE(rs.recommended_percentage, 0) AS recommended_percentage
FROM game g
LEFT JOIN (
  SELECT 
    game_id,
    AVG(rating)::NUMERIC(3,1) AS average_rating,
    COUNT(*) AS rating_count,
    SUM(playtime_hours) AS total_playtime_hours,
    COUNT(CASE WHEN is_recommended = true THEN 1 END) AS recommended_count,
    (COUNT(CASE WHEN is_recommended = true THEN 1 END)::FLOAT / 
     NULLIF(COUNT(CASE WHEN is_recommended IS NOT NULL THEN 1 END), 0) * 100)::NUMERIC(5,2) AS recommended_percentage
  FROM rating
  GROUP BY game_id
) rs ON g.id = rs.game_id;

DROP VIEW IF EXISTS game_backfill_status CASCADE;
CREATE VIEW game_backfill_status WITH (security_invoker=true) AS
SELECT 
  'backfill_status' as status_type,
  COUNT(*) as total_games,
  COUNT(CASE WHEN igdb_id IS NOT NULL THEN 1 END) as games_with_igdb,
  COUNT(CASE WHEN cover_url IS NOT NULL THEN 1 END) as games_with_cover,
  COUNT(CASE WHEN summary IS NOT NULL AND summary != '' THEN 1 END) as games_with_summary,
  NOW() as updated_at
FROM game;

DROP VIEW IF EXISTS game_backfill_recent CASCADE;
CREATE VIEW game_backfill_recent WITH (security_invoker=true) AS
SELECT 
  id,
  name,
  igdb_id,
  cover_url,
  summary,
  updated_at
FROM game
WHERE updated_at > NOW() - INTERVAL '24 hours'
ORDER BY updated_at DESC
LIMIT 100;

-- =====================================================
-- Verification Queries (for manual checking)
-- =====================================================

-- Run these queries to verify the fixes worked:
-- 
-- Check view security settings:
-- SELECT 
--   schemaname, 
--   viewname, 
--   viewowner,
--   definition
-- FROM pg_views 
-- WHERE schemaname = 'public' AND viewname IN ('game_with_ratings', 'game_backfill_status', 'game_backfill_recent');
--
-- Check that RLS is enabled on game_backfill_log:
-- SELECT schemaname, tablename, rowsecurity FROM pg_tables 
-- WHERE schemaname = 'public' AND tablename = 'game_backfill_log';
--
-- Check policies on game_backfill_log:
-- SELECT * FROM pg_policies WHERE tablename = 'game_backfill_log';