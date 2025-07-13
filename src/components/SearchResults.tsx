import React from 'react';
import { Loader2, Search } from 'lucide-react';

interface SearchResultsProps {
  results: any[]; // Replace with your game type
  isLoading: boolean;
  error: string | null;
  totalResults: number;
  searchQuery: string;
  renderItem: (item: any, index: number) => React.ReactNode;
  className?: string;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  isLoading,
  error,
  totalResults,
  searchQuery,
  renderItem,
  className = ''
}) => {
  // Loading state
  if (isLoading) {
    return (
      <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
        <Loader2 className="h-12 w-12 text-purple-500 animate-spin mb-4" />
        <p className="text-gray-300 text-lg">Searching for games...</p>
        {searchQuery && (
          <p className="text-gray-400 mt-2">Looking for "{searchQuery}"</p>
        )}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
        <div className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center mb-4">
          <span className="text-3xl">⚠️</span>
        </div>
        <p className="text-red-400 text-lg font-medium mb-2">Error loading results</p>
        <p className="text-gray-400">{error}</p>
        <button
          className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          onClick={() => window.location.reload()}
        >
          Try Again
        </button>
      </div>
    );
  }

  // Empty results
  if (results.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
        <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
          <Search className="h-8 w-8 text-gray-600" />
        </div>
        <p className="text-white text-lg font-medium mb-2">No results found</p>
        <p className="text-gray-400">
          {searchQuery 
            ? `We couldn't find any games matching "${searchQuery}"`
            : "Try adjusting your filters to find more games"
          }
        </p>
      </div>
    );
  }

  // Results found
  return (
    <div className={className}>
      <div className="mb-4 text-gray-400">
        Showing {results.length} of {totalResults} results
        {searchQuery && ` for "${searchQuery}"`}
      </div>
      
      <div className="space-y-4">
        {results.map((item, index) => renderItem(item, index))}
      </div>
    </div>
  );
};