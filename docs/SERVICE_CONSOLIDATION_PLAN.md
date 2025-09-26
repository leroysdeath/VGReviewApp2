# Service Consolidation Plan

## Security Status: ✅ CLEAN
- **No hardcoded secrets found** in service files
- All credentials properly managed via `src/services/env.ts`
- Environment variables correctly loaded from `.env` file
- IGDB tokens only exist in `.env` (not hardcoded)

---

## Executive Summary

**Current State:**
- **64 services** (~10,000 lines of code)
- **158 test files** scattered across services
- **High fragmentation** with overlapping responsibilities

**Consolidation Target:**
- **Reduce to 12-15 core services** (~30% reduction)
- **Consolidate 158 tests into ~40 focused test suites**
- **Maintain all functionality** while improving maintainability

---

## Phase 1: Game Services Consolidation (HIGH PRIORITY)

### Current State: 10 Game Services (~3,676 lines)
```
gameDataService.ts          (1,161 lines) - CRUD operations
gameDataServiceV2.ts        (1,014 lines) - Enhanced CRUD with IGDB
gameQueryService.ts         (516 lines)   - Query optimization
gameSearchService.ts        (985 lines)   - Search logic
gameFlagService.ts          - Content moderation
gamePreloadService.ts       - Performance optimization
gameProgressService.ts      - User progress tracking
gameSeeder.ts              - Test data generation
gameStateService.ts        - State management
gameSyncService.ts         - IGDB synchronization
```

### Consolidation Strategy: Merge into 3 Services

#### **1. `gameService.ts`** (Core Game Operations)
**Merge:** `gameDataService.ts` + `gameDataServiceV2.ts` + `gameQueryService.ts`

**Responsibilities:**
- CRUD operations (getById, create, update, delete)
- Database queries with caching
- IGDB integration and supplementation
- Game existence validation

**Why:** These three services have massive overlap. V2 was created to fix V1 issues, and gameQueryService duplicates query logic.

**Test Consolidation:**
```
Before: 15+ tests scattered across database-threshold, critical-fixes, console-errors
After:  gameService.test.ts (comprehensive CRUD + query tests)
```

---

#### **2. `gameSearchService.ts`** (Keep, but refactor)
**Keep as standalone** - Already well-defined responsibility

**Enhancements:**
- Remove internal caching (delegate to `searchCacheService`)
- Simplify franchise expansion logic
- Remove duplicated scoring algorithms

**Test Consolidation:**
```
Before: enhanced-search-*.test.ts (10+ files)
After:  gameSearchService.test.ts (single comprehensive suite)
```

---

#### **3. `gameMetadataService.ts`** (NEW - Consolidate Utilities)
**Merge:** `gameFlagService.ts` + `gamePreloadService.ts` + `gameStateService.ts`

**Responsibilities:**
- Content moderation flags (DMCA, fan games)
- Image preloading and optimization
- Game state transitions (backlog → playing → completed)
- Metadata enrichment

**Test Consolidation:**
```
Before: aggressive-copyright.test.ts, backlog-fix-validation.test.ts, etc.
After:  gameMetadataService.test.ts
```

---

## Phase 2: User/Profile Services Consolidation

### Current State: 4 Services (~1,246 lines)
```
userService.ts              (436 lines)  - User CRUD with caching
userServiceSimple.ts        (149 lines)  - Simplified CRUD
profileService.ts           (661 lines)  - Profile management
profileCache.ts             - Caching layer
```

### Consolidation Strategy: Merge into 1 Service

#### **`userService.ts`** (Unified User Operations)
**Merge:** `userService.ts` + `userServiceSimple.ts` + `profileService.ts` + `profileCache.ts`

**Why:** These services have identical responsibilities:
- `userServiceSimple` was created because `userService` was "too complex"
- `profileService` duplicates user profile operations
- `profileCache` is only used by `profileService`

**Refactoring Approach:**
```typescript
export class UserService {
  // Core operations (from userServiceSimple)
  async getUser(userId: number): Promise<UserProfile>
  async updateProfile(userId: number, data: ProfileUpdate): Promise<void>

  // Auth integration (from userService)
  async getOrCreateDatabaseUser(authUser: AuthUser): Promise<UserProfile>

  // Social features (from profileService)
  async followUser(followerId: number, followedId: number): Promise<void>
  async getFollowers(userId: number): Promise<UserProfile[]>

  // Internal caching (from profileCache)
  private cache: Map<number, CachedProfile>
}
```

**Test Consolidation:**
```
Before: userService.test.ts, userService-unit.test.ts, profileService.test.ts, authService.test.ts
After:  userService.test.ts (single comprehensive suite covering all user operations)
```

---

## Phase 3: Search Services Consolidation

### Current State: 7 Services (~2,843 lines)
```
searchCacheService.ts       - Cache management
searchAnalyticsService.ts   - Search tracking
searchDeduplicationService.ts - Duplicate removal
searchDiagnosticService.ts  - Debug tooling
searchMetricsService.ts     - Performance metrics
searchCoordinator.ts        - Multi-service orchestration
secureSearchService.ts      - Security layer
```

### Consolidation Strategy: Merge into 2 Services

#### **1. `searchService.ts`** (Core Search)
**Merge:** `searchCoordinator.ts` + `secureSearchService.ts` + `searchDeduplicationService.ts`

**Responsibilities:**
- Coordinate searches across game/user databases
- Apply security filters (SQL injection, XSS)
- Deduplicate results
- Result prioritization

---

#### **2. `searchObservabilityService.ts`** (Analytics & Monitoring)
**Merge:** `searchAnalyticsService.ts` + `searchMetricsService.ts` + `searchDiagnosticService.ts`

**Responsibilities:**
- Track search queries and performance
- Generate metrics reports
- Debug tooling for search issues
- A/B test result tracking

**Test Consolidation:**
```
Before: search-analytics-*.test.ts (8+ files)
After:  searchService.test.ts, searchObservability.test.ts (2 suites)
```

---

## Phase 4: IGDB Services Consolidation

### Current State: 8 Services (~3,007 lines)
```
igdbService.ts              - Legacy API wrapper
igdbServiceV2.ts            - Enhanced API wrapper
igdbSyncService.ts          - Database synchronization
igdbImageService.ts         - Image URL handling
igdbCircuitBreaker.ts       - Rate limiting
igdbFailureCache.ts         - Error caching
igdbHealthMonitor.ts        - API health checks
igdbTelemetry.ts            - Metrics tracking
```

### Consolidation Strategy: Merge into 2 Services

#### **1. `igdbService.ts`** (API Client)
**Merge:** `igdbService.ts` + `igdbServiceV2.ts` + `igdbImageService.ts`

**Responsibilities:**
- Search IGDB API
- Fetch game details
- Handle image URL transformations
- Circuit breaker integration

**Why:** V2 was created to fix V1 bugs. Merge and keep only the working implementation.

---

#### **2. `igdbInfrastructureService.ts`** (Reliability Layer)
**Merge:** `igdbCircuitBreaker.ts` + `igdbFailureCache.ts` + `igdbHealthMonitor.ts` + `igdbTelemetry.ts`

**Responsibilities:**
- Circuit breaker pattern for rate limiting
- Cache failed requests to avoid duplicate errors
- Monitor API health and quota
- Track usage metrics

**Test Consolidation:**
```
Before: igdb-*.test.ts (12+ files)
After:  igdbService.test.ts, igdbInfrastructure.test.ts (2 suites)
```

---

## Phase 5: Utility Services Consolidation

### Services to Keep (Well-Defined Responsibilities)
```
✅ authService.ts           - Authentication operations
✅ reviewService.ts         - Review CRUD
✅ activityService.ts       - Activity feed
✅ notificationService.ts   - Notifications
✅ realTimeService.ts       - Supabase subscriptions
✅ collectionWishlistService.ts - User collections
✅ contentLikeService.ts    - Likes/favorites
✅ dlcService.ts            - DLC management
✅ gdprService.ts           - Privacy compliance
✅ privacyService.ts        - Privacy settings
✅ trackingService.ts       - Analytics
```

### Services to Consolidate

#### **Merge:** `dualSearchCacheService.ts` → `searchCacheService.ts`
**Why:** Both handle search caching with slightly different strategies. Merge into one with configurable cache layers.

#### **Merge:** `enhancedIGDBService.ts` → `igdbService.ts`
**Why:** "Enhanced" version should replace the base version, not coexist.

#### **Merge:** `enhancedSearchService.ts` → `gameSearchService.ts`
**Why:** Same logic, different names. Keep one.

#### **Delete:** `databaseService.ts`
**Why:** Legacy API-based service that's completely unused (only has mock endpoints like `/api/games`). Supabase replaced this.

#### **Keep:** `env.ts`, `supabase.ts`, `types.ts`, `index.ts`
**Why:** Core infrastructure files.

---

## Phase 6: Test Consolidation Strategy

### Current Test Distribution (158 files)

**Test Categories:**
```
Search tests:        ~40 files (enhanced-search-*, franchise-coverage-*, etc.)
Game data tests:     ~25 files (database-threshold-*, critical-fixes-*, etc.)
Service unit tests:  ~20 files (authService.test.ts, userService.test.ts, etc.)
Integration tests:   ~30 files (ab-testing-*, bot-detection-*, etc.)
Feature tests:       ~25 files (admin-filtering-*, audit-*, backlog-*, etc.)
Specialized tests:   ~18 files (dmca-*, privacy-*, security-*, etc.)
```

### Consolidation Target: ~40 Test Suites

#### **Game Domain (8 suites)**
```
✅ gameService.test.ts              (CRUD + query operations)
✅ gameSearchService.test.ts        (Search logic)
✅ gameMetadataService.test.ts      (Flags, state, preloading)
✅ gameSyncService.test.ts          (IGDB sync)
✅ gameProgress.test.ts             (Progress tracking)
✅ gameUrls.test.ts                 (Slug generation)
✅ gamePrioritization.test.ts       (Scoring algorithms)
✅ sisterGameDetection.test.ts      (Franchise detection)
```

#### **User Domain (4 suites)**
```
✅ userService.test.ts              (All user/profile operations)
✅ authService.test.ts              (Authentication flows)
✅ userFollow.test.ts               (Social features)
✅ userPreferences.test.ts          (Settings)
```

#### **Search Domain (4 suites)**
```
✅ searchService.test.ts            (Core search logic)
✅ searchObservability.test.ts      (Analytics + metrics)
✅ searchCache.test.ts              (Caching layers)
✅ searchSecurity.test.ts           (SQL injection, XSS)
```

#### **IGDB Domain (4 suites)**
```
✅ igdbService.test.ts              (API integration)
✅ igdbInfrastructure.test.ts       (Circuit breaker, health)
✅ igdbSync.test.ts                 (Database sync)
✅ igdbRateLimiting.test.ts         (Quota management)
```

#### **Content Domain (5 suites)**
```
✅ reviewService.test.ts            (Reviews CRUD)
✅ commentService.test.ts           (Comments)
✅ contentLike.test.ts              (Likes)
✅ contentModeration.test.ts        (DMCA, flags)
✅ dlcService.test.ts               (DLC)
```

#### **Infrastructure (6 suites)**
```
✅ activityFeed.test.ts             (Activity streams)
✅ notificationService.test.ts      (Notifications)
✅ realTimeService.test.ts          (Supabase subscriptions)
✅ privacyCompliance.test.ts        (GDPR)
✅ tracking.test.ts                 (Analytics)
✅ abTesting.test.ts                (A/B tests)
```

#### **Utilities (5 suites)**
```
✅ sqlSecurity.test.ts              (SQL injection prevention)
✅ sanitization.test.ts             (Input sanitization)
✅ platformMapping.test.ts          (Platform normalization)
✅ dataTransformers.test.ts         (Data utilities)
✅ botDetection.test.ts             (Bot detection)
```

#### **Integration (4 suites)**
```
✅ searchIntegration.test.ts        (End-to-end search)
✅ gamePageIntegration.test.ts      (Game page flows)
✅ userFlowIntegration.test.ts      (User journeys)
✅ apiIntegration.test.ts           (External APIs)
```

---

## Implementation Phases & Timeline

### **Phase 1: Game Services** (Week 1-2)
**Impact:** HIGH - Most fragmented domain
**Risk:** MEDIUM - Heavily used across pages

**Steps:**
1. Create `gameService.ts` by merging V1 + V2 + Query service
2. Update all imports in pages/components
3. Consolidate tests into `gameService.test.ts`
4. Delete old service files
5. Run full test suite + production build

**Success Metrics:**
- All 15 pages using games import from single service
- Game tests reduced from 25 → 8 files
- No functionality regressions

---

### **Phase 2: User/Profile Services** (Week 2)
**Impact:** MEDIUM - Used in auth flows and profiles
**Risk:** LOW - Well-isolated domain

**Steps:**
1. Merge into single `userService.ts`
2. Update auth components
3. Consolidate user tests
4. Remove `userServiceSimple.ts` and `profileCache.ts`

**Success Metrics:**
- User tests reduced from 4 → 1 file
- Auth flows work correctly
- Profile updates function properly

---

### **Phase 3: Search Services** (Week 3)
**Impact:** HIGH - Core feature
**Risk:** HIGH - Complex multi-service coordination

**Steps:**
1. Create `searchService.ts` (coordinator + security + dedup)
2. Create `searchObservabilityService.ts` (analytics + metrics)
3. Update SearchResultsPage and search components
4. Consolidate 40+ search tests into 4 suites
5. Extensive integration testing

**Success Metrics:**
- Search functionality unchanged
- Search tests reduced from 40 → 4 files
- Performance maintained or improved

---

### **Phase 4: IGDB Services** (Week 3-4)
**Impact:** MEDIUM - External API integration
**Risk:** MEDIUM - Rate limiting and sync critical

**Steps:**
1. Merge V1 + V2 into single `igdbService.ts`
2. Create `igdbInfrastructureService.ts`
3. Test sync scripts extensively
4. Update netlify functions if needed

**Success Metrics:**
- IGDB sync continues working
- No rate limit violations
- API health monitoring functional

---

### **Phase 5: Cleanup & Documentation** (Week 4)
**Impact:** LOW - Polish phase
**Risk:** NONE

**Steps:**
1. Delete unused services (`databaseService.ts`, etc.)
2. Merge remaining duplicate services
3. Update CLAUDE.md with new architecture
4. Update service documentation
5. Create service dependency map

---

## Key Principles for Consolidation

### 1. **One Service Per Domain Responsibility**
```
❌ gameDataService, gameDataServiceV2, gameQueryService
✅ gameService (handles all game data operations)
```

### 2. **Separate Business Logic from Infrastructure**
```
✅ igdbService.ts              - Business logic (search, fetch)
✅ igdbInfrastructureService.ts - Infrastructure (circuit breaker, monitoring)
```

### 3. **Observability is Its Own Concern**
```
✅ searchService.ts            - Core search
✅ searchObservabilityService.ts - Metrics, analytics, diagnostics
```

### 4. **No "Enhanced" or "V2" Services**
If V2 is better, **delete V1** and rename V2 to V1. Don't maintain both.

### 5. **Test Files Mirror Service Files**
```
gameService.ts          → gameService.test.ts
igdbService.ts          → igdbService.test.ts
searchObservability.ts  → searchObservability.test.ts
```

---

## API/DB Limits & Performance Considerations

### **IGDB API Limits**
- **4 requests/second** (managed by `igdbCircuitBreaker.ts`)
- Keep circuit breaker in consolidated `igdbInfrastructureService.ts`
- No changes to rate limiting logic

### **Supabase Rate Limits**
- **No consolidation changes affect DB queries**
- Caching remains intact (moved, not removed)
- RLS policies unchanged

### **Browser Cache Limits**
- `searchCacheService` manages cache eviction
- LRU cache with 50-item limit
- No changes to cache sizing

---

## File Count Summary

### **Before Consolidation**
```
Services:        64 files (~10,000 lines)
Tests:          158 files
Total:          222 files
```

### **After Consolidation**
```
Services:        12-15 files (~10,000 lines, better organized)
Tests:           ~40 files
Total:          ~55 files (75% reduction in file count)
```

### **Detailed Breakdown**
```
Game Domain:       10 → 3 services (-70%)
User Domain:        4 → 1 service (-75%)
Search Domain:      7 → 2 services (-71%)
IGDB Domain:        8 → 2 services (-75%)
Utilities:         20 → 5 services (-75%)
Keep Unchanged:    15 services (already well-defined)

Total Services:    64 → 28 services (-56%)
Total Tests:      158 → 40 suites (-75%)
```

---

## Risk Mitigation

### **High-Risk Consolidations**
1. **Search Services** - Most complex, test extensively
2. **Game Services** - Widely used, phase rollout by page

### **Low-Risk Consolidations**
1. **User Services** - Clear boundaries, isolated
2. **Utility Merges** - Simple renames

### **Rollback Strategy**
- Keep old service files commented out for 2 weeks
- Tag git commit before each phase
- Feature flags for new service implementations

---

## Next Steps

1. **Review this plan** - Confirm consolidation targets make sense
2. **Choose starting phase** - Recommend Phase 2 (User Services) for low-risk start
3. **Create feature branch** - `feature/service-consolidation`
4. **Implement phase-by-phase** - Don't do all at once
5. **Test extensively** - Run full suite after each phase