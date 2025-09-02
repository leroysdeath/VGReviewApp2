# Database Architecture Patterns

## Overview

This document explains the intentional design patterns used throughout the database where similar-named tables/views serve complementary, not redundant, purposes.

## Core Pattern: Separation of Concerns

The database follows a consistent pattern of separating:
- **Storage** (tables) from **Display** (views)
- **Raw data** (IDs) from **Enriched data** (names, counts)
- **Real-time** (views) from **Cached** (materialized views)

---

## 1. Rating System Pattern

### Tables/Views:
- `rating` (TABLE)
- `rating_with_counts` (VIEW)

### Purpose & Relationship:
```sql
rating (TABLE) 
    ↓ enhanced with calculated fields
rating_with_counts (VIEW)
    + calculated_like_count (from content_like table)
    + calculated_comment_count (from comment table)
```

### Why Both Exist:
- **`rating`**: Stores core review data (review text, rating score, user_id)
- **`rating_with_counts`**: Provides real-time counts without triggers
  - Calculates like/comment counts on-the-fly
  - Avoids trigger complexity and "relation not found" errors
  - Matches the proven comment pattern

### Usage:
- **Inserts/Updates**: Use `rating` table directly
- **Display**: Use `rating_with_counts` view for UI that needs counts

---

## 2. Activity Feed Pattern

### Tables/Views:
- `activity_feed` (VIEW)
- `activity_feed_materialized` (MATERIALIZED VIEW)

### Purpose & Relationship:
```sql
[rating, comment, user_follow, content_like, game_progress] tables
    ↓ combined via UNION ALL
activity_feed (VIEW) - raw activity events with IDs
    ↓ enriched with JOINs
activity_feed_materialized (MATERIALIZED VIEW)
    + user names, avatars
    + game names, covers
    + pre-joined and cached
```

### Why Both Exist:
- **`activity_feed`**: Combines events from 5 tables into unified stream
  - Real-time but only contains IDs
  - Defines the "what happened" logic
- **`activity_feed_materialized`**: Pre-computed with full details
  - Cached for homepage/popular feeds (fast)
  - Includes all display names and images
  - Refreshed periodically

### Usage:
- **Homepage/Popular**: Use materialized view (fast, pre-joined)
- **User-specific feeds**: Query base tables for real-time updates
- **Logic changes**: Modify base view, then refresh materialized

---

## 3. Game State History Pattern

### Tables/Views:
- `game_state_history` (TABLE)
- `user_game_state_timeline` (VIEW)

### Purpose & Relationship:
```sql
game_state_history (TABLE)
    ↓ enhanced with readable names
user_game_state_timeline (VIEW)
    + username (from user table)
    + game_name (from game table)
    + sorted by created_at DESC
```

### Why Both Exist:
- **`game_state_history`**: Efficiently stores state transitions
  - Records when users change game status (playing → completed)
  - Uses IDs for storage efficiency
  - Fast inserts without JOIN overhead
- **`user_game_state_timeline`**: Human-readable timeline
  - Adds usernames and game names for display
  - Pre-sorted for timeline views
  - No data duplication

### Usage:
- **State changes**: Insert into `game_state_history`
- **Display timeline**: Query `user_game_state_timeline`

---

## Benefits of These Patterns

### 1. **Performance Optimization**
- Tables store minimal data (IDs) for fast writes
- Views provide rich data for reads without storage overhead
- Materialized views cache expensive JOINs

### 2. **Maintainability**
- Logic separated from storage
- Can modify views without data migration
- Clear separation of concerns

### 3. **Flexibility**
- Can add new calculated fields to views anytime
- Can create specialized views for different use cases
- Can add materialized views if performance requires

### 4. **Consistency**
- Same patterns used throughout database
- Predictable naming conventions
- Easy to understand for new developers

---

## Anti-Pattern Avoided: Trigger Complexity

### What We DON'T Do:
```sql
-- AVOIDED: Complex triggers to maintain counts
CREATE TRIGGER update_counts 
AFTER INSERT ON content_like
UPDATE rating SET like_count = like_count + 1;  -- Can fail with "relation not found"
```

### What We DO Instead:
```sql
-- PREFERRED: Calculate counts in views
CREATE VIEW rating_with_counts AS
SELECT *, 
  (SELECT COUNT(*) FROM content_like WHERE rating_id = r.id) as calculated_like_count
FROM rating r;
```

---

## Guidelines for New Features

When adding new features, follow these patterns:

### For New Entity Storage:
1. Create a **TABLE** with minimal fields (IDs, essential data)
2. Create a **VIEW** with JOINed display names
3. Add **MATERIALIZED VIEW** only if performance requires

### For Counts/Aggregations:
1. Calculate in **VIEW** dynamically (preferred)
2. Avoid triggers unless absolutely necessary
3. Use **MATERIALIZED VIEW** for expensive aggregations

### Naming Conventions:
- `entity` - Base table
- `entity_with_[feature]` - Enhanced view
- `entity_timeline` - Time-ordered view
- `entity_materialized` - Cached version

---

## Conclusion

These "similar" tables are **not redundant** but rather **complementary components** of a well-designed system. Each serves a specific purpose in the storage-vs-display, real-time-vs-cached spectrum.

The consistency of these patterns across the database makes the system:
- Predictable
- Maintainable  
- Performant
- Scalable

This architecture avoids common pitfalls like trigger complexity while providing flexibility for both real-time and cached access patterns.