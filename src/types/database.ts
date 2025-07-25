// Database model types based on the provided schema

export interface User {
  id: number;
  provider: string;
  provider_id: string;
  email: string;
  name: string;
  picurl?: string;
}

export interface Platform {
  id: number;
  name: string;
}

export interface Game {
  id: number;
  game_id: string;
  name: string;
  release_date?: Date;
  description?: string;
  pic_url?: string;
  dev?: string;
  publisher?: string;
  igdb_link?: string;
  genre?: string;
  platforms?: Platform[]; // Joined from platform_games
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

// Extended types for UI components
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
}

export interface UpdateRatingRequest extends Partial<CreateRatingRequest> {
  id: number;
}

export interface CreateGameRequest {
  game_id: string;
  name: string;
  release_date?: string;
  description?: string;
  pic_url?: string;
  dev?: string;
  publisher?: string;
  igdb_link?: string;
  genre?: string;
  platform_ids?: number[];
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