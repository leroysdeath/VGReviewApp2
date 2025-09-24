import { useMemo } from 'react';

interface ResponsiveImageOptions {
  /**
   * Array of widths to generate in srcSet
   * @default [320, 640, 768, 1024, 1280, 1920]
   */
  widths?: number[];

  /**
   * Sizes attribute for responsive images
   * @default "(max-width: 320px) 280px, (max-width: 640px) 600px, (max-width: 768px) 728px, (max-width: 1024px) 984px, (max-width: 1280px) 1240px, 1920px"
   */
  sizes?: string;

  /**
   * Whether to generate WebP format
   * @default true
   */
  useWebP?: boolean;

  /**
   * Whether to generate AVIF format
   * @default true
   */
  useAvif?: boolean;

  /**
   * Quality setting for image optimization (1-100)
   * @default 85
   */
  quality?: number;
}

interface ResponsiveImageResult {
  srcSet: string;
  webpSrcSet?: string;
  avifSrcSet?: string;
  sizes: string;
  src: string;
  formats: {
    original: string;
    webp?: string;
    avif?: string;
  };
}

/**
 * Hook to generate responsive image attributes including srcSet and modern formats
 */
export const useResponsiveImage = (
  baseUrl: string,
  options: ResponsiveImageOptions = {}
): ResponsiveImageResult | null => {
  const {
    widths = [320, 640, 768, 1024, 1280, 1920],
    sizes = '(max-width: 320px) 280px, (max-width: 640px) 600px, (max-width: 768px) 728px, (max-width: 1024px) 984px, (max-width: 1280px) 1240px, 1920px',
    useWebP = true,
    useAvif = true,
    quality = 85
  } = options;

  return useMemo(() => {
    if (!baseUrl) return null;

    // Handle IGDB images specially
    if (baseUrl.includes('igdb.com')) {
      return generateIGDBResponsive(baseUrl, widths, sizes);
    }

    // Handle external images (just return as-is)
    if (baseUrl.startsWith('http') || baseUrl.startsWith('//')) {
      return {
        srcSet: baseUrl,
        sizes,
        src: baseUrl,
        formats: {
          original: baseUrl
        }
      };
    }

    // Generate responsive images for local assets
    return generateLocalResponsive(baseUrl, widths, sizes, useWebP, useAvif, quality);
  }, [baseUrl, widths, sizes, useWebP, useAvif, quality]);
};

/**
 * Generate responsive attributes for IGDB images
 */
function generateIGDBResponsive(
  baseUrl: string,
  widths: number[],
  sizes: string
): ResponsiveImageResult {
  // IGDB URL format: https://images.igdb.com/igdb/image/upload/t_[size]/[id].jpg
  // Available sizes: t_thumb, t_cover_small, t_cover_big, t_720p, t_1080p

  const igdbSizes = {
    320: 't_cover_small',
    640: 't_cover_big',
    768: 't_cover_big',
    1024: 't_720p',
    1280: 't_720p',
    1920: 't_1080p'
  };

  // Extract the image ID from the URL
  const matches = baseUrl.match(/\/([^\/]+)\.(jpg|png|webp)$/);
  if (!matches) {
    return {
      srcSet: baseUrl,
      sizes,
      src: baseUrl,
      formats: { original: baseUrl }
    };
  }

  const imageId = matches[1];
  const extension = matches[2];
  const baseUrlWithoutSize = baseUrl.replace(/\/t_[^\/]+\//, '/t_SIZE/');

  // Generate srcSet with IGDB size parameters
  const srcSet = widths
    .map(width => {
      const sizeParam = igdbSizes[width as keyof typeof igdbSizes] || 't_1080p';
      const url = baseUrlWithoutSize.replace('t_SIZE', sizeParam);
      return `${url} ${width}w`;
    })
    .join(', ');

  // IGDB supports WebP natively
  const webpSrcSet = widths
    .map(width => {
      const sizeParam = igdbSizes[width as keyof typeof igdbSizes] || 't_1080p';
      const url = baseUrlWithoutSize
        .replace('t_SIZE', sizeParam)
        .replace(`.${extension}`, '.webp');
      return `${url} ${width}w`;
    })
    .join(', ');

  return {
    srcSet,
    webpSrcSet,
    sizes,
    src: baseUrl,
    formats: {
      original: baseUrl,
      webp: baseUrl.replace(`.${extension}`, '.webp')
    }
  };
}

/**
 * Generate responsive attributes for local images
 */
function generateLocalResponsive(
  baseUrl: string,
  widths: number[],
  sizes: string,
  useWebP: boolean,
  useAvif: boolean,
  quality: number
): ResponsiveImageResult {
  // Extract file extension
  const lastDotIndex = baseUrl.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return {
      srcSet: baseUrl,
      sizes,
      src: baseUrl,
      formats: { original: baseUrl }
    };
  }

  const basePath = baseUrl.substring(0, lastDotIndex);
  const extension = baseUrl.substring(lastDotIndex + 1).toLowerCase();

  // Only process certain image formats
  if (!['jpg', 'jpeg', 'png', 'gif'].includes(extension)) {
    return {
      srcSet: baseUrl,
      sizes,
      src: baseUrl,
      formats: { original: baseUrl }
    };
  }

  // Generate srcSet for original format
  const srcSet = widths
    .map(width => `${basePath}-${width}w.${extension} ${width}w`)
    .join(', ');

  const result: ResponsiveImageResult = {
    srcSet,
    sizes,
    src: baseUrl,
    formats: {
      original: baseUrl
    }
  };

  // Generate WebP srcSet if enabled
  if (useWebP && ['jpg', 'jpeg', 'png'].includes(extension)) {
    result.webpSrcSet = widths
      .map(width => `${basePath}-${width}w.webp ${width}w`)
      .join(', ');
    result.formats.webp = `${basePath}.webp`;
  }

  // Generate AVIF srcSet if enabled
  if (useAvif && ['jpg', 'jpeg', 'png'].includes(extension)) {
    result.avifSrcSet = widths
      .map(width => `${basePath}-${width}w.avif ${width}w`)
      .join(', ');
    result.formats.avif = `${basePath}.avif`;
  }

  return result;
}

/**
 * Helper to get optimal sizes attribute based on layout
 */
export function getOptimalSizes(layout: 'full' | 'half' | 'third' | 'quarter' | 'hero'): string {
  const sizesMap = {
    full: '100vw',
    half: '(max-width: 768px) 100vw, 50vw',
    third: '(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw',
    quarter: '(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw',
    hero: '100vw'
  };

  return sizesMap[layout] || sizesMap.full;
}

/**
 * Helper to determine if browser supports modern formats
 */
export function supportsModernFormats(): {
  webp: boolean;
  avif: boolean;
} {
  if (typeof window === 'undefined') {
    return { webp: false, avif: false };
  }

  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;

  const supportsWebP = canvas.toDataURL ? canvas.toDataURL('image/webp').indexOf('image/webp') === 5 : false;

  // AVIF support detection is more complex, using a simpler check
  const supportsAvif = CSS.supports && CSS.supports('image-rendering', 'pixelated');

  return {
    webp: supportsWebP,
    avif: supportsAvif
  };
}