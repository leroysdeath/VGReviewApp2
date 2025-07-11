import React, { useState, useEffect } from 'react';
import { Filter, X, Check, ChevronDown, ChevronUp, Search, RefreshCw } from 'lucide-react';
import { useResponsive } from '../hooks/useResponsive';

export interface GameFilterOptions {
  platforms?: string[];
  genres?: string[];
  releaseYears?: number[];
  ratingRange?: [number, number];
  priceRange?: [number, number];
  features?: string[];
  sortBy?: string;
  searchQuery?: string;
}

interface AdvancedGameFiltersProps {
  initialFilters?: GameFilterOptions;
  onFilterChange: (filters: GameFilterOptions) => void;
  availablePlatforms?: string[];
  availableGenres?: string[];
  availableFeatures?: string[];
  className?: string;
  loading?: boolean;
  totalResults?: number;
}

export const AdvancedGameFilters: React.FC<AdvancedGameFiltersProps> = ({
  initialFilters = {},
  onFilterChange,
  availablePlatforms = [
    'PC', 'PlayStation 5', 'PlayStation 4', 'Xbox Series X/S', 
    'Xbox One', 'Nintendo Switch', 'iOS', 'Android'
  ],
  availableGenres = [
    'Action', 'Adventure', 'RPG', 'Strategy', 'Simulation', 
    'Sports', 'Racing', 'Puzzle', 'Fighting', 'Shooter'
  ],
  availableFeatures = [
    'Multiplayer', 'Single Player', 'Co-op', 'Controller Support',
    'VR Support', 'Cloud Saves', 'Achievements', 'HDR', '4K', 'Ray Tracing'
  ],
  className = '',
  loading = false,
  totalResults = 0,
}) => {
  const [filters, setFilters] = useState<GameFilterOptions>(initialFilters);
  const [searchQuery, setSearchQuery] = useState(initialFilters.searchQuery || '');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    platforms: false,
    genres: false,
    releaseYears: false,
    ratings: false,
    price: false,
    features: false,
  });
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const { isMobile } = useResponsive();

  // Generate available release years (current year down to 1990)
  const currentYear = new Date().getFullYear();
  const availableYears = Array.from(
    { length: currentYear - 1990 + 1 },
    (_, i) => currentYear - i
  );

  // Update parent component when filters change
  useEffect(() => {
    onFilterChange(filters);
  }, [filters, onFilterChange]);

  // Toggle section expansion
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Handle platform selection
  const handlePlatformChange = (platform: string) => {
    setFilters(prev => {
      const currentPlatforms = prev.platforms || [];
      const newPlatforms = currentPlatforms.includes(platform)
        ? currentPlatforms.filter(p => p !== platform)
        : [...currentPlatforms, platform];
      
      return {
        ...prev,
        platforms: newPlatforms
      };
    });
  };

  // Handle genre selection
  const handleGenreChange = (genre: string) => {
    setFilters(prev => {
      const currentGenres = prev.genres || [];
      const newGenres = currentGenres.includes(genre)
        ? currentGenres.filter(g => g !== genre)
        : [...currentGenres, genre];
      
      return {
        ...prev,
        genres: newGenres
      };
    });
  };

  // Handle release year selection
  const handleYearChange = (year: number) => {
    setFilters(prev => {
      const currentYears = prev.releaseYears || [];
      const newYears = currentYears.includes(year)
        ? currentYears.filter(y => y !== year)
        : [...currentYears, year];
      
      return {
        ...prev,
        releaseYears: newYears
      };
    });
  };

  // Handle rating range change
  const handleRatingChange = (min: number, max: number) => {
    setFilters(prev => ({
      ...prev,
      ratingRange: [min, max]
    }));
  };

  // Handle price range change
  const handlePriceChange = (min: number, max: number) => {
    setFilters(prev => ({
      ...prev,
      priceRange: [min, max]
    }));
  };

  // Handle feature selection
  const handleFeatureChange = (feature: string) => {
    setFilters(prev => {
      const currentFeatures = prev.features || [];
      const newFeatures = currentFeatures.includes(feature)
        ? currentFeatures.filter(f => f !== feature)
        : [...currentFeatures, feature];
      
      return {
        ...prev,
        features: newFeatures
      };
    });
  };

  // Handle sort change
  const handleSortChange = (sortBy: string) => {
    setFilters(prev => ({
      ...prev,
      sortBy
    }));
  };

  // Handle search
  const handleSearch = () => {
    setFilters(prev => ({
      ...prev,
      searchQuery
    }));
  };

  // Reset all filters
  const resetFilters = () => {
    setFilters({});
    setSearchQuery('');
  };

  // Count active filters
  const countActiveFilters = () => {
    let count = 0;
    if (filters.platforms?.length) count += filters.platforms.length;
    if (filters.genres?.length) count += filters.genres.length;
    if (filters.releaseYears?.length) count += filters.releaseYears.length;
    if (filters.features?.length) count += filters.features.length;
    if (filters.ratingRange && (filters.ratingRange[0] > 0 || filters.ratingRange[1] < 10)) count += 1;
    if (filters.priceRange && (filters.priceRange[0] > 0 || filters.priceRange[1] < 100)) count += 1;
    if (filters.searchQuery) count += 1;
    return count;
  };

  // Render filter section
  const renderFilterSection = (
    title: string,
    sectionKey: string,
    content: React.ReactNode
  ) => {
    const isExpanded = expandedSections[sectionKey];
    
    return (
      <div className="border-b border-gray-700 pb-4">
        <button
          onClick={() => toggleSection(sectionKey)}
          className="flex items-center justify-between w-full py-3 text-left"
        >
          <span className="font-medium text-white">{title}</span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </button>
        
        {isExpanded && (
          <div className="mt-2 space-y-2">
            {content}
          </div>
        )}
      </div>
    );
  };

  // Mobile filter drawer
  const renderMobileFilterDrawer = () => {
    if (!showMobileFilters) return null;
    
    return (
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
        <div className="absolute inset-y-0 right-0 w-80 max-w-full bg-gray-900 shadow-xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <h3 className="text-lg font-semibold text-white">Filters</h3>
            <button
              onClick={() => setShowMobileFilters(false)}
              className="p-2 text-gray-400 hover:text-white"
              aria-label="Close filters"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {/* Filter content - scrollable */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search games..."
                  className="w-full px-4 py-3 pr-10 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-game-purple"
                />
                <button
                  onClick={handleSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  aria-label="Search"
                >
                  <Search className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            {/* Filter sections */}
            <div className="space-y-4">
              {renderFilterSection(
                'Platforms',
                'platforms',
                <div className="grid grid-cols-2 gap-2">
                  {availablePlatforms.map((platform) => (
                    <label
                      key={platform}
                      className="flex items-center gap-2 p-2 bg-gray-800 rounded hover:bg-gray-750 transition-colors cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={(filters.platforms || []).includes(platform)}
                        onChange={() => handlePlatformChange(platform)}
                        className="h-4 w-4 text-game-purple bg-gray-700 border-gray-600 rounded focus:ring-game-purple focus:ring-2"
                      />
                      <span className="text-sm text-white">{platform}</span>
                    </label>
                  ))}
                </div>
              )}
              
              {renderFilterSection(
                'Genres',
                'genres',
                <div className="grid grid-cols-2 gap-2">
                  {availableGenres.map((genre) => (
                    <label
                      key={genre}
                      className="flex items-center gap-2 p-2 bg-gray-800 rounded hover:bg-gray-750 transition-colors cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={(filters.genres || []).includes(genre)}
                        onChange={() => handleGenreChange(genre)}
                        className="h-4 w-4 text-game-purple bg-gray-700 border-gray-600 rounded focus:ring-game-purple focus:ring-2"
                      />
                      <span className="text-sm text-white">{genre}</span>
                    </label>
                  ))}
                </div>
              )}
              
              {renderFilterSection(
                'Release Year',
                'releaseYears',
                <div className="grid grid-cols-3 gap-2">
                  {availableYears.slice(0, 12).map((year) => (
                    <label
                      key={year}
                      className="flex items-center gap-2 p-2 bg-gray-800 rounded hover:bg-gray-750 transition-colors cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={(filters.releaseYears || []).includes(year)}
                        onChange={() => handleYearChange(year)}
                        className="h-4 w-4 text-game-purple bg-gray-700 border-gray-600 rounded focus:ring-game-purple focus:ring-2"
                      />
                      <span className="text-sm text-white">{year}</span>
                    </label>
                  ))}
                </div>
              )}
              
              {renderFilterSection(
                'Rating',
                'ratings',
                <div className="px-2">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-400">
                      {filters.ratingRange?.[0] || 0}
                    </span>
                    <span className="text-sm text-gray-400">
                      {filters.ratingRange?.[1] || 10}
                    </span>
                  </div>
                  <div className="flex gap-4 items-center">
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="0.5"
                      value={filters.ratingRange?.[0] || 0}
                      onChange={(e) => handleRatingChange(parseFloat(e.target.value), filters.ratingRange?.[1] || 10)}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="0.5"
                      value={filters.ratingRange?.[1] || 10}
                      onChange={(e) => handleRatingChange(filters.ratingRange?.[0] || 0, parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>
              )}
              
              {renderFilterSection(
                'Features',
                'features',
                <div className="grid grid-cols-1 gap-2">
                  {availableFeatures.map((feature) => (
                    <label
                      key={feature}
                      className="flex items-center gap-2 p-2 bg-gray-800 rounded hover:bg-gray-750 transition-colors cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={(filters.features || []).includes(feature)}
                        onChange={() => handleFeatureChange(feature)}
                        className="h-4 w-4 text-game-purple bg-gray-700 border-gray-600 rounded focus:ring-game-purple focus:ring-2"
                      />
                      <span className="text-sm text-white">{feature}</span>
                    </label>
                  ))}
                </div>
              )}
              
              {renderFilterSection(
                'Sort By',
                'sortBy',
                <div className="space-y-2">
                  {['Relevance', 'Rating (High to Low)', 'Rating (Low to High)', 'Release Date (Newest)', 'Release Date (Oldest)', 'Name (A-Z)', 'Name (Z-A)'].map((option) => (
                    <label
                      key={option}
                      className="flex items-center gap-2 p-2 bg-gray-800 rounded hover:bg-gray-750 transition-colors cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="sortBy"
                        checked={filters.sortBy === option}
                        onChange={() => handleSortChange(option)}
                        className="h-4 w-4 text-game-purple bg-gray-700 border-gray-600 focus:ring-game-purple focus:ring-2"
                      />
                      <span className="text-sm text-white">{option}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Footer with actions */}
          <div className="p-4 border-t border-gray-800">
            <div className="flex gap-3">
              <button
                onClick={resetFilters}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Reset
              </button>
              
              <button
                onClick={() => setShowMobileFilters(false)}
                className="flex-1 px-4 py-2 bg-game-purple text-white rounded-lg hover:bg-game-purple/90 transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Desktop layout
  const renderDesktopFilters = () => {
    return (
      <div className="grid grid-cols-[250px,1fr] gap-6">
        {/* Sidebar filters */}
        <div className="bg-gray-800 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-white">Filters</h3>
            <button
              onClick={resetFilters}
              className="text-sm text-game-purple hover:text-game-purple/80 transition-colors"
            >
              Reset All
            </button>
          </div>
          
          {/* Search */}
          <div className="relative mb-6">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search games..."
              className="w-full px-4 py-2 pr-10 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-game-purple"
            />
            <button
              onClick={handleSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </button>
          </div>
          
          {/* Filter sections */}
          <div className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
            {renderFilterSection(
              'Platforms',
              'platforms',
              <div className="space-y-1">
                {availablePlatforms.map((platform) => (
                  <label
                    key={platform}
                    className="flex items-center gap-2 p-2 hover:bg-gray-700 rounded transition-colors cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={(filters.platforms || []).includes(platform)}
                      onChange={() => handlePlatformChange(platform)}
                      className="h-4 w-4 text-game-purple bg-gray-700 border-gray-600 rounded focus:ring-game-purple focus:ring-2"
                    />
                    <span className="text-sm text-white">{platform}</span>
                  </label>
                ))}
              </div>
            )}
            
            {renderFilterSection(
              'Genres',
              'genres',
              <div className="space-y-1">
                {availableGenres.map((genre) => (
                  <label
                    key={genre}
                    className="flex items-center gap-2 p-2 hover:bg-gray-700 rounded transition-colors cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={(filters.genres || []).includes(genre)}
                      onChange={() => handleGenreChange(genre)}
                      className="h-4 w-4 text-game-purple bg-gray-700 border-gray-600 rounded focus:ring-game-purple focus:ring-2"
                    />
                    <span className="text-sm text-white">{genre}</span>
                  </label>
                ))}
              </div>
            )}
            
            {renderFilterSection(
              'Release Year',
              'releaseYears',
              <div className="grid grid-cols-2 gap-2">
                {availableYears.slice(0, 10).map((year) => (
                  <label
                    key={year}
                    className="flex items-center gap-2 p-2 hover:bg-gray-700 rounded transition-colors cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={(filters.releaseYears || []).includes(year)}
                      onChange={() => handleYearChange(year)}
                      className="h-4 w-4 text-game-purple bg-gray-700 border-gray-600 rounded focus:ring-game-purple focus:ring-2"
                    />
                    <span className="text-sm text-white">{year}</span>
                  </label>
                ))}
              </div>
            )}
            
            {/* More filter sections as needed */}
          </div>
        </div>
        
        {/* Main content area */}
        <div>
          {/* Results header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-white">
                {loading ? 'Searching...' : `${totalResults} Games Found`}
              </h2>
              {countActiveFilters() > 0 && (
                <p className="text-sm text-gray-400">
                  {countActiveFilters()} active filters
                </p>
              )}
            </div>
            
            {/* Sort dropdown */}
            <div className="relative">
              <select
                value={filters.sortBy || 'Relevance'}
                onChange={(e) => handleSortChange(e.target.value)}
                className="appearance-none bg-gray-800 border border-gray-700 text-white px-4 py-2 pr-10 rounded-lg focus:outline-none focus:border-game-purple"
              >
                <option value="Relevance">Relevance</option>
                <option value="Rating (High to Low)">Rating (High to Low)</option>
                <option value="Rating (Low to High)">Rating (Low to High)</option>
                <option value="Release Date (Newest)">Release Date (Newest)</option>
                <option value="Release Date (Oldest)">Release Date (Oldest)</option>
                <option value="Name (A-Z)">Name (A-Z)</option>
                <option value="Name (Z-A)">Name (Z-A)</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
          
          {/* Active filters */}
          {countActiveFilters() > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {filters.searchQuery && (
                <div className="flex items-center gap-1 px-3 py-1 bg-game-purple/20 text-game-purple rounded-full text-sm">
                  <span>Search: {filters.searchQuery}</span>
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, searchQuery: undefined }))}
                    className="ml-1 text-game-purple hover:text-white"
                    aria-label="Remove search filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              
              {filters.platforms?.map(platform => (
                <div key={platform} className="flex items-center gap-1 px-3 py-1 bg-gray-700 text-white rounded-full text-sm">
                  <span>{platform}</span>
                  <button
                    onClick={() => handlePlatformChange(platform)}
                    className="ml-1 text-gray-400 hover:text-white"
                    aria-label={`Remove ${platform} filter`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              
              {filters.genres?.map(genre => (
                <div key={genre} className="flex items-center gap-1 px-3 py-1 bg-gray-700 text-white rounded-full text-sm">
                  <span>{genre}</span>
                  <button
                    onClick={() => handleGenreChange(genre)}
                    className="ml-1 text-gray-400 hover:text-white"
                    aria-label={`Remove ${genre} filter`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              
              {/* More active filters as needed */}
              
              <button
                onClick={resetFilters}
                className="flex items-center gap-1 px-3 py-1 bg-gray-700 text-white rounded-full text-sm hover:bg-gray-600 transition-colors"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Reset All</span>
              </button>
            </div>
          )}
          
          {/* Game results would go here */}
          <div className="bg-gray-800 rounded-lg p-6 text-center">
            <p className="text-gray-400">
              {loading
                ? 'Loading games...'
                : totalResults > 0
                ? 'Game results would appear here'
                : 'No games found matching your filters'}
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Mobile layout
  const renderMobileFilters = () => {
    return (
      <div className="space-y-4">
        {/* Search and filter bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search games..."
              className="w-full px-4 py-3 pr-10 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-game-purple"
            />
            <button
              onClick={handleSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </button>
          </div>
          
          <button
            onClick={() => setShowMobileFilters(true)}
            className="flex items-center gap-2 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
          >
            <Filter className="h-5 w-5" />
            {countActiveFilters() > 0 && (
              <span className="bg-game-purple text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                {countActiveFilters()}
              </span>
            )}
          </button>
        </div>
        
        {/* Active filters */}
        {countActiveFilters() > 0 && (
          <div className="flex overflow-x-auto pb-2 gap-2 hide-scrollbar">
            {filters.platforms?.slice(0, 2).map(platform => (
              <div key={platform} className="flex-shrink-0 flex items-center gap-1 px-3 py-1 bg-gray-800 text-white rounded-full text-sm">
                <span>{platform}</span>
                <button
                  onClick={() => handlePlatformChange(platform)}
                  className="ml-1 text-gray-400 hover:text-white"
                  aria-label={`Remove ${platform} filter`}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            
            {filters.genres?.slice(0, 2).map(genre => (
              <div key={genre} className="flex-shrink-0 flex items-center gap-1 px-3 py-1 bg-gray-800 text-white rounded-full text-sm">
                <span>{genre}</span>
                <button
                  onClick={() => handleGenreChange(genre)}
                  className="ml-1 text-gray-400 hover:text-white"
                  aria-label={`Remove ${genre} filter`}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            
            {countActiveFilters() > 4 && (
              <div className="flex-shrink-0 px-3 py-1 bg-gray-800 text-white rounded-full text-sm">
                +{countActiveFilters() - 4} more
              </div>
            )}
            
            <button
              onClick={resetFilters}
              className="flex-shrink-0 flex items-center gap-1 px-3 py-1 bg-gray-700 text-white rounded-full text-sm"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Reset</span>
            </button>
          </div>
        )}
        
        {/* Sort dropdown */}
        <div className="relative">
          <select
            value={filters.sortBy || 'Relevance'}
            onChange={(e) => handleSortChange(e.target.value)}
            className="w-full appearance-none bg-gray-800 border border-gray-700 text-white px-4 py-3 pr-10 rounded-lg focus:outline-none focus:border-game-purple"
          >
            <option value="Relevance">Sort by: Relevance</option>
            <option value="Rating (High to Low)">Sort by: Rating (High to Low)</option>
            <option value="Rating (Low to High)">Sort by: Rating (Low to High)</option>
            <option value="Release Date (Newest)">Sort by: Release Date (Newest)</option>
            <option value="Release Date (Oldest)">Sort by: Release Date (Oldest)</option>
            <option value="Name (A-Z)">Sort by: Name (A-Z)</option>
            <option value="Name (Z-A)">Sort by: Name (Z-A)</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
        </div>
        
        {/* Results count */}
        <div className="text-center text-sm text-gray-400">
          {loading ? 'Searching...' : `${totalResults} games found`}
        </div>
        
        {/* Mobile filter drawer */}
        {renderMobileFilterDrawer()}
      </div>
    );
  };

  return (
    <div className={className}>
      {isMobile ? renderMobileFilters() : renderDesktopFilters()}
    </div>
  );
};