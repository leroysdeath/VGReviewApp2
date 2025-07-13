import React, { useEffect, useRef, useCallback } from 'react';

interface InfiniteScrollProps {
  children: React.ReactNode;
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
  onScroll?: () => void;
  threshold?: number; // Percentage of scroll (0-100) to trigger load more
  debounceMs?: number; // Debounce time in milliseconds
  className?: string;
}

export const InfiniteScroll: React.FC<InfiniteScrollProps> = ({
  children,
  hasMore,
  loading,
  onLoadMore,
  onScroll,
  threshold = 100,
  debounceMs = 150,
  className = ''
}) => {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      
      // Call onScroll callback if provided
      if (entry.isIntersecting && onScroll) {
        onScroll();
      }
      
      if (
        entry.isIntersecting &&
        hasMore &&
        !loading &&
        !loadingRef.current
      ) {
        // Clear any existing debounce timer
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }

        // Set debounce timer
        debounceTimerRef.current = setTimeout(() => {
          loadingRef.current = true;
          onLoadMore();
          
          // Reset loading ref after a short delay
          setTimeout(() => {
            loadingRef.current = false;
          }, 1000);
        }, debounceMs);
      }
    },
    [hasMore, loading, onLoadMore, onScroll, debounceMs]
  );

  useEffect(() => {
    const observer = new IntersectionObserver(handleIntersection, {
      threshold: 0.1,
      rootMargin: `0px 0px ${threshold}px 0px` // Load when sentinel is threshold pixels away from viewport
    });

    const sentinel = sentinelRef.current;
    if (sentinel) {
      observer.observe(sentinel);
    }

    return () => {
      // Clean up debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      if (sentinel) {
        observer.unobserve(sentinel);
      }
    };
  }, [handleIntersection, threshold, debounceMs]);

  return (
    <div className={className}>
      {children}
      
      {/* Sentinel element for intersection observer */}
      <div ref={sentinelRef} className="h-4" aria-hidden="true" />
      
      {/* Loading indicator */}
      {loading && (
        <div className="flex items-center justify-center py-8" aria-live="polite" role="status">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-[#7289DA] border-t-transparent rounded-full animate-spin" />
            <span className="text-[#B3B3B3]">Loading more activities...</span>
          </div>
        </div>
      )}
      
      {/* End of content indicator */}
      {!hasMore && !loading && (
        <div className="text-center py-8" aria-live="polite">
          <p className="text-[#B3B3B3]">You've reached the end of the feed</p>
        </div>
      )}
    </div>
  );
};