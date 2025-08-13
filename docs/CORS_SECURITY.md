# CORS Security Implementation

This document outlines the secure CORS (Cross-Origin Resource Sharing) configuration implemented to replace the previous overly permissive wildcard (*) origins.

## Overview

The previous CORS configuration allowed requests from any origin (`Access-Control-Allow-Origin: *`), which posed a security risk. The new implementation provides:

- Environment-specific origin validation
- Strict origin allowlists 
- Proper CORS header handling
- Request origin validation

## Implementation Details

### 1. Supabase Edge Functions (`supabase/functions/_shared/cors.ts`)

**Features:**
- Environment detection (development/staging/production)
- Origin validation with allowlist
- Dynamic CORS header generation
- Preflight request handling
- Automatic origin rejection for unauthorized domains

**Key Functions:**
- `validateOrigin(origin)` - Validates if origin is in allowlist
- `getCorsHeaders(origin)` - Returns appropriate CORS headers
- `handleCorsRequest(request)` - Handles OPTIONS preflight and validation

### 2. Netlify Configuration (`netlify.toml`)

**Production CORS:**
- No `Access-Control-Allow-Origin` header (requires server-side validation)
- Restrictive headers for `/api/*` endpoints
- `Vary: Origin` header for proper caching

**Development/Staging CORS:**
- Allows specific localhost origins
- Includes `Access-Control-Allow-Credentials: true`
- More permissive for development workflow

### 3. Frontend Configuration (`src/config/cors.ts`)

**Environment-specific origins:**
- **Production:** Only production domains
- **Staging:** Staging domain + localhost for testing
- **Development:** All localhost variants (5173, 3000, 8888)

**Utility functions:**
- Origin validation
- Current origin detection
- CORS header generation

### 4. Secure Request Utility (`src/utils/secureRequest.ts`)

**Features:**
- Automatic CORS validation
- Secure header injection
- Request timeout handling
- Error handling with CORS context
- Environment-aware request modes

## Environment Configuration

### Production
```typescript
allowedOrigins: [
  'https://your-production-domain.com',
  'https://your-production-domain.netlify.app'
]
```

### Staging
```typescript
allowedOrigins: [
  'https://your-staging-domain.netlify.app',
  'http://localhost:5173',
  'http://localhost:3000'
]
```

### Development
```typescript
allowedOrigins: [
  'http://localhost:5173',
  'http://localhost:3000', 
  'http://localhost:8888',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:8888'
]
```

## Usage Examples

### Using Secure Request Utility
```typescript
import { secureGet, securePost } from '../utils/secureRequest';

// GET request with CORS validation
const data = await secureGet('/api/games');

// POST request with CORS validation
const result = await securePost('/api/reviews', reviewData);
```

### Supabase Edge Function with CORS
```typescript
import { serve } from '../_shared/corsExample.ts';

export default serve(async (req: Request): Promise<Response> => {
  // Your function logic here
  return new Response(JSON.stringify({ data: 'Hello World' }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

## Security Benefits

1. **Origin Validation:** Only allows requests from explicitly approved domains
2. **Environment Isolation:** Different restrictions per environment
3. **Credentials Security:** Proper handling of credentials in CORS requests
4. **Attack Prevention:** Prevents CSRF and unauthorized cross-origin requests
5. **Audit Trail:** Logging of origin validation for security monitoring

## Configuration Updates Required

### Before Deployment

1. **Update Production Domains:**
   ```typescript
   // In src/config/cors.ts and supabase/functions/_shared/cors.ts
   case 'production':
     return [
       'https://your-actual-domain.com',        // ← Update this
       'https://your-actual-domain.netlify.app' // ← Update this
     ];
   ```

2. **Update Staging Domain:**
   ```typescript
   case 'staging':
     return [
       'https://your-staging-domain.netlify.app', // ← Update this
       'http://localhost:5173',
       'http://localhost:3000'
     ];
   ```

3. **Set Environment Variables:**
   ```bash
   # Production
   ENVIRONMENT=production
   
   # Staging  
   ENVIRONMENT=staging
   
   # Development
   ENVIRONMENT=development
   ```

## Monitoring and Debugging

### Development Mode
- CORS validation warnings in console
- Request/response logging
- Origin mismatch alerts

### Production Mode
- Failed origin validation returns 403
- Security headers enforced
- Minimal logging for performance

## Troubleshooting

### Common Issues

1. **Origin Not Allowed (403)**
   - Check if your domain is in the allowlist
   - Verify environment configuration
   - Confirm request origin matches expected format

2. **CORS Preflight Failures**
   - Ensure OPTIONS method is handled
   - Check if all required headers are allowed
   - Verify origin validation logic

3. **Development Issues**
   - Use exact localhost URLs from allowlist
   - Check browser developer tools for CORS errors
   - Verify environment detection

### Debug Commands
```bash
# Check current origin configuration
console.log(corsConfig);

# Test origin validation
console.log(validateOrigin('http://localhost:5173'));

# Check current environment
console.log(corsConfig.environment);
```