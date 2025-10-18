# Auth Logging - Quick Start Guide

## Problem: "I don't see any logs!"

If you enabled auth logging but don't see any console output, here's why and how to fix it:

### Why Logs Aren't Appearing

The auth logger is **disabled by default** to reduce noise. You must explicitly enable it AND perform an auth operation (login/signup/etc.) to see logs.

### Step-by-Step Fix

**1. Open Browser Console** (F12 or Right-click → Inspect → Console tab)

**2. Enable Logging**
```javascript
enableAuthLogging();
```

You should see:
```
✅ [AuthLogger] Auth logging enabled
```

**3. Verify It's Enabled**
```javascript
authLogger.isEnabled()
// Should return: true
```

**4. Perform an Auth Operation**
Try logging in, signing up, or logging out. You should now see color-coded logs like:

```
ℹ️ [AuthLogger:INFO] auth_attempt_login
  Authentication attempt: login
  {
    operation: "login",
    email: "joe***@example.com",
    timestamp: "2025-01-17T10:30:00.000Z"
  }
```

## User-Specific Filtering (NEW!)

**Problem:** "I don't want logs from everyone, just my test account!"

The logger now supports filtering by specific users. This is perfect for tracking test accounts without seeing logs from other users.

### How to Filter by User

**Option 1: Track Specific Email(s)**
```javascript
// Enable logging
enableAuthLogging();

// Add specific user(s) to track
authLogger.addAllowedUsers('testuser@example.com');
```

**Option 2: Track Multiple Users**
```javascript
authLogger.addAllowedUsers('test1@example.com', 'test2@example.com', 'testaccount');
```

**Option 3: Track by Username**
```javascript
authLogger.addAllowedUsers('testuser', 'qaaccount');
```

### Check Current Filters
```javascript
authLogger.getAllowedUsers();
// Returns: ['testuser@example.com', 'qaaccount']
```

### Remove Filters
```javascript
// Remove specific users
authLogger.removeAllowedUsers('testuser@example.com');

// Remove all filters (log for everyone again)
authLogger.clearAllowedUsers();
```

## Common Commands

```javascript
// Enable/Disable
enableAuthLogging();          // Turn on logging
disableAuthLogging();          // Turn off logging

// User Filtering
authLogger.addAllowedUsers('user@email.com', 'username');  // Track specific users
authLogger.clearAllowedUsers();                            // Clear filters

// View Logs
getAuthErrors();               // See only errors
getAuthStats();                // Get statistics
authLogger.getRecentLogs(10);  // Last 10 logs

// Export
exportAuthLogs();              // Copy to clipboard
authErrorReport();             // Generate formatted error report

// Clear
authLogger.clear();            // Clear all logs
```

## Complete Example: Tracking a Test Account

```javascript
// 1. Enable logging with user filter
enableAuthLogging();
authLogger.addAllowedUsers('testaccount@example.com');

// 2. Try logging in with test account
// (use the app's login UI)

// 3. Check logs
authLogger.getRecentLogs(5);

// 4. If there were errors, see them
getAuthErrors();

// 5. Generate error report for bug reports
authErrorReport();

// 6. When done, disable logging
disableAuthLogging();
```

## Troubleshooting

### Still No Logs?

**Check 1: Is it enabled?**
```javascript
authLogger.isEnabled()
// Must return: true
```

**Check 2: Do you have user filters active?**
```javascript
authLogger.getAllowedUsers()
// If this returns an array with users, only those users will be logged
```

**Check 3: Did you perform an auth operation?**
- The logger only logs when auth events happen
- Try logging in or signing up after enabling

**Check 4: Check for errors (always logged)**
```javascript
getAuthErrors()
// Errors are always logged, even when logging is disabled
```

### Clear Everything and Start Fresh

```javascript
// Disable logging
disableAuthLogging();

// Clear user filters
authLogger.clearAllowedUsers();

// Clear all logs
authLogger.clear();

// Re-enable
enableAuthLogging();
```

## Security Note

**The logger is secure by design:**
- ✅ NO passwords are ever logged
- ✅ NO JWT tokens are logged
- ✅ Emails are sanitized (`joe***@example.com`)
- ✅ User IDs are sanitized (`***4567`)
- ✅ Error messages are sanitized

It's safe to share logs and error reports - no sensitive data will be exposed!

## For Full Documentation

See `docs/AUTH_LOGGING.md` for complete API reference and advanced features.

---

**Quick Reference:**
- Enable: `enableAuthLogging()`
- Filter users: `authLogger.addAllowedUsers('email@test.com')`
- View errors: `getAuthErrors()`
- Export: `exportAuthLogs()`
- Disable: `disableAuthLogging()`
