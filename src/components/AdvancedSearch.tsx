import React, { useState } from 'react';
import { SearchBar } from './SearchBar';
import { FilterPanel } from './FilterPanel';
import { ActiveFilters } from './ActiveFilters';
import { SearchResults } from './SearchResults';
import { useSearchFilters } from '../hooks/useSearchFilters';
import { MOCK_GENRES, MOCK_PLATFORMS, SearchSuggestion } from '../types/search';
import { Filter, X } from 'lucide-react';

interface AdvancedSearchProps {
  className?: string;
  renderGameCard: (game: { id: string | number; [key: string]: unknown }, index: number) => React.ReactNode;
}

export const AdvancedSearch: React.FC<AdvancedSearchProps> = ({
  className = '',
  renderGameCard
}) => {
  const [showFilters, setShowFilters] = useState(false);
  
  const {
    query,
    filters,
    suggestions,
    isLoading,
    error,
    results,
    totalResults,
    activeFilters,
    setQuery,
    setFilters,
    removeFilter,
    clearAllFilters,
    hasActiveFilters
  } = useSearchFilters();

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
    // Handle different suggestion types
    switch (suggestion.type) {
      case 'genre': {
        const genreId = MOCK_GENRES.find(g => g.label === suggestion.title)?.id;
        if (genreId && !filters.genres.includes(genreId)) {
          setFilters({ genres: [...filters.genres, genreId] });
        }
        break;
      }
      case 'platform': {
        const platformId = MOCK_PLATFORMS.find(p => p.label === suggestion.title)?.id;
        if (platformId && !filters.platforms.includes(platformId)) {
          setFilters({ platforms: [...filters.platforms, platformId] });
        }
        break;
      }
      default:
        // For game type, just keep the search query
        break;
    }
  };

  return (
    <div className={`${className}`}>
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Mobile Filter Toggle */}
        <div className="lg:hidden flex justify-between items-center mb-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
            aria-expanded={showFilters}
            aria-controls="filter-panel"
          >
            {showFilters ? (
              <>
                <X className="h-4 w-4" />
                Hide Filters
              </>
            ) : (
              <>
                <Filter className="h-4 w-4" />
                Show Filters
                {hasActiveFilters && (
                  <span className="ml-1 w-5 h-5 bg-purple-600 rounded-full text-xs flex items-center justify-center">
                    {activeFilters.length}
                  </span>
                )}
              </>
            )}
          </button>
        </div>

        {/* Sidebar Filters - Desktop */}
        <div className={`
          lg:block lg:w-72 flex-shrink-0
          ${showFilters ? 'block' : 'hidden'}
        `} id="filter-panel">
          <FilterPanel
            filters={filters}
            onFiltersChange={setFilters}
            genreOptions={MOCK_GENRES}
            platformOptions={MOCK_PLATFORMS}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {/* Search Bar */}
          <SearchBar
            query={query}
            onQueryChange={setQuery}
            suggestions={suggestions}
            isLoading={isLoading}
            onSuggestionSelect={handleSuggestionSelect}
            className="mb-6"
          />

          {/* Active Filters */}
          <ActiveFilters
            filters={activeFilters}
            onRemoveFilter={removeFilter}
            onClearAll={clearAllFilters}
            className="mb-6"
          />

          {/* Search Results */}
          <SearchResults
            results={results}
            isLoading={isLoading}
            error={error}
            totalResults={totalResults}
            searchQuery={query}
            renderItem={renderGameCard}
          />
        </div>
      </div>
    </div>
  );
};