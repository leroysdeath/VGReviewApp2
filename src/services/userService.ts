import { supabase } from './supabase';
import type { Session } from '@supabase/supabase-js';

export interface UserServiceResult {
  success: boolean;
  userId?: number;
  error?: string;
}

export interface UserProfile {
  id: number;
  provider_id: string;
  email: string;
  name: string;
  provider: string;
  created_at: string;
  updated_at: string;
}

/**
 * User Management Module
 * Centralized service for all user-related operations
 * Follows modular monolithic architecture pattern
 */
export class UserService {
  private userCache = new Map<string, number>();
  private profileCache = new Map<number, UserProfile>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private cacheTimestamps = new Map<string, number>();

  constructor() {
    // Set up cache cleanup interval only in browser environment
    if (typeof window !== 'undefined') {
      setInterval(() => this.cleanupCache(), 60000); // Every minute
    }
  }

  /**
   * Cache Management Module
   */
  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, timestamp] of this.cacheTimestamps.entries()) {
      if (now - timestamp > this.CACHE_TTL) {
        this.userCache.delete(key);
        this.cacheTimestamps.delete(key);
        // Extract user ID from cache key pattern if needed
        const userId = parseInt(key.split(':')[1]);
        if (userId) {
          this.profileCache.delete(userId);
        }
      }
    }
  }

  private setCacheEntry(authId: string, userId: number): void {
    this.userCache.set(authId, userId);
    this.cacheTimestamps.set(authId, Date.now());
  }

  private getCacheEntry(authId: string): number | null {
    const timestamp = this.cacheTimestamps.get(authId);
    if (!timestamp || Date.now() - timestamp > this.CACHE_TTL) {
      this.userCache.delete(authId);
      this.cacheTimestamps.delete(authId);
      return null;
    }
    return this.userCache.get(authId) || null;
  }

  /**
   * Core User Operations Module
   */
  public async getOrCreateDatabaseUser(authUser: Session['user']): Promise<UserServiceResult> {
    if (!authUser?.id) {
      return { success: false, error: 'No authenticated user provided' };
    }

    // Check cache first for performance
    const cachedId = this.getCacheEntry(authUser.id);
    if (cachedId) {
      return { success: true, userId: cachedId };
    }

    try {
      // Primary: Use database function for atomic operation
      const functionResult = await this.tryDatabaseFunction(authUser);
      if (functionResult.success) {
        this.setCacheEntry(authUser.id, functionResult.userId!);
        return functionResult;
      }

      // Fallback: Manual operation with transaction-like behavior
      const manualResult = await this.performManualUserOperation(authUser);
      if (manualResult.success) {
        this.setCacheEntry(authUser.id, manualResult.userId!);
      }
      return manualResult;

    } catch (error) {
      console.error('Error in user operation:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error in user creation'
      };
    }
  }

  /**
   * Database Function Integration Module
   */
  private async tryDatabaseFunction(authUser: Session['user']): Promise<UserServiceResult> {
    try {
      console.log('🔄 Calling get_or_create_user function with:', {
        auth_id: authUser.id,
        user_email: authUser.email || '',
        user_name: authUser.user_metadata?.name || authUser.user_metadata?.username || 'User'
      });
      
      const { data: functionResult, error: functionError } = await supabase
        .rpc('get_or_create_user', {
          auth_id: authUser.id,
          user_email: authUser.email || '',
          user_name: authUser.user_metadata?.name || authUser.user_metadata?.username || 'User',
          user_provider: 'supabase'
        });

      console.log('📊 Database function result:', { functionResult, functionError });

      if (!functionError && functionResult) {
        return { success: true, userId: functionResult };
      }

      console.error('❌ Database function failed:', functionError);
      return { success: false, error: functionError?.message || 'Database function failed' };
    } catch (error) {
      console.error('💥 Database function exception:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Database function error'
      };
    }
  }

  /**
   * Manual User Operations Module
   */
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

  /**
   * User Lookup Module
   */
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

  /**
   * User Creation Module
   */
  private async createNewUser(authUser: Session['user']): Promise<UserServiceResult> {
    try {
      const { data: newUser, error: insertError } = await supabase
        .from('user')
        .insert({
          provider_id: authUser.id,
          email: authUser.email || '',
          name: authUser.user_metadata?.name || authUser.user_metadata?.username || 'User',
          provider: 'supabase',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (insertError) {
        return { 
          success: false, 
          error: insertError.message || 'Failed to create user'
        };
      }

      if (newUser) {
        return { success: true, userId: newUser.id };
      }

      return { success: false, error: 'User creation returned no data' };

    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Creation error'
      };
    }
  }

  /**
   * Profile Management Module
   */
  public async getUserProfile(userId: number): Promise<UserProfile | null> {
    // Check profile cache first
    const cachedProfile = this.profileCache.get(userId);
    if (cachedProfile) {
      return cachedProfile;
    }

    try {
      const { data, error } = await supabase
        .from('user')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      if (data) {
        // Cache the profile
        this.profileCache.set(userId, data);
        this.cacheTimestamps.set(`profile:${userId}`, Date.now());
      }

      return data;
    } catch (error) {
      console.error('User profile fetch failed:', error);
      return null;
    }
  }

  public async updateUserProfile(userId: number, updates: Partial<UserProfile>): Promise<UserServiceResult> {
    try {
      const { data, error } = await supabase
        .from('user')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select('*')
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      if (data) {
        // Update cache
        this.profileCache.set(userId, data);
        this.cacheTimestamps.set(`profile:${userId}`, Date.now());
      }

      return { success: true, userId };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Profile update failed'
      };
    }
  }

  /**
   * Batch Operations Module
   */
  public async getUsersByIds(userIds: number[]): Promise<UserProfile[]> {
    if (userIds.length === 0) return [];

    try {
      const { data, error } = await supabase
        .from('user')
        .select('*')
        .in('id', userIds);

      if (error) {
        console.error('Error fetching users by IDs:', error);
        return [];
      }

      // Cache results
      data?.forEach(user => {
        this.profileCache.set(user.id, user);
        this.cacheTimestamps.set(`profile:${user.id}`, Date.now());
      });

      return data || [];
    } catch (error) {
      console.error('Batch user fetch failed:', error);
      return [];
    }
  }

  /**
   * Monitoring and Maintenance Module
   */
  public clearCache(): void {
    this.userCache.clear();
    this.profileCache.clear();
    this.cacheTimestamps.clear();
  }

  public getCacheSize(): number {
    return this.userCache.size;
  }

  public getProfileCacheSize(): number {
    return this.profileCache.size;
  }

  public getCacheStats(): {
    userCacheSize: number;
    profileCacheSize: number;
    totalCachedItems: number;
    oldestCacheEntry: string | null;
  } {
    let oldestTimestamp = Date.now();
    let oldestKey: string | null = null;

    for (const [key, timestamp] of this.cacheTimestamps.entries()) {
      if (timestamp < oldestTimestamp) {
        oldestTimestamp = timestamp;
        oldestKey = key;
      }
    }

    return {
      userCacheSize: this.userCache.size,
      profileCacheSize: this.profileCache.size,
      totalCachedItems: this.cacheTimestamps.size,
      oldestCacheEntry: oldestKey
    };
  }
}

export const userService = new UserService();