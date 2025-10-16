# Complete Cache Clearing Plan

## Problem
Changes to RLS policies and code aren't taking effect for leroysdeath user.

## Caching Layers to Clear

### 1. Browser Caches (Client-Side)
**Location**: Your browser
**What to clear**:
- Service Worker cache
- HTTP cache
- LocalStorage
- SessionStorage
- IndexedDB

**How to clear**:
```javascript
// In browser console:
// 1. Clear debug state
stateLogger.clear()

// 2. Clear all localStorage
localStorage.clear()

// 3. Clear all sessionStorage
sessionStorage.clear()

// 4. Unregister service workers
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(r => r.unregister())
})

// 5. Hard reload (Ctrl+Shift+R or Cmd+Shift+R)
```

**Or use browser DevTools**:
1. Open DevTools (F12)
2. Go to "Application" tab
3. Click "Clear storage" in left sidebar
4. Check all boxes
5. Click "Clear site data"
6. Close and reopen browser

### 2. Vite Dev Server Cache
**Location**: Your dev server
**What to clear**: Bundled JavaScript cache

**How to clear**:
```bash
# Stop the dev server (Ctrl+C)
# Clear Vite cache
rm -rf node_modules/.vite

# Or on Windows:
rmdir /s /q node_modules\.vite

# Restart dev server
npm run dev
```

### 3. Build Artifacts
**Location**: Your project directory
**What to clear**: Old build files

**How to clear**:
```bash
# Clear build directory
rm -rf dist

# Or on Windows:
rmdir /s /q dist

# Rebuild
npm run build
```

### 4. Supabase Connection Pool Cache
**Location**: Supabase server
**What to clear**: Database connection cache

**How to clear**:
- RLS policy changes should be immediate
- But connections might be pooled
- **Wait 30 seconds** after applying RLS changes
- Or restart your Supabase project (Dashboard → Settings → General → Restart project)

### 5. Supabase JS Client Cache
**Location**: In-memory in browser
**What's cached**: Auth tokens, session data

**How to clear**:
```javascript
// Force sign out and back in
// This refreshes the auth token and session
```

### 6. Code Changes Not Applied
**Location**: Your editor → dev server
**Issue**: Code changes in userService.ts not reflected

**How to verify**:
```bash
# Check if the file was actually saved
git diff src/services/userService.ts

# You should see the "TEMP FIX" comment we added
```

## Step-by-Step Fix Plan

### Phase 1: Verify Database Changes Applied
```sql
-- Run in Supabase SQL Editor
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'user'
ORDER BY policyname;
```

**Expected**: Should show 3 policies (authenticated_all, anon_select, anon_insert)
**If not**: Re-run FIX_RLS_COMPLETE_RESET.sql

### Phase 2: Clear All Browser Caches
```bash
# In browser console (F12):
localStorage.clear()
sessionStorage.clear()
navigator.serviceWorker.getRegistrations().then(r => r.forEach(x => x.unregister()))

# Then close browser completely and reopen
```

### Phase 3: Clear Dev Server Cache
```bash
# In terminal:
# Stop dev server (Ctrl+C)

# Clear Vite cache (Windows):
rmdir /s /q node_modules\.vite

# Restart dev server:
npm run dev
```

### Phase 4: Test with Fresh Session
1. Open browser in **Incognito/Private mode**
2. Navigate to localhost:5173 (or your dev URL)
3. Open console (F12)
4. Enable debug: `localStorage.setItem('DEBUG_STATE', 'true')`
5. Reload page
6. Log in as leroysdeath
7. Check debug logs: `stateLogger.exportLogs()`

### Phase 5: If Still Failing - Enable Debug Mode
```javascript
// In userService.ts, change line 28:
const DEBUG_USER_SERVICE = true;  // Change from false to true
```

This will show console logs for every database operation, telling us exactly what's failing.

## Quick Nuclear Option (If All Else Fails)

```bash
# Terminal:
# 1. Stop dev server
Ctrl+C

# 2. Clear everything
rm -rf node_modules/.vite
rm -rf dist

# 3. Restart
npm run dev

# Browser:
# 1. Close browser completely
# 2. Reopen browser
# 3. Open DevTools (F12)
# 4. Go to Application tab
# 5. Click "Clear storage"
# 6. Check all boxes
# 7. Click "Clear site data"
# 8. Navigate to localhost:5173
# 9. Test login
```

## Diagnostic: Check What's Actually Running

```bash
# In src/services/userService.ts
# Find the tryDatabaseFunction method (around line 258)
# You should see this comment:
# "TEMP FIX: Skip RPC function and go straight to manual operations"

# If you DON'T see that comment, the code changes haven't been applied
```

## Most Likely Issues

### Issue 1: Browser Cache
**Probability**: 70%
**Fix**: Clear browser storage + hard reload

### Issue 2: Vite Cache
**Probability**: 20%
**Fix**: Delete node_modules/.vite + restart dev server

### Issue 3: RLS Not Applied
**Probability**: 10%
**Fix**: Re-run FIX_RLS_COMPLETE_RESET.sql + wait 30 seconds

## How to Verify Fix Worked

After clearing caches, you should see:
1. **Debug logs show**: `userService_manual_success` with `dbUserId: 1`
2. **Profile link shows**: `/user/1` (not `/user/null`)
3. **No more**: "Bad Request" errors in console
4. **Debug dashboard shows**: `DB User ID: ✓ 1`

## Next Steps

1. Run Phase 1 (verify database)
2. Run Phase 2 (clear browser)
3. Run Phase 3 (clear dev server)
4. Run Phase 4 (test in incognito)
5. Share results

If still failing after all this, we'll enable DEBUG_USER_SERVICE mode to see exactly what's happening.
