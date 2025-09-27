import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useAuth } from '../hooks/useAuth';
import { ProfileInfo } from '../components/ProfileInfo';
import { ProfileDetails } from '../components/ProfileDetails';
import { TopGames } from '../components/profile/TopGames';
import { PlaylistTabs } from '../components/profile/PlaylistTabs';
import { ActivityFeed } from '../components/profile/ActivityFeed';
import { FollowersFollowingModal } from '../components/FollowersFollowingModal';
import { GamesModal } from '../components/GamesModal';
import { ReviewsModal } from '../components/ReviewsModal';
import { userServiceSimple, UserUpdate } from '../services/userServiceSimple';
import { useFollow } from '../hooks/useFollow';
import { UserRatingDistribution } from '../components/profile/UserRatingDistribution';

// Import UserSettingsModal directly to avoid dynamic import issues
import UserSettingsModal from '../components/profile/UserSettingsModal';

export const UserPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user: authUser, isAuthenticated, updateProfile } = useAuth();

  // Redirect if no ID provided - redirect to current user's profile
  if (!id) {
    if (isAuthenticated && authUser?.databaseId) {
      return <Navigate to={`/user/${authUser.databaseId}`} replace />;
    } else {
      // If not authenticated or no database ID, redirect to users search
      return <Navigate to="/users" replace />;
    }
  }
  const [activeTab, setActiveTab] = useState<'top5' | 'top10' | 'playlist' | 'activity'>('top5');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  
  // Modal states
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isFollowersModalOpen, setIsFollowersModalOpen] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState<'followers' | 'following'>('followers');
  const [isGamesModalOpen, setIsGamesModalOpen] = useState(false);
  const [gamesModalInitialTab, setGamesModalInitialTab] = useState<'all' | 'started' | 'finished'>('all');
  const [isReviewsModalOpen, setIsReviewsModalOpen] = useState(false);
  
  // Follow functionality
  const { toggleFollow, isFollowing, loading: followLoading } = useFollow();
  const [isFollowingUser, setIsFollowingUser] = useState(false);

  // Ref for ProfileDetails to calculate modal position
  const profileDetailsRef = useRef<HTMLDivElement>(null);
  const [modalTopPosition, setModalTopPosition] = useState<number | null>(null);

  // Fetch user data - defined first to avoid temporal dead zone
  const fetchUserData = useCallback(async (skipLoadingState = false) => {
    // Parse ID to integer for database queries
    const numericId = parseInt(id);
    
    if (isNaN(numericId)) {
      setError('Invalid user ID');
      setLoading(false);
      return;
    }
    
    try {
      if (!skipLoadingState) {
        setLoading(true);
      }
      
      // Fetch user data
      const { data: userData, error: userError } = await supabase
        .from('user')
        .select('*')
        .eq('id', numericId)
        .single();
        
      if (userError) {
        throw userError;
      }
      
      // Check if this is the current user's own profile
      let isCurrentUserProfile = false;
      try {
        if (isAuthenticated && authUser?.id) {
          const { data: currentUserData, error: currentUserError } = await supabase
            .from('user')
            .select('id')
            .eq('provider_id', authUser.id)
            .single();
          
          if (!currentUserError && currentUserData) {
            isCurrentUserProfile = currentUserData.id === numericId;
            setIsOwnProfile(isCurrentUserProfile);
          } else {
            setIsOwnProfile(false);
          }
        } else {
          setIsOwnProfile(false);
        }
      } catch (ownProfileError) {
        console.error('Error checking own profile:', ownProfileError);
        setIsOwnProfile(false);
      }
      
      // Check if following this user (only if not own profile and authenticated)
      if (!isCurrentUserProfile && isAuthenticated) {
        try {
          const followStatus = await isFollowing(numericId.toString());
          setIsFollowingUser(followStatus);
        } catch (error) {
          console.error('Error checking follow status:', error);
        }
      }
      
      // Query basic stats for ProfileDetails
      const { data: startedGamesData } = await supabase
        .from('game_progress')
        .select('game_id')
        .eq('user_id', numericId)
        .eq('started', true);
        
      const { data: reviewsData } = await supabase
        .from('rating')
        .select('id')
        .eq('user_id', numericId)
        .not('rating', 'is', null);
      
      const startedGamesCount = startedGamesData?.length || 0;
      const reviewsCount = reviewsData?.length || 0;
      
      // Get follower/following counts from computed columns
      const followerCount = userData.follower_count || 0;
      const followingCount = userData.following_count || 0;
      
      // Store the counts for use in stats calculation
      userData._followerCount = followerCount;
      userData._followingCount = followingCount;
      userData._startedGamesCount = startedGamesCount;
      userData._reviewsCount = reviewsCount;
      
      setUser(userData);
    } catch (err) {
      console.error('Error fetching user data:', err);
      setError('Failed to load user data');
    } finally {
      setLoading(false);
    }
  }, [id, isAuthenticated, authUser, isFollowing]);

  // Handle profile save using simplified userService
  const handleSaveProfile = useCallback(async (profileData: UserUpdate) => {
    try {
      if (!id) {
        throw new Error('No user ID available');
      }

      // Import and use the field mapping utility
      const { mapFormToDatabase } = await import('../utils/userFieldMapping');
      const mappedData = mapFormToDatabase(profileData);

      // If editing own profile, use updateProfile for global state sync
      // This ensures ResponsiveNavbar updates immediately
      if (isOwnProfile && authUser) {
        // Use the auth service's updateProfile which handles both database and auth state
        const authUpdateResult = await updateProfile({
          username: mappedData.username || mappedData.name,
          avatar: mappedData.avatar_url
        });
        
        if (authUpdateResult.error) {
          throw authUpdateResult.error;
        }
        
        // Also update any other fields that aren't handled by updateProfile
        // (bio, location, website, platform) using userServiceSimple
        const otherFields = {
          bio: mappedData.bio,
          location: mappedData.location,
          website: mappedData.website,
          platform: mappedData.platform
        };
        
        // Only update if there are other fields to update
        if (Object.values(otherFields).some(val => val !== undefined)) {
          const updateResult = await userServiceSimple.updateUser(id, otherFields);
          if (!updateResult.success) {
            throw new Error(updateResult.error || 'Failed to update additional profile fields');
          }
        }
      } else {
        // For non-own profiles (if that's ever allowed), use the original method
        const updateResult = await userServiceSimple.updateUser(id, mappedData);
        
        if (!updateResult.success) {
          throw new Error(updateResult.error || 'Profile update failed');
        }
      }

      // Close modal first before refreshing data
      setShowSettingsModal(false);
      
      // Refresh the user data after successful update with a small delay
      // to ensure modal has closed properly, skip loading state to prevent flicker
      setTimeout(() => {
        fetchUserData(true);
      }, 100);
      
    } catch (error) {
      console.error('Error saving profile:', error);
      throw error;
    }
  }, [id, fetchUserData, isOwnProfile, authUser, updateProfile]);

  // Calculate modal position based on ProfileDetails
  const calculateModalPosition = () => {
    if (profileDetailsRef.current) {
      const rect = profileDetailsRef.current.getBoundingClientRect();
      const bottomPosition = rect.bottom + window.scrollY;
      // Add small gap (4px) below the ProfileDetails
      setModalTopPosition(bottomPosition + 4);
    }
  };

  // Modal handlers
  const handleEditClick = () => {
    setShowSettingsModal(true);
  };
  
  // Handle follow/unfollow
  const handleFollowClick = async () => {
    if (!id) return;
    
    try {
      const result = await toggleFollow(id);
      if (result.success) {
        setIsFollowingUser(result.isFollowing);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  const handleFollowersClick = () => {
    calculateModalPosition();
    setModalInitialTab('followers');
    setIsFollowersModalOpen(true);
  };

  const handleFollowingClick = () => {
    calculateModalPosition();
    setModalInitialTab('following');
    setIsFollowersModalOpen(true);
  };

  const handleGamesClick = () => {
    calculateModalPosition();
    setGamesModalInitialTab('all');
    setIsGamesModalOpen(true);
  };

  const handleReviewsClick = () => {
    calculateModalPosition();
    setIsReviewsModalOpen(true);
  };
  
  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  // Reset to Top 5 tab when navigating to a different user
  useEffect(() => {
    setActiveTab('top5');
  }, [id]);

  // Refresh follow state when page gains focus
  useEffect(() => {
    const handleFocus = () => {
      // Only refresh follow state if viewing another user's profile
      if (!isOwnProfile && isAuthenticated && id) {
        isFollowing(id).then(status => {
          setIsFollowingUser(status);
        }).catch(error => {
          console.error('Error refreshing follow status:', error);
        });
      }
    };

    window.addEventListener('focus', handleFocus);
    
    // Also refresh when navigating back to this page
    handleFocus();
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [id, isOwnProfile, isAuthenticated, isFollowing]);

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading user profile..." />;
  }
  
  if (error) {
    return <Navigate to="/" replace />;
  }
  
  if (!user) {
    return <Navigate to="/users" replace />;
  }
  
  // Transform user data to match expected format for ProfileInfo
  const transformedUser = {
    id: user.id.toString(),
    username: user.username || user.name,
    avatar: user.avatar_url || '',
    bio: user.bio || '',
    joinDate: new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
    location: user.location,
    website: user.website,
    platform: user.platform
  };
  
  // Calculate user stats with real data
  const stats = {
    films: user._startedGamesCount || 0, // Total games marked as started
    thisYear: user._reviewsCount || 0, // Total reviews count
    lists: 0, // To be implemented with real data when lists feature is added
    following: user._followingCount || 0, // Real following count from database
    followers: user._followerCount || 0 // Real follower count from database
  };

  return (
    <div className="bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Profile Header - Desktop Layout (lg+) */}
        <div className="hidden lg:flex gap-6 mb-8">
          <div className="flex-1 space-y-6">
            <ProfileInfo
              user={transformedUser}
              isDummy={false}
              onEditClick={handleEditClick}
              isCurrentUser={isOwnProfile}
              onFollowClick={handleFollowClick}
              isFollowing={isFollowingUser}
              followLoading={followLoading}
              isAuthenticated={isAuthenticated}
            />
            <div ref={profileDetailsRef} className="w-full max-w-xl">
              <ProfileDetails
                stats={stats}
                onFollowersClick={handleFollowersClick}
                onFollowingClick={handleFollowingClick}
                onGamesClick={handleGamesClick}
                onReviewsClick={handleReviewsClick}
              />
            </div>
          </div>
          <div className="w-full max-w-sm">
            <UserRatingDistribution userId={parseInt(id)} username={transformedUser.username} />
          </div>
        </div>

        {/* Profile Header - Tablet Layout (md) */}
        <div className="hidden md:flex lg:hidden gap-6 mb-8">
          <div className="flex-1 space-y-6">
            <ProfileInfo
              user={transformedUser}
              isDummy={false}
              onEditClick={handleEditClick}
              isCurrentUser={isOwnProfile}
              onFollowClick={handleFollowClick}
              isFollowing={isFollowingUser}
              followLoading={followLoading}
              isAuthenticated={isAuthenticated}
            />
            <div ref={profileDetailsRef} className="w-full max-w-xl">
              <ProfileDetails
                stats={stats}
                onFollowersClick={handleFollowersClick}
                onFollowingClick={handleFollowingClick}
                onGamesClick={handleGamesClick}
                onReviewsClick={handleReviewsClick}
              />
            </div>
          </div>
          <div className="w-full max-w-sm">
            <UserRatingDistribution userId={parseInt(id)} username={transformedUser.username} />
          </div>
        </div>

        {/* Profile Header - Mobile Layout */}
        <div className="md:hidden mb-8 space-y-6">
          <ProfileInfo
            user={transformedUser}
            isDummy={false}
            onEditClick={handleEditClick}
            isCurrentUser={isOwnProfile}
            onFollowClick={handleFollowClick}
            isFollowing={isFollowingUser}
            followLoading={followLoading}
            isAuthenticated={isAuthenticated}
          />
          <UserRatingDistribution userId={parseInt(id)} username={transformedUser.username} />
          <div ref={profileDetailsRef} className="w-full">
            <ProfileDetails
              stats={stats}
              onFollowersClick={handleFollowersClick}
              onFollowingClick={handleFollowingClick}
              onGamesClick={handleGamesClick}
              onReviewsClick={handleReviewsClick}
            />
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="flex gap-4 mb-6 border-b border-gray-700">
          <button
            onClick={() => setActiveTab('top5')}
            className={`pb-2 ${activeTab === 'top5' ? 'border-b-2 border-purple-600 text-white' : 'text-gray-400'}`}
          >
            Top 5
          </button>
          <button
            onClick={() => setActiveTab('top10')}
            className={`pb-2 ${activeTab === 'top10' ? 'border-b-2 border-purple-600 text-white' : 'text-gray-400'}`}
          >
            Top 10
          </button>
          <button
            onClick={() => setActiveTab('playlist')}
            className={`pb-2 relative ${activeTab === 'playlist' ? 'text-white' : 'text-gray-400'}`}
          >
            Want to Play
            {activeTab === 'playlist' && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] flex">
                <div className="w-1/2 bg-red-600"></div>
                <div className="w-1/2 bg-orange-600"></div>
              </div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`pb-2 ${activeTab === 'activity' ? 'border-b-2 border-purple-600 text-white' : 'text-gray-400'}`}
          >
            Activity
          </button>
        </div>

        {/* Profile Content - Direct rendering with focused components */}
        {activeTab === 'top5' && (
          <TopGames userId={id} limit={5} editable={isOwnProfile} isOwnProfile={isOwnProfile} />
        )}
        {activeTab === 'top10' && (
          <TopGames userId={id} limit={10} isOwnProfile={isOwnProfile} />
        )}
        {activeTab === 'playlist' && (
          <PlaylistTabs userId={id!} isOwnProfile={isOwnProfile} />
        )}
        {activeTab === 'activity' && (
          <ActivityFeed userId={id} isOwnProfile={isOwnProfile} />
        )}
      </div>

      {/* User Settings Modal */}
      {showSettingsModal && (
        <UserSettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          userId={authUser?.id || ''}
          userData={{
            username: transformedUser.username,
            email: user.email || authUser?.email || '',
            bio: transformedUser.bio,
            location: transformedUser.location || '',
            website: transformedUser.website || '',
            platform: transformedUser.platform || '',
            avatar: transformedUser.avatar
          }}
          onSave={handleSaveProfile}
        />
      )}

      {/* Followers/Following Modal */}
      <FollowersFollowingModal
        isOpen={isFollowersModalOpen}
        onClose={() => setIsFollowersModalOpen(false)}
        userId={id!}
        userName={transformedUser.username}
        initialTab={modalInitialTab}
        topPosition={modalTopPosition}
      />

      {/* Games Modal */}
      <GamesModal
        isOpen={isGamesModalOpen}
        onClose={() => setIsGamesModalOpen(false)}
        userId={id!}
        userName={transformedUser.username}
        initialTab={gamesModalInitialTab}
        topPosition={modalTopPosition}
      />

      {/* Reviews Modal */}
      <ReviewsModal
        isOpen={isReviewsModalOpen}
        onClose={() => setIsReviewsModalOpen(false)}
        userId={id!}
        userName={transformedUser.username}
        topPosition={modalTopPosition}
      />
    </div>
  );
};
