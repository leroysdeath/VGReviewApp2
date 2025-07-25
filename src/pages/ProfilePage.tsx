import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import { ProfileInfo } from '../components/ProfileInfo';
import { ProfileDetails } from '../components/ProfileDetails';
import { ProfileData } from '../components/ProfileData';

const ProfilePage = () => {
  const [userProfile, setUserProfile] = useState(null);
  const [allGames, setAllGames] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({ films: 0, thisYear: 0, lists: 0, following: 0, followers: 0 });
  const [activeTab, setActiveTab] = useState('top5');
  const [reviewFilter, setReviewFilter] = useState('recent');
  const [sortedReviews, setSortedReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfileData();
  }, []);

  useEffect(() => {
    // Sort reviews based on filter
    let sorted = [...reviews];
    switch (reviewFilter) {
      case 'highest':
        sorted.sort((a, b) => b.rating - a.rating);
        break;
      case 'lowest':
        sorted.sort((a, b) => a.rating - b.rating);
        break;
      case 'oldest':
        sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'recent':
      default:
        sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
    }
    setSortedReviews(sorted.map(review => ({
      id: review.id,
      userId: review.user_id,
      gameId: review.game_id,
      rating: review.rating,
      text: review.text,
      date: new Date(review.created_at).toLocaleDateString(),
      hasText: !!review.text,
      author: userProfile?.username || '',
      authorAvatar: userProfile?.avatar_url || '/default-avatar.png'
    })));
  }, [reviews, reviewFilter, userProfile]);

  async function fetchProfileData() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      // Fetch profile from user table
const { data: profileData, error: profileError } = await supabase
  .from('user')
  .select('*')
  .eq('provider_id', user.id)
  .single();

if (profileError && profileError.code !== 'PGRST116') throw profileError;

// If no profile exists yet, use auth metadata
const profile = profileData || {
  name: user.user_metadata?.username || user.user_metadata?.name || user.email?.split('@')[0] || 'User',
  username: user.user_metadata?.username || user.email?.split('@')[0] || 'user',
  bio: '',
  picurl: user.user_metadata?.avatar_url || null,
  created_at: new Date().toISOString(),
  location: '',
  website: ''
};  
      setUserProfile({
        id: user.id,
        username: profile.name || profile.username,
        avatar: profile.picurl || '/default-avatar.png',
        bio: profile.bio || 'No bio yet.',
        joinDate: new Date(profile.created_at).toLocaleString('default', { month: 'long', year: 'numeric' }),
        location: profile.location || '',
        website: profile.website || ''
      });

      // Fetch reviews (adjust columns if needed)
      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('id, user_id, game_id, game_name, cover_image, rating, text, created_at')
        .eq('user_id', user.id);
      setReviews(reviewsData || []);

      // Compute allGames
      const games = reviewsData?.map(review => ({
        id: review.game_id,
        title: review.game_name,
        coverImage: review.cover_image || '/default-cover.png',
        releaseDate: '', // Add IGDB fetch if needed
        genre: '', // Add IGDB fetch if needed
        rating: review.rating,
        description: '',
        developer: '',
        publisher: ''
      })) || [];
      setAllGames(games);

      // Fetch/compute stats
      const currentYear = new Date().getFullYear();
      const thisYearReviews = reviewsData?.filter(r => new Date(r.created_at).getFullYear() === currentYear).length || 0;
      const { count: listsCount } = await supabase.from('lists').select('id', { count: 'exact' }).eq('user_id', user.id);
      const { count: followingCount } = await supabase.from('followers').select('id', { count: 'exact' }).eq('follower_id', user.id);
      const { count: followersCount } = await supabase.from('followers').select('id', { count: 'exact' }).eq('followed_id', user.id);

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
  }

  const handleEditClick = () => {
    navigate('/settings');
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
          />
          <ProfileDetails stats={stats} />
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
    </div>
  );
};

export default ProfilePage;
