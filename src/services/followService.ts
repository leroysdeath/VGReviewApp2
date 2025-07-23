import { supabase } from './supabase';

export interface FollowStats {
  following: number;
  followers: number;
}

export interface UserStats {
  gamesReviewed: number;
  thisYearReviews: number;
  lists: number;
  following: number;
  followers: number;
}

/**
 * Follow a user
 */
export const followUser = async (followingId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    // Get current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get the follower's user ID from the user table
    const { data: followerData, error: followerError } = await supabase
      .from('user')
      .select('id')
      .eq('provider_id', user.id)
      .single();

    if (followerError || !followerData) {
      return { success: false, error: 'User not found' };
    }

    // Check if already following
    const { data: existingFollow, error: checkError } = await supabase
      .from('user_follow')
      .select('id')
      .eq('follower_id', followerData.id)
      .eq('following_id', parseInt(followingId))
      .single();

    if (checkError && checkError.code === 'PGRST116') {
      // Not following yet, proceed with follow
    } else if (existingFollow) {
      return { success: false, error: 'Already following this user' };
    } else if (checkError) {
      return { success: false, error: 'Error checking follow status' };
    }

    // Create follow relationship
    const { error: insertError } = await supabase
      .from('user_follow')
      .insert({
        follower_id: followerData.id,
        following_id: parseInt(followingId)
      });

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error following user:', error);
    return { success: false, error: 'Failed to follow user' };
  }
};

/**
 * Unfollow a user
 */
export const unfollowUser = async (followingId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    // Get current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get the follower's user ID from the user table
    const { data: followerData, error: followerError } = await supabase
      .from('user')
      .select('id')
      .eq('provider_id', user.id)
      .single();

    if (followerError || !followerData) {
      return { success: false, error: 'User not found' };
    }

    // Remove follow relationship
    const { error: deleteError } = await supabase
      .from('user_follow')
      .delete()
      .eq('follower_id', followerData.id)
      .eq('following_id', parseInt(followingId));

    if (deleteError) {
      return { success: false, error: deleteError.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error unfollowing user:', error);
    return { success: false, error: 'Failed to unfollow user' };
  }
};

/**
 * Check if current user is following a specific user
 */
export const isFollowing = async (followingId: string): Promise<{ isFollowing: boolean; error?: string }> => {
  try {
    // Get current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { isFollowing: false, error: 'Not authenticated' };
    }

    // Get the follower's user ID from the user table
    const { data: followerData, error: followerError } = await supabase
      .from('user')
      .select('id')
      .eq('provider_id', user.id)
      .single();

    if (followerError || !followerData) {
      return { isFollowing: false, error: 'User not found' };
    }

    // Check if following
    const { data, error } = await supabase
      .from('user_follow')
      .select('id')
      .eq('follower_id', followerData.id)
      .eq('following_id', parseInt(followingId))
      .single();

    if (error && error.code === 'PGRST116') {
      // No rows returned - not following
      return { isFollowing: false };
    } else if (error) {
      return { isFollowing: false, error: error.message };
    }

    return { isFollowing: !!data };
  } catch (error) {
    console.error('Error checking follow status:', error);
    return { isFollowing: false, error: 'Failed to check follow status' };
  }
};

/**
 * Get follow stats for a user (followers and following counts)
 */
export const getFollowStats = async (userId: string): Promise<{ stats: FollowStats | null; error?: string }> => {
  try {
    // Get followers count
    const { count: followersCount, error: followersError } = await supabase
      .from('user_follow')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', parseInt(userId));

    if (followersError) {
      return { stats: null, error: followersError.message };
    }

    // Get following count
    const { count: followingCount, error: followingError } = await supabase
      .from('user_follow')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', parseInt(userId));

    if (followingError) {
      return { stats: null, error: followingError.message };
    }

    return {
      stats: {
        followers: followersCount || 0,
        following: followingCount || 0
      }
    };
  } catch (error) {
    console.error('Error getting follow stats:', error);
    return { stats: null, error: 'Failed to get follow stats' };
  }
};

/**
 * Get comprehensive user stats including reviews and follows
 */
export const getUserStats = async (userId: string): Promise<{ stats: UserStats | null; error?: string }> => {
  try {
    // Get follow stats
    const { stats: followStats, error: followError } = await getFollowStats(userId);
    if (followError) {
      return { stats: null, error: followError };
    }

    // Get total reviews count
    const { count: totalReviews, error: reviewsError } = await supabase
      .from('review')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', parseInt(userId));

    if (reviewsError) {
      return { stats: null, error: reviewsError.message };
    }

    // Get this year's reviews count
    const currentYear = new Date().getFullYear();
    const { count: thisYearReviews, error: thisYearError } = await supabase
      .from('review')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', parseInt(userId))
      .gte('post_date_time', `${currentYear}-01-01`)
      .lt('post_date_time', `${currentYear + 1}-01-01`);

    if (thisYearError) {
      return { stats: null, error: thisYearError.message };
    }

    return {
      stats: {
        gamesReviewed: totalReviews || 0,
        thisYearReviews: thisYearReviews || 0,
        lists: 0, // Placeholder - implement when lists feature is added
        following: followStats?.following || 0,
        followers: followStats?.followers || 0
      }
    };
  } catch (error) {
    console.error('Error getting user stats:', error);
    return { stats: null, error: 'Failed to get user stats' };
  }
};

/**
 * Get users that follow a specific user
 */
export const getFollowers = async (userId: string, limit = 20): Promise<{ followers: any[]; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('user_follow')
      .select(`
        follower_id,
        created_at,
        follower:follower_id (
          id,
          name,
          picurl,
          bio
        )
      `)
      .eq('following_id', parseInt(userId))
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { followers: [], error: error.message };
    }

    return { followers: data || [] };
  } catch (error) {
    console.error('Error getting followers:', error);
    return { followers: [], error: 'Failed to get followers' };
  }
};

/**
 * Get users that a specific user follows
 */
export const getFollowing = async (userId: string, limit = 20): Promise<{ following: any[]; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('user_follow')
      .select(`
        following_id,
        created_at,
        following:following_id (
          id,
          name,
          picurl,
          bio
        )
      `)
      .eq('follower_id', parseInt(userId))
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { following: [], error: error.message };
    }

    return { following: data || [] };
  } catch (error) {
    console.error('Error getting following:', error);
    return { following: [], error: 'Failed to get following' };
  }
};
