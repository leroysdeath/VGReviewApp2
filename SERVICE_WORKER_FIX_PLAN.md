# Service Worker Cache Corruption Fix Plan

## Problem Analysis

### Root Cause
Your Service Worker (`sw.js:145`) is trying to serve **old cached JavaScript chunks** that no longer exist after a deployment. This happens because:

1. **Vite generates new chunk filenames** on every build (e.g., `app-services-o1N-yqb0.js` → `app-services-ABC123.js`)
2. **Service Worker cached the old chunk names** before deployment
3. **New deployment deleted old chunks** from the server
4. **SW tries to serve non-existent files** from its cache → 404 → error cascade

### Why This is Critical
- ❌ Email confirmation links fail completely
- ❌ Users see blank white screen
- ❌ New deployments break for existing users until they manually clear cache
- ❌ PWA offline support becomes a liability instead of an asset

### Current SW Strategy (sw.js:144-157)
```javascript
// Network-first for JS chunks (always get latest)
if (url.pathname.includes('/assets/') && url.pathname.endsWith('.js')) {
  event.respondWith(
    fetch(request)
      .then((response) => {
        return response;  // ✅ Network first is correct
      })
      .catch(() => {
        return caches.match(request);  // ❌ PROBLEM: Falls back to stale cache
      })
  );
  return;
}
```

**The Bug**: When network fetch **succeeds but returns 404** (chunk deleted), SW returns the response (404) instead of clearing the cache.

## Comprehensive Fix Strategy

### 1. Immediate User Fix (Manual - You Can Share This)

**For Users Experiencing the Issue:**
```
1. Open Developer Tools (F12)
2. Go to "Application" tab → "Storage"
3. Click "Clear site data"
4. Close all tabs for gamevault.to
5. Reopen the site
```

**Or simpler:**
```
Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
```

### 2. Aggressive SW Cache Busting (Code Fix)

#### Strategy A: Never Cache JS Chunks (Recommended)
Vite already handles JS chunk caching via content-hash filenames. **Don't let SW cache them at all**.

**Benefits:**
- ✅ Always get latest chunks from CDN
- ✅ Netlify CDN caches them efficiently
- ✅ No stale cache issues
- ✅ Simpler SW logic

#### Strategy B: Smart Cache Validation
If offline support for JS is critical, validate cached chunks before serving.

**Benefits:**
- ✅ True offline support
- ✅ Detects stale chunks
- ❌ More complex logic

#### Strategy C: Automatic SW Version Bumping
Force SW to update on every deployment via version number.

**Benefits:**
- ✅ Clean slate on each deploy
- ✅ Prevents version drift
- ❌ Requires build automation

## Recommended Implementation Plan

### Phase 1: Immediate Fix (Deploy Today) ⚡

**Goal**: Stop caching JS chunks entirely, let CDN handle it.

**Files to Modify:**
1. `public/sw.js` - Remove JS chunk caching
2. `public/sw.js` - Bump version to force update
3. Add aggressive cache clearing on SW activation

**Impact**:
- ✅ Fixes email confirmation flow immediately
- ✅ No more stale chunk errors
- ⚠️ JS chunks must be downloaded fresh (but CDN caches them anyway)

### Phase 2: Smart Update Notification (Next Week) 🔔

**Goal**: Notify users when new version available, let them update gracefully.

**Files to Create/Modify:**
1. Create `src/components/UpdateNotification.tsx` - Toast notification component
2. Modify `src/main.tsx` - Wire up notification on SW update
3. Add "Update Available" banner with refresh button

**Impact**:
- ✅ Users see friendly "New version available - Refresh now"
- ✅ No more surprise breakage
- ✅ Better UX for deployments

### Phase 3: Build-Time Version Management (Future) 🔧

**Goal**: Automate SW version bumping during build.

**Files to Create/Modify:**
1. Create `scripts/update-sw-version.js` - Auto-increment SW version
2. Modify `package.json` - Run script on build
3. Modify `vite.config.ts` - Inject build hash into SW

**Impact**:
- ✅ Never manually bump version again
- ✅ Each deployment gets unique SW version
- ✅ Automatic cache invalidation

## Detailed Implementation

### Phase 1 Code Changes

#### 1. Update `public/sw.js` (Lines 5-6)
```javascript
// BEFORE
const CACHE_NAME = 'gamevault-v1.0.2';
const DYNAMIC_CACHE = 'gamevault-dynamic-v1.0.2';

// AFTER - Bump version to force immediate update
const CACHE_NAME = 'gamevault-v1.0.3';
const DYNAMIC_CACHE = 'gamevault-dynamic-v1.0.3';
```

#### 2. Replace JS Chunk Handling (Lines 143-157)
```javascript
// BEFORE (Problematic fallback to cache)
if (url.pathname.includes('/assets/') && url.pathname.endsWith('.js')) {
  event.respondWith(
    fetch(request)
      .then((response) => {
        return response;
      })
      .catch(() => {
        return caches.match(request);  // ❌ Serves stale chunks
      })
  );
  return;
}

// AFTER (Network-only, no caching)
if (url.pathname.includes('/assets/') && url.pathname.endsWith('.js')) {
  event.respondWith(
    fetch(request)
      .then((response) => {
        // If fetch succeeds but returns error (404, 500, etc), clear any stale cache
        if (!response.ok) {
          caches.open(DYNAMIC_CACHE).then(cache => cache.delete(request));
          caches.open(CACHE_NAME).then(cache => cache.delete(request));
        }
        return response;
      })
      .catch((error) => {
        // Network failed completely, clear stale cache
        caches.open(DYNAMIC_CACHE).then(cache => cache.delete(request));
        caches.open(CACHE_NAME).then(cache => cache.delete(request));
        throw error;  // Let browser handle it (will show error)
      })
  );
  return;
}
```

#### 3. Add Aggressive Cache Clearing on Activation (After line 71)
```javascript
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');

  event.waitUntil(
    Promise.all([
      // Clear old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName !== CACHE_NAME && cacheName !== DYNAMIC_CACHE;
            })
            .map((cacheName) => {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      }),
      // ADDITION: Clear all stale JS chunks from current caches
      caches.open(DYNAMIC_CACHE).then(cache => {
        return cache.keys().then(requests => {
          const jsChunkRequests = requests.filter(req =>
            req.url.includes('/assets/') && req.url.endsWith('.js')
          );
          return Promise.all(jsChunkRequests.map(req => {
            console.log('[Service Worker] Clearing stale JS chunk:', req.url);
            return cache.delete(req);
          }));
        });
      }),
      caches.open(CACHE_NAME).then(cache => {
        return cache.keys().then(requests => {
          const jsChunkRequests = requests.filter(req =>
            req.url.includes('/assets/') && req.url.endsWith('.js')
          );
          return Promise.all(jsChunkRequests.map(req => cache.delete(req)));
        });
      })
    ]).then(() => self.clients.claim())
  );
});
```

### Phase 2: Update Notification Component

#### Create `src/components/UpdateNotification.tsx`
```typescript
import { useState, useEffect } from 'react';

export const UpdateNotification = () => {
  const [showUpdate, setShowUpdate] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      // Listen for waiting service worker
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        setShowUpdate(true);
      });

      // Check registration for updates
      navigator.serviceWorker.getRegistration().then(reg => {
        if (reg?.waiting) {
          setShowUpdate(true);
        }
      });
    }
  }, []);

  const handleUpdate = () => {
    // Tell the waiting service worker to skip waiting
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
    }
    window.location.reload();
  };

  if (!showUpdate) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-6 py-4 rounded-lg shadow-lg z-50 animate-slide-up">
      <div className="flex items-center gap-4">
        <div>
          <p className="font-semibold">Update Available</p>
          <p className="text-sm opacity-90">A new version is ready!</p>
        </div>
        <button
          onClick={handleUpdate}
          className="bg-white text-blue-600 px-4 py-2 rounded font-medium hover:bg-blue-50 transition"
        >
          Refresh
        </button>
      </div>
    </div>
  );
};
```

#### Modify `src/main.tsx` (After line 14)
```typescript
// Enhanced update handling
registration.addEventListener('updatefound', () => {
  const newWorker = registration.installing;
  if (newWorker) {
    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        // New service worker available
        console.log('New service worker available. Ready to update.');

        // Dispatch custom event that UpdateNotification component listens to
        window.dispatchEvent(new CustomEvent('sw-update-available'));

        // Auto-refresh after 3 seconds if user doesn't interact
        setTimeout(() => {
          if (confirm('New version available! Refresh now?')) {
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        }, 3000);
      }
    });
  }
});
```

## Testing Plan

### 1. Test Immediate Fix
```bash
# Deploy Phase 1 changes
git add public/sw.js
git commit -m "fix: aggressive SW cache busting for JS chunks"
git push

# Wait for Netlify deploy (3-5 min)

# Test scenarios:
1. Open gamevault.to in incognito
2. Sign up new user
3. Click email confirmation link
4. ✅ Should load without errors

# Verify in DevTools:
- Application tab → Service Workers → Version should be 1.0.3
- Network tab → JS chunks should show 200 status (not from SW)
```

### 2. Test Update Notification (Phase 2)
```bash
# After implementing Phase 2:
1. Open site (gets SW v1.0.3)
2. Deploy new version (v1.0.4)
3. After ~1 minute (update check interval)
4. ✅ Should see "Update Available" notification
5. Click "Refresh"
6. ✅ Should load new version without errors
```

## Rollback Plan

If Phase 1 causes issues:

```javascript
// Emergency rollback - disable SW completely
// In public/sw.js (line 1):
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(names.map(name => caches.delete(name)))
    ).then(() => self.clients.claim())
  );
});

// Don't handle any fetch events
```

Then tell users to hard refresh.

## Long-Term Recommendations

1. **Consider removing SW entirely** if offline support isn't critical
   - Modern browsers cache assets efficiently
   - Netlify CDN provides excellent performance
   - Fewer bugs, less complexity

2. **If keeping SW**, implement all 3 phases:
   - Phase 1: Fixes immediate issues
   - Phase 2: Better UX for updates
   - Phase 3: Prevents future issues

3. **Monitor SW errors** via Sentry or similar:
   ```javascript
   self.addEventListener('error', (error) => {
     // Send to error tracking
   });
   ```

## Success Metrics

After deploying Phase 1:
- ✅ Email confirmation success rate: Should be 99%+
- ✅ JS chunk load errors: Should be <0.1%
- ✅ User complaints about "white screen": Should drop to zero
- ✅ SW version adoption: 80%+ users on latest within 24h

## Timeline

- **Phase 1**: 30 minutes to code + test, deploy immediately
- **Phase 2**: 2-3 hours to implement + test, deploy next week
- **Phase 3**: 4-5 hours to implement + test, deploy when time permits

**Priority: Phase 1 is critical - fix today. Phases 2-3 are nice-to-have.**
