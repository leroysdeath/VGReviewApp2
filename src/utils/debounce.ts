/**
 * Debounce utility for optimizing input handlers
 */

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return function debounced(...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
}

/**
 * Throttle utility for rate limiting function calls
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return function throttled(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Create a debounced version of an async function with loading state
 */
export function debounceAsync<T extends (...args: any[]) => Promise<any>>(
  func: T,
  delay: number
): {
  debounced: (...args: Parameters<T>) => Promise<ReturnType<T> | undefined>;
  cancel: () => void;
} {
  let timeoutId: NodeJS.Timeout | null = null;
  let currentPromise: Promise<any> | null = null;

  const cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  const debounced = (...args: Parameters<T>): Promise<ReturnType<T> | undefined> => {
    cancel();

    currentPromise = new Promise((resolve) => {
      timeoutId = setTimeout(async () => {
        try {
          const result = await func(...args);
          resolve(result);
        } catch (error) {
          console.error('Debounced async function error:', error);
          resolve(undefined);
        }
      }, delay);
    });

    return currentPromise;
  };

  return { debounced, cancel };
}