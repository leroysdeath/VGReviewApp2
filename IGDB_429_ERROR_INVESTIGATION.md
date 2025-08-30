# IGDB API 429 Rate Limit Error - Investigation Report

## Issue Summary
The application is experiencing 429 "Too Many Requests" errors from the IGDB API, particularly when accessing game details via `getGameById`. This occurs on pages like ReviewPage and ReviewFormPage.

## Root Cause
The 429 error is happening because the application makes repeated calls to the IGDB API without any caching or rate limiting mechanism for game data lookups. Each page load or navigation triggers fresh API calls, even for recently fetched data.

## Key Findings

### 1. No Caching for IGDB Game Data
- **Current State**: The `igdbService.getGameById()` function makes a direct API call every time without any caching layer
- **Comparison**: User profiles have caching (`profileCache.ts`), but game data does not
- **Impact**: Each page load triggers a fresh API call even if the same game was just fetched seconds ago

### 2. Multiple Call Points
The following components trigger IGDB API calls:
- `ReviewPage.tsx` - Line 169: `gameDataService.getGameByIGDBId(gameIdNum)`
- `ReviewFormPage.tsx` - Line 105: `gameDataService.getGameByIGDBId(parseInt(gameId))`
- `gameDataService.ts` - Multiple fallback calls to `igdbService.getGameById()`:
  - Line 88: When game not found by ID
  - Line 185: When game not found by IGDB ID  
  - Line 709: Direct IGDB fetch attempt

### 3. Call Flow Pattern
```
User Interface (ReviewPage/ReviewFormPage)
    ↓
gameDataService.getGameByIGDBId()
    ↓
Check Supabase Database First
    ↓
If Not Found in Database
    ↓
igdbService.getGameById()
    ↓
Direct IGDB API Call via Netlify Function
    ↓
No Cache Check → Direct API Request → Potential 429 Error
```

### 4. No Rate Limiting Implementation
- **Netlify Function**: `igdb-search.cjs` doesn't implement any rate limiting or request throttling
- **No Retry Logic**: Failed requests aren't retried with exponential backoff
- **No Request Queuing**: Multiple simultaneous requests aren't queued or batched
- **Raw Error Propagation**: 429 errors are passed directly to the client without handling

### 5. Request Amplification Factors
- **New Games**: When a game isn't in Supabase, every user viewing it triggers an IGDB API call
- **Concurrent Users**: Multiple users viewing the same new game simultaneously create parallel API requests
- **Navigation Patterns**: Users navigating back/forth between pages trigger repeated API calls
- **No Deduplication**: Identical requests made in quick succession aren't deduplicated

## Why This Is Happening Now

The 429 errors indicate IGDB API rate limits are being exceeded. Likely causes include:
1. **Increased Traffic**: More users accessing the application
2. **New Game Reviews**: Users reviewing games not yet cached in Supabase database
3. **Rapid Navigation**: Users quickly browsing between different game reviews
4. **Retry Storms**: Failed requests being retried too quickly without backoff

## Recommended Solutions

### 1. Implement Game Data Caching Service
Create a caching layer similar to the existing `profileCache.ts`:
```typescript
// gameCache.ts
class GameCacheService {
  private cache: Map<number, CachedGame> = new Map();
  private CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
  
  async getGame(igdbId: number): Promise<Game | null> {
    // Check cache first
    // Return cached data if valid
    // Otherwise fetch and cache
  }
}
```

### 2. Add Rate Limiting to Netlify Function
Implement request throttling in `igdb-search.cjs`:
- Track requests per minute
- Queue requests when approaching limits
- Return cached responses when rate limited
- Implement exponential backoff for retries

### 3. Enhance Database Strategy
- **Permanent Storage**: Store all fetched IGDB games in Supabase permanently
- **Background Sync**: Implement periodic background updates instead of real-time fetches
- **Fallback Data**: Show partial/cached data when API is unavailable

### 4. Implement Smart Error Handling
```typescript
// Handle 429 errors gracefully
if (error.status === 429) {
  // Check cache for stale data
  // Show user-friendly message
  // Schedule retry with backoff
  // Log for monitoring
}
```

### 5. Request Deduplication
- Implement request coalescing for identical concurrent requests
- Use Promise caching for in-flight requests
- Batch similar requests when possible

## Implementation Priority

1. **Immediate** (Stop the bleeding):
   - Add basic in-memory caching to `igdbService`
   - Implement exponential backoff for 429 errors

2. **Short-term** (Reduce API calls):
   - Create `gameCache.ts` service
   - Store fetched games in Supabase

3. **Long-term** (Optimize):
   - Implement request queuing and rate limiting
   - Add monitoring and alerting for API usage
   - Consider CDN caching for game data

## Files Requiring Changes

- `src/services/igdbService.ts` - Add caching layer
- `src/services/gameDataService.ts` - Integrate cache checks
- `netlify/functions/igdb-search.cjs` - Add rate limiting
- New file: `src/services/gameCache.ts` - Caching service
- `src/pages/ReviewPage.tsx` - Error handling improvements
- `src/pages/ReviewFormPage.tsx` - Error handling improvements

## Monitoring Recommendations

1. Track IGDB API call frequency
2. Monitor 429 error rates
3. Measure cache hit/miss ratios
4. Alert on rate limit approaching

## Temporary Workaround

Until a permanent fix is implemented, users experiencing 429 errors can:
1. Wait 60 seconds before retrying
2. Use games already in the database
3. Avoid rapid navigation between pages

---

*Investigation Date: 2025-01-30*  
*Status: Investigation Complete - Implementation Pending*