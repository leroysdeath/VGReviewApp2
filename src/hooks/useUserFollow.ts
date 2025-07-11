import { useState, useEffect, useCallback } from 'react';
import { activityService } from '../services/activityService';
import { UserFollow } from '../types/activity';
import { useAuth } from './useAuth';

export const useUserFollow = (targetUserId?: number) => {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [followers, setFollowers] = useState<UserFollow[]>([]);
  const [following, setFollowing] = useState<UserFollow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  // Check if current user is following target user
  useEffect(() => {
    const checkFollowStatus = async () => {
      if (!user || !targetUserId) return;

      setLoading(true);
      try {
        const currentUserId = parseInt(user.id);
        const isFollowingUser = await activityService.isFollowing(currentUserId, targetUserId);
        setIsFollowing(isFollowingUser);
      } catch (err) {
        console.error('Error checking follow status:', err);
        setError('Failed to check follow status');
      } finally {
        setLoading(false);
      }
    };

    checkFollowStatus();
  }, [user, targetUserId]);

  // Get followers for a user
  const getFollowers = useCallback(async (userId: number) => {
    setLoading(true);
    setError(null);
    
    try {
      const userFollowers = await activityService.getUserFollowers(userId);
      setFollowers(userFollowers);
      setFollowerCount(userFollowers.length);
      return userFollowers;
    } catch (err) {
      console.error('Error getting followers:', err);
      setError('Failed to load followers');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Get following for a user
  const getFollowing = useCallback(async (userId: number) => {
    setLoading(true);
    setError(null);
    
    try {
      const userFollowing = await activityService.getUserFollowing(userId);
      setFollowing(userFollowing);
      setFollowingCount(userFollowing.length);
      return userFollowing;
    } catch (err) {
      console.error('Error getting following:', err);
      setError('Failed to load following');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Follow a user
  const followUser = useCallback(async (followingId: number) => {
    if (!user) return false;

    setLoading(true);
    setError(null);
    
    try {
      const currentUserId = parseInt(user.id);
      const success = await activityService.followUser(currentUserId, followingId);
      
      if (success) {
        setIsFollowing(true);
        setFollowerCount(prev => prev + 1);
        return true;
      }
      
      return false;
    } catch (err) {
      console.error('Error following user:', err);
      setError('Failed to follow user');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Unfollow a user
  const unfollowUser = useCallback(async (followingId: number) => {
    if (!user) return false;

    setLoading(true);
    setError(null);
    
    try {
      const currentUserId = parseInt(user.id);
      const success = await activityService.unfollowUser(currentUserId, followingId);
      
      if (success) {
        setIsFollowing(false);
        setFollowerCount(prev => Math.max(0, prev - 1));
        return true;
      }
      
      return false;
    } catch (err) {
      console.error('Error unfollowing user:', err);
      setError('Failed to unfollow user');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Toggle follow status
  const toggleFollow = useCallback(async (followingId: number) => {
    return isFollowing
      ? unfollowUser(followingId)
      : followUser(followingId);
  }, [isFollowing, followUser, unfollowUser]);

  // Load followers and following for target user
  useEffect(() => {
    if (targetUserId) {
      getFollowers(targetUserId);
      getFollowing(targetUserId);
    }
  }, [targetUserId, getFollowers, getFollowing]);

  return {
    isFollowing,
    followers,
    following,
    followerCount,
    followingCount,
    loading,
    error,
    followUser,
    unfollowUser,
    toggleFollow,
    getFollowers,
    getFollowing
  };
};