import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SearchBar } from './SearchBar';
import { Filter, Grid, List, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { Game } from '../services/igdbService';

interface SearchHeaderProps {
  title?: string;
  subtitle?: string;
  resultCount?: number;
  onViewModeChange?: (mode: 'grid' | 'list') => void;
  viewMode?: 'grid' | 'list';
  onSortChange?: (sort: string) => void;
  sortOptions?: { value: string; label: string }[];
  onFilterToggle?: () => void;
  showFilters?: boolean;
  className?: string;
}

export const SearchHeader: React.FC<SearchHeaderProps> = ({
  title = 'Game Search',
  subtitle,
  resultCount,
  onViewModeChange,
  viewMode = 'grid',
  onSortChange,
  sortOptions = [
    { value: 'relevance', label: 'Most Relevant' },
    { value: 'rating', label: 'Highest Rated' },
    { value: 'release', label: 'Release Date' },
    { value: 'title', label: 'Title A-Z' },
  ],
  onFilterToggle,
  showFilters,
  className = ''
}) => {
  const navigate = useNavigate();
  const [sortBy, setSortBy] = useState(sortOptions[0].value);

  // Handle game selection from search
  const handleGameSelect = (game: Game) => {
    navigate(`/game/${game.id}`);
  };

  // Handle sort change
  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSort = e.target.value;
    setSortBy(newSort);
    if (onSortChange) {
      onSortChange(newSort);
    }
  };

  return (
    <div className={`${className}`}>
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{title}</h1>
        {subtitle && <p className="text-gray-400">{subtitle}</p>}
      </div>
      
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        {/* Search Bar */}
        <div className="flex-1">
          <SearchBar 
            onGameSelect={handleGameSelect}
            placeholder="Search for games..."
            showSuggestions={true}
            maxSuggestions={5}
          />
        </div>
        
        {/* Controls */}
        <div className="flex items-center gap-3">
          {/* Sort Dropdown */}
          {onSortChange && (
            <div className="relative">
              <select
                value={sortBy}
                onChange={handleSortChange}
                className="appearance-none bg-gray-800 border border-gray-700 text-white px-4 py-3 pr-10 rounded-lg focus:outline-none focus:border-purple-500"
                aria-label="Sort by"
              >
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          )}
          
          {/* View Mode Toggle */}
          {onViewModeChange && (
            <div className="flex bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => onViewModeChange('grid')}
                className={`p-2 rounded transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
                aria-label="Grid view"
                aria-pressed={viewMode === 'grid'}
              >
                <Grid className="h-5 w-5" />
              </button>
              <button
                onClick={() => onViewModeChange('list')}
                className={`p-2 rounded transition-colors ${
                  viewMode === 'list'
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
                aria-label="List view"
                aria-pressed={viewMode === 'list'}
              >
                <List className="h-5 w-5" />
              </button>
            </div>
          )}
          
          {/* Filter Toggle */}
          {onFilterToggle && (
            <button
              onClick={onFilterToggle}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-colors ${
                showFilters
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-white hover:bg-gray-700'
              }`}
              aria-label={showFilters ? 'Hide filters' : 'Show filters'}
              aria-expanded={showFilters}
            >
              <Filter className="h-5 w-5" />
              <span className="hidden md:inline">Filters</span>
            </button>
          )}
        </div>
      </div>
      
      {/* Results count */}
      {resultCount !== undefined && (
        <div className="flex items-center justify-between mb-6">
          <p className="text-gray-400">
            {resultCount > 0 
              ? `Found ${resultCount} game${resultCount !== 1 ? 's' : ''}`
              : 'No games found'
            }
          </p>
          
          {resultCount > 0 && (
            <Link 
              to="/advanced-search"
              className="text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>Advanced Search</span>
            </Link>
          )}
        </div>
      )}
    </div>
  );
};