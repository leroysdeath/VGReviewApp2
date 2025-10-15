# Database Errors Diagnosis & Root Causes

## Executive Summary

You have **three interconnected issues** stemming from user authentication and database access patterns. All three are **fixable with targeted changes** to permissions, CSP, and method exports.

---

## 🔴 Issue #1: Anonymous User Permission Gap

### The Error
```
POST https://cqufmmnguumyhbkhgwdc.supabase.co/rest/v1/rpc/get_or_create_user
[HTTP/2 404] (x5)

Error fetching review: NetworkError when attempting to fetch resource (x4)
Error fetching comments: NetworkError when attempting to fetch resource (x4)
```

### Root Cause
**RPC function `get_or_create_user` only has `authenticated` role permission**

Migration file: `supabase/migrations/20250822_create_get_or_create_user_function.sql:61`
```sql
GRANT EXECUTE ON FUNCTION get_or_create_user(UUID, TEXT, TEXT, TEXT) TO authenticated;
-- ❌ Missing: GRANT EXECUTE ... TO anon;
```

### Why This Breaks Everything

1. **Anonymous user loads review page**
2. `reviewService.getReviews()` tries to fetch review data
3. Review fetching calls `getReview()` → needs user context
4. User context undefined → tries to fetch user anyway
5. RPC call rejected with 404 (no `anon` permission)
6. Auth context becomes undefined
7. **Cascade failure:** All subsequent fetches fail with NetworkError
8. Pattern repeats for comments

### User Experience Impact
- ❌ Anonymous visitors see no reviews/comments
- ❌ Error spam in console
- ❌ Page appears broken
- ✅ Works fine after login (authenticated role has permission)

### The Pattern (4 reviews + 4 comments = 8 errors)
Suggests you're loading a page with 4 reviews:
- Each review tries to load user data → 404
- Each review tries to load comments → NetworkError (broken state)

---

## 🔴 Issue #2: CSP Blocking ipapi.co

### The Error
```
Content-Security-Policy: The page's settings blocked loading of a resource (connect-src) at https://ipapi.co/country/
```

### Root Cause
**Privacy service calls ipapi.co for geolocation, but CSP doesn't allow it**

Code location: `src/services/privacyService.ts:282`
```typescript
const response = await fetch('https://ipapi.co/country/', {
  method: 'GET',
  headers: { 'Accept': 'text/plain' }
});
```

CSP configuration: `netlify.toml:50`
```toml
Content-Security-Policy = "... connect-src 'self' https://*.supabase.co https://api.igdb.com ..."
# ❌ Missing: https://ipapi.co
```

### When This Fires
- During user signup (privacy consent flow)
- When logging user country for GDPR compliance
- Possibly during profile creation

### User Experience Impact
- ⚠️ Geolocation fails silently
- ⚠️ Country not logged for privacy audit
- ⚠️ May break signup flow if geolocation is required

---

## 🔴 Issue #3: Missing Method Export

### The Error
```
ne.getOrCreateDatabaseUser is not a function
```

### Root Cause
**authService.ts calls `userService.getOrCreateDatabaseUser()` but that method doesn't exist**

Code location: `src/services/authService.ts:46`
```typescript
if (data.user) {
  const result = await userService.getOrCreateDatabaseUser(data.user);
  //                              ^^^^^^^^^^^^^^^^^^^^^^^^
  // ❌ This method doesn't exist in userService!
}
```

### What Actually Exists
Looking at `userService.ts`, the actual RPC caller is **internal and private**:
```typescript
// src/services/userService.ts (not exported)
private async tryDatabaseFunction(authUser: Session['user']): Promise<UserServiceResult> {
  const rpcPromise = supabase.rpc('get_or_create_user', { ... });
}
```

### Why This Breaks Signup
1. User tries to sign up
2. `authService.signUp()` succeeds with Supabase Auth
3. authService tries to call `userService.getOrCreateDatabaseUser()`
4. **TypeError: Method doesn't exist**
5. Signup appears to succeed but database user isn't created
6. User can't interact with app (no database ID)

---

## 🎯 Architectural Issues Revealed

### Issue A: **Inconsistent User Fetching Pattern**

**Current broken flow:**
```
reviewService.getReviews()
  → reviewService.getReview(reviewId)
    → Always tries to fetch user (even for anonymous)
      → Calls get_or_create_user RPC
        → 404 for anonymous
          → NetworkError cascade
```

**What you want (based on "Explore page fixed" comment):**
```
reviewService.getReviews()
  → Check if user authenticated
    → YES: Fetch full user context
    → NO: Show reviews with minimal user data (username only)
```

### Issue B: **Missing Anonymous-Safe Code Paths**

Your explore page works because it likely:
```typescript
// Explore page pattern (works)
const userId = await getCurrentUserId();
if (!userId) {
  // Anonymous-safe query - just show content
  return fetchGamesWithoutUserContext();
}
```

But reviewService doesn't have this pattern:
```typescript
// reviewService pattern (broken)
const reviews = await fetchReviews(); // Always tries to get users
// ❌ No check for auth state
// ❌ No anonymous fallback
```

### Issue C: **Service Export Mismatch**

`authService` expects `userService` to export `getOrCreateDatabaseUser()`, but it doesn't.

**Two possible reasons:**
1. Method was removed/renamed but authService not updated
2. Method never existed - authService has wrong import

---

## 📊 Impact Analysis

### Current User Experience

| User Type | Can View | Can Interact | Errors |
|-----------|----------|--------------|--------|
| Anonymous | ❌ No | ❌ No | 8+ errors per page |
| Logged In | ✅ Yes | ⚠️ Maybe | 0 errors (if DB user exists) |
| New Signup | ❌ No | ❌ No | TypeError + 404s |

### Expected User Experience (Your Intent)

| User Type | Can View | Can Interact | Errors |
|-----------|----------|--------------|--------|
| Anonymous | ✅ Yes | ❌ No | 0 errors |
| Logged In | ✅ Yes | ✅ Yes | 0 errors |
| New Signup | ✅ Yes | ✅ Yes | 0 errors |

---

## 🔍 Detailed Error Flow Diagram

### Anonymous User Loading Review Page

```
1. Page Load
   └─→ reviewService.getReviews()
        └─→ Fetch reviews from DB ✅
             └─→ For each review:
                  ├─→ reviewService.getReview(id)
                  │    └─→ Needs user context
                  │         └─→ Calls get_or_create_user RPC
                  │              └─→ ❌ 404: No anon permission
                  │                   └─→ Auth context undefined
                  │                        └─→ ❌ NetworkError cascade
                  │
                  └─→ getCommentsForReview(id)
                       └─→ Needs user context (for isLiked)
                            └─→ ❌ NetworkError: Broken state

Result: 4 reviews × 2 fetches = 8 NetworkErrors
```

### New User Signup

```
1. User Submits Signup Form
   └─→ authService.signUp(email, password, username)
        └─→ supabase.auth.signUp() ✅
             └─→ Creates auth.users record ✅
                  └─→ Returns user object ✅
                       └─→ Call userService.getOrCreateDatabaseUser(user)
                            └─→ ❌ TypeError: Function doesn't exist
                                 └─→ Database user NOT created
                                      └─→ User appears logged in but can't interact
                                           └─→ All interactions fail (no DB user ID)
```

---

## 🎯 What Needs To Be Fixed

### Fix #1: Add Anonymous Permission to RPC (REQUIRED)
Allow `anon` role to read user data (but not create)

### Fix #2: Add ipapi.co to CSP Whitelist (REQUIRED)
Enable geolocation for privacy compliance

### Fix #3: Export Missing Method OR Update authService (REQUIRED)
Fix the signup flow so database users are created

### Fix #4: Make Review Fetching Anonymous-Safe (RECOMMENDED)
Add auth checks before calling user-dependent RPCs

### Fix #5: Add Error Boundaries (NICE TO HAVE)
Graceful degradation when RPC calls fail

---

## 🚫 Why This Wasn't Caught Earlier

### Development vs Production Differences

1. **You're usually logged in during dev** → `authenticated` role works
2. **Explore page works** → Created false confidence that anonymous access works
3. **Reviews work after login** → Intermittent issue (only breaks for anonymous)
4. **Signup tested while logged in?** → TypeError only fires on fresh signup

### The "Explore Page Fix" Blind Spot

You mentioned:
> "The explore page used to only work if you were logged in, but doing something with anonymous users fixed it."

That fix **only applied to explore page code**, not to:
- ❌ reviewService
- ❌ commentService
- ❌ user profile fetching
- ❌ authService signup flow

**The fix needs to be applied to ALL services that fetch user data.**

---

## 🔧 Prevention Strategy

### Long-term Architectural Fix

**Principle:** Separate "viewing content" from "interacting with content"

```typescript
// ✅ Good: Anonymous-safe viewing
export const getReviewsAnonymous = async () => {
  // Fetch reviews without user context
  // Show usernames but not user profiles
  // No like counts, no interaction buttons
};

// ✅ Good: Authenticated interactions
export const getReviewsAuthenticated = async (userId: number) => {
  // Fetch reviews WITH user context
  // Include like status, user profiles
  // Enable interaction buttons
};

// ✅ Good: Unified wrapper
export const getReviews = async () => {
  const userId = await getCurrentUserId();
  return userId
    ? getReviewsAuthenticated(userId)
    : getReviewsAnonymous();
};
```

### Testing Checklist

Before deploying future changes, test:
- ✅ Anonymous user can view all pages
- ✅ Anonymous user sees correct "Login to interact" prompts
- ✅ Logged-in user can interact
- ✅ New signup creates database user
- ✅ No console errors for anonymous users
- ✅ CSP doesn't block required APIs

---

## Next Steps

1. **Choose fix approach** for each issue
2. **Test fixes locally** with:
   - Anonymous browsing (incognito mode)
   - New user signup
   - Logged-in interactions
3. **Apply fixes** one at a time
4. **Verify no regressions** on explore page
5. **Document the pattern** for future services

Would you like me to provide the specific code fixes for these issues?
