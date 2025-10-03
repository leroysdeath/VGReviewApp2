/**
 * Lazy loading with automatic retry and cache busting
 * Fixes "Failed to fetch dynamically imported module" errors
 *
 * Common causes:
 * - User has old HTML after new deployment (chunk hash changed)
 * - Temporary network issues
 * - CDN propagation delays
 */

import { ComponentType, lazy } from 'react';

interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  onError?: (error: Error, attempt: number) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  retryDelay: 1000,
  onError: (error, attempt) => {
    console.warn(`Lazy load attempt ${attempt} failed:`, error.message);
  }
};

/**
 * Retry a failed import with exponential backoff
 */
async function retryImport<T>(
  importFn: () => Promise<T>,
  options: Required<RetryOptions>,
  attempt: number = 1
): Promise<T> {
  try {
    return await importFn();
  } catch (error) {
    const isLastAttempt = attempt >= options.maxRetries;

    if (isLastAttempt) {
      // On final failure, try cache-busting reload
      if (error instanceof Error && error.message.includes('Failed to fetch')) {
        console.error('All retry attempts failed. Reloading page to clear cache...');
        // Add timestamp to force cache bust
        window.location.href = window.location.href.split('?')[0] + '?t=' + Date.now();
      }
      throw error;
    }

    // Log the retry attempt
    if (options.onError && error instanceof Error) {
      options.onError(error, attempt);
    }

    // Wait with exponential backoff
    const delay = options.retryDelay * Math.pow(2, attempt - 1);
    await new Promise(resolve => setTimeout(resolve, delay));

    // Retry
    return retryImport(importFn, options, attempt + 1);
  }
}

/**
 * Enhanced lazy loading with retry logic
 *
 * Usage:
 * ```typescript
 * export const UserPage = lazyWithRetry(() => import('./pages/UserPage'));
 * ```
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: RetryOptions = {}
): React.LazyExoticComponent<T> {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  return lazy(() => retryImport(importFn, mergedOptions));
}

/**
 * Check if a chunk loading error occurred
 */
export function isChunkLoadError(error: Error): boolean {
  return (
    error.message.includes('Failed to fetch dynamically imported module') ||
    error.message.includes('ChunkLoadError') ||
    error.message.includes('Loading chunk') ||
    error.message.includes('Failed to fetch')
  );
}

/**
 * Handle chunk load errors globally
 * Call this in your error boundary or error handler
 */
export function handleChunkLoadError(error: Error): void {
  if (isChunkLoadError(error)) {
    console.error('Chunk load error detected:', error);

    // Show user-friendly message
    const shouldReload = window.confirm(
      'A new version of the app is available. Would you like to reload to get the latest version?'
    );

    if (shouldReload) {
      // Clear caches and reload
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          registrations.forEach(registration => registration.unregister());
        });
      }

      // Force reload with cache bust
      window.location.href = window.location.href.split('?')[0] + '?t=' + Date.now();
    }
  }
}

/**
 * Preload a lazy component (useful for critical routes)
 *
 * Usage:
 * ```typescript
 * // Preload on hover
 * <Link to="/user/1" onMouseEnter={() => preloadComponent(UserPage)}>
 * ```
 */
export function preloadComponent<T extends ComponentType<any>>(
  lazyComponent: React.LazyExoticComponent<T>
): void {
  // React lazy components have a _payload property with the load function
  const component = lazyComponent as any;
  if (component._payload && typeof component._payload._result === 'undefined') {
    // Trigger the import
    component._payload._result = component._payload._init(component._payload._value);
  }
}
