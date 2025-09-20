import React, { useState, useEffect } from 'react';
import { Search, AlertCircle, Plus, RefreshCw } from 'lucide-react';
import { unifiedSearchService } from '../services/unifiedSearchService';
import type { GameWithCalculatedFields } from '../types/database';

interface SearchFallbackProps {
  query: string;
  onExpandedResults?: (results: GameWithCalculatedFields[]) => void;
  onRequestGame?: (query: string) => void;
}

export const SearchFallback: React.FC<SearchFallbackProps> = ({
  query,
  onExpandedResults,
  onRequestGame
}) => {
  const [isExpanding, setIsExpanding] = useState(false);
  const [expandedResults, setExpandedResults] = useState<GameWithCalculatedFields[]>([]);
  const [showExpanded, setShowExpanded] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  const handleExpandSearch = async () => {
    setIsExpanding(true);
    try {
      // Search with no filters to show all results
      const unfiltered = await unifiedSearchService.search(query, {
        includeIGDB: true,
        limit: 100,
        applyFilters: false,
        includeUnverified: true
      });

      setExpandedResults(unfiltered);
      setShowExpanded(true);

      if (onExpandedResults) {
        onExpandedResults(unfiltered);
      }
    } catch (error) {
      console.error('Failed to expand search:', error);
    } finally {
      setIsExpanding(false);
    }
  };

  const handleRequestGame = async () => {
    if (onRequestGame) {
      onRequestGame(query);
      setRequestSent(true);
    } else {
      // Default behavior: log the request
      console.log('Game request for:', query);
      setRequestSent(true);
    }
  };

  // Reset request sent state after 3 seconds with cleanup
  useEffect(() => {
    if (requestSent) {
      const timer = setTimeout(() => setRequestSent(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [requestSent]);

  return (
    <div className="p-6 bg-gray-800 rounded-lg border border-gray-700 mt-4">
      <div className="flex items-start space-x-3 mb-4">
        <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-2">
            Not finding what you're looking for?
          </h3>
          <p className="text-gray-400 text-sm">
            The game "{query}" might not be in our database yet, or it could be filtered for content protection reasons.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleExpandSearch}
          disabled={isExpanding || showExpanded}
          className="flex items-center justify-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isExpanding ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Searching...</span>
            </>
          ) : showExpanded ? (
            <>
              <Search className="h-4 w-4" />
              <span>Showing All Results</span>
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              <span>Search All Games (Unfiltered)</span>
            </>
          )}
        </button>

        <button
          onClick={handleRequestGame}
          disabled={requestSent}
          className="flex items-center justify-center space-x-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {requestSent ? (
            <>
              <Plus className="h-4 w-4" />
              <span>Request Sent!</span>
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              <span>Request This Game</span>
            </>
          )}
        </button>
      </div>

      {showExpanded && expandedResults.length > 0 && (
        <div className="mt-4 p-4 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <AlertCircle className="h-4 w-4 text-yellow-400" />
            <p className="text-sm text-yellow-200">
              Showing {expandedResults.length} unfiltered results. Some content may be unofficial or fan-made.
            </p>
          </div>

          <div className="max-h-60 overflow-y-auto mt-3 space-y-2">
            {expandedResults.slice(0, 20).map((game) => (
              <div
                key={`${game.igdb_id || game.id}`}
                className="flex items-center space-x-3 p-2 bg-gray-700/50 rounded hover:bg-gray-700 transition-colors cursor-pointer"
              >
                {game.cover_url && (
                  <img
                    src={game.cover_url}
                    alt={game.name}
                    className="w-10 h-12 object-cover rounded"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{game.name}</p>
                  {game.first_release_date && (
                    <p className="text-gray-400 text-xs">
                      {new Date(game.first_release_date * 1000).getFullYear()}
                    </p>
                  )}
                </div>
                {!game.id && (
                  <span className="text-xs text-yellow-400 bg-yellow-900/30 px-2 py-1 rounded">
                    IGDB Only
                  </span>
                )}
              </div>
            ))}
            {expandedResults.length > 20 && (
              <p className="text-center text-gray-400 text-sm pt-2">
                And {expandedResults.length - 20} more results...
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};