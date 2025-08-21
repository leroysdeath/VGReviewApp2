/**
 * Unified User Type Definitions
 * 
 * This file addresses the critical field naming inconsistencies
 * identified in the cross-reference analysis.
 */

/**
 * Database user record (matches actual database schema)
 */
export interface DatabaseUser {
  id: number;                    // Database integer ID
  provider_id: string;           // Supabase auth UUID
  provider: string;
  username: string | null;       // STANDARD: Use username consistently
  name: string;                  // Keep for backwards compatibility
  email: string;
  avatar_url: string | null;     // STANDARD: Use avatar_url, not picurl
  display_name: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  platform: string | null;
  is_active: boolean;
  email_verified: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Client-side user interface (for UI components)
 */
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
  isActive: boolean;
  emailVerified: boolean;
}

/**
 * Profile update data (for forms)
 */
export interface ProfileUpdateData {
  username?: string;
  displayName?: string;
  bio?: string;
  location?: string;
  website?: string;
  platform?: string;
  avatar?: string; // Base64 data URL for new uploads
}

/**
 * Service response wrapper
 */
export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * CRITICAL: Conversion utilities to maintain consistency
 */
export const dbUserToClientUser = (dbUser: DatabaseUser): ClientUser => ({
  id: dbUser.provider_id,
  username: dbUser.username || dbUser.name || 'user',
  displayName: dbUser.display_name || '',
  email: dbUser.email,
  avatar: dbUser.avatar_url,
  bio: dbUser.bio || '',
  location: dbUser.location || '',
  website: dbUser.website || '',
  platform: dbUser.platform || '',
  isActive: dbUser.is_active,
  emailVerified: dbUser.email_verified,
  joinDate: new Date(dbUser.created_at).toLocaleString('default', { 
    month: 'long', 
    year: 'numeric' 
  })
});

/**
 * Convert client user updates to database format
 */
export const clientUpdateToDbUpdate = (updates: ProfileUpdateData) => ({
  username: updates.username,
  display_name: updates.displayName,
  bio: updates.bio,
  location: updates.location,
  website: updates.website,
  platform: updates.platform,
  // Handle avatar separately in service layer
});

/**
 * Type guards for runtime validation
 */
export const isDatabaseUser = (user: any): user is DatabaseUser => {
  return (
    typeof user === 'object' &&
    user !== null &&
    typeof user.id === 'number' &&
    typeof user.provider_id === 'string' &&
    typeof user.email === 'string'
  );
};

export const isClientUser = (user: any): user is ClientUser => {
  return (
    typeof user === 'object' &&
    user !== null &&
    typeof user.id === 'string' &&
    typeof user.username === 'string' &&
    typeof user.email === 'string'
  );
};

/**
 * Authentication ID utilities
 */
export interface AuthIdUtils {
  /**
   * Get the Supabase auth UUID (for client operations)
   */
  getAuthId: (user: DatabaseUser | ClientUser) => string;
  
  /**
   * Get the database integer ID (for internal DB operations)
   */
  getDatabaseId: (user: DatabaseUser) => number;
  
  /**
   * Check if this is a valid auth UUID format
   */
  isValidAuthId: (id: string) => boolean;
  
  /**
   * Check if this is a valid database ID format
   */
  isValidDatabaseId: (id: number) => boolean;
}

export const authIdUtils: AuthIdUtils = {
  getAuthId: (user: DatabaseUser | ClientUser): string => {
    if ('provider_id' in user) {
      return user.provider_id;
    }
    return user.id;
  },
  
  getDatabaseId: (user: DatabaseUser): number => {
    return user.id;
  },
  
  isValidAuthId: (id: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  },
  
  isValidDatabaseId: (id: number): boolean => {
    return Number.isInteger(id) && id > 0 && id <= Number.MAX_SAFE_INTEGER;
  }
};