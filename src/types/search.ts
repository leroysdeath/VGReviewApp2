// Search and filter types
export interface GameSearchFilters {
  query: string;
  genres: string[];
  platforms: string[];
  ratingRange: [number, number];
  releaseYearRange: [number, number];
  sortBy: SortOption;
}

export type SortOption = '' | 'newest' | 'oldest' | 'highest_rated' | 'lowest_rated' | 'most_reviewed';

export interface SearchSuggestion {
  id: string;
  title: string;
  imageUrl?: string;
  type: 'game' | 'genre' | 'platform' | 'developer';
}

export interface SearchState {
  query: string;
  filters: GameSearchFilters;
  suggestions: SearchSuggestion[];
  isLoading: boolean;
  error: string | null;
  results: any[]; // Replace with your game type
  totalResults: number;
  activeFilters: string[];
}

// API response types
export interface SearchResponse {
  results: any[]; // Replace with your game type
  totalResults: number;
  page: number;
  pageSize: number;
}

// Filter options
export interface FilterOption {
  id: string;
  label: string;
  count?: number;
}

export interface GenreOption extends FilterOption {}
export interface PlatformOption extends FilterOption {}

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: '', label: '' },
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'highest_rated', label: 'Highest Rated' },
  { value: 'lowest_rated', label: 'Lowest Rated' },
  { value: 'most_reviewed', label: 'Most Reviewed' }
];

// Default filter values
export const DEFAULT_FILTERS: GameSearchFilters = {
  query: '',
  genres: [],
  platforms: [],
  ratingRange: [1, 10],
  releaseYearRange: [1977, new Date().getFullYear()],
  sortBy: ''
};

// Mock data for development
export const MOCK_GENRES: GenreOption[] = [
  { id: 'action', label: 'Action', count: 1245 },
  { id: 'adventure', label: 'Adventure', count: 867 },
  { id: 'rpg', label: 'RPG', count: 723 },
  { id: 'strategy', label: 'Strategy', count: 412 },
  { id: 'simulation', label: 'Simulation', count: 389 },
  { id: 'sports', label: 'Sports', count: 256 },
  { id: 'racing', label: 'Racing', count: 198 },
  { id: 'puzzle', label: 'Puzzle', count: 176 },
  { id: 'shooter', label: 'Shooter', count: 543 },
  { id: 'platformer', label: 'Platformer', count: 321 }
];

export const MOCK_PLATFORMS: PlatformOption[] = [
  { id: 'pc', label: 'PC', count: 2134 },
  { id: 'ps5', label: 'PlayStation 5', count: 543 },
  { id: 'ps4', label: 'PlayStation 4', count: 1245 },
  { id: 'xbox_series', label: 'Xbox Series X/S', count: 498 },
  { id: 'xbox_one', label: 'Xbox One', count: 987 },
  { id: 'switch', label: 'Nintendo Switch', count: 765 },
  { id: 'mobile', label: 'Mobile', count: 432 }
];