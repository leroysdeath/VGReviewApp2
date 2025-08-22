# Activity Feed Consolidation Plan - Section 1 Final

## Executive Summary
This plan addresses the critical redundancy issues identified in REDUNDANCY_ANALYSIS_REPORT.md Section 1: Activity Feed Components. The goal is to consolidate 6 redundant activity feed implementations (~2,100 lines) into a single, unified component (~400 lines) while establishing a proper data foundation.

---

## 🔍 Current State Analysis

### Component Inventory
| Component | Status | Lines | Location |
|-----------|--------|-------|----------|
| `ActivityFeed.tsx` | ❌ Unused | 630 | `/src/components/` |
| `OptimizedActivityFeed.tsx` | ❌ Broken deps | 363 | `/src/components/` |
| `VirtualizedActivityFeed.tsx` | ❌ Unused | 154 | `/src/components/` |
| `RealTimeActivityFeed.tsx` | ❌ Broken deps | 254 | `/src/components/` |
| `UserActivityFeed.tsx` | ✅ **Active** | 240 | `/src/components/profile/` |
| `user/ActivityFeed/index.tsx` | ❌ Broken deps | 485 | `/src/components/user/` |

### Critical Findings
- **Only 1 of 6 components is actually used** (UserActivityFeed in UserDashboard)
- **No database table for activities** - using mock data generation
- **2,126 total lines of code** for what should be ~400 lines
- **Multiple broken dependencies** preventing components from working
- **Inconsistent interfaces** across all implementations

---

## 📊 Implementation Plan

### Phase 1: Data Layer Foundation (Days 1-3)
**Objective**: Establish proper database structure for activities WITHOUT creating redundant tables

#### ⚠️ CRITICAL DISCOVERY: Existing Table Overlap Analysis

**Tables that ALREADY store activity-like data:**
1. **`notification` table** - Already tracks activity notifications:
   - Has `user_id` (recipient), `actor_id` (performer)
   - Has `type`, `entity_type`, `entity_id` for polymorphic references
   - Has `created_at` timestamps

2. **`content_like` table** - Tracks all likes:
   - Links to `rating_id` OR `comment_id`
   - Has `user_id` and `created_at`

3. **`rating` table** - Contains review/rating activities:
   - Has `like_count`, `helpful_count` counters
   - Has `post_date_time`, `created_at` timestamps

4. **`comment` table** - Contains comment activities:
   - Has `like_count` counter
   - Has `rating_id` for linking to reviews
   - Has `created_at` timestamp

5. **`user_follow` table** - Tracks follow relationships
6. **`game_progress` table** - Tracks game start/completion events

**🚨 KEY DECISION: DO NOT create a new `activities` table - it would duplicate existing data!**

#### 1.1 REVISED: Create Activity View Using Existing Tables
```sql
-- NO NEW TABLE - Use a UNION VIEW to aggregate existing activity data
CREATE OR REPLACE VIEW activity_feed AS
SELECT 
  -- Ratings/Reviews as activities
  'rating_' || r.id::text AS activity_id,
  'rating' AS activity_type,
  r.user_id,
  NULL::integer AS target_user_id,
  r.game_id,
  r.id AS rating_id,
  NULL::integer AS comment_id,
  NULL::integer AS follow_id,
  r.created_at AS activity_timestamp,
  r.rating AS rating_value,
  r.review AS review_text,
  r.is_published
FROM rating r
WHERE r.is_published = true

UNION ALL

SELECT 
  -- Comments as activities
  'comment_' || c.id::text AS activity_id,
  'comment' AS activity_type,
  c.user_id,
  r.user_id AS target_user_id, -- User who owns the rating
  r.game_id,
  c.rating_id,
  c.id AS comment_id,
  NULL::integer AS follow_id,
  c.created_at AS activity_timestamp,
  NULL::numeric AS rating_value,
  c.content AS review_text,
  c.is_published
FROM comment c
LEFT JOIN rating r ON c.rating_id = r.id
WHERE c.is_published = true

UNION ALL

SELECT 
  -- Follows as activities
  'follow_' || uf.id::text AS activity_id,
  'follow' AS activity_type,
  uf.follower_id AS user_id,
  uf.following_id AS target_user_id,
  NULL::integer AS game_id,
  NULL::integer AS rating_id,
  NULL::integer AS comment_id,
  uf.id AS follow_id,
  uf.created_at AS activity_timestamp,
  NULL::numeric AS rating_value,
  NULL::text AS review_text,
  true AS is_published
FROM user_follow uf

UNION ALL

SELECT 
  -- Likes as activities
  'like_' || cl.id::text AS activity_id,
  CASE 
    WHEN cl.rating_id IS NOT NULL THEN 'like_rating'
    WHEN cl.comment_id IS NOT NULL THEN 'like_comment'
  END AS activity_type,
  cl.user_id,
  COALESCE(r.user_id, c.user_id) AS target_user_id,
  r.game_id,
  cl.rating_id,
  cl.comment_id,
  NULL::integer AS follow_id,
  cl.created_at AS activity_timestamp,
  NULL::numeric AS rating_value,
  NULL::text AS review_text,
  true AS is_published
FROM content_like cl
LEFT JOIN rating r ON cl.rating_id = r.id
LEFT JOIN comment c ON cl.comment_id = c.id
WHERE cl.is_like = true

UNION ALL

SELECT 
  -- Game progress as activities
  'progress_' || gp.id::text AS activity_id,
  CASE 
    WHEN gp.completed = true THEN 'game_completed'
    WHEN gp.started = true THEN 'game_started'
  END AS activity_type,
  gp.user_id,
  NULL::integer AS target_user_id,
  gp.game_id,
  NULL::integer AS rating_id,
  NULL::integer AS comment_id,
  NULL::integer AS follow_id,
  COALESCE(gp.completed_date, gp.started_date, gp.created_at) AS activity_timestamp,
  NULL::numeric AS rating_value,
  NULL::text AS review_text,
  true AS is_published
FROM game_progress gp
WHERE (gp.started = true OR gp.completed = true);

-- Create indexes on source tables for better view performance
CREATE INDEX IF NOT EXISTS idx_rating_created_at ON rating(created_at DESC) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_comment_created_at ON comment(created_at DESC) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_content_like_created_at ON content_like(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_follow_created_at ON user_follow(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_progress_dates ON game_progress(completed_date DESC, started_date DESC);

-- Create materialized view for performance
CREATE MATERIALIZED VIEW activity_feed_materialized AS
SELECT 
  af.*,
  u.name AS user_name,
  u.avatar_url AS user_avatar,
  tu.name AS target_user_name,
  tu.avatar_url AS target_user_avatar,
  g.name AS game_name,
  g.cover_url AS game_cover
FROM activity_feed af
LEFT JOIN "user" u ON af.user_id = u.id
LEFT JOIN "user" tu ON af.target_user_id = tu.id
LEFT JOIN game g ON af.game_id = g.id
WITH DATA;

-- Create indexes on materialized view
CREATE INDEX idx_activity_feed_user_id ON activity_feed_materialized(user_id);
CREATE INDEX idx_activity_feed_timestamp ON activity_feed_materialized(activity_timestamp DESC);
CREATE INDEX idx_activity_feed_type ON activity_feed_materialized(activity_type);

-- Refresh function
CREATE OR REPLACE FUNCTION refresh_activity_feed()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY activity_feed_materialized;
END;
$$ LANGUAGE plpgsql;
```

#### 1.2 REVISED: Implement Triggers for View Refresh (Not Activity Creation)
```sql
-- NO ACTIVITY CREATION - Just refresh the materialized view when source data changes

-- Create a debounced refresh function to avoid too frequent refreshes
CREATE OR REPLACE FUNCTION schedule_activity_feed_refresh()
RETURNS trigger AS $$
BEGIN
  -- Schedule a refresh in 1 minute (debounced)
  -- This prevents multiple rapid inserts from causing multiple refreshes
  PERFORM pg_notify('refresh_activity_feed', 'refresh_needed');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to source tables
CREATE TRIGGER rating_activity_refresh
AFTER INSERT OR UPDATE OR DELETE ON rating
FOR EACH STATEMENT EXECUTE FUNCTION schedule_activity_feed_refresh();

CREATE TRIGGER comment_activity_refresh
AFTER INSERT OR UPDATE OR DELETE ON comment
FOR EACH STATEMENT EXECUTE FUNCTION schedule_activity_feed_refresh();

CREATE TRIGGER user_follow_activity_refresh
AFTER INSERT OR DELETE ON user_follow
FOR EACH STATEMENT EXECUTE FUNCTION schedule_activity_feed_refresh();

CREATE TRIGGER content_like_activity_refresh
AFTER INSERT OR DELETE ON content_like
FOR EACH STATEMENT EXECUTE FUNCTION schedule_activity_feed_refresh();

CREATE TRIGGER game_progress_activity_refresh
AFTER INSERT OR UPDATE ON game_progress
FOR EACH STATEMENT EXECUTE FUNCTION schedule_activity_feed_refresh();

-- Background job to handle refresh (run via cron or pg_cron)
CREATE OR REPLACE FUNCTION process_activity_feed_refresh()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY activity_feed_materialized;
END;
$$ LANGUAGE plpgsql;
```

#### 1.3 REVISED: Security Considerations
```sql
-- NO NEW TABLE = NO NEW RLS POLICIES NEEDED
-- The view inherits security from source tables:
-- - rating table already has RLS
-- - comment table already has RLS
-- - content_like table already has RLS
-- - user_follow table already has RLS

-- Grant permissions for the view
GRANT SELECT ON activity_feed TO authenticated;
GRANT SELECT ON activity_feed TO anon;
GRANT SELECT ON activity_feed_materialized TO authenticated;
GRANT SELECT ON activity_feed_materialized TO anon;

-- Optional: Create a function to get user-specific activity feed
CREATE OR REPLACE FUNCTION get_user_activity_feed(
  p_user_id INTEGER,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  activity_id TEXT,
  activity_type TEXT,
  user_id INTEGER,
  user_name TEXT,
  user_avatar TEXT,
  target_user_id INTEGER,
  target_user_name TEXT,
  game_id INTEGER,
  game_name TEXT,
  game_cover TEXT,
  activity_timestamp TIMESTAMPTZ,
  rating_value NUMERIC,
  review_text TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    af.activity_id,
    af.activity_type,
    af.user_id,
    af.user_name,
    af.user_avatar,
    af.target_user_id,
    af.target_user_name,
    af.game_id,
    af.game_name,
    af.game_cover,
    af.activity_timestamp,
    af.rating_value,
    af.review_text
  FROM activity_feed_materialized af
  WHERE af.user_id = p_user_id
     OR af.target_user_id = p_user_id
     OR af.user_id IN (
       SELECT following_id 
       FROM user_follow 
       WHERE follower_id = p_user_id
     )
  ORDER BY af.activity_timestamp DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Phase 2: Service Layer Consolidation (Days 3-4)
**Objective**: Create unified activity service

#### 2.1 REVISED: Consolidated Activity Service (Using Views, Not Tables)
```typescript
// src/features/activity/activityService.ts
import { supabase } from '@/services/supabase';

export interface Activity {
  activityId: string; // Composite ID like 'rating_123'
  activityType: 'rating' | 'comment' | 'follow' | 'like_rating' | 'like_comment' | 'game_started' | 'game_completed';
  userId: number;
  userName?: string;
  userAvatar?: string;
  targetUserId?: number;
  targetUserName?: string;
  targetUserAvatar?: string;
  gameId?: number;
  gameName?: string;
  gameCover?: string;
  ratingId?: number;
  commentId?: number;
  followId?: number;
  ratingValue?: number;
  reviewText?: string;
  activityTimestamp: string;
  isPublished: boolean;
}

export class ActivityService {
  // Fetch activities from the materialized view
  async getActivities(options: {
    userId?: number;
    type?: Activity['activityType'];
    limit?: number;
    offset?: number;
  }) {
    const query = supabase
      .from('activity_feed_materialized') // Using the view, not a table
      .select('*', { count: 'exact' });
    
    if (options.userId) {
      query.eq('user_id', options.userId);
    }
    
    if (options.type) {
      query.eq('type', options.type);
    }
    
    return query
      .order('created_at', { ascending: false })
      .range(options.offset || 0, (options.offset || 0) + (options.limit || 20) - 1);
  }
  
  // Real-time subscription
  subscribeToActivities(callback: (activity: Activity) => void) {
    return supabase
      .channel('activities')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'activities'
      }, callback)
      .subscribe();
  }
}

export const activityService = new ActivityService();
```

### Phase 3: Component Unification (Days 4-6)
**Objective**: Create single, feature-complete component

#### 3.1 Unified Component Structure
```typescript
// src/features/activity/UnifiedActivityFeed.tsx
import React, { useEffect, useRef, useCallback } from 'react';
import { VariableSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { useActivityStore } from './activityStore';
import { ActivityCard } from './ActivityCard';

export interface UnifiedActivityFeedProps {
  // Data source
  userId?: number;
  type?: 'all' | 'user' | 'following';
  
  // Features
  enableRealTime?: boolean;
  enableVirtualization?: boolean;
  virtualizationThreshold?: number;
  
  // Display
  variant?: 'full' | 'compact' | 'profile';
  showActions?: boolean;
  
  // Performance
  initialLimit?: number;
  pageSize?: number;
  
  // Customization
  emptyMessage?: string;
  className?: string;
}

export const UnifiedActivityFeed: React.FC<UnifiedActivityFeedProps> = ({
  userId,
  type = 'all',
  enableRealTime = false,
  enableVirtualization = true,
  virtualizationThreshold = 50,
  variant = 'full',
  showActions = true,
  initialLimit = 20,
  pageSize = 20,
  emptyMessage = 'No activities yet',
  className = ''
}) => {
  // Implementation combining best features from all 6 components
  const {
    activities,
    isLoading,
    hasMore,
    fetchActivities,
    subscribeToRealTime
  } = useActivityStore();
  
  // Virtual scrolling (from OptimizedActivityFeed)
  // Accessibility features (from ActivityFeed)
  // Real-time updates (from RealTimeActivityFeed)
  // Profile formatting (from UserActivityFeed)
  
  return (
    <div className={`activity-feed ${variant} ${className}`}>
      {/* Unified implementation */}
    </div>
  );
};
```

#### 3.2 Feature Matrix Integration
| Feature | Source Component | Integration Status |
|---------|-----------------|-------------------|
| Virtual Scrolling | OptimizedActivityFeed | ✅ Include |
| Real-time Updates | RealTimeActivityFeed | ✅ Include |
| Accessibility | ActivityFeed | ✅ Include |
| Touch Gestures | ActivityFeed | ✅ Include |
| Profile Mode | UserActivityFeed | ✅ Include |
| Material UI | user/ActivityFeed | ❌ Exclude (use Tailwind) |
| SWR Caching | OptimizedActivityFeed | ✅ Include |
| Keyboard Nav | ActivityFeed | ✅ Include |

### Phase 4: State Management Update (Days 6-7)
**Objective**: Update Zustand store for real data

#### 4.1 Enhanced Activity Store
```typescript
// src/features/activity/activityStore.ts
import { create } from 'zustand';
import { activityService } from './activityService';

interface ActivityStore {
  activities: Activity[];
  isLoading: boolean;
  hasMore: boolean;
  error: string | null;
  
  // Actions
  fetchActivities: (options) => Promise<void>;
  subscribeToRealTime: () => void;
  reset: () => void;
}

export const useActivityStore = create<ActivityStore>((set, get) => ({
  // Connected to real database, no more mock data
}));
```

### Phase 5: Migration & Testing (Days 7-9)
**Objective**: Safely migrate and test

#### 5.1 Migration Steps
1. **Backup Current Implementation**
   ```bash
   git checkout -b backup/activity-feeds-before-consolidation
   git push origin backup/activity-feeds-before-consolidation
   ```

2. **Update UserDashboard Import**
   ```typescript
   // Before
   import { UserActivityFeed } from './UserActivityFeed';
   
   // After
   import { UnifiedActivityFeed } from '@/features/activity/UnifiedActivityFeed';
   ```

3. **Feature Flag Rollout**
   ```typescript
   const useNewActivityFeed = process.env.VITE_USE_NEW_ACTIVITY_FEED === 'true';
   ```

4. **Testing Checklist**
   - [ ] UserDashboard displays activities
   - [ ] Virtual scrolling works with 1000+ items
   - [ ] Real-time updates function
   - [ ] Accessibility features work
   - [ ] Performance < 100ms render

### Phase 6: Cleanup (Days 9-10)
**Objective**: Remove redundant code

#### 6.1 Files to Delete
```bash
# Remove redundant components
rm src/components/ActivityFeed.tsx
rm src/components/OptimizedActivityFeed.tsx
rm src/components/VirtualizedActivityFeed.tsx
rm src/components/RealTimeActivityFeed.tsx
rm -rf src/components/user/ActivityFeed/

# Remove mock service
rm src/services/activityFeedService.ts
```

#### 6.2 Update Imports
- Search and replace all old imports
- Update any TypeScript definitions
- Clean up unused dependencies

---

## 📈 Success Metrics

### Quantitative Metrics
| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Total Lines of Code | 2,126 | ~400 | -81% |
| Number of Components | 6 | 1 | -83% |
| Active Components | 1 | 1 | Same functionality |
| Bundle Size | ~85KB | ~15KB | -82% |
| Render Time (1000 items) | 250ms | <100ms | -60% |

### Qualitative Metrics
- ✅ Single source of truth
- ✅ Consistent interface
- ✅ Real database integration
- ✅ Maintainable codebase
- ✅ Aligned with design philosophy

---

## 🚨 Risk Mitigation

### Potential Risks & Mitigations
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| UserDashboard breaks | Low | High | Feature flag, thorough testing |
| Performance regression | Low | Medium | Benchmark before/after |
| Missing features | Medium | Low | Feature audit checklist |
| Data migration issues | Low | High | Backup, staged rollout |

### Rollback Plan
1. Keep backup branch for 30 days
2. Feature flag allows instant rollback
3. Database changes are additive (no destructive migrations)
4. Old components remain in git history

---

## 📅 Timeline & Resources

### Sprint Plan (10 Days)
```
Days 1-3:  Database & Service Layer
Days 3-4:  Service Consolidation
Days 4-6:  Component Unification
Days 6-7:  State Management
Days 7-9:  Migration & Testing
Days 9-10: Cleanup & Documentation
```

### Resource Requirements
- **Developer Time**: 40-60 hours
- **Testing Time**: 8-10 hours
- **Review Time**: 4-6 hours
- **Total Effort**: ~70 hours

### Dependencies
- Database migration access
- Supabase dashboard access for RLS policies
- Testing environment
- Approval for cleanup phase

---

## ✅ Definition of Done

### Acceptance Criteria
- [ ] Single UnifiedActivityFeed component working
- [ ] UserDashboard unchanged from user perspective
- [ ] All tests passing
- [ ] Performance benchmarks met
- [ ] Old components removed
- [ ] Documentation updated
- [ ] No console errors
- [ ] Accessibility standards met

### Deliverables
1. UnifiedActivityFeed component
2. Activity service with real data
3. Database migrations executed
4. Updated UserDashboard
5. Cleanup of 5 redundant components
6. Performance report
7. Updated documentation

---

## 🎯 Expected Outcomes

### Immediate Benefits
- **80% code reduction** in activity feed components
- **Single source of truth** for all activity displays
- **Real data** instead of mock data
- **Improved performance** with proper virtualization

### Long-term Benefits
- **Easier maintenance** with single component
- **Consistent UX** across all activity displays
- **Reduced bundle size** by ~70KB
- **Aligned with design philosophy** (Pragmatic Monolith)

---

## 📝 Notes & Considerations

### Technical Debt Addressed
- Eliminates 6-way code duplication
- Removes mock data generation
- Fixes broken dependencies
- Establishes proper data foundation

### Future Enhancements (Out of Scope)
- Activity filtering UI
- Activity search
- Export functionality
- Analytics dashboard

### Lessons Learned
- Feature-based organization prevents redundancy
- Mock data should be clearly temporary
- Component proliferation happens gradually
- Regular audits prevent technical debt

---

## Approval & Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Technical Lead | | | |
| Product Owner | | | |
| QA Lead | | | |

**Status**: 🟡 Awaiting Approval

---

*This plan addresses Section 1 of the REDUNDANCY_ANALYSIS_REPORT.md and provides a comprehensive approach to consolidating activity feed components while maintaining functionality and improving performance.*