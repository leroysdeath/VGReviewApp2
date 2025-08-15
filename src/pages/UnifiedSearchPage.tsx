import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { 
  Search, Filter, Grid, List, Loader, AlertCircle, Star, Calendar, 
  Users, UserPlus, UserCheck, TrendingUp, Clock, Gamepad2, X,
  Heart, Plus, RefreshCw, Database
} from 'lucide-react';
import { useIGDBSearch } from '../hooks/useIGDBCache';
import { enhancedIGDBService } from '../services/enhancedIGDBService';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import { useFollow } from '../hooks/useFollow';
import { useCurrentUserId } from '../hooks/useCurrentUserId';
import { GameSearch } from '../components/GameSearch';
import { Game } from '../services/igdbService';

// Game interface
interface GameResult {
  id: number;
  name: string;
  cover?: {
    url: string;
  };
  first_release_date?: number;
  genres?: { name: string }[];
  platforms?: { name: string }[];
  rating?: number;
  summary?: string;
}

// User interface
interface UserResult {
  id: string;
  username: string;
  bio: string;
  avatar: string;
  reviewCount: number;
  followers: number;
  following: number;
  averageRating?: number;
  joinDate?: string;
  verified?: boolean;
}

type SearchTab = 'all' | 'games' | 'users';

export const UnifiedSearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { toggleFollow: dbToggleFollow, getFollowingList, loading: followLoading } = useFollow();
  const { userId: currentDbUserId } = useCurrentUserId();

  // State
  const [activeTab, setActiveTab] = useState<SearchTab>('all');
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  
  // Game search state
  const [games, setGames] = useState<GameResult[]>([]);
  const [loadingGames, setLoadingGames] = useState(false);
  const [gameError, setGameError] = useState<string | null>(null);
  
  // User search state
  const [users, setUsers] = useState<UserResult[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);
  const [followingUsers, setFollowingUsers] = useState<string[]>([]);
  
  // Recent searches
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Load recent searches
  useEffect(() => {
    const saved = localStorage.getItem('unified_recent_searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading recent searches:', error);
      }
    }
  }, []);

  // Load following list
  useEffect(() => {
    const loadFollowingList = async () => {
      if (currentDbUserId) {
        const following = await getFollowingList(currentDbUserId);
        setFollowingUsers(following);
      }
    };
    loadFollowingList();
  }, [currentDbUserId, getFollowingList]);

  // Search effect
  useEffect(() => {
    const query = searchParams.get('q');
    if (query && query !== searchTerm) {
      setSearchTerm(query);
      handleSearch(query);
    }
  }, [searchParams]);

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) return;

    // Update URL
    setSearchParams({ q: query });

    // Save to recent searches
    const updatedSearches = [query, ...recentSearches.filter(s => s !== query)].slice(0, 10);
    setRecentSearches(updatedSearches);
    localStorage.setItem('unified_recent_searches', JSON.stringify(updatedSearches));

    // Search based on active tab
    if (activeTab === 'all' || activeTab === 'games') {
      searchGames(query);
    }
    if (activeTab === 'all' || activeTab === 'users') {
      searchUsers(query);
    }
  }, [activeTab, recentSearches, setSearchParams]);

  const searchGames = async (query: string) => {
    setLoadingGames(true);
    setGameError(null);
    try {
      const results = await enhancedIGDBService.searchGames(query, {
        useCache: true,
        cacheTTL: 300,
      });
      setGames(results);
    } catch (error) {
      console.error('Game search error:', error);
      setGameError('Failed to search games. Please try again.');
    } finally {
      setLoadingGames(false);
    }
  };

  const searchUsers = async (query: string) => {
    setLoadingUsers(true);
    setUserError(null);
    try {
      const { data, error } = await supabase
        .from('user')
        .select('*')
        .or(`username.ilike.%${query}%,name.ilike.%${query}%,bio.ilike.%${query}%`)
        .limit(20);

      if (error) throw error;

      const formattedUsers: UserResult[] = (data || []).map(user => ({
        id: user.id,
        username: user.username || user.name,
        bio: user.bio || '',
        avatar: user.picurl || user.avatar_url || '',
        reviewCount: 0, // Would need to join with reviews table
        followers: 0, // Would need to join with follows table
        following: 0,
        joinDate: user.created_at,
      }));

      setUsers(formattedUsers);
    } catch (error) {
      console.error('User search error:', error);
      setUserError('Failed to search users. Please try again.');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleToggleFollow = async (userId: string) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    await dbToggleFollow(userId);
    if (followingUsers.includes(userId)) {
      setFollowingUsers(followingUsers.filter(id => id !== userId));
    } else {
      setFollowingUsers([...followingUsers, userId]);
    }
  };

  const handleGameSelect = (game: Game) => {
    navigate(`/game/${game.id}`);
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSearchParams({});
    setGames([]);
    setUsers([]);
  };

  const tabCounts = {
    all: games.length + users.length,
    games: games.length,
    users: users.length,
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Search Bar */}
          <div className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch(searchTerm)}
                placeholder="Search games and users..."
                className="w-full pl-10 pr-10 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {searchTerm && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
            <button
              onClick={() => handleSearch(searchTerm)}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Search
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              <Filter className="h-5 w-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-700 rounded-lg p-1">
            {(['all', 'games', 'users'] as SearchTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-4 py-2 rounded-md transition-colors capitalize flex items-center justify-center gap-2 ${
                  activeTab === tab
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-600'
                }`}
              >
                {tab === 'games' && <Gamepad2 className="h-4 w-4" />}
                {tab === 'users' && <Users className="h-4 w-4" />}
                {tab === 'all' && <Search className="h-4 w-4" />}
                {tab}
                {searchTerm && tabCounts[tab] > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-gray-800 rounded-full text-xs">
                    {tabCounts[tab]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Recent Searches */}
        {!searchTerm && recentSearches.length > 0 && (
          <div className="mb-8">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Searches
            </h3>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((term, index) => (
                <button
                  key={index}
                  onClick={() => handleSearch(term)}
                  className="px-3 py-1 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading State */}
        {(loadingGames || loadingUsers) && (
          <div className="flex items-center justify-center py-12">
            <Loader className="h-8 w-8 text-purple-500 animate-spin" />
          </div>
        )}

        {/* Error State */}
        {(gameError || userError) && (
          <div className="bg-red-900 bg-opacity-20 border border-red-700 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <p className="text-red-300">{gameError || userError}</p>
            </div>
          </div>
        )}

        {/* Results */}
        <div className="space-y-8">
          {/* Games Results */}
          {(activeTab === 'all' || activeTab === 'games') && games.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Gamepad2 className="h-5 w-5" />
                Games ({games.length})
              </h2>
              <div className={viewMode === 'grid' 
                ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
                : 'space-y-4'
              }>
                {games.map((game) => (
                  <div
                    key={game.id}
                    onClick={() => navigate(`/game/${game.id}`)}
                    className="bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-700 transition-colors cursor-pointer"
                  >
                    {viewMode === 'grid' ? (
                      <div>
                        <div className="aspect-[3/4] bg-gray-700">
                          {game.cover?.url && (
                            <img
                              src={game.cover.url.replace('t_thumb', 't_cover_big')}
                              alt={game.name}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <div className="p-3">
                          <h3 className="text-white font-medium text-sm line-clamp-2">{game.name}</h3>
                          {game.rating && (
                            <div className="flex items-center gap-1 mt-1">
                              <Star className="h-3 w-3 text-yellow-500" />
                              <span className="text-gray-400 text-xs">{Math.round(game.rating)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-4 p-4">
                        {game.cover?.url && (
                          <img
                            src={game.cover.url.replace('t_thumb', 't_cover_small')}
                            alt={game.name}
                            className="w-20 h-28 object-cover rounded"
                          />
                        )}
                        <div className="flex-1">
                          <h3 className="text-white font-medium">{game.name}</h3>
                          <p className="text-gray-400 text-sm mt-1 line-clamp-2">{game.summary}</p>
                          <div className="flex items-center gap-4 mt-2">
                            {game.rating && (
                              <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 text-yellow-500" />
                                <span className="text-gray-400 text-sm">{Math.round(game.rating)}</span>
                              </div>
                            )}
                            {game.first_release_date && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4 text-gray-400" />
                                <span className="text-gray-400 text-sm">
                                  {new Date(game.first_release_date * 1000).getFullYear()}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Users Results */}
          {(activeTab === 'all' || activeTab === 'users') && users.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Users className="h-5 w-5" />
                Users ({users.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {users.map((user) => (
                  <div key={user.id} className="bg-gray-800 rounded-lg p-4">
                    <div className="flex items-start gap-4">
                      <Link to={`/user/${user.id}`}>
                        <img
                          src={user.avatar || `https://ui-avatars.com/api/?name=${user.username}&background=6366f1&color=fff`}
                          alt={user.username}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      </Link>
                      <div className="flex-1">
                        <Link to={`/user/${user.id}`} className="text-white font-medium hover:text-purple-400">
                          {user.username}
                        </Link>
                        {user.bio && (
                          <p className="text-gray-400 text-sm mt-1 line-clamp-2">{user.bio}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <span>{user.reviewCount} reviews</span>
                          <span>{user.followers} followers</span>
                        </div>
                      </div>
                      {currentDbUserId && user.id !== currentDbUserId && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            handleToggleFollow(user.id);
                          }}
                          disabled={followLoading}
                          className={`px-3 py-1 rounded-lg transition-colors ${
                            followingUsers.includes(user.id)
                              ? 'bg-gray-700 text-white hover:bg-gray-600'
                              : 'bg-purple-600 text-white hover:bg-purple-700'
                          }`}
                        >
                          {followingUsers.includes(user.id) ? (
                            <UserCheck className="h-4 w-4" />
                          ) : (
                            <UserPlus className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Results */}
          {searchTerm && !loadingGames && !loadingUsers && games.length === 0 && users.length === 0 && (
            <div className="text-center py-12">
              <Search className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">No results found for "{searchTerm}"</p>
              <p className="text-gray-500 mt-2">Try adjusting your search or filters</p>
            </div>
          )}
        </div>

        {/* View Mode Toggle */}
        <div className="fixed bottom-8 right-8">
          <div className="bg-gray-800 rounded-lg p-1 flex gap-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <Grid className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <List className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};