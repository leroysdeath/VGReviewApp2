# Profile Backlog Search 404 Error Fix Plan

## Issue Summary
Users experience continuous 404 errors when searching for games in the profile backlog section. The errors appear for every character typed (b, bu, bub, bubs, bubsy) indicating failed IGDB API calls.

**Error Pattern:**
```
🔍 Enhanced multi-strategy search for: b
🔴 IGDB API Error 404: Not Found
🔴 Query that failed: "b"
🔴 IGDB performBasicSearch error: { query: "b", error: "IGDB API error: 404" }
🔴 IGDB searchGames failed: { query: "b", error: "IGDB API error: 404" }
IGDB search error: Error: IGDB API error: 404
```

## Root Cause Analysis

### Primary Issue: IGDB API Authentication
- **404 errors** indicate the IGDB API endpoint is not found or authentication failed
- Same expired token issue as the sync scripts
- The search functionality relies on IGDB API for game data
- All search queries fail immediately with 404

### Secondary Issues: Search UX Problems  
1. **No debouncing**: Every keystroke triggers an API call
2. **No minimum query length**: Single characters trigger searches
3. **Poor error handling**: Generic error messages to users
4. **No fallback**: No database-only search when IGDB fails

## Action Plan

### Phase 1: Fix IGDB API Authentication (CRITICAL - 15 mins)

#### 1.1 Refresh IGDB Tokens
**Immediate Action Required:**
1. Visit Twitch Developer Console: https://dev.twitch.tv/console
2. Navigate to your IGDB application
3. Generate new Client Credentials OAuth token
4. Update `.env` file:
   ```env
   TWITCH_CLIENT_ID=new_client_id
   TWITCH_APP_ACCESS_TOKEN=new_access_token
   VITE_IGDB_CLIENT_ID=new_client_id
   VITE_IGDB_ACCESS_TOKEN=new_access_token
   ```
5. Restart development server

**Expected Result**: 404 errors should resolve to successful API calls

### Phase 2: Improve Search UX (MEDIUM - 30 mins)

#### 2.1 Add Search Input Debouncing
**File**: `src/components/GamePickerModal.tsx`
**Location**: Around line 180-190 (search input handler)

```typescript
// Add debouncing to prevent API spam
const [debouncedQuery, setDebouncedQuery] = useState('');

useEffect(() => {
  const timer = setTimeout(() => {
    if (searchQuery.length >= 3) { // Minimum 3 characters
      setDebouncedQuery(searchQuery);
    } else {
      setDebouncedQuery('');
    }
  }, 500); // 500ms delay

  return () => clearTimeout(timer);
}, [searchQuery]);

// Use debouncedQuery for API calls instead of searchQuery
useEffect(() => {
  if (debouncedQuery) {
    performSearch(debouncedQuery);
  } else {
    setIgdbGames([]);
  }
}, [debouncedQuery]);
```

#### 2.2 Add Minimum Query Length Validation
- Prevent API calls for queries shorter than 3 characters
- Show helpful message: "Type at least 3 characters to search"
- Clear results when query is too short

### Phase 3: Add Fallback Search Strategy (MEDIUM - 45 mins)

#### 3.1 Database-Only Search Fallback
**File**: `src/components/GamePickerModal.tsx`
**Enhancement**: When IGDB fails, search local database

```typescript
const searchWithFallback = async (query: string) => {
  try {
    // Primary: IGDB search
    const igdbResults = await igdbService.searchGames(query, 20);
    setIgdbGames(igdbResults);
  } catch (igdbError) {
    console.log('IGDB failed, trying database fallback');
    
    try {
      // Fallback: Database search
      const { data: dbGames } = await supabase
        .from('game')
        .select('id, igdb_id, name, cover_url, genres, release_date')
        .ilike('name', `%${query}%`)
        .limit(20);
        
      if (dbGames) {
        const formattedGames = dbGames.map(game => ({
          id: game.igdb_id?.toString() || game.id.toString(),
          name: game.name,
          cover_url: game.cover_url,
          genre: game.genres?.[0] || '',
          first_release_date: game.release_date
        }));
        
        setIgdbGames(formattedGames);
        setError(null); // Clear any previous errors
      }
    } catch (dbError) {
      console.error('Both IGDB and database search failed:', dbError);
      setError('Search temporarily unavailable');
    }
  }
};
```

### Phase 4: Improve Error Handling (LOW - 20 mins)

#### 4.1 Better Error Messages
**File**: `src/components/GamePickerModal.tsx` (line 208)

```typescript
} catch (err: any) {
  console.error('Search error:', err);
  
  // Provide specific error messages
  if (err.message?.includes('404')) {
    setError('Game search is temporarily unavailable. Please try again later.');
  } else if (err.message?.includes('401')) {
    setError('Authentication error. Please refresh the page.');
  } else if (err.message?.includes('500')) {
    setError('Search service is temporarily down. Please try again later.');
  } else {
    setError('Unable to search games. Please check your connection.');
  }
}
```

#### 4.2 Add Loading States
- Show spinner during search
- Show "Searching..." text
- Disable input while loading

### Phase 5: Performance Optimizations (LOW - 30 mins)

#### 5.1 Add Search Result Caching
```typescript
// Simple in-memory cache for search results
const searchCache = new Map<string, IGDBGame[]>();

const getCachedOrSearch = async (query: string): Promise<IGDBGame[]> => {
  const cacheKey = query.toLowerCase().trim();
  
  if (searchCache.has(cacheKey)) {
    console.log(`📦 Using cached results for "${query}"`);
    return searchCache.get(cacheKey)!;
  }
  
  const results = await searchWithFallback(query);
  searchCache.set(cacheKey, results);
  
  // Clear cache after 5 minutes
  setTimeout(() => {
    searchCache.delete(cacheKey);
  }, 5 * 60 * 1000);
  
  return results;
};
```

#### 5.2 Add Request Cancellation
- Cancel previous requests when new search is initiated
- Prevent race conditions with fast typing

## Implementation Priority

### Immediate (Fix Production Issue)
1. **Refresh IGDB tokens** - This will resolve 90% of the problem
2. **Add minimum query length** - Prevent unnecessary API calls

### Short-term (Improve UX)
3. **Add debouncing** - Reduce API spam
4. **Add database fallback** - Ensure search always works
5. **Better error messages** - Improve user experience

### Long-term (Performance & Polish)
6. **Add caching** - Reduce API calls and improve speed
7. **Add request cancellation** - Prevent race conditions
8. **Add loading states** - Better visual feedback

## Files to Modify

### Critical Changes
1. **`.env`** - Update IGDB API credentials
2. **`src/components/GamePickerModal.tsx`** (lines 180-212)
   - Add debouncing logic
   - Add minimum query validation  
   - Add fallback search strategy
   - Improve error handling

### Optional Enhancements  
3. **`src/services/igdbService.ts`** (lines 586-595)
   - Add better 404 error handling
   - Add retry logic for temporary failures

## Testing Plan

### Phase 1 Testing (After Token Refresh)
- [ ] Search for single letter "b" - should not trigger API call
- [ ] Search for "bub" - should wait 500ms then search
- [ ] Search for "bubsy" - should return game results
- [ ] No 404 errors in console
- [ ] Search results display correctly

### Phase 2 Testing (After Fallback Implementation)
- [ ] Disconnect internet/block API - fallback to database search works
- [ ] Search for games known to be in database
- [ ] Error messages are user-friendly
- [ ] Loading states work properly

### Edge Cases
- [ ] Empty search query
- [ ] Special characters in search
- [ ] Very long search queries
- [ ] Network timeout scenarios

## Success Metrics

### Before Fix
- ❌ 100% search failure rate
- ❌ 404 errors on every keystroke  
- ❌ Poor user experience
- ❌ API spam (every character typed)

### After Fix  
- ✅ 99%+ search success rate
- ✅ No 404 errors (with valid tokens)
- ✅ Smooth search experience with debouncing
- ✅ Fallback works when API is down
- ✅ Minimal API calls (debounced + minimum length)
- ✅ Helpful error messages for users

## Risk Assessment

### Low Risk Changes
- Token refresh (immediate fix)
- Debouncing (UX improvement)
- Minimum query length (prevents spam)

### Medium Risk Changes  
- Database fallback (new code path to test)
- Error message changes (ensure all cases covered)

### Monitoring Recommendations
- Track search success/failure rates
- Monitor API call frequency (should decrease significantly)
- Watch for any new error patterns after token refresh
- User feedback on search experience

## Estimated Timeline
- **Phase 1 (Critical)**: 15 minutes
- **Phase 2 (UX)**: 30 minutes  
- **Phase 3 (Fallback)**: 45 minutes
- **Phase 4 (Polish)**: 20 minutes
- **Testing**: 30 minutes
- **Total**: ~2.5 hours for complete fix

**Quick Fix**: Just Phase 1 (token refresh) will resolve the immediate 404 errors in 15 minutes.