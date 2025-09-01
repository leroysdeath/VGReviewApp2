-- Add indexes for optimized game searching
-- These indexes significantly improve search performance

-- Primary text search index using GIN for full-text search
CREATE INDEX IF NOT EXISTS idx_games_title_gin ON games USING gin(to_tsvector('english', title));

-- B-tree indexes for exact and prefix matching
CREATE INDEX IF NOT EXISTS idx_games_title_lower ON games(lower(title));
CREATE INDEX IF NOT EXISTS idx_games_slug ON games(slug);
CREATE INDEX IF NOT EXISTS idx_games_igdb_id ON games(igdb_id);

-- Indexes for filtering
CREATE INDEX IF NOT EXISTS idx_games_release_date ON games(release_date);
CREATE INDEX IF NOT EXISTS idx_games_metacritic_score ON games(metacritic_score);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_games_developer_lower ON games(lower(developer));
CREATE INDEX IF NOT EXISTS idx_games_publisher_lower ON games(lower(publisher));

-- GIN index for genre (assuming it's stored as text, could be jsonb)
CREATE INDEX IF NOT EXISTS idx_games_genre_gin ON games USING gin(to_tsvector('english', genre));

-- Index for platform filtering
CREATE INDEX IF NOT EXISTS idx_games_platform_gin ON games USING gin(to_tsvector('english', platform));

-- Partial index for games with images (commonly filtered)
CREATE INDEX IF NOT EXISTS idx_games_with_images ON games(id) WHERE image_url IS NOT NULL;

-- Index for sorting by popularity (if we add a popularity field later)
-- CREATE INDEX IF NOT EXISTS idx_games_popularity ON games(popularity DESC NULLS LAST);

-- Add a comment to track index purpose
COMMENT ON INDEX idx_games_title_gin IS 'Full-text search on game titles';
COMMENT ON INDEX idx_games_title_lower IS 'Case-insensitive exact and prefix matching';
COMMENT ON INDEX idx_games_slug IS 'URL slug lookups';
COMMENT ON INDEX idx_games_igdb_id IS 'IGDB ID lookups for deduplication';
COMMENT ON INDEX idx_games_developer_lower IS 'Developer name searches';
COMMENT ON INDEX idx_games_publisher_lower IS 'Publisher name searches';
COMMENT ON INDEX idx_games_genre_gin IS 'Genre filtering';
COMMENT ON INDEX idx_games_platform_gin IS 'Platform filtering';
COMMENT ON INDEX idx_games_with_images IS 'Filter games with cover art';