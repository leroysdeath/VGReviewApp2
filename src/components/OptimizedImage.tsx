import React from 'react';
import { ResponsiveImage } from './ResponsiveImage';
import { getOptimalSizes } from '../hooks/useResponsiveImage';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  layout?: 'full' | 'half' | 'third' | 'quarter' | 'hero';
  priority?: boolean;
  placeholder?: string;
  aspectRatio?: string;
  width?: number | string;
  height?: number | string;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * Optimized image component that automatically handles responsive sizing and modern formats
 * This is a convenience wrapper around ResponsiveImage with smart defaults
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className = '',
  layout = 'full',
  priority = false,
  placeholder,
  aspectRatio,
  width,
  height,
  onLoad,
  onError
}) => {
  // Determine optimal sizes based on layout
  const sizes = getOptimalSizes(layout);

  // Use low-quality placeholder for game covers if not provided
  const defaultPlaceholder = src.includes('game') || src.includes('cover')
    ? '/placeholder-game.svg'
    : undefined;

  return (
    <ResponsiveImage
      src={src}
      alt={alt}
      sizes={sizes}
      className={className}
      priority={priority}
      placeholder={placeholder || defaultPlaceholder}
      aspectRatio={aspectRatio}
      width={width}
      height={height}
      loading={priority ? 'eager' : 'lazy'}
      onLoad={onLoad}
      onError={onError}
    />
  );
};

/**
 * Game cover image component with proper aspect ratio
 */
export const GameCoverImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
}> = ({ src, alt, className = '', priority = false }) => {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      className={`bg-gray-800 ${className}`}
      aspectRatio="3/4"
      layout="third"
      priority={priority}
      placeholder="/placeholder-game.svg"
    />
  );
};

/**
 * Avatar/Profile image component with proper sizing
 */
export const AvatarImage: React.FC<{
  src: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}> = ({ src, alt, size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const sizePixels = {
    sm: 32,
    md: 40,
    lg: 48,
    xl: 64
  };

  return (
    <ResponsiveImage
      src={src}
      alt={alt}
      className={`rounded-full overflow-hidden ${sizeClasses[size]} ${className}`}
      imgClassName="object-cover"
      width={sizePixels[size]}
      height={sizePixels[size]}
      aspectRatio="1/1"
      sizes={`${sizePixels[size]}px`}
      priority={size === 'xl'} // Prioritize larger avatars
      fallback="/default-avatar.svg"
      disableModernFormats={src.includes('gravatar') || src.includes('github')} // External avatars
    />
  );
};

/**
 * Hero/Banner image component with full width
 */
export const HeroImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
  height?: string;
  fetchpriority?: 'high' | 'low' | 'auto';
}> = ({ src, alt, className = '', height = 'h-96', fetchpriority = 'high' }) => {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      className={`w-full ${height} object-cover ${className}`}
      layout="hero"
      priority // Hero images should load immediately
      aspectRatio="21/9"
      {...{ fetchpriority }} // Pass fetchpriority as a prop
    />
  );
};