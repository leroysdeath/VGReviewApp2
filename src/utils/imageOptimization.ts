// Image optimization utilities
export interface ImageOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpg' | 'png';
  fit?: 'cover' | 'contain' | 'fill';
}

class ImageOptimizer {
  private readonly CDN_BASE = 'https://images.igdb.com/igdb/image/upload/';
  private readonly PEXELS_BASE = 'https://images.pexels.com/photos/';

  optimizeIGDBImage(url: string, options: ImageOptions = {}): string {
    if (!url || !url.includes('igdb.com')) return url;

    const {
      width = 400,
      height,
      quality = 80,
      format = 'webp',
      fit = 'cover'
    } = options;

    // Extract image ID from IGDB URL
    const imageId = url.split('/').pop()?.replace(/\.(jpg|png|webp)$/, '');
    if (!imageId) return url;

    // Build transformation string
    let transform = `f_${format},q_${quality}`;
    
    if (width && height) {
      transform += `,w_${width},h_${height},c_${fit}`;
    } else if (width) {
      transform += `,w_${width}`;
    } else if (height) {
      transform += `,h_${height}`;
    }

    return `${this.CDN_BASE}${transform}/${imageId}.${format}`;
  }

  optimizePexelsImage(url: string, options: ImageOptions = {}): string {
    if (!url || !url.includes('pexels.com')) return url;

    const { width = 400, height } = options;
    
    // Pexels auto-optimization
    const params = new URLSearchParams();
    params.set('auto', 'compress');
    params.set('cs', 'tinysrgb');
    params.set('w', width.toString());
    if (height) params.set('h', height.toString());

    return `${url}?${params.toString()}`;
  }

  generateSrcSet(baseUrl: string, widths: number[] = [400, 800, 1200]): string {
    return widths
      .map(width => {
        const optimizedUrl = this.optimizeImage(baseUrl, { width });
        return `${optimizedUrl} ${width}w`;
      })
      .join(', ');
  }

  optimizeImage(url: string, options: ImageOptions = {}): string {
    if (url.includes('igdb.com')) {
      return this.optimizeIGDBImage(url, options);
    } else if (url.includes('pexels.com')) {
      return this.optimizePexelsImage(url, options);
    }
    return url;
  }

  preloadImage(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = url;
    });
  }

  async preloadImages(urls: string[]): Promise<void> {
    try {
      await Promise.all(urls.map(url => this.preloadImage(url)));
    } catch (error) {
      console.warn('Failed to preload some images:', error);
    }
  }
}

export const imageOptimizer = new ImageOptimizer();

// React hook for optimized images
import { useState, useEffect } from 'react';

export const useOptimizedImage = (src: string, options: ImageOptions = {}) => {
  const [optimizedSrc, setOptimizedSrc] = useState<string>(src);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    if (!src) {
      setLoading(false);
      return;
    }

    const optimized = imageOptimizer.optimizeImage(src, options);
    
    imageOptimizer.preloadImage(optimized)
      .then(() => {
        setOptimizedSrc(optimized);
        setError(false);
      })
      .catch(() => {
        setOptimizedSrc(src); // Fallback to original
        setError(true);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [src, options.width, options.height, options.quality]);

  return { src: optimizedSrc, loading, error };
};