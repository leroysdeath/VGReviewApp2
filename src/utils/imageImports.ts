/**
 * Image import utilities for progressive image optimization
 *
 * This module handles:
 * 1. IGDB images - Already optimized via their CDN (no processing needed)
 * 2. Local images - Processed at build time with vite-imagetools
 *
 * Usage:
 * - For IGDB images: Use directly, they're already optimized
 * - For local images: Import through this module for automatic optimization
 */

// Type definitions for vite-imagetools imports
export interface OptimizedImage {
  src: string;
  webp?: string;
  avif?: string;
  width: number;
  height: number;
  srcSet?: string;
}

export interface PictureSource {
  src: string;
  type: string;
  srcset: string;
}

/**
 * Import a local image with automatic optimization
 * This will generate WebP and AVIF formats at build time
 *
 * @example
 * const heroImage = await importImage('/hero-banner.jpg');
 * // Returns: { src, webp, avif, srcSet }
 */
export async function importImage(path: string): Promise<OptimizedImage | null> {
  try {
    // Dynamic import with vite-imagetools directives
    const module = await import(
      /* @vite-ignore */
      `${path}?format=webp;avif;original&w=320;640;768;1024;1280;1920&as=meta`
    );
    return module.default;
  } catch (error) {
    console.warn(`Failed to import optimized image: ${path}`, error);
    // Fallback to original image
    return {
      src: path,
      width: 0,
      height: 0
    };
  }
}

/**
 * Check if a URL is an IGDB image
 * IGDB images are already optimized and don't need processing
 */
export function isIGDBImage(url: string): boolean {
  return url.includes('igdb.com') || url.includes('//images.igdb.com');
}

/**
 * Check if a URL is an external image
 * External images cannot be processed at build time
 */
export function isExternalImage(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//');
}

/**
 * Determine if an image should be processed
 * @returns true if the image is local and can be optimized
 */
export function shouldOptimizeImage(url: string): boolean {
  // Skip IGDB images (already optimized)
  if (isIGDBImage(url)) return false;

  // Skip external images (can't process)
  if (isExternalImage(url)) return false;

  // Skip SVGs (vector format, no need for conversion)
  if (url.endsWith('.svg')) return false;

  // Process local JPG, PNG images
  return /\.(jpg|jpeg|png)$/i.test(url);
}

/**
 * Get optimized image URL for a given source
 * Handles both IGDB and local images appropriately
 */
export function getOptimizedImageUrl(
  src: string,
  format: 'original' | 'webp' | 'avif' = 'original'
): string {
  // IGDB images: use their CDN optimization
  if (isIGDBImage(src)) {
    if (format === 'webp' && src.match(/\.(jpg|jpeg|png)$/i)) {
      // IGDB supports WebP by changing extension
      return src.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    }
    return src;
  }

  // External images: return as-is
  if (isExternalImage(src)) {
    return src;
  }

  // Local images: build-time processing will handle format conversion
  if (format === 'webp') {
    return src.replace(/\.(jpg|jpeg|png)$/i, '.webp');
  }
  if (format === 'avif') {
    return src.replace(/\.(jpg|jpeg|png)$/i, '.avif');
  }

  return src;
}

/**
 * Generate responsive srcSet for an image
 * Handles both IGDB and local images
 */
export function generateResponsiveSrcSet(
  src: string,
  widths: number[] = [320, 640, 768, 1024, 1280, 1920]
): string {
  // IGDB images use their size parameters
  if (isIGDBImage(src)) {
    const igdbSizes: Record<number, string> = {
      320: 't_cover_small',
      640: 't_cover_big',
      768: 't_cover_big',
      1024: 't_720p',
      1280: 't_720p',
      1920: 't_1080p'
    };

    return widths
      .map(w => {
        const size = igdbSizes[w] || 't_1080p';
        const url = src.replace(/t_[^/]+/, size);
        return `${url} ${w}w`;
      })
      .join(', ');
  }

  // Local images: reference build-generated sizes
  const extension = src.match(/\.[^.]+$/)?.[0] || '';
  const basePath = src.substring(0, src.lastIndexOf('.'));

  return widths
    .map(w => `${basePath}-${w}w${extension} ${w}w`)
    .join(', ');
}

// Export a map of commonly used local images for preloading
// These will be processed at build time
export const LOCAL_IMAGES = {
  placeholderGame: '/placeholder-game.svg',
  defaultAvatar: '/default-avatar.svg',
  defaultCover: '/default-cover.png',
  heroBanner: '/hero-banner.jpg',
  logoLight: '/logo-light.png',
  logoDark: '/logo-dark.png'
} as const;