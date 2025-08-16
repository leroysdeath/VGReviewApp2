import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import { getUserProfile, updateUserProfile, getCurrentAuthUser, ProfileUpdateData } from '../services/profileService';
import { ProfileInfo } from '../components/ProfileInfo';
import { ProfileDetails } from '../components/ProfileDetails';
import { ProfileData } from '../components/ProfileData';
import { FollowersFollowingModal } from '../components/FollowersFollowingModal';
import { GamesModal } from '../components/GamesModal';

// Lazy load UserSettingsModal to avoid initialization issues
const UserSettingsModal = lazy(() => import('../components/profile/UserSettingsModal'));

const ProfilePage = () => {
  const [userProfile, setUserProfile] = useState(null);
  const [allGames, setAllGames] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({ films: 0, thisYear: 0, lists: 0, following: 0, followers: 0 });
  const [activeTab, setActiveTab] = useState('top5');
  const [reviewFilter, setReviewFilter] = useState('recent');
  const [sortedReviews, setSortedReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentDbUserId, setCurrentDbUserId] = useState<string>('');
  const [isFollowersModalOpen, setIsFollowersModalOpen] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState<'followers' | 'following'>('followers');
  const [isGamesModalOpen, setIsGamesModalOpen] = useState(false);
  const [gamesModalInitialTab, setGamesModalInitialTab] = useState<'all' | 'started' | 'finished'>('all');
  const navigate = useNavigate();

  const fetchProfileData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }
      
      setCurrentUserId(user.id);

      // Fetch profile from user table using profileService
      const profileResponse = await getUserProfile(user.id);
      const profileData = profileResponse.success ? profileResponse.data : null;

      // Set database user ID if profile exists
      if (profileData?.id) {
        setCurrentDbUserId(profileData.id.toString());
      }

      // If no profile exists yet, use auth metadata
      const profile = profileData || {
        name: user.user_metadata?.username || user.user_metadata?.name || user.email?.split('@')[0] || 'User',
        username: user.user_metadata?.username || user.email?.split('@')[0] || 'user',
        display_name: user.user_metadata?.name || '',
        bio: '',
        picurl: user.user_metadata?.avatar_url || null,
        created_at: new Date().toISOString(),
        location: '',
        website: '',
        platform: ''
      };  
      
      setUserProfile({
        id: user.id,
        username: profile.username || profile.name,
        displayName: profile.display_name || '',
        avatar: profile.picurl || null,
        bio: profile.bio || '',
        joinDate: new Date(profile.created_at).toLocaleString('default', { month: 'long', year: 'numeric' }),
        location: profile.location || '',
        website: profile.website || '',
        platform: profile.platform || ''
      });

      // Use database user.id (not auth.uid) for reviews
      const { data: reviewsData } = await supabase
        .from('rating') // NOT 'reviews'
        .select(`
          *,
          game:game_id (id, name, pic_url, genre, release_date, igdb_id)
        `)
        .eq('user_id', profileData?.id) // Use database user ID
        .order('post_date_time', { ascending: false });
      
      setReviews(reviewsData || []);

      // Compute allGames from Supabase data only
      const allGamesData = (reviewsData || []).map(review => ({
        id: review.game_id,
        title: review.game?.name || 'Unknown Game',
        coverImage: review.game?.pic_url || '/default-cover.png',
        releaseDate: review.game?.release_date || '',
        genre: review.game?.genre || '',
        rating: review.rating,
        description: '',
        developer: '',
        publisher: ''
      }));
      
      setAllGames(allGamesData);

      // Fetch/compute stats
      const currentYear = new Date().getFullYear();
      // Query games marked as started from game_progress table
      const { count: startedGamesCount } = await supabase
        .from('game_progress')
        .select('game_id', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('started', true);
      
      const { count: listsCount } = await supabase.from('lists').select('id', { count: 'exact' }).eq('user_id', user.id);
      const { count: followingCount } = await supabase.from('user_follow').select('id', { count: 'exact' }).eq('follower_id', user.id);
      const { count: followersCount } = await supabase.from('user_follow').select('id', { count: 'exact' }).eq('following_id', user.id);

      setStats({
        films: startedGamesCount || 0, // Games marked as started
        thisYear: reviewsData?.length || 0, // Total reviews count
        lists: listsCount || 0,
        following: followingCount || 0,
        followers: followersCount || 0
      });

    } catch (error) {
      console.error('Error fetching profile data:', error);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  // Handle profile save using profileService
  const handleSaveProfile = async (profileData: ProfileUpdateData) => {
    try {
      console.log('🟢 ProfilePage - handleSaveProfile called with service layer');
      console.log('📥 ProfileData received from form:', {
        ...profileData,
        avatar: profileData.avatar ? `[${profileData.avatar.length} chars]` : undefined
      });

      // Get current authenticated user
      const authResult = await getCurrentAuthUser();
      if (!authResult.success || !authResult.data) {
        throw new Error(authResult.error || 'User not authenticated');
      }

      const { id: providerId } = authResult.data;
      console.log('👤 Authenticated user provider_id:', providerId);

      // Use profileService to update the profile
      const updateResult = await updateUserProfile(providerId, profileData);
      
      if (!updateResult.success) {
        throw new Error(updateResult.error || 'Profile update failed');
      }

      console.log('✅ Profile updated successfully via service layer');
      console.log('✅ Updated profile data:', updateResult.data);
      
      // Refresh profile data to reflect changes
      await fetchProfileData();
      
    } catch (error) {
      console.error('🔴 Error in handleSaveProfile:', error);
      throw error;
    }
  };

  // Fetch profile data on component mount
  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  // Sort reviews based on filter
  useEffect(() => {
    const sorted = [...reviews];
    if (reviewFilter === 'recent') {
      sorted.sort((a, b) => new Date(b.post_date_time).getTime() - new Date(a.post_date_time).getTime());
    } else if (reviewFilter === 'rating') {
      sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }
    setSortedReviews(sorted);
  }, [reviews, reviewFilter]);

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

  if (loading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading...</div>;

  return (
    <div className="bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row justify-between gap-6 mb-8">
          <ProfileInfo
            user={userProfile}
            isDummy={false}
            onEditClick={handleEditClick}
            isCurrentUser={true}
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
            userId={currentUserId}
            onSave={handleSaveProfile}
          />
        </Suspense>
      )}

      {/* Followers/Following Modal */}
      {currentDbUserId && userProfile && (
        <FollowersFollowingModal
          isOpen={isFollowersModalOpen}
          onClose={() => setIsFollowersModalOpen(false)}
          userId={currentDbUserId}
          userName={userProfile.username}
          initialTab={modalInitialTab}
        />
      )}

      {/* Games Modal */}
      {currentDbUserId && userProfile && (
        <GamesModal
          isOpen={isGamesModalOpen}
          onClose={() => setIsGamesModalOpen(false)}
          userId={currentDbUserId}
          userName={userProfile.username}
          initialTab={gamesModalInitialTab}
        />
      )}
    </div>
  );
};

export default ProfilePage;
