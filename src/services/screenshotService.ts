/**
 * Screenshot Service
 * Handles dynamic screenshot URL transformation based on device type
 * Desktop: t_1080p_2x (3840×2160)
 * Mobile: t_720p (1280×720)
 */

class ScreenshotService {
  private static instance: ScreenshotService;
  private isMobileCache: boolean | null = null;
  private resizeTimeout: NodeJS.Timeout | null = null;

  private constructor() {
    // Set up window resize listener with debouncing
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', () => {
        if (this.resizeTimeout) {
          clearTimeout(this.resizeTimeout);
        }
        this.resizeTimeout = setTimeout(() => {
          this.resetMobileCache();
        }, 250); // Debounce resize events
      });
    }
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ScreenshotService {
    if (!ScreenshotService.instance) {
      ScreenshotService.instance = new ScreenshotService();
    }
    return ScreenshotService.instance;
  }

  /**
   * Detect if the user is on a mobile device
   * Uses combination of viewport width and user agent
   */
  private isMobile(): boolean {
    // Cache the result for the session to avoid repeated calculations
    if (this.isMobileCache !== null) {
      return this.isMobileCache;
    }

    // Check viewport width (less than 768px is considered mobile)
    const isMobileViewport = typeof window !== 'undefined' && window.innerWidth < 768;

    // Check user agent for mobile devices
    const isMobileUserAgent = typeof navigator !== 'undefined' &&
      /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    // Consider it mobile if either condition is true
    this.isMobileCache = isMobileViewport || isMobileUserAgent;

    return this.isMobileCache;
  }

  /**
   * Reset mobile detection cache (useful for testing or when window resizes)
   */
  public resetMobileCache(): void {
    this.isMobileCache = null;
  }

  /**
   * Transform a screenshot URL to use the appropriate template for the device
   * @param originalUrl - The original IGDB screenshot URL
   * @returns Transformed URL with appropriate template
   */
  public getOptimizedUrl(originalUrl: string | null | undefined): string {
    if (!originalUrl) return '';

    // Determine the target template based on device
    const targetTemplate = this.isMobile() ? 't_720p' : 't_1080p_2x';

    // Transform the URL
    let optimizedUrl = originalUrl;

    // Check if URL already has a template
    if (optimizedUrl.includes('/t_')) {
      // Replace existing template with the target template
      optimizedUrl = optimizedUrl.replace(/t_[^/]+/, targetTemplate);
    } else if (optimizedUrl.includes('igdb/image/upload/')) {
      // Add template after upload/ if missing
      optimizedUrl = optimizedUrl.replace(
        'igdb/image/upload/',
        `igdb/image/upload/${targetTemplate}/`
      );
    }

    // If the URL doesn't have WebP extension yet, convert it
    if (!optimizedUrl.endsWith('.webp')) {
      optimizedUrl = optimizedUrl.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    }

    return optimizedUrl;
  }

  /**
   * Transform an array of screenshot URLs
   * @param urls - Array of original IGDB screenshot URLs
   * @returns Array of transformed URLs
   */
  public getOptimizedUrls(urls: string[] | null | undefined): string[] {
    if (!urls || urls.length === 0) return [];

    return urls.map(url => this.getOptimizedUrl(url));
  }

  /**
   * Get a specific template URL regardless of device
   * Useful for cases where you want to override the automatic detection
   * @param originalUrl - The original IGDB screenshot URL
   * @param template - The desired template (e.g., 't_720p', 't_1080p', 't_1080p_2x')
   * @returns URL with specified template
   */
  public getUrlWithTemplate(originalUrl: string | null | undefined, template: string): string {
    if (!originalUrl) return '';

    let transformedUrl = originalUrl;

    // Check if URL already has a template
    if (transformedUrl.includes('/t_')) {
      // Replace existing template with the specified template
      transformedUrl = transformedUrl.replace(/t_[^/]+/, template);
    } else if (transformedUrl.includes('igdb/image/upload/')) {
      // Add template after upload/ if missing
      transformedUrl = transformedUrl.replace(
        'igdb/image/upload/',
        `igdb/image/upload/${template}/`
      );
    }

    // Convert to WebP if not already
    if (!transformedUrl.endsWith('.webp')) {
      transformedUrl = transformedUrl.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    }

    return transformedUrl;
  }

  /**
   * Extract the image ID from an IGDB URL
   * @param url - The IGDB URL
   * @returns The image ID (e.g., 'sc63a8')
   */
  public extractImageId(url: string): string | null {
    const match = url.match(/\/([^/]+)\.(jpg|jpeg|png|webp)$/i);
    return match ? match[1] : null;
  }

  /**
   * Build an IGDB URL from an image ID
   * @param imageId - The image ID (e.g., 'sc63a8')
   * @param template - Optional template override
   * @returns Complete IGDB URL
   */
  public buildUrl(imageId: string, template?: string): string {
    const targetTemplate = template || (this.isMobile() ? 't_720p' : 't_1080p_2x');
    return `https://images.igdb.com/igdb/image/upload/${targetTemplate}/${imageId}.webp`;
  }

  /**
   * Get responsive image srcset for picture element
   * Provides multiple resolutions for browser to choose from
   * @param originalUrl - The original IGDB screenshot URL
   * @returns Object with srcset strings for different screen densities
   */
  public getResponsiveSrcSet(originalUrl: string | null | undefined): {
    mobile: string;
    desktop: string;
    fallback: string;
  } {
    if (!originalUrl) {
      return {
        mobile: '',
        desktop: '',
        fallback: ''
      };
    }

    const imageId = this.extractImageId(originalUrl);
    if (!imageId) {
      return {
        mobile: originalUrl,
        desktop: originalUrl,
        fallback: originalUrl
      };
    }

    return {
      mobile: `
        ${this.buildUrl(imageId, 't_screenshot_big')} 1x,
        ${this.buildUrl(imageId, 't_720p')} 2x
      `.trim(),
      desktop: `
        ${this.buildUrl(imageId, 't_1080p')} 1x,
        ${this.buildUrl(imageId, 't_1080p_2x')} 2x
      `.trim(),
      fallback: this.getOptimizedUrl(originalUrl)
    };
  }

  /**
   * Log screenshot optimization statistics (useful for debugging)
   */
  public logOptimizationInfo(originalUrl: string): void {
    const optimizedUrl = this.getOptimizedUrl(originalUrl);
    const device = this.isMobile() ? 'Mobile' : 'Desktop';
    const template = this.isMobile() ? 't_720p' : 't_1080p_2x';

    console.log('Screenshot Optimization:', {
      device,
      template,
      original: originalUrl,
      optimized: optimizedUrl,
      viewport: typeof window !== 'undefined' ? window.innerWidth : 'N/A'
    });
  }
}

// Export singleton instance
export const screenshotService = ScreenshotService.getInstance();

// Also export the class for testing purposes
export { ScreenshotService };