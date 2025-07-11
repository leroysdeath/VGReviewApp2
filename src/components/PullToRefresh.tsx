import React, { useState, useRef, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
  threshold?: number;
  disabled?: boolean;
  className?: string;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  children,
  onRefresh,
  threshold = 80,
  disabled = false,
  className = '',
}) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [canRefresh, setCanRefresh] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);
  const isDragging = useRef(false);

  const handleTouchStart = (e: TouchEvent) => {
    if (disabled || isRefreshing) return;
    
    const container = containerRef.current;
    if (!container || container.scrollTop > 0) return;
    
    startY.current = e.touches[0].clientY;
    isDragging.current = true;
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging.current || disabled || isRefreshing) return;
    
    currentY.current = e.touches[0].clientY;
    const distance = Math.max(0, currentY.current - startY.current);
    
    if (distance > 0) {
      e.preventDefault();
      const dampedDistance = Math.min(distance * 0.5, threshold * 1.5);
      setPullDistance(dampedDistance);
      setCanRefresh(dampedDistance >= threshold);
    }
  };

  const handleTouchEnd = async () => {
    if (!isDragging.current || disabled) return;
    
    isDragging.current = false;
    
    if (canRefresh && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      } finally {
        setIsRefreshing(false);
      }
    }
    
    setPullDistance(0);
    setCanRefresh(false);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [disabled, isRefreshing, canRefresh, threshold]);

  const getRefreshIndicatorStyle = () => {
    const progress = Math.min(pullDistance / threshold, 1);
    const opacity = Math.min(pullDistance / (threshold * 0.5), 1);
    const scale = 0.5 + (progress * 0.5);
    const rotation = progress * 180;

    return {
      transform: `translateY(${pullDistance}px) scale(${scale}) rotate(${rotation}deg)`,
      opacity,
    };
  };

  const getContainerStyle = () => {
    return {
      transform: `translateY(${pullDistance}px)`,
      transition: isDragging.current ? 'none' : 'transform 0.3s ease-out',
    };
  };

  return (
    <div ref={containerRef} className={`relative overflow-auto ${className}`}>
      {/* Pull to Refresh Indicator */}
      <div
        className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full z-10 flex flex-col items-center justify-center py-4"
        style={getRefreshIndicatorStyle()}
      >
        <div className={`p-3 rounded-full transition-colors duration-200 ${
          canRefresh ? 'bg-game-green' : 'bg-gray-700'
        }`}>
          <RefreshCw 
            className={`h-6 w-6 text-white transition-all duration-200 ${
              isRefreshing ? 'animate-spin' : ''
            }`} 
          />
        </div>
        <p className="text-sm text-gray-400 mt-2">
          {isRefreshing 
            ? 'Refreshing...' 
            : canRefresh 
            ? 'Release to refresh' 
            : 'Pull to refresh'
          }
        </p>
      </div>

      {/* Content */}
      <div style={getContainerStyle()}>
        {children}
      </div>
    </div>
  );
};