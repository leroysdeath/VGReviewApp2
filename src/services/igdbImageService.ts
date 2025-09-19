/**
 * IGDB Image Service - Handles image URL validation and fallbacks
 * Reduces 404 errors by pre-validating and providing fallbacks
 */

interface ImageCache {
  [url: string]: {
    isValid: boolean;
    lastChecked: number;
  };
}

class IGDBImageService {
  private static instance: IGDBImageService;
  private cache: ImageCache = {};
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly pendingChecks = new Map<string, Promise<boolean>>();

  public static getInstance(): IGDBImageService {
    if (!IGDBImageService.instance) {
      IGDBImageService.instance = new IGDBImageService();
    }
    return IGDBImageService.instance;
  }

  /**
   * Get a validated IGDB image URL with fallbacks
   */
  async getValidImageUrl(originalUrl: string): Promise<string | null> {
    if (!originalUrl || !this.isIGDBImageUrl(originalUrl)) {
      return null;
    }

    // Check cache first
    const cached = this.cache[originalUrl];
    if (cached && Date.now() - cached.lastChecked < this.CACHE_TTL) {
      return cached.isValid ? originalUrl : null;
    }

    // Check if we're already validating this URL
    if (this.pendingChecks.has(originalUrl)) {
      const isValid = await this.pendingChecks.get(originalUrl)!;
      return isValid ? originalUrl : null;
    }

    // Start validation
    const validationPromise = this.validateImageUrl(originalUrl);
    this.pendingChecks.set(originalUrl, validationPromise);

    try {
      const isValid = await validationPromise;
      this.cache[originalUrl] = {
        isValid,
        lastChecked: Date.now()
      };

      return isValid ? originalUrl : null;
    } finally {
      this.pendingChecks.delete(originalUrl);
    }
  }

  /**
   * Get a valid image URL with automatic fallbacks
   */
  async getImageWithFallbacks(originalUrl: string): Promise<string | null> {
    if (!originalUrl || !this.isIGDBImageUrl(originalUrl)) {
      return null;
    }

    // Try original URL first
    const originalValid = await this.getValidImageUrl(originalUrl);
    if (originalValid) {
      return originalValid;
    }

    // Try fallback formats
    const fallbacks = this.generateFallbackUrls(originalUrl);
    
    for (const fallbackUrl of fallbacks) {
      const validUrl = await this.getValidImageUrl(fallbackUrl);
      if (validUrl) {
        return validUrl;
      }
    }

    return null; // No valid URL found
  }

  /**
   * Validate if an image URL returns 200
   */
  private async validateImageUrl(url: string): Promise<boolean> {
    try {
      // Use a HEAD request to check if image exists without downloading it
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-cache'
      });

      clearTimeout(timeoutId);
      return response.ok;
      
    } catch (error) {
      // Network error, timeout, or 404 - consider invalid
      return false;
    }
  }

  /**
   * Generate fallback URLs for IGDB images
   */
  private generateFallbackUrls(originalUrl: string): string[] {
    const fallbacks: string[] = [];

    // Try different sizes
    if (originalUrl.includes('t_cover_big')) {
      fallbacks.push(originalUrl.replace('t_cover_big', 't_cover_small'));
      fallbacks.push(originalUrl.replace('t_cover_big', 't_thumb'));
    }

    // Try different formats
    if (originalUrl.includes('f_webp')) {
      fallbacks.push(originalUrl.replace('f_webp', 'f_jpg'));
      fallbacks.push(originalUrl.replace('f_webp', 'f_png'));
    }

    // Try different quality settings
    if (originalUrl.includes('q_85')) {
      fallbacks.push(originalUrl.replace('q_85', 'q_75'));
      fallbacks.push(originalUrl.replace('q_85', 'q_60'));
    }

    // Try removing size restrictions
    fallbacks.push(originalUrl.replace(/,w_\d+,h_\d+/, ''));

    return fallbacks;
  }

  /**
   * Check if URL is an IGDB image URL
   */
  private isIGDBImageUrl(url: string): boolean {
    return url.includes('images.igdb.com');
  }

  /**
   * Clear expired cache entries
   */
  public clearExpiredCache(): void {
    const now = Date.now();
    for (const [url, entry] of Object.entries(this.cache)) {
      if (now - entry.lastChecked > this.CACHE_TTL) {
        delete this.cache[url];
      }
    }
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { total: number; valid: number; invalid: number } {
    const entries = Object.values(this.cache);
    return {
      total: entries.length,
      valid: entries.filter(e => e.isValid).length,
      invalid: entries.filter(e => !e.isValid).length
    };
  }
}

export const igdbImageService = IGDBImageService.getInstance();
export default igdbImageService;