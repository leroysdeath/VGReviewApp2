import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useAuth } from '../hooks/useAuth';
import { ProfileInfo } from '../components/ProfileInfo';
import { ProfileDetails } from '../components/ProfileDetails';
import { ProfileData } from '../components/ProfileData';
import { FollowersFollowingModal } from '../components/FollowersFollowingModal';
import { GamesModal } from '../components/GamesModal';
import { updateUserProfile, ProfileUpdateData } from '../services/profileService';

// Lazy load UserSettingsModal to avoid initialization issues
const UserSettingsModal = lazy(() => import('../components/profile/UserSettingsModal'));

export const UserPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user: authUser, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<'top5' | 'top10' | 'reviews' | 'activity'>('top5');
  const [reviewFilter, setReviewFilter] = useState('recent');
  const [user, setUser] = useState<any>(null);
  const [userReviews, setUserReviews] = useState<any[]>([]);
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  
  // Modal states
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isFollowersModalOpen, setIsFollowersModalOpen] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState<'followers' | 'following'>('followers');
  const [isGamesModalOpen, setIsGamesModalOpen] = useState(false);
  const [gamesModalInitialTab, setGamesModalInitialTab] = useState<'all' | 'started' | 'finished'>('all');

  // Handle profile save using profileService
  const handleSaveProfile = useCallback(async (profileData: ProfileUpdateData) => {
    try {
      if (!authUser?.id) {
        throw new Error('User not authenticated');
      }

      const updateResult = await updateUserProfile(authUser.id, profileData);
      
      if (!updateResult.success) {
        throw new Error(updateResult.error || 'Profile update failed');
      }

      // Refresh the user data after successful update
      await fetchUserData();
      
    } catch (error) {
      console.error('Error saving profile:', error);
      throw error;
    }
  }, [authUser?.id]);

  // Modal handlers
  const handleEditClick = () => {
    setShowSettingsModal(true);
  };

  const handleFollowersClick = () => {
    setModalInitialTab('followers');
    setIsFollowersModalOpen(true);
  };

  const handleFollowingClick = () => {
    setModalInitialTab('following');
    setIsFollowersModalOpen(true);
  };

  const handleGamesClick = () => {
    setGamesModalInitialTab('all');
    setIsGamesModalOpen(true);
  };

  const fetchUserData = useCallback(async () => {
    if (!id) {
      return;
    }
    
    // Parse ID to integer for database queries
    const numericId = parseInt(id);
    
    if (isNaN(numericId)) {
      setError('Invalid user ID');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      
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
      try {
        if (isAuthenticated && authUser?.id) {
          const { data: currentUserData, error: currentUserError } = await supabase
            .from('user')
            .select('id')
            .eq('provider_id', authUser.id)
            .single();
          
          if (!currentUserError && currentUserData) {
            setIsOwnProfile(currentUserData.id === numericId);
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
      
      // Fetch user reviews (only those with valid ratings)
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('rating')
        .select(`
          *,
          game:game_id(*)
        `)
        .eq('user_id', numericId)
        .not('rating', 'is', null);
        
      if (reviewsError) throw reviewsError;
      
      // Filter out any reviews with invalid ratings as an extra safety measure
      const validReviewsData = reviewsData?.filter(review => 
        review.rating != null && 
        !isNaN(review.rating) && 
        typeof review.rating === 'number'
      ) || [];
      
      // Query games marked as started from game_progress table
      const { data: startedGamesData, error: startedGamesError } = await supabase
        .from('game_progress')
        .select('game_id')
        .eq('user_id', numericId)
        .eq('started', true);
        
      if (startedGamesError) throw startedGamesError;
      
      const startedGamesCount = startedGamesData?.length || 0;
      
      // Get game IDs from valid reviews
      const gameIds = validReviewsData.map(review => review.game_id);
      
      // Fetch games data (only if there are game IDs)
      let gamesData = [];
      if (gameIds.length > 0) {
        const { data: fetchedGames, error: gamesError } = await supabase
          .from('game')
          .select('*')
          .in('id', gameIds);
          
        if (gamesError) throw gamesError;
        gamesData = fetchedGames || [];
      }
      
      // Get follower/following counts from computed columns (much faster - no COUNT queries)
      const followerCount = userData.follower_count || 0;
      const followingCount = userData.following_count || 0;
      
      // Store the counts for use in stats calculation
      userData._followerCount = followerCount || 0;
      userData._followingCount = followingCount || 0;
      userData._startedGamesCount = startedGamesCount;
      
      setUser(userData);
      setUserReviews(validReviewsData);
      setGames(gamesData);
    } catch (err) {
      console.error('Error fetching user data:', err);
      setError('Failed to load user data');
    } finally {
      setLoading(false);
    }
  }, [id, isAuthenticated, authUser]);
  
  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  // Sort reviews based on filter
  const sortedReviews = React.useMemo(() => {
    const sorted = [...userReviews];
    if (reviewFilter === 'recent') {
      sorted.sort((a, b) => new Date(b.post_date_time).getTime() - new Date(a.post_date_time).getTime());
    } else if (reviewFilter === 'rating') {
      sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }
    return sorted;
  }, [userReviews, reviewFilter]);

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
    thisYear: userReviews.length, // Total reviews count
    lists: 0, // To be implemented with real data when lists feature is added
    following: user._followingCount || 0, // Real following count from database
    followers: user._followerCount || 0 // Real follower count from database
  };

  // Transform games to match expected format for ProfileData
  const allGames = games.map(game => ({
    id: game.id.toString(),
    title: game.name || 'Unknown Game',
    coverImage: game.pic_url || '/default-cover.png',
    releaseDate: game.release_date || '',
    genre: game.genre || '',
    rating: 0, // This will be populated by ProfileData component
    description: '',
    developer: '',
    publisher: ''
  }));

  return (
    <div className="bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row justify-between gap-6 mb-8">
          <ProfileInfo
            user={transformedUser}
            isDummy={false}
            onEditClick={handleEditClick}
            isCurrentUser={isOwnProfile}
          />
          <ProfileDetails 
            stats={stats} 
            onFollowersClick={handleFollowersClick}
            onFollowingClick={handleFollowingClick}
            onGamesClick={handleGamesClick}
          />
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
            onClick={() => setActiveTab('reviews')}
            className={`pb-2 ${activeTab === 'reviews' ? 'border-b-2 border-purple-600 text-white' : 'text-gray-400'}`}
          >
            Reviews
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`pb-2 ${activeTab === 'activity' ? 'border-b-2 border-purple-600 text-white' : 'text-gray-400'}`}
          >
            Activity
          </button>
        </div>

        {/* Profile Data */}
        <ProfileData
          activeTab={activeTab}
          allGames={allGames}
          sortedReviews={sortedReviews}
          reviewFilter={reviewFilter}
          onReviewFilterChange={setReviewFilter}
          isDummy={false}
          userId={id!}
          isOwnProfile={isOwnProfile}
        />
      </div>

      {/* User Settings Modal */}
      {showSettingsModal && (
        <Suspense fallback={
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-900 p-8 rounded-lg">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
              <p className="text-white mt-4">Loading settings...</p>
            </div>
          </div>
        }>
          <UserSettingsModal
            isOpen={showSettingsModal}
            onClose={() => setShowSettingsModal(false)}
            userId={authUser?.id || ''}
            userData={{
              username: transformedUser.username,
              displayName: user.display_name || '',
              email: user.email || authUser?.email || '',
              bio: transformedUser.bio,
              location: transformedUser.location || '',
              website: transformedUser.website || '',
              platform: transformedUser.platform || '',
              avatar: transformedUser.avatar
            }}
            onSave={handleSaveProfile}
          />
        </Suspense>
      )}

      {/* Followers/Following Modal */}
      <FollowersFollowingModal
        isOpen={isFollowersModalOpen}
        onClose={() => setIsFollowersModalOpen(false)}
        userId={id!}
        userName={transformedUser.username}
        initialTab={modalInitialTab}
      />

      {/* Games Modal */}
      <GamesModal
        isOpen={isGamesModalOpen}
        onClose={() => setIsGamesModalOpen(false)}
        userId={id!}
        userName={transformedUser.username}
        initialTab={gamesModalInitialTab}
      />
    </div>
  );
};
