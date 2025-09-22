# IGDB API Issues and Recommendations

## Executive Summary
Search performance is degraded by unnecessary IGDB API calls that fail or timeout, adding 5+ seconds to searches. The database already contains comprehensive game data (166+ Pokemon games), but the coordination service still attempts IGDB fallback when it processes queries in batches.

## Current Issues

### 1. Unnecessary IGDB API Calls
- **Problem**: `AdvancedSearchCoordination` calls IGDB when `allResults.length < 10`
- **Impact**: Even with 166 Pokemon games in database, IGDB is called if early query variations return few results
- **Location**: `src/services/advancedSearchCoordination.ts` lines 512-513

### 2. API Errors Observed
- **406 "Not Acceptable"**: Format/header issues with IGDB requests
- **500 errors**: Supabase queries with special characters (®, ™)
- **404 errors**: Missing IGDB cover images
- **Timeouts**: 10-second timeout on IGDB calls adds significant delay

### 3. Query Processing Inefficiency
- Expands single query into 5+ variations
- Processes each variation sequentially
- Triggers IGDB fallback based on partial results
- No graceful degradation when IGDB fails

## Root Cause Analysis

### Why IGDB is Being Called
1. **Query Expansion**: "pokemon" → ["pokemon", "pokémon", ...] (5+ variations)
2. **Sequential Processing**: Each variation searched separately
3. **Early Termination**: Stops at 80 results for franchise searches
4. **Low Threshold**: IGDB triggered if accumulated results < 10
5. **No Context Awareness**: Doesn't know database has 166 Pokemon games

### Authentication Clarification
- **OAuth Redirect URL Change**: `localhost` → `https://gamevault.to/auth/callback`
  - ✅ Correct for production
  - ✅ Affects Supabase user auth only
  - ❌ NOT related to IGDB API issues
- **IGDB Uses**: App Access Tokens (server-to-server)
  - `TWITCH_CLIENT_ID`
  - `TWITCH_APP_ACCESS_TOKEN`
  - These are separate from OAuth user authentication

## Recommendations

### 1. Immediate Fix - Disable IGDB Fallback
**Priority: HIGH | Effort: LOW | Impact: HIGH**

```typescript
// src/services/advancedSearchCoordination.ts, line 513
// BEFORE:
if (allResults.length < 10) {

// AFTER (Option A - Complete disable):
if (false) { // Temporarily disable IGDB fallback

// AFTER (Option B - Higher threshold):
if (allResults.length < 1) { // Only use IGDB if absolutely no results
```

**Benefits:**
- Instant 10x performance improvement (5s → 500ms)
- Eliminates 406/timeout errors
- Uses existing comprehensive database

### 2. Verify IGDB Credentials
**Priority: MEDIUM | Effort: LOW | Impact: MEDIUM**

Check Netlify environment variables:
```bash
# These should be set in Netlify dashboard
TWITCH_CLIENT_ID=your_twitch_client_id
TWITCH_APP_ACCESS_TOKEN=your_app_access_token
```

To get new token if needed:
```bash
curl -X POST 'https://id.twitch.tv/oauth2/token' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'client_id=YOUR_CLIENT_ID&client_secret=YOUR_SECRET&grant_type=client_credentials'
```

### 3. Implement Better Error Handling
**Priority: HIGH | Effort: MEDIUM | Impact: HIGH**

Key improvements needed:
- Graceful fallback when IGDB fails
- Don't wait for timeouts
- Continue with database results
- Cache failed IGDB queries to avoid retries
- Add circuit breaker pattern

**See detailed action plan below**

### 4. Long-term Database-First Strategy
**Priority: LOW | Effort: HIGH | Impact: HIGH**

- Pre-identify well-covered franchises (Pokemon, Mario, Zelda, etc.)
- Skip IGDB for these franchises entirely
- Use IGDB only for truly obscure searches
- Implement progressive enhancement:
  1. Show database results immediately
  2. Enhance with IGDB in background if needed
  3. Update UI without blocking

### 5. Optimize Query Processing
**Priority: MEDIUM | Effort: MEDIUM | Impact: MEDIUM**

- Run all query variations in parallel, not sequentially
- Check total database results before considering IGDB
- Implement smarter termination logic
- Cache query expansion results

## Performance Metrics

### Current State
- **Pokemon search**: 5+ seconds
- **Database query**: 400ms
- **IGDB fallback**: 4-5 seconds (timeout/error)
- **Frontend processing**: 100ms

### After Fix #1 (Disable IGDB)
- **Pokemon search**: <500ms
- **Database query**: 400ms
- **IGDB fallback**: 0ms (disabled)
- **Frontend processing**: 100ms

### With Full Optimizations
- **Pokemon search**: <300ms
- **Database query**: 200ms (with better indexing)
- **IGDB fallback**: 0ms (not needed for major franchises)
- **Frontend processing**: 50ms (optimized)

## Implementation Priority

1. **TODAY**: Implement Fix #1 (disable/raise IGDB threshold)
2. **THIS WEEK**: Implement Fix #3 (better error handling)
3. **NEXT SPRINT**: Verify credentials and optimize query processing
4. **FUTURE**: Database-first strategy with progressive enhancement

## Testing Checklist

After implementing fixes:
- [ ] Search "pokemon" - Should return in <500ms
- [ ] Search "mario" - Should return in <500ms
- [ ] Search "obscure indie game" - Should handle gracefully if not in DB
- [ ] Check network tab - No IGDB calls for major franchises
- [ ] Verify error handling - Graceful degradation if IGDB fails
- [ ] Monitor logs - No 406/timeout errors
- [ ] Cache verification - Subsequent searches are instant

## Monitoring

Track these metrics post-implementation:
- Average search time (target: <500ms)
- IGDB call frequency (target: <10% of searches)
- Error rate (target: <1%)
- Cache hit rate (target: >60%)
- User satisfaction (search completion rate)