# Search Fix Plan - IGDB 404 Errors

## Problem Analysis

### Root Cause
The app is running on **Vite dev server** (`localhost:5173`) but trying to call IGDB API through **Netlify Functions** (`/.netlify/functions/igdb-search`), which are only available when running through `netlify dev` on port 8888.

### Error Chain
```
User searches → igdbService.searchGames()
→ fetch('/.netlify/functions/igdb-search')
→ 404 Not Found (Netlify function not available on Vite server)
→ Search fails with no fallback
```

### Components Affected
1. **GamePickerModal.tsx:123** - Directly calls `igdbService.searchGames()`
2. **ReviewFormPage.tsx:110** - Directly calls `igdbService.searchGames()`

### Existing Infrastructure
✅ **Database search already exists**: `gameSearchService.ts` has full database search with RPC functions
✅ **185K+ games in database**: Comprehensive game data available locally
✅ **Fallback RPC functions exist**: `search_games_secure`, `search_games_by_genre`

---

## Solution Options

### Option 1: Add Database Fallback to igdbService (RECOMMENDED)
**Approach**: Modify `igdbService.ts` to fallback to database search when Netlify function unavailable

**Pros**:
- ✅ Minimal code changes (modify 1 service)
- ✅ Automatic fallback for all consumers
- ✅ Works in both dev environments (Vite + Netlify)
- ✅ Maintains existing API contracts

**Cons**:
- ⚠️ Adds dependency on gameSearchService to igdbService

**Implementation**:
```typescript
// In igdbService.ts
private async performBasicSearch(query: string, limit: number): Promise<IGDBGame[]> {
  try {
    const response = await fetch(this.endpoint, { ... });

    if (!response.ok) {
      // NEW: Try database fallback before throwing
      if (response.status === 404) {
        console.warn('🔄 IGDB function unavailable, using database fallback');
        return this.searchDatabase(query, limit);
      }
      throw new Error(`IGDB API error: ${response.status}`);
    }
    // ... rest of existing code
  }
}

// NEW METHOD
private async searchDatabase(query: string, limit: number): Promise<IGDBGame[]> {
  const { data, error } = await supabase
    .rpc('search_games_secure', {
      search_query: query,
      limit_count: limit
    });

  if (error || !data) {
    return [];
  }

  // Transform database games to IGDB format
  return data.map(game => ({
    id: game.igdb_id || game.id,
    name: game.name,
    cover: { url: game.cover_url },
    // ... map other fields
  }));
}
```

---

### Option 2: Replace igdbService with gameSearchService
**Approach**: Update all components to use `gameSearchService` instead of `igdbService`

**Pros**:
- ✅ Uses existing, tested database search
- ✅ Faster search (no external API latency)
- ✅ No dependency on Netlify functions

**Cons**:
- ⚠️ More files to modify (2 components)
- ⚠️ Different API shape (breaking changes)
- ⚠️ May miss new games not yet in database

**Implementation**:
```typescript
// In GamePickerModal.tsx:123
// BEFORE:
let results = await igdbService.searchGames(searchQuery, 20);

// AFTER:
const response = await gameSearchService.searchGames({
  query: searchQuery,
  limit: 20
});
let results = response.games;
```

---

### Option 3: Environment-Aware Endpoint
**Approach**: Detect environment and use appropriate search method

**Pros**:
- ✅ Clean separation of concerns
- ✅ Optimal performance per environment

**Cons**:
- ⚠️ More complex configuration
- ⚠️ Requires env detection logic

---

## Recommended Solution: Option 1 (Hybrid Approach)

### Implementation Steps

#### Phase 1: Add Database Fallback (Immediate Fix)
1. **Modify igdbService.ts**
   - Add `searchDatabase()` private method
   - Update `performBasicSearch()` to catch 404 and fallback
   - Transform database results to IGDB format

2. **Test Coverage**
   - Unit test database fallback logic
   - Integration test with mocked 404 response
   - Verify both Vite and Netlify dev modes work

#### Phase 2: Optimize Database Search (Performance)
1. **Ensure RPC functions exist**
   - Verify `search_games_secure` is in database
   - Test with various query patterns
   - Monitor performance

2. **Add result caching**
   - Cache database search results
   - Clear cache on game updates

#### Phase 3: Documentation (Maintainability)
1. **Update service docs**
   - Document fallback behavior
   - Note environment requirements
   - Add troubleshooting guide

---

## Testing Strategy

### Unit Tests
```typescript
describe('igdbService with database fallback', () => {
  it('should use database when IGDB returns 404', async () => {
    // Mock 404 response from IGDB
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404
    });

    // Mock database response
    mockSupabase.rpc.mockResolvedValue({
      data: [{ id: 1, name: 'Zelda', igdb_id: 1234 }],
      error: null
    });

    const results = await igdbService.searchGames('zelda', 10);

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Zelda');
  });

  it('should use IGDB when available', async () => {
    // Mock successful IGDB response
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        games: [{ id: 1234, name: 'Zelda' }]
      })
    });

    const results = await igdbService.searchGames('zelda', 10);

    expect(results[0].id).toBe(1234);
    expect(mockSupabase.rpc).not.toHaveBeenCalled();
  });
});
```

### Manual Testing Checklist
- [ ] Search in GamePickerModal (Vite dev server)
- [ ] Search in ReviewFormPage (Vite dev server)
- [ ] Search in GamePickerModal (Netlify dev server)
- [ ] Search with Pokemon (special characters)
- [ ] Search with short query ("z")
- [ ] Search with franchise ("zelda")
- [ ] Verify results match expectations
- [ ] Check console for fallback messages

---

## Migration Path

### Development Workflow
1. **Vite dev** (`npm run dev`) → Uses database fallback automatically
2. **Netlify dev** (`netlify dev`) → Uses IGDB API when available, database as fallback

### Production
- Netlify functions available → IGDB API works
- Database fallback only triggered on IGDB downtime

---

## Rollback Plan

If issues arise:
1. Revert `igdbService.ts` changes
2. Update components to check environment:
   ```typescript
   const isDev = window.location.hostname === 'localhost';
   const results = isDev
     ? await gameSearchService.searchGames({ query, limit })
     : await igdbService.searchGames(query, limit);
   ```

---

## Success Metrics

### Must Have
- ✅ Search works on `localhost:5173` (Vite dev)
- ✅ Search works on `localhost:8888` (Netlify dev)
- ✅ No breaking changes to existing API
- ✅ All existing tests pass

### Nice to Have
- ✅ Search performance < 500ms
- ✅ Database results quality matches IGDB
- ✅ Graceful degradation on all errors

---

## Timeline Estimate

- **Phase 1** (Database Fallback): 1-2 hours
  - Code changes: 30 min
  - Testing: 30 min
  - Verification: 30 min

- **Phase 2** (Optimization): 1 hour
  - RPC verification: 20 min
  - Caching implementation: 40 min

- **Phase 3** (Documentation): 30 min

**Total**: 2.5-3.5 hours

---

## Additional Notes

### Why This Happened
- Using `npm run dev` (Vite only) instead of `netlify dev` (Vite + Functions)
- Components directly calling IGDB service without environment awareness
- No fallback mechanism in place

### Prevention
- Add startup check for Netlify functions availability
- Warn developers if IGDB functions not accessible
- Document required dev environment in README

### Related Issues
- Missing RPC functions (noted in database audit)
  - `search_games_optimized` - has fallback to `search_games_secure`
  - `get_games_with_review_stats` - has fallback query
  - These don't block the fix but should be created eventually