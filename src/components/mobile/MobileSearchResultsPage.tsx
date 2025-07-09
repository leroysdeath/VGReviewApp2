import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, Users } from 'lucide-react';
import { MobileGameCard } from './MobileGameCard';
import { useGames } from '../../hooks/useGames';
import { mockUsers } from '../../data/mockData';

export const MobileSearchResultsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [activeTab, setActiveTab] = useState<'games' | 'users'>('games');
  
  const { games, loading, error, searchGames } = useGames();

  useEffect(() => {
    if (query) {
      searchGames(query);
    }
  }, [query, searchGames]);

  const filteredUsers = mockUsers.filter(user =>
    user.username.toLowerCase().includes(query.toLowerCase()) ||
    user.bio.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-900 pb-20">
      <div className="px-4 py-6">
        <h1 className="text-2xl font-bold text-white mb-2">Search Results</h1>
        <p className="text-gray-400 mb-6">
          {query ? `Results for "${query}"` : 'Enter a search term to find games and users'}
        </p>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-700">
            <nav className="flex">
              <button
                onClick={() => setActiveTab('games')}
                className={`flex-1 py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'games'
                    ? 'border-purple-500 text-purple-400'
                    : 'border-transparent text-gray-400 hover:text-white hover:border-gray-300'
                }`}
              >
                Games ({loading ? '...' : games.length})
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`flex-1 py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
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
            {/* Loading State */}
            {loading && (
              <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-gray-800 rounded-lg overflow-hidden animate-pulse">
                    <div className="aspect-[3/4] bg-gray-700"></div>
                    <div className="p-3">
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
                <p className="text-red-400 mb-4 text-sm">Error loading games: {error}</p>
                <button
                  onClick={() => searchGames(query)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Games Results */}
            {!loading && !error && (
              <>
                {games.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4">
                    {games.map((game) => (
                      <MobileGameCard key={game.id} game={game} />
                    ))}
                  </div>
                ) : query ? (
                  <div className="text-center py-12">
                    <Search className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">No games found</h3>
                    <p className="text-gray-400 text-sm">
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
            {filteredUsers.length > 0 ? (
              <div className="space-y-4">
                {filteredUsers.map((user) => (
                  <div key={user.id} className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <img
                          src={user.avatar}
                          alt={user.username}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <Link 
                            to={`/user/${user.id}`}
                            className="text-white font-semibold hover:text-purple-400 transition-colors block"
                          >
                            {user.username}
                          </Link>
                          <p className="text-gray-400 text-sm truncate">{user.bio}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-center">
                          <div className="text-white font-semibold text-sm">{user.reviewCount}</div>
                          <div className="text-gray-400 text-xs">Reviews</div>
                        </div>
                        <button className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 transition-colors">
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
                <h3 className="text-lg font-semibold text-white mb-2">No users found</h3>
                <p className="text-gray-400 text-sm">
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