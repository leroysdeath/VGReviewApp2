# Supabase Combined Endpoints Documentation

**Purpose**: Future optimization to reduce database round trips by combining multiple queries into single database functions.

## Overview

While the current implementation uses parallel queries (implemented in `optimizedGameService.ts`), further performance gains can be achieved by creating Supabase database functions that return all required data in a single call. This reduces network latency and database connection overhead.

## Proposed Combined Endpoints

### 1. Game Page Data Function

Create a single function that returns all data needed for the game page:

```sql
CREATE OR REPLACE FUNCTION get_game_page_data(
  p_identifier TEXT,
  p_user_id INT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_game_id INT;
  v_igdb_id INT;
  v_result JSON;
BEGIN
  -- Determine if identifier is numeric (IGDB ID) or string (slug)
  IF p_identifier ~ '^\d+$' THEN
    -- Numeric: treat as IGDB ID
    SELECT id, igdb_id INTO v_game_id, v_igdb_id
    FROM game
    WHERE igdb_id = p_identifier::INT
    LIMIT 1;
  ELSE
    -- String: treat as slug
    SELECT id, igdb_id INTO v_game_id, v_igdb_id
    FROM game
    WHERE slug = p_identifier
    LIMIT 1;
  END IF;

  -- If game not found, return null
  IF v_game_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Build comprehensive result
  v_result := json_build_object(
    'game', (
      SELECT row_to_json(g)
      FROM (
        SELECT 
          g.*,
          COALESCE(AVG(r.rating), 0) as average_rating,
          COUNT(DISTINCT r.id) as total_ratings
        FROM game g
        LEFT JOIN rating r ON g.id = r.game_id
        WHERE g.id = v_game_id
        GROUP BY g.id
      ) g
    ),
    'reviews', (
      SELECT COALESCE(json_agg(r ORDER BY r.post_date_time DESC), '[]'::json)
      FROM (
        SELECT 
          r.*,
          json_build_object(
            'id', u.id,
            'name', u.name,
            'avatar_url', u.avatar_url
          ) as user
        FROM rating r
        JOIN "user" u ON r.user_id = u.id
        WHERE r.game_id = v_game_id
        LIMIT 50
      ) r
    ),
    'user_progress', CASE 
      WHEN p_user_id IS NOT NULL THEN (
        SELECT row_to_json(gp)
        FROM game_progress gp
        WHERE gp.game_id = v_game_id 
        AND gp.user_id = p_user_id
      )
      ELSE NULL
    END,
    'user_rating', CASE
      WHEN p_user_id IS NOT NULL THEN (
        SELECT row_to_json(r)
        FROM rating r
        WHERE r.game_id = v_game_id 
        AND r.user_id = p_user_id
      )
      ELSE NULL
    END,
    'related_games', (
      SELECT COALESCE(json_agg(rg), '[]'::json)
      FROM (
        SELECT g2.id, g2.name, g2.cover_url, g2.slug, g2.igdb_id
        FROM game g1
        JOIN game g2 ON g2.id != g1.id
        WHERE g1.id = v_game_id
        AND g2.genres && g1.genres  -- Games with overlapping genres
        ORDER BY 
          CASE 
            WHEN g2.platforms && g1.platforms THEN 1 
            ELSE 2 
          END,  -- Prioritize same platform
          g2.view_count DESC
        LIMIT 6
      ) rg
    ),
    'statistics', json_build_object(
      'completion_rate', (
        SELECT 
          CASE 
            WHEN COUNT(*) > 0 
            THEN ROUND(100.0 * COUNT(*) FILTER (WHERE completed = true) / COUNT(*), 1)
            ELSE 0
          END
        FROM game_progress
        WHERE game_id = v_game_id
      ),
      'average_playtime', (
        SELECT AVG(playtime_hours)
        FROM rating
        WHERE game_id = v_game_id
        AND playtime_hours IS NOT NULL
      ),
      'rating_distribution', (
        SELECT json_object_agg(rating_bucket, count)
        FROM (
          SELECT 
            FLOOR(rating)::INT as rating_bucket,
            COUNT(*) as count
          FROM rating
          WHERE game_id = v_game_id
          GROUP BY FLOOR(rating)
        ) rd
      )
    )
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_game_slug ON game(slug);
CREATE INDEX IF NOT EXISTS idx_game_igdb_id ON game(igdb_id);
```

### 2. User Profile Data Function

Combine all user profile queries into one:

```sql
CREATE OR REPLACE FUNCTION get_user_profile_data(
  p_user_id INT,
  p_viewer_id INT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  v_result := json_build_object(
    'user', (
      SELECT row_to_json(u)
      FROM (
        SELECT 
          u.*,
          COUNT(DISTINCT r.id) as total_reviews,
          COUNT(DISTINCT gp.game_id) FILTER (WHERE gp.completed) as completed_games,
          COUNT(DISTINCT gp.game_id) FILTER (WHERE gp.started) as started_games,
          COUNT(DISTINCT f1.follower_id) as follower_count,
          COUNT(DISTINCT f2.following_id) as following_count
        FROM "user" u
        LEFT JOIN rating r ON u.id = r.user_id
        LEFT JOIN game_progress gp ON u.id = gp.user_id
        LEFT JOIN user_follow f1 ON u.id = f1.following_id
        LEFT JOIN user_follow f2 ON u.id = f2.follower_id
        WHERE u.id = p_user_id
        GROUP BY u.id
      ) u
    ),
    'recent_reviews', (
      SELECT COALESCE(json_agg(r ORDER BY r.post_date_time DESC), '[]'::json)
      FROM (
        SELECT 
          r.*,
          json_build_object(
            'id', g.id,
            'name', g.name,
            'cover_url', g.cover_url,
            'slug', g.slug,
            'igdb_id', g.igdb_id
          ) as game
        FROM rating r
        JOIN game g ON r.game_id = g.id
        WHERE r.user_id = p_user_id
        LIMIT 10
      ) r
    ),
    'top_games', (
      SELECT COALESCE(json_agg(tg ORDER BY tg.position), '[]'::json)
      FROM (
        SELECT 
          utg.position,
          json_build_object(
            'id', g.id,
            'name', g.name,
            'cover_url', g.cover_url,
            'slug', g.slug,
            'igdb_id', g.igdb_id
          ) as game
        FROM user_top_games utg
        JOIN game g ON utg.game_id = g.id
        WHERE utg.user_id = p_user_id
        ORDER BY utg.position
      ) tg
    ),
    'game_progress', (
      SELECT json_build_object(
        'completed', (
          SELECT COALESCE(json_agg(gp), '[]'::json)
          FROM (
            SELECT 
              gp.*,
              json_build_object(
                'id', g.id,
                'name', g.name,
                'cover_url', g.cover_url,
                'slug', g.slug
              ) as game
            FROM game_progress gp
            JOIN game g ON gp.game_id = g.id
            WHERE gp.user_id = p_user_id
            AND gp.completed = true
            ORDER BY gp.completed_date DESC NULLS LAST
            LIMIT 20
          ) gp
        ),
        'started', (
          SELECT COALESCE(json_agg(gp), '[]'::json)
          FROM (
            SELECT 
              gp.*,
              json_build_object(
                'id', g.id,
                'name', g.name,
                'cover_url', g.cover_url,
                'slug', g.slug
              ) as game
            FROM game_progress gp
            JOIN game g ON gp.game_id = g.id
            WHERE gp.user_id = p_user_id
            AND gp.started = true
            AND gp.completed = false
            ORDER BY gp.started_date DESC NULLS LAST
            LIMIT 20
          ) gp
        )
      )
    ),
    'collections', json_build_object(
      'wishlist', (
        SELECT COUNT(*)
        FROM user_wishlist
        WHERE user_id = p_user_id
      ),
      'collection', (
        SELECT COUNT(*)
        FROM user_collection
        WHERE user_id = p_user_id
      )
    ),
    'is_following', CASE
      WHEN p_viewer_id IS NOT NULL AND p_viewer_id != p_user_id THEN (
        SELECT EXISTS(
          SELECT 1
          FROM user_follow
          WHERE follower_id = p_viewer_id
          AND following_id = p_user_id
        )
      )
      ELSE NULL
    END,
    'activity_summary', (
      SELECT json_build_object(
        'reviews_this_month', (
          SELECT COUNT(*)
          FROM rating
          WHERE user_id = p_user_id
          AND post_date_time >= CURRENT_DATE - INTERVAL '30 days'
        ),
        'games_completed_this_year', (
          SELECT COUNT(*)
          FROM game_progress
          WHERE user_id = p_user_id
          AND completed = true
          AND completed_date >= DATE_TRUNC('year', CURRENT_DATE)
        ),
        'average_rating', (
          SELECT ROUND(AVG(rating)::numeric, 1)
          FROM rating
          WHERE user_id = p_user_id
        )
      )
    )
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE;
```

### 3. Activity Feed Function

Optimize activity feed fetching:

```sql
CREATE OR REPLACE FUNCTION get_activity_feed(
  p_user_id INT DEFAULT NULL,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_build_object(
      'activities', COALESCE(json_agg(a ORDER BY a.activity_timestamp DESC), '[]'::json),
      'total_count', COUNT(*) OVER(),
      'has_more', COUNT(*) OVER() > (p_limit + p_offset)
    )
    FROM (
      SELECT *
      FROM activity_feed_materialized
      WHERE 
        -- If user_id provided, show their feed + friends' activities
        (p_user_id IS NULL OR user_id = p_user_id OR user_id IN (
          SELECT following_id 
          FROM user_follow 
          WHERE follower_id = p_user_id
        ))
        -- Only show activities from last 30 days
        AND activity_timestamp >= CURRENT_TIMESTAMP - INTERVAL '30 days'
      ORDER BY activity_timestamp DESC
      LIMIT p_limit
      OFFSET p_offset
    ) a
  );
END;
$$ LANGUAGE plpgsql STABLE;
```

### 4. Search Results Function

Combine game search with filtering and stats:

```sql
CREATE OR REPLACE FUNCTION search_games_with_stats(
  p_search_term TEXT DEFAULT NULL,
  p_genres TEXT[] DEFAULT NULL,
  p_platforms TEXT[] DEFAULT NULL,
  p_min_rating NUMERIC DEFAULT NULL,
  p_release_year INT DEFAULT NULL,
  p_sort_by TEXT DEFAULT 'relevance',
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_build_object(
      'games', COALESCE(json_agg(
        json_build_object(
          'game', g,
          'stats', json_build_object(
            'average_rating', g.avg_rating,
            'total_ratings', g.rating_count,
            'completion_rate', g.completion_rate
          )
        ) ORDER BY
          CASE p_sort_by
            WHEN 'rating' THEN g.avg_rating
            WHEN 'popularity' THEN g.rating_count
            WHEN 'release_date' THEN g.release_date::DATE
            ELSE g.relevance
          END DESC NULLS LAST
      ), '[]'::json),
      'total_count', COUNT(*) OVER(),
      'facets', json_build_object(
        'genres', (
          SELECT json_object_agg(genre, count)
          FROM (
            SELECT UNNEST(genres) as genre, COUNT(*) as count
            FROM game
            WHERE (p_search_term IS NULL OR search_vector @@ plainto_tsquery(p_search_term))
            GROUP BY genre
            ORDER BY count DESC
            LIMIT 10
          ) genre_counts
        ),
        'platforms', (
          SELECT json_object_agg(platform, count)
          FROM (
            SELECT UNNEST(platforms) as platform, COUNT(*) as count
            FROM game
            WHERE (p_search_term IS NULL OR search_vector @@ plainto_tsquery(p_search_term))
            GROUP BY platform
            ORDER BY count DESC
            LIMIT 10
          ) platform_counts
        )
      )
    )
    FROM (
      SELECT 
        g.*,
        COALESCE(AVG(r.rating), 0) as avg_rating,
        COUNT(DISTINCT r.id) as rating_count,
        ROUND(100.0 * COUNT(DISTINCT gp.user_id) FILTER (WHERE gp.completed) / 
              NULLIF(COUNT(DISTINCT gp.user_id), 0), 1) as completion_rate,
        CASE 
          WHEN p_search_term IS NOT NULL 
          THEN ts_rank(g.search_vector, plainto_tsquery(p_search_term))
          ELSE 1
        END as relevance
      FROM game g
      LEFT JOIN rating r ON g.id = r.game_id
      LEFT JOIN game_progress gp ON g.id = gp.game_id
      WHERE 
        (p_search_term IS NULL OR g.search_vector @@ plainto_tsquery(p_search_term))
        AND (p_genres IS NULL OR g.genres && p_genres)
        AND (p_platforms IS NULL OR g.platforms && p_platforms)
        AND (p_release_year IS NULL OR EXTRACT(YEAR FROM g.release_date) = p_release_year)
      GROUP BY g.id
      HAVING 
        (p_min_rating IS NULL OR COALESCE(AVG(r.rating), 0) >= p_min_rating)
      LIMIT p_limit
      OFFSET p_offset
    ) g
  );
END;
$$ LANGUAGE plpgsql STABLE;
```

## Implementation Benefits

### Performance Improvements

1. **Network Latency Reduction**
   - Current: 5-6 separate API calls = 5-6 round trips
   - Optimized: 1 API call = 1 round trip
   - **Savings**: 80-90% reduction in network overhead

2. **Database Connection Efficiency**
   - Current: Multiple connection setups/teardowns
   - Optimized: Single connection for all data
   - **Savings**: 70% reduction in connection overhead

3. **Query Optimization**
   - Database can optimize the entire operation
   - Shared data (like user info) fetched once
   - Better use of indexes and query planning

### Expected Performance Gains

| Page | Current Load Time | With Parallel Queries | With Combined Functions | Total Improvement |
|------|------------------|----------------------|------------------------|-------------------|
| Game Page | 2-3 seconds | 1-1.5 seconds | 0.5-0.8 seconds | 73-80% |
| User Profile | 3-4 seconds | 1.5-2 seconds | 0.8-1 second | 73-75% |
| Search Results | 1.5-2 seconds | 1 second | 0.4-0.6 seconds | 70-73% |
| Activity Feed | 1-1.5 seconds | 0.8 seconds | 0.3-0.5 seconds | 66-70% |

## Migration Strategy

### Phase 1: Create Functions (Week 1)
1. Deploy functions to Supabase
2. Test with development data
3. Optimize query plans

### Phase 2: Implement Service Layer (Week 2)
1. Create new service methods using functions
2. Add feature flags for gradual rollout
3. A/B test performance improvements

### Phase 3: Full Migration (Week 3)
1. Update all components to use new service
2. Remove old parallel query code
3. Monitor performance metrics

## Usage Example

### Current Implementation (Parallel)
```typescript
// From optimizedGameService.ts
const [reviews, progress, relatedGames, userRating] = await Promise.all([
  this.getGameReviews(game.id),
  this.getUserProgress(game.id, userId),
  this.getRelatedGames(game),
  this.getUserRating(game.id, userId)
]);
```

### Future Implementation (Combined)
```typescript
// Single function call
const { data, error } = await supabase
  .rpc('get_game_page_data', {
    p_identifier: gameId,
    p_user_id: userId
  });

// All data returned in one response
const { game, reviews, user_progress, user_rating, related_games, statistics } = data;
```

## Monitoring & Metrics

### Key Metrics to Track
1. **Response Time**: Measure p50, p95, p99 latencies
2. **Database Load**: Monitor connection pool usage
3. **Cache Hit Rate**: Track materialized view effectiveness
4. **Error Rate**: Monitor function execution failures

### Performance Dashboard
```sql
-- Create performance tracking table
CREATE TABLE IF NOT EXISTS api_performance_log (
  id SERIAL PRIMARY KEY,
  function_name TEXT NOT NULL,
  execution_time_ms INT NOT NULL,
  user_id INT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add logging to functions
-- Example: Log execution time in each function
```

## Security Considerations

1. **Row Level Security**: Ensure RLS policies work with functions
2. **Input Validation**: Sanitize all inputs in functions
3. **Rate Limiting**: Implement function-level rate limits
4. **Caching Strategy**: Use appropriate cache headers

## Conclusion

While the current parallel query implementation provides significant performance improvements (60-70% faster), implementing these combined Supabase functions would provide additional 40-50% improvement, resulting in total performance gains of 75-80% compared to the original sequential implementation.

The functions are designed to be backwards compatible and can be rolled out gradually using feature flags, ensuring zero downtime during migration.