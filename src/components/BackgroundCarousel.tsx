import React, { useState, useEffect, useMemo, useRef } from 'react';
import { screenshotService } from '../services/screenshotService';

interface BackgroundCarouselProps {
  screenshots: string[];
  interval?: number; // in milliseconds
}

export const BackgroundCarousel: React.FC<BackgroundCarouselProps> = ({
  screenshots,
  interval = 5000
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Memoize optimized screenshots to prevent re-computation on every render
  const optimizedScreenshots = useMemo(
    () => screenshotService.getOptimizedUrls(screenshots),
    [screenshots]
  );

  // Calculate next index based on current
  const nextIndex = (currentIndex + 1) % (optimizedScreenshots.length || 1);

  useEffect(() => {
    if (!optimizedScreenshots || optimizedScreenshots.length <= 1) return;

    const timer = setInterval(() => {
      setIsTransitioning(true);

      // Clear any existing timeout to prevent memory leaks
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // After a short delay to start the fade, update indices
      timeoutRef.current = setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % optimizedScreenshots.length);
        setIsTransitioning(false);
      }, 500); // Half of the transition duration
    }, interval);

    // Cleanup function
    return () => {
      clearInterval(timer);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [optimizedScreenshots, interval]);

  if (!optimizedScreenshots || optimizedScreenshots.length === 0) {
    return (
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-gray-900/95 to-gray-900" />
    );
  }

  if (optimizedScreenshots.length === 1) {
    return (
      <>
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${optimizedScreenshots[0]})`
          }}
        />
        {/* Gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/70 via-gray-900/85 to-gray-900" />
      </>
    );
  }

  return (
    <>
      {/* Current image */}
      <div
        className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${
          isTransitioning ? 'opacity-0' : 'opacity-100'
        }`}
        style={{
          backgroundImage: `url(${optimizedScreenshots[currentIndex]})`
        }}
      />

      {/* Next image (underneath for crossfade effect) */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${optimizedScreenshots[nextIndex]})`
        }}
      />

      {/* Gradient overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900/70 via-gray-900/85 to-gray-900" />
    </>
  );
};