import React, { useState, useEffect } from 'react';
import { Users, UserPlus, UserMinus, Loader2 } from 'lucide-react';
import { followUser, unfollowUser, isFollowing } from '../services/followService';
import { useAuth } from '../hooks/useAuth';

interface FollowButtonProps {
  userId: string;
  onFollowChange?: (isFollowing: boolean) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showText?: boolean;
}

export const FollowButton: React.FC<FollowButtonProps> = ({
  userId,
  onFollowChange,
  className = '',
  size = 'md',
  showIcon = true,
  showText = true
}) => {
  const { user: currentUser, isAuthenticated } = useAuth();
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  // Size classes
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  // Icon sizes
  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  // Check initial follow status
  useEffect(() => {
    const checkFollowStatus = async () => {
      if (!isAuthenticated || !currentUser) {
        setCheckingStatus(false);
        return;
      }

      try {
        const { isFollowing: followingStatus, error } = await isFollowing(userId);
        if (!error) {
          setFollowing(followingStatus);
        }
      } catch (error) {
        console.error('Error checking follow status:', error);
      } finally {
        setCheckingStatus(false);
      }
    };

    checkFollowStatus();
  }, [userId, isAuthenticated, currentUser]);

  const handleFollowToggle = async () => {
    if (!isAuthenticated || !currentUser) {
      // Could show login modal here
      alert('Please log in to follow users');
      return;
    }

    if (loading) return;

    setLoading(true);

    try {
      let result;
      if (following) {
        result = await unfollowUser(userId);
      } else {
        result = await followUser(userId);
      }

      if (result.success) {
        const newFollowingStatus = !following;
        setFollowing(newFollowingStatus);
        onFollowChange?.(newFollowingStatus);
      } else {
        alert(result.error || 'Failed to update follow status');
      }
    } catch (error) {
      console.error('Error toggling follow status:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Don't render if user is looking at their own profile
  if (currentUser?.id === userId) {
    return null;
  }

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  // Show loading spinner while checking status
  if (checkingStatus) {
    return (
      <div className={`${sizeClasses[size]} bg-gray-700 text-gray-400 rounded-lg flex items-center justify-center gap-2 ${className}`}>
        <Loader2 className={`${iconSizes[size]} animate-spin`} />
        {showText && <span>...</span>}
      </div>
    );
  }

  return (
    <button
      onClick={handleFollowToggle}
      disabled={loading}
      className={`
        ${sizeClasses[size]}
        ${following 
          ? 'bg-purple-600 hover:bg-purple-700 text-white border border-purple-600' 
          : 'bg-gray-700 hover:bg-gray-600 text-white border border-gray-600'
        }
        rounded-lg transition-colors flex items-center justify-center gap-2 font-medium
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      title={following ? 'Unfollow user' : 'Follow user'}
    >
      {loading ? (
        <>
          {showIcon && <Loader2 className={`${iconSizes[size]} animate-spin`} />}
          {showText && <span>...</span>}
        </>
      ) : (
        <>
          {showIcon && (
            following ? 
              <UserMinus className={iconSizes[size]} /> : 
              <UserPlus className={iconSizes[size]} />
          )}
          {showText && (
            <span>{following ? 'Following' : 'Follow'}</span>
          )}
        </>
      )}
    </button>
  );
};
