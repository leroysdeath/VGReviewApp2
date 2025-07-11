import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Filter, Check } from 'lucide-react';
import { GameSearchFilters, GenreOption, PlatformOption, SORT_OPTIONS } from '../types/search';
import ReactSlider from 'react-slider';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface FilterPanelProps {
  filters: GameSearchFilters;
  onFiltersChange: (filters: Partial<GameSearchFilters>) => void;
  genreOptions: GenreOption[];
  platformOptions: PlatformOption[];
  className?: string;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onFiltersChange,
  genreOptions,
  platformOptions,
  className = ''
}) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    genres: true,
    platforms: true,
    rating: true,
    releaseDate: true,
    sort: true
  });

  // Toggle section expansion
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Handle genre checkbox change
  const handleGenreChange = (genreId: string, checked: boolean) => {
    const updatedGenres = checked
      ? [...filters.genres, genreId]
      : filters.genres.filter(id => id !== genreId);
    
    onFiltersChange({ genres: updatedGenres });
  };

  // Handle platform checkbox change
  const handlePlatformChange = (platformId: string, checked: boolean) => {
    const updatedPlatforms = checked
      ? [...filters.platforms, platformId]
      : filters.platforms.filter(id => id !== platformId);
    
    onFiltersChange({ platforms: updatedPlatforms });
  };

  // Handle rating range change
  const handleRatingChange = (value: [number, number]) => {
    onFiltersChange({ ratingRange: value });
  };

  // Handle release year range change
  const handleReleaseYearChange = (value: [number, number]) => {
    onFiltersChange({ releaseYearRange: value });
  };

  // Handle sort option change
  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({ sortBy: e.target.value as any });
  };

  // Format year for display
  const formatYear = (year: number) => {
    return year.toString();
  };

  return (
    <div className={`bg-gray-800 rounded-xl border border-gray-700 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700 bg-gray-750">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filters
        </h2>
      </div>

      {/* Filter Sections */}
      <div className="p-4 space-y-6">
        {/* Sort Options */}
        <div>
          <button
            onClick={() => toggleSection('sort')}
            className="flex items-center justify-between w-full text-left mb-2"
          >
            <h3 className="text-white font-medium">Sort By</h3>
            {expandedSections.sort ? (
              <ChevronUp className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            )}
          </button>
          
          {expandedSections.sort && (
            <div className="mt-2">
              <select
                value={filters.sortBy}
                onChange={handleSortChange}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                aria-label="Sort options"
              >
                {SORT_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Genres */}
        <div>
          <button
            onClick={() => toggleSection('genres')}
            className="flex items-center justify-between w-full text-left mb-2"
          >
            <h3 className="text-white font-medium">Genres</h3>
            {expandedSections.genres ? (
              <ChevronUp className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            )}
          </button>
          
          {expandedSections.genres && (
            <div className="mt-2 max-h-60 overflow-y-auto pr-2 space-y-2">
              {genreOptions.map(genre => (
                <label
                  key={genre.id}
                  className="flex items-center gap-3 p-2 hover:bg-gray-700 rounded-lg cursor-pointer transition-colors"
                >
                  <div className="relative flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={filters.genres.includes(genre.id)}
                      onChange={(e) => handleGenreChange(genre.id, e.target.checked)}
                      className="sr-only"
                      aria-label={`Genre: ${genre.label}`}
                    />
                    <div className={`
                      w-5 h-5 rounded border transition-colors
                      ${filters.genres.includes(genre.id) 
                        ? 'bg-purple-600 border-purple-600' 
                        : 'bg-gray-700 border-gray-600'}
                    `}>
                      {filters.genres.includes(genre.id) && (
                        <Check className="h-4 w-4 text-white" />
                      )}
                    </div>
                  </div>
                  <span className="text-white">{genre.label}</span>
                  {genre.count !== undefined && (
                    <span className="text-gray-400 text-sm ml-auto">{genre.count}</span>
                  )}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Platforms */}
        <div>
          <button
            onClick={() => toggleSection('platforms')}
            className="flex items-center justify-between w-full text-left mb-2"
          >
            <h3 className="text-white font-medium">Platforms</h3>
            {expandedSections.platforms ? (
              <ChevronUp className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            )}
          </button>
          
          {expandedSections.platforms && (
            <div className="mt-2 max-h-60 overflow-y-auto pr-2 space-y-2">
              {platformOptions.map(platform => (
                <label
                  key={platform.id}
                  className="flex items-center gap-3 p-2 hover:bg-gray-700 rounded-lg cursor-pointer transition-colors"
                >
                  <div className="relative flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={filters.platforms.includes(platform.id)}
                      onChange={(e) => handlePlatformChange(platform.id, e.target.checked)}
                      className="sr-only"
                      aria-label={`Platform: ${platform.label}`}
                    />
                    <div className={`
                      w-5 h-5 rounded border transition-colors
                      ${filters.platforms.includes(platform.id) 
                        ? 'bg-purple-600 border-purple-600' 
                        : 'bg-gray-700 border-gray-600'}
                    `}>
                      {filters.platforms.includes(platform.id) && (
                        <Check className="h-4 w-4 text-white" />
                      )}
                    </div>
                  </div>
                  <span className="text-white">{platform.label}</span>
                  {platform.count !== undefined && (
                    <span className="text-gray-400 text-sm ml-auto">{platform.count}</span>
                  )}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Rating Range */}
        <div>
          <button
            onClick={() => toggleSection('rating')}
            className="flex items-center justify-between w-full text-left mb-2"
          >
            <h3 className="text-white font-medium">Rating</h3>
            {expandedSections.rating ? (
              <ChevronUp className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            )}
          </button>
          
          {expandedSections.rating && (
            <div className="mt-4 px-2">
              <div className="flex justify-between mb-2">
                <span className="text-gray-400 text-sm">{filters.ratingRange[0]}/10</span>
                <span className="text-gray-400 text-sm">{filters.ratingRange[1]}/10</span>
              </div>
              
              <ReactSlider
                className="h-2 bg-gray-700 rounded-full"
                thumbClassName="w-5 h-5 bg-purple-600 rounded-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 -mt-1.5"
                trackClassName="h-2 bg-purple-600 rounded-full"
                value={filters.ratingRange}
                onChange={handleRatingChange}
                min={0}
                max={10}
                step={0.5}
                pearling
                minDistance={1}
                ariaLabel={['Minimum rating', 'Maximum rating']}
                ariaValuetext={state => `Rating: ${state} out of 10`}
              />
              
              <div className="flex justify-between mt-1">
                <span className="text-gray-400 text-xs">Min</span>
                <span className="text-gray-400 text-xs">Max</span>
              </div>
            </div>
          )}
        </div>

        {/* Release Year Range */}
        <div>
          <button
            onClick={() => toggleSection('releaseDate')}
            className="flex items-center justify-between w-full text-left mb-2"
          >
            <h3 className="text-white font-medium">Release Year</h3>
            {expandedSections.releaseDate ? (
              <ChevronUp className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            )}
          </button>
          
          {expandedSections.releaseDate && (
            <div className="mt-4 px-2">
              <div className="flex justify-between mb-2">
                <span className="text-gray-400 text-sm">{formatYear(filters.releaseYearRange[0])}</span>
                <span className="text-gray-400 text-sm">{formatYear(filters.releaseYearRange[1])}</span>
              </div>
              
              <ReactSlider
                className="h-2 bg-gray-700 rounded-full"
                thumbClassName="w-5 h-5 bg-purple-600 rounded-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 -mt-1.5"
                trackClassName="h-2 bg-purple-600 rounded-full"
                value={filters.releaseYearRange}
                onChange={handleReleaseYearChange}
                min={1990}
                max={new Date().getFullYear()}
                step={1}
                pearling
                minDistance={1}
                ariaLabel={['Minimum release year', 'Maximum release year']}
                ariaValuetext={state => `Year: ${state}`}
              />
              
              <div className="flex justify-between mt-1">
                <span className="text-gray-400 text-xs">Oldest</span>
                <span className="text-gray-400 text-xs">Newest</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};