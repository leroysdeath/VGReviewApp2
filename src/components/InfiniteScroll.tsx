import React, { useEffect, useRef, useCallback } from 'react';

interface InfiniteScrollProps {
  children: React.ReactNode;
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
  threshold?: number;
  className?: string;
}

export const InfiniteScroll: React.FC<InfiniteScrollProps> = ({
  children,
  hasMore,
  loading,
  onLoadMore,
  threshold = 100,
  className = ''
}) => {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      
      if (
        entry.isIntersecting &&
        hasMore &&
        !loading &&
        !loadingRef.current
      ) {
        loadingRef.current = true;
        onLoadMore();
        
        // Reset loading ref after a short delay
        setTimeout(() => {
          loadingRef.current = false;
        }, 1000);
      }
    },
    [hasMore, loading, onLoadMore]
  );

  useEffect(() => {
    const observer = new IntersectionObserver(handleIntersection, {
      threshold: 0.1,
      rootMargin: `${threshold}px`
    });

    const sentinel = sentinelRef.current;
    if (sentinel) {
      observer.observe(sentinel);
    }

    return () => {
      if (sentinel) {
        observer.unobserve(sentinel);
      }
    };
  }, [handleIntersection, threshold]);

  return (
    <div className={className}>
      {children}
      
      {/* Sentinel element for intersection observer */}
      <div ref={sentinelRef} className="h-4" />
      
      {/* Loading indicator */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-[#7289DA] border-t-transparent rounded-full animate-spin" />
            <span className="text-[#B3B3B3]">Loading more activities...</span>
          </div>
        </div>
      )}
      
      {/* End of content indicator */}
      {!hasMore && !loading && (
        <div className="text-center py-8">
          <p className="text-[#B3B3B3]">You've reached the end of the feed</p>
        </div>
      )}
    </div>
  );
};