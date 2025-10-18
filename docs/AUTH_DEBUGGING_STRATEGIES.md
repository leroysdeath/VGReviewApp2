# Authentication Debugging Strategies

This document outlines strategies for debugging user-specific auth issues without requiring user passwords.

## Problem Statement

Users report authentication errors, but we can't replicate them without their passwords. We need systematic ways to:
1. Capture detailed error information
2. Diagnose account state issues
3. Test edge cases proactively
4. Monitor auth failures in real-time

---

## 1. Enhanced Server-Side Logging

**Purpose:** Capture detailed information about every auth attempt to understand failure patterns.

### Implementation

Create an auth audit service:

```typescript
// src/services/authAuditService.ts
interface AuthAuditLog {
  timestamp: string;
  username_or_email: string; // Don't log passwords!
  action: 'login_attempt' | 'login_success' | 'login_failure';
  error_code?: string;
  error_message?: string;
  user_agent?: string;
  ip_address?: string; // If available
  lookup_method?: 'email' | 'username';
  supabase_error?: any;
}

export async function logAuthAttempt(log: AuthAuditLog) {
  // Store in Supabase table for analysis
  await supabase.from('auth_audit_log').insert(log);
}
```

Add to `authService.ts`:

```typescript
// In signIn method, add logging
try {
  const result = await supabase.auth.signInWithPassword({ email, password });

  if (result.error) {
    await logAuthAttempt({
      timestamp: new Date().toISOString(),
      username_or_email: emailOrUsername,
      action: 'login_failure',
      error_code: result.error.code,
      error_message: result.error.message,
      lookup_method: emailOrUsername.includes('@') ? 'email' : 'username',
      supabase_error: result.error
    });
  }
} catch (error) {
  await logAuthAttempt({
    timestamp: new Date().toISOString(),
    username_or_email: emailOrUsername,
    action: 'login_failure',
    error_message: error.message,
    lookup_method: emailOrUsername.includes('@') ? 'email' : 'username'
  });
}
```

### Database Schema

```sql
-- Migration: Create auth audit table
CREATE TABLE auth_audit_log (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  username_or_email TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('login_attempt', 'login_success', 'login_failure')),
  error_code TEXT,
  error_message TEXT,
  lookup_method TEXT CHECK (lookup_method IN ('email', 'username')),
  user_agent TEXT,
  ip_address INET
);

-- Index for quick queries
CREATE INDEX idx_auth_audit_timestamp ON auth_audit_log(timestamp DESC);
CREATE INDEX idx_auth_audit_failures ON auth_audit_log(action) WHERE action = 'login_failure';
CREATE INDEX idx_auth_audit_user ON auth_audit_log(username_or_email);

-- Enable RLS
ALTER TABLE auth_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs
CREATE POLICY "Admins can read auth audit logs"
  ON auth_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "user"
      WHERE "user".provider_id = auth.uid()
      AND "user".is_admin = true
    )
  );
```

---

## 2. User Impersonation System

**Purpose:** Allow admins to securely sign in as users to reproduce their exact experience.

### Implementation

```typescript
// src/services/impersonationService.ts
import { supabaseAdmin } from './supabaseAdmin';
import { supabase } from './supabase';

export async function generateImpersonationToken(
  adminUserId: string,
  targetUserId: string
): Promise<string> {
  // 1. Verify admin has permission
  const { data: admin } = await supabase
    .from('user')
    .select('is_admin')
    .eq('id', adminUserId)
    .single();

  if (!admin?.is_admin) {
    throw new Error('Unauthorized: Admin privileges required');
  }

  // 2. Get target user's provider_id
  const { data: targetUser } = await supabase
    .from('user')
    .select('provider_id, username')
    .eq('id', targetUserId)
    .single();

  if (!targetUser) {
    throw new Error('Target user not found');
  }

  // 3. Create temporary impersonation session using Supabase Admin API
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: targetUser.email,
    options: {
      redirectTo: `${window.location.origin}/impersonation-active`
    }
  });

  if (error) throw error;

  // 4. Log the impersonation for audit trail
  await supabase.from('impersonation_log').insert({
    admin_user_id: adminUserId,
    target_user_id: targetUserId,
    target_username: targetUser.username,
    timestamp: new Date().toISOString()
  });

  return data.properties.action_link;
}
```

### Database Schema

```sql
CREATE TABLE impersonation_log (
  id BIGSERIAL PRIMARY KEY,
  admin_user_id INTEGER NOT NULL REFERENCES "user"(id),
  target_user_id INTEGER NOT NULL REFERENCES "user"(id),
  target_username TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

CREATE INDEX idx_impersonation_admin ON impersonation_log(admin_user_id);
CREATE INDEX idx_impersonation_target ON impersonation_log(target_user_id);

-- Enable RLS
ALTER TABLE impersonation_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read impersonation logs
CREATE POLICY "Admins can read impersonation logs"
  ON impersonation_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "user"
      WHERE "user".provider_id = auth.uid()
      AND "user".is_admin = true
    )
  );
```

---

## 3. Test Account Generator

**Purpose:** Create test accounts that mirror problematic user configurations.

### Implementation

```typescript
// src/test/helpers/createTestAccount.ts
import { authService } from '../../services/authService';

export interface TestAccountOptions {
  hasSpecialChars?: boolean;
  hasMixedCase?: boolean;
  emailDomain?: string;
  accountAge?: 'new' | 'old';
  usernameLength?: number;
}

export async function createTestAccountLike(
  usernamePattern: string,
  options: TestAccountOptions = {}
) {
  const timestamp = Date.now();
  const testEmail = `test+${timestamp}@${options.emailDomain || 'test.com'}`;
  const testPassword = 'TestPassword123!';

  let testUsername = usernamePattern;

  // Apply transformations
  if (!options.hasMixedCase) {
    testUsername = testUsername.toLowerCase();
  }

  if (options.usernameLength) {
    testUsername = testUsername.substring(0, options.usernameLength);
  }

  // Add special chars if requested
  if (options.hasSpecialChars) {
    testUsername = testUsername + '_' + timestamp;
  }

  const { data, error } = await authService.signUp(
    testEmail,
    testPassword,
    testUsername
  );

  if (error) {
    console.error('Failed to create test account:', error);
    throw error;
  }

  console.log('✅ Test account created:', {
    email: testEmail,
    password: testPassword,
    username: testUsername,
    userId: data?.user?.id
  });

  return {
    email: testEmail,
    password: testPassword,
    username: testUsername,
    userId: data?.user?.id
  };
}

// Cleanup helper
export async function cleanupTestAccount(email: string) {
  // Requires admin privileges
  await supabaseAdmin.auth.admin.deleteUser(userId);
}
```

### Usage Example

```typescript
// Create a test account like a problematic user
const testAccount = await createTestAccountLike('ProblemUser123', {
  hasMixedCase: true,
  hasSpecialChars: false,
  emailDomain: 'gmail.com'
});

// Test login with the created account
const result = await authService.signIn(testAccount.username, testAccount.password);
```

---

## 4. Database State Inspector

**Purpose:** Diagnostic tool to check user account state and identify discrepancies.

### Implementation

```typescript
// src/services/authDiagnosticsService.ts
import { supabase } from './supabase';
import { supabaseAdmin } from './supabaseAdmin';

export interface UserDiagnostics {
  database_user: any;
  auth_user: any;
  discrepancies: string[];
  recommendations: string[];
}

export async function diagnoseUserAuth(
  usernameOrEmail: string
): Promise<UserDiagnostics> {
  const isEmail = usernameOrEmail.includes('@');

  // 1. Check user table
  const { data: user, error: dbError } = await supabase
    .from('user')
    .select('*')
    .eq(isEmail ? 'email' : 'username', usernameOrEmail.toLowerCase())
    .single();

  if (dbError || !user) {
    return {
      database_user: null,
      auth_user: null,
      discrepancies: ['User not found in database'],
      recommendations: ['Verify the username/email is correct', 'Check if user was deleted']
    };
  }

  // 2. Check auth.users (requires service role)
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin
    .getUserById(user.provider_id);

  // 3. Identify discrepancies
  const discrepancies: string[] = [];
  const recommendations: string[] = [];

  if (!authUser) {
    discrepancies.push('Auth record missing - user exists in DB but not in auth.users');
    recommendations.push('User needs to re-register or contact support');
  }

  if (user.email !== authUser?.email) {
    discrepancies.push(`Email mismatch: DB="${user.email}" vs Auth="${authUser?.email}"`);
    recommendations.push('Update email in database or auth.users to match');
  }

  if (!authUser?.email_confirmed_at) {
    discrepancies.push('Email not confirmed');
    recommendations.push('User needs to confirm their email address');
  }

  if (authUser?.banned_until) {
    discrepancies.push(`Account banned until ${authUser.banned_until}`);
    recommendations.push('Contact admin to unban account');
  }

  // 4. Check recent login attempts
  const { data: recentAttempts } = await supabase
    .from('auth_audit_log')
    .select('*')
    .eq('username_or_email', usernameOrEmail.toLowerCase())
    .order('timestamp', { ascending: false })
    .limit(5);

  if (recentAttempts && recentAttempts.length > 0) {
    const failureCount = recentAttempts.filter(a => a.action === 'login_failure').length;
    if (failureCount >= 3) {
      discrepancies.push(`${failureCount} recent login failures`);
      recommendations.push('Check error messages in auth_audit_log for patterns');
    }
  }

  return {
    database_user: {
      id: user.id,
      username: user.username,
      email: user.email,
      created_at: user.created_at,
      last_login: user.last_login,
      provider_id: user.provider_id
    },
    auth_user: authUser ? {
      id: authUser.id,
      email: authUser.email,
      email_confirmed: !!authUser.email_confirmed_at,
      last_sign_in: authUser.last_sign_in_at,
      banned: authUser.banned_until,
      created_at: authUser.created_at
    } : null,
    discrepancies,
    recommendations
  };
}
```

### Usage

```typescript
// Diagnose a user's auth state
const diagnostics = await diagnoseUserAuth('ProblemUser123');

console.log('Discrepancies:', diagnostics.discrepancies);
console.log('Recommendations:', diagnostics.recommendations);
```

---

## 5. Client-Side Error Reporting

**Purpose:** Capture detailed error information from the client side.

### Implementation

```typescript
// src/services/errorReportingService.ts
export interface AuthErrorReport {
  error_message: string;
  error_code?: string;
  username_pattern: string; // Sanitized username
  browser: string;
  timestamp: string;
  page_url: string;
}

export async function reportAuthError(
  error: any,
  username: string
): Promise<void> {
  // Sanitize username (remove digits, keep pattern)
  const sanitizedUsername = username
    .replace(/[0-9]/g, 'X')
    .replace(/@.+/, '@DOMAIN'); // Hide email domain

  const report: AuthErrorReport = {
    error_message: error.message || 'Unknown error',
    error_code: error.code,
    username_pattern: sanitizedUsername,
    browser: navigator.userAgent,
    timestamp: new Date().toISOString(),
    page_url: window.location.pathname
  };

  // Store in Supabase
  await supabase.from('client_error_reports').insert(report);
}
```

### Integration in AuthModal

```typescript
// src/components/auth/AuthModal.tsx
const handleLogin = async () => {
  try {
    const result = await authService.signIn(username, password);

    if (result.error) {
      // Report error for analysis
      await reportAuthError(result.error, username);

      // Show user-friendly error
      setError(getUserFriendlyError(result.error));
    }
  } catch (error) {
    await reportAuthError(error, username);
    setError('An unexpected error occurred');
  }
};
```

### Database Schema

```sql
CREATE TABLE client_error_reports (
  id BIGSERIAL PRIMARY KEY,
  error_message TEXT NOT NULL,
  error_code TEXT,
  username_pattern TEXT NOT NULL,
  browser TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  page_url TEXT
);

CREATE INDEX idx_client_errors_timestamp ON client_error_reports(timestamp DESC);
CREATE INDEX idx_client_errors_code ON client_error_reports(error_code);
```

---

## 6. Automated Fuzzing Tests

**Purpose:** Proactively test edge cases and unusual input patterns.

### Implementation

```typescript
// src/test/auth-fuzzing.test.ts
import { authService } from '../services/authService';

describe('Auth Fuzzing Tests', () => {
  const problemPatterns = [
    { username: 'User@Name', password: 'Pass123!', desc: 'Username with @ symbol' },
    { username: "User'Name", password: 'Pass123!', desc: 'Username with apostrophe' },
    { username: 'User Name', password: 'Pass123!', desc: 'Username with space' },
    { username: 'user\nname', password: 'Pass123!', desc: 'Username with newline' },
    { username: 'Üser', password: 'Pass123!', desc: 'Username with unicode' },
    { username: 'a'.repeat(100), password: 'Pass123!', desc: 'Very long username' },
    { username: '', password: 'Pass123!', desc: 'Empty username' },
    { username: 'user', password: '', desc: 'Empty password' },
    { username: '../admin', password: 'Pass123!', desc: 'Path traversal attempt' },
    { username: 'user; DROP TABLE user;', password: 'Pass123!', desc: 'SQL injection attempt' },
    { username: '<script>alert(1)</script>', password: 'Pass123!', desc: 'XSS attempt' },
    { username: 'user\0name', password: 'Pass123!', desc: 'Null byte injection' },
  ];

  problemPatterns.forEach(pattern => {
    it(`should handle gracefully: ${pattern.desc}`, async () => {
      const result = await authService.signIn(pattern.username, pattern.password);

      // Should fail gracefully, not crash
      expect(result.error).toBeTruthy();
      expect(result.error.message).toBeDefined();
      expect(typeof result.error.message).toBe('string');

      // Should not leak implementation details
      expect(result.error.message.toLowerCase()).not.toContain('sql');
      expect(result.error.message.toLowerCase()).not.toContain('database');
      expect(result.error.message.toLowerCase()).not.toContain('query');
    });
  });

  it('should handle rapid repeated login attempts', async () => {
    const attempts = Array(10).fill(null).map(() =>
      authService.signIn('nonexistent', 'wrong')
    );

    const results = await Promise.all(attempts);

    // All should fail gracefully
    results.forEach(result => {
      expect(result.error).toBeTruthy();
      expect(result.user).toBeNull();
    });
  });

  it('should handle concurrent logins with different users', async () => {
    // This requires valid test credentials
    const attempts = [
      authService.signIn('user1@test.com', 'pass1'),
      authService.signIn('user2@test.com', 'pass2'),
      authService.signIn('user3@test.com', 'pass3'),
    ];

    const results = await Promise.allSettled(attempts);

    // Should not cause race conditions or crashes
    results.forEach(result => {
      expect(result.status).toMatch(/fulfilled|rejected/);
    });
  });
});
```

---

## 7. Real-Time Error Monitoring Dashboard

**Purpose:** Admin dashboard showing recent auth failures and patterns.

### Implementation

```typescript
// src/pages/AdminAuthMonitorPage.tsx
import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

export function AdminAuthMonitorPage() {
  const [recentFailures, setRecentFailures] = useState([]);
  const [stats, setStats] = useState({
    last_hour: 0,
    last_day: 0,
    top_errors: []
  });

  useEffect(() => {
    loadAuthFailures();

    // Set up real-time subscription
    const subscription = supabase
      .channel('auth_audit')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'auth_audit_log',
        filter: 'action=eq.login_failure'
      }, payload => {
        setRecentFailures(prev => [payload.new, ...prev].slice(0, 50));
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function loadAuthFailures() {
    // Get recent failures
    const { data: failures } = await supabase
      .from('auth_audit_log')
      .select('*')
      .eq('action', 'login_failure')
      .order('timestamp', { ascending: false })
      .limit(50);

    setRecentFailures(failures || []);

    // Get stats
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { count: hourCount } = await supabase
      .from('auth_audit_log')
      .select('*', { count: 'exact', head: true })
      .eq('action', 'login_failure')
      .gte('timestamp', oneHourAgo);

    const { count: dayCount } = await supabase
      .from('auth_audit_log')
      .select('*', { count: 'exact', head: true })
      .eq('action', 'login_failure')
      .gte('timestamp', oneDayAgo);

    // Get top error messages
    const { data: topErrors } = await supabase.rpc('get_top_auth_errors', {
      since_timestamp: oneDayAgo
    });

    setStats({
      last_hour: hourCount || 0,
      last_day: dayCount || 0,
      top_errors: topErrors || []
    });
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Auth Failure Monitor</h1>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-lg font-semibold">Last Hour</h3>
          <p className="text-3xl">{stats.last_hour}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-lg font-semibold">Last 24 Hours</h3>
          <p className="text-3xl">{stats.last_day}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-lg font-semibold">Active Now</h3>
          <p className="text-3xl text-red-500">{recentFailures.length}</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-xl font-bold mb-4">Recent Failures</h2>
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2">Time</th>
              <th className="text-left p-2">User</th>
              <th className="text-left p-2">Method</th>
              <th className="text-left p-2">Error</th>
            </tr>
          </thead>
          <tbody>
            {recentFailures.map(failure => (
              <tr key={failure.id} className="border-b hover:bg-gray-50">
                <td className="p-2">{new Date(failure.timestamp).toLocaleString()}</td>
                <td className="p-2">{failure.username_or_email}</td>
                <td className="p-2">{failure.lookup_method}</td>
                <td className="p-2 text-red-600">{failure.error_message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

### Supporting SQL Function

```sql
-- Get top auth error messages
CREATE OR REPLACE FUNCTION get_top_auth_errors(since_timestamp TIMESTAMPTZ)
RETURNS TABLE (
  error_message TEXT,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    auth_audit_log.error_message,
    COUNT(*) as count
  FROM auth_audit_log
  WHERE
    action = 'login_failure'
    AND timestamp >= since_timestamp
  GROUP BY auth_audit_log.error_message
  ORDER BY count DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 8. Password Reset Audit Trail

**Purpose:** Track password reset patterns which may indicate auth issues.

### Database Schema

```sql
CREATE TABLE password_reset_log (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES "user"(id),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX idx_password_reset_user ON password_reset_log(user_id);
CREATE INDEX idx_password_reset_time ON password_reset_log(requested_at DESC);

-- Enable RLS
ALTER TABLE password_reset_log ENABLE ROW LEVEL SECURITY;

-- Users can see their own resets
CREATE POLICY "Users can view own password resets"
  ON password_reset_log FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM "user"
      WHERE provider_id = auth.uid()
    )
  );

-- Admins can see all resets
CREATE POLICY "Admins can view all password resets"
  ON password_reset_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "user"
      WHERE "user".provider_id = auth.uid()
      AND "user".is_admin = true
    )
  );
```

### Integration

```typescript
// In authService.ts resetPassword method
export async function resetPassword(email: string): Promise<{ error: any }> {
  const { error } = await supabase.auth.resetPasswordForEmail(email);

  // Log the request
  if (!error) {
    const { data: user } = await supabase
      .from('user')
      .select('id')
      .eq('email', email)
      .single();

    if (user) {
      await supabase.from('password_reset_log').insert({
        user_id: user.id,
        requested_at: new Date().toISOString()
      });
    }
  }

  return { error };
}
```

---

## Implementation Priority

1. **✅ Auth Audit Logging** (Immediate - provides visibility)
2. **Database State Inspector** (Quick wins - diagnostic tool)
3. **Fuzzing Tests** (Proactive - catch edge cases)
4. **Error Reporting** (User-facing - capture client errors)
5. **Monitoring Dashboard** (Long-term - operational visibility)
6. **Test Account Generator** (As needed - reproduction tool)
7. **Impersonation System** (Advanced - requires careful security review)
8. **Password Reset Audit** (Nice to have - additional context)

---

## Maintenance

- Review auth audit logs weekly
- Run fuzzing tests in CI/CD pipeline
- Monitor dashboard alerts for spike in failures
- Clean up old audit logs (>90 days) periodically

---

## Security Considerations

- **Never log passwords** - even hashed
- **Sanitize usernames** in client-side error reports
- **Restrict admin access** to diagnostic tools
- **Audit impersonation usage** regularly
- **Rate limit** error reporting endpoints
- **Encrypt sensitive data** in audit logs at rest

---

## Related Documentation

- [MANUAL_TEST_AUTH.md](./MANUAL_TEST_AUTH.md) - Manual testing procedures
- [INTEGRATION_TESTS.md](./INTEGRATION_TESTS.md) - Integration test documentation
- [SECURITY_PREFERENCES.md](../SECURITY_PREFERENCES.md) - Security guidelines
