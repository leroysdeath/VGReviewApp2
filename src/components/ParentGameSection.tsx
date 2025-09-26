import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Calendar } from 'lucide-react';
import { dlcService, type DLCGame } from '../services/dlcService';

interface ParentGameSectionProps {
  dlcId: number;
  className?: string;
}

export const ParentGameSection: React.FC<ParentGameSectionProps> = ({ dlcId, className = '' }) => {
  const [parentGame, setParentGame] = useState<DLCGame | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchParentGame = async () => {
      if (!dlcId) return;

      setLoading(true);
      setError(null);

      try {
        const parentData = await dlcService.getParentGame(dlcId);
        setParentGame(parentData);
      } catch (err) {
        console.error('Error fetching parent game:', err);
        setError('Failed to load main game');
      } finally {
        setLoading(false);
      }
    };

    fetchParentGame();
  }, [dlcId]);

  // Don't render anything if no parent game found
  if (!loading && !parentGame) {
    return null;
  }

  return (
    <div className={`bg-gradient-to-br from-gray-900/80 to-gray-800/70 rounded-lg p-6 border-l-4 border-purple-500 ${className}`}>
      {loading ? (
        <div className="animate-pulse">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-4 w-4 bg-gray-600 rounded"></div>
            <div className="h-4 bg-gray-600 rounded w-24"></div>
          </div>
          <div className="flex gap-4">
            <div className="w-16 h-20 bg-gray-600 rounded"></div>
            <div className="flex-1">
              <div className="h-5 bg-gray-600 rounded mb-2"></div>
              <div className="h-3 bg-gray-600 rounded w-1/3"></div>
            </div>
          </div>
        </div>
      ) : error ? (
        <div className="text-center py-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      ) : parentGame ? (
        <>
          <div className="flex items-center gap-2 mb-3">
            <ArrowLeft className="h-4 w-4 text-purple-400" />
            <span className="text-sm text-purple-400 font-medium">Main Game</span>
          </div>
          
          <Link
            to={`/game/${parentGame.id}`}
            className="flex gap-4 hover:bg-gray-700 rounded-lg p-2 -m-2 transition-colors group"
          >
            <div className="flex-shrink-0">
              <img
                src={parentGame.cover?.url ? dlcService.transformImageUrl(parentGame.cover.url) : '/placeholder-game.jpg'}
                alt={parentGame.name}
                className="w-16 h-20 object-cover rounded group-hover:scale-105 transition-transform duration-200"
                onError={(e) => {
                  e.currentTarget.src = '/placeholder-game.jpg';
                }}
              />
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="text-white font-medium mb-1 group-hover:text-purple-400 transition-colors">
                {parentGame.name}
              </h4>
              
              {parentGame.first_release_date && (
                <div className="flex items-center gap-1 text-gray-400 text-sm mb-2">
                  <Calendar className="h-3 w-3" />
                  <span>{new Date(parentGame.first_release_date * 1000).getFullYear()}</span>
                </div>
              )}
              
              {parentGame.summary && (
                <p className="text-gray-300 text-sm line-clamp-2">
                  {parentGame.summary}
                </p>
              )}
            </div>
          </Link>
        </>
      ) : null}
    </div>
  );
};