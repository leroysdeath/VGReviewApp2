import type { DatabaseUser as UserProfile } from '../types/user';

interface CachedProfile {
  data: UserProfile;
  timestamp: number;
  userId: string;
}

class ProfileCacheService {
  private cache: Map<string, CachedProfile> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Get cached profile data
  get(userId: string): UserProfile | null {
    const cached = this.cache.get(userId);
    
    if (!cached) {
      return null;
    }

    // Check if cache is still valid (within 5 minutes)
    if (Date.now() - cached.timestamp > this.CACHE_DURATION) {
      this.cache.delete(userId);
      return null;
    }

    console.log('🚀 Using cached profile data for user:', userId);
    return cached.data;
  }

  // Set profile data in cache
  set(userId: string, data: UserProfile): void {
    this.cache.set(userId, {
      data,
      timestamp: Date.now(),
      userId
    });
    console.log('💾 Cached profile data for user:', userId);
  }

  // Update cached profile data
  update(userId: string, updatedData: Partial<UserProfile>): void {
    const cached = this.cache.get(userId);
    if (cached) {
      cached.data = { ...cached.data, ...updatedData };
      cached.timestamp = Date.now(); // Refresh timestamp
      console.log('🔄 Updated cached profile data for user:', userId);
    }
  }

  // Clear cache for specific user
  clear(userId: string): void {
    this.cache.delete(userId);
    console.log('🗑️ Cleared cache for user:', userId);
  }

  // Clear all cache
  clearAll(): void {
    this.cache.clear();
    console.log('🗑️ Cleared all profile cache');
  }

  // Check if we have valid cached data
  has(userId: string): boolean {
    return this.get(userId) !== null;
  }
}

// Export singleton instance
export const profileCache = new ProfileCacheService();