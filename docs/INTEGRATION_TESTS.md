# Authentication Integration Tests

## Overview

This document describes the comprehensive integration tests for the authentication system. These tests run against the **real Supabase database** to catch actual issues that users experience in production.

## Test File

**Location**: `src/test/auth-integration.test.ts`

## Setup

### 1. Test Credentials

The tests use real user credentials stored in `src/test/test-credentials.ts`:

```bash
# Copy the example file
cp src/test/test-credentials.example.ts src/test/test-credentials.ts

# The file is already gitignored for security
```

**Important**: `test-credentials.ts` is **gitignored** and will never be committed to version control.

### 2. Test Accounts

The tests use these real accounts:

| Account | Email | Username | Purpose |
|---------|-------|----------|---------|
| control | hotboytime69@gmail.com | dothog | Working baseline |
| broken1 | thomas.waalkes+test7@gmail.com | majordangus | Previously broken |
| broken2 | thomas.waalkes+test3@gmail.com | generalnotion | Previously broken |
| broken3 | thomas.waalkes+test2@gmail.com | dariusfudge | Previously broken |
| broken4 | thomas.waalkes+createtest4@gmail.com | aypieboybakemeapie911 | Previously broken |
| additional | joshuateusink@yahoo.com | leroysdeath | Additional test |

## Running the Tests

### Run All Integration Tests
```bash
npm test -- auth-integration.test.ts
```

### Run Specific Test Suites
```bash
# Email login tests only
npm test -- auth-integration.test.ts --testNamePattern="Email Login"

# Username login tests only
npm test -- auth-integration.test.ts --testNamePattern="Username Login"

# Edge cases only
npm test -- auth-integration.test.ts --testNamePattern="Edge Cases"

# Performance tests only
npm test -- auth-integration.test.ts --testNamePattern="Performance"
```

### Run in Watch Mode
```bash
npm test -- auth-integration.test.ts --watch
```

## Test Coverage

### 1. Email Login (5 tests)
- ✅ Valid email and password
- ✅ Valid email with wrong password
- ✅ Non-existent email
- ✅ Email with different casing
- ✅ Database profile verification

### 2. Username Login (6 tests)
- ✅ Valid username and password
- ✅ Username with different casing
- ✅ Valid username with wrong password
- ✅ Non-existent username
- ✅ All affected user accounts
- ✅ Database profile verification

### 3. Database Consistency (3 tests)
- ✅ User record matches auth user
- ✅ Username uniqueness
- ✅ Username-email mapping accuracy

### 4. Session Management (2 tests)
- ✅ Session maintained after login
- ✅ Session cleared after logout

### 5. Edge Cases (6 tests)
- ✅ Empty username/email
- ✅ Empty password
- ✅ Whitespace in username
- ✅ SQL injection attempt
- ✅ Very long username (300 chars)
- ✅ Special characters

### 6. Error Messages (2 tests)
- ✅ User-friendly error messages
- ✅ Network timeout handling

### 7. Performance (2 tests)
- ✅ Email login < 3 seconds
- ✅ Username login < 5 seconds

### 8. Concurrent Login (2 tests)
- ✅ Multiple rapid attempts
- ✅ Different accounts simultaneously

**Total: 28 comprehensive tests**

## What These Tests Catch

### Real User Issues
- ✅ Browser autofill with username (was broken, now fixed)
- ✅ Case-insensitive username matching
- ✅ Database sync issues
- ✅ Missing user profiles
- ✅ Inconsistent username-email mappings

### Security Issues
- ✅ SQL injection attempts
- ✅ Authentication bypass attempts
- ✅ Session management vulnerabilities

### Performance Issues
- ✅ Slow database queries
- ✅ Network timeouts
- ✅ Race conditions

### Data Integrity Issues
- ✅ Duplicate usernames
- ✅ Orphaned auth records
- ✅ Mismatched email addresses

## Expected Results

### Before Username Login Fix
```
❌ Username Login: 6/6 tests FAILED
   - Users couldn't login with usernames
   - Browser autofill broken

✅ Email Login: 5/5 tests PASSED
```

### After Username Login Fix
```
✅ Email Login: 5/5 tests PASSED
✅ Username Login: 6/6 tests PASSED
✅ All other tests: PASSED

Total: 28/28 tests passing
```

## Interpreting Results

### All Tests Pass ✅
- Authentication system is working correctly
- No user-facing issues detected
- Safe to deploy

### Some Tests Fail ❌

**If Email Login fails:**
- Critical issue - affects all users
- Check Supabase Auth service status
- Verify environment variables
- Check RLS policies

**If Username Login fails:**
- Users can still login with email
- Check `user` table RLS policies
- Verify username column exists and is indexed
- Check `authService.signIn()` logic

**If Database Consistency fails:**
- Data integrity issue
- May require database migration
- Check for orphaned records
- Verify unique constraints

**If Performance tests fail:**
- Non-critical but affects UX
- Check database query performance
- Verify indexes exist
- Check network latency

## Debugging Failed Tests

### 1. Check Supabase Connection
```typescript
// In test file
console.log('Supabase URL:', process.env.VITE_SUPABASE_URL);
console.log('Has Anon Key:', !!process.env.VITE_SUPABASE_ANON_KEY);
```

### 2. Check User Exists
```sql
-- In Supabase SQL Editor
SELECT id, username, email, provider_id
FROM "user"
WHERE username = 'majordangus';
```

### 3. Check RLS Policies
```sql
-- In Supabase SQL Editor
SELECT * FROM pg_policies
WHERE tablename = 'user';
```

### 4. Manual Login Test
```typescript
// In browser console
import { authService } from './services/authService';

const result = await authService.signIn('majordangus', 'HotBoy456!');
console.log('Result:', result);
```

## Continuous Integration

### Add to CI Pipeline
```yaml
# .github/workflows/test.yml
- name: Run Integration Tests
  run: npm test -- auth-integration.test.ts
  env:
    VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    VITE_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
```

### Scheduled Tests
Run these tests:
- ✅ Before every deployment
- ✅ After database migrations
- ✅ Daily (to catch production issues)
- ✅ After Supabase service updates

## Maintenance

### Adding New Test Accounts
1. Create test account in Supabase
2. Add to `test-credentials.ts`
3. Add test case in `auth-integration.test.ts`

### Updating After Schema Changes
- Update tests if user table schema changes
- Update tests if auth flow changes
- Keep tests in sync with production

### Security Best Practices
- ✅ Never commit `test-credentials.ts`
- ✅ Use test accounts only (never prod data)
- ✅ Rotate test passwords periodically
- ✅ Keep credentials in CI secrets

## Troubleshooting

### "test-credentials not found"
```bash
# Copy example file
cp src/test/test-credentials.example.ts src/test/test-credentials.ts
```

### "Invalid credentials"
- Verify passwords in `test-credentials.ts`
- Check if accounts still exist in Supabase
- Try manual login in browser first

### "Network error"
- Check Supabase service status
- Verify environment variables
- Check internet connection
- Check firewall settings

### "RLS policy violation"
- Check `user` table policies
- Verify anon role has SELECT on user table
- Check if migration was applied

## Next Steps

1. **Run the tests**: `npm test -- auth-integration.test.ts`
2. **Fix any failures**: Use debugging guide above
3. **Add to CI**: Automate testing
4. **Monitor**: Set up alerts for test failures
5. **Expand**: Add more edge cases as issues are discovered

## Contact

If tests fail consistently or you find new edge cases, document them and update this guide.
