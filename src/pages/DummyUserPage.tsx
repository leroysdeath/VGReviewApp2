import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit, Calendar, MessageCircle, Star, Trophy, Users, BookOpen, Settings, Heart, Clock, CheckCircle, Plus, Grid, List, Filter } from 'lucide-react';
import { StarRating } from '../components/StarRating';
import { mockGames, mockReviews } from '../data/mockData';

export const DummyUserPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'films' | 'diary' | 'reviews' | 'watchlist' | 'lists' | 'likes' | 'tags' | 'network' | 'stats'>('profile');
  const [reviewFilter, setReviewFilter] = useState('recent');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Current user data (dummy data for testing) - matches new Letterboxd-style structure
  const currentUser = {
    id: 'dummy-user',
    username: 'DummyTestUser',
    email: 'dummy@example.com',
    avatar: 'https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=150',
    bio: 'beCAUSE it\'s so much FUN, jAn. GET IT',
    joinDate: 'January 2024',
    location: 'Test City, TC',
    website: 'https://dummytestuser.com'
  };

  // User's gaming stats - matches Letterboxd structure
  const stats = {
    films: 1322,
    thisYear: 169,
    lists: 10,
    following: 39,
    followers: 9342
  };

  // User's favorite games (top 4 for the grid)
  const userFavoriteGames = mockGames.slice(0, 4);
  const userRecentGames = mockGames.slice(0, 8);
  const userReviews = mockReviews.slice(0, 6);

  const currentYear = new Date().getFullYear();

  const sortedReviews = [...userReviews].sort((a, b) => {
    switch (reviewFilter) {
      case 'highest':
        return b.rating - a.rating;
      case 'lowest':
        return a.rating - b.rating;
      case 'oldest':
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      default:
        return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
  });

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Dummy Test Banner */}
      <div className="bg-blue-600 text-white p-4 text-center">
        <h2 className="text-lg font-semibold">👤 Dummy Test User Profile - Letterboxd Style</h2>
        <p className="text-sm opacity-90">This is a comprehensive test profile showcasing the new Letterboxd-inspired design</p>
      </div>

      {/* Profile Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-start justify-between gap-6">
            {/* Profile Image */}
            <div className="relative flex-shrink-0">
              <img
                src={currentUser.avatar}
                alt={currentUser.username}
                className="w-20 h-20 rounded-full object-cover border-2 border-gray-600"
              />
            </div>
            
            {/* Profile Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-white">{currentUser.username}</h1>
                <span className="px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded">
                  PATRON
                </span>
                <button className="text-gray-400 hover:text-white">
                  <Settings className="h-4 w-4" />
                </button>
              </div>
              
              <p className="text-blue-400 text-sm mb-3">{currentUser.bio}</p>
              
              <div className="flex items-center gap-1 text-gray-400 text-sm mb-4">
                <span>🎮 platform 9¾</span>
                <span className="mx-2">🔗</span>
                <span>dummytestuser.card.co</span>
              </div>
            </div>

            {/* Stats Section - Moved to the right */}
            <div className="flex-shrink-0 flex flex-col gap-4">
              {/* Main Stats */}
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-xl font-bold text-white">{stats.films.toLocaleString()}</div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide">GAMES</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-white">{stats.thisYear}</div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide">THIS YEAR</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-white">{stats.lists}</div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide">LISTS</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-white">{stats.following}</div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide">FOLLOWING</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-white">{stats.followers.toLocaleString()}</div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide">FOLLOWERS</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { key: 'profile', label: 'Profile' },
              { key: 'films', label: 'Games' },
              { key: 'diary', label: 'Diary' },
              { key: 'reviews', label: 'Reviews' },
              { key: 'watchlist', label: 'Wishlist' },
              { key: 'lists', label: 'Lists' },
              { key: 'likes', label: 'Likes' },
              { key: 'tags', label: 'Tags' },
              { key: 'network', label: 'Network' },
              { key: 'stats', label: 'Stats' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.key
                    ? 'border-green-500 text-green-400'
                    : 'border-transparent text-gray-400 hover:text-white hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-8">
            {/* Favorite Games Section */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-4 uppercase tracking-wide">FAVORITE GAMES</h2>
              <div className="grid grid-cols-4 gap-4">
                {userFavoriteGames.map((game, index) => (
                  <Link
                    key={game.id}
                    to={`/game/${game.id}`}
                    className="group relative aspect-[3/4] rounded-lg overflow-hidden hover:scale-105 transition-transform"
                  >
                    <img
                      src={game.coverImage}
                      alt={game.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-white font-semibold text-sm mb-1">{game.title}</div>
                        <StarRating rating={game.rating} size="sm" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-4 uppercase tracking-wide">RECENT ACTIVITY</h2>
              <div className="grid grid-cols-8 gap-3">
                {userRecentGames.map((game) => (
                  <Link
                    key={game.id}
                    to={`/game/${game.id}`}
                    className="group relative aspect-[3/4] rounded overflow-hidden hover:scale-105 transition-transform"
                  >
                    <img
                      src={game.coverImage}
                      alt={game.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="text-white text-xs font-medium text-center px-1">
                        {game.title}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Recent Reviews */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-4 uppercase tracking-wide">RECENT REVIEWS</h2>
              <div className="space-y-4">
                {sortedReviews.slice(0, 3).map((review) => {
                  const game = mockGames.find(g => g.id === review.gameId);
                  return (
                    <div key={review.id} className="flex gap-4 p-4 bg-gray-800 rounded-lg">
                      <Link to={`/game/${game?.id}`} className="flex-shrink-0">
                        <img
                          src={game?.coverImage}
                          alt={game?.title}
                          className="w-16 h-20 object-cover rounded"
                        />
                      </Link>
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2">
                          <Link 
                            to={`/game/${game?.id}`}
                            className="font-semibold text-white hover:text-green-400 transition-colors"
                          >
                            {game?.title}
                          </Link>
                          <StarRating rating={review.rating} size="sm" />
                          <span className="text-sm text-gray-400">{review.date}</span>
                        </div>
                        <p className="text-gray-300 text-sm leading-relaxed">{review.text}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Upgrade Prompt (like Letterboxd) */}
            <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-lg p-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20"></div>
              <div className="relative">
                <h3 className="text-xl font-bold text-white mb-2">NEED AN UPGRADE?</h3>
                <p className="text-gray-300 mb-4">
                  Profile stats, filtering by favorite streaming services, watchlist alerts and no ads!
                </p>
                <button className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded font-medium transition-colors">
                  GET PRO
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Games Tab */}
        {activeTab === 'films' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-white">Games ({stats.films.toLocaleString()})</h2>
              <div className="flex items-center gap-4">
                <select
                  value={reviewFilter}
                  onChange={(e) => setReviewFilter(e.target.value)}
                  className="px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-green-500"
                >
                  <option value="recent">Recently Added</option>
                  <option value="highest">Highest Rated</option>
                  <option value="lowest">Lowest Rated</option>
                  <option value="oldest">Oldest</option>
                </select>
                <div className="flex items-center gap-1 bg-gray-800 rounded p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded transition-colors ${
                      viewMode === 'grid' 
                        ? 'bg-green-600 text-white' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Grid className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded transition-colors ${
                      viewMode === 'list' 
                        ? 'bg-green-600 text-white' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {viewMode === 'grid' ? (
              <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
                {mockGames.map((game) => (
                  <Link
                    key={game.id}
                    to={`/game/${game.id}`}
                    className="group relative aspect-[3/4] rounded overflow-hidden hover:scale-105 transition-transform"
                  >
                    <img
                      src={game.coverImage}
                      alt={game.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="text-white text-xs font-medium text-center px-1">
                        {game.title}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {mockGames.map((game) => (
                  <div key={game.id} className="flex items-center gap-4 p-3 bg-gray-800 rounded hover:bg-gray-750 transition-colors">
                    <Link to={`/game/${game.id}`} className="flex-shrink-0">
                      <img
                        src={game.coverImage}
                        alt={game.title}
                        className="w-12 h-16 object-cover rounded"
                      />
                    </Link>
                    <div className="flex-1">
                      <Link 
                        to={`/game/${game.id}`}
                        className="font-medium text-white hover:text-green-400 transition-colors"
                      >
                        {game.title}
                      </Link>
                      <div className="text-sm text-gray-400">{game.releaseDate}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StarRating rating={game.rating} size="sm" />
                      <span className="text-sm text-gray-400">{game.rating.toFixed(1)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Reviews Tab */}
        {activeTab === 'reviews' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-white">Reviews ({userReviews.length})</h2>
              <select
                value={reviewFilter}
                onChange={(e) => setReviewFilter(e.target.value)}
                className="px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-green-500"
              >
                <option value="recent">Most Recent</option>
                <option value="highest">Highest Rated</option>
                <option value="lowest">Lowest Rated</option>
                <option value="oldest">Oldest</option>
              </select>
            </div>
            <div className="space-y-6">
              {sortedReviews.map((review) => {
                const game = mockGames.find(g => g.id === review.gameId);
                return (
                  <div key={review.id} className="flex gap-4 p-6 bg-gray-800 rounded-lg">
                    <Link to={`/game/${game?.id}`} className="flex-shrink-0">
                      <img
                        src={game?.coverImage}
                        alt={game?.title}
                        className="w-20 h-28 object-cover rounded"
                      />
                    </Link>
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-3">
                        <Link 
                          to={`/game/${game?.id}`}
                          className="text-lg font-semibold text-white hover:text-green-400 transition-colors"
                        >
                          {game?.title}
                        </Link>
                        <StarRating rating={review.rating} />
                        <span className="text-sm text-gray-400">{review.date}</span>
                      </div>
                      <p className="text-gray-300 leading-relaxed">{review.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Other tabs placeholder content */}
        {activeTab === 'diary' && (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-white mb-4">Gaming Diary</h2>
            <p className="text-gray-400">Track your daily gaming activity and progress.</p>
          </div>
        )}

        {activeTab === 'watchlist' && (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-white mb-4">Wishlist</h2>
            <p className="text-gray-400">Games you want to play in the future.</p>
          </div>
        )}

        {activeTab === 'lists' && (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-white mb-4">Lists</h2>
            <p className="text-gray-400">Custom collections and curated game lists.</p>
          </div>
        )}

        {activeTab === 'likes' && (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-white mb-4">Likes</h2>
            <p className="text-gray-400">Reviews and content you've liked.</p>
          </div>
        )}

        {activeTab === 'tags' && (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-white mb-4">Tags</h2>
            <p className="text-gray-400">Organize games with custom tags.</p>
          </div>
        )}

        {activeTab === 'network' && (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-white mb-4">Network</h2>
            <p className="text-gray-400">Friends, followers, and gaming connections.</p>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-white mb-4">Statistics</h2>
            <p className="text-gray-400">Detailed analytics about your gaming habits.</p>
          </div>
        )}
      </div>
    </div>
  );
};