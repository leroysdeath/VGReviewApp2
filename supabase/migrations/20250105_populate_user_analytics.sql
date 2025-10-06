-- Migration: Populate user_analytics table with activity data
-- This script populates the user_analytics table with aggregated data from existing tables

-- STEP 1: Verify user_analytics table exists and has records
DO $$
BEGIN
  -- Check if table exists
  IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'user_analytics') THEN
    RAISE EXCEPTION 'user_analytics table does not exist. Please run the create table migration first.';
  END IF;
END $$;

-- STEP 2: Populate user_analytics with activity data
WITH user_activity AS (
  SELECT
    u.id as user_id,
    COUNT(DISTINCT r.id) as total_reviews,
    COUNT(DISTINCT CASE WHEN r.review IS NOT NULL AND LENGTH(r.review) > 100 THEN r.id END) as detailed_reviews,
    COUNT(DISTINCT c.id) as total_comments,
    COALESCE(SUM(r.like_count), 0) as total_likes_received,
    COALESCE(AVG(r.rating), 0) as avg_rating_given,
    AVG(LENGTH(r.review)) as avg_review_length,
    COUNT(DISTINCT r.id) as total_ratings,
    MAX(r.created_at) as last_review_date,
    MIN(r.created_at) as first_review_date
  FROM "user" u
  LEFT JOIN rating r ON u.id = r.user_id
  LEFT JOIN comment c ON u.id = c.user_id
  GROUP BY u.id
),
user_social AS (
  SELECT
    u.id as user_id,
    COUNT(DISTINCT f1.following_id) as following_count,
    COUNT(DISTINCT f2.follower_id) as follower_count,
    CASE WHEN COUNT(DISTINCT f1.following_id) > 0 THEN true ELSE false END as has_followed
  FROM "user" u
  LEFT JOIN user_follow f1 ON u.id = f1.follower_id
  LEFT JOIN user_follow f2 ON u.id = f2.following_id
  GROUP BY u.id
),
user_games AS (
  SELECT
    u.id as user_id,
    COUNT(DISTINCT gp.game_id) as games_played,
    COUNT(DISTINCT CASE WHEN gp.completed = true THEN gp.game_id END) as games_completed,
    COUNT(DISTINCT utg.game_id) as top_games_count,
    COUNT(DISTINCT uc.game_id) + COUNT(DISTINCT uw.game_id) as backlog_count
  FROM "user" u
  LEFT JOIN game_progress gp ON u.id = gp.user_id
  LEFT JOIN user_top_games utg ON u.id = utg.user_id
  LEFT JOIN user_collection uc ON u.id = uc.user_id
  LEFT JOIN user_wishlist uw ON u.id = uw.user_id
  GROUP BY u.id
),
user_profile AS (
  SELECT
    id as user_id,
    username,
    CASE WHEN avatar_url IS NOT NULL THEN true ELSE false END as has_avatar,
    CASE WHEN bio IS NOT NULL AND LENGTH(bio) > 10 THEN true ELSE false END as has_bio,
    created_at as user_created_at,
    TO_CHAR(created_at, 'YYYY-MM') as cohort_month
  FROM "user"
)
UPDATE user_analytics ua
SET
  -- Review metrics
  total_reviews = COALESCE(act.total_reviews, 0),
  total_ratings = COALESCE(act.total_ratings, 0),
  total_comments = COALESCE(act.total_comments, 0),
  total_likes_received = COALESCE(act.total_likes_received, 0),
  avg_rating = COALESCE(act.avg_rating_given, 0),
  avg_review_length = COALESCE(act.avg_review_length::INTEGER, 0),

  -- Social metrics
  total_followers = COALESCE(soc.follower_count, 0),
  total_following = COALESCE(soc.following_count, 0),
  has_followed_someone = soc.has_followed,

  -- Game metrics
  games_rated_count = COALESCE(act.total_ratings, 0),
  games_reviewed_count = COALESCE(act.detailed_reviews, 0),
  games_completed = COALESCE(gam.games_completed, 0),
  games_in_backlog = COALESCE(gam.backlog_count, 0),

  -- Profile completion
  has_avatar = prof.has_avatar,
  has_bio = prof.has_bio,
  has_top_games = CASE WHEN gam.top_games_count > 0 THEN true ELSE false END,
  has_first_review = CASE WHEN act.total_reviews > 0 THEN true ELSE false END,

  -- Timestamps
  first_review_at = act.first_review_date,
  last_review_at = act.last_review_date,
  last_activity_at = GREATEST(act.last_review_date, ua.updated_at),

  -- Engagement calculation
  engagement_score = LEAST(100, (
    (COALESCE(act.total_reviews, 0) * 10) +
    (COALESCE(act.detailed_reviews, 0) * 5) +
    (COALESCE(act.total_comments, 0) * 2) +
    (COALESCE(soc.follower_count, 0) * 3) +
    (COALESCE(gam.games_completed, 0) * 2) +
    (CASE WHEN act.last_review_date > NOW() - INTERVAL '30 days' THEN 10 ELSE 0 END)
  )),

  -- User segmentation
  user_segment = CASE
    WHEN act.total_reviews >= 50 OR gam.games_completed >= 100 THEN 'hardcore'
    WHEN act.total_reviews >= 10 OR gam.games_completed >= 25 THEN 'core'
    WHEN act.total_reviews >= 1 OR gam.games_played >= 5 THEN 'casual'
    WHEN prof.user_created_at > NOW() - INTERVAL '30 days' THEN 'new'
    WHEN act.last_review_date < NOW() - INTERVAL '90 days' THEN 'churned'
    ELSE 'casual'
  END,

  -- Profile completion score (0-100)
  profile_completion_score = (
    CASE WHEN prof.has_avatar THEN 20 ELSE 0 END +
    CASE WHEN prof.has_bio THEN 20 ELSE 0 END +
    CASE WHEN gam.top_games_count > 0 THEN 20 ELSE 0 END +
    CASE WHEN act.total_reviews > 0 THEN 20 ELSE 0 END +
    CASE WHEN soc.follower_count > 0 THEN 20 ELSE 0 END
  ),

  -- Activity flags
  is_active_reviewer = CASE
    WHEN act.total_reviews >= 5 AND act.last_review_date > NOW() - INTERVAL '60 days'
    THEN true ELSE false
  END,

  is_influencer = CASE
    WHEN soc.follower_count >= 100 OR act.total_likes_received >= 500
    THEN true ELSE false
  END,

  -- Cohort information
  cohort_month = prof.cohort_month,

  -- Update timestamps
  updated_at = NOW(),
  last_calculated_at = NOW()
FROM user_activity act
JOIN user_social soc ON act.user_id = soc.user_id
JOIN user_games gam ON act.user_id = gam.user_id
JOIN user_profile prof ON act.user_id = prof.user_id
WHERE ua.user_id = act.user_id;

-- STEP 3: Generate referral codes for users who don't have them
UPDATE user_analytics
SET
  referral_code = UPPER(
    SUBSTRING(md5(random()::text || user_id::text || NOW()::text), 1, 6) ||
    LPAD(user_id::text, 3, '0')
  ),
  referral_created_at = NOW()
WHERE referral_code IS NULL;

-- STEP 4: Set early adopter flag for first 1000 users
UPDATE user_analytics ua
SET is_early_adopter = true
FROM (
  SELECT id
  FROM "user"
  ORDER BY created_at ASC
  LIMIT 1000
) early_users
WHERE ua.user_id = early_users.id;

-- STEP 5: Calculate initial lifetime value (placeholder - adjust based on your monetization)
UPDATE user_analytics
SET
  lifetime_value = ROUND(
    (total_reviews * 0.5) +           -- Each review worth $0.50 in engagement value
    (total_followers * 0.2) +         -- Each follower worth $0.20 in network value
    (games_completed * 0.1) +         -- Each completed game worth $0.10 in retention value
    (CASE WHEN is_premium_user THEN 10 ELSE 0 END), -- Premium users worth $10
    2
  ),
  projected_ltv = ROUND(
    (engagement_score / 10.0) * 50,  -- Project up to $50 based on engagement
    2
  );

-- STEP 6: Display summary statistics
WITH stats AS (
  SELECT
    COUNT(*) as total_users,
    COUNT(CASE WHEN referral_code IS NOT NULL THEN 1 END) as users_with_codes,
    AVG(engagement_score) as avg_engagement,
    AVG(profile_completion_score) as avg_completion,
    COUNT(CASE WHEN user_segment = 'hardcore' THEN 1 END) as hardcore_users,
    COUNT(CASE WHEN user_segment = 'core' THEN 1 END) as core_users,
    COUNT(CASE WHEN user_segment = 'casual' THEN 1 END) as casual_users,
    COUNT(CASE WHEN user_segment = 'new' THEN 1 END) as new_users,
    COUNT(CASE WHEN user_segment = 'churned' THEN 1 END) as churned_users,
    COUNT(CASE WHEN is_active_reviewer THEN 1 END) as active_reviewers,
    COUNT(CASE WHEN is_influencer THEN 1 END) as influencers
  FROM user_analytics
)
SELECT
  'Analytics Population Complete' as status,
  total_users,
  users_with_codes,
  ROUND(avg_engagement::numeric, 1) as avg_engagement_score,
  ROUND(avg_completion::numeric, 1) as avg_profile_completion,
  JSON_BUILD_OBJECT(
    'hardcore', hardcore_users,
    'core', core_users,
    'casual', casual_users,
    'new', new_users,
    'churned', churned_users
  ) as user_segments,
  JSON_BUILD_OBJECT(
    'active_reviewers', active_reviewers,
    'influencers', influencers
  ) as special_users
FROM stats;