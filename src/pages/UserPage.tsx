import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Edit, Calendar, MessageCircle, Star, Trophy, Users, BookOpen } from 'lucide-react';
import { StarRating } from '../components/StarRating';
import { mockUsers, mockGames, mockReviews } from '../data/mockData';

export const UserPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<'top5' | 'top50' | 'reviews'>('top5');
  const [reviewFilter, setReviewFilter] = useState('recent');

  const user = mockUsers.find(u => u.id === id) || mockUsers[0];
  const userReviews = mockReviews.filter(r => r.userId === id);
  const userTop5 = mockGames.slice(0, 5);
  const userTop50 = mockGames.slice(0, 50);

  const stats = {
    games: 127,
    thisYear: 23,
    lists: 8,
    following: 42,
    followers: 158
  };

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
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Profile Section */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-lg p-6 mb-8">
              <div className="flex items-start gap-4">
                <img
                  src={user.avatar}
                  alt={user.username}
                  className="w-24 h-24 rounded-full object-cover"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl font-bold text-white">{user.username}</h1>
                    <Link
                      to="/profile/edit"
                      className="p-2 text-gray-400 hover:text-white transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                    </Link>
                  </div>
                  <p className="text-gray-400 mb-4">{user.bio}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>Joined {user.joinDate}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Tabs */}
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <div className="border-b border-gray-700">
                <nav className="flex">
                  <button
                    onClick={() => setActiveTab('top5')}
                    className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'top5'
                        ? 'border-purple-500 text-purple-400'
                        : 'border-transparent text-gray-400 hover:text-white'
                    }`}
                  >
                    Top 5
                  </button>
                  <button
                    onClick={() => setActiveTab('top50')}
                    className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'top50'
                        ? 'border-purple-500 text-purple-400'
                        : 'border-transparent text-gray-400 hover:text-white'
                    }`}
                  >
                    Top 50
                  </button>
                  <button
                    onClick={() => setActiveTab('reviews')}
                    className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'reviews'
                        ? 'border-purple-500 text-purple-400'
                        : 'border-transparent text-gray-400 hover:text-white'
                    }`}
                  >
                    Reviews
                  </button>
                </nav>
              </div>

              <div className="p-6">
                {activeTab === 'top5' && (
                  <div className="space-y-4">
                    {userTop5.map((game, index) => (
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
                          <h3 className="font-semibold text-white">{game.title}</h3>
                          <p className="text-gray-400 text-sm">{game.genre}</p>
                        </div>
                        <StarRating rating={game.rating} />
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'top50' && (
                  <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {userTop50.map((game, index) => (
                      <Link
                        key={game.id}
                        to={`/game/${game.id}`}
                        className="group relative bg-gray-700 rounded-lg overflow-hidden hover:bg-gray-600 transition-colors"
                      >
                        <img
                          src={game.coverImage}
                          alt={game.title}
                          className="w-full h-48 object-cover"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-white font-semibold mb-1">{game.title}</div>
                            <StarRating rating={game.rating} />
                          </div>
                        </div>
                        <div className="absolute top-2 left-2 bg-purple-600 text-white px-2 py-1 rounded text-xs font-bold">
                          #{index + 1}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                {activeTab === 'reviews' && (
                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-semibold text-white">Reviews ({userReviews.length})</h3>
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
                    <div className="space-y-4">
                      {sortedReviews.map((review) => {
                        const game = mockGames.find(g => g.id === review.gameId);
                        return (
                          <div key={review.id} className="flex gap-4 p-4 bg-gray-700 rounded-lg">
                            <Link to={`/game/${game?.id}`}>
                              <img
                                src={game?.coverImage}
                                alt={game?.title}
                                className="w-16 h-16 object-cover rounded"
                              />
                            </Link>
                            <div className="flex-1">
                              <div className="flex items-center gap-4 mb-2">
                                <Link 
                                  to={`/game/${game?.id}`}
                                  className="font-semibold text-white hover:text-purple-400 transition-colors"
                                >
                                  {game?.title}
                                </Link>
                                <StarRating rating={review.rating} />
                                <span className="text-sm text-gray-400">{review.date}</span>
                              </div>
                              {review.hasText && (
                                <p className="text-gray-300 text-sm leading-relaxed">
                                  {review.text}
                                </p>
                              )}
                            </div>
                            {review.hasText && (
                              <MessageCircle className="h-4 w-4 text-purple-400 mt-1" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Statistics Section */}
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Statistics</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-yellow-400" />
                    <span className="text-gray-300">Games</span>
                  </div>
                  <span className="font-semibold text-white">{stats.games}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-400" />
                    <span className="text-gray-300">This Year</span>
                  </div>
                  <span className="font-semibold text-white">{stats.thisYear}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-green-400" />
                    <span className="text-gray-300">Lists</span>
                  </div>
                  <span className="font-semibold text-white">{stats.lists}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-purple-400" />
                    <span className="text-gray-300">Following</span>
                  </div>
                  <span className="font-semibold text-white">{stats.following}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-pink-400" />
                    <span className="text-gray-300">Followers</span>
                  </div>
                  <span className="font-semibold text-white">{stats.followers}</span>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Recent Activity</h3>
              <div className="space-y-3">
                <div className="text-sm text-gray-400">
                  <span className="text-purple-400">Reviewed</span> Cyberpunk 2077 - 8.5/10
                </div>
                <div className="text-sm text-gray-400">
                  <span className="text-blue-400">Added</span> Elden Ring to wishlist
                </div>
                <div className="text-sm text-gray-400">
                  <span className="text-green-400">Completed</span> The Witcher 3
                </div>
                <div className="text-sm text-gray-400">
                  <span className="text-pink-400">Followed</span> GameMaster92
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};