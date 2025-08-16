/*
  # Activity Feed and Notification System

  1. New Tables
    - `activity` - Stores all user activities (reviews, ratings, comments, etc.)
    - `notification` - Stores user notifications
    - `notification_preference` - User notification preferences
    - `user_follow` - User follow relationships
    - `notification_read_status` - Tracks read/unread status

  2. Security
    - Enable RLS on all tables
    - Add policies for proper data access
    - Ensure users can only see relevant activities and notifications

  3. Features
    - Activity tracking for reviews, ratings, comments, follows
    - Notification system with multiple types
    - User follow system
    - Read/unread status tracking
*/

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Activity table
CREATE TABLE IF NOT EXISTS activity (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL,
  object_id INTEGER,
  object_type VARCHAR(50),
  target_id INTEGER,
  target_type VARCHAR(50),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_activity_type CHECK (
    activity_type IN (
      'review_created', 'review_updated', 'rating_created', 'rating_updated',
      'comment_created', 'user_followed', 'game_added', 'game_completed',
      'wishlist_added', 'price_alert', 'release_alert', 'system_announcement'
    )
  )
);

-- Notification table
CREATE TABLE IF NOT EXISTS notification (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  activity_id INTEGER REFERENCES activity(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT FALSE,
  is_dismissed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_notification_type CHECK (
    notification_type IN (
      'review_mention', 'comment_reply', 'user_followed', 'game_release',
      'price_drop', 'community_milestone', 'friend_activity', 'system_announcement',
      'weekly_digest'
    )
  )
);

-- Notification preference table
CREATE TABLE IF NOT EXISTS notification_preference (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL,
  email_enabled BOOLEAN DEFAULT TRUE,
  push_enabled BOOLEAN DEFAULT TRUE,
  in_app_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_preference_type CHECK (
    notification_type IN (
      'review_mention', 'comment_reply', 'user_followed', 'game_release',
      'price_drop', 'community_milestone', 'friend_activity', 'system_announcement',
      'weekly_digest'
    )
  ),
  UNIQUE(user_id, notification_type)
);

-- User follow table
CREATE TABLE IF NOT EXISTS user_follow (
  id SERIAL PRIMARY KEY,
  follower_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  following_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

-- Notification read status table
CREATE TABLE IF NOT EXISTS notification_read_status (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  notification_id INTEGER NOT NULL REFERENCES notification(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, notification_id)
);

-- Enable Row Level Security
ALTER TABLE activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preference ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follow ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_read_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Activity policies
CREATE POLICY "Users can see public activities"
  ON activity
  FOR SELECT
  TO authenticated
  USING (
    -- Public activities
    activity_type IN ('review_created', 'review_updated', 'rating_created', 'game_completed')
    -- Activities from followed users
    OR user_id IN (
      SELECT following_id FROM user_follow WHERE follower_id = auth.uid()::text::integer
    )
    -- User's own activities
    OR user_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()::text)
  );

CREATE POLICY "Users can create their own activities"
  ON activity
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()::text));

-- Notification policies
CREATE POLICY "Users can see their own notifications"
  ON notification
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()::text));

CREATE POLICY "Users can update their own notifications"
  ON notification
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()::text));

-- Notification preference policies
CREATE POLICY "Users can see their own notification preferences"
  ON notification_preference
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()::text));

CREATE POLICY "Users can update their own notification preferences"
  ON notification_preference
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()::text));

CREATE POLICY "Users can insert their own notification preferences"
  ON notification_preference
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()::text));

-- User follow policies
CREATE POLICY "Anyone can see user follows"
  ON user_follow
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create their own follows"
  ON user_follow
  FOR INSERT
  TO authenticated
  WITH CHECK (follower_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()::text));

CREATE POLICY "Users can delete their own follows"
  ON user_follow
  FOR DELETE
  TO authenticated
  USING (follower_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()::text));

-- Notification read status policies
CREATE POLICY "Users can see their own read status"
  ON notification_read_status
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()::text));

CREATE POLICY "Users can update their own read status"
  ON notification_read_status
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()::text));

CREATE POLICY "Users can insert their own read status"
  ON notification_read_status
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()::text));

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_notification_preference_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_notification_preference_updated_at
BEFORE UPDATE ON notification_preference
FOR EACH ROW EXECUTE FUNCTION update_notification_preference_updated_at();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_user_id ON activity(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_activity_type ON activity(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_created_at ON activity(created_at);
CREATE INDEX IF NOT EXISTS idx_notification_user_id ON notification(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_is_read ON notification(is_read);
CREATE INDEX IF NOT EXISTS idx_notification_created_at ON notification(created_at);
CREATE INDEX IF NOT EXISTS idx_user_follow_follower_id ON user_follow(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follow_following_id ON user_follow(following_id);

-- Functions for activity feed
CREATE OR REPLACE FUNCTION create_notification_from_activity()
RETURNS TRIGGER AS $$
DECLARE
  target_user_id INTEGER;
  notification_title TEXT;
  notification_message TEXT;
  notification_link TEXT;
  actor_name TEXT;
BEGIN
  -- Get actor name
  SELECT name INTO actor_name FROM "user" WHERE id = NEW.user_id;
  
  -- Handle different activity types
  CASE NEW.activity_type
    WHEN 'review_created' THEN
      -- Notify followers
      FOR target_user_id IN (
        SELECT follower_id FROM user_follow WHERE following_id = NEW.user_id
      ) LOOP
        -- Check if user wants this notification
        IF EXISTS (
          SELECT 1 FROM notification_preference 
          WHERE user_id = target_user_id 
          AND notification_type = 'friend_activity'
          AND in_app_enabled = TRUE
        ) THEN
          -- Get game name
          SELECT name INTO notification_title FROM game WHERE id = NEW.object_id;
          
          notification_message := actor_name || ' posted a review for ' || notification_title;
          notification_link := '/game/' || NEW.object_id;
          
          INSERT INTO notification (
            user_id, 
            notification_type, 
            title, 
            message, 
            link, 
            activity_id
          ) VALUES (
            target_user_id,
            'friend_activity',
            notification_title,
            notification_message,
            notification_link,
            NEW.id
          );
        END IF;
      END LOOP;
      
    WHEN 'comment_created' THEN
      -- If this is a reply, notify the original commenter
      IF NEW.target_id IS NOT NULL AND NEW.target_type = 'comment' THEN
        -- Get original comment's user_id
        SELECT user_id INTO target_user_id FROM comment WHERE id = NEW.target_id;
        
        -- Check if user wants this notification
        IF EXISTS (
          SELECT 1 FROM notification_preference 
          WHERE user_id = target_user_id 
          AND notification_type = 'comment_reply'
          AND in_app_enabled = TRUE
        ) THEN
          notification_title := 'New reply to your comment';
          notification_message := actor_name || ' replied to your comment';
          
          -- Get the game id if available
          IF NEW.metadata->>'game_id' IS NOT NULL THEN
            notification_link := '/game/' || (NEW.metadata->>'game_id');
          ELSE
            notification_link := '/comments/' || NEW.target_id;
          END IF;
          
          INSERT INTO notification (
            user_id, 
            notification_type, 
            title, 
            message, 
            link, 
            activity_id
          ) VALUES (
            target_user_id,
            'comment_reply',
            notification_title,
            notification_message,
            notification_link,
            NEW.id
          );
        END IF;
      END IF;
      
    WHEN 'user_followed' THEN
      -- Notify the user who was followed
      target_user_id := NEW.target_id;
      
      -- Check if user wants this notification
      IF EXISTS (
        SELECT 1 FROM notification_preference 
        WHERE user_id = target_user_id 
        AND notification_type = 'user_followed'
        AND in_app_enabled = TRUE
      ) THEN
        notification_title := 'New follower';
        notification_message := actor_name || ' started following you';
        notification_link := '/user/' || NEW.user_id;
        
        INSERT INTO notification (
          user_id, 
          notification_type, 
          title, 
          message, 
          link, 
          activity_id
        ) VALUES (
          target_user_id,
          'user_followed',
          notification_title,
          notification_message,
          notification_link,
          NEW.id
        );
      END IF;
      
    ELSE
      -- Other activity types can be handled here
  END CASE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER activity_notification_trigger
AFTER INSERT ON activity
FOR EACH ROW EXECUTE FUNCTION create_notification_from_activity();

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE notification
  SET is_read = TRUE
  WHERE id = p_notification_id
  AND user_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()::text);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS VOID AS $$
BEGIN
  UPDATE notification
  SET is_read = TRUE
  WHERE user_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()::text)
  AND is_read = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count()
RETURNS INTEGER AS $$
DECLARE
  count INTEGER;
BEGIN
  SELECT COUNT(*) INTO count
  FROM notification
  WHERE user_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()::text)
  AND is_read = FALSE;
  
  RETURN count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;