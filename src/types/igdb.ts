/**
 * IGDB API Type Definitions
 */

export interface IGDBGame {
  id: number;
  name: string;
  slug?: string;
  summary?: string;
  storyline?: string;
  first_release_date?: number;
  rating?: number;
  category?: number;
  parent_game?: number;
  url?: string;
  
  // Media
  cover?: {
    id: number;
    url: string;
  };
  screenshots?: Array<{
    id: number;
    url: string;
  }>;
  
  // Categories
  genres?: Array<{
    id: number;
    name: string;
  }>;
  platforms?: Array<{
    id: number;
    name: string;
  }>;
  
  // Companies
  involved_companies?: Array<{
    company: {
      id: number;
      name: string;
    };
    developer?: boolean;
    publisher?: boolean;
  }>;
  
  // Other
  alternative_names?: Array<{
    id: number;
    name: string;
  }>;
  collection?: {
    id: number;
    name: string;
  };
  franchise?: {
    id: number;
    name: string;
  };
  
  // Engagement metrics (now being used)
  total_rating?: number;        // Combined critic + user rating (0-100)
  rating_count?: number;        // Number of critic reviews
  follows?: number;             // Community following count  
  hypes?: number;               // Pre-release buzz count
  
  // Fields we DON'T use (excluded from queries)
  // total_rating_count?: number;
  // aggregated_rating?: number;
  // aggregated_rating_count?: number;
}

export interface IGDBSearchResponse {
  success: boolean;
  data?: IGDBGame[];
  error?: string;
}

export interface IGDBSearchFilters {
  limit?: number;
  genres?: string[];
  platforms?: string[];
  yearStart?: number;
  yearEnd?: number;
  minRating?: number;
}

export enum IGDBQueryLevel {
  MINIMAL = 'minimal',
  STANDARD = 'standard',
  FULL = 'full'
}

// IGDB field strings for different query levels
export const IGDB_FIELDS = {
  MINIMAL: 'id,name,cover.url',
  
  STANDARD: `
    id,
    name,
    slug,
    summary,
    cover.url,
    first_release_date,
    genres.name,
    platforms.name,
    involved_companies.company.name,
    involved_companies.developer,
    involved_companies.publisher
  `,
  
  FULL: `
    id,
    name,
    slug,
    summary,
    storyline,
    cover.url,
    first_release_date,
    genres.name,
    platforms.name,
    category,
    parent_game,
    involved_companies.company.name,
    involved_companies.developer,
    involved_companies.publisher,
    screenshots.url,
    url,
    alternative_names.name,
    collection.name,
    franchise.name
  `
};

// Category enum from IGDB
export enum IGDBCategory {
  MAIN_GAME = 0,
  DLC_ADDON = 1,
  EXPANSION = 2,
  BUNDLE = 3,
  STANDALONE_EXPANSION = 4,
  MOD = 5,
  EPISODE = 6,
  SEASON = 7,
  REMAKE = 8,
  REMASTER = 9,
  EXPANDED_GAME = 10,
  PORT = 11,
  FORK = 12,
  PACK = 13,
  UPDATE = 14
}