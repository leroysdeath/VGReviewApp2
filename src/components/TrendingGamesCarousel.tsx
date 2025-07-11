import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, TrendingUp, Play, Star, Calendar } from 'lucide-react';
import { LazyImage } from './LazyImage';
import { useResponsive } from '../hooks/useResponsive';
import { Game } from '../services/igdbApi';
import { useSwipeGesture } from '../hooks/useSwipeGesture';

interface TrendingGamesCarouselProps {
  games: Game[];
  loading?: boolean;
  autoPlay?: boolean;
  autoPlayInterval?: number;
  onGameSelect?: (game: Game) => void;
  className?: string;
}

export const TrendingGamesCarousel: React.FC<TrendingGamesCarouselProps> = ({
  games,
  loading = false,
  autoPlay = true,
  autoPlayInterval = 5000,
  onGameSelect,
  className = '',
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [touchStartX, setTouchStartX] = useState(0);
  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { isMobile } = useResponsive();

  // Reset autoplay when games change
  useEffect(() => {
    if (games.length > 0) {
      resetAutoPlay();
    }
    return () => {
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
      }
    };
  }, [games]);

  // Auto-play functionality
  useEffect(() => {
    if (isPlaying && games.length > 1 && !loading) {
      autoPlayTimerRef.current = setTimeout(() => {
        goToNext();
      }, autoPlayInterval);
    }
    return () => {
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
      }
    };
  }, [isPlaying, currentIndex, games.length, loading]);

  const resetAutoPlay = () => {
    if (autoPlayTimerRef.current) {
      clearTimeout(autoPlayTimerRef.current);
    }
    if (autoPlay) {
      setIsPlaying(true);
    }
  };

  const goToPrevious = () => {
    if (isTransitioning || games.length <= 1) return;
    
    setIsTransitioning(true);
    setCurrentIndex((prevIndex) => (prevIndex === 0 ? games.length - 1 : prevIndex - 1));
    resetAutoPlay();
    
    setTimeout(() => {
      setIsTransitioning(false);
    }, 500);
  };

  const goToNext = () => {
    if (isTransitioning || games.length <= 1) return;
    
    setIsTransitioning(true);
    setCurrentIndex((prevIndex) => (prevIndex === games.length - 1 ? 0 : prevIndex + 1));
    resetAutoPlay();
    
    setTimeout(() => {
      setIsTransitioning(false);
    }, 500);
  };

  const goToSlide = (index: number) => {
    if (isTransitioning || index === currentIndex || games.length <= 1) return;
    
    setIsTransitioning(true);
    setCurrentIndex(index);
    resetAutoPlay();
    
    setTimeout(() => {
      setIsTransitioning(false);
    }, 500);
  };

  const handleGameClick = (game: Game) => {
    if (onGameSelect) {
      onGameSelect(game);
    }
  };

  // Swipe gesture handling
  const swipeHandlers = useSwipeGesture({
    onSwipeLeft: goToNext,
    onSwipeRight: goToPrevious,
    threshold: 50,
  });

  // Pause autoplay on hover
  const handleMouseEnter = () => {
    if (autoPlay) {
      setIsPlaying(false);
    }
  };

  const handleMouseLeave = () => {
    if (autoPlay) {
      setIsPlaying(true);
    }
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className={`relative overflow-hidden rounded-xl bg-gray-800 ${className}`}>
        <div className="aspect-[21/9] bg-gray-700 animate-pulse">
          <div className="absolute inset-0 flex items-center justify-center">
            <TrendingUp className="h-12 w-12 text-gray-600" />
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-gray-900 to-transparent">
          <div className="h-8 bg-gray-700 rounded w-2/3 mb-3 animate-pulse"></div>
          <div className="h-4 bg-gray-700 rounded w-1/2 animate-pulse"></div>
        </div>
      </div>
    );
  }

  // Empty state
  if (games.length === 0) {
    return (
      <div className={`relative overflow-hidden rounded-xl bg-gray-800 ${className}`}>
        <div className="aspect-[21/9] bg-gray-800 flex items-center justify-center">
          <div className="text-center p-6">
            <TrendingUp className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No trending games</h3>
            <p className="text-gray-400">Check back later for trending games</p>
          </div>
        </div>
      </div>
    );
  }

  const currentGame = games[currentIndex];

  return (
    <div 
      className={`relative overflow-hidden rounded-xl bg-gray-800 group ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...swipeHandlers}
    >
      {/* Main carousel */}
      <div className="relative aspect-[21/9] overflow-hidden">
        {/* Game background image */}
        <LazyImage
          src={currentGame.coverImage}
          alt={currentGame.title}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out-back group-hover:scale-105"
        />
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent"></div>
        
        {/* Game info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            {/* Game cover */}
            <div className="hidden md:block w-32 h-44 rounded-lg overflow-hidden shadow-lg transform transition-transform duration-300 group-hover:translate-y-[-8px]">
              <LazyImage
                src={currentGame.coverImage}
                alt={currentGame.title}
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Game details */}
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm text-game-purple mb-2">
                <TrendingUp className="h-4 w-4" />
                <span>Trending Now</span>
              </div>
              
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 line-clamp-2">
                {currentGame.title}
              </h2>
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-300 mb-4">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-yellow-400" />
                  <span>{currentGame.rating.toFixed(1)}</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{currentGame.releaseDate}</span>
                </div>
                
                <span>{currentGame.genre}</span>
              </div>
              
              <p className="text-gray-400 line-clamp-2 md:line-clamp-3 mb-4 max-w-2xl">
                {currentGame.description}
              </p>
              
              <div className="flex flex-wrap gap-3">
                <Link
                  to={`/game/${currentGame.id}`}
                  className="px-4 py-2 bg-game-purple hover:bg-game-purple/90 text-white rounded-lg transition-colors"
                >
                  View Game
                </Link>
                
                <button
                  className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  <Play className="h-4 w-4" />
                  Watch Trailer
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Navigation arrows - only show on desktop and when there are multiple games */}
      {games.length > 1 && !isMobile && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 p-2 bg-black/30 hover:bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-sm"
            aria-label="Previous game"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 bg-black/30 hover:bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-sm"
            aria-label="Next game"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}
      
      {/* Pagination dots */}
      {games.length > 1 && (
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2 p-2">
          {games.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? 'bg-white w-6'
                  : 'bg-white/50 hover:bg-white/80'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};