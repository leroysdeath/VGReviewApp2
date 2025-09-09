import { useState, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './useAuth';

export interface FollowOperationResult {
  success: boolean;
  error?: string;
  isFollowing?: boolean;
}

export const useFollow = () => {
  const { isAuthenticated, dbUserId: currentDbUserId, dbUserIdLoading: userIdLoading } = useAuth();
  const [operationLoading, setOperationLoading] = useState(false);

  /**
   * Check if current user is following a target user
   */
  const isFollowing = useCallback(async (targetUserId: string): Promise<boolean> => {
    if (!isAuthenticated || !currentDbUserId) {
      return false;
    }

    try {
      const { data, error } = await supabase
        .from('user_follow')
        .select('id')
        .eq('follower_id', currentDbUserId)
        .eq('following_id', parseInt(targetUserId));

      if (error) {
        console.error('Error checking follow status:', error);
        return false;
      }

      // Check if any records exist (don't use .single() to avoid 406 errors)
      return data && data.length > 0;
    } catch (error) {
      console.error('Error checking follow status:', error);
      return false;
    }
  }, [isAuthenticated, currentDbUserId]);

  /**
   * Follow a user
   */
  const followUser = useCallback(async (targetUserId: string): Promise<FollowOperationResult> => {
    if (!isAuthenticated) {
      return { success: false, error: 'You must be logged in to follow users' };
    }

    if (!currentDbUserId) {
      return { success: false, error: 'Unable to determine current user ID' };
    }

    // Prevent self-following
    if (currentDbUserId === parseInt(targetUserId)) {
      return { success: false, error: 'You cannot follow yourself' };
    }

    setOperationLoading(true);

    try {
      console.log('Following user:', { follower: currentDbUserId, following: targetUserId });

      // Check if already following
      const alreadyFollowing = await isFollowing(targetUserId);
      if (alreadyFollowing) {
        setOperationLoading(false);
        return { success: true, isFollowing: true };
      }

      // Insert follow relationship
      const { error } = await supabase
        .from('user_follow')
        .insert({
          follower_id: currentDbUserId,
          following_id: parseInt(targetUserId)
        });

      if (error) {
        console.error('Error following user:', error);
        return { success: false, error: 'Failed to follow user. Please try again.' };
      }

      console.log('Successfully followed user');
      return { success: true, isFollowing: true };
    } catch (error) {
      console.error('Error following user:', error);
      return { success: false, error: 'An unexpected error occurred' };
    } finally {
      setOperationLoading(false);
    }
  }, [isAuthenticated, currentDbUserId, isFollowing]);

  /**
   * Unfollow a user
   */
  const unfollowUser = useCallback(async (targetUserId: string): Promise<FollowOperationResult> => {
    if (!isAuthenticated) {
      return { success: false, error: 'You must be logged in to unfollow users' };
    }

    if (!currentDbUserId) {
      return { success: false, error: 'Unable to determine current user ID' };
    }

    setOperationLoading(true);

    try {
      console.log('Unfollowing user:', { follower: currentDbUserId, following: targetUserId });

      // Delete follow relationship
      const { error } = await supabase
        .from('user_follow')
        .delete()
        .eq('follower_id', currentDbUserId)
        .eq('following_id', parseInt(targetUserId));

      if (error) {
        console.error('Error unfollowing user:', error);
        return { success: false, error: 'Failed to unfollow user. Please try again.' };
      }

      console.log('Successfully unfollowed user');
      return { success: true, isFollowing: false };
    } catch (error) {
      console.error('Error unfollowing user:', error);
      return { success: false, error: 'An unexpected error occurred' };
    } finally {
      setOperationLoading(false);
    }
  }, [isAuthenticated, currentDbUserId]);

  /**
   * Toggle follow status
   */
  const toggleFollow = useCallback(async (targetUserId: string): Promise<FollowOperationResult> => {
    const currentlyFollowing = await isFollowing(targetUserId);
    
    if (currentlyFollowing) {
      return await unfollowUser(targetUserId);
    } else {
      return await followUser(targetUserId);
    }
  }, [isFollowing, followUser, unfollowUser]);

  /**
   * Get list of users current user is following
   */
  const getFollowingList = useCallback(async (): Promise<string[]> => {
    if (!isAuthenticated || !currentDbUserId) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('user_follow')
        .select('following_id')
        .eq('follower_id', currentDbUserId);

      if (error) {
        console.error('Error fetching following list:', error);
        return [];
      }

      return data?.map(follow => follow.following_id.toString()) || [];
    } catch (error) {
      console.error('Error fetching following list:', error);
      return [];
    }
  }, [isAuthenticated, currentDbUserId]);

  return {
    isFollowing,
    followUser,
    unfollowUser,
    toggleFollow,
    getFollowingList,
    loading: userIdLoading || operationLoading,
    canFollow: isAuthenticated && !!currentDbUserId
  };
};
