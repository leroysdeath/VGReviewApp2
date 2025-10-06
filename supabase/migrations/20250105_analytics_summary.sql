-- Analytics Population Summary Report

-- 1. Overall Statistics
WITH summary AS (
  SELECT
    COUNT(*) as total_users,
    COUNT(CASE WHEN engagement_score > 0 THEN 1 END) as engaged_users,
    COUNT(CASE WHEN engagement_score >= 50 THEN 1 END) as highly_engaged,
    COUNT(CASE WHEN engagement_score = 100 THEN 1 END) as max_engaged,
    ROUND(AVG(engagement_score)::numeric, 1) as avg_engagement,
    ROUND(AVG(profile_completion_score)::numeric, 1) as avg_profile_completion
  FROM user_analytics
)
SELECT
  '📊 Overall Analytics Summary' as report_section,
  total_users as "Total Users",
  engaged_users as "Engaged Users",
  highly_engaged as "Highly Engaged (50+)",
  max_engaged as "Max Engagement (100)",
  avg_engagement as "Avg Engagement Score",
  avg_profile_completion as "Avg Profile Completion"
FROM summary;

-- 2. User Segmentation
SELECT
  '👥 User Segments' as report_section,
  user_segment as "Segment",
  COUNT(*) as "Users",
  ROUND(AVG(engagement_score)::numeric, 1) as "Avg Engagement",
  ROUND(AVG(total_reviews)::numeric, 1) as "Avg Reviews",
  ROUND(AVG(games_completed)::numeric, 1) as "Avg Games Completed"
FROM user_analytics
GROUP BY user_segment
ORDER BY COUNT(*) DESC;

-- 3. Referral System Status
SELECT
  '🔗 Referral System' as report_section,
  COUNT(DISTINCT referral_code) as "Unique Codes Generated",
  COUNT(CASE WHEN is_influencer THEN 1 END) as "Influencers",
  COUNT(CASE WHEN total_followers >= 10 THEN 1 END) as "Users with 10+ Followers",
  ROUND(AVG(CASE WHEN total_followers > 0 THEN total_followers END)::numeric, 1) as "Avg Followers (excluding 0)"
FROM user_analytics;

-- 4. Content Creation Stats
SELECT
  '✍️ Content Creation' as report_section,
  SUM(total_reviews) as "Total Reviews",
  SUM(total_comments) as "Total Comments",
  SUM(games_completed) as "Total Games Completed",
  COUNT(CASE WHEN is_active_reviewer THEN 1 END) as "Active Reviewers",
  ROUND(AVG(CASE WHEN total_reviews > 0 THEN avg_rating END)::numeric, 2) as "Avg Rating Given"
FROM user_analytics;

-- 5. Top Referral Candidates (High engagement + followers)
SELECT
  '🌟 Top 10 Referral Candidates' as report_section,
  ua.user_id,
  u.username,
  ua.referral_code as "Referral Code",
  ua.engagement_score as "Engagement",
  ua.total_followers as "Followers",
  ua.total_reviews as "Reviews",
  ua.user_segment as "Segment",
  CASE
    WHEN ua.is_influencer THEN '✓ Influencer'
    WHEN ua.total_followers >= 50 THEN 'High Reach'
    WHEN ua.engagement_score >= 75 THEN 'High Engagement'
    ELSE 'Growing'
  END as "Status"
FROM user_analytics ua
JOIN "user" u ON ua.user_id = u.id
WHERE ua.engagement_score > 0 OR ua.total_followers > 0
ORDER BY (ua.engagement_score * 0.6 + LEAST(ua.total_followers, 100) * 0.4) DESC
LIMIT 10;

-- 6. Profile Completion Analysis
SELECT
  '📝 Profile Completion' as report_section,
  COUNT(CASE WHEN has_avatar THEN 1 END) as "Has Avatar",
  COUNT(CASE WHEN has_bio THEN 1 END) as "Has Bio",
  COUNT(CASE WHEN has_top_games THEN 1 END) as "Has Top Games",
  COUNT(CASE WHEN has_first_review THEN 1 END) as "Has Reviews",
  COUNT(CASE WHEN profile_completion_score = 100 THEN 1 END) as "Fully Complete",
  COUNT(CASE WHEN profile_completion_score = 0 THEN 1 END) as "Not Started"
FROM user_analytics;

-- 7. Early Adopters & Special Users
SELECT
  '🏆 Special User Categories' as report_section,
  COUNT(CASE WHEN is_early_adopter THEN 1 END) as "Early Adopters",
  COUNT(CASE WHEN is_active_reviewer THEN 1 END) as "Active Reviewers",
  COUNT(CASE WHEN is_influencer THEN 1 END) as "Influencers",
  COUNT(CASE WHEN is_premium_user THEN 1 END) as "Premium Users",
  COUNT(CASE WHEN user_segment = 'hardcore' THEN 1 END) as "Hardcore Gamers",
  COUNT(CASE WHEN user_segment = 'core' THEN 1 END) as "Core Gamers"
FROM user_analytics;

-- 8. Engagement Distribution
SELECT
  '📈 Engagement Distribution' as report_section,
  CASE
    WHEN engagement_score = 0 THEN '0 (Inactive)'
    WHEN engagement_score BETWEEN 1 AND 25 THEN '1-25 (Low)'
    WHEN engagement_score BETWEEN 26 AND 50 THEN '26-50 (Medium)'
    WHEN engagement_score BETWEEN 51 AND 75 THEN '51-75 (High)'
    WHEN engagement_score BETWEEN 76 AND 99 THEN '76-99 (Very High)'
    WHEN engagement_score = 100 THEN '100 (Maximum)'
  END as "Engagement Range",
  COUNT(*) as "Users",
  ROUND(AVG(total_reviews)::numeric, 1) as "Avg Reviews",
  ROUND(AVG(total_followers)::numeric, 1) as "Avg Followers"
FROM user_analytics
GROUP BY
  CASE
    WHEN engagement_score = 0 THEN '0 (Inactive)'
    WHEN engagement_score BETWEEN 1 AND 25 THEN '1-25 (Low)'
    WHEN engagement_score BETWEEN 26 AND 50 THEN '26-50 (Medium)'
    WHEN engagement_score BETWEEN 51 AND 75 THEN '51-75 (High)'
    WHEN engagement_score BETWEEN 76 AND 99 THEN '76-99 (Very High)'
    WHEN engagement_score = 100 THEN '100 (Maximum)'
  END
ORDER BY
  CASE
    WHEN engagement_score = 0 THEN 1
    WHEN engagement_score BETWEEN 1 AND 25 THEN 2
    WHEN engagement_score BETWEEN 26 AND 50 THEN 3
    WHEN engagement_score BETWEEN 51 AND 75 THEN 4
    WHEN engagement_score BETWEEN 76 AND 99 THEN 5
    WHEN engagement_score = 100 THEN 6
  END;

-- 9. Quick Health Check
SELECT
  '✅ System Health Check' as report_section,
  CASE WHEN COUNT(DISTINCT referral_code) = COUNT(referral_code)
       THEN '✓ All referral codes unique'
       ELSE '⚠️ Duplicate codes found' END as "Referral Codes",
  CASE WHEN MIN(engagement_score) >= 0 AND MAX(engagement_score) <= 100
       THEN '✓ Engagement scores valid (0-100)'
       ELSE '⚠️ Invalid engagement scores' END as "Engagement Scores",
  CASE WHEN MIN(profile_completion_score) >= 0 AND MAX(profile_completion_score) <= 100
       THEN '✓ Profile scores valid (0-100)'
       ELSE '⚠️ Invalid profile scores' END as "Profile Scores",
  CASE WHEN COUNT(*) = (SELECT COUNT(*) FROM "user")
       THEN '✓ All users have analytics'
       ELSE '⚠️ Missing analytics records' END as "Coverage"
FROM user_analytics;