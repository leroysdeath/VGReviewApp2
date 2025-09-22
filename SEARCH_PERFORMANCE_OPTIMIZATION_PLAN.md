# Search Performance Optimization Plan

## Executive Summary

Current search implementation suffers from over-fetching (20x more data than visible), synchronous image loading, and inefficient caching. This plan outlines phased optimizations to achieve 60-75% performance improvements.

### Current Performance Metrics
- **Autocomplete Search:** 200-300ms
- **Full Search:** 800-1200ms
- **Initial Paint:** 400ms
- **Data Transfer:** ~500KB per search

### Target Performance Metrics
- **Autocomplete Search:** 50-100ms (75% faster)
- **Full Search:** 300-500ms (60% faster)
- **Initial Paint:** 100ms (75% faster)
- **Data Transfer:** ~50KB for autocomplete, ~200KB for full

## Critical Issues Identified

### Issue #1: Excessive Debounce Delay
- **Current:** 300ms universal delay
- **Problem:** Too slow for autocomplete, acceptable for full search
- **Impact:** Perceived lag in dropdown suggestions

### Issue #2: Over-fetching Data
- **Current:** 20 results in dropdown (only 5-6 visible), 200 internally
- **Problem:** 20x more data than needed for UI
- **Impact:** Unnecessary bandwidth and processing

### Issue #3: Synchronous Image Loading
- **Current:** Loading 20 cover images simultaneously
- **Problem:** Blocks rendering, high bandwidth consumption
- **Impact:** 400ms+ delay in visual feedback

### Issue #4: Monolithic Query Strategy
- **Current:** Same query for all search contexts
- **Problem:** Autocomplete doesn't need full details
- **Impact:** Slow autocomplete, wasted resources

### Issue #5: Inefficient Caching
- **Current:** Single cache for all search types
- **Problem:** Large entries pollute cache, slow retrieval
- **Impact:** Cache misses, slower subsequent searches

## Implementation Plan

## Phase 1: Quick Wins (Week 1)
**Goal:** Immediate 30-40% improvement with minimal code changes

### 1.1 Reduce Autocomplete Results
```javascript
// netlify/functions/igdb-search.cjs
const limit = requestData.limit || queryParams.limit ||
              (requestData.type === 'autocomplete' ? 6 : 20);
```

### 1.2 Optimize Debounce Delays
```typescript
// src/pages/SearchResultsPage.tsx
const DEBOUNCE_DELAYS = {
  autocomplete: 150,  // Faster for dropdown
  detailed: 500       // Slower for full search
};

debounceRef.current = setTimeout(() => {
  performSearch();
}, searchType === 'autocomplete' ? DEBOUNCE_DELAYS.autocomplete : DEBOUNCE_DELAYS.detailed);
```

### 1.3 Add Lazy Loading to Images
```typescript
// src/components/SmartImage.tsx
<img
  src={src}
  loading="lazy"
  decoding="async"
  fetchpriority={priority || "low"}
/>
```

### 1.4 Implement Request Cancellation
```typescript
// src/hooks/useGameSearch.ts
const abortControllerRef = useRef<AbortController>();

useEffect(() => {
  // Cancel previous request
  if (abortControllerRef.current) {
    abortControllerRef.current.abort();
  }

  abortControllerRef.current = new AbortController();

  fetch(url, { signal: abortControllerRef.current.signal })
    .then(/* ... */)
    .catch(err => {
      if (err.name !== 'AbortError') {
        console.error(err);
      }
    });
}, [searchTerm]);
```

## Phase 2: Core Optimizations (Week 2)
**Goal:** Structural improvements for 50-60% total improvement

### 2.1 Split Search Endpoints

#### Autocomplete Endpoint
```javascript
// netlify/functions/igdb-search-autocomplete.cjs
exports.handler = async (event) => {
  const AUTOCOMPLETE_FIELDS = `
    fields name, slug, cover.url, first_release_date,
           platforms.abbreviation;
    search "${query}";
    limit 6;
    where category = (0,4,8,9,10,11) & version_parent = null;
  `;
  // Focused query, minimal data
};
```

#### Detailed Search Endpoint
```javascript
// netlify/functions/igdb-search-detailed.cjs
exports.handler = async (event) => {
  const DETAILED_FIELDS = `
    fields name, summary, storyline, slug, first_release_date,
           rating, category, cover.url, screenshots.url,
           genres.name, platforms.name, involved_companies.company.name,
           involved_companies.developer, involved_companies.publisher;
    search "${query}";
    limit 20;
    where category = (0,4,8,9,10,11);
  `;
  // Full query for search results page
};
```

### 2.2 Implement Dual-Cache Strategy
```typescript
// src/services/searchCacheService.ts
class DualSearchCache {
  private autocompleteCache = new Map<string, CachedResult>();
  private detailedCache = new Map<string, CachedResult>();

  private configs = {
    autocomplete: {
      maxSize: 100,
      ttl: 1 * 60 * 60 * 1000,  // 1 hour
      maxEntrySize: 5 * 1024      // 5KB per entry
    },
    detailed: {
      maxSize: 50,
      ttl: 24 * 60 * 60 * 1000,  // 24 hours
      maxEntrySize: 50 * 1024     // 50KB per entry
    }
  };

  getCache(type: 'autocomplete' | 'detailed') {
    return type === 'autocomplete' ? this.autocompleteCache : this.detailedCache;
  }

  set(key: string, data: any, type: 'autocomplete' | 'detailed') {
    const cache = this.getCache(type);
    const config = this.configs[type];

    // Size check
    const size = JSON.stringify(data).length;
    if (size > config.maxEntrySize) return;

    // Evict if necessary
    if (cache.size >= config.maxSize) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }

    cache.set(key, {
      data,
      timestamp: Date.now(),
      hits: 0
    });
  }
}
```

### 2.3 Request Deduplication
```typescript
// src/services/gameSearchService.ts
class SearchService {
  private pendingRequests = new Map<string, Promise<any>>();

  async search(query: string, options: SearchOptions) {
    const key = `${options.type}-${query}`;

    // Return existing promise if same search in progress
    if (this.pendingRequests.has(key)) {
      console.log(`♻️ Deduplicating request: ${key}`);
      return this.pendingRequests.get(key);
    }

    const promise = this.performSearch(query, options);
    this.pendingRequests.set(key, promise);

    promise.finally(() => {
      this.pendingRequests.delete(key);
    });

    return promise;
  }
}
```

### 2.4 Intersection Observer for Images
```typescript
// src/hooks/useIntersectionObserver.ts
export function useIntersectionObserver(options = {}) {
  const [ref, setRef] = useState<Element | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!ref) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(entry.isIntersecting);
    }, {
      threshold: 0.1,
      rootMargin: '50px',
      ...options
    });

    observer.observe(ref);
    return () => observer.disconnect();
  }, [ref, options]);

  return [setRef, isVisible] as const;
}

// Usage in SearchResultItem
const SearchResultItem = ({ game }) => {
  const [imageRef, isVisible] = useIntersectionObserver();

  return (
    <div>
      <div ref={imageRef} className="aspect-[3/4]">
        {isVisible ? (
          <SmartImage src={game.cover?.url} />
        ) : (
          <div className="bg-gray-700 animate-pulse" />
        )}
      </div>
    </div>
  );
};
```

## Phase 3: Enhanced UX (Week 3)
**Goal:** Progressive enhancement for 75% total improvement

### 3.1 Progressive Field Loading
```typescript
// src/services/progressiveSearchService.ts
class ProgressiveSearchService {
  async search(query: string) {
    // Phase 1: Instant - Name only (from cache or quick query)
    const quickResults = await this.quickSearch(query);
    yield { phase: 'quick', results: quickResults };

    // Phase 2: Enhanced - Add covers
    const enhancedResults = await this.enhanceWithCovers(quickResults);
    yield { phase: 'enhanced', results: enhancedResults };

    // Phase 3: Complete - Full details (on demand)
    const completeResults = await this.loadFullDetails(enhancedResults);
    yield { phase: 'complete', results: completeResults };
  }

  private async quickSearch(query: string) {
    const cached = this.cache.get(`quick-${query}`);
    if (cached) return cached;

    return await fetch('/api/search-quick', {
      body: JSON.stringify({
        query,
        fields: 'name, slug, first_release_date'
      })
    });
  }
}
```

### 3.2 Virtual Scrolling for Long Lists
```typescript
// src/components/VirtualSearchResults.tsx
import { FixedSizeList } from 'react-window';

const VirtualSearchResults = ({ games }) => {
  const Row = ({ index, style }) => (
    <div style={style}>
      <SearchResultItem game={games[index]} />
    </div>
  );

  return (
    <FixedSizeList
      height={600}
      itemCount={games.length}
      itemSize={120}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
};
```

### 3.3 Predictive Prefetching
```typescript
// src/services/prefetchService.ts
class PrefetchService {
  private prefetchQueue = new Set<string>();

  predictivelyPrefetch(currentQuery: string) {
    // Prefetch likely next queries
    const predictions = this.generatePredictions(currentQuery);

    predictions.forEach(prediction => {
      if (!this.cache.has(prediction)) {
        this.prefetchQueue.add(prediction);
        this.schedulePrefetch(prediction);
      }
    });
  }

  private generatePredictions(query: string): string[] {
    const predictions = [];

    // Common gaming franchise patterns
    if (query.match(/\d$/)) {
      // "Mario 3" -> prefetch "Mario 4"
      const next = query.replace(/\d$/, m => String(+m + 1));
      predictions.push(next);
    }

    // Add common suffixes
    ['2', 'II', 'Remastered', 'Deluxe'].forEach(suffix => {
      if (!query.includes(suffix)) {
        predictions.push(`${query} ${suffix}`);
      }
    });

    return predictions.slice(0, 3); // Limit prefetching
  }
}
```

### 3.4 Optimistic UI Updates
```typescript
// src/hooks/useOptimisticSearch.ts
const useOptimisticSearch = () => {
  const [results, setResults] = useState([]);
  const [isStale, setIsStale] = useState(false);

  const search = async (query: string) => {
    // Show cached results immediately (marked as stale)
    const cached = cache.get(query);
    if (cached) {
      setResults(cached);
      setIsStale(true);
    }

    // Fetch fresh results
    const fresh = await fetchResults(query);
    setResults(fresh);
    setIsStale(false);

    // Update cache
    cache.set(query, fresh);
  };

  return { results, isStale, search };
};
```

## Performance Monitoring

### Key Metrics to Track
```typescript
// src/services/performanceMonitor.ts
class PerformanceMonitor {
  trackSearchPerformance(query: string, type: 'autocomplete' | 'full') {
    const metrics = {
      startTime: performance.now(),
      query,
      type,
      cacheHit: false,
      resultCount: 0,
      imageLoadTime: 0,
      ttfb: 0, // Time to first byte
      fcp: 0,  // First contentful paint
    };

    // Track throughout search lifecycle
    return {
      markCacheHit: () => { metrics.cacheHit = true; },
      markTTFB: () => { metrics.ttfb = performance.now() - metrics.startTime; },
      markFCP: () => { metrics.fcp = performance.now() - metrics.startTime; },
      complete: (resultCount: number) => {
        metrics.resultCount = resultCount;
        metrics.totalTime = performance.now() - metrics.startTime;

        // Send to analytics
        this.sendMetrics(metrics);
      }
    };
  }
}
```

### Success Criteria
- [ ] Autocomplete response < 100ms (p95)
- [ ] Full search response < 500ms (p95)
- [ ] Time to first result < 150ms
- [ ] Image load completion < 1s for visible results
- [ ] Cache hit rate > 40% for popular searches
- [ ] Zero perceived lag for cached results

## Testing Strategy

### Performance Tests
```typescript
// src/test/search-performance.test.ts
describe('Search Performance', () => {
  it('autocomplete should respond within 100ms', async () => {
    const start = performance.now();
    await searchService.search('mario', { type: 'autocomplete' });
    expect(performance.now() - start).toBeLessThan(100);
  });

  it('should deduplicate concurrent requests', async () => {
    const spy = jest.spyOn(global, 'fetch');
    await Promise.all([
      searchService.search('zelda', { type: 'autocomplete' }),
      searchService.search('zelda', { type: 'autocomplete' }),
      searchService.search('zelda', { type: 'autocomplete' })
    ]);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
```

### Load Tests
```bash
# Artillery load test config
config:
  target: "http://localhost:8888"
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "Search Autocomplete"
    flow:
      - post:
          url: "/.netlify/functions/igdb-search-autocomplete"
          json:
            query: "{{ $randomString() }}"
```

## Rollout Strategy

### Week 1 Deployment
1. Deploy lazy loading and debounce optimizations
2. Monitor metrics for 48 hours
3. A/B test with 50% of users

### Week 2 Deployment
1. Deploy split endpoints to staging
2. Test with synthetic monitoring
3. Gradual rollout: 10% → 50% → 100%

### Week 3 Deployment
1. Enable progressive enhancements for power users
2. Monitor cache efficiency
3. Full rollout after validation

## Rollback Plan

Each optimization can be independently toggled via feature flags:

```typescript
const FEATURE_FLAGS = {
  USE_SPLIT_ENDPOINTS: process.env.VITE_USE_SPLIT_ENDPOINTS === 'true',
  USE_DUAL_CACHE: process.env.VITE_USE_DUAL_CACHE === 'true',
  USE_LAZY_LOADING: process.env.VITE_USE_LAZY_LOADING === 'true',
  USE_VIRTUAL_SCROLL: process.env.VITE_USE_VIRTUAL_SCROLL === 'true',
};
```

## Expected Outcomes

### Performance Improvements
- **Autocomplete Latency:** 75% reduction (300ms → 75ms)
- **Full Search Latency:** 60% reduction (1000ms → 400ms)
- **Data Transfer:** 80% reduction for autocomplete (500KB → 100KB)
- **Time to Interactive:** 65% reduction (800ms → 280ms)

### User Experience Improvements
- Instant feedback on typing
- No blocking during image loads
- Smooth scrolling with virtual lists
- Predictive prefetching reduces wait times

### Infrastructure Benefits
- 70% reduction in API calls (deduplication + caching)
- 60% reduction in bandwidth usage
- Better resource utilization
- Lower server costs

## Maintenance Considerations

### Monthly Tasks
- Review cache hit rates
- Analyze search patterns for prefetch optimization
- Update popular search list
- Clean up stale cache entries

### Quarterly Tasks
- Review and adjust field selections
- Optimize query patterns based on usage
- Update performance benchmarks
- Evaluate new IGDB API features

## Conclusion

This phased approach minimizes risk while delivering immediate improvements. Each phase builds upon the previous, with measurable metrics and rollback capabilities. The expected 60-75% performance improvement will significantly enhance user experience while reducing infrastructure costs.