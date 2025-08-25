# CRITICAL SECURITY FIXES - IMPLEMENT IMMEDIATELY

## 1. SQL Injection Vulnerability Fix

### Problem
Line 72 in `src/services/supabase.ts` uses string interpolation in ILIKE queries, creating SQL injection risk.

### Current Vulnerable Code
```typescript
.or(`name.ilike.*${sanitizedQuery}*,description.ilike.*${sanitizedQuery}*,genre.ilike.*${sanitizedQuery}*`)
```

### SECURE REPLACEMENT
```typescript
// Replace the vulnerable searchGames function with this secure version
async searchGames(query: string, limit = 20) {
  // Validate input
  if (!query || typeof query !== 'string') {
    return [];
  }
  
  const trimmedQuery = query.trim();
  if (trimmedQuery.length < 2 || trimmedQuery.length > 100) {
    return [];
  }
  
  // Use Supabase's built-in text search with proper escaping
  const { data, error } = await supabase
    .from('game')
    .select(`
      *,
      platform_games(
        platform(*)
      )
    `)
    .or(`name.ilike.%${trimmedQuery}%,description.ilike.%${trimmedQuery}%,genre.ilike.%${trimmedQuery}%`)
    .limit(Math.min(limit, 100));
  
  if (error) throw error;
  return data || [];
}

// Even better - use Supabase's full-text search
async searchGamesSecure(query: string, limit = 20) {
  if (!query || typeof query !== 'string') return [];
  
  const trimmedQuery = query.trim();
  if (trimmedQuery.length < 2) return [];
  
  // Use textSearch for better security and performance
  const { data, error } = await supabase
    .from('game')
    .select(`
      *,
      platform_games(platform(*))
    `)
    .textSearch('name', `'${trimmedQuery.replace(/'/g, "''")}'`) // Proper escaping
    .limit(Math.min(limit, 100));
    
  if (error) {
    // Fallback to ilike if textSearch fails
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('game')
      .select(`*`)
      .ilike('name', `%${trimmedQuery.replace(/[%_]/g, '\\$&')}%`) // Escape LIKE wildcards
      .limit(Math.min(limit, 100));
      
    if (fallbackError) throw fallbackError;
    return fallbackData || [];
  }
  
  return data || [];
}
```

## 2. Database Integrity Fix - Add Foreign Key Constraints

### Problem
No foreign key constraints exist, causing 4 orphaned ratings and 4 orphaned game_progress records.

### CRITICAL DATABASE MIGRATION
```sql
-- File: supabase/migrations/20250121_add_critical_foreign_keys.sql

-- Add foreign key constraints that should have existed from the beginning
ALTER TABLE rating 
ADD CONSTRAINT fk_rating_user 
FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE;

ALTER TABLE rating 
ADD CONSTRAINT fk_rating_game 
FOREIGN KEY (game_id) REFERENCES game(id) ON DELETE CASCADE;

ALTER TABLE game_progress 
ADD CONSTRAINT fk_game_progress_user 
FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE;

ALTER TABLE game_progress 
ADD CONSTRAINT fk_game_progress_game 
FOREIGN KEY (game_id) REFERENCES game(id) ON DELETE CASCADE;

ALTER TABLE platform_games 
ADD CONSTRAINT fk_platform_games_game 
FOREIGN KEY (game_id) REFERENCES game(id) ON DELETE CASCADE;

ALTER TABLE platform_games 
ADD CONSTRAINT fk_platform_games_platform 
FOREIGN KEY (platform_id) REFERENCES platform(id) ON DELETE CASCADE;

ALTER TABLE comment 
ADD CONSTRAINT fk_comment_user 
FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE;

ALTER TABLE comment 
ADD CONSTRAINT fk_comment_rating 
FOREIGN KEY (rating_id) REFERENCES rating(id) ON DELETE CASCADE;

ALTER TABLE content_like 
ADD CONSTRAINT fk_content_like_user 
FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE;

ALTER TABLE user_game_list 
ADD CONSTRAINT fk_user_game_list_user 
FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE;

ALTER TABLE user_game_list 
ADD CONSTRAINT fk_user_game_list_game 
FOREIGN KEY (game_id) REFERENCES game(id) ON DELETE CASCADE;

-- Clean up orphaned data before adding constraints
DELETE FROM rating WHERE game_id NOT IN (SELECT id FROM game);
DELETE FROM game_progress WHERE game_id NOT IN (SELECT id FROM game);

-- Add check constraints for data integrity
ALTER TABLE rating 
ADD CONSTRAINT rating_value_check 
CHECK (rating >= 1.0 AND rating <= 10.0);

ALTER TABLE rating 
ADD CONSTRAINT review_length_check 
CHECK (review IS NULL OR char_length(review) <= 5000);
```

## 3. Memory Leak Fix - Browser Cache Service

### Problem
Interval timer never cleared, causing memory leaks.

### SECURE REPLACEMENT
```typescript
// File: src/services/browserCacheService.ts - Replace lines 112-114

class BrowserCacheService {
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  constructor() {
    // Start cleanup interval
    this.startCleanupInterval();
    
    // Clean up on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.destroy());
    }
  }
  
  private startCleanupInterval() {
    // Clear any existing interval
    this.stopCleanupInterval();
    
    // Start new cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }
  
  private stopCleanupInterval() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
  
  public destroy() {
    this.stopCleanupInterval();
    this.clear();
  }
  
  // ... rest of the class
}

// Export singleton with proper cleanup
export const browserCache = new BrowserCacheService();

// Remove the global setInterval - CRITICAL BUG
// DELETE THESE LINES (112-114):
// setInterval(() => {
//   browserCache.cleanup();
// }, 5 * 60 * 1000);
```

## 4. Type System Fix - Field Naming Standardization

### Problem
Inconsistent field naming between database.ts and supabase.ts causing runtime errors.

### STANDARDIZATION REQUIRED
```typescript
// File: src/types/user.ts - Create unified user types
export interface DatabaseUser {
  id: number;                    // Database integer ID
  provider_id: string;           // Supabase auth UUID
  username: string;              // STANDARD: Use username, not name
  name: string;                  // Keep for backwards compatibility
  email: string;
  avatar_url: string | null;     // STANDARD: Use avatar_url, not picurl
  display_name: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  platform: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientUser {
  id: string;                    // Supabase auth UUID for client use
  username: string;
  displayName: string;
  email: string;
  avatar: string | null;
  bio: string;
  location: string;
  website: string;
  platform: string;
  joinDate: string;
}

// Conversion utilities
export const dbUserToClientUser = (dbUser: DatabaseUser): ClientUser => ({
  id: dbUser.provider_id,
  username: dbUser.username || dbUser.name,
  displayName: dbUser.display_name || '',
  email: dbUser.email,
  avatar: dbUser.avatar_url,
  bio: dbUser.bio || '',
  location: dbUser.location || '',
  website: dbUser.website || '',
  platform: dbUser.platform || '',
  joinDate: new Date(dbUser.created_at).toLocaleString('default', { 
    month: 'long', 
    year: 'numeric' 
  })
});
```

## 5. Authentication Fix - User ID Type Consistency

### Problem
Mixing Supabase auth UUIDs with database integer IDs causing profile loading failures.

### CRITICAL AUTH SERVICE FIX
```typescript
// File: src/services/authService.ts - Add these utility functions

/**
 * CRITICAL: Always use provider_id (UUID) for auth operations
 * Use database id (integer) only for internal database operations
 */
export const getAuthUserId = (): string | null => {
  const user = getCurrentUser();
  return user?.id || null; // This is the UUID
};

export const getDatabaseUserId = async (authUserId: string): Promise<number | null> => {
  try {
    const { data, error } = await supabase
      .from('user')
      .select('id')
      .eq('provider_id', authUserId)
      .single();
      
    if (error || !data) return null;
    return data.id;
  } catch {
    return null;
  }
};

// Update all profile operations to use proper ID types
export const updateUserProfile = async (
  authUserId: string, // UUID from auth
  updates: ProfileUpdateData
): Promise<ServiceResponse<UserProfile>> => {
  // Always use provider_id for user operations
  const result = await profileService.updateUserProfile(authUserId, updates);
  return result;
};
```

## Implementation Priority

### IMMEDIATE (Deploy Today)
1. Fix SQL injection vulnerability
2. Add database foreign key constraints
3. Fix memory leak in browserCacheService

### URGENT (This Week)  
1. Standardize field naming across all services
2. Fix authentication ID type consistency
3. Add proper error handling for all database operations

### CRITICAL TESTING
After implementing fixes, run:
```sql
-- Verify foreign keys were added
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type
FROM information_schema.table_constraints tc
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- Verify no orphaned data
SELECT 'No orphaned data' as status
WHERE NOT EXISTS (
    SELECT 1 FROM rating r 
    LEFT JOIN game g ON r.game_id = g.id 
    WHERE g.id IS NULL
);
```

These fixes address the most critical security and data integrity issues. Implement immediately before continuing any feature development.