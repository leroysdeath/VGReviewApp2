// Database model types based on the provided schema

export interface User {
  id: number;
  provider: string;
  provider_id: string;
  email: string;
  name: string;
  username?: string;
  avatar_url?: string;
  display_name?: string;
  bio?: string;
  location?: string;
  website?: string;
  platform?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Platform {
  id: number;
  name: string;
}

export interface Game {
  id: number;
  igdb_id: number;
  name: string;
  slug?: string;
  summary?: string;
  release_date?: string;
  cover_url?: string;
  genres?: string[];
  platforms?: string[];
  screenshots?: string[];
  videos?: string[];
  developer?: string;
  publisher?: string;
  igdb_rating?: number;
  category?: number;
  // New IGDB metrics columns
  total_rating?: number;     // Combined critic + user rating (0-100)
  rating_count?: number;     // Number of critic reviews
  follows?: number;          // Community following count
  hypes?: number;            // Pre-release buzz count
  popularity_score?: number; // Calculated popularity metric
  // Manual flagging system
  greenlight_flag?: boolean; // Admin override: game should never be filtered (true = always show)
  redlight_flag?: boolean;   // Admin override: game should always be filtered (true = always hide)
  flag_reason?: string;      // Reason for manual flagging
  flagged_at?: string;       // When the flag was set
  flagged_by?: string;       // User ID who set the flag
  created_at: string;
  updated_at: string;
}

export interface PlatformGame {
  id: number;
  game_id: number;
  plat_id: number;
}

export interface Rating {
  id: number;
  user_id: number;
  game_id: number;
  rating: number; // DECIMAL(3,1) - 1.0 to 10.0
  post_date_time: Date;
  review?: string;
  finished: boolean;
  user?: User; // Joined user data
  game?: Game; // Joined game data
}

export interface Comment {
  id: number;
  user_id: number;
  content: string;
  user?: User; // Joined user data
}

export interface CommentLike {
  id: number;
  user_id: number;
  game_id: number;
  liked_or_dislike: boolean; // true for like, false for dislike
}

// Extended types for UI components with calculated fields
export interface GameWithCalculatedFields extends Game {
  averageUserRating: number;
  totalUserRatings: number;
  userRating?: number; // Current user's rating if exists
  fromIGDB?: boolean; // True if this came from IGDB API, false/undefined if from database
  _sisterGameBoost?: number; // Sister game boost score for search results
  _priorityBoost?: number; // Priority boost score for search results
  _sisterGameRelationship?: string; // Relationship type for sister games
}

export interface GameWithRatings extends Game {
  averageRating?: number;
  totalRatings?: number;
  userRating?: Rating;
  recentRatings?: Rating[];
}

export interface UserProfile extends User {
  totalRatings?: number;
  averageRating?: number;
  recentActivity?: Rating[];
  followersCount?: number;
  followingCount?: number;
}

// API response types
export interface GameSearchResult {
  games: GameWithRatings[];
  total: number;
  page: number;
  limit: number;
}

export interface UserSearchResult {
  users: UserProfile[];
  total: number;
  page: number;
  limit: number;
}

// Form types
export interface CreateRatingRequest {
  game_id: number;
  rating: number;
  review?: string;
  finished: boolean;
  completion_status?: string; // Optional completion status override
}

export interface UpdateRatingRequest extends Partial<CreateRatingRequest> {
  id: number;
}

// Rating distribution type for analytics
export interface RatingDistribution {
  rating: number;
  count: number;
  percentage: number;
}

export interface CreateGameRequest {
  igdb_id: number;
  name: string;
  summary?: string;
  release_date?: string;
  cover_url?: string;
  genres?: string[];
  platforms?: string[];
  screenshots?: string[];
  videos?: string[];
}

// Constants for platforms (matching the database inserts)
export const PLATFORMS = [
  'PC',
  'Mac',
  'PlayStation 5',
  'PlayStation 4',
  'PlayStation 3',
  'PlayStation 2',
  'PlayStation 1',
  'PlayStation Portable',
  'PlayStation Vita',
  'Xbox Series X/S',
  'Xbox One',
  'Xbox 360',
  'Xbox',
  'Nintendo Switch',
  'Nintendo 3DS',
  'Nintendo DS',
  'Nintendo Wii U',
  'Nintendo Wii',
  'Nintendo GameCube',
  'Nintendo 64',
  'Super Nintendo',
  'Nintendo Entertainment System',
  'Game Boy Advance',
  'Game Boy Color',
  'Game Boy',
  'Sega Genesis',
  'Sega Dreamcast',
  'Sega Saturn',
  'Sega Game Gear',
  'Atari 2600',
  'Atari 7800',
  'Neo Geo',
  'TurboGrafx-16',
  '3DO',
  'Jaguar',
  'Steam Deck',
  'Mobile (iOS)',
  'Mobile (Android)',
  'Arcade',
  'Virtual Reality',
  'Retro Handheld'
] as const;

export type PlatformName = typeof PLATFORMS[number];