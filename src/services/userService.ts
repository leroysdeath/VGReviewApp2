/**
 * Unified User Service
 * Consolidates userService, userServiceSimple, profileService, and profileCache
 *
 * Features:
 * - User authentication and session management
 * - Profile CRUD operations with validation
 * - Intelligent caching with TTL and cleanup
 * - Username availability checking
 * - Type-safe operations with comprehensive error handling
 */

import { supabase } from './supabase';
import type { Session } from '@supabase/supabase-js';
import { sanitizeStrict, sanitizeBasic, sanitizeURL } from '../utils/sanitize';
import {
  DatabaseUser,
  ClientUser,
  ProfileUpdateData,
  ServiceResponse,
  dbUserToClientUser,
  clientUpdateToDbUpdate,
  authIdUtils,
  isDatabaseUser
} from '../types/user';

const DEBUG_USER_SERVICE = false;

// Unified interfaces - consolidating from all services
export interface UserServiceResult {
  success: boolean;
  userId?: number;
  error?: string;
}

export interface UserProfile extends DatabaseUser {
  follower_count?: number;
  following_count?: number;
}

export interface UserUpdate {
  name?: string;
  username?: string;
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  location?: string;
  website?: string;
  platform?: string;
}

// Re-export types for backward compatibility
export type { ProfileUpdateData, ServiceResponse, DatabaseUser, ClientUser } from '../types/user';

interface CachedProfile {
  data: UserProfile;
  timestamp: number;
  userId: string;
}

interface CachedUser {
  data: UserServiceResult;
  timestamp: number;
}

/**
 * Unified User Service - handles all user and profile operations
 */
class UnifiedUserService {
  // Caching system - consolidated from profileCache and userService
  private profileCache = new Map<string, CachedProfile>();
  private userCache = new Map<string, CachedUser>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private cacheTimestamps = new Map<string, number>();

  constructor() {
    // Set up cache cleanup interval only in browser environment
    if (typeof window !== 'undefined') {
      setInterval(() => this.cleanupCache(), 60000); // Every minute
    }
  }

  /**
   * Cache Management
   */
  private cleanupCache(): void {
    const now = Date.now();

    // Clean profile cache
    for (const [key, cached] of this.profileCache.entries()) {
      if (now - cached.timestamp > this.CACHE_TTL) {
        this.profileCache.delete(key);
        if (DEBUG_USER_SERVICE) console.log('🧹 Cleaned profile cache for:', key);
      }
    }

    // Clean user cache
    for (const [key, cached] of this.userCache.entries()) {
      if (now - cached.timestamp > this.CACHE_TTL) {
        this.userCache.delete(key);
        if (DEBUG_USER_SERVICE) console.log('🧹 Cleaned user cache for:', key);
      }
    }

    // Clean timestamps
    for (const [key, timestamp] of this.cacheTimestamps.entries()) {
      if (now - timestamp > this.CACHE_TTL) {
        this.cacheTimestamps.delete(key);
      }
    }
  }

  private getCachedProfile(userId: string): UserProfile | null {
    const cached = this.profileCache.get(userId);

    if (!cached) {
      return null;
    }

    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.profileCache.delete(userId);
      return null;
    }

    if (DEBUG_USER_SERVICE) console.log('🚀 Using cached profile data for user:', userId);
    return cached.data;
  }

  private setCachedProfile(userId: string, data: UserProfile): void {
    this.profileCache.set(userId, {
      data,
      timestamp: Date.now(),
      userId
    });
    if (DEBUG_USER_SERVICE) console.log('💾 Cached profile data for user:', userId);
  }

  private updateCachedProfile(userId: string, updatedData: Partial<UserProfile>): void {
    const cached = this.profileCache.get(userId);
    if (cached) {
      cached.data = { ...cached.data, ...updatedData };
      cached.timestamp = Date.now();
      if (DEBUG_USER_SERVICE) console.log('🔄 Updated cached profile data for user:', userId);
    }
  }

  /**
   * Authentication and User Management
   */
  async getCurrentAuthUser(): Promise<ServiceResponse<{ id: string; email?: string }>> {
    try {
      if (DEBUG_USER_SERVICE) console.log('🔍 Getting current auth user...');

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (DEBUG_USER_SERVICE) console.log('👤 Auth user result:', { user: user ? { id: user.id, email: user.email } : null, authError });

      if (authError) {
        console.error('❌ Auth error:', authError);
        return { success: false, error: `Authentication error: ${authError.message}` };
      }

      if (!user) {
        if (DEBUG_USER_SERVICE) console.log('❌ No authenticated user found');
        return { success: false, error: 'User not authenticated' };
      }

      return {
        success: true,
        data: {
          id: user.id,
          email: user.email || undefined
        }
      };
    } catch (error) {
      console.error('💥 Unexpected error getting auth user:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get auth user'
      };
    }
  }

  async getOrCreateUser(session?: Session): Promise<UserServiceResult> {
    try {
      if (!session?.user) {
        return { success: false, error: 'No session provided' };
      }

      const authUser = session.user;
      const cacheKey = `user:${authUser.id}`;

      // Check cache first
      const cached = this.userCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        if (DEBUG_USER_SERVICE) console.log('🚀 Using cached user data for:', authUser.id);
        return cached.data;
      }

      if (DEBUG_USER_SERVICE) console.log('🔄 Processing user authentication for:', authUser.id);

      // Try database function first
      const dbResult = await this.tryDatabaseFunction(authUser);
      if (dbResult.success) {
        this.userCache.set(cacheKey, { data: dbResult, timestamp: Date.now() });
        return dbResult;
      }

      // Fallback to manual operations
      const manualResult = await this.performManualUserOperation(authUser);
      if (manualResult.success) {
        this.userCache.set(cacheKey, { data: manualResult, timestamp: Date.now() });
      }

      return manualResult;
    } catch (error) {
      console.error('💥 Exception in getOrCreateUser:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'User operation failed'
      };
    }
  }

  private async tryDatabaseFunction(authUser: Session['user']): Promise<UserServiceResult> {
    try {
      if (DEBUG_USER_SERVICE) console.log('🔄 Calling get_or_create_user function');

      const { data: functionResult, error: functionError } = await supabase
        .rpc('get_or_create_user', {
          auth_id: authUser.id,
          user_email: authUser.email || '',
          user_name: authUser.user_metadata?.name || authUser.user_metadata?.username || 'User',
          user_provider: 'supabase'
        });

      if (!functionError && functionResult) {
        return { success: true, userId: functionResult };
      }

      if (DEBUG_USER_SERVICE) console.error('❌ Database function failed:', functionError);
      return { success: false, error: functionError?.message || 'Database function failed' };
    } catch (error) {
      if (DEBUG_USER_SERVICE) console.error('💥 Database function exception:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Database function error'
      };
    }
  }

  private async performManualUserOperation(authUser: Session['user']): Promise<UserServiceResult> {
    try {
      // Step 1: Lookup existing user
      const lookupResult = await this.lookupExistingUser(authUser.id);
      if (lookupResult.success) {
        return lookupResult;
      }

      // Step 2: Create new user if not found
      const createResult = await this.createNewUser(authUser);
      if (createResult.success) {
        return createResult;
      }

      // Step 3: Handle race condition - retry lookup once
      if (createResult.error?.includes('23505') || createResult.error?.includes('unique')) {
        const retryResult = await this.lookupExistingUser(authUser.id);
        if (retryResult.success) {
          return retryResult;
        }
      }

      return { success: false, error: createResult.error || 'Failed to create user record' };

    } catch (error) {
      console.error('Manual user operation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in user operation'
      };
    }
  }

  private async lookupExistingUser(providerId: string): Promise<UserServiceResult> {
    try {
      const { data: existingUser, error: selectError } = await supabase
        .from('user')
        .select('id')
        .eq('provider_id', providerId)
        .single();

      if (!selectError && existingUser) {
        return { success: true, userId: existingUser.id };
      }

      return { success: false, error: selectError?.message || 'User not found' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Lookup error'
      };
    }
  }

  private async createNewUser(authUser: Session['user']): Promise<UserServiceResult> {
    try {
      const userData = {
        provider_id: authUser.id,
        email: authUser.email || null,
        name: authUser.user_metadata?.name || authUser.user_metadata?.username || 'User',
        provider: 'supabase',
        username: authUser.user_metadata?.username || `user_${Date.now()}`,
        bio: '',
        location: '',
        website: ''
      };

      const { data: newUser, error: insertError } = await supabase
        .from('user')
        .insert([userData])
        .select('id')
        .single();

      if (!insertError && newUser) {
        if (DEBUG_USER_SERVICE) console.log('✅ Created new user:', newUser.id);
        return { success: true, userId: newUser.id };
      }

      return { success: false, error: insertError?.message || 'Failed to create user' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'User creation error'
      };
    }
  }

  /**
   * Profile Operations - Direct and Simple (from userServiceSimple)
   */
  async getUser(userId: string | number): Promise<ServiceResponse<UserProfile>> {
    try {
      const { data, error } = await supabase
        .from('user')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get user'
      };
    }
  }

  async getUserByUsername(username: string): Promise<ServiceResponse<UserProfile>> {
    try {
      const { data, error } = await supabase
        .from('user')
        .select('*')
        .eq('username', username)
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get user by username'
      };
    }
  }

  async getUserByProviderId(providerId: string): Promise<ServiceResponse<UserProfile>> {
    try {
      const { data, error } = await supabase
        .from('user')
        .select('*')
        .eq('provider_id', providerId)
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get user by provider ID'
      };
    }
  }

  /**
   * Enhanced Profile Operations (from profileService)
   */
  async getUserProfile(providerId: string): Promise<ServiceResponse<DatabaseUser>> {
    try {
      if (DEBUG_USER_SERVICE) console.log('🔍 Getting user profile for provider_id:', providerId);

      // Check cache first
      const cached = this.getCachedProfile(providerId);
      if (cached) {
        return { success: true, data: cached };
      }

      // Validate UUID format
      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!isValidUUID.test(providerId)) {
        console.error('❌ Invalid provider_id format:', providerId);
        return { success: false, error: 'Invalid provider ID format' };
      }

      const { data: dbUser, error } = await supabase
        .from('user')
        .select('*')
        .eq('provider_id', providerId)
        .single();

      if (error) {
        console.error('❌ Error fetching database user profile:', error);

        if (error.code === 'PGRST116') {
          if (DEBUG_USER_SERVICE) console.log('⚠️ User profile not found in database');
          return { success: false, error: 'User profile not found' };
        }

        return { success: false, error: `Database error: ${error.message}` };
      }

      if (!dbUser) {
        return { success: false, error: 'User profile not found' };
      }

      // Validate data structure
      if (!isDatabaseUser(dbUser)) {
        console.error('❌ Invalid user data structure:', dbUser);
        return { success: false, error: 'Invalid user data structure' };
      }

      // Cache the result
      this.setCachedProfile(providerId, dbUser);

      if (DEBUG_USER_SERVICE) console.log('✅ Found user profile:', dbUser);
      return { success: true, data: dbUser };
    } catch (error) {
      console.error('💥 Unexpected error in getUserProfile:', error);
      return {
        success: false,
        error: error instanceof Error ? `Unexpected error: ${error.message}` : 'Failed to get user profile'
      };
    }
  }

  async ensureUserProfileExists(
    providerId: string,
    email?: string,
    defaultUsername?: string
  ): Promise<ServiceResponse<UserProfile>> {
    try {
      if (DEBUG_USER_SERVICE) console.log('🔍 Ensuring user profile exists for:', providerId);

      // Validate UUID format
      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!isValidUUID.test(providerId)) {
        console.error('❌ Invalid provider_id format:', providerId);
        return { success: false, error: `Invalid provider ID format. Expected UUID but got: ${providerId}` };
      }

      // Check if user profile already exists
      const existingProfileResult = await this.getUserProfile(providerId);

      if (existingProfileResult.success && existingProfileResult.data) {
        if (DEBUG_USER_SERVICE) console.log('✅ User profile already exists');
        return existingProfileResult;
      }

      if (DEBUG_USER_SERVICE) console.log('📝 Profile not found - creating manually as fallback...');

      // Generate unique username
      let baseUsername = defaultUsername || email?.split('@')[0] || 'user';
      baseUsername = baseUsername.toLowerCase().replace(/\s+/g, '_');
      let generatedUsername = baseUsername;

      // Ensure username uniqueness
      while (true) {
        const { data: existingUser } = await supabase
          .from('user')
          .select('id')
          .eq('username', generatedUsername)
          .maybeSingle();

        if (!existingUser) break;

        generatedUsername = `${baseUsername}_${Math.floor(Math.random() * 1000)}`;
      }

      // Create user profile
      const userData = {
        provider_id: providerId,
        email: email || null,
        provider: 'supabase',
        username: sanitizeStrict(generatedUsername),
        name: sanitizeStrict(defaultUsername || email?.split('@')[0] || 'User'),
        display_name: '',
        bio: '',
        location: '',
        website: '',
        avatar_url: null,
        platform: null
      };

      const { data: newUser, error: insertError } = await supabase
        .from('user')
        .insert([userData])
        .select('*')
        .single();

      if (insertError) {
        console.error('❌ Failed to create user profile:', insertError);
        return { success: false, error: `Failed to create user profile: ${insertError.message}` };
      }

      if (!newUser) {
        return { success: false, error: 'User profile creation returned no data' };
      }

      // Cache the new profile
      this.setCachedProfile(providerId, newUser);

      if (DEBUG_USER_SERVICE) console.log('✅ Created new user profile:', newUser);
      return { success: true, data: newUser };

    } catch (error) {
      console.error('💥 Unexpected error in ensureUserProfileExists:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to ensure user profile exists'
      };
    }
  }

  async updateUserProfile(
    userId: number,
    updateData: UserUpdate
  ): Promise<ServiceResponse<UserProfile>> {
    try {
      if (DEBUG_USER_SERVICE) console.log('🔄 Updating user profile for user:', userId);

      // Sanitize input data
      const sanitizedData: any = {};

      if (updateData.name !== undefined) {
        sanitizedData.name = sanitizeStrict(updateData.name);
      }
      if (updateData.username !== undefined) {
        sanitizedData.username = sanitizeStrict(updateData.username);
      }
      if (updateData.display_name !== undefined) {
        sanitizedData.display_name = sanitizeBasic(updateData.display_name);
      }
      if (updateData.bio !== undefined) {
        sanitizedData.bio = sanitizeBasic(updateData.bio);
      }
      if (updateData.location !== undefined) {
        sanitizedData.location = sanitizeBasic(updateData.location);
      }
      if (updateData.website !== undefined) {
        sanitizedData.website = sanitizeURL(updateData.website);
      }
      if (updateData.avatar_url !== undefined) {
        sanitizedData.avatar_url = sanitizeURL(updateData.avatar_url);
      }
      if (updateData.platform !== undefined) {
        sanitizedData.platform = sanitizeBasic(updateData.platform);
      }

      // Add timestamp
      sanitizedData.updated_at = new Date().toISOString();

      const { data: updatedUser, error } = await supabase
        .from('user')
        .update(sanitizedData)
        .eq('id', userId)
        .select('*')
        .single();

      if (error) {
        console.error('❌ Failed to update user profile:', error);
        return { success: false, error: `Failed to update profile: ${error.message}` };
      }

      if (!updatedUser) {
        return { success: false, error: 'User profile update returned no data' };
      }

      // Update cache if we have provider_id
      if (updatedUser.provider_id) {
        this.updateCachedProfile(updatedUser.provider_id, updatedUser);
      }

      if (DEBUG_USER_SERVICE) console.log('✅ Updated user profile:', updatedUser);
      return { success: true, data: updatedUser };

    } catch (error) {
      console.error('💥 Unexpected error updating user profile:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update user profile'
      };
    }
  }

  async checkUsernameAvailability(username: string, excludeUserId?: number): Promise<ServiceResponse<{ available: boolean }>> {
    try {
      if (!username || username.trim().length === 0) {
        return { success: false, error: 'Username cannot be empty' };
      }

      // Sanitize username
      const sanitizedUsername = sanitizeStrict(username.trim());

      if (sanitizedUsername.length < 3) {
        return { success: false, error: 'Username must be at least 3 characters long' };
      }

      let query = supabase
        .from('user')
        .select('id')
        .eq('username', sanitizedUsername);

      if (excludeUserId) {
        query = query.neq('id', excludeUserId);
      }

      const { data: existingUser, error } = await query.maybeSingle();

      if (error) {
        console.error('❌ Error checking username availability:', error);
        return { success: false, error: `Database error: ${error.message}` };
      }

      const available = !existingUser;

      if (DEBUG_USER_SERVICE) console.log(`🔍 Username "${sanitizedUsername}" availability:`, available);
      return { success: true, data: { available } };

    } catch (error) {
      console.error('💥 Unexpected error checking username availability:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check username availability'
      };
    }
  }

  async getCurrentUserProfile(forceRefresh = false): Promise<ServiceResponse<UserProfile>> {
    try {
      if (DEBUG_USER_SERVICE) console.log('🔍 Getting current user profile, forceRefresh:', forceRefresh);

      // Get current auth user
      const authResult = await this.getCurrentAuthUser();
      if (!authResult.success || !authResult.data) {
        return { success: false, error: authResult.error || 'No authenticated user' };
      }

      const providerId = authResult.data.id;

      // If force refresh, clear cache first
      if (forceRefresh) {
        this.profileCache.delete(providerId);
      }

      // Get profile with caching
      const profileResult = await this.getUserProfile(providerId);

      if (!profileResult.success || !profileResult.data) {
        // Try to ensure profile exists if not found
        const ensureResult = await this.ensureUserProfileExists(
          providerId,
          authResult.data.email
        );

        if (ensureResult.success && ensureResult.data) {
          return ensureResult;
        }

        return { success: false, error: profileResult.error || 'Failed to get current user profile' };
      }

      return profileResult;

    } catch (error) {
      console.error('💥 Unexpected error getting current user profile:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get current user profile'
      };
    }
  }

  /**
   * Cache Management Public Methods
   */
  clearCache(): void {
    this.profileCache.clear();
    this.userCache.clear();
    this.cacheTimestamps.clear();
    if (DEBUG_USER_SERVICE) console.log('🧹 Cleared all user service caches');
  }

  clearProfileCache(userId?: string): void {
    if (userId) {
      this.profileCache.delete(userId);
      if (DEBUG_USER_SERVICE) console.log('🧹 Cleared profile cache for user:', userId);
    } else {
      this.profileCache.clear();
      if (DEBUG_USER_SERVICE) console.log('🧹 Cleared all profile cache');
    }
  }
}

// Export unified service instance
export const userService = new UnifiedUserService();

// Backward compatibility exports
export { userService as userServiceSimple };
export const profileCache = {
  get: (userId: string) => userService['getCachedProfile'](userId),
  set: (userId: string, data: UserProfile) => userService['setCachedProfile'](userId, data),
  update: (userId: string, data: Partial<UserProfile>) => userService['updateCachedProfile'](userId, data),
  clear: (userId?: string) => userService.clearProfileCache(userId)
};

// Rating distribution function (from legacy profileService)
export const getUserRatingDistribution = async (userId: number) => {
  try {
    console.log('📊 Fetching rating distribution for user:', userId);

    // Fetch all published ratings for the user
    const { data: ratings, error } = await supabase
      .from('rating')
      .select('rating')
      .eq('user_id', userId)
      .eq('is_published', true);

    if (error) {
      console.error('❌ Error fetching user ratings:', error);
      return {
        success: false,
        error: `Failed to fetch ratings: ${error.message}`
      };
    }

    // Initialize distribution array for ratings 1-10
    const distribution = Array.from({ length: 10 }, (_, i) => ({
      rating: i + 1,
      count: 0,
      percentage: 0
    }));

    let totalRatings = 0;
    let sumRatings = 0;

    // Process each rating
    if (ratings && ratings.length > 0) {
      ratings.forEach(item => {
        const ratingValue = Math.floor(item.rating);
        if (ratingValue >= 1 && ratingValue <= 10) {
          distribution[ratingValue - 1].count++;
          totalRatings++;
          sumRatings += item.rating;
        }
      });

      // Calculate percentages
      distribution.forEach(segment => {
        segment.percentage = totalRatings > 0 ? (segment.count / totalRatings) * 100 : 0;
      });
    }

    // Calculate average rating
    const averageRating = totalRatings > 0 ? sumRatings / totalRatings : 0;

    console.log(`✅ Distribution calculated: ${totalRatings} ratings, avg: ${averageRating.toFixed(1)}`);

    return {
      success: true,
      data: {
        distribution,
        totalRatings,
        averageRating
      }
    };
  } catch (error) {
    console.error('💥 Unexpected error getting user rating distribution:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get rating distribution'
    };
  }
};

// Re-export functions for backward compatibility
export const getCurrentAuthUser = (...args: Parameters<typeof userService.getCurrentAuthUser>) => userService.getCurrentAuthUser(...args);
export const getUserProfile = (...args: Parameters<typeof userService.getUserProfile>) => userService.getUserProfile(...args);
export const ensureUserProfileExists = (...args: Parameters<typeof userService.ensureUserProfileExists>) => userService.ensureUserProfileExists(...args);
export const updateUserProfile = (...args: Parameters<typeof userService.updateUserProfile>) => userService.updateUserProfile(...args);
export const checkUsernameAvailability = (...args: Parameters<typeof userService.checkUsernameAvailability>) => userService.checkUsernameAvailability(...args);
export const getCurrentUserProfile = (...args: Parameters<typeof userService.getCurrentUserProfile>) => userService.getCurrentUserProfile(...args);

// Legacy class export
export { UnifiedUserService as UserService };