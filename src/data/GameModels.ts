// src/types/game.ts

export interface GameModel {
  // Primary key
  id: number;
  
  // Required fields
  game_id: string; // character varying(255) not null
  name: string; // character varying(500) not null
  
  // Optional fields
  igdb_id?: number | null;
  slug?: string | null; // character varying(500)
  release_date?: string | null; // date (ISO string format)
  description?: string | null; // text
  summary?: string | null; // text
  pic_url?: string | null; // text
  cover_url?: string | null; // text
  screenshots?: string[] | null; // text[]
  developer?: string | null; // character varying(255)
  publisher?: string | null; // character varying(255)
  igdb_link?: string | null; // text
  genre?: string | null; // character varying(255)
  genres?: string[] | null; // text[]
  platforms?: string[] | null; // text[]
  igdb_rating?: number | null; // integer
  metacritic_score?: number | null; // integer
  esrb_rating?: string | null; // character varying(10)
  steam_id?: number | null; // integer
  gog_id?: string | null; // character varying(50)
  epic_id?: string | null; // character varying(50)
  is_verified?: boolean | null; // boolean, default false
  view_count?: number | null; // integer, default 0
  created_at?: string | null; // timestamp with time zone
  updated_at?: string | null; // timestamp with time zone
}

// For creating new games (omitting auto-generated fields)
export interface CreateGameData {
  game_id: string;
  name: string;
  igdb_id?: number | null;
  slug?: string | null;
  release_date?: string | null;
  description?: string | null;
  summary?: string | null;
  pic_url?: string | null;
  cover_url?: string | null;
  screenshots?: string[] | null;
  developer?: string | null;
  publisher?: string | null;
  igdb_link?: string | null;
  genre?: string | null;
  genres?: string[] | null;
  platforms?: string[] | null;
  igdb_rating?: number | null;
  metacritic_score?: number | null;
  esrb_rating?: string | null;
  steam_id?: number | null;
  gog_id?: string | null;
  epic_id?: string | null;
  is_verified?: boolean | null;
  view_count?: number | null;
}

// For updating games (all fields optional except id)
export interface UpdateGameData {
  id: number;
  game_id?: string;
  name?: string;
  igdb_id?: number | null;
  slug?: string | null;
  release_date?: string | null;
  description?: string | null;
  summary?: string | null;
  pic_url?: string | null;
  cover_url?: string | null;
  screenshots?: string[] | null;
  developer?: string | null;
  publisher?: string | null;
  igdb_link?: string | null;
  genre?: string | null;
  genres?: string[] | null;
  platforms?: string[] | null;
  igdb_rating?: number | null;
  metacritic_score?: number | null;
  esrb_rating?: string | null;
  steam_id?: number | null;
  gog_id?: string | null;
  epic_id?: string | null;
  is_verified?: boolean | null;
  view_count?: number | null;
}

// IGDB API response structure (for mapping)
export interface IGDBGameResponse {
  id: number;
  name: string;
  slug?: string;
  summary?: string;
  cover?: {
    id: number;
    url: string;
  };
  screenshots?: Array<{
    id: number;
    url: string;
  }>;
  genres?: Array<{
    id: number;
    name: string;
  }>;
  platforms?: Array<{
    id: number;
    name: string;
  }>;
  involved_companies?: Array<{
    company: {
      id: number;
      name: string;
    };
    publisher: boolean;
  }>;
  release_dates?: Array<{
    date: number; // Unix timestamp
    platform: number;
  }>;
  rating?: number;
  rating_count?: number;
  videos?: Array<{
    id: number;
    video_id: string;
  }>;
}

// Utility function to convert IGDB response to CreateGameData
export function mapIGDBToGameData(igdbGame: IGDBGameResponse, gameId: string): CreateGameData {
    console.log('Mapping IGDB game:', igdbGame);
  
    // Extract the first release date
  const firstReleaseDate = igdbGame.release_dates && igdbGame.release_dates.length > 0 
    ? new Date(igdbGame.release_dates[0].date * 1000).toISOString().split('T')[0]
    : null;
  
  // Extract cover URL with proper protocol
  const coverUrl = igdbGame.cover?.url ? `https:${igdbGame.cover.url}` : null;
  
  // Extract developer and publisher
  const developer = igdbGame.involved_companies?.find(c => !c.publisher)?.company?.name || null;
  const publisher = igdbGame.involved_companies?.find(c => c.publisher)?.company?.name || null;
  
  return {
    game_id: gameId,
    igdb_id: igdbGame.id,
    name: igdbGame.name,
    slug: igdbGame.slug || null,
    release_date: firstReleaseDate,
    summary: igdbGame.summary || null,
    cover_url: coverUrl,
    screenshots: igdbGame.screenshots ? igdbGame.screenshots.map(s => `https:${s.url}`) : null,
    developer,
    publisher,
    genres: igdbGame.genres ? igdbGame.genres.map(g => g.name) : null,
    platforms: igdbGame.platforms ? igdbGame.platforms.map(p => p.name) : null,
    igdb_rating: igdbGame.rating ? Math.round(igdbGame.rating) : null,
    is_verified: true, // Mark as verified since it comes from IGDB
    view_count: 0
  };
}

// Type guard to check if an object is a valid GameModel
export function isGameModel(obj: any): obj is GameModel {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'number' &&
    typeof obj.game_id === 'string' &&
    typeof obj.name === 'string'
  );
}

// Default values for optional fields
export const DEFAULT_GAME_VALUES: Partial<GameModel> = {
  is_verified: false,
  view_count: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};