import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Wrench, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { dlcService, type DLCGame } from '../services/dlcService';

interface ModSectionProps {
  gameId: number;
  className?: string;
}

export const ModSection: React.FC<ModSectionProps> = ({ gameId, className = '' }) => {
  const [modItems, setModItems] = useState<DLCGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchMods = async () => {
      if (!gameId) return;

      setLoading(true);
      setError(null);

      try {
        const modData = await dlcService.getModsForGame(gameId);
        setModItems(modData);
      } catch (err) {
        console.error('Error fetching mods:', err);
        setError('Failed to load mod content');
      } finally {
        setLoading(false);
      }
    };

    fetchMods();
  }, [gameId]);

  // Check scroll position and update button states
  const checkScrollButtons = () => {
    if (!scrollContainerRef.current) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
  };

  useEffect(() => {
    checkScrollButtons();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollButtons);
      return () => container.removeEventListener('scroll', checkScrollButtons);
    }
  }, [modItems]);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    
    const itemWidth = 120; // Width of each mod item + gap
    const scrollAmount = itemWidth * 3; // Scroll 3 items at a time
    
    scrollContainerRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  // Don't render anything if no mods found
  if (!loading && modItems.length === 0) {
    return null;
  }

  return (
    <div className={`bg-gradient-to-br from-gray-900/80 to-gray-800/70 rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wrench className="h-5 w-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Mods & Fan Content</h3>
          {!loading && modItems.length > 0 && (
            <span className="text-sm text-gray-400">({modItems.length})</span>
          )}
        </div>
        
        {!loading && modItems.length > 6 && (
          <div className="flex gap-2">
            <button
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
              className={`p-2 rounded-full transition-colors flex items-center justify-center ${
                canScrollLeft
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-gray-800 text-gray-600 cursor-not-allowed'
              }`}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
              className={`p-2 rounded-full transition-colors flex items-center justify-center ${
                canScrollRight
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-gray-800 text-gray-600 cursor-not-allowed'
              }`}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      <div className="text-xs text-gray-400 mb-3">
        <span className="inline-flex items-center gap-1">
          <Star className="h-3 w-3" />
          Community-created content and modifications
        </span>
      </div>

      {loading ? (
        <div className="flex gap-3 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-24 animate-pulse">
              <div className="w-24 h-32 bg-gray-600 rounded-lg mb-2"></div>
              <div className="h-3 bg-gray-600 rounded mb-1"></div>
              <div className="h-2 bg-gray-600 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      ) : (
        <div 
          ref={scrollContainerRef}
          className="flex gap-3 overflow-x-auto hide-scrollbar pb-2"
        >
          {modItems.map((mod) => (
            <Link
              key={mod.id}
              to={`/game/${mod.id}`}
              className="flex-shrink-0 w-24 group"
            >
              <div className="relative overflow-hidden rounded-lg mb-2">
                <img
                  src={mod.cover?.url ? dlcService.transformImageUrl(mod.cover.url) : '/placeholder-game.jpg'}
                  alt={mod.name}
                  className="w-24 h-32 object-cover group-hover:scale-105 transition-transform duration-200"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder-game.jpg';
                  }}
                />
                <div className="absolute top-1 right-1 bg-blue-600 bg-opacity-90 px-1 py-0.5 rounded text-xs text-white text-[10px]">
                  MOD
                </div>
              </div>
              
              <div>
                <h4 className="text-white font-medium text-xs mb-1 line-clamp-2 group-hover:text-blue-400 transition-colors leading-tight">
                  {mod.name}
                </h4>
                
                {mod.first_release_date && (
                  <div className="flex items-center gap-1 text-gray-400 text-[10px]">
                    <Calendar className="h-2.5 w-2.5" />
                    <span>{new Date(mod.first_release_date * 1000).getFullYear()}</span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};