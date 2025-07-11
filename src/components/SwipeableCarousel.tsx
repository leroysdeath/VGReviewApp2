import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useSwipeGesture } from '../hooks/useSwipeGesture';
import { useResponsive } from '../hooks/useResponsive';

interface SwipeableCarouselProps {
  children: React.ReactNode[];
  className?: string;
  itemClassName?: string;
  showArrows?: boolean;
  showDots?: boolean;
  autoPlay?: boolean;
  autoPlayInterval?: number;
  itemsPerView?: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
  gap?: string;
  onSlideChange?: (index: number) => void;
}

export const SwipeableCarousel: React.FC<SwipeableCarouselProps> = ({
  children,
  className = '',
  itemClassName = '',
  showArrows = true,
  showDots = true,
  autoPlay = false,
  autoPlayInterval = 5000,
  itemsPerView = { mobile: 1, tablet: 2, desktop: 3 },
  gap = '1rem',
  onSlideChange,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);
  const { isMobile, isTablet } = useResponsive();

  // Determine items per view based on screen size
  const getItemsPerView = () => {
    if (isMobile) return itemsPerView.mobile;
    if (isTablet) return itemsPerView.tablet;
    return itemsPerView.desktop;
  };

  const itemsVisible = getItemsPerView();
  const totalSlides = Math.max(0, children.length - itemsVisible + 1);

  // Auto-play functionality
  useEffect(() => {
    if (!autoPlay || isDragging) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % totalSlides);
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [autoPlay, autoPlayInterval, totalSlides, isDragging]);

  // Swipe gesture handling
  const swipeHandlers = useSwipeGesture({
    onSwipeLeft: () => goToNext(),
    onSwipeRight: () => goToPrevious(),
    onSwipeStart: () => setIsDragging(true),
    onSwipeEnd: () => setIsDragging(false),
    threshold: 50,
  });

  const goToPrevious = () => {
    if (isTransitioning) return;
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : totalSlides - 1));
  };

  const goToNext = () => {
    if (isTransitioning) return;
    setCurrentIndex((prev) => (prev < totalSlides - 1 ? prev + 1 : 0));
  };

  const goToSlide = (index: number) => {
    if (isTransitioning || index === currentIndex) return;
    setCurrentIndex(index);
  };

  // Handle transition events
  useEffect(() => {
    setIsTransitioning(true);
    const timer = setTimeout(() => setIsTransitioning(false), 300);
    return () => clearTimeout(timer);
  }, [currentIndex]);

  // Notify parent of slide changes
  useEffect(() => {
    onSlideChange?.(currentIndex);
  }, [currentIndex, onSlideChange]);

  // Calculate transform based on current index
  const getTransform = () => {
    const itemWidth = 100 / itemsVisible;
    return `translateX(-${currentIndex * itemWidth}%)`;
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Carousel Container */}
      <div
        ref={carouselRef}
        {...swipeHandlers}
        className="relative touch-pan-y"
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <div
          className="flex transition-transform duration-300 ease-out"
          style={{
            transform: getTransform(),
            gap,
          }}
        >
          {children.map((child, index) => (
            <div
              key={index}
              className={`flex-shrink-0 ${itemClassName}`}
              style={{ width: `calc(${100 / itemsVisible}% - ${gap} * ${itemsVisible - 1} / ${itemsVisible})` }}
            >
              {child}
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Arrows */}
      {showArrows && !isMobile && totalSlides > 1 && (
        <>
          <button
            onClick={goToPrevious}
            disabled={isTransitioning}
            className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={goToNext}
            disabled={isTransitioning}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 z-10 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm"
            aria-label="Next slide"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      {/* Dots Indicator */}
      {showDots && totalSlides > 1 && (
        <div className="flex justify-center space-x-2 mt-4">
          {Array.from({ length: totalSlides }).map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2 h-2 rounded-full transition-all duration-200 ${
                index === currentIndex
                  ? 'bg-game-purple w-6'
                  : 'bg-gray-600 hover:bg-gray-500'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Progress Bar (Mobile) */}
      {isMobile && totalSlides > 1 && (
        <div className="mt-4 bg-gray-700 rounded-full h-1 overflow-hidden">
          <div
            className="h-full bg-game-purple transition-all duration-300 ease-out"
            style={{ width: `${((currentIndex + 1) / totalSlides) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
};