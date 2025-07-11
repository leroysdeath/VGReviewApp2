import { useState, useEffect, useCallback } from 'react';
import { socialService } from '../services/socialService';
import { UserFriend, FriendWithStatus } from '../types/social';
import { useAuth } from './useAuth';

export const useFriends = () => {
  const { user } = useAuth();
  const [friends, setFriends] = useState<FriendWithStatus[]>([]);
  const [friendRequests, setFriendRequests] = useState<UserFriend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load friends and friend requests
  const loadFriends = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const userId = parseInt(user.id);
      const [friendsData, requestsData] = await Promise.all([
        socialService.getFriends(userId),
        socialService.getFriendRequests(userId)
      ]);
      
      setFriends(friendsData as FriendWithStatus[]);
      setFriendRequests(requestsData);
    } catch (err) {
      console.error('Error loading friends:', err);
      setError('Failed to load friends');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Send friend request
  const sendFriendRequest = useCallback(async (friendId: number) => {
    if (!user) return false;
    
    try {
      const userId = parseInt(user.id);
      const success = await socialService.sendFriendRequest(userId, friendId);
      
      if (success) {
        // Refresh friends list
        await loadFriends();
      }
      
      return success;
    } catch (err) {
      console.error('Error sending friend request:', err);
      return false;
    }
  }, [user, loadFriends]);

  // Accept friend request
  const acceptFriendRequest = useCallback(async (requestId: number) => {
    try {
      const success = await socialService.respondToFriendRequest(requestId, true);
      
      if (success) {
        // Refresh friends list
        await loadFriends();
      }
      
      return success;
    } catch (err) {
      console.error('Error accepting friend request:', err);
      return false;
    }
  }, [loadFriends]);

  // Reject friend request
  const rejectFriendRequest = useCallback(async (requestId: number) => {
    try {
      const success = await socialService.respondToFriendRequest(requestId, false);
      
      if (success) {
        // Refresh friends list
        await loadFriends();
      }
      
      return success;
    } catch (err) {
      console.error('Error rejecting friend request:', err);
      return false;
    }
  }, [loadFriends]);

  // Follow user
  const followUser = useCallback(async (followId: number) => {
    if (!user) return false;
    
    try {
      const userId = parseInt(user.id);
      const success = await socialService.followUser(userId, followId);
      
      if (success) {
        // Refresh friends list
        await loadFriends();
      }
      
      return success;
    } catch (err) {
      console.error('Error following user:', err);
      return false;
    }
  }, [user, loadFriends]);

  // Unfollow user
  const unfollowUser = useCallback(async (followId: number) => {
    if (!user) return false;
    
    try {
      const userId = parseInt(user.id);
      const success = await socialService.unfollowUser(userId, followId);
      
      if (success) {
        // Refresh friends list
        await loadFriends();
      }
      
      return success;
    } catch (err) {
      console.error('Error unfollowing user:', err);
      return false;
    }
  }, [user, loadFriends]);

  // Check if following
  const isFollowing = useCallback(async (followId: number) => {
    if (!user) return false;
    
    try {
      const userId = parseInt(user.id);
      return await socialService.isFollowing(userId, followId);
    } catch (err) {
      console.error('Error checking follow status:', err);
      return false;
    }
  }, [user]);

  // Load friends on mount
  useEffect(() => {
    if (user) {
      loadFriends();
    }
  }, [user, loadFriends]);

  return {
    friends,
    friendRequests,
    loading,
    error,
    loadFriends,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    followUser,
    unfollowUser,
    isFollowing
  };
};