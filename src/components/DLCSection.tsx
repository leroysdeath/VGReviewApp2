import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Package, ChevronLeft, ChevronRight } from 'lucide-react';
import { dlcService, type DLCGame } from '../services/dlcService';

interface DLCSectionProps {
  gameId: number;
  className?: string;
}

export const DLCSection: React.FC<DLCSectionProps> = ({ gameId, className = '' }) => {
  const [dlcItems, setDlcItems] = useState<DLCGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchDLC = async () => {
      if (!gameId) return;

      setLoading(true);
      setError(null);

      try {
        const dlcData = await dlcService.getDLCForGame(gameId);
        setDlcItems(dlcData);
      } catch (err) {
        console.error('Error fetching DLC:', err);
        setError('Failed to load additional content');
      } finally {
        setLoading(false);
      }
    };

    fetchDLC();
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
  }, [dlcItems]);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    
    const itemWidth = 120; // Width of each DLC item + gap
    const scrollAmount = itemWidth * 3; // Scroll 3 items at a time
    
    scrollContainerRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  // Don't render anything if no DLC found
  if (!loading && dlcItems.length === 0) {
    return null;
  }

  return (
    <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-white">Additional Content</h3>
          {!loading && dlcItems.length > 0 && (
            <span className="text-sm text-gray-400">({dlcItems.length})</span>
          )}
        </div>
        
        {!loading && dlcItems.length > 6 && (
          <div className="flex gap-2">
            <button
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
              className={`p-2 rounded-full transition-colors ${
                canScrollLeft 
                  ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                  : 'bg-gray-800 text-gray-600 cursor-not-allowed'
              }`}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
              className={`p-2 rounded-full transition-colors ${
                canScrollRight 
                  ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                  : 'bg-gray-800 text-gray-600 cursor-not-allowed'
              }`}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
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
          {dlcItems.map((dlc) => (
            <Link
              key={dlc.id}
              to={`/game/${dlc.id}`}
              className="flex-shrink-0 w-24 group"
            >
              <div className="relative overflow-hidden rounded-lg mb-2">
                <img
                  src={dlc.cover?.url ? dlcService.transformImageUrl(dlc.cover.url) : '/placeholder-game.jpg'}
                  alt={dlc.name}
                  className="w-24 h-32 object-cover group-hover:scale-105 transition-transform duration-200"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder-game.jpg';
                  }}
                />
                <div className="absolute top-1 right-1 bg-black bg-opacity-75 px-1 py-0.5 rounded text-xs text-white text-[10px]">
                  {dlcService.getCategoryName(dlc.category)}
                </div>
              </div>
              
              <div>
                <h4 className="text-white font-medium text-xs mb-1 line-clamp-2 group-hover:text-purple-400 transition-colors leading-tight">
                  {dlc.name}
                </h4>
                
                {dlc.first_release_date && (
                  <div className="flex items-center gap-1 text-gray-400 text-[10px]">
                    <Calendar className="h-2.5 w-2.5" />
                    <span>{new Date(dlc.first_release_date * 1000).getFullYear()}</span>
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