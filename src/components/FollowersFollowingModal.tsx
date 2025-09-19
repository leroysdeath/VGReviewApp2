import React, { useState, useEffect } from 'react';
import { X, Users, UserPlus, UserCheck, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useFollow } from '../hooks/useFollow';
import { useAuth } from '../hooks/useAuth';

interface User {
  id: string;
  username: string;
  avatar: string;
  bio: string;
}

interface FollowersFollowingModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  initialTab: 'followers' | 'following';
}

export const FollowersFollowingModal: React.FC<FollowersFollowingModalProps> = ({
  isOpen,
  onClose,
  userId,
  userName,
  initialTab
}) => {
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(initialTab);
  const [followers, setFollowers] = useState<User[]>([]);
  const [following, setFollowing] = useState<User[]>([]);
  const [loadingFollowers, setLoadingFollowers] = useState(false);
  const [loadingFollowing, setLoadingFollowing] = useState(false);
  const [followingUsers, setFollowingUsers] = useState<string[]>([]);
  
  const { toggleFollow, loading: followLoading } = useFollow();
  const { isAuthenticated, dbUserId: currentDbUserId } = useAuth();

  // Update active tab when initialTab changes
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Load followers data
  const loadFollowers = async () => {
    setLoadingFollowers(true);
    try {
      // First get the follower IDs
      const { data: followData, error: followError } = await supabase
        .from('user_follow')
        .select('follower_id')
        .eq('following_id', parseInt(userId));

      if (followError) throw followError;

      if (!followData || followData.length === 0) {
        setFollowers([]);
        return;
      }

      // Then get the user details for those IDs
      const followerIds = followData.map(f => f.follower_id);
      const { data: usersData, error: usersError } = await supabase
        .from('user')
        .select('id, username, name, bio, avatar_url')
        .in('id', followerIds);

      if (usersError) throw usersError;

      const followersData = (usersData || [])
        .map((user: any) => ({
          id: user.id.toString(),
          username: user.username || user.name || 'Unknown User',
          avatar: user.avatar_url || '',
          bio: user.bio || ''
        }));

      setFollowers(followersData);
    } catch (error) {
      console.error('Error loading followers:', error);
      setFollowers([]);
    } finally {
      setLoadingFollowers(false);
    }
  };

  // Load following data
  const loadFollowing = async () => {
    setLoadingFollowing(true);
    try {
      // First get the following IDs
      const { data: followData, error: followError } = await supabase
        .from('user_follow')
        .select('following_id')
        .eq('follower_id', parseInt(userId));

      if (followError) throw followError;

      if (!followData || followData.length === 0) {
        setFollowing([]);
        return;
      }

      // Then get the user details for those IDs
      const followingIds = followData.map(f => f.following_id);
      const { data: usersData, error: usersError } = await supabase
        .from('user')
        .select('id, username, name, bio, avatar_url')
        .in('id', followingIds);

      if (usersError) throw usersError;

      const followingData = (usersData || [])
        .map((user: any) => ({
          id: user.id.toString(),
          username: user.username || user.name || 'Unknown User',
          avatar: user.avatar_url || '',
          bio: user.bio || ''
        }));

      setFollowing(followingData);
    } catch (error) {
      console.error('Error loading following:', error);
      setFollowing([]);
    } finally {
      setLoadingFollowing(false);
    }
  };

  // Load current authenticated user's following list to show follow status
  const loadUserFollowingList = async () => {
    if (!isAuthenticated || !currentDbUserId) return;
    
    try {
      const { data, error } = await supabase
        .from('user_follow')
        .select('following_id')
        .eq('follower_id', currentDbUserId);

      if (error) throw error;

      const followingIds = (data || []).map(item => item.following_id.toString());
      setFollowingUsers(followingIds);
    } catch (error) {
      console.error('Error loading user following list:', error);
    }
  };

  // Load data when modal opens or tab changes
  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'followers') {
        loadFollowers();
      } else {
        loadFollowing();
      }
      loadUserFollowingList();
    }
  }, [isOpen, activeTab, userId, currentDbUserId]);

  // Handle follow/unfollow
  const handleToggleFollow = async (targetUserId: string) => {
    if (!isAuthenticated) return;

    const result = await toggleFollow(targetUserId);
    if (result.success) {
      // Update local state
      setFollowingUsers(prev => 
        result.isFollowing 
          ? [...prev, targetUserId]
          : prev.filter(id => id !== targetUserId)
      );
    }
  };

  if (!isOpen) return null;

  const currentUsers = activeTab === 'followers' ? followers : following;
  const isLoading = activeTab === 'followers' ? loadingFollowers : loadingFollowing;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-md w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">{userName}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab('following')}
            className={`flex-1 py-3 px-4 text-center transition-colors ${
              activeTab === 'following'
                ? 'border-b-2 border-[#E8A5A5]'
                : 'border-b-2 border-transparent'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              {activeTab === 'following' ? (
                <>
                  <div className="bg-[#E8A5A5] text-white w-8 h-8 rounded-full flex items-center justify-center">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <span className="text-[#E8A5A5]">Following</span>
                </>
              ) : (
                <>
                  <UserCheck className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-400 hover:text-white transition-colors">Following</span>
                </>
              )}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('followers')}
            className={`flex-1 py-3 px-4 text-center transition-colors ${
              activeTab === 'followers'
                ? 'border-b-2 border-[#FF6B9D]'
                : 'border-b-2 border-transparent'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              {activeTab === 'followers' ? (
                <>
                  <div className="bg-[#FF6B9D] text-white w-8 h-8 rounded-full flex items-center justify-center">
                    <UsersRound className="h-5 w-5" />
                  </div>
                  <span className="text-[#FF6B9D]">Followers</span>
                </>
              ) : (
                <>
                  <UsersRound className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-400 hover:text-white transition-colors">Followers</span>
                </>
              )}
            </div>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${
                activeTab === 'following'
                  ? 'border-[#E8A5A5]'
                  : 'border-[#FF6B9D]'
              }`}></div>
            </div>
          ) : currentUsers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">
                {activeTab === 'followers' 
                  ? 'No followers yet' 
                  : 'Not following anyone yet'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {currentUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between">
                  <Link
                    to={`/user/${user.id}`}
                    className="flex items-center gap-3 hover:bg-gray-700 rounded-lg p-2 transition-colors flex-1"
                    onClick={onClose}
                  >
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.username}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium truncate">{user.username}</h3>
                      {user.bio && (
                        <p className="text-gray-400 text-sm truncate">{user.bio}</p>
                      )}
                    </div>
                  </Link>
                  
                  {isAuthenticated && user.id !== userId && user.id !== currentDbUserId?.toString() && (
                    <button
                      onClick={() => handleToggleFollow(user.id)}
                      disabled={followLoading}
                      className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                        followLoading
                          ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                          : followingUsers.includes(user.id)
                          ? 'bg-[#E8A5A5] text-white hover:bg-[#E8A5A5]/80'
                          : 'bg-[#FF6B9D] text-white hover:bg-[#FF6B9D]/80'
                      }`}
                    >
                      {followLoading ? (
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : followingUsers.includes(user.id) ? (
                        <UserCheck className="h-5 w-5" />
                      ) : (
                        <>
                          <UserPlus className="h-3 w-3" />
                          Follow
                        </>
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
