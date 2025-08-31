-- Backup Game States Tables
-- Creates backup of all game state tables before applying migrations
-- Run this BEFORE cleanup migration

-- Create backup schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS backup_game_states;

-- Backup user_collection table
CREATE TABLE IF NOT EXISTS backup_game_states.user_collection_backup AS 
SELECT 
  *,
  NOW() as backup_timestamp
FROM user_collection;

-- Backup user_wishlist table  
CREATE TABLE IF NOT EXISTS backup_game_states.user_wishlist_backup AS
SELECT 
  *,
  NOW() as backup_timestamp
FROM user_wishlist;

-- Backup game_progress table
CREATE TABLE IF NOT EXISTS backup_game_states.game_progress_backup AS
SELECT 
  *,
  NOW() as backup_timestamp  
FROM game_progress;

-- Create conflict resolution log table
CREATE TABLE IF NOT EXISTS backup_game_states.conflict_resolution_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  igdb_id INTEGER,
  conflict_type VARCHAR(50),
  original_state VARCHAR(50),
  resolved_state VARCHAR(50),
  resolution_reason TEXT,
  resolved_at TIMESTAMP DEFAULT NOW()
);

-- Verify backups were created successfully
SELECT 
  'user_collection_backup' as table_name,
  COUNT(*) as row_count
FROM backup_game_states.user_collection_backup
UNION ALL
SELECT 
  'user_wishlist_backup' as table_name,
  COUNT(*) as row_count
FROM backup_game_states.user_wishlist_backup
UNION ALL
SELECT 
  'game_progress_backup' as table_name,
  COUNT(*) as row_count
FROM backup_game_states.game_progress_backup;

-- Add comments for documentation
COMMENT ON SCHEMA backup_game_states IS 'Backup schema for game state tables created before exclusive states migration';
COMMENT ON TABLE backup_game_states.user_collection_backup IS 'Backup of user_collection table before exclusive states migration';
COMMENT ON TABLE backup_game_states.user_wishlist_backup IS 'Backup of user_wishlist table before exclusive states migration';
COMMENT ON TABLE backup_game_states.game_progress_backup IS 'Backup of game_progress table before exclusive states migration';
COMMENT ON TABLE backup_game_states.conflict_resolution_log IS 'Log of all conflicts resolved during migration';