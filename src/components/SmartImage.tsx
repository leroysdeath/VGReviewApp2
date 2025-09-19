import React, { useState, useRef, useEffect } from 'react';
import { useOptimizedImage, ImageOptions } from '../utils/imageOptimization';

interface SmartImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  
  // Lazy loading options
  lazy?: boolean;
  rootMargin?: string;
  threshold?: number;
  
  // Optimization options
  optimize?: boolean;
  optimization?: ImageOptions;
  
  // Error handling
  fallback?: string;
  onError?: () => void;
  retryAttempts?: number;
  
  // Loading states
  showLoadingSpinner?: boolean;
  placeholder?: string;
  
  // Performance
  preload?: boolean;
  priority?: boolean;
}

export const SmartImage: React.FC<SmartImageProps> = ({
  src,
  alt,
  lazy = true,
  rootMargin = '50px',
  threshold = 0.1,
  optimize = true,
  optimization = {},
  fallback = '/placeholder-image.jpg',
  onError,
  retryAttempts = 2,
  showLoadingSpinner = true,
  placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjMzc0MTUxIi8+CjxwYXRoIGQ9Ik0yMCAyOEMyNCA0IDI4IDIwIDIwIDIwQzEyIDIwIDE2IDQgMjAgMjhaIiBmaWxsPSIjNEI1NTYzIi8+Cjwvc3ZnPgo=',
  preload = false,
  priority = false,
  className = '',
  ...props
}) => {
  // Filter out custom props that shouldn't be passed to DOM element
  const { lazyStrategy, showLoadingSkeleton, ...validProps } = props;
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(!lazy || priority);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [currentSrc, setCurrentSrc] = useState(src);
  const imgRef = useRef<HTMLImageElement>(null);
  
  // Use optimization hook when optimize is enabled
  const { src: optimizedSrc, loading: optimizing } = useOptimizedImage(
    optimize ? currentSrc : '', 
    optimize ? optimization : {}
  );
  
  // Determine final source URL with retry logic
  const getFinalSrc = () => {
    if (hasError && retryCount >= retryAttempts) {
      return fallback;
    }
    return optimize ? optimizedSrc : currentSrc;
  };
  
  const finalSrc = getFinalSrc();
  const isLoading = optimize ? optimizing : false;

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || priority) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        threshold,
        rootMargin
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [lazy, priority, threshold, rootMargin]);

  // Preload images when priority is set
  useEffect(() => {
    if (preload && finalSrc) {
      const img = new Image();
      img.src = finalSrc;
    }
  }, [preload, finalSrc]);

  const handleLoad = () => {
    setIsLoaded(true);
    setHasError(false);
    setRetryCount(0);
  };

  const handleError = () => {
    if (retryCount < retryAttempts) {
      // Try with different URL variants for IGDB images
      const retryVariants = [
        currentSrc.replace('/t_cover_big/', '/t_cover_small/'),
        currentSrc.replace('f_webp', 'f_jpg'),
        currentSrc.replace(',q_85', ',q_75'),
        src // Original source as last resort
      ];
      
      if (retryCount < retryVariants.length) {
        // Silently retry with different image variants
        setCurrentSrc(retryVariants[retryCount]);
        setRetryCount(prev => prev + 1);
        setIsLoaded(false);
        return;
      }
    }
    
    setHasError(true);
    onError?.();
  };

  const shouldShowImage = isInView && !isLoading;
  const shouldShowPlaceholder = !isLoaded && !hasError && (isLoading || !shouldShowImage);
  const shouldShowSpinner = showLoadingSpinner && (isLoading || (!isLoaded && shouldShowImage));

  return (
    <div ref={imgRef} className={`relative overflow-hidden ${className}`}>
      {/* Placeholder image */}
      {shouldShowPlaceholder && placeholder && (
        <img
          src={placeholder}
          alt=""
          className="absolute inset-0 w-full h-full object-cover blur-sm"
          aria-hidden="true"
        />
      )}
      
      {/* Loading skeleton/spinner */}
      {shouldShowSpinner && (
        <div className="absolute inset-0 bg-gray-700 animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-600 border-t-purple-400 rounded-full animate-spin"></div>
        </div>
      )}
      
      {/* Actual image */}
      {shouldShowImage && !hasError && (
        <img
          src={finalSrc}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          loading={lazy && !priority ? 'lazy' : 'eager'}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          {...validProps}
        />
      )}
      
      {/* Error state */}
      {hasError && retryCount >= retryAttempts && (
        <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
            </svg>
            <p className="text-sm">Image unavailable</p>
          </div>
        </div>
      )}
    </div>
  );
};