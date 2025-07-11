// Social features types

export interface UserFriend {
  id: number;
  user_id: number;
  friend_id: number;
  status: 'pending' | 'accepted' | 'rejected' | 'blocked';
  is_following: boolean;
  created_at: string;
  updated_at: string;
  friend?: {
    id: number;
    name: string;
    picurl?: string;
  };
}

export interface PrivateMessage {
  id: number;
  sender_id: number;
  recipient_id: number;
  content: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
  sender?: {
    id: number;
    name: string;
    picurl?: string;
  };
  recipient?: {
    id: number;
    name: string;
    picurl?: string;
  };
}

export interface ForumCategory {
  id: number;
  name: string;
  description?: string;
  slug: string;
  icon_url?: string;
  parent_id?: number;
  is_game_specific: boolean;
  game_id?: number;
  sort_order: number;
  created_at: string;
  created_by?: number;
  thread_count?: number;
  post_count?: number;
  last_post?: ForumPost;
}

export interface ForumThread {
  id: number;
  title: string;
  slug: string;
  category_id: number;
  user_id: number;
  is_pinned: boolean;
  is_locked: boolean;
  view_count: number;
  last_post_at: string;
  created_at: string;
  updated_at: string;
  user?: {
    id: number;
    name: string;
    picurl?: string;
  };
  category?: ForumCategory;
  post_count?: number;
  last_post?: ForumPost;
}

export interface ForumPost {
  id: number;
  thread_id: number;
  user_id: number;
  content: string;
  is_edited: boolean;
  edited_at?: string;
  created_at: string;
  updated_at: string;
  user?: {
    id: number;
    name: string;
    picurl?: string;
  };
  thread?: ForumThread;
  likes?: number;
}

export interface UserGroup {
  id: number;
  name: string;
  description?: string;
  slug: string;
  icon_url?: string;
  banner_url?: string;
  is_private: boolean;
  owner_id: number;
  created_at: string;
  updated_at: string;
  owner?: {
    id: number;
    name: string;
    picurl?: string;
  };
  member_count?: number;
}

export interface GroupMember {
  id: number;
  group_id: number;
  user_id: number;
  role: 'owner' | 'admin' | 'moderator' | 'member';
  joined_at: string;
  user?: {
    id: number;
    name: string;
    picurl?: string;
  };
}

export interface UserContent {
  id: number;
  user_id: number;
  game_id?: number;
  content_type: 'screenshot' | 'video' | 'clip' | 'art' | 'other';
  title?: string;
  description?: string;
  content_url: string;
  thumbnail_url?: string;
  is_public: boolean;
  view_count: number;
  like_count: number;
  created_at: string;
  updated_at: string;
  user?: {
    id: number;
    name: string;
    picurl?: string;
  };
  game?: {
    id: number;
    name: string;
    pic_url?: string;
  };
}

export interface CommunityEvent {
  id: number;
  title: string;
  description?: string;
  game_id?: number;
  start_time: string;
  end_time?: string;
  max_participants?: number;
  location?: string;
  organizer_id: number;
  group_id?: number;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  organizer?: {
    id: number;
    name: string;
    picurl?: string;
  };
  game?: {
    id: number;
    name: string;
    pic_url?: string;
  };
  group?: UserGroup;
  participant_count?: number;
}

export interface EventParticipant {
  id: number;
  event_id: number;
  user_id: number;
  status: 'going' | 'maybe' | 'invited' | 'declined';
  joined_at: string;
  user?: {
    id: number;
    name: string;
    picurl?: string;
  };
}

export interface CommunityPoll {
  id: number;
  title: string;
  description?: string;
  user_id: number;
  group_id?: number;
  thread_id?: number;
  is_multiple_choice: boolean;
  is_public: boolean;
  closes_at?: string;
  created_at: string;
  updated_at: string;
  user?: {
    id: number;
    name: string;
    picurl?: string;
  };
  options?: PollOption[];
  vote_count?: number;
  user_vote?: PollVote;
}

export interface PollOption {
  id: number;
  poll_id: number;
  option_text: string;
  sort_order: number;
  created_at: string;
  vote_count?: number;
  percentage?: number;
}

export interface PollVote {
  id: number;
  poll_id: number;
  option_id: number;
  user_id: number;
  created_at: string;
}

export interface ContentCreator {
  id: number;
  user_id: number;
  is_verified: boolean;
  verification_date?: string;
  creator_type?: string;
  platform_links?: Record<string, string>;
  created_at: string;
  updated_at: string;
  user?: {
    id: number;
    name: string;
    picurl?: string;
  };
}

export interface UserMention {
  id: number;
  mentioned_user_id: number;
  mentioned_by_id: number;
  content_type: 'post' | 'comment' | 'review' | 'message';
  content_id: number;
  is_read: boolean;
  created_at: string;
  mentioned_by?: {
    id: number;
    name: string;
    picurl?: string;
  };
}

export interface ContentLike {
  id: number;
  user_id: number;
  content_type: 'post' | 'comment' | 'review' | 'user_content';
  content_id: number;
  created_at: string;
  user?: {
    id: number;
    name: string;
    picurl?: string;
  };
}

export interface ContentShare {
  id: number;
  user_id: number;
  content_type: 'post' | 'thread' | 'review' | 'user_content';
  content_id: number;
  share_platform?: string;
  created_at: string;
  user?: {
    id: number;
    name: string;
    picurl?: string;
  };
}

// Extended types for UI components
export interface FriendWithStatus extends UserFriend {
  friend: {
    id: number;
    name: string;
    picurl?: string;
  };
  mutualFriends?: number;
  lastActive?: string;
}

export interface MessageThread {
  user: {
    id: number;
    name: string;
    picurl?: string;
  };
  lastMessage: PrivateMessage;
  unreadCount: number;
}

export interface ForumCategoryWithStats extends ForumCategory {
  thread_count: number;
  post_count: number;
  last_post?: {
    id: number;
    thread_title: string;
    user_name: string;
    created_at: string;
  };
}

export interface ForumThreadWithStats extends ForumThread {
  post_count: number;
  last_post: {
    id: number;
    user_name: string;
    created_at: string;
  };
}

export interface UserContentWithStats extends UserContent {
  comments: number;
  likes: number;
  shares: number;
  isLiked: boolean;
}

export interface CommunityEventWithParticipants extends CommunityEvent {
  participants: EventParticipant[];
  isParticipating: boolean;
  isFull: boolean;
  timeUntilStart: string;
}

export interface CommunityPollWithResults extends CommunityPoll {
  options: (PollOption & { percentage: number; vote_count: number })[];
  total_votes: number;
  user_has_voted: boolean;
  is_closed: boolean;
  time_remaining?: string;
}

export interface ContentCreatorWithStats extends ContentCreator {
  follower_count: number;
  content_count: number;
  average_rating: number;
}