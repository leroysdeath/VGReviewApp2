// Optimized Image Component
import React, { useState } from 'react';
import { useOptimizedImage, ImageOptions } from '../utils/imageOptimization';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  optimization?: ImageOptions;
  fallback?: string;
  lazy?: boolean;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  optimization = {},
  fallback = '/placeholder-image.jpg',
  lazy = true,
  className = '',
  ...props
}) => {
  const [hasError, setHasError] = useState(false);
  const { src: optimizedSrc, loading } = useOptimizedImage(src, optimization);

  const handleError = () => {
    setHasError(true);
  };

  const imageSrc = hasError ? fallback : optimizedSrc;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {loading && (
        <div className="absolute inset-0 bg-gray-700 animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-600 border-t-purple-400 rounded-full animate-spin"></div>
        </div>
      )}
      <img
        src={imageSrc}
        alt={alt}
        loading={lazy ? 'lazy' : 'eager'}
        onError={handleError}
        className={`transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'} ${className}`}
        {...props}
      />
    </div>
  );
};