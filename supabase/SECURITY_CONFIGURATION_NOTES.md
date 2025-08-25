# Supabase Security Configuration Notes

## Leaked Password Protection Warning

The security warning about "Leaked Password Protection Disabled" cannot be fixed with SQL migrations. This requires manual configuration in the Supabase Dashboard.

### How to Enable Leaked Password Protection:

1. **Go to your Supabase Dashboard**
2. **Navigate to Authentication → Settings**
3. **Find the "Password Security" section**
4. **Enable "Leaked Password Protection"**

This feature checks user passwords against the HaveIBeenPwned.org database to prevent users from using compromised passwords.

### Benefits:
- Prevents users from using passwords that have been exposed in data breaches
- Enhances overall application security
- Follows security best practices

### Note:
This is a platform-level setting that can only be configured through the Supabase Dashboard UI, not through SQL migrations or API calls.

## Other Security Configurations to Consider:

### 1. Multi-Factor Authentication (MFA)
- Enable MFA in Authentication → Settings
- Supports TOTP (Time-based One-Time Password)

### 2. Rate Limiting
- Configure rate limits for auth endpoints
- Prevent brute force attacks

### 3. Email Templates
- Customize security-related email templates
- Ensure proper branding and clear security messaging

### 4. Session Management
- Configure session timeout settings
- Set appropriate token refresh intervals

## Database Security Migrations Applied:

The following SQL migrations have been applied to fix database-level security issues:

1. **`20250821_fix_security_issues.sql`**
   - Fixed SECURITY DEFINER views
   - Enabled RLS on game_backfill_log table
   - Added proper RLS policies

2. **`20250821_fix_function_security_warnings.sql`**
   - Set `search_path = ''` on all functions to prevent SQL injection
   - Fixed materialized view API exposure
   - Added security audit functions

## Verification Commands:

After applying migrations, run these in the Supabase SQL Editor to verify fixes:

```sql
-- Check that all functions have search_path set:
SELECT * FROM check_function_security() WHERE has_search_path = false;

-- Verify materialized view permissions:
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'popular_game_cached';

-- Check view security settings:
SELECT schemaname, viewname, viewowner
FROM pg_views 
WHERE schemaname = 'public' 
  AND viewname IN ('game_with_ratings', 'game_backfill_status', 'game_backfill_recent');
```