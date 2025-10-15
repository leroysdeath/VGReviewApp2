import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SmartImage } from './SmartImage';

interface ScreenshotCarouselProps {
  screenshots: string[];
  gameName: string;
}

export const ScreenshotCarousel: React.FC<ScreenshotCarouselProps> = ({ screenshots, gameName }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? screenshots.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === screenshots.length - 1 ? 0 : prev + 1));
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') goToPrevious();
    if (e.key === 'ArrowRight') goToNext();
  };

  return (
    <div
      className="relative w-full"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label="Screenshot carousel"
    >
      {/* Main Screenshot Display */}
      <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-800 group">
        <div
          className="flex transition-transform duration-500 ease-in-out h-full"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {screenshots.map((screenshot, index) => (
            <div
              key={index}
              className="min-w-full h-full flex-shrink-0 cursor-pointer"
              onClick={() => window.open(screenshot.replace('t_screenshot_big', 't_1080p'), '_blank')}
              role="button"
              tabIndex={0}
              aria-label={`View full size screenshot ${index + 1}`}
            >
              <SmartImage
                src={screenshot}
                alt={`${gameName} screenshot ${index + 1}`}
                className="w-full h-full object-cover"
                optimization={{
                  width: 1280,
                  height: 720,
                  quality: 90,
                  format: 'webp'
                }}
                fallback="/placeholder-game.jpg"
              />
            </div>
          ))}
        </div>

        {/* Navigation Arrows */}
        <button
          onClick={goToPrevious}
          className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          aria-label="Previous screenshot"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        <button
          onClick={goToNext}
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          aria-label="Next screenshot"
        >
          <ChevronRight className="h-6 w-6" />
        </button>

        {/* Screenshot Counter */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
          {currentIndex + 1} / {screenshots.length}
        </div>
      </div>

      {/* Thumbnail Navigation */}
      <div className="mt-4 flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
        {screenshots.map((screenshot, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`flex-shrink-0 w-20 h-12 rounded overflow-hidden border-2 transition-all ${
              index === currentIndex
                ? 'border-purple-500 ring-2 ring-purple-500/50'
                : 'border-gray-700 hover:border-gray-500'
            }`}
            aria-label={`Go to screenshot ${index + 1}`}
            aria-current={index === currentIndex}
          >
            <SmartImage
              src={screenshot}
              alt={`${gameName} thumbnail ${index + 1}`}
              className="w-full h-full object-cover"
              optimization={{
                width: 160,
                height: 90,
                quality: 75,
                format: 'webp'
              }}
              fallback="/placeholder-game.jpg"
            />
          </button>
        ))}
      </div>

      {/* Keyboard Navigation Hint (only visible on desktop) */}
      <div className="hidden md:block text-center mt-2 text-gray-500 text-xs">
        Use arrow keys to navigate
      </div>
    </div>
  );
};
