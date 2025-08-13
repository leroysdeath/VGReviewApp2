/*
  # Gamification System Database Schema

  1. New Tables
    - `user_level` - Tracks user levels, XP, and progress
    - `achievement` - Defines available achievements and badges
    - `user_achievement` - Tracks user-earned achievements
    - `challenge` - Defines daily and weekly challenges
    - `user_challenge` - Tracks user challenge progress
    - `leaderboard` - Stores leaderboard data
    - `user_streak` - Tracks user daily activity streaks
    - `reward` - Defines available rewards
    - `user_reward` - Tracks user-earned rewards

  2. Security
    - Enable RLS on all tables
    - Add policies for proper data access
    - Ensure users can only modify their own data

  3. Features
    - XP and leveling system
    - Achievement tracking
    - Challenge system
    - Leaderboards
    - Streak tracking
    - Reward system
*/

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User Level Table
CREATE TABLE IF NOT EXISTS user_level (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  level INTEGER NOT NULL DEFAULT 1,
  xp INTEGER NOT NULL DEFAULT 0,
  xp_to_next_level INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Achievement Table
CREATE TABLE IF NOT EXISTS achievement (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL,
  icon_url TEXT,
  badge_color VARCHAR(20) DEFAULT '#6366f1',
  xp_reward INTEGER NOT NULL DEFAULT 0,
  requirement_count INTEGER,
  requirement_type VARCHAR(50),
  is_secret BOOLEAN DEFAULT FALSE,
  is_limited_time BOOLEAN DEFAULT FALSE,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_category CHECK (
    category IN (
      'review', 'rating', 'community', 'discovery', 
      'consistency', 'genre', 'social', 'event'
    )
  )
);

-- User Achievement Table
CREATE TABLE IF NOT EXISTS user_achievement (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  achievement_id INTEGER NOT NULL REFERENCES achievement(id) ON DELETE CASCADE,
  progress INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  is_showcased BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- Challenge Table
CREATE TABLE IF NOT EXISTS challenge (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  challenge_type VARCHAR(20) NOT NULL,
  category VARCHAR(50) NOT NULL,
  icon_url TEXT,
  xp_reward INTEGER NOT NULL DEFAULT 0,
  requirement_count INTEGER NOT NULL,
  requirement_type VARCHAR(50) NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_challenge_type CHECK (
    challenge_type IN ('daily', 'weekly', 'monthly', 'special')
  ),
  CONSTRAINT valid_category CHECK (
    category IN (
      'review', 'rating', 'community', 'discovery', 
      'login', 'genre', 'social', 'event'
    )
  )
);

-- User Challenge Table
CREATE TABLE IF NOT EXISTS user_challenge (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  challenge_id INTEGER NOT NULL REFERENCES challenge(id) ON DELETE CASCADE,
  progress INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  reward_claimed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, challenge_id)
);

-- Leaderboard Table
CREATE TABLE IF NOT EXISTS leaderboard (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  leaderboard_type VARCHAR(50) NOT NULL,
  reset_frequency VARCHAR(20) DEFAULT 'never',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_leaderboard_type CHECK (
    leaderboard_type IN (
      'most_reviews', 'highest_rated_reviewer', 'most_helpful', 
      'most_active', 'genre_expert', 'discovery_leader', 'streak_leader'
    )
  ),
  CONSTRAINT valid_reset_frequency CHECK (
    reset_frequency IN ('daily', 'weekly', 'monthly', 'yearly', 'never')
  )
);

-- Leaderboard Entry Table
CREATE TABLE IF NOT EXISTS leaderboard_entry (
  id SERIAL PRIMARY KEY,
  leaderboard_id INTEGER NOT NULL REFERENCES leaderboard(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  rank INTEGER,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(leaderboard_id, user_id, period_start)
);

-- User Streak Table
CREATE TABLE IF NOT EXISTS user_streak (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  streak_type VARCHAR(50) NOT NULL,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, streak_type),
  CONSTRAINT valid_streak_type CHECK (
    streak_type IN ('login', 'review', 'rating', 'comment')
  )
);

-- Reward Table
CREATE TABLE IF NOT EXISTS reward (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  reward_type VARCHAR(50) NOT NULL,
  icon_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_reward_type CHECK (
    reward_type IN (
      'badge', 'profile_theme', 'profile_banner', 'profile_title', 
      'special_access', 'feature_unlock'
    )
  )
);

-- User Reward Table
CREATE TABLE IF NOT EXISTS user_reward (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  reward_id INTEGER NOT NULL REFERENCES reward(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, reward_id)
);

-- Enable Row Level Security
ALTER TABLE user_level ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievement ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_challenge ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_entry ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_streak ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reward ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- User Level Policies
CREATE POLICY "Users can view all user levels"
  ON user_level
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own level"
  ON user_level
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()::text));

-- Achievement Policies
CREATE POLICY "Anyone can view achievements"
  ON achievement
  FOR SELECT
  TO authenticated
  USING (true);

-- User Achievement Policies
CREATE POLICY "Users can view all user achievements"
  ON user_achievement
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own achievements"
  ON user_achievement
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()::text));

-- Challenge Policies
CREATE POLICY "Anyone can view challenges"
  ON challenge
  FOR SELECT
  TO authenticated
  USING (true);

-- User Challenge Policies
CREATE POLICY "Users can view all user challenges"
  ON user_challenge
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own challenges"
  ON user_challenge
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()::text));

-- Leaderboard Policies
CREATE POLICY "Anyone can view leaderboards"
  ON leaderboard
  FOR SELECT
  TO authenticated
  USING (true);

-- Leaderboard Entry Policies
CREATE POLICY "Anyone can view leaderboard entries"
  ON leaderboard_entry
  FOR SELECT
  TO authenticated
  USING (true);

-- User Streak Policies
CREATE POLICY "Users can view all user streaks"
  ON user_streak
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own streaks"
  ON user_streak
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()::text));

-- Reward Policies
CREATE POLICY "Anyone can view rewards"
  ON reward
  FOR SELECT
  TO authenticated
  USING (true);

-- User Reward Policies
CREATE POLICY "Users can view all user rewards"
  ON user_reward
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own rewards"
  ON user_reward
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()::text));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_level_user_id ON user_level(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievement_user_id ON user_achievement(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievement_achievement_id ON user_achievement(achievement_id);
CREATE INDEX IF NOT EXISTS idx_user_challenge_user_id ON user_challenge(user_id);
CREATE INDEX IF NOT EXISTS idx_user_challenge_challenge_id ON user_challenge(challenge_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_entry_leaderboard_id ON leaderboard_entry(leaderboard_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_entry_user_id ON leaderboard_entry(user_id);
CREATE INDEX IF NOT EXISTS idx_user_streak_user_id ON user_streak(user_id);
CREATE INDEX IF NOT EXISTS idx_user_reward_user_id ON user_reward(user_id);
CREATE INDEX IF NOT EXISTS idx_user_reward_reward_id ON user_reward(reward_id);

-- Functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_user_level_updated_at
BEFORE UPDATE ON user_level
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_achievement_updated_at
BEFORE UPDATE ON user_achievement
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_challenge_updated_at
BEFORE UPDATE ON user_challenge
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leaderboard_entry_updated_at
BEFORE UPDATE ON leaderboard_entry
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_streak_updated_at
BEFORE UPDATE ON user_streak
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to add XP to user
CREATE OR REPLACE FUNCTION add_user_xp(p_user_id INTEGER, p_xp_amount INTEGER)
RETURNS VOID AS $$
DECLARE
  v_current_level INTEGER;
  v_current_xp INTEGER;
  v_xp_to_next_level INTEGER;
  v_level_up BOOLEAN := FALSE;
BEGIN
  -- Get current user level info
  SELECT level, xp, xp_to_next_level INTO v_current_level, v_current_xp, v_xp_to_next_level
  FROM user_level
  WHERE user_id = p_user_id;
  
  -- If user doesn't have a level record yet, create one
  IF NOT FOUND THEN
    INSERT INTO user_level (user_id, level, xp, xp_to_next_level)
    VALUES (p_user_id, 1, p_xp_amount, 100);
    RETURN;
  END IF;
  
  -- Add XP and check for level up
  v_current_xp := v_current_xp + p_xp_amount;
  
  -- Level up logic
  WHILE v_current_xp >= v_xp_to_next_level LOOP
    v_current_xp := v_current_xp - v_xp_to_next_level;
    v_current_level := v_current_level + 1;
    v_level_up := TRUE;
    
    -- Calculate new XP required for next level (increases with each level)
    v_xp_to_next_level := FLOOR(v_xp_to_next_level * 1.2);
  END LOOP;
  
  -- Update user level
  UPDATE user_level
  SET level = v_current_level,
      xp = v_current_xp,
      xp_to_next_level = v_xp_to_next_level
  WHERE user_id = p_user_id;
  
  -- If user leveled up, we could trigger other actions here
  IF v_level_up THEN
    -- For example, insert into activity feed
    INSERT INTO activity (
      user_id, 
      activity_type, 
      metadata
    ) VALUES (
      p_user_id, 
      'level_up', 
      jsonb_build_object('new_level', v_current_level)
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check and update user streaks
CREATE OR REPLACE FUNCTION update_user_streak(p_user_id INTEGER, p_streak_type VARCHAR(50))
RETURNS VOID AS $$
DECLARE
  v_last_activity DATE;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
  v_today DATE := CURRENT_DATE;
BEGIN
  -- Get current streak info
  SELECT last_activity_date, current_streak, longest_streak 
  INTO v_last_activity, v_current_streak, v_longest_streak
  FROM user_streak
  WHERE user_id = p_user_id AND streak_type = p_streak_type;
  
  -- If user doesn't have a streak record yet, create one
  IF NOT FOUND THEN
    INSERT INTO user_streak (
      user_id, 
      streak_type, 
      current_streak, 
      longest_streak, 
      last_activity_date
    ) VALUES (
      p_user_id, 
      p_streak_type, 
      1, 
      1, 
      v_today
    );
    RETURN;
  END IF;
  
  -- If already logged in today, do nothing
  IF v_last_activity = v_today THEN
    RETURN;
  END IF;
  
  -- Check if this is a consecutive day
  IF v_last_activity = v_today - INTERVAL '1 day' THEN
    -- Increment streak
    v_current_streak := v_current_streak + 1;
    
    -- Update longest streak if needed
    IF v_current_streak > v_longest_streak THEN
      v_longest_streak := v_current_streak;
    END IF;
  ELSE
    -- Streak broken, reset to 1
    v_current_streak := 1;
  END IF;
  
  -- Update streak record
  UPDATE user_streak
  SET current_streak = v_current_streak,
      longest_streak = v_longest_streak,
      last_activity_date = v_today
  WHERE user_id = p_user_id AND streak_type = p_streak_type;
  
  -- Check for streak achievements
  IF v_current_streak IN (3, 7, 14, 30, 60, 90, 180, 365) THEN
    -- For example, insert into activity feed
    INSERT INTO activity (
      user_id, 
      activity_type, 
      metadata
    ) VALUES (
      p_user_id, 
      'streak_milestone', 
      jsonb_build_object(
        'streak_type', p_streak_type,
        'streak_days', v_current_streak
      )
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check and award achievements
CREATE OR REPLACE FUNCTION check_achievement_progress(
  p_user_id INTEGER, 
  p_achievement_category VARCHAR(50),
  p_action_type VARCHAR(50),
  p_count INTEGER DEFAULT 1
)
RETURNS VOID AS $$
DECLARE
  v_achievement RECORD;
  v_progress INTEGER;
  v_completed BOOLEAN;
  v_newly_completed BOOLEAN;
BEGIN
  -- Find relevant achievements for this action
  FOR v_achievement IN 
    SELECT a.id, a.name, a.requirement_count, a.xp_reward
    FROM achievement a
    WHERE a.category = p_achievement_category
    AND (a.requirement_type = p_action_type OR a.requirement_type IS NULL)
    AND (a.is_limited_time = FALSE OR (a.start_date <= NOW() AND a.end_date >= NOW()))
  LOOP
    -- Get current progress
    SELECT progress, is_completed INTO v_progress, v_completed
    FROM user_achievement
    WHERE user_id = p_user_id AND achievement_id = v_achievement.id;
    
    -- If no record exists, create one
    IF NOT FOUND THEN
      INSERT INTO user_achievement (
        user_id, 
        achievement_id, 
        progress, 
        is_completed
      ) VALUES (
        p_user_id, 
        v_achievement.id, 
        p_count, 
        p_count >= v_achievement.requirement_count
      )
      RETURNING is_completed INTO v_completed;
      
      v_newly_completed := v_completed;
    ELSE
      -- If already completed, skip
      IF v_completed THEN
        CONTINUE;
      END IF;
      
      -- Update progress
      UPDATE user_achievement
      SET progress = progress + p_count,
          is_completed = CASE 
            WHEN progress + p_count >= v_achievement.requirement_count THEN TRUE 
            ELSE FALSE 
          END,
          completed_at = CASE 
            WHEN progress + p_count >= v_achievement.requirement_count THEN NOW() 
            ELSE NULL 
          END
      WHERE user_id = p_user_id AND achievement_id = v_achievement.id
      RETURNING is_completed INTO v_newly_completed;
    END IF;
    
    -- If newly completed, award XP and create activity
    IF v_newly_completed AND NOT v_completed THEN
      -- Award XP
      PERFORM add_user_xp(p_user_id, v_achievement.xp_reward);
      
      -- Create activity
      INSERT INTO activity (
        user_id, 
        activity_type, 
        object_id,
        object_type,
        metadata
      ) VALUES (
        p_user_id, 
        'achievement_earned', 
        v_achievement.id,
        'achievement',
        jsonb_build_object(
          'achievement_name', v_achievement.name,
          'xp_reward', v_achievement.xp_reward
        )
      );
      
      -- Create notification
      INSERT INTO notification (
        user_id,
        notification_type,
        title,
        message,
        link
      ) VALUES (
        p_user_id,
        'achievement_earned',
        'Achievement Unlocked!',
        'You earned the "' || v_achievement.name || '" achievement and ' || v_achievement.xp_reward || ' XP!',
        '/profile/achievements'
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function for review activities
CREATE OR REPLACE FUNCTION process_review_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Check review achievements
  PERFORM check_achievement_progress(NEW.user_id, 'review', 'review_count');
  
  -- Update streak
  PERFORM update_user_streak(NEW.user_id, 'review');
  
  -- Add XP for creating a review
  PERFORM add_user_xp(NEW.user_id, 10);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for new reviews
CREATE TRIGGER after_review_insert
AFTER INSERT ON rating
FOR EACH ROW
WHEN (NEW.review IS NOT NULL AND NEW.review != '')
EXECUTE FUNCTION process_review_activity();

-- Seed data for achievements
INSERT INTO achievement (name, description, category, icon_url, badge_color, xp_reward, requirement_count, requirement_type) VALUES
-- Review milestones
('Rookie Reviewer', 'Write your first review', 'review', '/badges/rookie_reviewer.png', '#6366f1', 50, 1, 'review_count'),
('Prolific Reviewer', 'Write 10 reviews', 'review', '/badges/prolific_reviewer.png', '#6366f1', 100, 10, 'review_count'),
('Review Expert', 'Write 50 reviews', 'review', '/badges/review_expert.png', '#6366f1', 250, 50, 'review_count'),
('Review Master', 'Write 100 reviews', 'review', '/badges/review_master.png', '#6366f1', 500, 100, 'review_count'),
('Review Legend', 'Write 500 reviews', 'review', '/badges/review_legend.png', '#6366f1', 1000, 500, 'review_count'),

-- Rating accuracy
('Helpful Reviewer', 'Get 10 helpful votes on your reviews', 'rating', '/badges/helpful_reviewer.png', '#3b82f6', 100, 10, 'helpful_votes'),
('Trusted Critic', 'Get 50 helpful votes on your reviews', 'rating', '/badges/trusted_critic.png', '#3b82f6', 250, 50, 'helpful_votes'),
('Community Voice', 'Get 100 helpful votes on your reviews', 'rating', '/badges/community_voice.png', '#3b82f6', 500, 100, 'helpful_votes'),

-- Community engagement
('Conversation Starter', 'Leave 10 comments', 'community', '/badges/conversation_starter.png', '#10b981', 50, 10, 'comment_count'),
('Active Participant', 'Leave 50 comments', 'community', '/badges/active_participant.png', '#10b981', 150, 50, 'comment_count'),
('Community Pillar', 'Leave 100 comments', 'community', '/badges/community_pillar.png', '#10b981', 300, 100, 'comment_count'),

-- Discovery achievements
('Early Adopter', 'Be among the first 10 to review a new game', 'discovery', '/badges/early_adopter.png', '#f59e0b', 100, 1, 'early_review'),
('Trendsetter', 'Be among the first 10 to review 5 new games', 'discovery', '/badges/trendsetter.png', '#f59e0b', 250, 5, 'early_review'),
('Game Pioneer', 'Be among the first 10 to review 10 new games', 'discovery', '/badges/game_pioneer.png', '#f59e0b', 500, 10, 'early_review'),

-- Consistency awards
('Daily Visitor', 'Log in for 7 consecutive days', 'consistency', '/badges/daily_visitor.png', '#ef4444', 100, 7, 'login_streak'),
('Dedicated Fan', 'Log in for 30 consecutive days', 'consistency', '/badges/dedicated_fan.png', '#ef4444', 250, 30, 'login_streak'),
('Gaming Devotee', 'Log in for 100 consecutive days', 'consistency', '/badges/gaming_devotee.png', '#ef4444', 500, 100, 'login_streak'),

-- Genre expertise
('RPG Enthusiast', 'Review 10 RPG games', 'genre', '/badges/rpg_enthusiast.png', '#8b5cf6', 100, 10, 'genre_rpg'),
('Strategy Master', 'Review 10 strategy games', 'genre', '/badges/strategy_master.png', '#8b5cf6', 100, 10, 'genre_strategy'),
('Action Hero', 'Review 10 action games', 'genre', '/badges/action_hero.png', '#8b5cf6', 100, 10, 'genre_action'),
('Adventure Seeker', 'Review 10 adventure games', 'genre', '/badges/adventure_seeker.png', '#8b5cf6', 100, 10, 'genre_adventure'),

-- Social achievements
('Social Butterfly', 'Gain 10 followers', 'social', '/badges/social_butterfly.png', '#ec4899', 100, 10, 'follower_count'),
('Community Celebrity', 'Gain 50 followers', 'social', '/badges/community_celebrity.png', '#ec4899', 250, 50, 'follower_count'),
('Gaming Influencer', 'Gain 100 followers', 'social', '/badges/gaming_influencer.png', '#ec4899', 500, 100, 'follower_count'),

-- Special events
('Beta Tester', 'Participated in the GameVault beta', 'event', '/badges/beta_tester.png', '#0ea5e9', 100, 1, 'beta_participation'),
('Launch Day Hero', 'Joined GameVault on launch day', 'event', '/badges/launch_day_hero.png', '#0ea5e9', 100, 1, 'launch_day');

-- Seed data for leaderboards
INSERT INTO leaderboard (name, description, leaderboard_type, reset_frequency) VALUES
('Most Reviews', 'Users with the most game reviews', 'most_reviews', 'monthly'),
('Top Reviewers', 'Users with the highest rated reviews', 'highest_rated_reviewer', 'monthly'),
('Most Helpful', 'Users with the most helpful votes', 'most_helpful', 'monthly'),
('Most Active', 'Users with the most activity this month', 'most_active', 'monthly'),
('Genre Experts', 'Top reviewers by genre', 'genre_expert', 'never'),
('Discovery Leaders', 'First to review new games', 'discovery_leader', 'yearly'),
('Streak Champions', 'Longest active streaks', 'streak_leader', 'never');

-- Seed data for challenges
INSERT INTO challenge (name, description, challenge_type, category, xp_reward, requirement_count, requirement_type, start_date, end_date) VALUES
('Daily Reviewer', 'Write a review today', 'daily', 'review', 50, 1, 'review_count', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 day'),
('Rating Spree', 'Rate 5 games today', 'daily', 'rating', 30, 5, 'rating_count', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 day'),
('Social Butterfly', 'Comment on 3 reviews', 'daily', 'community', 20, 3, 'comment_count', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 day'),
('Weekly Reviewer', 'Write 5 reviews this week', 'weekly', 'review', 100, 5, 'review_count', date_trunc('week', CURRENT_DATE), date_trunc('week', CURRENT_DATE) + INTERVAL '1 week'),
('Genre Explorer', 'Review games from 3 different genres this week', 'weekly', 'genre', 150, 3, 'genre_variety', date_trunc('week', CURRENT_DATE), date_trunc('week', CURRENT_DATE) + INTERVAL '1 week'),
('Community Pillar', 'Help 10 users by voting on reviews this week', 'weekly', 'community', 120, 10, 'helpful_votes', date_trunc('week', CURRENT_DATE), date_trunc('week', CURRENT_DATE) + INTERVAL '1 week');