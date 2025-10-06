-- SAFE Population Script for user_analytics
-- Handles numeric precision constraints properly

-- STEP 1: Create analytics records for ALL existing users (if they don't exist)
INSERT INTO user_analytics (user_id, created_at, updated_at)
SELECT
  u.id as user_id,
  NOW() as created_at,
  NOW() as updated_at
FROM "user" u
WHERE NOT EXISTS (
  SELECT 1 FROM user_analytics ua WHERE ua.user_id = u.id
)
ON CONFLICT (user_id) DO NOTHING;

-- Verify records were created
SELECT
  'Records Created' as status,
  (SELECT COUNT(*) FROM "user") as total_users,
  (SELECT COUNT(*) FROM user_analytics) as analytics_records;

-- STEP 2: Populate analytics with proper data type handling
WITH user_activity AS (
  SELECT
    u.id as user_id,
    COUNT(DISTINCT r.id) as total_reviews,
    COUNT(DISTINCT CASE WHEN r.review IS NOT NULL AND LENGTH(r.review) > 100 THEN r.id END) as detailed_reviews,
    COUNT(DISTINCT c.id) as total_comments,
    COALESCE(SUM(r.like_count), 0) as total_likes_received,
    -- Ensure avg_rating fits in NUMERIC(3,2) - assuming ratings are 1-5 scale
    CASE
      WHEN AVG(r.rating) IS NULL THEN 0
      WHEN AVG(r.rating) > 9.99 THEN 9.99  -- Cap at max value for NUMERIC(3,2)
      WHEN AVG(r.rating) < 0 THEN 0
      ELSE ROUND(AVG(r.rating)::numeric, 2)
    END as avg_rating_safe,
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
  -- Review metrics with safe numeric handling
  total_reviews = COALESCE(act.total_reviews, 0),
  total_ratings = COALESCE(act.total_ratings, 0),
  total_comments = COALESCE(act.total_comments, 0),
  total_likes_received = COALESCE(act.total_likes_received, 0),
  avg_rating = act.avg_rating_safe,  -- Using the safe version
  avg_review_length = COALESCE(act.avg_review_length::INTEGER, 0),

  -- Social metrics
  total_followers = COALESCE(soc.follower_count, 0),
  total_following = COALESCE(soc.following_count, 0),
  has_followed_someone = COALESCE(soc.has_followed, false),

  -- Game metrics
  games_rated_count = COALESCE(act.total_ratings, 0),
  games_reviewed_count = COALESCE(act.detailed_reviews, 0),
  games_completed = COALESCE(gam.games_completed, 0),
  games_in_backlog = COALESCE(gam.backlog_count, 0),

  -- Profile completion
  has_avatar = COALESCE(prof.has_avatar, false),
  has_bio = COALESCE(prof.has_bio, false),
  has_top_games = CASE WHEN COALESCE(gam.top_games_count, 0) > 0 THEN true ELSE false END,
  has_first_review = CASE WHEN COALESCE(act.total_reviews, 0) > 0 THEN true ELSE false END,

  -- Timestamps (handle NULLs properly)
  first_review_at = act.first_review_date,
  last_review_at = act.last_review_date,
  last_activity_at = COALESCE(act.last_review_date, ua.updated_at, NOW()),

  -- Engagement calculation (ensure it's between 0-100)
  engagement_score = LEAST(100, GREATEST(0, (
    (COALESCE(act.total_reviews, 0) * 10) +
    (COALESCE(act.detailed_reviews, 0) * 5) +
    (COALESCE(act.total_comments, 0) * 2) +
    (COALESCE(soc.follower_count, 0) * 3) +
    (COALESCE(gam.games_completed, 0) * 2) +
    (CASE WHEN act.last_review_date > NOW() - INTERVAL '30 days' THEN 10 ELSE 0 END)
  ))),

  -- User segmentation
  user_segment = CASE
    WHEN COALESCE(act.total_reviews, 0) >= 50 OR COALESCE(gam.games_completed, 0) >= 100 THEN 'hardcore'
    WHEN COALESCE(act.total_reviews, 0) >= 10 OR COALESCE(gam.games_completed, 0) >= 25 THEN 'core'
    WHEN COALESCE(act.total_reviews, 0) >= 1 OR COALESCE(gam.games_played, 0) >= 5 THEN 'casual'
    WHEN prof.user_created_at > NOW() - INTERVAL '30 days' THEN 'new'
    WHEN act.last_review_date IS NULL OR act.last_review_date < NOW() - INTERVAL '90 days' THEN 'inactive'
    ELSE 'casual'
  END,

  -- Profile completion score (ensure 0-100)
  profile_completion_score = LEAST(100, GREATEST(0, (
    CASE WHEN COALESCE(prof.has_avatar, false) THEN 20 ELSE 0 END +
    CASE WHEN COALESCE(prof.has_bio, false) THEN 20 ELSE 0 END +
    CASE WHEN COALESCE(gam.top_games_count, 0) > 0 THEN 20 ELSE 0 END +
    CASE WHEN COALESCE(act.total_reviews, 0) > 0 THEN 20 ELSE 0 END +
    CASE WHEN COALESCE(soc.follower_count, 0) > 0 THEN 20 ELSE 0 END
  ))),

  -- Activity flags
  is_active_reviewer = CASE
    WHEN COALESCE(act.total_reviews, 0) >= 5 AND act.last_review_date > NOW() - INTERVAL '60 days'
    THEN true ELSE false
  END,

  is_influencer = CASE
    WHEN COALESCE(soc.follower_count, 0) >= 100 OR COALESCE(act.total_likes_received, 0) >= 500
    THEN true ELSE false
  END,

  -- Cohort
  cohort_month = prof.cohort_month,

  -- Update timestamps
  updated_at = NOW(),
  last_calculated_at = NOW()
FROM user_activity act
LEFT JOIN user_social soc ON act.user_id = soc.user_id
LEFT JOIN user_games gam ON act.user_id = gam.user_id
LEFT JOIN user_profile prof ON act.user_id = prof.user_id
WHERE ua.user_id = act.user_id;

-- STEP 3: Generate unique referral codes
UPDATE user_analytics
SET
  referral_code = UPPER(
    SUBSTRING(md5(random()::text || user_id::text || NOW()::text), 1, 6) ||
    '-' ||
    LPAD(user_id::text, 4, '0')
  ),
  referral_created_at = NOW()
WHERE referral_code IS NULL;

-- STEP 4: Set early adopter flag
UPDATE user_analytics ua
SET is_early_adopter = true
FROM (
  SELECT id
  FROM "user"
  ORDER BY created_at ASC
  LIMIT 1000
) early_users
WHERE ua.user_id = early_users.id;

-- STEP 5: Calculate safe lifetime values (respect NUMERIC(10,2) constraints)
UPDATE user_analytics
SET
  -- Ensure values fit in NUMERIC(10,2) - max 99999999.99
  lifetime_value = LEAST(99999999.99, GREATEST(0, ROUND(
    (COALESCE(total_reviews, 0) * 0.50) +
    (COALESCE(total_followers, 0) * 0.20) +
    (COALESCE(games_completed, 0) * 0.10) +
    (CASE WHEN is_premium_user THEN 10.00 ELSE 0 END),
    2
  ))),

  projected_ltv = LEAST(99999999.99, GREATEST(0, ROUND(
    (COALESCE(engagement_score, 0) / 10.0) * 50.00,
    2
  )));

-- STEP 6: Final summary
WITH stats AS (
  SELECT
    COUNT(*) as total_users,
    COUNT(CASE WHEN referral_code IS NOT NULL THEN 1 END) as users_with_codes,
    AVG(COALESCE(engagement_score, 0)) as avg_engagement,
    AVG(COALESCE(profile_completion_score, 0)) as avg_completion,
    COUNT(CASE WHEN user_segment = 'hardcore' THEN 1 END) as hardcore_users,
    COUNT(CASE WHEN user_segment = 'core' THEN 1 END) as core_users,
    COUNT(CASE WHEN user_segment = 'casual' THEN 1 END) as casual_users,
    COUNT(CASE WHEN user_segment = 'new' THEN 1 END) as new_users,
    COUNT(CASE WHEN user_segment = 'inactive' THEN 1 END) as inactive_users,
    COUNT(CASE WHEN is_active_reviewer = true THEN 1 END) as active_reviewers,
    COUNT(CASE WHEN is_influencer = true THEN 1 END) as influencers
  FROM user_analytics
)
SELECT
  '✅ Analytics Population Complete' as status,
  total_users,
  users_with_codes,
  ROUND(avg_engagement::numeric, 1) as avg_engagement_score,
  ROUND(avg_completion::numeric, 1) as avg_profile_completion,
  JSON_BUILD_OBJECT(
    'hardcore', hardcore_users,
    'core', core_users,
    'casual', casual_users,
    'new', new_users,
    'inactive', inactive_users
  ) as user_segments,
  JSON_BUILD_OBJECT(
    'active_reviewers', active_reviewers,
    'influencers', influencers
  ) as special_users
FROM stats;

-- Debug: Show a sample of the data
SELECT
  'Sample Data (Top 5 Most Engaged)' as debug_info,
  ua.user_id,
  ua.engagement_score,
  ua.avg_rating,
  ua.total_reviews,
  ua.referral_code,
  ua.user_segment
FROM user_analytics ua
ORDER BY engagement_score DESC NULLS LAST
LIMIT 5;