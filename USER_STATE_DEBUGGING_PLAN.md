# User State Debugging Plan - Browser-Specific Issues
**Problem**: Different users see different errors, issues not reproducible, very first user can't interact
**Root Cause Hypothesis**: State synchronization issues across multiple caching layers

---

## Executive Summary

Your app has **4 different caching/state layers** that can fall out of sync:
1. **Service Worker** (browser-level, persistent across sessions)
2. **Memory Caches** (service-level, per-session)
3. **localStorage** (browser storage, persistent)
4. **Supabase Auth Session** (server-side, managed by Supabase)

When these layers disagree, users see inconsistent behavior.

---

## Immediate Fix for Your Browser

### Clear All State Layers (One-Time)

```javascript
// Open DevTools Console (F12) and run:

// 1. Clear Service Worker
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(reg => reg.unregister());
  console.log('✅ Service Workers cleared');
});

// 2. Clear all caches
caches.keys().then(names => {
  names.forEach(name => caches.delete(name));
  console.log('✅ Caches cleared');
});

// 3. Clear localStorage
localStorage.clear();
console.log('✅ localStorage cleared');

// 4. Clear sessionStorage
sessionStorage.clear();
console.log('✅ sessionStorage cleared');

// 5. Sign out from Supabase
// (Do this through the UI or console)

// 6. Close ALL tabs for gamevault.to
// 7. Reopen site
```

**Or use this single command**:
```javascript
// Nuclear option - clears everything
(async () => {
  await Promise.all([
    navigator.serviceWorker.getRegistrations().then(regs =>
      Promise.all(regs.map(r => r.unregister()))
    ),
    caches.keys().then(names =>
      Promise.all(names.map(n => caches.delete(n)))
    )
  ]);
  localStorage.clear();
  sessionStorage.clear();
  console.log('✅ All state cleared - close and reopen browser');
})();
```

---

## Root Cause Analysis

### Problem 1: Multiple Caching Layers

**Current Architecture**:
```
User Request
    ↓
Service Worker (sw.js) - v1.0.3
    ↓ (if cache miss)
Memory Cache (browserCacheService) - 5min TTL, 100 items
    ↓ (if cache miss)
Service Layer Caches - 5min TTL each:
    - userService.profileCache (Map)
    - userService.userCache (Map)
    - searchService caches
    - reviewService caches
    ↓ (if cache miss)
Supabase Database
```

**The Problem**:
- Each layer can have stale data
- No cross-layer invalidation
- Caches persist across sessions (SW, localStorage)
- Different users have different cache states

### Problem 2: Auth State Fragmentation

**3 Sources of Truth for User Identity**:
```typescript
// 1. Supabase Auth (server-side)
session.user.id              // UUID (e.g., "550e8400...")

// 2. useAuth hook (React state)
user.id                      // UUID from auth
dbUserId                     // Integer database ID

// 3. Caches (multiple locations)
userService.userCache        // Maps UUID → dbUserId
userService.profileCache     // Maps UUID → profile data
browserCacheService          // Maps keys → various data
```

**Sync Issues**:
- `useAuth.ts:125-130` - dbUserId fetch is **non-blocking** and can fail silently
- If `getOrCreateUser` times out (2s), dbUserId stays null
- User appears authenticated but can't interact (no dbUserId)
- Different network conditions = different behavior per user

### Problem 3: Race Conditions

**User Creation Flow** has 3 paths:
```typescript
// Path A: Database function (fast, atomic)
get_or_create_user(UUID) → integer ID

// Path B: Manual lookup (slower, 2 queries)
1. SELECT from user WHERE provider_id = UUID
2. If not found, INSERT INTO user

// Path C: Race condition handler
1. Try INSERT
2. If unique violation, retry SELECT
```

**The Issue**:
- If Path A times out (1.5s), falls back to Path B
- If 2 tabs open simultaneously, both try Path B
- One succeeds, one gets unique violation
- Path C retries but user experience is degraded
- Caches may have inconsistent states

---

## Why "First User" Can't Interact

**Hypothesis**: Their user record has data integrity issues.

**Check These**:
```sql
-- Run in Supabase SQL Editor

-- 1. Find the first user
SELECT id, provider_id, email, username, name, created_at, updated_at
FROM "user"
ORDER BY created_at ASC
LIMIT 1;

-- 2. Check for orphaned auth records
SELECT auth.users.id, auth.users.email, "user".id AS db_user_id
FROM auth.users
LEFT JOIN "user" ON auth.users.id::TEXT = "user".provider_id
WHERE "user".id IS NULL;

-- 3. Check for duplicate provider_ids (shouldn't exist)
SELECT provider_id, COUNT(*) as count
FROM "user"
GROUP BY provider_id
HAVING COUNT(*) > 1;

-- 4. Check for null/invalid data
SELECT id, provider_id, email, username, name
FROM "user"
WHERE provider_id IS NULL
   OR username IS NULL
   OR username = ''
   OR name IS NULL
   OR name = '';

-- 5. Check RLS policies are working
SET ROLE authenticated;
SET request.jwt.claim.sub = '550e8400-e29b-41d4-a716-446655440000'; -- Use real UUID
SELECT * FROM "user" WHERE provider_id = current_setting('request.jwt.claim.sub');
```

---

## Debugging Different Users See Different Errors

### Enable Debug Mode Per User

Add this to your app (temporary debugging):

```typescript
// src/utils/debugMode.ts
export const DEBUG_STATE_ISSUES = localStorage.getItem('DEBUG_STATE') === 'true';

// To enable: localStorage.setItem('DEBUG_STATE', 'true');
```

Then add logging to critical paths:

```typescript
// src/hooks/useAuth.ts:getOrCreateDbUserId
const getOrCreateDbUserId = async (session: Session) => {
  if (DEBUG_STATE_ISSUES) {
    console.group('🔍 getOrCreateDbUserId');
    console.log('Session:', { userId: session.user.id, email: session.user.email });
  }

  try {
    const result = await Promise.race([
      userService.getOrCreateUser(session),
      timeoutPromise
    ]);

    if (DEBUG_STATE_ISSUES) {
      console.log('Result:', result);
      console.log('Current state:', { user, dbUserId, loading, dbUserIdLoading });
    }

    // ... rest of code
  } finally {
    if (DEBUG_STATE_ISSUES) console.groupEnd();
  }
};
```

### Collect User State Snapshots

Add a debug endpoint users can share:

```typescript
// src/utils/debugSnapshot.ts
export async function captureDebugSnapshot() {
  const snapshot = {
    timestamp: new Date().toISOString(),
    browser: navigator.userAgent,

    // Auth state
    auth: {
      hasSupabaseSession: !!(await supabase.auth.getSession()).data.session,
      sessionUserId: (await supabase.auth.getSession()).data.session?.user.id,
      isAuthenticated: !!useAuth().user,
      dbUserId: useAuth().dbUserId,
      loading: useAuth().loading,
    },

    // Cache state
    caches: {
      serviceWorkerActive: !!navigator.serviceWorker.controller,
      serviceWorkerVersion: await caches.keys(),
      localStorageKeys: Object.keys(localStorage),
      browserCacheStats: browserCache.getStats(),
    },

    // Database state (safe to share)
    database: {
      canQueryUser: await (async () => {
        try {
          const { data, error } = await supabase
            .from('user')
            .select('id')
            .limit(1);
          return { success: !error, error: error?.message };
        } catch (e) {
          return { success: false, error: String(e) };
        }
      })(),
    },

    // Network state
    network: {
      online: navigator.onLine,
      effectiveType: (navigator as any).connection?.effectiveType,
    },
  };

  return snapshot;
}

// Usage: Copy snapshot from console
captureDebugSnapshot().then(s => console.log(JSON.stringify(s, null, 2)));
```

---

## Recommended Fixes (No Changes Yet - Planning Only)

### Phase 1: Immediate Mitigation (Low Risk)

#### 1.1: Add Cache Invalidation on Auth Events
```typescript
// src/hooks/useAuth.ts
authService.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
    // Clear all caches on auth change
    userService.clearCache();
    browserCache.clear();
  }
  // ... rest of auth logic
});
```

**Impact**: ✅ Fixes stale data after login/logout
**Risk**: Low - clears cache that would expire anyway
**Tradeoff**: Slightly slower after auth events (acceptable)

#### 1.2: Make dbUserId Fetch Blocking for Critical Actions
```typescript
// src/hooks/useAuth.ts
const requireDbUserId = async (): Promise<number | null> => {
  if (dbUserId) return dbUserId;

  // Block and wait for dbUserId
  if (!session) return null;

  setDbUserIdLoading(true);
  await getOrCreateDbUserId(session);
  setDbUserIdLoading(false);

  return dbUserId;
};

// Use in actions:
const likeReview = async (reviewId: number) => {
  const id = await requireDbUserId();
  if (!id) {
    openAuthModal();
    return;
  }

  // Proceed with like...
};
```

**Impact**: ✅ Prevents "authenticated but can't interact" issue
**Risk**: Low - just makes async operations wait
**Tradeoff**: Slight delay on first interaction (200-500ms)

#### 1.3: Add User State Health Check
```typescript
// src/services/userHealthService.ts
export async function checkUserHealth(): Promise<{
  healthy: boolean;
  issues: string[];
}> {
  const issues: string[] = [];

  // Check auth session
  const session = await supabase.auth.getSession();
  if (!session.data.session) {
    return { healthy: true, issues: [] }; // Not logged in is OK
  }

  const providerId = session.data.session.user.id;

  // Check database user exists
  const { data: dbUser, error } = await supabase
    .from('user')
    .select('id, username, email')
    .eq('provider_id', providerId)
    .single();

  if (error || !dbUser) {
    issues.push('Database user record missing');
  }

  if (dbUser && !dbUser.username) {
    issues.push('Username not set');
  }

  // Check cache consistency
  const cachedProfile = userService['getCachedProfile']?.(providerId);
  if (cachedProfile && cachedProfile.id !== dbUser?.id) {
    issues.push('Cache-database mismatch');
  }

  return {
    healthy: issues.length === 0,
    issues
  };
}
```

**Usage**:
```typescript
// Run on app mount
useEffect(() => {
  if (user) {
    checkUserHealth().then(health => {
      if (!health.healthy) {
        console.warn('User state issues detected:', health.issues);
        // Optionally show banner: "Having issues? Click here to reset your session"
      }
    });
  }
}, [user]);
```

### Phase 2: Structural Fixes (Medium Risk)

#### 2.1: Unified Cache Invalidation
```typescript
// src/services/cacheCoordinator.ts
class CacheCoordinator {
  private subscribers = new Set<() => void>();

  subscribe(callback: () => void) {
    this.subscribers.add(callback);
  }

  invalidateAll() {
    // Clear all caches
    userService.clearCache();
    browserCache.clear();
    searchService.clearCache();
    reviewService.clearCache();

    // Notify subscribers
    this.subscribers.forEach(cb => cb());
  }

  invalidateUser(userId: string) {
    userService.clearProfileCache(userId);
    // Clear related caches...
  }
}

export const cacheCoordinator = new CacheCoordinator();
```

#### 2.2: Persistent State Reconciliation
```typescript
// On app load, reconcile state
async function reconcileUserState() {
  const session = await supabase.auth.getSession();
  if (!session.data.session) return;

  // Force fresh fetch from database
  const result = await userService.getOrCreateUser(session.data.session);

  if (!result.success) {
    // User has auth but no database record - fix it
    console.warn('Repairing user state...');
    await userService.ensureUserProfileExists(
      session.data.session.user.id,
      session.data.session.user.email
    );
  }
}
```

#### 2.3: Add State Recovery UI
```tsx
// src/components/StateRecoveryBanner.tsx
export function StateRecoveryBanner() {
  const { user, dbUserId } = useAuth();
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Show if authenticated but missing dbUserId
    if (user && !dbUserId) {
      setTimeout(() => setShow(true), 3000); // Wait 3s before showing
    }
  }, [user, dbUserId]);

  if (!show) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-yellow-100 border-yellow-400 p-4 rounded">
      <p className="font-semibold">Having trouble interacting with the site?</p>
      <button
        onClick={async () => {
          // Clear state and reload
          await cacheCoordinator.invalidateAll();
          await reconcileUserState();
          window.location.reload();
        }}
        className="mt-2 bg-blue-600 text-white px-4 py-2 rounded"
      >
        Reset Session
      </button>
    </div>
  );
}
```

---

## Testing Plan

### Test Scenario 1: New User Signup
```
1. Open incognito window
2. Sign up new user
3. Verify:
   - ✅ User created in database
   - ✅ dbUserId populated in useAuth
   - ✅ Can like/comment immediately
   - ✅ Profile page loads
```

### Test Scenario 2: Existing User Login
```
1. Clear all caches (nuclear option above)
2. Login as existing user
3. Verify:
   - ✅ Session restored
   - ✅ dbUserId fetched
   - ✅ Profile data loads
   - ✅ Can interact with site
```

### Test Scenario 3: Multi-Tab Sync
```
1. Login in Tab A
2. Open Tab B (same site)
3. Verify:
   - ✅ Tab B recognizes auth
   - ✅ Both tabs have same dbUserId
   - ✅ Logout in Tab A affects Tab B
```

### Test Scenario 4: Network Timeout
```
1. Enable "Slow 3G" in DevTools Network tab
2. Login as user
3. Verify:
   - ✅ Timeout handling works
   - ✅ Falls back to manual user creation
   - ✅ No infinite loading states
   - ✅ User can still interact
```

### Test Scenario 5: Cache Corruption
```
1. Login successfully
2. Manually corrupt cache:
   ```js
   localStorage.setItem('gamevault_session', 'corrupted');
   ```
3. Reload page
4. Verify:
   - ✅ App detects corruption
   - ✅ Clears bad data
   - ✅ Recovers gracefully
```

---

## Monitoring & Alerting

### Add These Metrics

```typescript
// Track state health in production
analytics.track('user_state_health', {
  hasAuth: !!session,
  hasUser: !!user,
  hasDbUserId: !!dbUserId,
  dbUserIdLoadTime: timeToLoadDbUserId,
  cacheHitRate: browserCache.getStats().validItems / browserCache.getStats().totalItems,
});

// Alert on anomalies
if (user && !dbUserId && Date.now() - loginTime > 5000) {
  analytics.track('state_sync_failure', {
    userId: user.id,
    timeElapsed: Date.now() - loginTime,
  });
}
```

---

## Database Limits & API Constraints

### Supabase Free Tier Limits
- **Database**: 500MB storage, 2GB bandwidth/month
- **Auth**: 50,000 monthly active users
- **API Requests**: 500 requests/second
- **Realtime**: 200 concurrent connections

### Safe Query Patterns
```sql
-- ✅ GOOD: Single user lookup (indexed)
SELECT * FROM "user" WHERE provider_id = $1;  -- Uses index

-- ✅ GOOD: Paginated queries
SELECT * FROM rating LIMIT 20 OFFSET 0;

-- ❌ BAD: Full table scans
SELECT * FROM "user";  -- 185K rows!

-- ❌ BAD: Unbounded queries
SELECT * FROM rating WHERE user_id = $1;  -- Could be thousands
```

### Rate Limiting Strategy
```typescript
// Implement client-side rate limiting
class RequestQueue {
  private queue: Array<() => Promise<any>> = [];
  private processing = 0;
  private readonly maxConcurrent = 5; // Max 5 concurrent requests

  async enqueue<T>(request: () => Promise<T>): Promise<T> {
    if (this.processing >= this.maxConcurrent) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.processing++;
    try {
      return await request();
    } finally {
      this.processing--;
    }
  }
}

export const requestQueue = new RequestQueue();
```

---

## Rollout Plan

### Week 1: Investigation & Mitigation
- [ ] Deploy debug snapshot tool
- [ ] Collect snapshots from affected users
- [ ] Analyze common patterns
- [ ] Implement Phase 1 fixes (cache invalidation)

### Week 2: Verification & Monitoring
- [ ] Monitor state health metrics
- [ ] Test with affected users
- [ ] Verify "first user" can interact
- [ ] Document remaining edge cases

### Week 3: Structural Improvements
- [ ] Implement Phase 2 fixes (unified cache)
- [ ] Add state recovery UI
- [ ] Comprehensive testing (all scenarios)

### Week 4: Polish & Documentation
- [ ] User-facing documentation ("Troubleshooting" page)
- [ ] Admin dashboard for user health checks
- [ ] Automated alerts for state sync failures

---

## Success Criteria

- ✅ All users can interact after login (100% success rate)
- ✅ No "authenticated but can't interact" issues
- ✅ Cache consistency across tabs
- ✅ Graceful degradation on network timeouts
- ✅ Clear error messages when things go wrong
- ✅ < 0.1% of users need to "reset session"

---

## FAQ for Users

### "Why do I see different errors than other users?"
Your browser has different cached data. Clear your browser cache and sign in again.

### "The site worked yesterday, now it doesn't"
This usually means a deployment updated code but your browser has old cached JavaScript. Hard refresh (Ctrl+Shift+R) or clear site data.

### "I'm logged in but can't like/comment"
Your user profile might not be fully synced. Click the "Reset Session" button or sign out and back in.

---

---

## Next Steps - Database Health Checks

**Action Required**: Run the SQL queries in `/docs/DATABASE_HEALTH_CHECKS.sql`

I've created a comprehensive SQL file with 10 diagnostic queries. Here's what to do:

### 1. Open Supabase SQL Editor
1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to: **SQL Editor** (left sidebar)

### 2. Run Priority Queries First

**PRIORITY 1 - First User Record**:
```sql
-- Copy from DATABASE_HEALTH_CHECKS.sql - QUERY 1
SELECT id, provider_id, email, username, name, created_at, updated_at
FROM "user"
ORDER BY created_at ASC
LIMIT 1;
```
This tells us if the first user's record has data corruption.

**PRIORITY 2 - Orphaned Auth Records**:
```sql
-- Copy from DATABASE_HEALTH_CHECKS.sql - QUERY 2
SELECT auth.users.id, auth.users.email, "user".id AS db_user_id
FROM auth.users
LEFT JOIN "user" ON auth.users.id::TEXT = "user".provider_id
WHERE "user".id IS NULL
LIMIT 10;
```
This shows if any users have auth records but no database records (signup failures).

**PRIORITY 3 - First User Cross-Reference**:
```sql
-- Copy from DATABASE_HEALTH_CHECKS.sql - QUERY 7
-- (This query cross-references auth and DB records)
```
This confirms the first user's auth and DB records match properly.

**PRIORITY 4 - Users With No Interactions**:
```sql
-- Copy from DATABASE_HEALTH_CHECKS.sql - QUERY 9
-- (This query finds users who can't interact with the site)
```
This should show if your first user is among those who can't create content.

### 3. What We're Looking For

Based on the query results, we'll know:

**If First User Has Data Corruption**:
- ❌ NULL or empty `provider_id`
- ❌ NULL or empty `username` / `name`
- ❌ `email` doesn't match their actual email
- 🔧 **Fix**: Manually update the record or recreate user

**If First User Has Orphaned Auth**:
- ❌ User exists in `auth.users` but not in `"user"` table
- 🔧 **Fix**: Run `get_or_create_user` manually for their UUID

**If First User Has RLS Issues**:
- ❌ QUERY 8 shows overly restrictive policies
- ❌ QUERY 10 (RLS test) returns 0 rows when it should return 1
- 🔧 **Fix**: Adjust RLS policies in Supabase dashboard

**If First User Has No Actual Issues**:
- ✅ All queries look normal
- 🔍 **Next**: Problem is state synchronization (caching), not data
- 🔧 **Fix**: Have first user run the "nuclear option" cache clear from top of this doc

### 4. Share Results

After running the priority queries, share the results here and I'll:
1. Diagnose the exact issue
2. Provide specific SQL fixes if needed
3. Determine if it's data corruption vs state sync
4. Guide you through the appropriate fix from the plan above

**Expected Timeline**:
- Running queries: 5-10 minutes
- Analysis & fix: 10-30 minutes (depending on findings)
- Verification: 5-10 minutes (first user tests interactions)

---

**Current Status**: ⏳ Awaiting database query results to proceed with targeted fix.
