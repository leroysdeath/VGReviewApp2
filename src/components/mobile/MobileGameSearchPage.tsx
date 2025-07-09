import React, { useState, useEffect } from 'react';
import { Search, Filter, Grid, List } from 'lucide-react';
import { MobileGameCard } from './MobileGameCard';
import { useGames } from '../../hooks/useGames';

export const MobileGameSearchPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [sortBy, setSortBy] = useState('popularity');
  const [showFilters, setShowFilters] = useState(false);

  const { games, loading, error, searchGames, getAllGames } = useGames();

  useEffect(() => {
    getAllGames();
  }, [getAllGames]);

  useEffect(() => {
    if (searchTerm.trim()) {
      const timeoutId = setTimeout(() => {
        searchGames(searchTerm);
      }, 500);
      return () => clearTimeout(timeoutId);
    } else {
      getAllGames();
    }
  }, [searchTerm, searchGames, getAllGames]);

  const genres = ['Action', 'Adventure', 'RPG', 'Strategy', 'Simulation', 'Sports', 'Racing'];
  const sortOptions = [
    { value: 'popularity', label: 'Most Popular' },
    { value: 'rating', label: 'Highest Rated' },
    { value: 'release', label: 'Release Date' },
    { value: 'title', label: 'Title A-Z' },
  ];

  const filteredGames = games.filter(game => {
    const matchesGenre = !selectedGenre || game.genre === selectedGenre;
    return matchesGenre;
  });

  return (
    <div className="min-h-screen bg-gray-900 pb-20">
      <div className="px-4 py-6">
        <h1 className="text-2xl font-bold text-white mb-6">Discover Games</h1>
        
        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search games..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
          />
        </div>

        {/* Filter Toggle */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Filter className="h-4 w-4" />
            Filters
          </button>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500 text-sm"
          >
            {sortOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mb-6 p-4 bg-gray-800 rounded-lg space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Genre</label>
              <select 
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
              >
                <option value="">All Genres</option>
                {genres.map(genre => (
                  <option key={genre} value={genre}>{genre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Release Year</label>
              <select className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500">
                <option value="">Any Year</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
                <option value="2022">2022</option>
                <option value="2021">2021</option>
                <option value="2020">2020</option>
              </select>
            </div>
          </div>
        )}

        {/* Results */}
        <div className="mb-4">
          <p className="text-gray-400 text-sm">
            {loading ? 'Searching...' : `Found ${filteredGames.length} games`}
            {searchTerm && ` for "${searchTerm}"`}
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <p className="text-red-400 mb-4 text-sm">{error}</p>
            <button
              onClick={() => searchTerm ? searchGames(searchTerm) : getAllGames()}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Games Grid */}
        {loading ? (
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-gray-800 rounded-lg overflow-hidden animate-pulse">
                <div className="aspect-[3/4] bg-gray-700"></div>
                <div className="p-3">
                  <div className="h-4 bg-gray-700 rounded mb-2"></div>
                  <div className="h-3 bg-gray-700 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : !error && (
          <div className="grid grid-cols-2 gap-4">
            {filteredGames.map((game) => (
              <MobileGameCard key={game.id} game={game} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};