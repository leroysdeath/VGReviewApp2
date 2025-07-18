// pages/SearchResultsPage.tsx
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, Grid, List, Loader, AlertCircle, Star, Calendar } from 'lucide-react';
import { useGameSearch } from '../hooks/useGameSearch';

interface Game {
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

export const SearchResultsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);

  const {
    searchState,
    searchTerm,
    setSearchTerm,
    searchGames,
    loadMore,
    updateSearchOptions,
    searchOptions
  } = useGameSearch();

  // Extract parameters from URL
  useEffect(() => {
    const query = searchParams.get('q') || '';
    const genres = searchParams.get('genres')?.split(',').filter(Boolean) || [];
    const platforms = searchParams.get('platforms')?.split(',').filter(Boolean) || [];
    const rating = searchParams.get('rating');
    const sort = searchParams.get('sort');

    setSearchTerm(query);

    const options = {
      genres: genres.length > 0 ? genres : undefined,
      platforms: platforms.length > 0 ? platforms : undefined,
      minRating: rating ? parseInt(rating) : undefined,
      sortBy: 'popularity' as const,
      sortOrder: 'desc' as const
    };

    if (sort) {
      const [field, order] = sort.split(':');
      options.sortBy = field as any;
      options.sortOrder = (order || 'desc') as any;
    }

    updateSearchOptions(options);

    // Perform the search
    if (query || genres.length > 0 || platforms.length > 0 || rating) {
      searchGames(query, options);
    }
  }, [searchParams]);

  const handleGameClick = (game: Game) => {
    // Navigate to game detail page
    window.location.href = `/game/${game.id}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const GameCard: React.FC<{ game: Game }> = ({ game }) => (
    <div
      onClick={() => handleGameClick(game)}
      className="bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-750 transition-all duration-200 cursor-pointer group hover:scale-105"
    >
      <div className="aspect-[3/4] relative overflow-hidden">
        {game.cover?.url ? (
          <img
            src={game.cover.url.replace('t_thumb', 't_cover_big')}
            alt={game.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gray-700 flex items-center justify-center">
            <span className="text-gray-500 text-sm">No Image</span>
          </div>
        )}
        {game.rating && (
          <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded-lg text-sm flex items-center">
            <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
            {Math.round(game.rating / 10)}
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-white group-hover:text-purple-300 transition-colors line-clamp-2">
          {game.name}
        </h3>
        {game.first_release_date && (
          <p className="text-gray-400 text-sm mt-1 flex items-center">
            <Calendar className="w-3 h-3 mr-1" />
            {formatDate(game.first_release_date)}
          </p>
        )}
        {game.genres && game.genres.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {game.genres.slice(0, 2).map((genre, index) => (
              <span
                key={index}
                className="bg-purple-600 bg-opacity-20 text-purple-300 px-2 py-1 rounded text-xs"
              >
                {genre.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const GameListItem: React.FC<{ game: Game }> = ({ game }) => (
    <div
      onClick={() => handleGameClick(game)}
      className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors cursor-pointer group flex gap-4"
    >
      <div className="w-16 h-20 flex-shrink-0 overflow-hidden rounded">
        {game.cover?.url ? (
          <img
            src={game.cover.url.replace('t_thumb', 't_cover_small')}
            alt={game.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gray-700 flex items-center justify-center">
            <span className="text-gray-500 text-xs">No Image</span>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-white group-hover:text-purple-300 transition-colors truncate">
          {game.name}
        </h3>
        {game.first_release_date && (
          <p className="text-gray-400 text-sm mt-1 flex items-center">
            <Calendar className="w-3 h-3 mr-1" />
            {formatDate(game.first_release_date)}
          </p>
        )}
        {game.summary && (
          <p className="text-gray-300 text-sm mt-2 line-clamp-2">
            {game.summary}
          </p>
        )}
        {game.genres && game.genres.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {game.genres.slice(0, 3).map((genre, index) => (
              <span
                key={index}
                className="bg-purple-600 bg-opacity-20 text-purple-300 px-2 py-1 rounded text-xs"
              >
                {genre.name}
              </span>
            ))}
          </div>
        )}
      </div>
      {game.rating && (
        <div className="flex-shrink-0 text-right">
          <div className="flex items-center text-yellow-400">
            <Star className="w-4 h-4 mr-1 fill-current" />
            <span className="text-white font-semibold">
              {Math.round(game.rating / 10)}
            </span>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">
              {searchTerm ? `Search Results for "${searchTerm}"` : 'Browse Games'}
            </h1>
            {searchState.totalResults > 0 && (
              <p className="text-gray-400 mt-1">
                {searchState.totalResults.toLocaleString()} games found
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </button>
            
            <div className="flex bg-gray-800 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 transition-colors ${
                  viewMode === 'grid' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 transition-colors ${
                  viewMode === 'list' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {searchState.loading && searchState.games.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-8 h-8 animate-spin text-purple-400" />
            <span className="ml-3 text-gray-400">Searching for games...</span>
          </div>
        )}

        {/* Error State */}
        {searchState.error && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <p className="text-red-400 font-semibold mb-2">Search Error</p>
              <p className="text-gray-400">{searchState.error}</p>
            </div>
          </div>
        )}

        {/* No Results */}
        {!searchState.loading && !searchState.error && searchState.games.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎮</div>
            <h2 className="text-xl font-semibold mb-2">No games found</h2>
            <p className="text-gray-400">Try adjusting your search terms or filters</p>
          </div>
        )}

        {/* Results */}
        {searchState.games.length > 0 && (
          <>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {searchState.games.map((game) => (
                  <GameCard key={game.id} game={game} />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {searchState.games.map((game) => (
                  <GameListItem key={game.id} game={game} />
                ))}
              </div>
            )}

            {/* Load More */}
            {searchState.hasMore && (
              <div className="text-center mt-8">
                <button
                  onClick={loadMore}
                  disabled={searchState.loading}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  {searchState.loading ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin mr-2 inline" />
                      Loading...
                    </>
                  ) : (
                    'Load More Games'
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
