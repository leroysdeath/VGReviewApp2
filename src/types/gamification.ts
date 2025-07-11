// Gamification system types

export interface UserLevel {
  id: number;
  user_id: number;
  level: number;
  xp: number;
  xp_to_next_level: number;
  created_at: string;
  updated_at: string;
}

export interface Achievement {
  id: number;
  name: string;
  description: string;
  category: AchievementCategory;
  icon_url: string | null;
  badge_color: string;
  xp_reward: number;
  requirement_count: number | null;
  requirement_type: string | null;
  is_secret: boolean;
  is_limited_time: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

export interface UserAchievement {
  id: number;
  user_id: number;
  achievement_id: number;
  progress: number;
  is_completed: boolean;
  completed_at: string | null;
  is_showcased: boolean;
  created_at: string;
  updated_at: string;
  achievement?: Achievement;
}

export interface Challenge {
  id: number;
  name: string;
  description: string;
  challenge_type: ChallengeType;
  category: ChallengeCategory;
  icon_url: string | null;
  xp_reward: number;
  requirement_count: number;
  requirement_type: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
}

export interface UserChallenge {
  id: number;
  user_id: number;
  challenge_id: number;
  progress: number;
  is_completed: boolean;
  completed_at: string | null;
  reward_claimed: boolean;
  created_at: string;
  updated_at: string;
  challenge?: Challenge;
}

export interface Leaderboard {
  id: number;
  name: string;
  description: string | null;
  leaderboard_type: LeaderboardType;
  reset_frequency: ResetFrequency;
  is_active: boolean;
  created_at: string;
}

export interface LeaderboardEntry {
  id: number;
  leaderboard_id: number;
  user_id: number;
  score: number;
  rank: number | null;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
  updated_at: string;
  user?: {
    id: number;
    name: string;
    picurl: string | null;
  };
}

export interface UserStreak {
  id: number;
  user_id: number;
  streak_type: StreakType;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Reward {
  id: number;
  name: string;
  description: string;
  reward_type: RewardType;
  icon_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface UserReward {
  id: number;
  user_id: number;
  reward_id: number;
  is_active: boolean;
  earned_at: string;
  expires_at: string | null;
  created_at: string;
  reward?: Reward;
}

// Enums
export type AchievementCategory = 
  | 'review'
  | 'rating'
  | 'community'
  | 'discovery'
  | 'consistency'
  | 'genre'
  | 'social'
  | 'event';

export type ChallengeType = 
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'special';

export type ChallengeCategory = 
  | 'review'
  | 'rating'
  | 'community'
  | 'discovery'
  | 'login'
  | 'genre'
  | 'social'
  | 'event';

export type LeaderboardType = 
  | 'most_reviews'
  | 'highest_rated_reviewer'
  | 'most_helpful'
  | 'most_active'
  | 'genre_expert'
  | 'discovery_leader'
  | 'streak_leader';

export type ResetFrequency = 
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'never';

export type StreakType = 
  | 'login'
  | 'review'
  | 'rating'
  | 'comment';

export type RewardType = 
  | 'badge'
  | 'profile_theme'
  | 'profile_banner'
  | 'profile_title'
  | 'special_access'
  | 'feature_unlock';

// Extended types for UI components
export interface AchievementWithProgress extends Achievement {
  progress: number;
  is_completed: boolean;
  completed_at: string | null;
  is_showcased: boolean;
}

export interface ChallengeWithProgress extends Challenge {
  progress: number;
  is_completed: boolean;
  completed_at: string | null;
  reward_claimed: boolean;
  timeRemaining?: string;
  percentComplete?: number;
}

export interface LeaderboardWithEntries extends Leaderboard {
  entries: LeaderboardEntry[];
  userRank?: number;
  userScore?: number;
}

// Notification types for achievements
export interface AchievementNotification {
  type: 'achievement';
  achievement: Achievement;
  xpGained: number;
}

export interface LevelUpNotification {
  type: 'level_up';
  newLevel: number;
  xpGained: number;
}

export interface ChallengeNotification {
  type: 'challenge';
  challenge: Challenge;
  xpGained: number;
}

export type GamificationNotification = 
  | AchievementNotification
  | LevelUpNotification
  | ChallengeNotification;