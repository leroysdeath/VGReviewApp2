import React, { useState, useRef, useEffect } from 'react';
import { useInView } from '../hooks/useInView';

interface ResponsiveImageProps extends React.HTMLAttributes<HTMLDivElement> {
  src: string;
  alt: string;
  sizes?: string;
  width?: number | string;
  height?: number | string;
  aspectRatio?: string;
  loading?: 'lazy' | 'eager';
  priority?: boolean;
  className?: string;
  imgClassName?: string;
  placeholder?: string;
  fallback?: string;
  onLoad?: () => void;
  onError?: () => void;
  disableModernFormats?: boolean;
}

/**
 * ResponsiveImage component with modern format support (WebP, AVIF)
 * Automatically generates modern format URLs and provides fallback
 */
export const ResponsiveImage: React.FC<ResponsiveImageProps> = ({
  src,
  alt,
  sizes = '100vw',
  width,
  height,
  aspectRatio,
  loading = 'lazy',
  priority = false,
  className = '',
  imgClassName = '',
  placeholder,
  fallback = '/placeholder-game.jpg',
  onLoad,
  onError,
  disableModernFormats = false,
  ...divProps
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(imgRef, { rootMargin: '50px' });

  // Determine if we should load the image
  const shouldLoad = priority || isInView || loading === 'eager';

  // Generate modern format URLs
  const generateModernFormats = (originalSrc: string) => {
    // Skip modern formats for external URLs or if disabled
    if (disableModernFormats || originalSrc.startsWith('http') || originalSrc.startsWith('//')) {
      return {
        avif: null,
        webp: null,
        original: originalSrc
      };
    }

    // Extract file extension
    const lastDotIndex = originalSrc.lastIndexOf('.');
    if (lastDotIndex === -1) {
      return {
        avif: null,
        webp: null,
        original: originalSrc
      };
    }

    const basePath = originalSrc.substring(0, lastDotIndex);
    const extension = originalSrc.substring(lastDotIndex + 1).toLowerCase();

    // Only convert certain formats
    if (!['jpg', 'jpeg', 'png'].includes(extension)) {
      return {
        avif: null,
        webp: null,
        original: originalSrc
      };
    }

    return {
      avif: `${basePath}.avif`,
      webp: `${basePath}.webp`,
      original: originalSrc
    };
  };

  // Generate srcSet for responsive images
  const generateSrcSet = (baseSrc: string): string => {
    // For IGDB images, use their sizing parameters
    if (baseSrc.includes('igdb.com')) {
      return baseSrc; // IGDB handles its own responsive sizing
    }

    // For local images, generate multiple sizes
    const sizes = [320, 640, 768, 1024, 1280, 1920];
    const extension = baseSrc.substring(baseSrc.lastIndexOf('.'));
    const basePath = baseSrc.substring(0, baseSrc.lastIndexOf('.'));

    return sizes
      .map(size => `${basePath}-${size}w${extension} ${size}w`)
      .join(', ');
  };

  const formats = generateModernFormats(src);
  const errorImageSrc = hasError ? fallback : null;

  const handleLoad = () => {
    setIsLoaded(true);
    setHasError(false);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  // Calculate container styles for aspect ratio
  const containerStyle: React.CSSProperties = {};
  if (aspectRatio) {
    containerStyle.aspectRatio = aspectRatio;
  } else if (width && height) {
    const w = typeof width === 'number' ? width : parseInt(width as string, 10);
    const h = typeof height === 'number' ? height : parseInt(height as string, 10);
    if (!isNaN(w) && !isNaN(h)) {
      containerStyle.aspectRatio = `${w} / ${h}`;
    }
  }

  // Don't render image until it should load (for lazy loading)
  if (!shouldLoad && loading === 'lazy') {
    return (
      <div
        ref={imgRef}
        className={`relative overflow-hidden bg-gray-800 ${className}`}
        style={containerStyle}
        {...divProps}
      >
        {placeholder && (
          <img
            src={placeholder}
            alt=""
            className="w-full h-full object-cover blur-sm"
            aria-hidden="true"
          />
        )}
      </div>
    );
  }

  return (
    <div
      ref={imgRef}
      className={`relative overflow-hidden ${className}`}
      style={containerStyle}
      {...divProps}
    >
      {/* Placeholder while loading */}
      {!isLoaded && placeholder && (
        <img
          src={placeholder}
          alt=""
          className="absolute inset-0 w-full h-full object-cover blur-sm"
          aria-hidden="true"
        />
      )}

      {/* Main picture element with modern formats */}
      {!hasError ? (
        <picture>
          {/* AVIF - best compression, limited support */}
          {formats.avif && (
            <source
              type="image/avif"
              srcSet={generateSrcSet(formats.avif)}
              sizes={sizes}
            />
          )}

          {/* WebP - good compression, wide support */}
          {formats.webp && (
            <source
              type="image/webp"
              srcSet={generateSrcSet(formats.webp)}
              sizes={sizes}
            />
          )}

          {/* Original format fallback */}
          <img
            src={formats.original}
            srcSet={!disableModernFormats ? generateSrcSet(formats.original) : undefined}
            sizes={!disableModernFormats ? sizes : undefined}
            alt={alt}
            width={width}
            height={height}
            loading={priority ? 'eager' : loading}
            decoding="async"
            fetchpriority={priority ? 'high' : 'auto'}
            onLoad={handleLoad}
            onError={handleError}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            } ${imgClassName}`}
          />
        </picture>
      ) : (
        /* Error fallback image */
        <img
          src={errorImageSrc || fallback}
          alt={alt}
          className={`w-full h-full object-cover ${imgClassName}`}
        />
      )}
    </div>
  );
};