// components/ExploreGamesButton.tsx
import React, { useState } from 'react';
import { Search, Filter, TrendingUp, Star, Calendar, Gamepad2, X } from 'lucide-react';
import { useGameSearch } from '../hooks/useGameSearch';

interface ExploreGamesButtonProps {
  className?: string;
  variant?: 'primary' | 'secondary';
  showFilters?: boolean;
}

export const ExploreGamesButton: React.FC<ExploreGamesButtonProps> = ({
  className = "",
  variant = 'primary',
  showFilters = true
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'popularity' | 'rating' | 'release_date' | 'name'>('popularity');

  const { navigateToSearch, updateSearchOptions } = useGameSearch();

  // Popular genres and platforms for quick selection
  const popularGenres = [
    'Action', 'Adventure', 'RPG', 'Strategy', 'Simulation', 'Sports',
    'Racing', 'Shooter', 'Puzzle', 'Fighting', 'Platform', 'Indie'
  ];

  const popularPlatforms = [
    'PC (Microsoft Windows)', 'PlayStation 5', 'Xbox Series X|S', 
    'Nintendo Switch', 'PlayStation 4', 'Xbox One', 'iOS', 'Android'
  ];

  const handleExploreClick = () => {
    if (showFilters) {
      setIsModalOpen(true);
    } else {
      // Direct navigation to search/browse page
      navigateToSearch('', { sortBy, sortOrder: 'desc' });
    }
  };

  const handleSearch = () => {
    // Update search options
    updateSearchOptions({
      genres: selectedGenres.length > 0 ? selectedGenres : undefined,
      platforms: selectedPlatforms.length > 0 ? selectedPlatforms : undefined,
      minRating: minRating || undefined,
      sortBy,
      sortOrder: 'desc'
    });

    // Navigate to search results
    navigateToSearch(searchQuery, {
      genres: selectedGenres.length > 0 ? selectedGenres : undefined,
      platforms: selectedPlatforms.length > 0 ? selectedPlatforms : undefined,
      minRating: minRating || undefined,
      sortBy,
      sortOrder: 'desc'
    });

    setIsModalOpen(false);
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev => 
      prev.includes(genre) 
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
    );
  };

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platform) 
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedGenres([]);
    setSelectedPlatforms([]);
    setMinRating(null);
    setSortBy('popularity');
  };

  const buttonClasses = variant === 'primary'
    ? "bg-purple-600 hover:bg-purple-700 text-white"
    : "bg-gray-700 hover:bg-gray-600 text-gray-200";

  return (
    <>
      <button
        onClick={handleExploreClick}
        className={`
          inline-flex items-center px-6 py-3 rounded-lg font-semibold 
          transition-all duration-200 transform hover:scale-105 
          focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900
          ${buttonClasses} ${className}
        `}
      >
        <Search className="w-5 h-5 mr-2" />
        Explore Games
      </button>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <Gamepad2 className="w-6 h-6 mr-2 text-purple-400" />
                Explore Games
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white p-2"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Search Input */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Search for specific games (optional)
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Enter game name..."
                    className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Sort Options */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Sort by
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[
                    { value: 'popularity', label: 'Popularity', icon: TrendingUp },
                    { value: 'rating', label: 'Rating', icon: Star },
                    { value: 'release_date', label: 'Release Date', icon: Calendar },
                    { value: 'name', label: 'Name', icon: Filter }
                  ].map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => setSortBy(value as any)}
                      className={`
                        flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium transition-colors
                        ${sortBy === value 
                          ? 'bg-purple-600 text-white' 
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }
                      `}
                    >
                      <Icon className="w-4 h-4 mr-1" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Minimum Rating */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Minimum Rating
                </label>
                <div className="flex gap-2">
                  {[null, 6, 7, 8, 9].map((rating) => (
                    <button
                      key={rating || 'any'}
                      onClick={() => setMinRating(rating)}
                      className={`
                        px-4 py-2 rounded-lg text-sm font-medium transition-colors
                        ${minRating === rating 
                          ? 'bg-purple-600 text-white' 
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }
                      `}
                    >
                      {rating ? `${rating}+` : 'Any'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Genres */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Genres (select multiple)
                </label>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-2 max-h-32 overflow-y-auto">
                  {popularGenres.map((genre) => (
                    <button
                      key={genre}
                      onClick={() => toggleGenre(genre)}
                      className={`
                        px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left
                        ${selectedGenres.includes(genre) 
                          ? 'bg-purple-600 text-white' 
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }
                      `}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              </div>

              {/* Platforms */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Platforms (select multiple)
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                  {popularPlatforms.map((platform) => (
                    <button
                      key={platform}
                      onClick={() => togglePlatform(platform)}
                      className={`
                        px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left
                        ${selectedPlatforms.includes(platform) 
                          ? 'bg-purple-600 text-white' 
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }
                      `}
                    >
                      {platform}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-700">
              <button
                onClick={clearFilters}
                className="text-gray-400 hover:text-white font-medium"
              >
                Clear All Filters
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-300 hover:text-white font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSearch}
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
                >
                  <Search className="w-4 h-4 mr-2 inline" />
                  Search Games
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
