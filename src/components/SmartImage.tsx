import React, { useState, useRef, useEffect } from 'react';
import { useOptimizedImage, ImageOptions } from '../utils/imageOptimization';

interface SmartImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  
  // Optimization options (from OptimizedImage)
  optimization?: ImageOptions;
  
  // Lazy loading options (enhanced from both)
  lazy?: boolean;
  lazyStrategy?: 'native' | 'observer' | 'both';
  rootMargin?: string;
  threshold?: number;
  
  // Placeholder and fallback
  placeholder?: string;
  fallback?: string;
  showPlaceholderBlur?: boolean;
  
  // Loading states
  showLoadingSpinner?: boolean;
  showLoadingSkeleton?: boolean;
  
  // Callbacks
  onLoad?: () => void;
  onError?: () => void;
  onInView?: () => void;
  
  // Performance
  priority?: boolean;
  preload?: boolean;
}

export const SmartImage: React.FC<SmartImageProps> = ({
  src,
  alt,
  optimization = {},
  lazy = true,
  lazyStrategy = 'both',
  rootMargin = '50px',
  threshold = 0.1,
  placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjMzc0MTUxIi8+CjxwYXRoIGQ9Ik0yMCAyOEMyNCA0IDI4IDIwIDIwIDIwQzEyIDIwIDE2IDQgMjAgMjhaIiBmaWxsPSIjNEI1NTYzIi8+Cjwvc3ZnPgo=',
  fallback = '/placeholder-image.jpg',
  showPlaceholderBlur = true,
  showLoadingSpinner = false,
  showLoadingSkeleton = true,
  onLoad,
  onError,
  onInView,
  priority = false,
  preload = false,
  className = '',
  ...props
}) => {
  // State management
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(!lazy || priority);
  const [hasError, setHasError] = useState(false);
  
  // Refs
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Use optimized image hook from existing utilities
  const { src: optimizedSrc, loading: optimizing } = useOptimizedImage(
    src, 
    optimization
  );
  
  // Intersection Observer implementation (from LazyImage)
  useEffect(() => {
    if (!lazy || lazyStrategy === 'native' || priority) {
      setIsInView(true);
      return;
    }
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          onInView?.();
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );
    
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    
    return () => observer.disconnect();
  }, [lazy, lazyStrategy, priority, threshold, rootMargin, onInView]);
  
  // Event handlers
  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };
  
  const handleError = () => {
    setHasError(true);
    onError?.();
  };
  
  // Determine final image source
  const imageSrc = hasError ? fallback : optimizedSrc;
  const shouldRenderImage = isInView || priority;
  
  return (
    <div ref={containerRef} className={`relative overflow-hidden ${className}`}>
      {/* Placeholder blur (from LazyImage) */}
      {!isLoaded && !hasError && placeholder && showPlaceholderBlur && (
        <img
          src={placeholder}
          alt=""
          className="absolute inset-0 w-full h-full object-cover blur-sm"
          aria-hidden="true"
        />
      )}
      
      {/* Loading skeleton (from LazyImage) */}
      {!isLoaded && !hasError && showLoadingSkeleton && (
        <div className="absolute inset-0 bg-gray-700 animate-pulse" />
      )}
      
      {/* Loading spinner (from OptimizedImage) */}
      {!isLoaded && !hasError && showLoadingSpinner && optimizing && (
        <div className="absolute inset-0 bg-gray-700 animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-600 border-t-purple-400 rounded-full animate-spin"></div>
        </div>
      )}
      
      {/* Main image */}
      {shouldRenderImage && !hasError && (
        <img
          ref={imgRef}
          src={imageSrc}
          alt={alt}
          loading={lazyStrategy !== 'observer' ? 'lazy' : 'eager'}
          onLoad={handleLoad}
          onError={handleError}
          className={`transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          } w-full h-full object-cover`}
          {...props}
        />
      )}
      
      {/* Error state (enhanced from LazyImage) */}
      {hasError && (
        <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
            </svg>
            <p className="text-sm">Failed to load image</p>
          </div>
        </div>
      )}
    </div>
  );
};

// Export compatibility aliases for easier migration
export const OptimizedImage = SmartImage;
export const LazyImage = SmartImage;