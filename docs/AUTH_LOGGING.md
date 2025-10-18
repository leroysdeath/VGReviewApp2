# Authentication Logging System

## Overview

The auth logging system provides comprehensive, secure logging for all authentication operations in VGReviewApp2. It tracks auth attempts, successes, failures, and errors **WITHOUT exposing sensitive information** like passwords, tokens, or full email addresses.

## Features

- **Secure by Default**: Automatically redacts passwords, tokens, JWTs, and sensitive keys
- **Comprehensive Coverage**: Logs all auth operations (login, signup, logout, password reset, etc.)
- **Email Privacy**: Partial email sanitization (shows first 3 chars + domain)
- **User ID Privacy**: Shows only last 4 characters of user IDs
- **Error Context**: Captures error codes, messages, and stack traces
- **Zero Exposure**: No hardcoded credentials - follows project security guidelines
- **Console Integration**: Color-coded console output for easy debugging
- **Export Capabilities**: Copy logs to clipboard or generate error reports

## Getting Started

### Enable Auth Logging

Auth logging is **disabled by default** to reduce noise. Enable it when needed:

####Option 1: Browser Console
```javascript
// Enable auth logging
enableAuthLogging();

// Disable auth logging
disableAuthLogging();
```

#### Option 2: LocalStorage
```javascript
// Enable
localStorage.setItem('DEBUG_AUTH', 'true');
location.reload();

// Disable
localStorage.removeItem('DEBUG_AUTH');
location.reload();
```

#### Option 3: Programmatic
```javascript
import { authLogger } from './services/authLogger';

// Enable
authLogger.enable();

// Disable
authLogger.disable();

// Check status
authLogger.isEnabled(); // returns boolean
```

## Using the Auth Logger

### Viewing Logs

Once enabled, auth events appear in the console with color-coded icons:

- 🔍 **DEBUG** - Gray - Debug information
- ℹ️ **INFO** - Blue - Informational messages
- ⚠️ **WARNING** - Orange - Warning messages
- ❌ **ERROR** - Red - Error messages

### Console Commands

Access these commands directly in your browser console:

```javascript
// Get error logs only
getAuthErrors();

// Get auth statistics
getAuthStats();

// Export logs to clipboard
exportAuthLogs();

// Generate error report
authErrorReport();

// Access the logger directly
authLogger.getLogs();
authLogger.getRecentLogs(10);
authLogger.getLogsByEvent('login');
```

### Example Console Output

```javascript
// Successful login
ℹ️ [AuthLogger:INFO] auth_attempt_login
  Operation: login
  Email: joe***@example.com
  Timestamp: 2025-01-17T10:30:00.000Z

✅ [AuthLogger:INFO] auth_success_login
  Operation: login
  UserId: ***4567
  Email: joe***@example.com
  Timestamp: 2025-01-17T10:30:01.000Z

// Failed login
❌ [AuthLogger:ERROR] auth_failure_login
  Operation: login
  ErrorCode: invalid_credentials
  ErrorMessage: Invalid login credentials
  Email: joe***@example.com
  Timestamp: 2025-01-17T10:31:00.000Z
```

## What Gets Logged

### Successful Operations

- **Signup**: Email, user ID, username (sanitized)
- **Login**: Email or username, user ID (sanitized)
- **Logout**: Timestamp only
- **Password Reset**: Email (sanitized), redirect URL
- **Password Update**: Timestamp only (no password data)

### Failed Operations

- **All Fields Above** +
- Error code (e.g., `invalid_credentials`, `user_not_found`)
- Error message (sanitized to remove any sensitive data)
- Stack trace (sanitized to remove file paths)
- Additional context (metadata about the operation)

### Database Operations

- User ID creation/update success/failure
- Database user ID fetch operations
- Profile creation/update operations

## Security Guarantees

### What is NEVER Logged

- Passwords (input or hashed)
- JWT tokens or session tokens
- API keys or access tokens
- Full email addresses (only partial: `joe***@example.com`)
- Full user IDs (only last 4 chars: `***4567`)
- Absolute file paths in stack traces

### Sanitization Examples

```javascript
// Email sanitization
"joe.smith@example.com" → "joe***@example.com"

// User ID sanitization
"abc123-def456-ghi789" → "***i789"

// JWT token sanitization
"eyJhbGciOiJIUzI1NiI..." → "[JWT_TOKEN]"

// Password field sanitization
{ password: "secret123" } → { password: "[REDACTED]" }

// Stack trace sanitization
"/Users/dev/project/src/auth.ts" → ".../auth.ts"
```

## Error Reporting

### Generate Error Report

```javascript
// Console
authErrorReport();

// Programmatic
const report = authLogger.generateErrorReport();
console.log(report);
```

### Example Error Report

```
=== Authentication Error Report ===

Total Errors: 3
Time Range: 2025-01-17T10:00:00.000Z to 2025-01-17T11:00:00.000Z

=== Error Details ===

1. [2025-01-17T10:15:32.123Z] auth_failure_login
   Message: Authentication failed: login
   Metadata: {
     "operation": "login",
     "errorCode": "invalid_credentials",
     "email": "user***@example.com"
   }

2. [2025-01-17T10:45:11.456Z] signup_db_user_creation_failed
   Message: Failed to create database user
   Metadata: {
     "userId": "***5678",
     "username": "newuser"
   }

3. [2025-01-17T11:00:00.789Z] auth_failure_reset_password
   Message: Authentication failed: reset_password
   Metadata: {
     "operation": "reset_password",
     "errorCode": "rate_limit_exceeded",
     "email": "user***@example.com"
   }
```

## Statistics and Analytics

### Get Auth Statistics

```javascript
const stats = authLogger.getStats();
console.log(stats);
```

### Example Statistics Output

```javascript
{
  total: 156,
  byLevel: {
    info: 120,
    warn: 10,
    error: 15,
    debug: 11
  },
  byOperation: {
    auth: 45,
    login: 30,
    signup: 25,
    logout: 20,
    reset: 5,
    dbUserId: 31
  },
  recentErrors: [
    /* Last 5 errors */
  ]
}
```

## Integration Points

### Auth Service (authService.ts)

All authentication methods are instrumented:
- `signUp()` - Logs attempt, success/failure, DB user creation
- `signIn()` - Logs attempt, username lookup, success/failure
- `signOut()` - Logs attempt, success/failure
- `resetPassword()` - Logs attempt, redirect URL, success/failure
- `updatePassword()` - Logs attempt, success/failure
- `getCurrentUser()` - Logs errors only
- `getCurrentSession()` - Logs errors only

### Auth Hook (useAuth.ts)

Session state changes are logged via the existing `stateLogger` integration.

### Auth Modal (AuthModal.tsx)

UI-level errors are handled by the auth service logging - no additional instrumentation needed.

## Development Workflow

### Local Development

1. Enable auth logging in console: `enableAuthLogging()`
2. Perform auth operation (login, signup, etc.)
3. Check console for logged events
4. If errors occur, use `getAuthErrors()` to see full error details
5. Use `authErrorReport()` to get formatted report for debugging

### Debugging Auth Issues

```javascript
// 1. Enable logging
enableAuthLogging();

// 2. Reproduce the issue
// (perform auth operation that's failing)

// 3. Check recent logs
authLogger.getRecentLogs(20);

// 4. Filter by event type
authLogger.getLogsByEvent('login');
authLogger.getLogsByEvent('failure');

// 5. Get error details
getAuthErrors();

// 6. Generate report
authErrorReport();

// 7. Export for sharing (copies to clipboard)
exportAuthLogs();
```

### Testing

Auth logging works automatically in test environments. Tests can:

```typescript
import { authLogger } from '../services/authLogger';

// Enable logging for test
authLogger.enable();

// Perform auth operation
await authService.signIn('user@example.com', 'password');

// Check logs
const logs = authLogger.getLogs();
const errors = authLogger.getErrors();

// Assert on log contents (sanitized data only)
expect(errors.length).toBe(0);
```

## Performance Considerations

- **Minimal Impact**: Logging only occurs when enabled
- **Memory Management**: Automatically keeps last 500 log entries
- **Sanitization Cost**: Minimal overhead (~1-2ms per log entry)
- **Production**: Disabled by default - no performance impact when off

## Best Practices

### DO

✅ Enable auth logging when debugging auth issues
✅ Use `getAuthErrors()` to quickly find problems
✅ Generate error reports for bug reports
✅ Disable logging when not actively debugging
✅ Share logs via `exportAuthLogs()` (sanitized data)

### DON'T

❌ Leave auth logging enabled in production (unless debugging)
❌ Modify authLogger.ts to log sensitive data
❌ Bypass sanitization methods
❌ Log passwords or tokens manually
❌ Share logs that might contain user data (use error reports instead)

## Troubleshooting

### Logs Not Appearing?

1. Check if logging is enabled: `authLogger.isEnabled()`
2. Ensure you're on the correct branch/environment
3. Try enabling: `enableAuthLogging()`
4. Reload the page after enabling

### Too Many Logs?

- Use `authLogger.getLogsByLevel('error')` to filter
- Use `authLogger.getLogsByEvent('login')` for specific operations
- Disable with `disableAuthLogging()` when not needed

### Need to Share Logs?

```javascript
// Generate sanitized error report (safe to share)
authErrorReport();

// Or export to clipboard
exportAuthLogs();
```

## API Reference

### Methods

```typescript
// Logging methods
authLogger.info(event: string, message: string, metadata?: object)
authLogger.warn(event: string, message: string, metadata?: object)
authLogger.error(event: string, message: string, error?: any, metadata?: object)
authLogger.debug(event: string, message: string, metadata?: object)

// Specialized auth logging
authLogger.logAuthAttempt(operation, email?)
authLogger.logAuthSuccess(operation, userId?, email?)
authLogger.logAuthFailure(context, error?)
authLogger.logSessionChange(event, hasSession, userId?)
authLogger.logDbUserIdOperation(operation, success, userId?, error?)

// Retrieval methods
authLogger.getLogs()
authLogger.getRecentLogs(count)
authLogger.getLogsByLevel(level)
authLogger.getLogsByEvent(eventPattern)
authLogger.getErrors()
authLogger.getStats()

// Export methods
authLogger.exportLogs()
authLogger.copyToClipboard()
authLogger.generateErrorReport()

// Control methods
authLogger.enable()
authLogger.disable()
authLogger.isEnabled()
authLogger.clear()
```

### Console Shortcuts

```javascript
enableAuthLogging()    // Enable logging
disableAuthLogging()   // Disable logging
getAuthErrors()        // Get error logs
getAuthStats()         // Get statistics
exportAuthLogs()       // Copy to clipboard
authErrorReport()      // Generate report
authLogger            // Access logger directly
```

## Future Enhancements

Potential improvements for the auth logging system:

- Remote error reporting (send errors to monitoring service)
- Log aggregation across sessions
- Performance metrics (auth operation timing)
- User journey tracking (login → action → logout flow)
- Automated error pattern detection
- Integration with application monitoring tools

## Security Compliance

This logging system complies with:

- ✅ **SECURITY_PREFERENCES.md** - No hardcoded secrets
- ✅ **CLAUDE.md** - Follows project security guidelines
- ✅ **GDPR** - No PII logging (emails/IDs are sanitized)
- ✅ **GitGuardian** - No secret patterns in logs

## Support

For issues or questions about the auth logging system:

1. Check this documentation first
2. Review `src/services/authLogger.ts` for implementation details
3. Test in console with `authLogger.getStats()` to verify operation
4. Create issue with error report output if problems persist

---

**Remember**: Auth logging is a debugging tool. Keep it disabled unless actively troubleshooting auth issues.
