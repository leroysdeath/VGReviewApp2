import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Gamepad2, 
  Star, 
  CheckSquare, 
  Clock, 
  Heart, 
  BarChart2, 
  Settings,
  Grid,
  List,
  Search,
  Filter,
  Calendar,
  Trophy,
  Users
} from 'lucide-react';
import { UserProfileCard, UserProfile } from './UserProfileCard';
import { UserActivityFeed, ActivityItem } from './UserActivityFeed';
import { UserStatsPanel, UserStats } from './UserStatsPanel';

interface Game {
  id: string;
  title: string;
  coverImage: string;
  releaseDate: string;
  genre: string;
  rating: number;
  userRating?: number;
  completed?: boolean;
}

interface UserDashboardProps {
  profile: UserProfile;
  stats: UserStats;
  recentActivity: ActivityItem[];
  recentGames: Game[];
  inProgressGames: Game[];
  completedGames: Game[];
  wishlistGames: Game[];
  isLoading?: boolean;
  onEditProfile?: () => void;
  className?: string;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  profile,
  stats,
  recentActivity,
  recentGames,
  inProgressGames,
  completedGames,
  wishlistGames,
  isLoading = false,
  onEditProfile,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'games' | 'reviews' | 'stats'>('overview');
  const [gamesFilter, setGamesFilter] = useState<'all' | 'in-progress' | 'completed' | 'wishlist'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter games based on current filter and search query
  const getFilteredGames = () => {
    let filteredGames: Game[] = [];
    
    switch (gamesFilter) {
      case 'in-progress':
        filteredGames = inProgressGames;
        break;
      case 'completed':
        filteredGames = completedGames;
        break;
      case 'wishlist':
        filteredGames = wishlistGames;
        break;
      default:
        filteredGames = [...recentGames];
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return filteredGames.filter(game => 
        game.title.toLowerCase().includes(query) || 
        game.genre.toLowerCase().includes(query)
      );
    }
    
    return filteredGames;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="bg-gray-800 rounded-xl border border-gray-700 h-64 animate-pulse"></div>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-gray-800 rounded-xl border border-gray-700 h-48 animate-pulse"></div>
          <div className="md:col-span-2 bg-gray-800 rounded-xl border border-gray-700 h-48 animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Profile Card */}
      <UserProfileCard 
        profile={profile} 
        onEditProfile={onEditProfile}
        isFollowing={false}
        onFollowToggle={() => console.log('Follow toggled')}
      />
      
      {/* Tabs */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="border-b border-gray-700">
          <div className="flex overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('games')}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'games'
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Games
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'reviews'
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Reviews
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'stats'
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Stats
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid md:grid-cols-3 gap-6">
              {/* Recent Activity */}
              <div className="md:col-span-2 space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-white">Recent Activity</h2>
                  <Link to="/activity" className="text-sm text-purple-400 hover:text-purple-300 transition-colors">
                    View All
                  </Link>
                </div>
                <UserActivityFeed activities={recentActivity.slice(0, 5)} />
              </div>

              {/* Stats Summary */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-white mb-4">Stats Summary</h2>
                
                <div className="bg-gray-750 rounded-lg p-4 space-y-4">
                  {/* Games Played */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
                        <Gamepad2 className="h-5 w-5 text-purple-400" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">Games Played</div>
                        <div className="text-xl font-bold text-white">{stats.totalGames}</div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-400">
                      {stats.gamesCompleted} completed
                    </div>
                  </div>
                  
                  {/* Average Rating */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-yellow-600/20 rounded-lg flex items-center justify-center">
                        <Star className="h-5 w-5 text-yellow-400" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">Average Rating</div>
                        <div className="text-xl font-bold text-white">{(stats.averageRating || 0).toFixed(1)}</div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-400">
                      {stats.reviewsWritten} reviews
                    </div>
                  </div>
                  
                  {/* Achievements */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-600/20 rounded-lg flex items-center justify-center">
                        <Trophy className="h-5 w-5 text-green-400" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">Achievements</div>
                        <div className="text-xl font-bold text-white">{stats.achievementsUnlocked}</div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-400">
                      Last week: +12
                    </div>
                  </div>
                  
                  {/* Social */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
                        <Users className="h-5 w-5 text-blue-400" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">Social</div>
                        <div className="text-xl font-bold text-white">{stats.followers}</div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-400">
                      Following: {stats.following}
                    </div>
                  </div>
                </div>
                
                <Link
                  to="/stats"
                  className="block text-center px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  View Detailed Stats
                </Link>
              </div>
            </div>
          )}

          {/* Games Tab */}
          {activeTab === 'games' && (
            <div>
              {/* Filters */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setGamesFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      gamesFilter === 'all'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    All Games
                  </button>
                  <button
                    onClick={() => setGamesFilter('in-progress')}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      gamesFilter === 'in-progress'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      <span>In Progress</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setGamesFilter('completed')}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      gamesFilter === 'completed'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <CheckSquare className="h-3.5 w-3.5" />
                      <span>Completed</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setGamesFilter('wishlist')}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      gamesFilter === 'wishlist'
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <Heart className="h-3.5 w-3.5" />
                      <span>Wishlist</span>
                    </div>
                  </button>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search games..."
                      className="w-full pl-9 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div className="flex bg-gray-700 rounded-lg p-1">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-1 rounded transition-colors ${
                        viewMode === 'grid'
                          ? 'bg-gray-600 text-white'
                          : 'text-gray-400 hover:text-white'
                      }`}
                      aria-label="Grid view"
                    >
                      <Grid className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-1 rounded transition-colors ${
                        viewMode === 'list'
                          ? 'bg-gray-600 text-white'
                          : 'text-gray-400 hover:text-white'
                      }`}
                      aria-label="List view"
                    >
                      <List className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Games Grid/List */}
              {getFilteredGames().length > 0 ? (
                <div className={viewMode === 'grid' 
                  ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4' 
                  : 'space-y-3'
                }>
                  {getFilteredGames().map(game => (
                    viewMode === 'grid' ? (
                      <Link
                        key={game.id}
                        to={`/game/${game.id}`}
                        className="group"
                      >
                        <div className="relative">
                          <img
                            src={game.coverImage}
                            alt={game.title}
                            className="w-full aspect-[3/4] object-cover rounded-lg group-hover:opacity-75 transition-opacity"
                          />
                          {game.userRating && (
                            <div className="absolute bottom-2 right-2 bg-black/70 rounded-lg px-2 py-1">
                              <div className="flex items-center gap-1">
                                <Star className="h-3 w-3 text-yellow-400" />
                                <span className="text-white text-xs font-bold">{game.userRating}</span>
                              </div>
                            </div>
                          )}
                          {game.completed && (
                            <div className="absolute top-2 right-2">
                              <CheckSquare className="h-5 w-5 text-green-400" />
                            </div>
                          )}
                        </div>
                        <div className="mt-2">
                          <h3 className="text-white font-medium text-sm group-hover:text-purple-400 transition-colors line-clamp-1">
                            {game.title}
                          </h3>
                          <p className="text-gray-400 text-xs">{game.genre}</p>
                        </div>
                      </Link>
                    ) : (
                      <Link
                        key={game.id}
                        to={`/game/${game.id}`}
                        className="flex items-center gap-3 p-3 bg-gray-750 rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        <img
                          src={game.coverImage}
                          alt={game.title}
                          className="w-12 h-16 object-cover rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-medium hover:text-purple-400 transition-colors">
                            {game.title}
                          </h3>
                          <div className="flex items-center gap-3 text-sm text-gray-400">
                            <span>{game.genre}</span>
                            <span>{new Date(game.releaseDate).getFullYear()}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {game.userRating && (
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 text-yellow-400" />
                              <span className="text-white font-medium">{game.userRating}</span>
                            </div>
                          )}
                          {game.completed && (
                            <CheckSquare className="h-4 w-4 text-green-400" />
                          )}
                        </div>
                      </Link>
                    )
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Gamepad2 className="h-8 w-8 text-gray-500" />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">No games found</h3>
                  <p className="text-gray-400">
                    {searchQuery 
                      ? `No games matching "${searchQuery}"` 
                      : `No games in this category yet`}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Reviews Tab */}
          {activeTab === 'reviews' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">Reviews</h2>
                <select
                  className="bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  defaultValue="recent"
                >
                  <option value="recent">Most Recent</option>
                  <option value="highest">Highest Rated</option>
                  <option value="lowest">Lowest Rated</option>
                </select>
              </div>
              
              {/* Placeholder for reviews */}
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="h-8 w-8 text-gray-500" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">No reviews yet</h3>
                <p className="text-gray-400">
                  Start rating and reviewing games to see them here
                </p>
                <Link
                  to="/search"
                  className="inline-block mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Find Games to Review
                </Link>
              </div>
            </div>
          )}

          {/* Stats Tab */}
          {activeTab === 'stats' && (
            <UserStatsPanel stats={stats} />
          )}
        </div>
      </div>
    </div>
  );
};
