import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Filter, Grid, List } from 'lucide-react';
import { GameCard } from '../components/GameCard';
import { useGames } from '../hooks/useGames';
import { mockUsers } from '../data/mockData';
import { Link } from 'react-router-dom';

export const SearchResultsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [activeTab, setActiveTab] = useState<'games' | 'users'>('games');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('relevance');
  
  const { games, loading, error, searchGames } = useGames();

  useEffect(() => {
    if (query) {
      searchGames(query);
    }
  }, [query, searchGames]);

  // Filter users based on search query
  const filteredUsers = mockUsers.filter(user =>
    user.username.toLowerCase().includes(query.toLowerCase()) ||
    user.bio.toLowerCase().includes(query.toLowerCase())
  );

  const sortOptions = [
    { value: 'relevance', label: 'Most Relevant' },
    { value: 'rating', label: 'Highest Rated' },
    { value: 'release', label: 'Release Date' },
    { value: 'title', label: 'Title A-Z' },
  ];

  const userSortOptions = [
    { value: 'relevance', label: 'Most Relevant' },
    { value: 'reviews', label: 'Most Reviews' },
    { value: 'followers', label: 'Most Followers' },
    { value: 'recent', label: 'Most Recent' },
  ];

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Search Results</h1>
          <p className="text-gray-400 text-lg">
            {query ? `Results for "${query}"` : 'Enter a search term to find games and users'}
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-700">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('games')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'games'
                    ? 'border-purple-500 text-purple-400'
                    : 'border-transparent text-gray-400 hover:text-white hover:border-gray-300'
                }`}
              >
                Games ({loading ? '...' : games.length})
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'users'
                    ? 'border-purple-500 text-purple-400'
                    : 'border-transparent text-gray-400 hover:text-white hover:border-gray-300'
                }`}
              >
                Users ({filteredUsers.length})
              </button>
            </nav>
          </div>
        </div>

        {/* Games Tab */}
        {activeTab === 'games' && (
          <div>
            {/* Filter Bar */}
            <div className="flex flex-wrap gap-4 items-center justify-between mb-6">
              <div className="flex flex-wrap gap-4 items-center">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                >
                  {sortOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'grid' 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  <Grid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'list' 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className={`grid gap-6 ${
                viewMode === 'grid' 
                  ? 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
                  : 'grid-cols-1'
              }`}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="bg-gray-800 rounded-lg overflow-hidden animate-pulse">
                    <div className={`${viewMode === 'grid' ? 'aspect-[3/4]' : 'h-20'} bg-gray-700`}></div>
                    <div className="p-4">
                      <div className="h-4 bg-gray-700 rounded mb-2"></div>
                      <div className="h-3 bg-gray-700 rounded w-2/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="text-center py-12">
                <p className="text-red-400 mb-4">Error loading games: {error}</p>
                <button
                  onClick={() => searchGames(query)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Games Results */}
            {!loading && !error && (
              <>
                {games.length > 0 ? (
                  <div className={`grid gap-6 ${
                    viewMode === 'grid' 
                      ? 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
                      : 'grid-cols-1'
                  }`}>
                    {games.map((game) => (
                      <GameCard key={game.id} game={game} listView={viewMode === 'list'} />
                    ))}
                  </div>
                ) : query ? (
                  <div className="text-center py-12">
                    <Search className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No games found</h3>
                    <p className="text-gray-400">
                      Try adjusting your search terms or browse our{' '}
                      <Link to="/search" className="text-purple-400 hover:text-purple-300">
                        game catalog
                      </Link>
                    </p>
                  </div>
                ) : null}
              </>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div>
            {/* Filter Bar */}
            <div className="flex justify-between items-center mb-6">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
              >
                {userSortOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            {/* Users Results */}
            {filteredUsers.length > 0 ? (
              <div className="space-y-4">
                {filteredUsers.map((user) => (
                  <div key={user.id} className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <img
                          src={user.avatar}
                          alt={user.username}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <div>
                          <Link 
                            to={`/user/${user.id}`}
                            className="text-lg font-semibold text-white hover:text-purple-400 transition-colors"
                          >
                            {user.username}
                          </Link>
                          <p className="text-gray-400 text-sm">{user.bio}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <div className="text-white font-semibold">{user.reviewCount}</div>
                          <div className="text-gray-400 text-xs">Reviews</div>
                        </div>
                        <div className="text-center">
                          <div className="text-white font-semibold">{user.followers}</div>
                          <div className="text-gray-400 text-xs">Followers</div>
                        </div>
                        <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                          Follow
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : query ? (
              <div className="text-center py-12">
                <Search className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No users found</h3>
                <p className="text-gray-400">
                  Try adjusting your search terms or browse{' '}
                  <Link to="/users" className="text-purple-400 hover:text-purple-300">
                    all users
                  </Link>
                </p>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-400">Enter a search term to find users</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};