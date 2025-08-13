/*
  # Social Community Features

  1. New Tables
    - `user_friend` - Manages friend relationships between users
    - `private_message` - Private messaging between users
    - `forum_category` - Categories for community forums
    - `forum_thread` - Discussion threads within categories
    - `forum_post` - Individual posts within threads
    - `user_group` - User-created groups/communities
    - `group_member` - Members of user groups
    - `user_content` - User-generated content (screenshots, clips)
    - `community_event` - Community events for multiplayer sessions
    - `community_poll` - Community polls and voting
    - `poll_option` - Options for community polls
    - `poll_vote` - User votes on polls
    - `content_creator` - Verified content creators/influencers
    - `user_mention` - User mentions in posts/comments

  2. Security
    - Enable RLS on all tables
    - Add policies for proper data access
    - Ensure users can only modify their own content
    - Public read access for community content

  3. Features
    - Friend/follow system
    - Private messaging
    - Community forums
    - User-generated content
    - Group management
    - Event planning
    - Polls and discussions
    - Content creator verification
*/

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User Friend/Follow Table
CREATE TABLE IF NOT EXISTS user_friend (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  friend_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, accepted, rejected, blocked
  is_following BOOLEAN DEFAULT FALSE, -- One-way following
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, friend_id),
  CONSTRAINT no_self_friend CHECK (user_id != friend_id),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked'))
);

-- Private Message Table
CREATE TABLE IF NOT EXISTS private_message (
  id SERIAL PRIMARY KEY,
  sender_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  recipient_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT no_self_message CHECK (sender_id != recipient_id)
);

-- Forum Category Table
CREATE TABLE IF NOT EXISTS forum_category (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  slug VARCHAR(100) NOT NULL UNIQUE,
  icon_url TEXT,
  parent_id INTEGER REFERENCES forum_category(id) ON DELETE SET NULL,
  is_game_specific BOOLEAN DEFAULT FALSE,
  game_id INTEGER REFERENCES game(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by INTEGER REFERENCES "user"(id) ON DELETE SET NULL
);

-- Forum Thread Table
CREATE TABLE IF NOT EXISTS forum_thread (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  slug VARCHAR(200) NOT NULL,
  category_id INTEGER NOT NULL REFERENCES forum_category(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_locked BOOLEAN DEFAULT FALSE,
  view_count INTEGER DEFAULT 0,
  last_post_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category_id, slug)
);

-- Forum Post Table
CREATE TABLE IF NOT EXISTS forum_post (
  id SERIAL PRIMARY KEY,
  thread_id INTEGER NOT NULL REFERENCES forum_thread(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_edited BOOLEAN DEFAULT FALSE,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Group Table
CREATE TABLE IF NOT EXISTS user_group (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  slug VARCHAR(100) NOT NULL UNIQUE,
  icon_url TEXT,
  banner_url TEXT,
  is_private BOOLEAN DEFAULT FALSE,
  owner_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Group Member Table
CREATE TABLE IF NOT EXISTS group_member (
  id SERIAL PRIMARY KEY,
  group_id INTEGER NOT NULL REFERENCES user_group(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'member', -- owner, admin, moderator, member
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id),
  CONSTRAINT valid_role CHECK (role IN ('owner', 'admin', 'moderator', 'member'))
);

-- User Content Table (screenshots, clips, etc.)
CREATE TABLE IF NOT EXISTS user_content (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  game_id INTEGER REFERENCES game(id) ON DELETE SET NULL,
  content_type VARCHAR(20) NOT NULL, -- screenshot, video, clip, art
  title VARCHAR(200),
  description TEXT,
  content_url TEXT NOT NULL,
  thumbnail_url TEXT,
  is_public BOOLEAN DEFAULT TRUE,
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_content_type CHECK (content_type IN ('screenshot', 'video', 'clip', 'art', 'other'))
);

-- Community Event Table
CREATE TABLE IF NOT EXISTS community_event (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  game_id INTEGER REFERENCES game(id) ON DELETE SET NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  max_participants INTEGER,
  location TEXT, -- Could be in-game location or external platform
  organizer_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  group_id INTEGER REFERENCES user_group(id) ON DELETE SET NULL,
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event Participant Table
CREATE TABLE IF NOT EXISTS event_participant (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES community_event(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'going', -- going, maybe, invited, declined
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id),
  CONSTRAINT valid_status CHECK (status IN ('going', 'maybe', 'invited', 'declined'))
);

-- Community Poll Table
CREATE TABLE IF NOT EXISTS community_poll (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  group_id INTEGER REFERENCES user_group(id) ON DELETE SET NULL,
  thread_id INTEGER REFERENCES forum_thread(id) ON DELETE SET NULL,
  is_multiple_choice BOOLEAN DEFAULT FALSE,
  is_public BOOLEAN DEFAULT TRUE,
  closes_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Poll Option Table
CREATE TABLE IF NOT EXISTS poll_option (
  id SERIAL PRIMARY KEY,
  poll_id INTEGER NOT NULL REFERENCES community_poll(id) ON DELETE CASCADE,
  option_text VARCHAR(200) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Poll Vote Table
CREATE TABLE IF NOT EXISTS poll_vote (
  id SERIAL PRIMARY KEY,
  poll_id INTEGER NOT NULL REFERENCES community_poll(id) ON DELETE CASCADE,
  option_id INTEGER NOT NULL REFERENCES poll_option(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(poll_id, user_id, option_id)
);

-- Content Creator Table
CREATE TABLE IF NOT EXISTS content_creator (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  is_verified BOOLEAN DEFAULT FALSE,
  verification_date TIMESTAMPTZ,
  creator_type VARCHAR(50), -- streamer, youtuber, journalist, developer
  platform_links JSONB, -- Links to external platforms (Twitch, YouTube, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- User Mention Table
CREATE TABLE IF NOT EXISTS user_mention (
  id SERIAL PRIMARY KEY,
  mentioned_user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  mentioned_by_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  content_type VARCHAR(20) NOT NULL, -- post, comment, review, message
  content_id INTEGER NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_content_type CHECK (content_type IN ('post', 'comment', 'review', 'message'))
);

-- Content Like Table
CREATE TABLE IF NOT EXISTS content_like (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  content_type VARCHAR(20) NOT NULL, -- post, comment, review, user_content
  content_id INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, content_type, content_id),
  CONSTRAINT valid_content_type CHECK (content_type IN ('post', 'comment', 'review', 'user_content'))
);

-- Content Share Table
CREATE TABLE IF NOT EXISTS content_share (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  content_type VARCHAR(20) NOT NULL, -- post, thread, review, user_content
  content_id INTEGER NOT NULL,
  share_platform VARCHAR(50), -- internal, twitter, facebook, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_content_type CHECK (content_type IN ('post', 'thread', 'review', 'user_content'))
);

-- Enable Row Level Security
ALTER TABLE user_friend ENABLE ROW LEVEL SECURITY;
ALTER TABLE private_message ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_category ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_thread ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_post ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_group ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_member ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participant ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_poll ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_option ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_vote ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_creator ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_mention ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_like ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_share ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- User Friend Policies
CREATE POLICY "Users can view their own friend relationships"
  ON user_friend
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()::text) OR 
         friend_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()::text));

CREATE POLICY "Users can create friend requests"
  ON user_friend
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()::text));

CREATE POLICY "Users can update their own friend relationships"
  ON user_friend
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()::text) OR 
         friend_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()::text));

-- Private Message Policies
CREATE POLICY "Users can view their own messages"
  ON private_message
  FOR SELECT
  TO authenticated
  USING (sender_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()::text) OR 
         recipient_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()::text));

CREATE POLICY "Users can send messages"
  ON private_message
  FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()::text));

CREATE POLICY "Users can update their own sent messages"
  ON private_message
  FOR UPDATE
  TO authenticated
  USING (sender_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()::text) OR 
         recipient_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()::text));

-- Forum Category Policies
CREATE POLICY "Anyone can view forum categories"
  ON forum_category
  FOR SELECT
  TO authenticated
  USING (true);

-- Forum Thread Policies
CREATE POLICY "Anyone can view forum threads"
  ON forum_thread
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create forum threads"
  ON forum_thread
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()::text));

CREATE POLICY "Users can update their own forum threads"
  ON forum_thread
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()::text));

-- Forum Post Policies
CREATE POLICY "Anyone can view forum posts"
  ON forum_post
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create forum posts"
  ON forum_post
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()::text));

CREATE POLICY "Users can update their own forum posts"
  ON forum_post
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()::text));

-- User Group Policies
CREATE POLICY "Anyone can view public groups"
  ON user_group
  FOR SELECT
  TO authenticated
  USING (is_private = false OR 
         owner_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()::text) OR
         EXISTS (
           SELECT 1 FROM group_member 
           WHERE group_id = user_group.id AND 
                 user_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()::text)
         ));

CREATE POLICY "Users can create groups"
  ON user_group
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()::text));

CREATE POLICY "Group owners can update their groups"
  ON user_group
  FOR UPDATE
  TO authenticated
  USING (owner_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()::text));

-- Group Member Policies
CREATE POLICY "Users can view group members"
  ON group_member
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_group 
    WHERE id = group_id AND 
          (is_private = false OR 
           owner_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()::text) OR
           EXISTS (
             SELECT 1 FROM group_member 
             WHERE group_id = user_group.id AND 
                   user_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()::text)
           ))
  ));

CREATE POLICY "Users can join public groups"
  ON group_member
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()::text) AND
              EXISTS (
                SELECT 1 FROM user_group 
                WHERE id = group_id AND is_private = false
              ));

-- User Content Policies
CREATE POLICY "Users can view public content"
  ON user_content
  FOR SELECT
  TO authenticated
  USING (is_public = true OR 
         user_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()::text));

CREATE POLICY "Users can create their own content"
  ON user_content
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()::text));

CREATE POLICY "Users can update their own content"
  ON user_content
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()::text));

-- Community Event Policies
CREATE POLICY "Users can view public events"
  ON community_event
  FOR SELECT
  TO authenticated
  USING (is_public = true OR 
         organizer_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()::text) OR
         EXISTS (
           SELECT 1 FROM event_participant 
           WHERE event_id = community_event.id AND 
                 user_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()::text)
         ) OR
         (group_id IS NOT NULL AND EXISTS (
           SELECT 1 FROM group_member 
           WHERE group_id = community_event.group_id AND 
                 user_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()::text)
         )));

CREATE POLICY "Users can create events"
  ON community_event
  FOR INSERT
  TO authenticated
  WITH CHECK (organizer_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()::text));

-- Event Participant Policies
CREATE POLICY "Users can view event participants"
  ON event_participant
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM community_event 
    WHERE id = event_id AND 
          (is_public = true OR 
           organizer_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()::text) OR
           EXISTS (
             SELECT 1 FROM event_participant 
             WHERE event_id = community_event.id AND 
                   user_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()::text)
           ))
  ));

CREATE POLICY "Users can join events"
  ON event_participant
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()::text));

-- Community Poll Policies
CREATE POLICY "Users can view public polls"
  ON community_poll
  FOR SELECT
  TO authenticated
  USING (is_public = true OR 
         user_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()::text) OR
         (group_id IS NOT NULL AND EXISTS (
           SELECT 1 FROM group_member 
           WHERE group_id = community_poll.group_id AND 
                 user_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()::text)
         )));

CREATE POLICY "Users can create polls"
  ON community_poll
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()::text));

-- Poll Option Policies
CREATE POLICY "Anyone can view poll options"
  ON poll_option
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM community_poll 
    WHERE id = poll_id AND 
          (is_public = true OR 
           user_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()::text) OR
           (group_id IS NOT NULL AND EXISTS (
             SELECT 1 FROM group_member 
             WHERE group_id = community_poll.group_id AND 
                   user_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()::text)
           )))
  ));

-- Poll Vote Policies
CREATE POLICY "Users can view poll votes"
  ON poll_vote
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM community_poll 
    WHERE id = poll_id AND 
          (is_public = true OR 
           user_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()::text) OR
           (group_id IS NOT NULL AND EXISTS (
             SELECT 1 FROM group_member 
             WHERE group_id = community_poll.group_id AND 
                   user_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()::text)
           )))
  ));

CREATE POLICY "Users can vote on polls"
  ON poll_vote
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()::text));

-- Content Creator Policies
CREATE POLICY "Anyone can view content creators"
  ON content_creator
  FOR SELECT
  TO authenticated
  USING (true);

-- User Mention Policies
CREATE POLICY "Users can view their mentions"
  ON user_mention
  FOR SELECT
  TO authenticated
  USING (mentioned_user_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()::text) OR
         mentioned_by_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()::text));

-- Content Like Policies
CREATE POLICY "Anyone can view content likes"
  ON content_like
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can like content"
  ON content_like
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()::text));

-- Content Share Policies
CREATE POLICY "Anyone can view content shares"
  ON content_share
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can share content"
  ON content_share
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()::text));

-- Functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_user_friend_updated_at
BEFORE UPDATE ON user_friend
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_forum_thread_updated_at
BEFORE UPDATE ON forum_thread
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_forum_post_updated_at
BEFORE UPDATE ON forum_post
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_group_updated_at
BEFORE UPDATE ON user_group
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_content_updated_at
BEFORE UPDATE ON user_content
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_community_event_updated_at
BEFORE UPDATE ON community_event
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_community_poll_updated_at
BEFORE UPDATE ON community_poll
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_creator_updated_at
BEFORE UPDATE ON content_creator
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_view_count(p_table_name TEXT, p_id INTEGER)
RETURNS VOID AS $$
BEGIN
  EXECUTE format('UPDATE %I SET view_count = view_count + 1 WHERE id = %L', p_table_name, p_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle user mentions
CREATE OR REPLACE FUNCTION process_user_mentions(
  p_content TEXT,
  p_content_type TEXT,
  p_content_id INTEGER,
  p_user_id INTEGER
)
RETURNS VOID AS $$
DECLARE
  v_mention TEXT;
  v_mentioned_user_id INTEGER;
BEGIN
  -- Extract mentions (usernames prefixed with @)
  FOR v_mention IN
    SELECT regexp_matches(p_content, '@([a-zA-Z0-9_]+)', 'g')
  LOOP
    -- Find the mentioned user
    SELECT id INTO v_mentioned_user_id
    FROM "user"
    WHERE name = v_mention;
    
    -- If user exists and is not the author, create a mention
    IF v_mentioned_user_id IS NOT NULL AND v_mentioned_user_id != p_user_id THEN
      INSERT INTO user_mention (
        mentioned_user_id,
        mentioned_by_id,
        content_type,
        content_id,
        is_read
      ) VALUES (
        v_mentioned_user_id,
        p_user_id,
        p_content_type,
        p_content_id,
        FALSE
      );
      
      -- Create notification
      INSERT INTO notification (
        user_id,
        notification_type,
        title,
        message,
        link
      ) VALUES (
        v_mentioned_user_id,
        'user_mention',
        'You were mentioned',
        (SELECT name FROM "user" WHERE id = p_user_id) || ' mentioned you in a ' || p_content_type,
        CASE
          WHEN p_content_type = 'post' THEN '/forum/post/' || p_content_id
          WHEN p_content_type = 'comment' THEN '/comment/' || p_content_id
          WHEN p_content_type = 'review' THEN '/review/' || p_content_id
          ELSE '/'
        END
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for forum posts to process mentions
CREATE OR REPLACE FUNCTION process_forum_post_mentions()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM process_user_mentions(NEW.content, 'post', NEW.id, NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER forum_post_mentions_trigger
AFTER INSERT ON forum_post
FOR EACH ROW EXECUTE FUNCTION process_forum_post_mentions();

-- Trigger for comments to process mentions
CREATE OR REPLACE FUNCTION process_comment_mentions()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM process_user_mentions(NEW.content, 'comment', NEW.id, NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER comment_mentions_trigger
AFTER INSERT ON comment
FOR EACH ROW EXECUTE FUNCTION process_comment_mentions();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_friend_user_id ON user_friend(user_id);
CREATE INDEX IF NOT EXISTS idx_user_friend_friend_id ON user_friend(friend_id);
CREATE INDEX IF NOT EXISTS idx_private_message_sender_id ON private_message(sender_id);
CREATE INDEX IF NOT EXISTS idx_private_message_recipient_id ON private_message(recipient_id);
CREATE INDEX IF NOT EXISTS idx_forum_thread_category_id ON forum_thread(category_id);
CREATE INDEX IF NOT EXISTS idx_forum_thread_user_id ON forum_thread(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_post_thread_id ON forum_post(thread_id);
CREATE INDEX IF NOT EXISTS idx_forum_post_user_id ON forum_post(user_id);
CREATE INDEX IF NOT EXISTS idx_user_group_owner_id ON user_group(owner_id);
CREATE INDEX IF NOT EXISTS idx_group_member_group_id ON group_member(group_id);
CREATE INDEX IF NOT EXISTS idx_group_member_user_id ON group_member(user_id);
CREATE INDEX IF NOT EXISTS idx_user_content_user_id ON user_content(user_id);
CREATE INDEX IF NOT EXISTS idx_user_content_game_id ON user_content(game_id);
CREATE INDEX IF NOT EXISTS idx_community_event_organizer_id ON community_event(organizer_id);
CREATE INDEX IF NOT EXISTS idx_community_event_group_id ON community_event(group_id);
CREATE INDEX IF NOT EXISTS idx_event_participant_event_id ON event_participant(event_id);
CREATE INDEX IF NOT EXISTS idx_event_participant_user_id ON event_participant(user_id);
CREATE INDEX IF NOT EXISTS idx_community_poll_user_id ON community_poll(user_id);
CREATE INDEX IF NOT EXISTS idx_poll_option_poll_id ON poll_option(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_vote_poll_id ON poll_vote(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_vote_user_id ON poll_vote(user_id);
CREATE INDEX IF NOT EXISTS idx_content_creator_user_id ON content_creator(user_id);
CREATE INDEX IF NOT EXISTS idx_user_mention_mentioned_user_id ON user_mention(mentioned_user_id);
CREATE INDEX IF NOT EXISTS idx_content_like_user_id ON content_like(user_id);
CREATE INDEX IF NOT EXISTS idx_content_like_content_type_id ON content_like(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_content_share_user_id ON content_share(user_id);
CREATE INDEX IF NOT EXISTS idx_content_share_content_type_id ON content_share(content_type, content_id);

-- Create text search index for forum posts
CREATE INDEX IF NOT EXISTS idx_forum_post_content_search ON forum_post USING gin(to_tsvector('english', content));

-- Create text search index for forum threads
CREATE INDEX IF NOT EXISTS idx_forum_thread_title_search ON forum_thread USING gin(to_tsvector('english', title));

-- Seed data for forum categories
INSERT INTO forum_category (name, description, slug, icon_url, sort_order) VALUES
('General Discussion', 'General gaming discussions', 'general-discussion', '/icons/general.png', 1),
('Game Reviews', 'Discuss game reviews', 'game-reviews', '/icons/reviews.png', 2),
('Technical Support', 'Get help with technical issues', 'technical-support', '/icons/support.png', 3),
('News & Announcements', 'Latest gaming news and announcements', 'news-announcements', '/icons/news.png', 4),
('Off-Topic', 'Discussions not related to gaming', 'off-topic', '/icons/offtopic.png', 5);

-- Add genre-specific categories
INSERT INTO forum_category (name, description, slug, icon_url, sort_order) VALUES
('RPG Games', 'Role-playing games discussion', 'rpg-games', '/icons/rpg.png', 10),
('FPS Games', 'First-person shooter games discussion', 'fps-games', '/icons/fps.png', 11),
('Strategy Games', 'Strategy games discussion', 'strategy-games', '/icons/strategy.png', 12),
('Adventure Games', 'Adventure games discussion', 'adventure-games', '/icons/adventure.png', 13),
('Simulation Games', 'Simulation games discussion', 'simulation-games', '/icons/simulation.png', 14),
('Sports Games', 'Sports games discussion', 'sports-games', '/icons/sports.png', 15),
('Racing Games', 'Racing games discussion', 'racing-games', '/icons/racing.png', 16),
('Indie Games', 'Indie games discussion', 'indie-games', '/icons/indie.png', 17);