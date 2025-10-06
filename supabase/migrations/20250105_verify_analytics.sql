-- Verification Script: Check user_analytics population results

-- 1. Check overall population status
SELECT
  'Population Status' as check_type,
  COUNT(*) as total_records,
  COUNT(CASE WHEN engagement_score > 0 THEN 1 END) as users_with_engagement,
  COUNT(CASE WHEN referral_code IS NOT NULL THEN 1 END) as users_with_referral_codes,
  COUNT(CASE WHEN user_segment IS NOT NULL THEN 1 END) as users_with_segments
FROM user_analytics;

-- 2. User segment distribution
SELECT
  'Segment Distribution' as check_type,
  user_segment,
  COUNT(*) as user_count,
  AVG(engagement_score) as avg_engagement,
  AVG(profile_completion_score) as avg_profile_completion
FROM user_analytics
GROUP BY user_segment
ORDER BY user_count DESC;

-- 3. Top engaged users
SELECT
  'Top Engaged Users' as check_type,
  ua.user_id,
  u.username,
  ua.engagement_score,
  ua.total_reviews,
  ua.total_followers,
  ua.games_completed,
  ua.user_segment,
  ua.referral_code
FROM user_analytics ua
JOIN "user" u ON ua.user_id = u.id
ORDER BY ua.engagement_score DESC
LIMIT 10;

-- 4. Check for users with missing analytics
SELECT
  'Missing Analytics' as check_type,
  COUNT(*) as users_without_analytics
FROM "user" u
WHERE NOT EXISTS (
  SELECT 1 FROM user_analytics ua WHERE ua.user_id = u.id
);

-- 5. Referral code uniqueness check
SELECT
  'Referral Code Check' as check_type,
  COUNT(*) as total_codes,
  COUNT(DISTINCT referral_code) as unique_codes,
  CASE
    WHEN COUNT(*) = COUNT(DISTINCT referral_code) THEN 'All codes are unique'
    ELSE 'DUPLICATE CODES FOUND!'
  END as status
FROM user_analytics
WHERE referral_code IS NOT NULL;

-- 6. Activity metrics summary
SELECT
  'Activity Summary' as check_type,
  SUM(total_reviews) as total_reviews_platform,
  SUM(total_comments) as total_comments_platform,
  SUM(games_completed) as total_games_completed_platform,
  AVG(avg_rating) as avg_rating_given_platform,
  COUNT(CASE WHEN is_active_reviewer THEN 1 END) as active_reviewers,
  COUNT(CASE WHEN is_influencer THEN 1 END) as influencers
FROM user_analytics;

-- 7. Profile completion distribution
SELECT
  'Profile Completion' as check_type,
  CASE
    WHEN profile_completion_score = 100 THEN '100% Complete'
    WHEN profile_completion_score >= 80 THEN '80-99% Complete'
    WHEN profile_completion_score >= 60 THEN '60-79% Complete'
    WHEN profile_completion_score >= 40 THEN '40-59% Complete'
    WHEN profile_completion_score >= 20 THEN '20-39% Complete'
    ELSE '0-19% Complete'
  END as completion_range,
  COUNT(*) as user_count,
  AVG(engagement_score) as avg_engagement
FROM user_analytics
GROUP BY completion_range
ORDER BY
  CASE completion_range
    WHEN '100% Complete' THEN 1
    WHEN '80-99% Complete' THEN 2
    WHEN '60-79% Complete' THEN 3
    WHEN '40-59% Complete' THEN 4
    WHEN '20-39% Complete' THEN 5
    ELSE 6
  END;

-- 8. Cohort analysis
SELECT
  'Cohort Analysis' as check_type,
  cohort_month,
  COUNT(*) as users,
  AVG(engagement_score) as avg_engagement,
  COUNT(CASE WHEN user_segment = 'churned' THEN 1 END) as churned_users,
  ROUND(COUNT(CASE WHEN user_segment = 'churned' THEN 1 END)::numeric / COUNT(*)::numeric * 100, 1) as churn_rate
FROM user_analytics
WHERE cohort_month IS NOT NULL
GROUP BY cohort_month
ORDER BY cohort_month DESC
LIMIT 12;

-- 9. Referral potential analysis
SELECT
  'Referral Potential' as check_type,
  CASE
    WHEN total_followers >= 100 THEN 'High Potential (100+ followers)'
    WHEN total_followers >= 50 THEN 'Medium-High (50-99 followers)'
    WHEN total_followers >= 20 THEN 'Medium (20-49 followers)'
    WHEN total_followers >= 5 THEN 'Low-Medium (5-19 followers)'
    ELSE 'Low (0-4 followers)'
  END as referral_potential,
  COUNT(*) as user_count,
  AVG(engagement_score) as avg_engagement,
  SUM(total_followers) as total_reach
FROM user_analytics
GROUP BY referral_potential
ORDER BY
  CASE
    WHEN total_followers >= 100 THEN 1
    WHEN total_followers >= 50 THEN 2
    WHEN total_followers >= 20 THEN 3
    WHEN total_followers >= 5 THEN 4
    ELSE 5
  END;

-- 10. Data quality check
WITH data_quality AS (
  SELECT
    CASE WHEN user_id IS NULL THEN 1 ELSE 0 END as null_user_id,
    CASE WHEN engagement_score < 0 OR engagement_score > 100 THEN 1 ELSE 0 END as invalid_engagement,
    CASE WHEN profile_completion_score < 0 OR profile_completion_score > 100 THEN 1 ELSE 0 END as invalid_completion,
    CASE WHEN total_reviews < 0 THEN 1 ELSE 0 END as negative_reviews,
    CASE WHEN total_followers < 0 THEN 1 ELSE 0 END as negative_followers
  FROM user_analytics
)
SELECT
  'Data Quality' as check_type,
  SUM(null_user_id) as null_user_ids,
  SUM(invalid_engagement) as invalid_engagement_scores,
  SUM(invalid_completion) as invalid_completion_scores,
  SUM(negative_reviews) as negative_review_counts,
  SUM(negative_followers) as negative_follower_counts,
  CASE
    WHEN SUM(null_user_id + invalid_engagement + invalid_completion + negative_reviews + negative_followers) = 0
    THEN 'All data quality checks passed'
    ELSE 'DATA QUALITY ISSUES DETECTED'
  END as status
FROM data_quality;