import React, { useState, useEffect, useRef } from 'react';
import { FixedSizeList as List } from 'react-window';
import { ActivityType } from '../types/activity';
import { ActivityItem } from './ActivityItem';

interface VirtualizedActivityFeedProps {
  activities: ActivityType[];
  height: number;
  itemHeight?: number;
  className?: string;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
}

export const VirtualizedActivityFeed: React.FC<VirtualizedActivityFeedProps> = ({
  activities,
  height,
  itemHeight = 120,
  className = '',
  onLoadMore,
  hasMore = false,
  isLoading = false
}) => {
  const [isScrolling, setIsScrolling] = useState(false);
  const listRef = useRef<List>(null);
  const scrollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Row renderer
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const activity = activities[index];
    
    // Check if we need to load more
    if (index === activities.length - 5 && hasMore && !isLoading && onLoadMore) {
      onLoadMore();
    }

    return (
      <div style={style} className="px-4">
        <ActivityItem 
          activity={activity} 
          compact={isScrolling}
        />
      </div>
    );
  };

  // Handle scroll state
  const handleScroll = () => {
    setIsScrolling(true);
    
    // Clear existing timer
    if (scrollTimerRef.current) {
      clearTimeout(scrollTimerRef.current);
    }
    
    // Set new timer
    scrollTimerRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current);
      }
    };
  }, []);

  // Scroll to top when activities change significantly
  useEffect(() => {
    if (listRef.current && activities.length > 0) {
      listRef.current.scrollToItem(0, 'start');
    }
  }, [activities.length]);

  return (
    <div className={`${className}`}>
      <List
        ref={listRef}
        height={height}
        itemCount={activities.length}
        itemSize={itemHeight}
        width="100%"
        onScroll={handleScroll}
        overscanCount={5}
        className="scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900"
      >
        {Row}
      </List>
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-gray-900 to-transparent">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        </div>
      )}
      
      {/* No more items indicator */}
      {!hasMore && activities.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 p-4 text-center text-gray-500 text-sm">
          No more activities
        </div>
      )}
    </div>
  );
};
