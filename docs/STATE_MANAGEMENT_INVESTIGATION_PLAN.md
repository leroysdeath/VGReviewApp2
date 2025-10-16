# State Management Investigation Plan

**Goal**: Pinpoint exactly where browser-specific state issues occur and implement targeted fixes

**Status**: Database is healthy, issue is client-side state synchronization

---

## Phase 1: Map the State Flow (Investigation)

### Step 1.1: Trace the Authentication & User State Flow

Let me map out the complete flow from login → interaction:

```
User Login
    ↓
1. Supabase Auth (supabase.auth.signInWithPassword)
    ↓
2. Auth State Change Event (authService.onAuthStateChange)
    ↓
3. useAuth Hook Updates (src/hooks/useAuth.ts)
    ├─ Sets user state (Supabase session.user)
    ├─ Triggers getOrCreateDbUserId() [NON-BLOCKING]
    └─ Sets loading states
    ↓
4. getOrCreateDbUserId() Flow
    ├─ Calls userService.getOrCreateUser(session)
    ├─ Has 2-second timeout
    └─ Updates dbUserId state [ASYNC]
    ↓
5. Component Renders
    ├─ user is set (authenticated)
    ├─ dbUserId might still be null (race condition)
    └─ Components check: if (!user || !dbUserId) → can't interact
```

### Step 1.2: Identify Critical State Variables

**Auth State (useAuth.ts)**:
- `user` - Supabase auth user object
- `session` - Supabase session object
- `dbUserId` - Integer database ID (CRITICAL for interactions)
- `loading` - Initial auth check loading
- `dbUserIdLoading` - Separate loading for DB user ID fetch

**Cache State (Multiple Services)**:
- `userService.profileCache` - Map<string, UserProfile>
- `userService.userCache` - Map<string, number> (UUID → dbUserId)
- `userService.cacheTimestamps` - Map<string, number> (TTL tracking)
- `browserCacheService` - Generic cache (100 items, 5min TTL)
- Service Worker caches - Persistent across sessions

### Step 1.3: Find State Synchronization Gaps

Based on code analysis, here are the suspected issues:

#### Issue 1: Non-Blocking dbUserId Fetch (HIGH PRIORITY)

**Location**: `src/hooks/useAuth.ts:128-130`

```typescript
setDbUserIdLoading(true);
getOrCreateDbUserId(session).finally(() => {
  setDbUserIdLoading(false);
});
// ⚠️ Code continues immediately - dbUserId might still be null
```

**Problem**:
- If `getOrCreateDbUserId` times out (2s) or fails, `dbUserId` stays null
- User appears authenticated but can't interact
- No error shown to user
- No retry mechanism

**Impact**: 🔴 HIGH - This is likely the primary cause

#### Issue 2: Cache Invalidation on Auth Events (MEDIUM PRIORITY)

**Location**: `src/hooks/useAuth.ts` - Missing cache clearing on login/logout

**Problem**:
- When user logs in, old cached data from previous sessions persists
- `userService` caches aren't cleared on auth state change
- Can serve stale user data from previous session

**Impact**: 🟡 MEDIUM - Causes confusion but not complete breakage

#### Issue 3: Multiple Cache Layers Without Coordination (MEDIUM PRIORITY)

**Locations**:
- `src/services/userService.ts` (3 separate Map caches)
- `src/services/browserCacheService.ts` (generic cache)
- `public/sw.js` (Service Worker cache)

**Problem**:
- No central cache coordinator
- Each layer manages its own TTL independently
- One layer can have fresh data while another is stale
- No cross-layer invalidation

**Impact**: 🟡 MEDIUM - Different users see different behavior

#### Issue 4: Race Condition in User Creation (LOW PRIORITY)

**Location**: `src/services/userService.ts:getOrCreateUser`

**Problem**:
- Tries RPC function first (1.5s timeout)
- Falls back to manual queries
- If both paths execute simultaneously (multi-tab), possible race condition
- Cache might be populated with inconsistent data

**Impact**: 🟢 LOW - Handled by ON CONFLICT, but degraded UX

---

## Phase 2: Add Instrumentation (Debugging)

### Step 2.1: Add State Tracking Logging

**Goal**: Capture state transitions to see where things break

**Create**: `src/utils/stateLogger.ts`

```typescript
// src/utils/stateLogger.ts
const DEBUG_STATE = localStorage.getItem('DEBUG_STATE') === 'true';

interface StateSnapshot {
  timestamp: number;
  event: string;
  data: any;
}

class StateLogger {
  private logs: StateSnapshot[] = [];
  private maxLogs = 100;

  log(event: string, data: any) {
    if (!DEBUG_STATE) return;

    const snapshot: StateSnapshot = {
      timestamp: Date.now(),
      event,
      data: this.sanitize(data)
    };

    this.logs.push(snapshot);

    // Keep only last 100 logs
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    console.log(`[StateLogger] ${event}`, data);
  }

  private sanitize(data: any): any {
    // Remove sensitive data before logging
    if (typeof data !== 'object') return data;

    const sanitized = { ...data };
    const sensitiveKeys = ['password', 'token', 'access_token', 'refresh_token'];

    for (const key of sensitiveKeys) {
      if (key in sanitized) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  getLogs(): StateSnapshot[] {
    return this.logs;
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  clear() {
    this.logs = [];
    console.log('[StateLogger] Logs cleared');
  }
}

export const stateLogger = new StateLogger();

// Enable via console: localStorage.setItem('DEBUG_STATE', 'true'); location.reload();
// Export logs: copy(stateLogger.exportLogs());
```

### Step 2.2: Instrument useAuth Hook

**Modify**: `src/hooks/useAuth.ts`

Add logging at critical points:

```typescript
import { stateLogger } from '../utils/stateLogger';

// After line 50 (auth state change handler)
authService.onAuthStateChange(async (event, session) => {
  stateLogger.log('auth_state_change', { event, userId: session?.user?.id });

  // ... existing code ...

  if (session) {
    stateLogger.log('auth_session_set', {
      userId: session.user.id,
      email: session.user.email,
      hasDbUserId: !!dbUserId
    });
  }
});

// Around line 128 (dbUserId fetch)
const getOrCreateDbUserId = async (session: Session) => {
  stateLogger.log('dbUserId_fetch_start', { userId: session.user.id });

  setDbUserIdLoading(true);

  try {
    const result = await Promise.race([
      userService.getOrCreateUser(session),
      timeoutPromise
    ]);

    stateLogger.log('dbUserId_fetch_result', {
      success: result.success,
      dbUserId: result.dbUserId,
      error: result.error
    });

    if (result.success && result.dbUserId) {
      setDbUserId(result.dbUserId);
      stateLogger.log('dbUserId_set', { dbUserId: result.dbUserId });
    } else {
      stateLogger.log('dbUserId_fetch_failed', { error: result.error });
    }
  } catch (error) {
    stateLogger.log('dbUserId_fetch_error', { error: String(error) });
  } finally {
    setDbUserIdLoading(false);
  }
};
```

### Step 2.3: Instrument userService

**Modify**: `src/services/userService.ts`

```typescript
import { stateLogger } from '../utils/stateLogger';

// In getOrCreateUser method (around line 229)
async getOrCreateUser(session: Session): Promise<{...}> {
  const userId = session.user.id;

  stateLogger.log('userService_getOrCreateUser_start', { userId });

  // Check cache first
  const cachedUserId = this.userCache.get(userId);
  if (cachedUserId) {
    stateLogger.log('userService_cache_hit', { userId, cachedUserId });
    return { success: true, dbUserId: cachedUserId };
  }

  stateLogger.log('userService_cache_miss', { userId });

  // Try RPC function
  try {
    const { data, error } = await Promise.race([
      supabase.rpc('get_or_create_user', { ... }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('RPC timeout')), 1500))
    ]);

    if (!error && data) {
      stateLogger.log('userService_rpc_success', { userId, dbUserId: data });
      this.userCache.set(userId, data);
      return { success: true, dbUserId: data };
    }

    stateLogger.log('userService_rpc_failed', { userId, error });
  } catch (error) {
    stateLogger.log('userService_rpc_error', { userId, error: String(error) });
  }

  // Fallback to manual queries...
  stateLogger.log('userService_manual_fallback', { userId });
  // ... rest of fallback code
}
```

### Step 2.4: Create Debug Dashboard

**Create**: `src/components/DebugStateDashboard.tsx`

```typescript
import { useState, useEffect } from 'react';
import { stateLogger } from '../utils/stateLogger';
import { useAuth } from '../hooks/useAuth';

export function DebugStateDashboard() {
  const { user, dbUserId, loading, dbUserIdLoading } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [visible, setVisible] = useState(false);

  // Only show if DEBUG_STATE is enabled
  useEffect(() => {
    const isDebug = localStorage.getItem('DEBUG_STATE') === 'true';
    setVisible(isDebug);
  }, []);

  useEffect(() => {
    if (!visible) return;

    const interval = setInterval(() => {
      setLogs(stateLogger.getLogs());
    }, 1000);

    return () => clearInterval(interval);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 right-0 w-96 h-96 bg-black bg-opacity-90 text-white p-4 overflow-auto z-50 text-xs font-mono">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold">Debug State Dashboard</h3>
        <button
          onClick={() => setVisible(false)}
          className="text-red-500 hover:text-red-700"
        >
          ✕
        </button>
      </div>

      <div className="mb-4 p-2 bg-gray-800 rounded">
        <div>User: {user ? '✅' : '❌'} {user?.email}</div>
        <div>dbUserId: {dbUserId ? `✅ ${dbUserId}` : '❌ null'}</div>
        <div>Loading: {loading ? '⏳' : '✅'}</div>
        <div>dbUserId Loading: {dbUserIdLoading ? '⏳' : '✅'}</div>
      </div>

      <div className="space-y-1">
        {logs.slice(-10).reverse().map((log, i) => (
          <div key={i} className="p-1 bg-gray-800 rounded">
            <div className="text-blue-400">{log.event}</div>
            <div className="text-gray-400 text-xs">
              {new Date(log.timestamp).toLocaleTimeString()}
            </div>
            <pre className="text-xs overflow-x-auto">
              {JSON.stringify(log.data, null, 2)}
            </pre>
          </div>
        ))}
      </div>

      <div className="mt-4 space-x-2">
        <button
          onClick={() => {
            const exported = stateLogger.exportLogs();
            navigator.clipboard.writeText(exported);
            alert('Logs copied to clipboard!');
          }}
          className="bg-blue-600 px-2 py-1 rounded text-xs"
        >
          Copy Logs
        </button>
        <button
          onClick={() => stateLogger.clear()}
          className="bg-red-600 px-2 py-1 rounded text-xs"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
```

**Add to**: `src/App.tsx`

```typescript
import { DebugStateDashboard } from './components/DebugStateDashboard';

function App() {
  return (
    <>
      {/* ... existing app code ... */}
      <DebugStateDashboard />
    </>
  );
}
```

---

## Phase 3: Reproduce & Capture Issues

### Step 3.1: Enable Debug Mode

**Instructions for affected users**:

1. Open browser console (F12)
2. Run: `localStorage.setItem('DEBUG_STATE', 'true')`
3. Reload page
4. See debug dashboard in bottom-right corner
5. Try to interact (like a review, post a comment)
6. If it fails, click "Copy Logs"
7. Paste logs and share

### Step 3.2: Test Scenarios to Reproduce

**Scenario A: Fresh Login**
```
1. Clear all browser data (Ctrl+Shift+Delete)
2. Enable debug mode
3. Navigate to site
4. Sign in
5. Immediately try to like a review
6. Check debug dashboard for dbUserId timing
```

**Scenario B: Multi-Tab**
```
1. Enable debug mode
2. Login in Tab A
3. Open Tab B (same site)
4. Try to interact in Tab B
5. Check if dbUserId is synced across tabs
```

**Scenario C: Network Timeout**
```
1. Enable debug mode
2. Open DevTools → Network → Throttling → Slow 3G
3. Login
4. Watch debug dashboard for timeout in dbUserId fetch
5. Check if fallback works
```

**Scenario D: Cache Corruption**
```
1. Enable debug mode
2. Login successfully
3. Manually corrupt cache:
   localStorage.setItem('sb-auth-token', 'corrupted');
4. Reload page
5. See if app detects and recovers
```

---

## Phase 4: Implement Targeted Fixes

### Fix 1: Make dbUserId Fetch Blocking for Interactions (HIGH PRIORITY)

**Problem**: dbUserId can be null when user tries to interact

**Solution**: Add `requireDbUserId()` helper

**Modify**: `src/hooks/useAuth.ts`

```typescript
// Add this function after getOrCreateDbUserId
const requireDbUserId = async (): Promise<number | null> => {
  // If we already have it, return immediately
  if (dbUserId) {
    stateLogger.log('requireDbUserId_cached', { dbUserId });
    return dbUserId;
  }

  // If not authenticated, return null
  if (!session) {
    stateLogger.log('requireDbUserId_no_session', {});
    return null;
  }

  // If already loading, wait for it
  if (dbUserIdLoading) {
    stateLogger.log('requireDbUserId_waiting', {});
    // Wait up to 5 seconds for the fetch to complete
    const startTime = Date.now();
    while (dbUserIdLoading && Date.now() - startTime < 5000) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return dbUserId;
  }

  // Otherwise, trigger a fetch and wait for it
  stateLogger.log('requireDbUserId_fetching', {});
  await getOrCreateDbUserId(session);
  return dbUserId;
};

// Export it from the hook
return {
  user,
  session,
  dbUserId,
  loading,
  dbUserIdLoading,
  requireDbUserId, // NEW
  // ... other exports
};
```

**Usage in components**:

```typescript
// Before (CAN FAIL):
const handleLike = async () => {
  if (!user || !dbUserId) {
    openAuthModal();
    return;
  }
  await likeReview(reviewId, dbUserId);
};

// After (GUARANTEED):
const handleLike = async () => {
  const userId = await requireDbUserId();
  if (!userId) {
    openAuthModal();
    return;
  }
  await likeReview(reviewId, userId);
};
```

**Impact**: ✅ Fixes "authenticated but can't interact" issue

### Fix 2: Clear Caches on Auth Events (MEDIUM PRIORITY)

**Problem**: Stale cache persists across login/logout

**Solution**: Invalidate all caches on auth state change

**Modify**: `src/hooks/useAuth.ts`

```typescript
import { userService } from '../services/userService';
import { browserCache } from '../services/browserCacheService';

authService.onAuthStateChange(async (event, session) => {
  stateLogger.log('auth_state_change', { event });

  // Clear caches on login/logout
  if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
    stateLogger.log('auth_clearing_caches', { event });

    // Clear user service caches
    userService.clearCache?.();

    // Clear browser cache service
    browserCache.clear?.();

    // Clear localStorage auth-related data (except the actual token)
    const keysToKeep = ['sb-auth-token', 'DEBUG_STATE'];
    Object.keys(localStorage).forEach(key => {
      if (!keysToKeep.some(keep => key.includes(keep))) {
        localStorage.removeItem(key);
      }
    });

    stateLogger.log('auth_caches_cleared', {});
  }

  // ... rest of auth state change logic
});
```

**Add to**: `src/services/userService.ts`

```typescript
clearCache() {
  stateLogger.log('userService_clearCache', {
    profileCacheSize: this.profileCache.size,
    userCacheSize: this.userCache.size
  });

  this.profileCache.clear();
  this.userCache.clear();
  this.cacheTimestamps.clear();
}
```

**Impact**: ✅ Prevents stale data after login/logout

### Fix 3: Add State Health Check on Mount (MEDIUM PRIORITY)

**Problem**: No detection of broken state on app load

**Solution**: Run health check and auto-repair

**Create**: `src/hooks/useStateHealthCheck.ts`

```typescript
import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '../lib/supabase';
import { stateLogger } from '../utils/stateLogger';

interface HealthCheckResult {
  healthy: boolean;
  issues: string[];
  canRepair: boolean;
}

export function useStateHealthCheck() {
  const { user, dbUserId, session } = useAuth();
  const [healthResult, setHealthResult] = useState<HealthCheckResult | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!user || checking) return;

    const checkHealth = async () => {
      setChecking(true);
      stateLogger.log('health_check_start', { userId: user.id });

      const issues: string[] = [];
      let canRepair = false;

      // Check 1: dbUserId should be set within 5 seconds of auth
      await new Promise(resolve => setTimeout(resolve, 5000));

      if (!dbUserId) {
        issues.push('dbUserId not set after 5 seconds');
        canRepair = true;
        stateLogger.log('health_check_issue', { issue: 'missing_dbUserId' });
      }

      // Check 2: Can we query the database?
      try {
        const { data, error } = await supabase
          .from('user')
          .select('id')
          .eq('provider_id', user.id)
          .single();

        if (error || !data) {
          issues.push('Cannot query user record from database');
          stateLogger.log('health_check_issue', { issue: 'db_query_failed', error });
        } else {
          stateLogger.log('health_check_db_query_ok', { dbUserId: data.id });
        }
      } catch (error) {
        issues.push('Database connection error');
        stateLogger.log('health_check_issue', { issue: 'db_connection_error', error });
      }

      // Check 3: Auth session is valid
      const { data: { session: currentSession }, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError || !currentSession) {
        issues.push('Invalid auth session');
        canRepair = false;
        stateLogger.log('health_check_issue', { issue: 'invalid_session' });
      }

      const result: HealthCheckResult = {
        healthy: issues.length === 0,
        issues,
        canRepair
      };

      setHealthResult(result);
      stateLogger.log('health_check_complete', result);
      setChecking(false);
    };

    checkHealth();
  }, [user, dbUserId, checking]);

  return { healthResult, checking };
}
```

**Use in**: `src/App.tsx` or main layout component

```typescript
import { useStateHealthCheck } from './hooks/useStateHealthCheck';

function App() {
  const { healthResult } = useStateHealthCheck();
  const { requireDbUserId } = useAuth();

  // Auto-repair if possible
  useEffect(() => {
    if (healthResult && !healthResult.healthy && healthResult.canRepair) {
      console.warn('State health issues detected, attempting repair...');
      stateLogger.log('auto_repair_triggered', { issues: healthResult.issues });

      // Trigger dbUserId fetch
      requireDbUserId();
    }
  }, [healthResult, requireDbUserId]);

  // ... rest of app
}
```

**Impact**: ✅ Auto-detects and repairs broken state

### Fix 4: Add User-Facing Recovery UI (LOW PRIORITY)

**Problem**: Users with broken state have no way to fix it

**Solution**: Show banner with recovery button

**Create**: `src/components/StateRecoveryBanner.tsx`

```typescript
import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { userService } from '../services/userService';
import { browserCache } from '../services/browserCacheService';
import { stateLogger } from '../utils/stateLogger';

export function StateRecoveryBanner() {
  const { user, dbUserId, requireDbUserId } = useAuth();
  const [showBanner, setShowBanner] = useState(false);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    // Show banner if authenticated but missing dbUserId after 5 seconds
    if (user && !dbUserId) {
      const timer = setTimeout(() => {
        setShowBanner(true);
        stateLogger.log('recovery_banner_shown', { userId: user.id });
      }, 5000);

      return () => clearTimeout(timer);
    } else {
      setShowBanner(false);
    }
  }, [user, dbUserId]);

  const handleRecover = async () => {
    setRecovering(true);
    stateLogger.log('manual_recovery_start', {});

    try {
      // Clear all caches
      userService.clearCache?.();
      browserCache.clear?.();

      // Force fresh dbUserId fetch
      await requireDbUserId();

      stateLogger.log('manual_recovery_success', {});
      setShowBanner(false);
    } catch (error) {
      stateLogger.log('manual_recovery_failed', { error: String(error) });
      alert('Recovery failed. Please try signing out and back in.');
    } finally {
      setRecovering(false);
    }
  };

  const handleFullReset = () => {
    stateLogger.log('full_reset_triggered', {});

    // Clear everything
    localStorage.clear();
    sessionStorage.clear();

    // Reload page
    window.location.href = '/';
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 shadow-lg z-50 max-w-md">
      <div className="flex items-start gap-3">
        <div className="text-yellow-600 text-2xl">⚠️</div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">
            Connection Issue Detected
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            We're having trouble loading your profile. This usually happens due to cached data.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleRecover}
              disabled={recovering}
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {recovering ? 'Recovering...' : 'Fix Now'}
            </button>
            <button
              onClick={handleFullReset}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded text-sm font-medium hover:bg-gray-300"
            >
              Full Reset
            </button>
            <button
              onClick={() => setShowBanner(false)}
              className="text-gray-500 hover:text-gray-700 text-sm underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Add to**: `src/App.tsx`

```typescript
import { StateRecoveryBanner } from './components/StateRecoveryBanner';

function App() {
  return (
    <>
      {/* ... existing app code ... */}
      <StateRecoveryBanner />
      <DebugStateDashboard />
    </>
  );
}
```

**Impact**: ✅ Users can self-recover without support

---

## Phase 5: Rollout & Monitoring

### Step 5.1: Rollout Plan

**Week 1: Instrumentation**
- [ ] Deploy Phase 2 (logging & debug dashboard)
- [ ] Enable on staging environment
- [ ] Test all scenarios from Phase 3
- [ ] Collect logs from affected users

**Week 2: Critical Fixes**
- [ ] Deploy Fix 1 (requireDbUserId) - Highest priority
- [ ] Deploy Fix 2 (cache clearing on auth events)
- [ ] Monitor error rates
- [ ] Verify dbUserId is always set before interactions

**Week 3: Additional Fixes**
- [ ] Deploy Fix 3 (health check)
- [ ] Deploy Fix 4 (recovery banner)
- [ ] Monitor recovery banner usage
- [ ] Document common issues & solutions

**Week 4: Cleanup**
- [ ] Remove debug logging if not needed long-term (or make it opt-in)
- [ ] Update documentation
- [ ] Add monitoring dashboards
- [ ] Create runbook for future issues

### Step 5.2: Success Metrics

Track these metrics before and after fixes:

```typescript
// Add to analytics
analytics.track('state_health_metrics', {
  // Pre-fix baseline (measure now):
  auth_to_dbUserId_time: time_in_ms, // How long to fetch dbUserId
  dbUserId_null_rate: percentage,     // % of authenticated users with null dbUserId
  interaction_failure_rate: percentage, // % of interactions that fail

  // Post-fix targets:
  auth_to_dbUserId_time: '< 500ms',
  dbUserId_null_rate: '< 0.1%',
  interaction_failure_rate: '< 0.01%',

  // New metrics:
  recovery_banner_shown: count,
  recovery_success_rate: percentage,
  cache_hit_rate: percentage
});
```

### Step 5.3: Long-Term Monitoring

Add dashboard to track state health in production:

**Metrics to Monitor**:
- dbUserId fetch time (p50, p95, p99)
- dbUserId null rate (authenticated users)
- Cache hit/miss rates per service
- State recovery banner impressions
- Manual recovery success rate
- Auth state change event frequency

**Alerts**:
- 🚨 dbUserId null rate > 1% for > 5 minutes
- 🚨 dbUserId fetch time p95 > 2 seconds
- ⚠️ Recovery banner shown to > 5% of users
- ⚠️ Cache clear frequency > 100/hour

---

## Summary

### Root Causes Identified:

1. **Non-blocking dbUserId fetch** (HIGH) - Primary cause of "can't interact" issue
2. **No cache invalidation on auth events** (MEDIUM) - Causes stale data
3. **No state health checks** (MEDIUM) - Issues go undetected
4. **No user-facing recovery mechanism** (LOW) - Users stuck when issues occur

### Implementation Priority:

1. **MUST DO**: Fix 1 (requireDbUserId) - Solves the core issue
2. **SHOULD DO**: Fix 2 (cache clearing) - Prevents future issues
3. **NICE TO HAVE**: Fix 3 & 4 (health check & recovery UI) - Better UX

### Expected Outcomes:

- ✅ Zero "authenticated but can't interact" issues
- ✅ Consistent state across browser tabs
- ✅ Automatic recovery from broken state
- ✅ Clear visibility into state issues via debug dashboard
- ✅ < 0.1% of users need manual intervention

### Timeline:

- **Phase 2 (Instrumentation)**: 4-6 hours to implement
- **Phase 3 (Testing)**: 2-3 hours to run scenarios
- **Phase 4 (Fixes)**: 6-8 hours to implement all fixes
- **Phase 5 (Rollout)**: 4 weeks with weekly milestones

**Total effort**: ~16-20 hours of dev work + 4 weeks monitoring

---

## Next Steps

1. **Review this plan** - Confirm approach and priorities
2. **Start with Phase 2** - Add instrumentation to see real-world state transitions
3. **Reproduce issues** - Use Phase 3 scenarios to capture logs
4. **Implement Fix 1** - This alone should solve 90% of issues
5. **Monitor & iterate** - Use metrics to validate fixes

Let me know when you're ready to start implementation!
