# IGDB API Field Mapping to Database

This document provides a comprehensive list of all fields we request from the IGDB API and how they map to our database columns.

## IGDB API Request Fields

Based on the IGDB API requests in `netlify/functions/igdb-search.cjs` (lines 130 & 145), we request the following fields:

```
fields name, summary, storyline, slug, first_release_date, rating, category, 
       cover.url, screenshots.url, genres.name, platforms.name, 
       involved_companies.company.name, involved_companies.developer, 
       involved_companies.publisher, alternative_names.name, 
       collection.name, franchise.name, franchises.name, parent_game, 
       url, dlcs, expansions, similar_games, hypes, follows, 
       total_rating, total_rating_count, rating_count;
```

## Field Mapping: IGDB → Database

| IGDB Field | Database Column | Data Type | Notes |
|------------|-----------------|-----------|-------|
| **Core Game Data** | | | |
| `id` | `igdb_id` | `integer` | IGDB's unique game ID |
| `name` | `name` | `varchar` | Game title |
| `slug` | `slug` | `varchar` | URL-friendly identifier (fallback: generated from name) |
| `summary` | `summary` | `text` | Short game description |
| `storyline` | `description` | `text` | Longer game description/story |
| `first_release_date` | `release_date` | `date` | Converted from Unix timestamp |
| `category` | `category` | `integer` | Game category (0=main, 1=dlc, etc.) |
| `parent_game` | `parent_game` | `integer` | ID of parent game (for DLCs) |
| **Visual Assets** | | | |
| `cover.url` | `cover_url` | `text` | Main cover image URL |
| `cover.url` | `pic_url` | `text` | Alternate/legacy cover storage |
| `screenshots.url` | `screenshots` | `text[]` | Array of screenshot URLs |
| **Classification** | | | |
| `genres.name` | `genres` | `text[]` | Array of genre names |
| `genres.name` | `genre` | `varchar` | Single primary genre (legacy) |
| `platforms.name` | `platforms` | `text[]` | Array of platform names |
| **Company Information** | | | |
| `involved_companies.company.name` (developer=true) | `developer` | `varchar` | Primary developer |
| `involved_companies.company.name` (publisher=true) | `publisher` | `varchar` | Primary publisher |
| **Franchise & Collection** | | | |
| `franchise.name` OR `franchises.name` | `franchise_name` | `varchar` | Game franchise |
| `collection.name` | `collection_name` | `varchar` | Game collection/series |
| `alternative_names.name` | `alternative_names` | `text[]` | Array of alternate titles |
| **Ratings** | | | |
| `rating` | `igdb_rating` | `integer` | IGDB critic rating |
| `total_rating` | `igdb_rating` | `integer` | Alternative rating field |
| **Relationships** | | | |
| `dlcs` | `dlc_ids` | `integer[]` | Array of DLC IGDB IDs |
| `expansions` | `expansion_ids` | `integer[]` | Array of expansion IGDB IDs |
| `similar_games` | `similar_game_ids` | `integer[]` | Array of similar game IGDB IDs |
| **Generated/Computed Fields** | | | |
| `url` | `igdb_link` | `text` | IGDB page URL |
| `id` (converted to string) | `game_id` | `varchar` | String version of IGDB ID |

## Fields NOT Currently Mapped

The following IGDB fields are requested but not directly stored:

- `hypes` - Social engagement metric
- `follows` - User follow count  
- `total_rating_count` - Number of ratings
- `rating_count` - Number of critic ratings

## Processing Logic

### Date Conversion
```javascript
// IGDB uses Unix timestamps, we convert to YYYY-MM-DD format
first_release_date: igdbGame.first_release_date
  ? new Date(igdbGame.first_release_date * 1000).toISOString().split('T')[0]
  : null
```

### Image URL Processing
```javascript
// Ensure HTTPS and proper image size
cover_url: game.cover?.url ? 
  (game.cover.url.startsWith('//') ? `https:${game.cover.url}` : game.cover.url)
    .replace('t_thumb', 't_cover_big') : null
```

### Company Data Extraction
```javascript
// Extract developer (first company marked as developer)
developer: igdbGame.involved_companies?.find(ic => ic.developer)?.company?.name || null

// Extract publisher (first company marked as publisher)  
publisher: igdbGame.involved_companies?.find(ic => ic.publisher)?.company?.name || null
```

### Slug Fallback
```javascript
// Use IGDB slug if available, otherwise generate from name
slug: igdbGame.slug || generateSlug(igdbGame.name || `game-${igdbGame.id}`)
```

## Database Columns NOT From IGDB

These columns are managed internally:

- `id` - Auto-increment primary key
- `is_verified` - Manual verification flag
- `view_count` - Page view counter
- `created_at` - Record creation timestamp
- `updated_at` - Last update timestamp
- `search_vector` - Full-text search index
- `metacritic_score` - From external sources
- `esrb_rating` - From external sources
- `steam_id` - From external mapping
- `gog_id` - From external mapping
- `epic_id` - From external mapping

## Service Implementation

The field mapping is implemented across multiple services:

- **`gameDataService.ts`** - Primary game creation from IGDB
- **`gameSyncService.ts`** - Bulk synchronization operations
- **`optimizedGameService.ts`** - Optimized game operations
- **`enhancedSearchService.ts`** - Search-specific game handling

All services use consistent mapping logic with fallbacks for missing IGDB data.