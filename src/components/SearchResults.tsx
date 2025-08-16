import React from 'react';
import { Loader2, Search } from 'lucide-react';

interface SearchResultsProps {
  results: any[]; // Replace with your game type
  isLoading: boolean;
  error: string | null;
  totalResults: number;aimport React, { useState, useEffect } from 'react';
import { Loader2, Search, Database, RefreshCw, Clock, AlertCircle, TrendingUp } from 'lucide-react';
import { browserCache } from '../services/browserCacheService';
// Removed IGDB cache management

interface SearchResultsProps {
  results: any[];
  isLoading: boolean;
  error: string | null;
  totalResults: number;
  searchQuery: string;
  renderItem: (item: any, index: number) => React.ReactNode;
  className?: string;
  enableCache?: boolean;
  showCacheInfo?: boolean;
  onRefresh?: () => void;
  cached?: boolean;
  cacheTimestamp?: Date;
  isStale?: boolean;
}

interface CacheStats {
  hitRate: number;
  totalQueries: number;
  cachedQueries: number;
  lastUpdated: Date | null;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  isLoading,
  error,
  totalResults,
  searchQuery,
  renderItem,
  className = '',
  enableCache = true,
  showCacheInfo = false,
  onRefresh,
  cached = false,
  cacheTimestamp,
  isStale = false
}) => {
  const [cacheStats, setCacheStats] = useState<CacheStats>({
    hitRate: 0,
    totalQueries: 0,
    cachedQueries: 0,
    lastUpdated: null
  });
  const [showStats, setShowStats] = useState(false);
  // Removed IGDB cache management

  // Update cache statistics
  useEffect(() => {
    if (enableCache && showCacheInfo) {
      const updateStats = () => {
        const searchStats = browserCache.get('searchStats') || {
          total: 0,
          cached: 0,
          lastUpdated: null
        };

        setCacheStats({
          hitRate: searchStats.total > 0 ? (searchStats.cached / searchStats.total) * 100 : 0,
          totalQueries: searchStats.total,
          cachedQueries: searchStats.cached,
          lastUpdated: searchStats.lastUpdated ? new Date(searchStats.lastUpdated) : null
        });
      };

      updateStats();
      
      // Update stats when search completes
      if (!isLoading && searchQuery) {
        const currentStats = browserCache.get('searchStats') || { total: 0, cached: 0 };
        const updatedStats = {
          total: currentStats.total + 1,
          cached: currentStats.cached + (cached ? 1 : 0),
          lastUpdated: Date.now()
        };
        browserCache.set('searchStats', updatedStats, 24 * 60 * 60); // 24 hours
        updateStats();
      }
    }
  }, [enableCache, showCacheInfo, isLoading, searchQuery, cached]);

  // Handle refresh with cache invalidation
  const handleRefresh = () => {
    if (onRefresh) {
      // Clear relevant cache entries
      if (enableCache && searchQuery) {
        const cacheKey = `search:${searchQuery}`;
        browserCache.delete(cacheKey);
        
        // Also clear suggestion cache
        const suggestionKey = `search_suggestions:${searchQuery.toLowerCase()}`;
        browserCache.delete(suggestionKey);
        
        if (import.meta.env.DEV) {
          console.log('🗑️ Cleared cache for:', searchQuery);
        }
      }
      onRefresh();
    }
  };

  const formatCacheAge = (timestamp: Date) => {
    const now = Date.now();
    const diff = now - timestamp.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
        <div className="relative">
          <Loader2 className="h-12 w-12 text-purple-500 animate-spin mb-4" />
          
          {/* Cache indicator during loading */}
          {enableCache && (
            <div className="absolute -top-2 -right-2">
              <Database className="h-5 w-5 text-blue-400 animate-pulse" />
            </div>
          )}
        </div>
        
        <p className="text-gray-300 text-lg mb-2">Searching for games...</p>
        {searchQuery && (
          <p className="text-gray-400">Looking for "{searchQuery}"</p>
        )}
        
        {/* Loading cache status */}
        {enableCache && showCacheInfo && (
          <div className="mt-4 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <span>Checking cache...</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
        <div className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="h-8 w-8 text-red-400" />
        </div>
        <p className="text-red-400 text-lg font-medium mb-2">Error loading results</p>
        <p className="text-gray-400 mb-4 text-center max-w-md">{error}</p>
        
        <div className="flex gap-3">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
          
          {enableCache && (
            <button
              onClick={() => {
                // Clear all search cache
                const keys = Object.keys(localStorage).filter(key => 
                  key.startsWith('search:') || key.startsWith('search_suggestions:')
                );
                keys.forEach(key => browserCache.delete(key));
                handleRefresh();
              }}
              className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Clear Cache & Retry
            </button>
          )}
        </div>
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
        <p className="text-gray-400 mb-4 text-center">
          {searchQuery 
            ? `We couldn't find any games matching "${searchQuery}"`
            : "Try adjusting your filters to find more games"
          }
        </p>
        
        {/* Suggestions for empty results */}
        <div className="text-center max-w-md">
          <p className="text-sm text-gray-500 mb-3">Try searching for:</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {['Cyberpunk', 'Minecraft', 'Elden Ring', 'Call of Duty'].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => {
                  // This would trigger a new search
                  console.log('Search suggestion:', suggestion);
                }}
                className="px-3 py-1 bg-gray-700 text-gray-300 rounded-full text-sm hover:bg-gray-600 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        {/* Clear cache option for empty results */}
        {enableCache && searchQuery && (
          <button
            onClick={() => {
              const cacheKey = `search:${searchQuery}`;
              browserCache.delete(cacheKey);
              handleRefresh?.();
            }}
            className="mt-4 text-sm text-purple-400 hover:text-purple-300"
          >
            Clear cache and search again
          </button>
        )}
      </div>
    );
  }

  // Results found
  return (
    <div className={className}>
      {/* Results Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="text-gray-400">
              Showing <span className="text-white font-semibold">{results.length}</span> of{' '}
              <span className="text-white font-semibold">{totalResults}</span> results
              {searchQuery && (
                <span className="ml-1">
                  for "<span className="text-purple-400">{searchQuery}</span>"
                </span>
              )}
            </div>

            {/* Cache status indicator */}
            {enableCache && (
              <div className="flex items-center gap-2">
                {cached ? (
                  <div className="flex items-center gap-1 px-2 py-1 bg-green-900/30 rounded-full">
                    <Database className="h-3 w-3 text-green-400" />
                    <span className="text-xs text-green-400">Cached</span>
                    {cacheTimestamp && (
                      <span className="text-xs text-gray-400">
                        • {formatCacheAge(cacheTimestamp)}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-1 px-2 py-1 bg-blue-900/30 rounded-full">
                    <TrendingUp className="h-3 w-3 text-blue-400" />
                    <span className="text-xs text-blue-400">Fresh</span>
                  </div>
                )}

                {isStale && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-orange-900/30 rounded-full">
                    <Clock className="h-3 w-3 text-orange-400" />
                    <span className="text-xs text-orange-400">Stale</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                onClick={handleRefresh}
                className="flex items-center gap-1 px-3 py-1 text-sm text-gray-400 hover:text-white transition-colors"
                title={isStale ? "Update stale results" : "Refresh results"}
              >
                <RefreshCw className={`h-4 w-4 ${isStale ? 'text-orange-400' : ''}`} />
                Refresh
              </button>
            )}

            {showCacheInfo && (
              <button
                onClick={() => setShowStats(!showStats)}
                className="flex items-center gap-1 px-3 py-1 text-sm text-gray-400 hover:text-white transition-colors"
              >
                <Database className="h-4 w-4" />
                Cache Info
              </button>
            )}
          </div>
        </div>

        {/* Cache Statistics Panel */}
        {showStats && showCacheInfo && enableCache && (
          <div className="bg-gray-800 rounded-lg p-4 mb-4 border border-gray-700">
            <h4 className="text-white font-medium mb-3 flex items-center gap-2">
              <Database className="h-4 w-4 text-blue-400" />
              Cache Statistics
            </h4>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Hit Rate</span>
                <div className="text-white font-semibold">
                  {cacheStats.hitRate.toFixed(1)}%
                </div>
              </div>
              
              <div>
                <span className="text-gray-400">Total Queries</span>
                <div className="text-white font-semibold">
                  {cacheStats.totalQueries}
                </div>
              </div>
              
              <div>
                <span className="text-gray-400">Cached</span>
                <div className="text-white font-semibold">
                  {cacheStats.cachedQueries}
                </div>
              </div>
              
              <div>
                <span className="text-gray-400">Global Cache</span>
                <div className="text-white font-semibold">
                  {globalCacheStats.igdbCache} items
                </div>
              </div>
            </div>

            {cacheStats.lastUpdated && (
              <div className="mt-3 pt-3 border-t border-gray-700 text-xs text-gray-400">
                Last updated: {formatCacheAge(cacheStats.lastUpdated)}
              </div>
            )}
          </div>
        )}

        {/* Performance warning for stale data */}
        {isStale && (
          <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 text-orange-400">
              <Clock className="h-4 w-4" />
              <span className="text-sm">
                These results may be outdated. 
                <button 
                  onClick={handleRefresh}
                  className="ml-1 underline hover:no-underline"
                >
                  Refresh for latest data
                </button>
              </span>
            </div>
          </div>
        )}
      </div>
      
      {/* Results Grid/List */}
      <div className="space-y-4">
        {results.map((item, index) => (
          <div key={item.id || index} className="relative">
            {renderItem(item, index)}
            
            {/* Cache indicator overlay for development */}
            {import.meta.env.DEV && enableCache && (
              <div className="absolute top-2 right-2 opacity-0 hover:opacity-100 transition-opacity">
                <div className="px-2 py-1 bg-black/75 rounded text-xs text-white">
                  {cached ? '💾 Cached' : '🌐 Fresh'}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Load more indicator */}
      {results.length < totalResults && (
        <div className="mt-8 text-center">
          <div className="text-gray-400 text-sm mb-4">
            Showing {results.length} of {totalResults} total results
          </div>
          <button
            onClick={() => {
              // This would trigger loading more results
              console.log('Load more results');
            }}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Load More Results
          </button>
        </div>
      )}
    </div>
  );
};
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
