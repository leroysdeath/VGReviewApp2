import React from 'react';
import { Loader2, Clock, Search as SearchIcon } from 'lucide-react';

interface SearchStatusProps {
  isSearching: boolean;
  hasQuery: boolean;
  willSearch: boolean;
  searchDelay?: number;
  className?: string;
}

export const SearchStatus: React.FC<SearchStatusProps> = ({
  isSearching,
  hasQuery,
  willSearch,
  searchDelay = 1500,
  className = ""
}) => {
  if (isSearching) {
    return (
      <div className={`flex items-center gap-2 text-purple-400 ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Searching...</span>
      </div>
    );
  }

  if (hasQuery && willSearch) {
    return (
      <div className={`flex items-center gap-2 text-gray-400 ${className}`}>
        <Clock className="h-4 w-4" />
        <span className="text-sm">
          Auto-search in {searchDelay / 1000}s or press Enter
        </span>
      </div>
    );
  }

  if (hasQuery && !willSearch) {
    return (
      <div className={`flex items-center gap-2 text-gray-500 ${className}`}>
        <SearchIcon className="h-4 w-4" />
        <span className="text-sm">
          Press Enter or click Search
        </span>
      </div>
    );
  }

  return null;
};