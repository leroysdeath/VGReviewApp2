import React, { useState, useEffect, useRef } from 'react';
import { Activity } from '../types/activity';
import { useRealTimeActivities } from '../hooks/useRealTimeActivities';
import { InfiniteScroll } from './InfiniteScroll';
import { AlertCircle, RefreshCw, Wifi, WifiOff, Bell } from 'lucide-react';

interface RealTimeActivityFeedProps {
  initialActivities?: Activity[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  className?: string;
  renderItem: (activity: Activity, isNew: boolean) => React.ReactNode;
}

export const RealTimeActivityFeed: React.FC<RealTimeActivityFeedProps> = ({
  initialActivities = [],
  isLoading = false,
  error = null,
  onRetry,
  className = '',
  renderItem
}) => {
  // Use real-time activities hook
  const {
    activities: realtimeActivities,
    connectionState,
    connectionMessage,
    unreadCount,
    markAllAsRead
  } = useRealTimeActivities({
    enabled: true,
    batchUpdates: true,
    batchInterval: 500,
    enablePollingFallback: true
  });
  
  // Combine initial and real-time activities
  const [combinedActivities, setCombinedActivities] = useState<Activity[]>([]);
  
  // Track new activities for highlight animation
  const [newActivityIds, setNewActivityIds] = useState<Set<string>>(new Set());
  
  // Ref to track previous activities length for detecting new items
  const prevActivitiesLengthRef = useRef(initialActivities.length);
  
  // Merge initial and real-time activities
  useEffect(() => {
    const allActivities = [...realtimeActivities];
    
    // Add initial activities that aren't already in the real-time list
    initialActivities.forEach(activity => {
      if (!allActivities.some(a => a.id === activity.id)) {
        allActivities.push(activity);
      }
    });
    
    // Sort by timestamp (newest first)
    allActivities.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    // Update combined activities
    setCombinedActivities(allActivities);
    
    // Track new activities for highlight animation
    if (realtimeActivities.length > prevActivitiesLengthRef.current) {
      const newIds = new Set<string>();
      
      // Get IDs of new activities
      realtimeActivities
        .slice(0, realtimeActivities.length - prevActivitiesLengthRef.current)
        .forEach(activity => {
          newIds.add(activity.id);
        });
      
      // Update new activity IDs
      setNewActivityIds(prev => {
        const updated = new Set(prev);
        newIds.forEach(id => updated.add(id));
        return updated;
      });
      
      // Clear highlight after animation
      const newIdsArray = Array.from(newIds);
      if (newIdsArray.length > 0) {
        setTimeout(() => {
          setNewActivityIds(prev => {
            const updated = new Set(prev);
            newIdsArray.forEach(id => updated.delete(id));
            return updated;
          });
        }, 3000); // 3 seconds highlight
      }
    }
    
    // Update previous length ref
    prevActivitiesLengthRef.current = realtimeActivities.length;
  }, [initialActivities, realtimeActivities]);
  
  // Mark all as read when user scrolls
  const handleScroll = () => {
    if (unreadCount > 0) {
      markAllAsRead();
    }
  };
  
  // Empty state
  if (combinedActivities.length === 0 && !isLoading && !error) {
    return (
      <div className={`bg-gray-800 rounded-lg p-6 text-center ${className}`}>
        <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <Bell className="h-8 w-8 text-gray-500" />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">No Activity Yet</h3>
        <p className="text-gray-400">
          Activities will appear here in real-time as they occur.
        </p>
      </div>
    );
  }
  
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Connection Status */}
      <div className={`flex items-center justify-between p-3 rounded-lg ${
        connectionState === 'connected' 
          ? 'bg-green-900/20 border border-green-800/30' 
          : connectionState === 'reconnecting'
            ? 'bg-yellow-900/20 border border-yellow-800/30'
            : 'bg-red-900/20 border border-red-800/30'
      }`}>
        <div className="flex items-center gap-2">
          {connectionState === 'connected' ? (
            <Wifi className="h-4 w-4 text-green-400" />
          ) : connectionState === 'reconnecting' ? (
            <RefreshCw className="h-4 w-4 text-yellow-400 animate-spin" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-400" />
          )}
          <span className={`text-sm ${
            connectionState === 'connected' 
              ? 'text-green-400' 
              : connectionState === 'reconnecting'
                ? 'text-yellow-400'
                : 'text-red-400'
          }`}>
            {connectionState === 'connected' 
              ? 'Connected - Receiving real-time updates' 
              : connectionState === 'reconnecting'
                ? 'Reconnecting...'
                : 'Disconnected - Falling back to polling'}
          </span>
        </div>
        
        {/* Unread counter */}
        {unreadCount > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-blue-400">{unreadCount} new {unreadCount === 1 ? 'activity' : 'activities'}</span>
          </div>
        )}
      </div>
      
      {/* Error message */}
      {error && (
        <div className="bg-red-900/30 border border-red-800/50 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <p className="text-red-300">{error}</p>
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 px-4 py-2 bg-red-800/50 text-white rounded-lg hover:bg-red-700/50 transition-colors text-sm"
            >
              Try Again
            </button>
          )}
        </div>
      )}
      
      {/* Connection message */}
      {connectionMessage && connectionState !== 'connected' && (
        <div className={`p-3 rounded-lg text-sm ${
          connectionState === 'reconnecting'
            ? 'bg-yellow-900/20 text-yellow-300'
            : 'bg-red-900/20 text-red-300'
        }`}>
          {connectionMessage}
        </div>
      )}
      
      {/* Loading skeleton */}
      {isLoading && combinedActivities.length === 0 && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div 
              key={index}
              className="bg-gray-800 rounded-lg p-4 animate-pulse"
              aria-busy="true"
              aria-label="Loading activity item"
            >
              <div className="flex gap-3">
                {/* Avatar skeleton */}
                <div className="w-10 h-10 bg-gray-700 rounded-full flex-shrink-0"></div>
                
                {/* Content skeleton */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="h-4 bg-gray-700 rounded w-32"></div>
                    <div className="h-4 bg-gray-700 rounded w-16"></div>
                  </div>
                  <div className="h-4 bg-gray-700 rounded w-full mb-2"></div>
                  <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                  <div className="h-16 bg-gray-700 rounded w-full mt-2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Activities list with infinite scroll */}
      <InfiniteScroll
        hasMore={false} // We're not loading more in real-time mode
        loading={isLoading}
        onLoadMore={() => {}}
        className="space-y-4"
        onScroll={handleScroll}
      >
        {combinedActivities.map((activity) => (
          <div 
            key={activity.id}
            className={`transition-all duration-500 ${
              newActivityIds.has(activity.id) 
                ? 'bg-blue-900/30 animate-pulse' 
                : ''
            }`}
          >
            {renderItem(activity, newActivityIds.has(activity.id))}
          </div>
        ))}
      </InfiniteScroll>
      
      {/* Loading indicator */}
      {isLoading && combinedActivities.length > 0 && (
        <div className="flex justify-center items-center py-4">
          <RefreshCw className="h-6 w-6 text-blue-400 animate-spin" />
          <span className="ml-2 text-gray-400">Loading activities...</span>
        </div>
      )}
    </div>
  );
};