import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ThumbsUp, Filter, Grid, List } from 'lucide-react';
import { LazyImage } from './LazyImage';
import { Game } from '../services/igdbApi';
import { useResponsive } from '../hooks/useResponsive';
import { SwipeableCarousel } from './SwipeableCarousel';

interface GameRecommendationsProps {
  games: Game[];
  title?: string;
  loading?: boolean;
  emptyMessage?: string;
  showViewToggle?: boolean;
  showFilters?: boolean;
  className?: string;
  onGameSelect?: (game: Game) => void;
  personalizedReason?: string;
}

export const GameRecommendations: React.FC<GameRecommendationsProps> = ({
  games,
  title = 'Recommended For You',
  loading = false,
  emptyMessage = 'No recommendations available',
  showViewToggle = true,
  showFilters = true,
  className = '',
  onGameSelect,
  personalizedReason = 'Based on your gaming preferences',
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'carousel' | 'list'>('carousel');
  const [filterType, setFilterType] = useState<'all' | 'similar' | 'popular' | 'new'>('all');
  const { isMobile, isTablet } = useResponsive();

  // Filtered games based on selected filter
  const filteredGames = games.filter(game => {
    if (filterType === 'all') return true;
    if (filterType === 'similar') return game.genre === games[0]?.genre;
    if (filterType === 'popular') return game.rating >= 8;
    if (filterType === 'new') {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      return new Date(game.releaseDate) >= oneYearAgo;
    }
    return true;
  });

  // Determine items per view based on screen size
  const getItemsPerView = () => {
    if (isMobile) return 1.5;
    if (isTablet) return 2.5;
    return 4.5;
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="h-6 bg-gray-700 rounded w-48 animate-pulse"></div>
          <div className="h-6 bg-gray-700 rounded w-24 animate-pulse"></div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-gray-800 rounded-lg overflow-hidden animate-pulse">
              <div className="aspect-[3/4] bg-gray-700"></div>
              <div className="p-3">
                <div className="h-4 bg-gray-700 rounded mb-2"></div>
                <div className="h-3 bg-gray-700 rounded w-2/3"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (filteredGames.length === 0) {
    return (
      <div className={`bg-gray-800 rounded-lg p-6 text-center ${className}`}>
        <Sparkles className="h-12 w-12 text-gray-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">{emptyMessage}</h3>
        <p className="text-gray-400">Try adjusting your filters or explore more games</p>
      </div>
    );
  }

  // Render game card
  const renderGameCard = (game: Game) => (
    <Link
      to={`/game/${game.id}`}
      className="group bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-750 transition-all duration-300"
      onClick={() => onGameSelect?.(game)}
    >
      <div className="aspect-[3/4] overflow-hidden relative">
        <LazyImage
          src={game.coverImage}
          alt={game.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
        />
        <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
          <Star className="h-3 w-3 text-yellow-400 fill-current" />
          {game.rating.toFixed(1)}
        </div>
      </div>
      
      <div className="p-3">
        <h3 className="font-medium text-white group-hover:text-game-purple transition-colors line-clamp-1">
          {game.title}
        </h3>
        <p className="text-gray-400 text-sm">{game.genre}</p>
      </div>
    </Link>
  );

  // Render game list item
  const renderGameListItem = (game: Game) => (
    <Link
      to={`/game/${game.id}`}
      className="flex gap-4 p-4 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors group"
      onClick={() => onGameSelect?.(game)}
    >
      <div className="flex-shrink-0">
        <LazyImage
          src={game.coverImage}
          alt={game.title}
          className="w-16 h-20 object-cover rounded"
        />
      </div>
      
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-white group-hover:text-game-purple transition-colors mb-1">
          {game.title}
        </h3>
        
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 text-yellow-400 fill-current" />
            <span>{game.rating.toFixed(1)}</span>
          </div>
          <span>{game.genre}</span>
        </div>
        
        <p className="text-gray-500 text-sm mt-2 line-clamp-2">
          {game.description.substring(0, 100)}...
        </p>
      </div>
    </Link>
  );

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with title and controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-game-purple" />
            {title}
          </h2>
          {personalizedReason && (
            <p className="text-sm text-gray-400 mt-1 flex items-center gap-1">
              <ThumbsUp className="h-3 w-3" />
              {personalizedReason}
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {/* Filters */}
          {showFilters && (
            <div className="relative">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="appearance-none bg-gray-700 text-white px-3 py-2 pr-8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-game-purple"
              >
                <option value="all">All Games</option>
                <option value="similar">Similar Games</option>
                <option value="popular">Popular Games</option>
                <option value="new">New Releases</option>
              </select>
              <Filter className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          )}
          
          {/* View toggle */}
          {showViewToggle && !isMobile && (
            <div className="flex bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('carousel')}
                className={`p-2 rounded transition-colors ${
                  viewMode === 'carousel'
                    ? 'bg-game-purple text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
                aria-label="Carousel view"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="10" rx="2" ry="2" />
                  <path d="M16 3v4M8 3v4M16 21v-4M8 21v-4" />
                </svg>
              </button>
              
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-game-purple text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
                aria-label="Grid view"
              >
                <Grid className="h-4 w-4" />
              </button>
              
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded transition-colors ${
                  viewMode === 'list'
                    ? 'bg-game-purple text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
                aria-label="List view"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Game recommendations */}
      {viewMode === 'carousel' && (
        <SwipeableCarousel
          itemsPerView={{
            mobile: 1.5,
            tablet: 2.5,
            desktop: 4.5
          }}
          showArrows={!isMobile}
          showDots={false}
          autoPlay={false}
          gap="1rem"
        >
          {filteredGames.map((game) => (
            <div key={game.id} className="h-full">
              {renderGameCard(game)}
            </div>
          ))}
        </SwipeableCarousel>
      )}
      
      {viewMode === 'grid' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredGames.map((game) => (
            <div key={game.id}>
              {renderGameCard(game)}
            </div>
          ))}
        </div>
      )}
      
      {viewMode === 'list' && (
        <div className="space-y-3">
          {filteredGames.map((game) => (
            <div key={game.id}>
              {renderGameListItem(game)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Star icon component
const Star: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg 
    className={className} 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);