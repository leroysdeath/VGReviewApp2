import React, { useCallback, useState, useRef, useEffect } from 'react';
import { VariableSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { Activity } from './ActivityFeed';
import { RefreshCw, AlertCircle } from 'lucide-react';

interface VirtualizedActivityFeedProps {
  activities: Activity[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  onLoadMore: () => void;
  onRetry?: () => void;
  itemHeight?: number | ((index: number) => number);
  className?: string;
  renderItem: (activity: Activity, index: number) => React.ReactNode;
}

export const VirtualizedActivityFeed: React.FC<VirtualizedActivityFeedProps> = ({
  activities,
  isLoading,
  error,
  hasMore,
  onLoadMore,
  onRetry,
  className = '',
  renderItem,
  itemHeight = 150 // Default height for each item
}) => {
  const listRef = useRef<List>(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const outerRef = useRef<HTMLDivElement>(null);
  
  // Calculate dynamic heights for items if needed
  const getItemHeight = useCallback((index: number) => {
    if (typeof itemHeight === 'function') {
      return itemHeight(index);
    }
    
    // Add extra height for the last item if it's a loading indicator
    if (index === activities.length && (isLoading || error)) {
      return 100; // Height for loading/error indicator
    }
    
    return itemHeight;
  }, [activities.length, isLoading, error, itemHeight]);
  
  // Handle scroll events
  const handleScroll = useCallback(({ scrollOffset, scrollDirection }: { scrollOffset: number, scrollDirection: 'forward' | 'backward' }) => {
    setScrollPosition(scrollOffset);
    setIsScrolling(true);
    
    // Clear any existing scroll timer
    if (window.scrollTimer) {
      clearTimeout(window.scrollTimer);
    }
    
    // Set a timer to detect when scrolling stops
    window.scrollTimer = setTimeout(() => {
      setIsScrolling(false);
    }, 150) as unknown as number;
    
    // Check if we need to load more items
    if (scrollDirection === 'forward' && hasMore && !isLoading && outerRef.current) {
      const { scrollHeight, scrollTop, clientHeight } = outerRef.current;
      const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;
      
      if (scrollPercentage > 0.8) {
        onLoadMore();
      }
    }
  }, [hasMore, isLoading, onLoadMore]);
  
  // Restore scroll position when activities change
  useEffect(() => {
    if (listRef.current && scrollPosition > 0) {
      listRef.current.scrollTo(scrollPosition);
    }
  }, [activities, scrollPosition]);
  
  // Item renderer
  const ItemRenderer = useCallback(({ index, style }: { index: number, style: React.CSSProperties }) => {
    // Check if this is the loading/error indicator
    if (index === activities.length) {
      if (isLoading) {
        return (
          <div style={style} className="flex items-center justify-center py-4" aria-live="polite" role="status">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-5 w-5 text-[#7289DA] animate-spin" />
              <span className="text-[#B3B3B3]">Loading more activities...</span>
            </div>
          </div>
        );
      }
      
      if (error) {
        return (
          <div style={style} className="flex flex-col items-center justify-center py-4">
            <div className="flex items-center gap-2 text-red-400 mb-2">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-4 py-2 bg-[#7289DA] text-white rounded-lg hover:bg-[#5a6ebd] transition-colors"
              >
                Try Again
              </button>
            )}
          </div>
        );
      }
      
      if (!hasMore) {
        return (
          <div style={style} className="text-center py-4" aria-live="polite">
            <p className="text-[#B3B3B3]">You've reached the end of the feed</p>
          </div>
        );
      }
      
      return null;
    }
    
    // Render actual activity item
    return (
      <div style={style}>
        {renderItem(activities[index], index)}
      </div>
    );
  }, [activities, isLoading, error, hasMore, onRetry, renderItem]);
  
  return (
    <div className={className} style={{ height: '100%', minHeight: '400px' }}>
      <AutoSizer>
        {({ height, width }) => (
          <List
            ref={listRef}
            outerRef={outerRef}
            height={height}
            width={width}
            itemCount={activities.length + 1} // +1 for loading/error/end indicator
            itemSize={getItemHeight}
            onScroll={handleScroll}
            overscanCount={3} // Number of items to render above/below the visible area
          >
            {ItemRenderer}
          </List>
        )}
      </AutoSizer>
    </div>
  );
};