import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import { igdbService } from '../services/igdbApi';
import { ProfileInfo } from '../components/ProfileInfo';
import { ProfileDetails } from '../components/ProfileDetails';
import { ProfileData } from '../components/ProfileData';
import { FollowersFollowingModal } from '../components/FollowersFollowingModal';
import { GamesModal } from '../components/GamesModal';

// Lazy load UserSettingsModal to avoid initialization issues
const UserSettingsModal = lazy(() => import('../components/profile/UserSettingsModal').then(module => ({
  default: module.UserSettingsModal
})));

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

      // Fetch profile from user table using provider_id (auth.uid)
      const { data: profileData, error: profileError } = await supabase
        .from('user')
        .select('*')
        .eq('provider_id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') throw profileError;

      // Set database user ID if profile exists
      if (profileData?.id) {
        setCurrentDbUserId(profileData.id.toString());
      }

      // If no profile exists yet, use auth metadata
      const profile = profileData || {
        name: user.user_metadata?.username || user.user_metadata?.name || user.email?.split('@')[0] || 'User',
        username: user.user_metadata?.username || user.email?.split('@')[0] || 'user',
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

      // Compute allGames with proper cover image handling
      // First, set games with current data to show UI immediately
      const initialGames = (reviewsData || []).map(review => ({
        id: review.game_id,
        title: review.game?.name || 'Unknown Game',
        coverImage: review.game?.pic_url || '/default-cover.png',
        releaseDate: review.game?.release_date || '',
        genre: review.game?.genre || '',
        rating: review.rating, // This should now display correctly
        description: '',
        developer: '',
        publisher: ''
      }));
      
      setAllGames(initialGames);
      
      // Then fetch missing cover images in batches to avoid overwhelming IGDB API
      const gamesNeedingCovers = (reviewsData || []).filter(review => 
        !review.game?.pic_url && review.game?.igdb_id
      );
      
      if (gamesNeedingCovers.length > 0) {
        console.log(`Fetching cover images for ${gamesNeedingCovers.length} games...`);
        
        // Process in batches of 3 to avoid rate limiting
        const batchSize = 3;
        for (let i = 0; i < gamesNeedingCovers.length; i += batchSize) {
          const batch = gamesNeedingCovers.slice(i, i + batchSize);
          
          await Promise.all(batch.map(async (review) => {
            try {
              const igdbGame = await igdbService.getGameById(review.game.igdb_id.toString());
              if (igdbGame?.coverImage) {
                // Update database
                const { error: updateError } = await supabase
                  .from('game')
                  .update({ pic_url: igdbGame.coverImage })
                  .eq('id', review.game.id);
                  
                if (!updateError) {
                  // Update the local state with the new cover image
                  setAllGames(prevGames => 
                    prevGames.map(game => 
                      game.id === review.game_id 
                        ? { ...game, coverImage: igdbGame.coverImage }
                        : game
                    )
                  );
                  console.log(`Updated cover image for game ${review.game.name}`);
                }
              }
            } catch (error) {
              console.error(`Failed to fetch cover for game ${review.game?.name}:`, error);
            }
          }));
          
          // Small delay between batches to be respectful to the API
          if (i + batchSize < gamesNeedingCovers.length) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }

      // Fetch/compute stats
      const currentYear = new Date().getFullYear();
      const thisYearReviews = reviewsData?.filter(r => new Date(r.post_date_time).getFullYear() === currentYear).length || 0;
      const { count: listsCount } = await supabase.from('lists').select('id', { count: 'exact' }).eq('user_id', user.id);
      const { count: followingCount } = await supabase.from('user_follow').select('id', { count: 'exact' }).eq('follower_id', user.id);
      const { count: followersCount } = await supabase.from('user_follow').select('id', { count: 'exact' }).eq('following_id', user.id);

      setStats({
        films: reviewsData?.length || 0, // Games reviewed/played
        thisYear: thisYearReviews,
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

  // Handle profile save
  const handleSaveProfile = async (profileData: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Prepare update data - only include changed fields
      const updateData: any = {};
      
      // Map form fields to database columns
      if ('username' in profileData) {
        updateData.username = profileData.username;
        updateData.name = profileData.username; // Also update name field for backwards compatibility
      }
      
      if ('displayName' in profileData) {
        updateData.display_name = profileData.displayName;
      }
      
      if ('bio' in profileData) {
        updateData.bio = profileData.bio;
      }
      
      if ('location' in profileData) {
        updateData.location = profileData.location;
      }
      
      if ('website' in profileData) {
        updateData.website = profileData.website;
      }
      
      if ('platform' in profileData) {
        updateData.platform = profileData.platform;
      }

      // Handle avatar upload if provided
      if (profileData.avatar && profileData.avatar.startsWith('data:')) {
        try {
          // Convert data URL to blob
          const response = await fetch(profileData.avatar);
          const blob = await response.blob();
          
          // Validate image type and size
          if (!blob.type.startsWith('image/')) {
            throw new Error('File must be an image');
          }
          
          if (blob.size > 2 * 1024 * 1024) { // 2MB limit
            throw new Error('Image must be smaller than 2MB');
          }
          
          // Generate unique filename
          const fileExt = blob.type.split('/')[1] || 'jpg';
          const fileName = `${user.id}-${Date.now()}.${fileExt}`;
          
          console.log('Uploading avatar:', fileName, 'Size:', blob.size);
          
          // Upload to Supabase storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(fileName, blob, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            console.error('Avatar upload error:', uploadError);
            throw uploadError;
          } else {
            // Get public URL
            const { data: { publicUrl } } = supabase.storage
              .from('avatars')
              .getPublicUrl(fileName);
            
            console.log('Avatar uploaded successfully:', publicUrl);
            updateData.picurl = publicUrl;
            updateData.avatar_url = publicUrl;
          }
        } catch (avatarError) {
          console.error('Error processing avatar:', avatarError);
          // Throw error to let user know avatar upload failed
          throw new Error(`Avatar upload failed: ${avatarError.message}`);
        }
      }

      console.log('Updating profile with data:', updateData);

      // Don't proceed if no data to update
      if (Object.keys(updateData).length === 0) {
        console.log('No changes to save');
        return;
      }

      // Check if user profile exists first
      const { data: existingUser } = await supabase
        .from('user')
        .select('id')
        .eq('provider_id', user.id)
        .single();

      let result;
      if (existingUser) {
        // Update existing user profile
        result = await supabase
          .from('user')
          .update(updateData)
          .eq('provider_id', user.id);
      } else {
        // Create new user profile
        const newUserData = {
          provider_id: user.id,
          email: user.email,
          created_at: new Date().toISOString(),
          ...updateData
        };
        
        result = await supabase
          .from('user')
          .insert([newUserData]);
      }

      if (result.error) {
        console.error('Profile save error:', result.error);
        throw result.error;
      }

      console.log('Profile saved successfully');
      
      // Refresh profile data to reflect changes
      await fetchProfileData();
      
    } catch (error) {
      console.error('Error saving profile:', error);
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
          <button
            onClick={() => setActiveTab('lists')}
            className={`pb-2 ${activeTab === 'lists' ? 'border-b-2 border-purple-600 text-white' : 'text-gray-400'}`}
          >
            Lists
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
      <Suspense fallback={<div />}>
        <UserSettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          userId={currentUserId}
          onSave={handleSaveProfile}
        />
      </Suspense>

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
