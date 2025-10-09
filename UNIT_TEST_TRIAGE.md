# Unit Test Triage Plan - Post-Refactoring

**Date:** 2025-10-01
**Context:** Service consolidation refactoring (profileService, userServiceSimple → unified userService)

## Test Status Overview
- **Total:** 1,296 tests across 117 suites
- **Failing:** 343 tests (55 suites) - 26.4% failure rate
- **Passing:** 952 tests (61 suites) - 73.5% pass rate
- **Skipped:** 1 test (1 suite)

---

## Category 1: Critical - Must Fix (High Value)

### 1.1 Core Service Tests - Authentication & User Management ⚠️ HIGH PRIORITY

**Files:**
- `src/test/userService.test.ts` - BROKEN
- `src/test/authService.test.ts` - BROKEN
- `src/test/useAuth.test.tsx` - BROKEN

**Issue:** Tests expect the old separated services (`profileService`, `userServiceSimple`, `profileCache`) but code now uses unified `userService`

**Root Cause:** Service consolidation completed but tests not updated. Tests are importing and mocking services that have been consolidated.

**Symptoms:**
```
expect(received).toBe(expected) // Object.is equality
Expected: true
Received: false

expect(received).toBe(expected) // Object.is equality
Expected: "User not authenticated"
Received: "Authentication error: Auth session missing!"
```

**Fix Effort:** Medium (2-3 hours)

**Worth Fixing:** ✅ **YES** - Core functionality, these guard against auth regressions

**Fix Strategy:**
1. Update mocks to match new unified `userService` interface
2. Update method calls (e.g., `getOrCreateDatabaseUser` → `getOrCreateUser`)
3. Update import statements from old services to `userService`
4. Fix error message expectations to match new service responses
5. Update mock chain structures for Supabase calls

**Example Fix:**
```typescript
// OLD
jest.mock('../services/profileService', () => ({ ... }));
const result = await profileService.getUserProfile(id);

// NEW
jest.mock('../services/userService', () => ({
  userService: { getUserProfile: jest.fn() }
}));
const result = await userService.getUserProfile(id);
```

---

### 1.2 Privacy & GDPR Services ⚠️ HIGH PRIORITY (Legal Compliance)

**Files:**
- `src/test/privacyService-comprehensive.test.ts` - PARTIALLY BROKEN (10/30 tests failing)
- `src/test/gdprService.test.ts` - BROKEN
- `src/test/phase3-privacy-integration.test.ts` - BROKEN

**Issue:** Database operation tests failing (all localStorage tests pass). Supabase mock setup not matching actual service database calls.

**Symptoms:**
```
✅ PASSING: All localStorage operations
✅ PASSING: Session management
✅ PASSING: Consent banner logic
❌ FAILING: Database upsert operations
❌ FAILING: Privacy audit logging
❌ FAILING: Consent synchronization with database
```

**Root Cause:** Supabase mock implementation doesn't match the actual call chain in `privacyService.ts` for `user_preferences` and `privacy_audit_log` tables.

**Fix Effort:** Low-Medium (1-2 hours)

**Worth Fixing:** ✅ **YES** - GDPR compliance is legally critical

**Fix Strategy:**
1. Review actual database calls in `privacyService.ts` (lines ~200-300)
2. Update Supabase mock implementations for `user_preferences` and `privacy_audit_log` tables
3. Fix mock chain for `.from().upsert()` and `.from().insert()` calls
4. Ensure mock returns match expected `{ data, error }` structure
5. Add proper mock implementations for table switching in `mockSupabase.from()`

**Example Fix:**
```typescript
// Update mock to handle different tables
mockSupabase.from.mockImplementation((table) => {
  if (table === 'user_preferences') {
    return { upsert: mockUpsert };
  }
  if (table === 'privacy_audit_log') {
    return { insert: mockInsert };
  }
  return { upsert: mockUpsert, insert: mockInsert };
});
```

---

### 1.3 Review Service ⚠️ HIGH PRIORITY

**Files:**
- `src/test/reviewService.test.ts` - BROKEN (all tests failing)

**Issue:** `TypeError: Cannot read properties of undefined (reading 'createReview')`

**Root Cause:** Test imports are broken - service not being imported correctly. Likely export/import mismatch after refactoring.

**Symptoms:**
```
TypeError: Cannot read properties of undefined (reading 'createReview')
TypeError: Cannot read properties of undefined (reading 'getReviewsForGame')
TypeError: Cannot read properties of undefined (reading 'updateReview')
```

**Fix Effort:** Low (30 mins - 1 hour)

**Worth Fixing:** ✅ **YES** - Core feature functionality (reviews are central to the app)

**Fix Strategy:**
1. Check if `reviewService` exports have changed (default vs named export)
2. Fix import statements in test file
3. Verify service is properly mocked before use
4. Update mock setup if service interface changed
5. Check if `reviewService` depends on consolidated `userService`

**Example Fix:**
```typescript
// Check current export style in reviewService.ts
// If it's now a class instance:
import { reviewService } from '../services/reviewService';

// Update test to properly import
const mockReviewService = reviewService as jest.Mocked<typeof reviewService>;
```

---

## Category 2: Important - Should Fix (Medium Value)

### 2.1 Component Tests with Service Dependencies

**Files:**
- `src/components/auth/AuthModal.test.tsx` - BROKEN
- `src/test/PrivacyConsentBanner.test.tsx` - BROKEN
- `src/test/EnhancedPrivacySettings.test.tsx` - BROKEN
- `src/test/privacy-ui-components.test.tsx` - BROKEN
- `src/test/explore-page-simple.test.tsx` - BROKEN (9/9 tests failing)

**Issue:** Components depend on refactored services; mocks are outdated and don't match new service interfaces.

**Root Cause:** Component tests have hardcoded mocks for old service structure. When components call the new consolidated services, mocks don't match.

**Fix Effort:** Medium (3-4 hours total)

**Worth Fixing:** ✅ **YES** - Prevents UI regressions and ensures components work with refactored services

**Fix Strategy:**
1. Update service mocks to match consolidated services
2. Fix import paths (profileService → userService)
3. Update expected prop types/function signatures
4. Ensure components are passed correctly mocked services via context/props
5. Update test assertions to match new component behavior

---

### 2.2 Collection & Notification Services

**Files:**
- `src/test/collectionWishlistService.test.ts` - BROKEN
- `src/test/notificationService.test.ts` - BROKEN

**Issue:** Likely depend on `userService` changes for user lookup/validation

**Fix Effort:** Low-Medium (1-2 hours)

**Worth Fixing:** ✅ **YES** - User-facing features (collections and notifications are key features)

**Fix Strategy:**
1. Check if these services import old user/profile services
2. Update service dependencies to use unified `userService`
3. Update test mocks accordingly
4. Verify database query mocks still match actual service calls

---

## Category 3: Low Priority - Fix if Time Permits

### 3.1 Search & Filtering Analysis Tests

**Files:**
- `src/test/result-analysis.test.ts` - BROKEN (3 specific tests failing)
  - "should calculate partial quality scores correctly" - Expected 0.6, got 0.4
  - "should identify sorting anomalies" - Expected 1 anomaly, got 0
  - "should identify missing relevant terms" - Expected to find 'luigi', found nothing
- `src/test/game-type-prioritization-sorting.test.ts` - BROKEN
- `src/test/explore-service-unified-score.test.ts` - BROKEN
- `src/test/mario-data-quality-analysis.test.ts` - BROKEN

**Issue:** Algorithm changes or quality metric calculations changed. These tests have very specific expectations about scoring and ranking logic.

**Root Cause:** These tests are tightly coupled to specific algorithm behavior. Changes to quality scoring, sorting weights, or relevance calculations break tests even if behavior is correct.

**Fix Effort:** Medium (2-3 hours)

**Worth Fixing:** ⚠️ **MAYBE** - These are analytical/diagnostic tests for search quality

**Recommendation:**
1. Review if the underlying algorithms changed intentionally during refactoring
2. If quality metrics were intentionally adjusted, update test expectations to match new behavior
3. If tests are overly specific (e.g., expecting exact 0.6 score instead of range), consider relaxing assertions
4. Consider replacing with integration tests that check "good enough" behavior instead of exact metrics

**Decision Point:** Are these tests documenting required behavior, or are they just brittle implementation details?

---

### 3.2 A/B Testing Service

**Files:**
- `src/test/ab-testing-service.test.ts` - BROKEN

**Issue:** Unknown, needs investigation

**Fix Effort:** Low (1 hour)

**Worth Fixing:** ⚠️ **MAYBE** - Depends on if A/B testing is actively used in production

**Recommendation:** Check if A/B testing is:
- Currently used in production → Fix it
- Planned feature → Keep but mark as skipped
- Experimental/unused → Archive or delete

---

### 3.3 Phase Integration Tests

**Files:**
- `src/test/phase3-implementation.test.ts` - BROKEN
- `src/test/phase3-verification.test.ts` - BROKEN
- `src/test/phase3-privacy-integration.test.ts` - BROKEN

**Issue:** These appear to be development-phase validation tests from a specific feature rollout

**Fix Effort:** Low-Medium (1-2 hours)

**Worth Fixing:** ❌ **PROBABLY NOT** - These were likely one-time implementation validation tests

**Recommendation:**
- These tests served their purpose during "Phase 3" development
- Delete them or move to `src/test/archive/historical/`
- If they test important integration patterns, extract those into proper integration tests with better names

---

## Category 4: Should Remove/Archive

### 4.1 DMCA & Content Protection Tests

**Files:**
- `src/test/dmca-management.test.ts` - BROKEN
- `src/test/dmca-timeout-fix.test.ts` - BROKEN
- `src/test/aggressive-copyright.test.ts` - BROKEN

**Issue:** These test DMCA takedown and content protection features

**Worth Fixing:** ❓ **DEPENDS** - Only if DMCA management is actively used in production

**Recommendation:**
1. Check if DMCA features are production-ready and enabled
2. If yes → Fix and maintain these tests
3. If no → Move to `src/test/experimental/` or delete
4. If planned → Keep but mark with `test.skip()`

**Questions to Answer:**
- Is there a DMCA takedown process in production?
- Are admin users using DMCA management features?
- Is this feature complete or still in development?

---

### 4.2 One-off Diagnostic Tests

**Files:**
- `src/test/interface-validation.test.ts` - BROKEN
- `src/test/searchObservabilityService.test.ts` - BROKEN
- `src/test/tracking-rate-limits.test.ts` - BROKEN
- `src/test/igdb-database-fallback.test.ts` - BROKEN

**Worth Fixing:** ❌ **NO** - These appear to be one-time diagnostic/debugging tests

**Recommendation:**
- Move to `src/test/archive/diagnostics/`
- Or delete entirely if they were just for one-time debugging
- These don't test features, they test implementation details during development

---

## Priority Execution Plan

### Week 1 - Critical Path (Must Fix)
Estimated: 8 hours total

1. ✅ **userService.test.ts** - Fix unified service mocks (3 hours)
   - Update all imports and mocks
   - Fix method name changes
   - Update error message expectations

2. ✅ **authService.test.ts** - Update auth flow tests (2 hours)
   - Update userService integration
   - Fix session management tests

3. ✅ **reviewService.test.ts** - Fix import and export issues (1 hour)
   - Debug import/export mismatch
   - Fix service initialization

4. ✅ **privacyService-comprehensive.test.ts** - Fix database mocks (2 hours)
   - Update Supabase mock chains
   - Fix user_preferences and privacy_audit_log mocks

### Week 2 - Important Features
Estimated: 7 hours total

5. ✅ **Component tests** - AuthModal, PrivacyConsentBanner, EnhancedPrivacySettings, etc. (4 hours)
   - Update service mocks in component contexts
   - Fix prop expectations

6. ✅ **collectionWishlistService.test.ts** + **notificationService.test.ts** (2 hours)
   - Update userService integration
   - Fix database query mocks

7. ✅ **gdprService.test.ts** (1 hour)
   - Update to work with refactored privacy service

### Later - If Needed
Estimated: 5 hours

8. ⚠️ **Search analysis tests** - Review if algorithm changes were intentional (2 hours)
   - Decide if tests need updating or relaxing

9. ⚠️ **A/B testing** - If feature is active (1 hour)

10. ⚠️ **Explore remaining failures** - Triage case-by-case (2 hours)

### Cleanup Tasks
Estimated: 2 hours

11. ❌ **Archive or delete:**
    - Phase validation tests (`phase3-*.test.ts`)
    - Diagnostic tests (interface-validation, searchObservability, tracking-rate-limits)
    - Decide on DMCA tests based on feature status
    - Search algorithm tests with overly specific expectations

---

## Estimated Total Effort

- **Critical fixes (Week 1):** ~8 hours
- **Important fixes (Week 2):** ~7 hours
- **Optional fixes:** ~5 hours
- **Test cleanup:** ~2 hours

**Total:** ~22 hours to get to 90%+ passing rate on valuable tests

---

## Success Metrics

**Target State:**
- All Category 1 (Critical) tests passing: ~15 test suites fixed
- All Category 2 (Important) tests passing: ~7 test suites fixed
- Category 3 & 4 archived or documented as intentionally skipped
- **Goal:** 95%+ pass rate on maintained test suites

**Test Health After Fix:**
- Core services: 100% passing
- Component tests: 100% passing
- Integration tests: 95%+ passing
- Analytical/diagnostic tests: Archived or relaxed

---

## Notes for Future Refactoring

### Lessons Learned
1. **Update tests alongside service refactoring** - Don't separate the work
2. **Phase tests should be temporary** - Mark with clear deletion dates
3. **Avoid overly specific algorithm tests** - Test behavior, not implementation
4. **Mock at the boundary** - Mock Supabase, not internal service functions

### Test Maintenance Guidelines
1. **Keep test file names matching service names** - `userService.ts` → `userService.test.ts`
2. **Update tests in the same PR as service changes** - Don't let them drift
3. **Mark diagnostic tests clearly** - Use `*.diagnostic.test.ts` naming convention
4. **Archive old phase tests** - Move to `src/test/archive/phase-{n}/` after completion

### Red Flags for Test Quality
- ❌ Tests that break when refactoring without behavior changes
- ❌ Tests checking exact numeric values instead of ranges
- ❌ Tests named after bug IDs or phases instead of features
- ❌ Tests that test implementation details instead of contracts
- ✅ Tests that would catch real bugs users would encounter

---

## Quick Reference: Test Categories

| Category | Status | Action | Priority |
|----------|--------|--------|----------|
| Auth & User Services | Broken | Fix | 🔴 Critical |
| Privacy & GDPR | Partially Broken | Fix | 🔴 Critical |
| Review Service | Broken | Fix | 🔴 Critical |
| Component Tests | Broken | Fix | 🟡 Important |
| Collection/Notification | Broken | Fix | 🟡 Important |
| Search Analysis | Broken | Review | 🟢 Low Priority |
| A/B Testing | Broken | Investigate | 🟢 Low Priority |
| Phase Tests | Broken | Delete | ⚪ Archive |
| DMCA Tests | Broken | Decision Needed | ⚪ Archive |
| Diagnostic Tests | Broken | Delete | ⚪ Archive |

---

## Commands for Testing

```bash
# Run all tests
npm test

# Run fast tests only (skips slow integration tests)
npm run test:fast

# Run unit tests only
npm run test:unit

# Run specific test file
npm test -- src/test/userService.test.ts

# Run with coverage
npm run test:coverage

# Run in watch mode (for active development)
npm run test:watch

# CI-optimized run
npm run test:ci
```

---

**Last Updated:** 2025-10-01
**Next Review:** After completing Week 1 critical fixes
