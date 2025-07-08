import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit, Calendar, MessageCircle, Star, Trophy, Users, BookOpen, Settings, Heart, Clock, CheckCircle, Plus } from 'lucide-react';
import { StarRating } from '../components/StarRating';
import { mockGames, mockReviews } from '../data/mockData';

export const DummyUserPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'reviews' | 'lists' | 'stats'>('overview');
  const [reviewFilter, setReviewFilter] = useState('recent');

  // Current user data (dummy data for testing) - matches ProfilePage structure
  const currentUser = {
    id: 'dummy-user',
    username: 'DummyTestUser',
    email: 'dummy@example.com',
    avatar: 'https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=150',
    bio: 'This is a comprehensive dummy user profile for testing purposes. Passionate gamer exploring virtual worlds and sharing honest reviews. Love RPGs, indie games, and anything with great storytelling.',
    joinDate: 'January 2024',
    location: 'Test City, TC',
    website: 'https://dummytestuser.com'
  };

  // User's gaming stats - matches ProfilePage structure
  const stats = {
    totalGames: 247,
    completedGames: 156,
    currentlyPlaying: 8,
    wishlistCount: 42,
    reviewsWritten: 89,
    averageRating: 7.8,
    hoursPlayed: 1247,
    achievementsUnlocked: 1834,
    following: 67,
    followers: 234,
    games: 247,
    thisYear: 45,
    lists: 12
  };

  // User's recent activity - matches ProfilePage structure
  const recentActivity = [
    { type: 'review', game: 'The Legend of Zelda: Breath of the Wild', rating: 9.5, date: '2 days ago' },
    { type: 'completed', game: 'Cyberpunk 2077', date: '1 week ago' },
    { type: 'wishlist', game: 'Elden Ring DLC', date: '1 week ago' },
    { type: 'started', game: 'Baldur\'s Gate 3', date: '2 weeks ago' },
    { type: 'review', game: 'Spider-Man 2', rating: 9.0, date: '3 weeks ago' },
    { type: 'completed', game: 'God of War Ragnarök', date: '3 weeks ago' },
    { type: 'wishlist', game: 'Final Fantasy XVI', date: '1 month ago' }
  ];

  // User's top games - matches ProfilePage structure
  const topGames = mockGames.slice(0, 5);
  const userReviews = mockReviews.slice(0, 6);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'review': return <MessageCircle className="h-4 w-4 text-purple-400" />;
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'wishlist': return <Heart className="h-4 w-4 text-red-400" />;
      case 'started': return <Clock className="h-4 w-4 text-blue-400" />;
      default: return <Star className="h-4 w-4 text-yellow-400" />;
    }
  };

  const getActivityText = (activity: any) => {
    switch (activity.type) {
      case 'review':
        return `Reviewed ${activity.game} - ${activity.rating}/10`;
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
        {/* Dummy Test Banner */}
        <div className="bg-blue-600 text-white p-4 rounded-lg mb-6 text-center">
          <h2 className="text-lg font-semibold">👤 Dummy Test User Profile</h2>
          <p className="text-sm opacity-90">This is a comprehensive test profile showcasing what a fully-featured user profile would look like</p>
        </div>

        {/* Profile Header - Exact structure from ProfilePage */}
        <div className="bg-gray-800 rounded-lg p-8 mb-8">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <div className="relative">
              <img
                src={currentUser.avatar}
                alt={currentUser.username}
                className="w-32 h-32 rounded-full object-cover border-4 border-purple-500"
              />
              <button className="absolute bottom-2 right-2 p-2 bg-purple-600 rounded-full hover:bg-purple-700 transition-colors">
                <Edit className="h-4 w-4 text-white" />
              </button>
            </div>
            
            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">{currentUser.username}</h1>
                  <p className="text-gray-400 mb-4">{currentUser.bio}</p>
                </div>
                <Link
                  to="/settings"
                  className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  Edit Profile
                </Link>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Joined {currentUser.joinDate}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>{stats.followers} followers</span>
                </div>
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4" />
                  <span>{stats.totalGames} games</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  <span>{stats.reviewsWritten} reviews</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs - Exact structure from ProfilePage */}
        <div className="bg-gray-800 rounded-lg overflow-hidden mb-8">
          <div className="border-b border-gray-700">
            <nav className="flex">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'overview'
                    ? 'border-purple-500 text-purple-400'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('reviews')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'reviews'
                    ? 'border-purple-500 text-purple-400'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                Reviews ({stats.reviewsWritten})
              </button>
              <button
                onClick={() => setActiveTab('lists')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'lists'
                    ? 'border-purple-500 text-purple-400'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                Lists
              </button>
              <button
                onClick={() => setActiveTab('stats')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'stats'
                    ? 'border-purple-500 text-purple-400'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                Statistics
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Overview Tab - Exact structure from ProfilePage */}
            {activeTab === 'overview' && (
              <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                  {/* Top 5 Games */}
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-4">My Top 5 Games</h3>
                    <div className="space-y-3">
                      {topGames.map((game, index) => (
                        <div key={game.id} className="flex items-center gap-4 p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors">
                          <div className="text-2xl font-bold text-purple-400 w-8">
                            {index + 1}
                          </div>
                          <img
                            src={game.coverImage}
                            alt={game.title}
                            className="w-16 h-16 object-cover rounded"
                          />
                          <div className="flex-1">
                            <h4 className="font-semibold text-white">{game.title}</h4>
                            <p className="text-gray-400 text-sm">{game.genre}</p>
                          </div>
                          <StarRating rating={game.rating} />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recent Reviews */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-semibold text-white">Recent Reviews</h3>
                      <Link to="/reviews" className="text-purple-400 hover:text-purple-300 text-sm">
                        View All
                      </Link>
                    </div>
                    <div className="space-y-4">
                      {userReviews.slice(0, 3).map((review) => {
                        const game = mockGames.find(g => g.id === review.gameId);
                        return (
                          <div key={review.id} className="flex gap-4 p-4 bg-gray-700 rounded-lg">
                            <img
                              src={game?.coverImage}
                              alt={game?.title}
                              className="w-16 h-16 object-cover rounded"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-4 mb-2">
                                <h4 className="font-semibold text-white">{game?.title}</h4>
                                <StarRating rating={review.rating} />
                                <span className="text-sm text-gray-400">{review.date}</span>
                              </div>
                              <p className="text-gray-300 text-sm line-clamp-2">{review.text}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Sidebar - Exact structure from ProfilePage */}
                <div className="space-y-6">
                  {/* Quick Stats */}
                  <div className="bg-gray-700 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Quick Stats</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Games Completed</span>
                        <span className="text-white font-semibold">{stats.completedGames}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Currently Playing</span>
                        <span className="text-white font-semibold">{stats.currentlyPlaying}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Wishlist</span>
                        <span className="text-white font-semibold">{stats.wishlistCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Avg. Rating</span>
                        <span className="text-white font-semibold">{stats.averageRating}/10</span>
                      </div>
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div className="bg-gray-700 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
                    <div className="space-y-3">
                      {recentActivity.map((activity, index) => (
                        <div key={index} className="flex items-start gap-3">
                          {getActivityIcon(activity.type)}
                          <div className="flex-1">
                            <p className="text-gray-300 text-sm">{getActivityText(activity)}</p>
                            <p className="text-gray-500 text-xs">{activity.date}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Reviews Tab - Exact structure from ProfilePage */}
            {activeTab === 'reviews' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold text-white">My Reviews ({stats.reviewsWritten})</h3>
                  <select
                    value={reviewFilter}
                    onChange={(e) => setReviewFilter(e.target.value)}
                    className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="recent">Most Recent</option>
                    <option value="highest">Highest Rated</option>
                    <option value="lowest">Lowest Rated</option>
                    <option value="oldest">Oldest</option>
                  </select>
                </div>
                <div className="grid gap-6">
                  {userReviews.map((review) => {
                    const game = mockGames.find(g => g.id === review.gameId);
                    return (
                      <div key={review.id} className="flex gap-4 p-6 bg-gray-700 rounded-lg">
                        <img
                          src={game?.coverImage}
                          alt={game?.title}
                          className="w-20 h-20 object-cover rounded"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-3">
                            <h4 className="text-lg font-semibold text-white">{game?.title}</h4>
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

            {/* Lists Tab - Exact structure from ProfilePage */}
            {activeTab === 'lists' && (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-gray-700 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Wishlist</h3>
                    <span className="text-purple-400 font-semibold">{stats.wishlistCount}</span>
                  </div>
                  <p className="text-gray-400 text-sm mb-4">Games I want to play</p>
                  <Link to="/wishlist" className="text-purple-400 hover:text-purple-300 text-sm">
                    View List →
                  </Link>
                </div>
                
                <div className="bg-gray-700 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Currently Playing</h3>
                    <span className="text-blue-400 font-semibold">{stats.currentlyPlaying}</span>
                  </div>
                  <p className="text-gray-400 text-sm mb-4">Games I'm actively playing</p>
                  <Link to="/playing" className="text-purple-400 hover:text-purple-300 text-sm">
                    View List →
                  </Link>
                </div>
                
                <div className="bg-gray-700 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Completed</h3>
                    <span className="text-green-400 font-semibold">{stats.completedGames}</span>
                  </div>
                  <p className="text-gray-400 text-sm mb-4">Games I've finished</p>
                  <Link to="/completed" className="text-purple-400 hover:text-purple-300 text-sm">
                    View List →
                  </Link>
                </div>

                <div className="bg-gray-700 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Top Rated</h3>
                    <span className="text-yellow-400 font-semibold">25</span>
                  </div>
                  <p className="text-gray-400 text-sm mb-4">My highest rated games</p>
                  <Link to="/top-rated" className="text-purple-400 hover:text-purple-300 text-sm">
                    View List →
                  </Link>
                </div>

                <div className="bg-gray-700 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Favorites</h3>
                    <span className="text-red-400 font-semibold">18</span>
                  </div>
                  <p className="text-gray-400 text-sm mb-4">My all-time favorite games</p>
                  <Link to="/favorites" className="text-purple-400 hover:text-purple-300 text-sm">
                    View List →
                  </Link>
                </div>

                <div className="bg-gray-700 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Custom Lists</h3>
                    <span className="text-purple-400 font-semibold">{stats.lists}</span>
                  </div>
                  <p className="text-gray-400 text-sm mb-4">My custom game collections</p>
                  <Link to="/custom-lists" className="text-purple-400 hover:text-purple-300 text-sm">
                    View Lists →
                  </Link>
                </div>
              </div>
            )}

            {/* Statistics Tab - Exact structure from ProfilePage */}
            {activeTab === 'stats' && (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-gray-700 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Trophy className="h-8 w-8 text-yellow-400" />
                    <h3 className="text-lg font-semibold text-white">Gaming Stats</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Games</span>
                      <span className="text-white font-semibold">{stats.totalGames}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Hours Played</span>
                      <span className="text-white font-semibold">{stats.hoursPlayed}h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Achievements</span>
                      <span className="text-white font-semibold">{stats.achievementsUnlocked}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">This Year</span>
                      <span className="text-white font-semibold">{stats.thisYear}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-700 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Star className="h-8 w-8 text-purple-400" />
                    <h3 className="text-lg font-semibold text-white">Review Stats</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Reviews Written</span>
                      <span className="text-white font-semibold">{stats.reviewsWritten}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Average Rating</span>
                      <span className="text-white font-semibold">{stats.averageRating}/10</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Completion Rate</span>
                      <span className="text-white font-semibold">
                        {Math.round((stats.completedGames / stats.totalGames) * 100)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Review Length</span>
                      <span className="text-white font-semibold">247 avg</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-700 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Users className="h-8 w-8 text-blue-400" />
                    <h3 className="text-lg font-semibold text-white">Social Stats</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Followers</span>
                      <span className="text-white font-semibold">{stats.followers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Following</span>
                      <span className="text-white font-semibold">{stats.following}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Profile Views</span>
                      <span className="text-white font-semibold">1,247</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Lists Created</span>
                      <span className="text-white font-semibold">{stats.lists}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-700 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Calendar className="h-8 w-8 text-green-400" />
                    <h3 className="text-lg font-semibold text-white">Activity Stats</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Days Active</span>
                      <span className="text-white font-semibold">342</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Streak (Days)</span>
                      <span className="text-white font-semibold">15</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Last Active</span>
                      <span className="text-white font-semibold">Today</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Avg. Session</span>
                      <span className="text-white font-semibold">2.3h</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-700 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <BookOpen className="h-8 w-8 text-pink-400" />
                    <h3 className="text-lg font-semibold text-white">Genre Preferences</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">RPG</span>
                      <span className="text-white font-semibold">45%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Action</span>
                      <span className="text-white font-semibold">28%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Adventure</span>
                      <span className="text-white font-semibold">18%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Strategy</span>
                      <span className="text-white font-semibold">9%</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-700 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Clock className="h-8 w-8 text-orange-400" />
                    <h3 className="text-lg font-semibold text-white">Platform Stats</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">PC</span>
                      <span className="text-white font-semibold">156</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">PlayStation 5</span>
                      <span className="text-white font-semibold">67</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Nintendo Switch</span>
                      <span className="text-white font-semibold">24</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Xbox Series X</span>
                      <span className="text-white font-semibold">12</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};