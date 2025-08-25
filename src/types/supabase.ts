// TypeScript types for Supabase database schema
export interface Database {
  public: {
    Tables: {
      user: {
        Row: {
          id: number;
          provider: string;
          provider_id: string;
          email: string;
          name: string;
          avatar_url: string | null;
        };
        Insert: {
          id?: number;
          provider: string;
          provider_id: string;
          email: string;
          name: string;
          avatar_url?: string | null;
        };
        Update: {
          id?: number;
          provider?: string;
          provider_id?: string;
          email?: string;
          name?: string;
          avatar_url?: string | null;
        };
      };
      platform: {
        Row: {
          id: number;
          name: string;
        };
        Insert: {
          id?: number;
          name: string;
        };
        Update: {
          id?: number;
          name?: string;
        };
      };
      game: {
        Row: {
          id: number;
          game_id: string;
          name: string;
          release_date: string | null;
          description: string | null;
          pic_url: string | null;
          dev: string | null;
          publisher: string | null;
          igdb_link: string | null;
          genre: string | null;
        };
        Insert: {
          id?: number;
          game_id: string;
          name: string;
          release_date?: string | null;
          description?: string | null;
          pic_url?: string | null;
          dev?: string | null;
          publisher?: string | null;
          igdb_link?: string | null;
          genre?: string | null;
        };
        Update: {
          id?: number;
          game_id?: string;
          name?: string;
          release_date?: string | null;
          description?: string | null;
          pic_url?: string | null;
          dev?: string | null;
          publisher?: string | null;
          igdb_link?: string | null;
          genre?: string | null;
        };
      };
      platform_games: {
        Row: {
          id: number;
          game_id: number;
          plat_id: number;
        };
        Insert: {
          id?: number;
          game_id: number;
          plat_id: number;
        };
        Update: {
          id?: number;
          game_id?: number;
          plat_id?: number;
        };
      };
      rating: {
        Row: {
          id: number;
          user_id: number;
          game_id: number;
          rating: number;
          post_date_time: string;
          review: string | null;
          finished: boolean;
        };
        Insert: {
          id?: number;
          user_id: number;
          game_id: number;
          rating: number;
          post_date_time?: string;
          review?: string | null;
          finished?: boolean;
        };
        Update: {
          id?: number;
          user_id?: number;
          game_id?: number;
          rating?: number;
          post_date_time?: string;
          review?: string | null;
          finished?: boolean;
        };
      };
      comment: {
        Row: {
          id: number;
          user_id: number;
          content: string;
        };
        Insert: {
          id?: number;
          user_id: number;
          content: string;
        };
        Update: {
          id?: number;
          user_id?: number;
          content?: string;
        };
      };
      comment_like: {
        Row: {
          id: number;
          user_id: number;
          game_id: number;
          liked_or_dislike: boolean;
        };
        Insert: {
          id?: number;
          user_id: number;
          game_id: number;
          liked_or_dislike: boolean;
        };
        Update: {
          id?: number;
          user_id?: number;
          game_id?: number;
          liked_or_dislike?: boolean;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// Extended types for application use
export type User = Database['public']['Tables']['user']['Row'];
export type Game = Database['public']['Tables']['game']['Row'];
export type Rating = Database['public']['Tables']['rating']['Row'];
export type Platform = Database['public']['Tables']['platform']['Row'];
export type PlatformGame = Database['public']['Tables']['platform_games']['Row'];
export type Comment = Database['public']['Tables']['comment']['Row'];
export type CommentLike = Database['public']['Tables']['comment_like']['Row'];

// Extended types with relationships
export interface GameWithPlatforms extends Game {
  platform_games?: {
    platform: Platform;
  }[];
}

export interface GameWithRatings extends GameWithPlatforms {
  ratings?: Rating[];
  averageRating?: number;
  totalRatings?: number;
}

export interface RatingWithUser extends Rating {
  user?: User;
}

export interface RatingWithGame extends Rating {
  game?: Game;
}

export interface RatingWithBoth extends Rating {
  user?: User;
  game?: Game;
}

export interface UserWithStats extends User {
  totalRatings?: number;
  averageRating?: number;
  completedGames?: number;
}