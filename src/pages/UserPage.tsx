import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { ProfileInfo } from '../components/ProfileInfo';
import { ProfileData } from '../components/ProfileData';
import { FollowButton } from '../components/FollowButton';
import { UserPageContent } from '../components/UserPageContent';
import { getUserStats } from '../services/followService';
import { useAuth } from '../hooks/useAuth';

interface User {
  id: string;
  name: string;
  bio: string;
  picurl: string;
  created_at: string;
  location?: string;
  website?: string;
}

interface Review {
  id: number;
  user_id: number;
  game_id: number;
  rating: number;
  review?: string;
  post_date_time: string;
  hasText: boolean;
  author: string;
  authorAvatar: string;
}

interface Game {
  id: string;
  title: string;
  coverImage: string;
  releaseDate: string;
  genre: string;
  rating: number;
  description: string;
  developer: string;
  publisher: string;
}

const TABS = [
  { key: 'top5', label: 'Top 5' },
  { key: 'top50', label: 'Top 50' },
  { key: 'reviews', label: 'Reviews' },
  { key: 'activity', label: 'Activity' },
  { key: 'lists', label: 'Lists' },
];

export const UserPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser, updateProfile } = useAuth();
  
  const [user, setUser] = useState<User | null>(null);
  const [userReviews, setUserReviews] = useState<Review[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [stats, setStats] = useState({
    gamesReviewed: 0,
    thisYearReviews: 0,
    lists: 0,
    following: 0,
    followers: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('top5');
  const [reviewFilter, setReviewFilter] = useState('recent');

  // Check if this is the current user's profile
  const isCurrentUser = currentUser?.id === user?.provider_id || currentUser?.id === user?.id;

  useEffect(() => {
    if (id) {
      loadUserData(id);
    }
  }, [id]);

  const loadUserData = async (userId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Load user profile
      const { data: userData, error: userError } = await supabase
        .from('user')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError) {
        setError('User not found');
        return;
      }

      setUser(userData);

      // Load user's reviews
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('review')
        .select(`
          id,
          user_id,
          game_id,
          rating,
          review,
          post_date_time,
          user:user_id (name, picurl)
        `)
        .eq('user_id', userId);

      if (!reviewsError && reviewsData) {
        const transformedReviews = reviewsData.map(review => ({
          ...review,
          hasText: !!review.review,
          author: review.user?.name || 'Anonymous',
          authorAvatar: review.user?.picurl || 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150'
        }));
        setUserReviews(transformedReviews);
      }

      // Load games data (for display purposes)
      const { data: gamesData, error: gamesError } = await supabase
        .from('game')
        .select('*')
        .limit(50);

      if (!gamesError && gamesData) {
        const transformedGames = gamesData.map(game => ({
          id: game.id.toString(),
          title: game.name,
          coverImage: game.pic_url || 'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=300',
          releaseDate: game.year?.toString() || 'Unknown',
          genre: game.genres || 'Unknown',
          rating: Math.random() * 5 + 5, // Placeholder
          description: game.summary || 'No description available',
          developer: game.developer || 'Unknown',
          publisher: game.publisher || 'Unknown'
        }));
        setGames(transformedGames);
      }

      // Load user stats
      const { stats: userStats, error: statsError } = await getUserStats(userId);
      if (!statsError && userStats) {
        setStats(userStats);
      }

    } catch (error) {
      console.error('Error loading user data:', error);
      setError('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (updates: { username?: string; bio?: string; avatar?: string }) => {
    if (!user || !isCurrentUser) return;

    try {
      // Update in database
      const dbUpdates: any = {};
      if (updates.username) dbUpdates.name = updates.username;
      if (updates.bio) dbUpdates.bio = updates.bio;
      if (updates.avatar) dbUpdates.picurl = updates.avatar;

      const { error } = await supabase
        .from('user')
        .update(dbUpdates)
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      // Update local state
      setUser(prev => prev ? {
        ...prev,
        name: updates.username || prev.name,
        bio: updates.bio || prev.bio,
        picurl: updates.avatar || prev.picurl
      } : null);

      // Update auth profile if needed
      if (updates.username || updates.avatar) {
        await updateProfile({
          username: updates.username,
          avatar: updates.avatar
        });
      }

    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  const handleFollowChange = (newFollowingStatus: boolean) => {
    // Update follower count
    setStats(prev => ({
      ...prev,
      followers: prev.followers + (newFollowingStatus ? 1 : -1)
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-purple-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-400">Loading user profile...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">User Not Found</h2>
          <p className="text-gray-400 mb-6">{error || 'The user you are looking for does not exist.'}</p>
          <button 
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Transform user data for ProfileInfo component
  const transformedUser = {
    id: user.id.toString(),
    username: user.name || 'Anonymous',
    avatar: user.picurl || 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150',
    bio: user.bio || '',
    joinDate: new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
    location: user.location,
    website: user.website
  };

  const sortedReviews = [...userReviews].sort((a, b) => {
    switch (reviewFilter) {
      case 'highest':
        return b.rating - a.rating;
      case 'lowest':
        return a.rating - b.rating;
      case 'oldest':
        return new Date(a.post_date_time).getTime() - new Date(b.post_date_time).getTime();
      default:
        return new Date(b.post_date_time).getTime() - new Date(a.post_date_time).getTime();
    }
  });

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 mb-6">
          <div className="p-6">
            {/* Profile Info Section */}
            <div className="mb-6">
              <ProfileInfo
                user={transformedUser}
                isCurrentUser={isCurrentUser}
                onProfileUpdate={handleProfileUpdate}
                isDummy={false}
              />
            </div>

            {/* Follow Button - Only show for other users */}
            {!isCurrentUser && (
              <div className="mb-6 flex justify-center">
                <FollowButton
                  userId={user.id.toString()}
                  onFollowChange={handleFollowChange}
                  size="md"
                />
              </div>
            )}

            {/* Stats Section */}
            <div className="mb-6">
              <ProfileData stats={stats} />
            </div>

            {/* Navigation Tabs */}
            <div className="border-b border-gray-700">
              <div className="flex space-x-8 overflow-x-auto">
                {TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                      activeTab === tab.key
                        ? 'border-purple-500 text-purple-400'
                        : 'border-transparent text-gray-400 hover:text-white hover:border-gray-600'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <UserPageContent
            activeTab={activeTab}
            sortedReviews={sortedReviews}
            allGames={games}
            reviewFilter={reviewFilter}
            onReviewFilterChange={setReviewFilter}
            isDummy={false}
          />
        </div>
      </div>
    </div>
  );
};
