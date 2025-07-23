import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { 
  User, 
  Calendar, 
  MapPin, 
  Mail, 
  Settings, 
  Trophy, 
  Star, 
  Gamepad2,
  Clock,
  TrendingUp,
  Activity,
  Edit,
  Loader2
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface Game {
  id: string;
  title: string;
  coverImage: string;
  releaseDate: string;
  genre: string;
  userRating?: number;
}

interface ActivityItem {
  id: string;
  type: 'review' | 'rating' | 'completed' | 'wishlist' | 'started';
  game: string;
  timestamp: string;
  rating?: number;
  reviewSnippet?: string;
}

export const ProfilePage: React.FC = () => {
  const { user, loading, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'games' | 'reviews' | 'stats'>('overview');

  // Mock data - replace with actual API calls
  const [recentGames] = useState<Game[]>([
    { id: '1', title: 'Baldur\'s Gate 3', coverImage: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=300', releaseDate: '2023', genre: 'RPG', userRating: 10 },
    { id: '2', title: 'The Witcher 3', coverImage: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=300', releaseDate: '2015', genre: 'RPG', userRating: 9.5 },
    { id: '3', title: 'Elden Ring', coverImage: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=300', releaseDate: '2022', genre: 'Action RPG', userRating: 9 },
  ]);

  const [recentActivity] = useState<ActivityItem[]>([
    { id: '1', type: 'review', game: 'Baldur\'s Gate 3', timestamp: '2 hours ago', rating: 10, reviewSnippet: 'An absolute masterpiece of storytelling and gameplay...' },
    { id: '2', type: 'completed', game: 'The Witcher 3', timestamp: '1 day ago' },
    { id: '3', type: 'rating', game: 'Elden Ring', timestamp: '3 days ago', rating: 9 },
    { id: '4', type: 'started', game: 'Cyberpunk 2077', timestamp: '1 week ago' },
  ]);

  const stats = {
    gamesPlayed: 127,
    gamesCompleted: 89,
    averageRating: 7.8,
    totalPlaytime: '1,234 hours',
    reviewsWritten: 45,
    achievementsUnlocked: 1337
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-purple-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Safe user data with defaults
  const safeUser = {
    id: user.id || '',
    username: user.name || user.email?.split('@')[0] || 'User',
    email: user.email || '',
    avatar: user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
    bio: 'Gaming enthusiast | Achievement hunter | RPG lover',
    joinDate: new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
    location: 'United States',
    website: 'https://gamevault.com/user/' + user.id
  };

  const getActivityDescription = (activity: ActivityItem) => {
    switch (activity.type) {
      case 'review':
        return `Reviewed ${activity.game} - ${activity.rating}/10`;
      case 'rating':
        return `Rated ${activity.game} - ${activity.rating}/10`;
      case 'completed':
        return `Completed ${activity.game}`;
      case 'wishlist':
        return `Added ${activity.game} to wishlist`;
      case 'started':
        return `Started playing ${activity.game}`;
      default:
        return activity.game;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Profile Header */}
        <div className="bg-gray-800 rounded-lg p-8 mb-8">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <div className="relative">
              <img
                src={safeUser.avatar}
                alt={safeUser.username}
                className="w-32 h-32 rounded-full object-cover border-4 border-purple-500"
              />
              <button className="absolute bottom-2 right-2 p-2 bg-purple-600 rounded-full hover:bg-purple-700 transition-colors">
                <Edit className="h-4 w-4 text-white" />
              </button>
            </div>
            
            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">{safeUser.username}</h1>
                  <p className="text-gray-400 mb-4">{safeUser.bio}</p>
                </div>
                <Link
                  to="/settings"
                  className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  <Settings className="h-5 w-5" />
                  <span>Settings</span>
                </Link>
              </div>
              
              <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                <div className="flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  <span>{safeUser.email}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>Joined {safeUser.joinDate}</span>
                </div>
                {safeUser.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span>{safeUser.location}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-gray-800 rounded-lg mb-8">
          <nav className="flex border-b border-gray-700">
            {(['overview', 'games', 'reviews', 'stats'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-6 py-4 text-sm font-medium capitalize transition-colors ${
                  activeTab === tab
                    ? 'text-purple-400 border-b-2 border-purple-400'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="space-y-8">
          {activeTab === 'overview' && (
            <>
              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-800 rounded-lg p-6 text-center">
                  <Gamepad2 className="h-8 w-8 text-purple-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">{stats.gamesPlayed}</div>
                  <div className="text-sm text-gray-400">Games Played</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-6 text-center">
                  <Trophy className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">{stats.gamesCompleted}</div>
                  <div className="text-sm text-gray-400">Completed</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-6 text-center">
                  <Star className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">{stats.averageRating}</div>
                  <div className="text-sm text-gray-400">Avg Rating</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-6 text-center">
                  <Clock className="h-8 w-8 text-green-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">{stats.totalPlaytime}</div>
                  <div className="text-sm text-gray-400">Play Time</div>
                </div>
              </div>

              {/* Recent Games */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Gamepad2 className="h-6 w-6 text-purple-400" />
                  Recent Games
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {recentGames.map((game) => (
                    <Link
                      key={game.id}
                      to={`/game/${game.id}`}
                      className="group"
                    >
                      <div className="aspect-[3/4] rounded-lg overflow-hidden mb-2">
                        <img
                          src={game.coverImage}
                          alt={game.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <h3 className="text-sm text-white group-hover:text-purple-400 transition-colors truncate">
                        {game.title}
                      </h3>
                      {game.userRating && (
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="h-3 w-3 text-yellow-400 fill-current" />
                          <span className="text-xs text-gray-400">{game.userRating}</span>
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Activity className="h-6 w-6 text-purple-400" />
                  Recent Activity
                </h2>
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-4 pb-4 border-b border-gray-700 last:border-0">
                      <div className="flex-shrink-0 w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                        {activity.type === 'review' && <Star className="h-5 w-5 text-yellow-400" />}
                        {activity.type === 'rating' && <Star className="h-5 w-5 text-blue-400" />}
                        {activity.type === 'completed' && <Trophy className="h-5 w-5 text-green-400" />}
                        {activity.type === 'wishlist' && <TrendingUp className="h-5 w-5 text-purple-400" />}
                        {activity.type === 'started' && <Gamepad2 className="h-5 w-5 text-gray-400" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-white">{getActivityDescription(activity)}</p>
                        {activity.reviewSnippet && (
                          <p className="text-gray-400 text-sm mt-1">{activity.reviewSnippet}</p>
                        )}
                        <p className="text-gray-500 text-xs mt-1">{activity.timestamp}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === 'games' && (
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-4">Games Library</h2>
              <p className="text-gray-400">Your complete games collection will be displayed here.</p>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-4">Reviews</h2>
              <p className="text-gray-400">Your game reviews will be displayed here.</p>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-4">Statistics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Gaming Overview</h3>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-gray-400">Total Games</dt>
                      <dd className="text-white font-medium">{stats.gamesPlayed}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-400">Completed</dt>
                      <dd className="text-white font-medium">{stats.gamesCompleted}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-400">Completion Rate</dt>
                      <dd className="text-white font-medium">
                        {Math.round((stats.gamesCompleted / stats.gamesPlayed) * 100)}%
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-400">Reviews Written</dt>
                      <dd className="text-white font-medium">{stats.reviewsWritten}</dd>
                    </div>
                  </dl>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Achievements</h3>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-gray-400">Total Unlocked</dt>
                      <dd className="text-white font-medium">{stats.achievementsUnlocked}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-400">Average Rating</dt>
                      <dd className="text-white font-medium">{stats.averageRating}/10</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-400">Total Playtime</dt>
                      <dd className="text-white font-medium">{stats.totalPlaytime}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
