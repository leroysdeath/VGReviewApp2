# Notification System - Implementation Status

**Last Updated:** 2025-01-06
**Status:** ~60% Complete - Database and UI ready, service layer needs implementation
**Priority:** Medium - Feature started but never completed

---

## Executive Summary

A comprehensive notification system was partially implemented but never completed or deployed. The database schema is production-ready, UI components are built and polished, but the service layer only returns mock data and was never connected to the actual database. Real-time delivery was attempted using Socket.IO but abandoned due to complexity.

**What Works:**
- ✅ Complete database schema with RLS policies
- ✅ UI components (badge, center, items) fully built
- ✅ State management with Zustand store
- ✅ TypeScript types and interfaces

**What's Missing:**
- ❌ Service layer connects to mock data, not Supabase
- ❌ Real-time notification delivery (attempted with Socket.IO, abandoned)
- ❌ Components not integrated into navbar/header
- ❌ No notification generation triggers (database triggers or app logic)
- ❌ Email/push notification delivery (preferences exist but no implementation)

---

## Database Layer - ✅ Complete

### Tables Created (Migration: `20250711041240_rough_feather.sql`)

#### 1. `notification` Table
Stores all notifications for users.

**Schema:**
```sql
CREATE TABLE notification (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  activity_id INTEGER REFERENCES activity(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT FALSE,
  is_dismissed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Supported Notification Types:**
- `review_mention` - User mentioned in a review
- `comment_reply` - Reply to user's comment
- `user_followed` - Someone followed the user
- `game_release` - Game on wishlist released
- `price_drop` - Game on wishlist price dropped
- `community_milestone` - Community achievement
- `friend_activity` - Activity from followed users
- `system_announcement` - Platform announcements
- `weekly_digest` - Weekly summary email

**RLS Policies:**
```sql
-- Users can see their own notifications
CREATE POLICY "Users can see their own notifications"
  ON notification FOR SELECT TO authenticated
  USING (user_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()::text));

-- Users can update their own notifications
CREATE POLICY "Users can update their own notifications"
  ON notification FOR UPDATE TO authenticated
  USING (user_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()::text));
```

#### 2. `notification_preference` Table
User preferences for notification delivery channels.

**Schema:**
```sql
CREATE TABLE notification_preference (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL,
  email_enabled BOOLEAN DEFAULT TRUE,
  push_enabled BOOLEAN DEFAULT TRUE,
  in_app_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, notification_type)
);
```

**RLS Policies:**
```sql
CREATE POLICY "Users can see their own notification preferences"
  ON notification_preference FOR SELECT TO authenticated
  USING (user_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()::text));

CREATE POLICY "Users can update their own notification preferences"
  ON notification_preference FOR UPDATE TO authenticated
  USING (user_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()::text));

CREATE POLICY "Users can insert their own notification preferences"
  ON notification_preference FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()::text));
```

#### 3. `notification_read_status` Table
Tracks read/unread state for notifications.

**Schema:**
```sql
CREATE TABLE notification_read_status (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  notification_id INTEGER NOT NULL REFERENCES notification(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, notification_id)
);
```

**Note:** This table may be redundant since `notification` table already has `is_read` and `is_dismissed` columns. Consider consolidating during implementation.

#### 4. `user_follow` Table
Powers the user following system (prerequisite for friend activity notifications).

**Schema:**
```sql
CREATE TABLE user_follow (
  id SERIAL PRIMARY KEY,
  follower_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  following_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);
```

**RLS Policy:**
```sql
CREATE POLICY "Anyone can see user follows"
  ON user_follow FOR SELECT TO authenticated
  USING (true);
```

---

## Service Layer - ⚠️ Mock Data Only

### Current Implementation: `src/services/notificationService.ts`

**Status:** Returns fake data, never connects to Supabase database.

**What Exists:**
```typescript
// Simulates API calls with hardcoded delays
export const fetchNotifications = async (
  userId: string,
  cursor?: string,
  limit: number = 20
): Promise<NotificationResponse> => {
  // Line 19: Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));

  // Line 30: Generate MOCK data
  const mockNotifications: Notification[] = Array.from({ length: limit }, ...);

  return {
    notifications: mockNotifications,
    unreadCount,
    totalCount: 100, // Mock total count
    nextCursor
  };
};
```

**Functions Implemented (all mock):**
- `fetchNotifications(userId, cursor?, limit?)` - Returns fake notifications
- `markNotificationAsRead(notificationId)` - Simulates marking as read
- `markAllNotificationsAsRead(userId)` - Simulates bulk mark as read

**What Needs to be Done:**
Replace mock implementations with actual Supabase queries:

```typescript
// Example of what fetchNotifications should look like:
export const fetchNotifications = async (
  userId: number,
  cursor?: string,
  limit: number = 20
): Promise<NotificationResponse> => {
  let query = supabase
    .from('notification')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data, error, count } = await query;

  if (error) throw error;

  const unreadCount = data?.filter(n => !n.is_read).length || 0;

  return {
    notifications: data || [],
    unreadCount,
    totalCount: count || 0,
    nextCursor: data && data.length === limit
      ? data[data.length - 1].created_at
      : undefined
  };
};
```

---

## UI Layer - ✅ Built But Not Integrated

### Components Created

#### 1. `src/components/NotificationBadge.tsx`
Bell icon with unread count badge.

**Purpose:** Shows notification icon in navbar with unread count
**Status:** Built but not imported anywhere
**Integration Needed:** Add to navigation header

**Features:**
- Bell icon (typically from lucide-react or similar)
- Red badge with unread count
- Click to open NotificationCenter
- Real-time unread count updates

#### 2. `src/components/NotificationCenter.tsx`
Dropdown panel showing notification list.

**Purpose:** Main notification UI panel
**Status:** Built but not imported anywhere
**Integration Needed:** Mount when NotificationBadge is clicked

**Expected Features:**
- Dropdown/modal panel
- List of notifications (using NotificationItem)
- "Mark all as read" button
- Empty state when no notifications
- Loading state
- Error handling
- Infinite scroll or pagination

#### 3. `src/components/NotificationItem.tsx`
Individual notification row component.

**Purpose:** Renders a single notification
**Status:** Built and ready

**Expected Features:**
- Icon based on notification type
- Title and message
- Timestamp (relative time like "2 hours ago")
- Read/unread visual indicator
- Click to navigate to linked content
- Mark as read on click
- Dismiss button

### State Management: `src/store/notificationStore.ts`

**Purpose:** Zustand store managing notification state
**Status:** Implemented and uses notificationService

**Expected State:**
```typescript
interface NotificationStore {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;

  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addNotification: (notification: Notification) => void; // For real-time
}
```

---

## Real-Time Layer - ❌ Attempted and Abandoned

### What Was Attempted: `src/services/realTimeService.ts` (DELETED)

**Original Plan:** Use Socket.IO for instant notification delivery

**Implementation Details:**
- WebSocket connection to `/api/activities/stream` (endpoint never created)
- Reconnection logic with exponential backoff
- Fallback to polling when WebSocket unavailable
- Event types: `activity`, `connection`
- Batched updates for performance (500ms batches, max 500 items)

**Why It Failed:**
1. `socket.io-client` package was never installed
2. Backend Socket.IO server was never implemented
3. No WebSocket endpoint at `/api/activities/stream`
4. Complexity of Socket.IO setup was underestimated
5. Left broken code that caused production errors

**File Deleted:** 2025-01-06 (commit `5e7b091`)
**Reason:** Imported missing dependency, broke production build

### What Was Attempted: `src/hooks/useRealTimeActivities.ts` (DELETED)

**Purpose:** React hook to consume real-time notification events

**Features:**
- Connected to realTimeService
- Batched incoming notifications (500ms intervals)
- De-duplicated using Map for O(1) lookups
- Auto-cleanup of old notifications (30+ days)
- Unread count tracking
- Connection state monitoring

**File Deleted:** 2025-01-06 (commit `5e7b091`)
**Reason:** Depended on broken realTimeService

### Recommended Approach: Supabase Real-time

Instead of Socket.IO, use Supabase's built-in real-time subscriptions:

```typescript
// Example: Subscribe to new notifications
const subscribeToNotifications = (userId: number, callback: (notification: Notification) => void) => {
  return supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notification',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        callback(payload.new as Notification);
      }
    )
    .subscribe();
};

// Usage in component:
useEffect(() => {
  const channel = subscribeToNotifications(userId, (notification) => {
    notificationStore.addNotification(notification);
    // Show toast notification
    toast.info(notification.title);
  });

  return () => {
    supabase.removeChannel(channel);
  };
}, [userId]);
```

**Benefits over Socket.IO:**
- No additional dependencies or server setup
- Already in your tech stack
- Works with existing RLS policies
- Handles reconnection automatically
- Lower latency (direct database connection)

---

## Type Definitions

### Location: `src/types/notification.ts`

**Expected Types:**
```typescript
export type NotificationType =
  | 'review_mention'
  | 'comment_reply'
  | 'user_followed'
  | 'game_release'
  | 'price_drop'
  | 'community_milestone'
  | 'friend_activity'
  | 'system_announcement'
  | 'weekly_digest';

export interface Notification {
  id: number;
  userId: number;
  notificationType: NotificationType;
  title: string;
  message: string;
  link?: string;
  activityId?: number;
  isRead: boolean;
  isDismissed: boolean;
  createdAt: string;
}

export interface NotificationResponse {
  notifications: Notification[];
  unreadCount: number;
  totalCount: number;
  nextCursor?: string;
}

export interface NotificationPreference {
  id: number;
  userId: number;
  notificationType: NotificationType;
  emailEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}
```

---

## Testing

### Test File: `src/test/notificationService.test.ts`

**Status:** Tests written for mock service
**Action Needed:** Update tests for real Supabase implementation

---

## What's Missing - Implementation Checklist

### Critical Path (Must Do)

- [ ] **Replace mock service with Supabase queries**
  - [ ] `fetchNotifications()` - Query `notification` table
  - [ ] `markNotificationAsRead()` - Update `is_read` column
  - [ ] `markAllNotificationsAsRead()` - Bulk update query
  - [ ] Handle pagination with cursor-based approach
  - [ ] Add error handling and retries

- [ ] **Integrate UI into application**
  - [ ] Add `NotificationBadge` to navbar/header component
  - [ ] Wire up NotificationCenter dropdown
  - [ ] Connect to notificationStore
  - [ ] Test responsive layout (mobile/desktop)

- [ ] **Implement notification generation logic**
  - [ ] Create database triggers or app-level logic to insert notifications when:
    - User gets followed → `user_followed`
    - Comment gets a reply → `comment_reply`
    - Review mentions a user → `review_mention`
    - Game releases (wishlist) → `game_release`
  - [ ] Respect user preferences (check `notification_preference` table)

- [ ] **Add real-time delivery**
  - [ ] Use Supabase real-time subscriptions (NOT Socket.IO)
  - [ ] Subscribe to `notification` table INSERT events
  - [ ] Update store when new notifications arrive
  - [ ] Show toast/banner for important notifications

### Nice to Have (Phase 2)

- [ ] **Email notifications**
  - [ ] Set up email service (SendGrid, AWS SES, etc.)
  - [ ] Create email templates for each notification type
  - [ ] Background job to send emails based on preferences
  - [ ] Unsubscribe links and preference management

- [ ] **Push notifications**
  - [ ] Implement web push (service worker)
  - [ ] Request notification permission
  - [ ] Send push notifications via browser API
  - [ ] Handle click events to navigate to content

- [ ] **Notification preferences UI**
  - [ ] Settings page to manage notification preferences
  - [ ] Toggle email/push/in-app for each notification type
  - [ ] "Mute all" and "Do not disturb" features

- [ ] **Advanced features**
  - [ ] Notification grouping ("3 new followers")
  - [ ] Notification actions (Accept/Decline follow request)
  - [ ] Mark as read on scroll/view
  - [ ] Notification sounds
  - [ ] Desktop notifications
  - [ ] Weekly digest emails

### Database Cleanup

- [ ] **Review redundant tables**
  - `notification_read_status` seems redundant since `notification` table has `is_read`
  - Consider consolidating or removing duplicate functionality

- [ ] **Add indexes for performance**
  ```sql
  CREATE INDEX idx_notification_user_id_created_at
    ON notification(user_id, created_at DESC);

  CREATE INDEX idx_notification_user_id_is_read
    ON notification(user_id, is_read)
    WHERE is_read = FALSE;
  ```

- [ ] **Add cleanup job**
  - Delete old read notifications (90+ days)
  - Archive dismissed notifications

---

## Architecture Recommendations

### 1. Notification Generation Strategy

**Option A: Database Triggers (Recommended)**
- Automatically insert notifications when events occur
- Ensures notifications aren't missed
- Centralized logic in database
- Example: When `user_follow` INSERT, create `user_followed` notification

**Option B: Application-Level**
- Generate notifications in app code after actions
- More flexible, easier to test
- Can batch multiple notifications
- Example: After follow action succeeds, call `createNotification()`

**Hybrid Approach:**
- Use triggers for critical notifications (follows, mentions)
- Use app-level for computed notifications (weekly digest, recommendations)

### 2. Real-time Delivery

**Use Supabase Real-time Subscriptions:**
```typescript
// In notificationStore.ts or custom hook
const channel = supabase
  .channel('notifications')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notification',
    filter: `user_id=eq.${userId}`
  }, (payload) => {
    // Add to store
    addNotification(payload.new);
    // Show toast
    toast.info(payload.new.title);
  })
  .subscribe();
```

### 3. Notification Service Pattern

```typescript
// Centralized notification creation
export const createNotification = async (params: {
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  activityId?: number;
}): Promise<Notification> => {
  // Check user preferences
  const { data: pref } = await supabase
    .from('notification_preference')
    .select('*')
    .eq('user_id', params.userId)
    .eq('notification_type', params.type)
    .single();

  if (!pref?.in_app_enabled) {
    return; // User has disabled this notification type
  }

  // Create notification
  const { data, error } = await supabase
    .from('notification')
    .insert({
      user_id: params.userId,
      notification_type: params.type,
      title: params.title,
      message: params.message,
      link: params.link,
      activity_id: params.activityId
    })
    .select()
    .single();

  if (error) throw error;

  // Send email if enabled
  if (pref?.email_enabled) {
    await sendEmailNotification(data);
  }

  // Send push if enabled
  if (pref?.push_enabled) {
    await sendPushNotification(data);
  }

  return data;
};
```

---

## Migration Path

### Phase 1: Basic In-App Notifications (1-2 days)
1. Replace mock service with Supabase queries
2. Add NotificationBadge to navbar
3. Implement basic notification generation for follows
4. Test end-to-end flow

### Phase 2: Real-time Updates (1 day)
1. Add Supabase real-time subscription
2. Update store on new notifications
3. Add toast notifications for important events
4. Polish UI animations

### Phase 3: Notification Generation (2-3 days)
1. Add database triggers or app logic for all notification types
2. Respect user preferences
3. Handle notification deduplication
4. Add notification icons and formatting

### Phase 4: Email/Push (1 week)
1. Set up email service
2. Create email templates
3. Implement web push
4. Add preference management UI

---

## Known Issues

1. **Mock Service in Production**
   - `notificationService.ts` will return fake data if used
   - No error handling for real Supabase failures
   - Type mismatches between mock and database schema

2. **Redundant Tables**
   - `notification_read_status` duplicates `notification.is_read`
   - Should consolidate schema before implementation

3. **Missing Indexes**
   - No database indexes on `notification` table
   - Will be slow with many notifications per user

4. **No Cleanup Logic**
   - Old notifications will accumulate
   - Need archival or deletion strategy

5. **Real-time Attempted with Socket.IO**
   - Socket.IO code deleted but may have left artifacts
   - Ensure clean slate before implementing Supabase real-time

---

## Related Files

### Database
- `supabase/migrations/20250711041240_rough_feather.sql` - Main migration
- `supabase/migrations/20240102_phase3_standardize_rls.sql` - RLS policies
- `supabase/migrations/20250922_fix_rls_policy_warnings.sql` - RLS updates

### Service Layer
- `src/services/notificationService.ts` - Mock service (NEEDS REPLACEMENT)
- ~~`src/services/realTimeService.ts`~~ - DELETED (was broken)

### UI Components
- `src/components/NotificationBadge.tsx` - Bell icon with badge
- `src/components/NotificationCenter.tsx` - Notification dropdown
- `src/components/NotificationItem.tsx` - Individual notification

### State Management
- `src/store/notificationStore.ts` - Zustand store

### Hooks
- ~~`src/hooks/useRealTimeActivities.ts`~~ - DELETED (depended on broken service)

### Types
- `src/types/notification.ts` - Type definitions (verify exists)

### Tests
- `src/test/notificationService.test.ts` - Service tests (needs update)

---

## References

### Supabase Real-time Documentation
- [Supabase Real-time Subscriptions](https://supabase.com/docs/guides/realtime)
- [Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes)

### Design Inspiration
- Letterboxd notifications (simple, clean)
- GitHub notifications (grouping, filters)
- Discord notifications (channels, mentions)

---

## Notes

- **Original Intent**: Build a comprehensive notification system similar to social platforms
- **Why Abandoned**: Got stuck on real-time delivery complexity with Socket.IO
- **Current State**: Database ready, UI built, just needs service layer connection
- **Estimated Effort**: 1-2 weeks for full implementation including real-time
- **Priority**: Medium - Nice to have but not blocking other features

**Last Action Taken:** 2025-01-06 - Deleted broken `realTimeService.ts` and `useRealTimeActivities.ts` that were causing production errors due to missing `socket.io-client` dependency.

**Next Steps When Resuming:**
1. Start with Phase 1: Replace mock service with real Supabase queries
2. Test with hardcoded notification creation (manual SQL insert)
3. Add NotificationBadge to header once service works
4. Implement real-time subscription after basic flow works
