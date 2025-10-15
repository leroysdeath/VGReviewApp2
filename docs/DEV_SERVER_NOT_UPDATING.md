# Dev Server Not Picking Up Code Changes

## Problem

Even in incognito mode, the debug logs aren't appearing. This means the dev server is serving **cached/stale code** despite:
- ✅ Code changes saved
- ✅ Vite cache cleared
- ✅ Dev server restarted

## Root Cause

The dev server (netlify dev or vite) has cached the build and isn't detecting file changes.

## Solution - Nuclear Restart

### Step 1: Kill All Dev Processes

```bash
# Windows (in Git Bash or PowerShell):
# Find and kill any node/netlify/vite processes
taskkill /F /IM node.exe
taskkill /F /IM netlify.exe

# If that doesn't work, manually:
# 1. Press Ctrl+Alt+Delete
# 2. Open Task Manager
# 3. Find and end all "Node.js" and "netlify" processes
```

### Step 2: Clear All Caches (Already Done)

```bash
rm -rf dist
rm -rf node_modules/.vite
```

### Step 3: Restart Dev Server with Force Rebuild

```bash
# Make sure you're in the project directory
cd /c/Users/thoma/Desktop/Unmessed\ VGReviewApp

# Start fresh
netlify dev --force
```

### Step 4: Verify Code Is Updated

Once the server starts, open browser console and look for:
```
🔄 Calling get_or_create_user function
ℹ️ Skipping RPC function, using direct database operations
```

If you DON'T see these logs, the old code is still running.

## Alternative - Check What's Actually Running

Run this in the project directory to verify the file has the changes:

```bash
grep -A 5 "const DEBUG_USER_SERVICE" src/services/userService.ts
```

You should see:
```
const DEBUG_USER_SERVICE = true;
```

If it says `false`, the file changes were lost or not saved.

## Why HTTP 400 Errors Persist

The HTTP 400 "Bad Request" errors are happening because:

1. **Old code is running** - which doesn't have the RPC bypass
2. **Queries are malformed** - the `provider_id` column type might be causing issues
3. **RLS is still blocking somehow** - despite the policies being fixed

Once the new code runs:
- It will skip the RPC function entirely
- Use direct SELECT queries instead
- Have much better error logging to tell us exactly what's wrong

## Critical Next Step

**Kill ALL Node processes and restart** - this is the only way to ensure the new code runs.
