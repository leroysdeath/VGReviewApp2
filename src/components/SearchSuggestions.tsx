import React from 'react';
import { Game } from '../services/igdbService';
import { Star, Calendar, Gamepad2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface SearchSuggestionsProps {
  suggestions: Game[];
  loading: boolean;
  onSelectSuggestion: (game: Game) => void;
  onClose: () => void;
  visible: boolean;
  highlightedIndex: number;
  setHighlightedIndex: (index: number) => void;
  className?: string;
}

export const SearchSuggestions: React.FC<SearchSuggestionsProps> = ({
  suggestions,
  loading,
  onSelectSuggestion,
  onClose,
  visible,
  highlightedIndex,
  setHighlightedIndex,
  className = ''
}) => {
  if (!visible) return null;
  
  // Format rating for display
  const formatRating = (rating: number): string => {
    return rating > 0 ? rating.toFixed(1) : 'N/A';
  };

  // Format release date for display
  const formatReleaseDate = (dateString: string): string => {
    if (!dateString) return 'TBA';
    
    try {
      const date = new Date(dateString);
      return date.getFullYear().toString();
    } catch {
      return 'TBA';
    }
  };

  return (
    <div 
      className={`absolute z-50 top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-80 overflow-y-auto ${className}`}
    >
      {loading ? (
        <div className="p-4 text-center">
          <div className="inline-block h-6 w-6 border-2 border-gray-400 border-t-purple-500 rounded-full animate-spin"></div>
          <p className="text-gray-400 mt-2">Searching...</p>
        </div>
      ) : suggestions.length === 0 ? (
        <div className="p-4 text-center">
          <p className="text-gray-400">No suggestions found</p>
        </div>
      ) : (
        <div>
          <div className="p-2 border-b border-gray-700 flex items-center justify-between">
            <span className="text-sm text-gray-400">{suggestions.length} suggestions</span>
            <button 
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-white transition-colors"
              aria-label="Close suggestions"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          
          <ul role="listbox" aria-label="Game suggestions">
            {suggestions.map((game, index) => (
              <li 
                key={game.id}
                role="option"
                aria-selected={index === highlightedIndex}
                className={`p-3 hover:bg-gray-700 transition-colors cursor-pointer ${
                  index === highlightedIndex ? 'bg-gray-700' : ''
                }`}
                onClick={() => onSelectSuggestion(game)}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                <div className="flex items-center gap-3">
                  {game.coverImage ? (
                    <img 
                      src={game.coverImage} 
                      alt={game.title}
                      className="w-12 h-16 object-cover rounded"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-12 h-16 bg-gray-700 rounded flex items-center justify-center">
                      <Gamepad2 className="h-5 w-5 text-gray-500" />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-medium line-clamp-1">{game.title}</h4>
                    
                    <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                      {game.genre && <span>{game.genre}</span>}
                      
                      {game.releaseDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formatReleaseDate(game.releaseDate)}</span>
                        </div>
                      )}
                      
                      {game.rating > 0 && (
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-yellow-400 fill-current" />
                          <span>{formatRating(game.rating)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          
          <div className="p-2 border-t border-gray-700">
            <Link 
              to={`/search?q=${encodeURIComponent(suggestions[0]?.title || '')}`}
              className="block text-center text-sm text-purple-400 hover:text-purple-300 transition-colors"
              onClick={onClose}
            >
              View all results
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};