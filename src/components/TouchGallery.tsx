import React, { useState, useRef, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { useSwipeGesture } from '../hooks/useSwipeGesture';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';

interface TouchGalleryProps {
  images: string[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  onIndexChange?: (index: number) => void;
}

export const TouchGallery: React.FC<TouchGalleryProps> = ({
  images,
  initialIndex = 0,
  isOpen,
  onClose,
  onIndexChange,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [rotation, setRotation] = useState(0);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset state when gallery opens/closes
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setRotation(0);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, initialIndex]);

  // Update parent when index changes
  useEffect(() => {
    onIndexChange?.(currentIndex);
  }, [currentIndex, onIndexChange]);

  // Navigation functions
  const goToPrevious = () => {
    setCurrentIndex(prev => prev > 0 ? prev - 1 : images.length - 1);
    resetImageState();
  };

  const goToNext = () => {
    setCurrentIndex(prev => prev < images.length - 1 ? prev + 1 : 0);
    resetImageState();
  };

  const resetImageState = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setRotation(0);
  };

  // Zoom functions
  const zoomIn = () => {
    setScale(prev => Math.min(prev * 1.5, 5));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(prev / 1.5, 0.5));
  };

  const rotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  // Touch/mouse handling for pan and zoom
  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    setIsDragging(true);
    
    // Handle pinch-to-zoom for touch devices
    if ('touches' in e && e.touches.length === 2) {
      e.preventDefault();
      // Implement pinch-to-zoom logic here
    }
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging || scale <= 1) return;
    
    e.preventDefault();
    
    // Get movement delta
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    // Update position (simplified - would need proper delta calculation)
    // This is a basic implementation
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Swipe gesture handling
  const swipeHandlers = useSwipeGesture({
    onSwipeLeft: goToNext,
    onSwipeRight: goToPrevious,
    onSwipeUp: () => scale > 1 && zoomOut(),
    onSwipeDown: () => scale < 5 && zoomIn(),
    threshold: 50,
    enabled: scale <= 1, // Only allow swipe navigation when not zoomed
  });

  // Keyboard navigation
  useKeyboardNavigation({
    onEscape: onClose,
    onArrowLeft: goToPrevious,
    onArrowRight: goToNext,
    onArrowUp: zoomIn,
    onArrowDown: zoomOut,
    enabled: isOpen,
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/50 to-transparent safe-top">
        <div className="text-white font-medium">
          {currentIndex + 1} / {images.length}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={zoomOut}
            className="touch-target p-2 text-white hover:bg-white/20 rounded-full transition-colors"
            aria-label="Zoom out"
          >
            <ZoomOut className="h-6 w-6" />
          </button>
          <button
            onClick={zoomIn}
            className="touch-target p-2 text-white hover:bg-white/20 rounded-full transition-colors"
            aria-label="Zoom in"
          >
            <ZoomIn className="h-6 w-6" />
          </button>
          <button
            onClick={rotate}
            className="touch-target p-2 text-white hover:bg-white/20 rounded-full transition-colors"
            aria-label="Rotate"
          >
            <RotateCw className="h-6 w-6" />
          </button>
          <button
            onClick={onClose}
            className="touch-target p-2 text-white hover:bg-white/20 rounded-full transition-colors"
            aria-label="Close gallery"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Main Image Container */}
      <div
        ref={containerRef}
        {...swipeHandlers}
        className="absolute inset-0 flex items-center justify-center p-4 pt-20 pb-20"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseMove={handleTouchMove}
        onMouseUp={handleTouchEnd}
      >
        <img
          ref={imageRef}
          src={images[currentIndex]}
          alt={`Gallery image ${currentIndex + 1}`}
          className="max-w-full max-h-full object-contain transition-transform duration-200 select-none"
          style={{
            transform: `scale(${scale}) translate(${position.x}px, ${position.y}px) rotate(${rotation}deg)`,
            cursor: isDragging ? 'grabbing' : scale > 1 ? 'grab' : 'default',
          }}
          draggable={false}
        />
      </div>

      {/* Navigation Arrows */}
      {images.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 touch-target p-3 text-white hover:bg-white/20 rounded-full transition-colors"
            aria-label="Previous image"
          >
            <ChevronLeft className="h-8 w-8" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 touch-target p-3 text-white hover:bg-white/20 rounded-full transition-colors"
            aria-label="Next image"
          >
            <ChevronRight className="h-8 w-8" />
          </button>
        </>
      )}

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/50 to-transparent safe-bottom">
        {/* Thumbnail Strip */}
        {images.length > 1 && (
          <div className="flex justify-center space-x-2 mb-4 overflow-x-auto pb-2">
            {images.map((image, index) => (
              <button
                key={index}
                onClick={() => {
                  setCurrentIndex(index);
                  resetImageState();
                }}
                className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                  index === currentIndex
                    ? 'border-white scale-110'
                    : 'border-transparent opacity-70 hover:opacity-100'
                }`}
              >
                <img
                  src={image}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}

        {/* Progress Indicator */}
        <div className="bg-white/20 rounded-full h-1 overflow-hidden">
          <div
            className="h-full bg-white transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / images.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};