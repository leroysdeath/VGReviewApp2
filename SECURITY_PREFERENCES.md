# Security Preferences for VGReview3

This document contains security preferences and guidelines that Claude Code should follow when working on this project.

## 🔐 Secret Management Rules

### NEVER HARDCODE SECRETS
- **NEVER** include JWT tokens, API keys, or any sensitive credentials directly in code
- **NEVER** use hardcoded fallback values for secrets in test files or config files
- **ALWAYS** use environment variables for all sensitive configuration

### Environment Variable Usage
```typescript
// ✅ CORRECT - Use environment variables only
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing required environment variables');
}

// ❌ WRONG - Never include hardcoded fallbacks
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiI...';
```

### Test File Security
- **ALL** test files must use environment variables
- Test files should validate environment variables are set before proceeding
- Use mock/test values from `.env` files, never hardcoded secrets

### Config File Security
- Configuration files must only reference environment variables
- Include proper error handling for missing environment variables
- Never commit actual secrets to version control

## 🔍 GitGuardian Prevention

### Pre-commit Checks
- All code must pass secret detection before commit
- If GitGuardian flags a secret, immediately:
  1. Remove the hardcoded secret
  2. Use environment variables instead
  3. Verify no other files contain similar secrets
  4. Update the commit

### Pattern Detection
Watch for these patterns that GitGuardian detects:
- JWT tokens starting with `eyJhbGciOiJIUzI1NiI`
- Supabase anon keys
- Any base64 encoded secrets
- API keys and tokens

## 📁 File Types to Check

### High-Risk Files
- `**/*.test.ts` - Test files
- `**/*.test.js` - Test files  
- `**/config.*` - Configuration files
- `**/*-config.*` - Config files
- `src/services/supabase.ts` - Service files
- `scripts/**/*` - Script files

### Approved Environment Variables
```bash
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
TWITCH_CLIENT_ID=your_twitch_client_id_here
TWITCH_APP_ACCESS_TOKEN=your_twitch_token_here
```

## 🛡️ Security Best Practices

### 1. Environment Variable Validation
```typescript
// Always validate required environment variables
const requiredEnvVars = {
  VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY
};

for (const [key, value] of Object.entries(requiredEnvVars)) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}
```

### 2. Test Environment Setup
```typescript
// Test files should use test-specific environment variables
const testConfig = {
  supabaseUrl: process.env.VITE_SUPABASE_URL || 'https://test.supabase.co',
  supabaseKey: process.env.VITE_SUPABASE_ANON_KEY || 'test-key'
};
```

### 3. Logging Safety
```typescript
// ✅ SAFE - Don't log secrets
console.log('Supabase key:', supabaseKey ? 'SET' : 'NOT SET');

// ❌ UNSAFE - Never log actual secrets  
console.log('Supabase key:', supabaseKey);
```

## 🚨 Emergency Response

If GitGuardian detects a secret:

1. **IMMEDIATE**: Remove hardcoded secret from code
2. **UPDATE**: Use environment variables instead
3. **VERIFY**: Check for other instances of the same pattern
4. **COMMIT**: Push the fix immediately
5. **ROTATE**: Consider rotating the exposed secret if it was real

## 📋 Checklist for New Code

Before committing any code that uses secrets:

- [ ] No hardcoded JWT tokens, API keys, or credentials
- [ ] All secrets loaded from environment variables
- [ ] Proper error handling for missing environment variables  
- [ ] Test files use environment variables or mock values
- [ ] No secrets in console.log or debug output
- [ ] Config files validated for security

## 🎯 Claude Code Instructions

When working on this project, Claude Code must:

1. **ALWAYS** check for hardcoded secrets before suggesting code changes
2. **NEVER** include actual secret values in code examples
3. **ALWAYS** use environment variables for sensitive configuration
4. **VALIDATE** that test files follow security best practices
5. **SUGGEST** proper secret management patterns
6. **REFUSE** to create code with hardcoded secrets

Remember: Security is not optional. Every secret must be protected.