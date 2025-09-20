# Security Guidelines

## ✅ What Was Fixed

GitGuardian flagged hardcoded JWT tokens in our codebase. The following files were updated:

- `src/test/gta3-greenlight-test.test.ts`
- `src/test/mario-3-database-check.test.ts` 
- `src/test/add-super-mario-bros-games.test.ts`
- `src/services/supabase.ts`

## 🔐 Security Best Practices

### 1. Never Hardcode Secrets
❌ **Don't do this:**
```typescript
const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Hardcoded
```

✅ **Do this instead:**
```typescript
const apiKey = process.env.VITE_SUPABASE_ANON_KEY;
if (!apiKey) {
  throw new Error('Missing required environment variable: VITE_SUPABASE_ANON_KEY');
}
```

### 2. Environment Variables Only
All secrets must come from `.env` files:
```bash
# .env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### 3. Test Environment Setup
For tests, use test environment variables:
```typescript
// Good pattern for tests
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing required environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);
```

### 4. Files to Check
When adding new code, ensure these never contain hardcoded secrets:
- `/src/services/*` - Service layer
- `/src/test/*` - Test files  
- `/src/components/*` - Components
- `/src/utils/*` - Utilities

### 5. Prevention Tools
Consider adding:
- Pre-commit hooks to scan for secrets
- `.gitignore` patterns for sensitive files
- Regular security audits

## 🚫 Common Patterns to Avoid
- Hardcoded API keys
- Hardcoded JWT tokens
- Database connection strings with credentials
- Third-party service tokens
- Any string longer than 20 characters that looks like a key/token

## ✅ Verification
After any changes involving credentials:
1. Search codebase for JWT patterns: `grep -r "eyJ[A-Za-z0-9_-]" src/`
2. Search for API key patterns: `grep -r "AKIA\|sk-\|AIza" src/`
3. Run the build: `npm run build`
4. Run tests: `npm test`

Remember: Keep credentials in `.env` files and ensure they're in `.gitignore`!