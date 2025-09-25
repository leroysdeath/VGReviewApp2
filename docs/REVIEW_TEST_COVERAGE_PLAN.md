# Review Section Test Coverage Plan

## Current State Analysis
- **Review System**: Mature with 9 components, 1,600+ lines in `reviewService.ts`
- **Test Coverage**: **Near zero** - only `UserStatsPanel.test.tsx` has minimal review references
- **Critical Gap**: No dedicated tests for core review functionality

## Test Coverage Plan

### Phase 1: Core Business Logic (Priority: Critical)

#### 1. Review Service Tests (`src/services/reviewService.test.ts`)
**Database Operations (15 tests):**
- `createReview`, `updateReview`, `deleteReview` 
- `getReviewById`, `getReviewsByGame`, `getUserReviews`
- Error handling, RLS validation, data sanitization

**Comment System (8 tests):**
- CRUD operations for threaded comments
- Parent-child relationships, soft deletes

**Like System (5 tests):**
- Toggle likes, count updates, concurrent handling

**Mock Strategy:** Supabase client mocks with controlled responses

#### 2. Component Tests
- `ReviewCard.test.tsx` (10 tests): Display, interactions, responsive design
- `ReviewFormPage.test.tsx` (12 tests): Validation, submission, draft saving
- `ReviewInteractions.test.tsx` (8 tests): Like/comment UI, optimistic updates

### Phase 2: Integration & Hooks

#### 3. Context Tests (`ReviewContext.test.tsx`)
- State management, provider behavior
- Multi-component state synchronization (5 tests)

#### 4. Hook Tests
- `useUserReviews.test.ts`: Pagination, filtering, caching (6 tests)
- `useGameReviews.test.ts`: Sort options, real-time updates (5 tests)

#### 5. Integration Tests
- Review-Game interaction flows (8 tests)
- Review-Profile synchronization (5 tests)
- Search indexing updates (3 tests)

### Phase 3: Advanced Coverage

#### 6. Performance Tests
- Large review lists rendering
- Image optimization in reviews
- Pagination performance

#### 7. Accessibility Tests
- Screen reader compatibility
- Keyboard navigation
- ARIA labels

## Implementation Strategy

### Respecting API/DB Limits
- Use **mock data factories** for all tests
- **No real API calls** - MSW for network mocking
- **In-memory test database** for integration tests
- Parallel test execution with isolated contexts

### Test Data Management
```typescript
// Shared test factories
const mockReview = createReviewFactory();
const mockUser = createUserFactory();
const mockGame = createGameFactory();
```

## Expected Coverage Metrics

| Component | Current | Target | Test Cases |
|-----------|---------|--------|------------|
| reviewService.ts | 0% | 85-90% | 50+ |
| Review Components | 0% | 90% | 35+ |
| Review Hooks | 0% | 85% | 15+ |
| Integration | 0% | 70% | 20+ |

## Risk Mitigation

### High Priority Gaps
1. **Data Loss Prevention**: No tests for review deletion/recovery
2. **Concurrency**: No tests for simultaneous edits
3. **Security**: No tests for XSS prevention in review content
4. **Performance**: No tests for large review text handling

## Recommended Execution Order

1. **Week 1**: `reviewService.test.ts` (foundation)
2. **Week 2**: Core component tests
3. **Week 3**: Integration & hooks
4. **Week 4**: Edge cases & performance

## Total Estimated Effort
- **120+ test cases** needed for comprehensive coverage
- **~40-50 hours** of development time
- **Zero API/DB impact** with proper mocking

This plan provides full test coverage while respecting resource limits through comprehensive mocking and isolated test execution.