/**
 * Search Configuration Constants
 */

// Database thresholds
export const MIN_RESULTS_THRESHOLD = 5;
export const MAX_DB_RESULTS = 50;
export const SEARCH_DEBOUNCE_MS = 300;

// IGDB API limits
export const IGDB_DEFAULT_LIMIT = 20;
export const IGDB_MAX_LIMIT = 100;
export const IGDB_RATE_LIMIT_MS = 250; // 4 requests per second

// Cache configuration
export const CACHE_TTL_SECONDS = 300; // 5 minutes
export const MAX_CACHE_SIZE = 100; // Maximum cached searches

// Preload configuration
export const PRELOAD_BATCH_SIZE = 20;
export const PRELOAD_DELAY_MS = 2000;
export const TRENDING_UPDATE_INTERVAL_MS = 3600000; // 1 hour

// Search patterns
export const COMMON_SEARCH_PREFIXES = [
  'the ',
  'a ',
  'an ',
] as const;

export const FRANCHISE_KEYWORDS = [
  'series',
  'franchise',
  'collection',
  'saga',
  'trilogy',
] as const;

// Popular search terms for analytics
export const SEARCH_ANALYTICS_BATCH_SIZE = 50;
export const SEARCH_HISTORY_MAX_SIZE = 100;

// Performance thresholds
export const SLOW_SEARCH_THRESHOLD_MS = 1000;
export const CRITICAL_SEARCH_THRESHOLD_MS = 3000;

// Retry configuration
export const MAX_RETRY_ATTEMPTS = 3;
export const RETRY_DELAY_BASE_MS = 1000;
export const RETRY_DELAY_MULTIPLIER = 2;

// Field optimization
export const DATABASE_SEARCH_FIELDS = [
  'id',
  'title',
  'description',
  'release_date',
  'genre',
  'platform',
  'developer',
  'publisher',
  'image_url',
  'background_image_url',
  'metacritic_score',
  'average_playtime',
  'igdb_id',
  'slug',
] as const;

// Search modes
export enum SearchMode {
  DATABASE_ONLY = 'database_only',
  IGDB_ONLY = 'igdb_only',
  HYBRID = 'hybrid',
  CACHED = 'cached',
}

// Search quality indicators
export enum SearchQuality {
  EXCELLENT = 'excellent', // < 500ms, all from DB
  GOOD = 'good',           // < 1s, mostly from DB
  ACCEPTABLE = 'acceptable', // < 2s, mixed sources
  SLOW = 'slow',           // < 3s, mostly IGDB
  CRITICAL = 'critical',   // > 3s, all IGDB
}

// Common game variations for deduplication
export const GAME_NAME_VARIATIONS: Record<string, string[]> = {
  'GTA': ['Grand Theft Auto', 'GTA'],
  'CoD': ['Call of Duty', 'COD', 'CallOfDuty'],
  'CS': ['Counter-Strike', 'CS:GO', 'CS2', 'Counter Strike'],
  'LoL': ['League of Legends', 'LoL', 'League'],
  'WoW': ['World of Warcraft', 'WoW', 'Warcraft'],
  'PUBG': ['PUBG', 'PlayerUnknowns Battlegrounds', 'Battlegrounds'],
  'R6': ['Rainbow Six', 'R6', 'Rainbow 6', 'Siege'],
  'FF': ['Final Fantasy', 'FF'],
  'MGS': ['Metal Gear Solid', 'MGS', 'Metal Gear'],
  'GoW': ['God of War', 'GoW'],
  'TLoU': ['The Last of Us', 'TLOU', 'Last of Us'],
  'BotW': ['Breath of the Wild', 'BotW', 'BOTW'],
  'TotK': ['Tears of the Kingdom', 'TotK', 'TOTK'],
};

// Search result scoring weights
export const RELEVANCE_WEIGHTS = {
  EXACT_MATCH: 100,
  STARTS_WITH: 80,
  CONTAINS: 60,
  FUZZY_MATCH: 40,
  FRANCHISE_MATCH: 30,
  YEAR_MATCH: 20,
  PLATFORM_MATCH: 10,
} as const;

// Database index hints
export const SEARCH_INDEX_COLUMNS = [
  'title',
  'slug',
  'igdb_id',
  'developer',
  'publisher',
] as const;

// Batch processing
export const SYNC_QUEUE_BATCH_SIZE = 50;
export const SYNC_QUEUE_PROCESS_INTERVAL_MS = 5000;
export const SYNC_QUEUE_MAX_RETRIES = 3;

// Error messages
export const SEARCH_ERROR_MESSAGES = {
  TIMEOUT: 'Search timed out. Please try again.',
  RATE_LIMIT: 'Too many searches. Please wait a moment.',
  NO_RESULTS: 'No games found. Try a different search term.',
  API_ERROR: 'Unable to search games. Please try again later.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
} as const;