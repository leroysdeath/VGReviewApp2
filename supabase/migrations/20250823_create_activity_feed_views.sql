-- Migration: Create Activity Feed Views
-- Purpose: Consolidate activity data from existing tables without creating redundant storage
-- Date: 2025-08-23

-- Create the unified activity feed view using UNION of existing tables
CREATE OR REPLACE VIEW activity_feed AS
SELECT 
  -- Ratings/Reviews as activities
  'rating_' || r.id::text AS activity_id,
  'rating' AS activity_type,
  r.user_id,
  NULL::integer AS target_user_id,
  r.game_id,
  r.id AS rating_id,
  NULL::integer AS comment_id,
  NULL::integer AS follow_id,
  r.created_at AS activity_timestamp,
  r.rating AS rating_value,
  r.review AS review_text,
  r.is_published
FROM rating r
WHERE r.is_published = true

UNION ALL

SELECT 
  -- Comments as activities
  'comment_' || c.id::text AS activity_id,
  'comment' AS activity_type,
  c.user_id,
  r.user_id AS target_user_id, -- User who owns the rating being commented on
  r.game_id,
  c.rating_id,
  c.id AS comment_id,
  NULL::integer AS follow_id,
  c.created_at AS activity_timestamp,
  NULL::numeric AS rating_value,
  c.content AS review_text,
  c.is_published
FROM comment c
LEFT JOIN rating r ON c.rating_id = r.id
WHERE c.is_published = true

UNION ALL

SELECT 
  -- Follows as activities
  'follow_' || uf.id::text AS activity_id,
  'follow' AS activity_type,
  uf.follower_id AS user_id,
  uf.following_id AS target_user_id,
  NULL::integer AS game_id,
  NULL::integer AS rating_id,
  NULL::integer AS comment_id,
  uf.id AS follow_id,
  uf.created_at AS activity_timestamp,
  NULL::numeric AS rating_value,
  NULL::text AS review_text,
  true AS is_published
FROM user_follow uf

UNION ALL

SELECT 
  -- Likes as activities
  'like_' || cl.id::text AS activity_id,
  CASE 
    WHEN cl.rating_id IS NOT NULL THEN 'like_rating'
    WHEN cl.comment_id IS NOT NULL THEN 'like_comment'
  END AS activity_type,
  cl.user_id,
  COALESCE(r.user_id, c.user_id) AS target_user_id,
  r.game_id,
  cl.rating_id,
  cl.comment_id,
  NULL::integer AS follow_id,
  cl.created_at AS activity_timestamp,
  NULL::numeric AS rating_value,
  NULL::text AS review_text,
  true AS is_published
FROM content_like cl
LEFT JOIN rating r ON cl.rating_id = r.id
LEFT JOIN comment c ON cl.comment_id = c.id
WHERE cl.is_like = true

UNION ALL

SELECT 
  -- Game progress as activities
  'progress_' || gp.id::text AS activity_id,
  CASE 
    WHEN gp.completed = true AND gp.started = true THEN 'game_completed'
    WHEN gp.started = true THEN 'game_started'
  END AS activity_type,
  gp.user_id,
  NULL::integer AS target_user_id,
  gp.game_id,
  NULL::integer AS rating_id,
  NULL::integer AS comment_id,
  NULL::integer AS follow_id,
  COALESCE(gp.completed_date, gp.started_date, gp.created_at) AS activity_timestamp,
  NULL::numeric AS rating_value,
  NULL::text AS review_text,
  true AS is_published
FROM game_progress gp
WHERE (gp.started = true OR gp.completed = true);

-- Create indexes on source tables for better view performance
CREATE INDEX IF NOT EXISTS idx_rating_created_at_published ON rating(created_at DESC) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_comment_created_at_published ON comment(created_at DESC) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_content_like_created_at ON content_like(created_at DESC) WHERE is_like = true;
CREATE INDEX IF NOT EXISTS idx_user_follow_created_at ON user_follow(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_progress_dates ON game_progress(completed_date DESC, started_date DESC) WHERE (started = true OR completed = true);

-- Create materialized view for performance
CREATE MATERIALIZED VIEW activity_feed_materialized AS
SELECT 
  af.*,
  u.name AS user_name,
  u.avatar_url AS user_avatar,
  tu.name AS target_user_name,
  tu.avatar_url AS target_user_avatar,
  g.name AS game_name,
  g.cover_url AS game_cover,
  g.pic_url AS game_pic_url -- Handle both cover_url and pic_url columns
FROM activity_feed af
LEFT JOIN "user" u ON af.user_id = u.id
LEFT JOIN "user" tu ON af.target_user_id = tu.id
LEFT JOIN game g ON af.game_id = g.id
ORDER BY af.activity_timestamp DESC
WITH DATA;

-- Create indexes on materialized view for optimal performance
CREATE INDEX idx_activity_feed_mat_user_id ON activity_feed_materialized(user_id);
CREATE INDEX idx_activity_feed_mat_timestamp ON activity_feed_materialized(activity_timestamp DESC);
CREATE INDEX idx_activity_feed_mat_type ON activity_feed_materialized(activity_type);
CREATE INDEX idx_activity_feed_mat_game_id ON activity_feed_materialized(game_id) WHERE game_id IS NOT NULL;
CREATE INDEX idx_activity_feed_mat_target_user ON activity_feed_materialized(target_user_id) WHERE target_user_id IS NOT NULL;

-- Create refresh function for materialized view
CREATE OR REPLACE FUNCTION refresh_activity_feed()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY activity_feed_materialized;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a debounced refresh function to avoid too frequent refreshes
CREATE OR REPLACE FUNCTION schedule_activity_feed_refresh()
RETURNS trigger AS $$
BEGIN
  -- Schedule a refresh notification (to be handled by background job)
  -- This prevents multiple rapid inserts from causing multiple refreshes
  PERFORM pg_notify('refresh_activity_feed', 'refresh_needed');
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create function to get user-specific activity feed with following logic
CREATE OR REPLACE FUNCTION get_user_activity_feed(
  p_user_id INTEGER,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  p_include_following BOOLEAN DEFAULT true
)
RETURNS TABLE (
  activity_id TEXT,
  activity_type TEXT,
  user_id INTEGER,
  user_name TEXT,
  user_avatar TEXT,
  target_user_id INTEGER,
  target_user_name TEXT,
  target_user_avatar TEXT,
  game_id INTEGER,
  game_name TEXT,
  game_cover TEXT,
  game_pic_url TEXT,
  rating_id INTEGER,
  comment_id INTEGER,
  follow_id INTEGER,
  activity_timestamp TIMESTAMPTZ,
  rating_value NUMERIC,
  review_text TEXT,
  is_published BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    af.activity_id,
    af.activity_type,
    af.user_id,
    af.user_name,
    af.user_avatar,
    af.target_user_id,
    af.target_user_name,
    af.target_user_avatar,
    af.game_id,
    af.game_name,
    af.game_cover,
    af.game_pic_url,
    af.rating_id,
    af.comment_id,
    af.follow_id,
    af.activity_timestamp,
    af.rating_value,
    af.review_text,
    af.is_published
  FROM activity_feed_materialized af
  WHERE 
    -- Own activities
    af.user_id = p_user_id
    -- Activities targeting this user
    OR af.target_user_id = p_user_id
    -- Activities from users this user follows (if enabled)
    OR (p_include_following = true AND af.user_id IN (
      SELECT following_id 
      FROM user_follow 
      WHERE follower_id = p_user_id
    ))
  ORDER BY af.activity_timestamp DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions for the views and functions
GRANT SELECT ON activity_feed TO authenticated;
GRANT SELECT ON activity_feed TO anon;
GRANT SELECT ON activity_feed_materialized TO authenticated;
GRANT SELECT ON activity_feed_materialized TO anon;
GRANT EXECUTE ON FUNCTION get_user_activity_feed(INTEGER, INTEGER, INTEGER, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_activity_feed(INTEGER, INTEGER, INTEGER, BOOLEAN) TO anon;