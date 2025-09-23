import { useEffect, useState, RefObject } from 'react';

interface UseInViewOptions {
  /**
   * Margin around the root bounds
   * @default '0px'
   */
  rootMargin?: string;

  /**
   * Percentage of target visible to trigger
   * @default 0.1
   */
  threshold?: number | number[];

  /**
   * Whether to unobserve after first intersection
   * @default false
   */
  triggerOnce?: boolean;

  /**
   * Root element for intersection
   * @default null (viewport)
   */
  root?: Element | null;
}

/**
 * Hook to detect when an element is in the viewport using IntersectionObserver
 */
export const useInView = (
  ref: RefObject<Element>,
  options: UseInViewOptions = {}
): boolean => {
  const {
    rootMargin = '0px',
    threshold = 0.1,
    triggerOnce = false,
    root = null
  } = options;

  const [isInView, setIsInView] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || (triggerOnce && hasTriggered)) return;

    // Check if IntersectionObserver is supported
    if (!window.IntersectionObserver) {
      // Fallback: assume element is in view
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const inView = entry.isIntersecting;

          if (inView) {
            setIsInView(true);
            if (triggerOnce) {
              setHasTriggered(true);
              observer.unobserve(element);
            }
          } else if (!triggerOnce) {
            setIsInView(false);
          }
        });
      },
      {
        root,
        rootMargin,
        threshold
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [ref, root, rootMargin, threshold, triggerOnce, hasTriggered]);

  return isInView;
};