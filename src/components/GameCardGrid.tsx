import React, { useState } from 'react';
import { InteractiveGameCard, GameData, CardTheme } from './InteractiveGameCard';
import { Filter, Grid, List, Search } from 'lucide-react';

interface GameCardGridProps {
  games: GameData[];
  onReviewClick?: (gameId: string) => void;
  className?: string;
}

export const GameCardGrid: React.FC<GameCardGridProps> = ({
  games,
  onReviewClick,
  className = ''
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'rating' | 'reviews' | 'recent'>('rating');
  const [filterGenre, setFilterGenre] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Theme rotation for visual variety
  const themes: CardTheme[] = ['purple', 'green', 'orange', 'blue', 'red'];
  const getThemeForIndex = (index: number): CardTheme => themes[index % themes.length];

  // Get unique genres for filter
  const genres = ['all', ...Array.from(new Set(games.map(game => game.genre)))];

  // Filter and sort games
  const filteredAndSortedGames = games
    .filter(game => {
      const matchesSearch = game.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           game.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesGenre = filterGenre === 'all' || game.genre === filterGenre;
      return matchesSearch && matchesGenre;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.rating - a.rating;
        case 'reviews':
          return b.reviewCount - a.reviewCount;
        case 'recent':
          return new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime();
        default:
          return 0;
      }
    });

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Controls */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search games..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-800/80 backdrop-blur-sm border border-gray-700 rounded-xl 
                     text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 
                     focus:border-transparent transition-all duration-300"
          />
        </div>

        {/* Filters and Controls */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Genre Filter */}
          <select
            value={filterGenre}
            onChange={(e) => setFilterGenre(e.target.value)}
            className="px-4 py-2 bg-gray-800/80 backdrop-blur-sm border border-gray-700 rounded-lg 
                     text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300"
          >
            {genres.map(genre => (
              <option key={genre} value={genre}>
                {genre === 'all' ? 'All Genres' : genre}
              </option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'rating' | 'reviews' | 'recent')}
            className="px-4 py-2 bg-gray-800/80 backdrop-blur-sm border border-gray-700 rounded-lg 
                     text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300"
          >
            <option value="rating">Highest Rated</option>
            <option value="reviews">Most Reviewed</option>
            <option value="recent">Most Recent</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex bg-gray-800/80 backdrop-blur-sm border border-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded transition-all duration-300 ${
                viewMode === 'grid' 
                  ? 'bg-purple-600 text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded transition-all duration-300 ${
                viewMode === 'list' 
                  ? 'bg-purple-600 text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-gray-400 text-sm">
        Showing {filteredAndSortedGames.length} of {games.length} games
        {searchTerm && ` for "${searchTerm}"`}
        {filterGenre !== 'all' && ` in ${filterGenre}`}
      </div>

      {/* Game Grid */}
      <div className={`
        ${viewMode === 'grid' 
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' 
          : 'space-y-4'
        }
      `}>
        {filteredAndSortedGames.map((game, index) => (
          <InteractiveGameCard
            key={game.id}
            game={game}
            theme={getThemeForIndex(index)}
            onReviewClick={onReviewClick}
            className={viewMode === 'list' ? 'max-w-none' : ''}
          />
        ))}
      </div>

      {/* Empty State */}
      {filteredAndSortedGames.length === 0 && (
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-12 h-12 text-gray-600" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No games found</h3>
          <p className="text-gray-400">
            Try adjusting your search terms or filters to find more games.
          </p>
        </div>
      )}
    </div>
  );
};