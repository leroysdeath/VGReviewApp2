import { useState, useEffect, useCallback, useRef } from 'react';
import { Activity } from '../types/activity';
import realTimeService, { ConnectionState, RealTimeEvent } from '../services/realTimeService';

interface UseRealTimeActivitiesOptions {
  enabled?: boolean;
  onNewActivity?: (activity: Activity) => void;
  batchUpdates?: boolean;
  batchInterval?: number;
  enablePollingFallback?: boolean;
}

interface UseRealTimeActivitiesResult {
  activities: Activity[];
  connectionState: ConnectionState;
  connectionMessage?: string;
  unreadCount: number;
  markAllAsRead: () => void;
  connect: () => void;
  disconnect: () => void;
}

// Performance constants
const MAX_ACTIVITIES = 500; // Maximum number of activities to keep
const MAX_ACTIVITY_AGE_DAYS = 30; // Maximum age of activities in days
const MAX_PENDING = 50; // Maximum pending activities before forced processing

export const useRealTimeActivities = ({
  enabled = true,
  onNewActivity,
  batchUpdates = true,
  batchInterval = 500,
  enablePollingFallback = true
}: UseRealTimeActivitiesOptions = {}): UseRealTimeActivitiesResult => {
  // State
  const [activities, setActivities] = useState<Activity[]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [connectionMessage, setConnectionMessage] = useState<string | undefined>();
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Refs
  const pendingActivities = useRef<Activity[]>([]);
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);
  
  // Process batched activities - O(n) complexity with Map
  const processBatchedActivities = useCallback(() => {
    if (pendingActivities.current.length === 0) return;
    
    setActivities(prev => {
      // Use Map for O(1) lookups instead of O(n²) filter/findIndex
      const activityMap = new Map<string, Activity>();
      
      // Calculate cutoff date (30 days ago)
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - MAX_ACTIVITY_AGE_DAYS);
      const cutoffTime = cutoffDate.getTime();
      
      // Add existing activities that are within the time limit
      prev.forEach(activity => {
        const activityTime = new Date(activity.timestamp).getTime();
        if (activityTime >= cutoffTime) {
          activityMap.set(activity.id, activity);
        }
      });
      
      // Add new activities (overwrites duplicates automatically)
      pendingActivities.current.forEach(activity => {
        const activityTime = new Date(activity.timestamp).getTime();
        if (activityTime >= cutoffTime) {
          activityMap.set(activity.id, activity);
        }
      });
      
      // Convert back to array and sort by timestamp (newest first)
      const sortedActivities = Array.from(activityMap.values())
        .sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
      
      // Apply maximum item limit
      return sortedActivities.slice(0, MAX_ACTIVITIES);
    });
    
    // Update unread count
    setUnreadCount(prev => prev + pendingActivities.current.length);
    
    // Clear pending activities
    pendingActivities.current = [];
  }, []);
  
  // Handle new activity
  const handleNewActivity = useCallback((activity: Activity) => {
    // Call onNewActivity callback if provided
    onNewActivity?.(activity);
    
    if (batchUpdates) {
      // Add to pending activities
      pendingActivities.current.push(activity);
      
      // Force process if we hit the pending limit
      if (pendingActivities.current.length >= MAX_PENDING) {
        if (batchTimeoutRef.current) {
          clearTimeout(batchTimeoutRef.current);
          batchTimeoutRef.current = null;
        }
        processBatchedActivities();
        return;
      }
      
      // Clear existing timeout
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }
      
      // Set new timeout
      batchTimeoutRef.current = setTimeout(() => {
        processBatchedActivities();
      }, batchInterval);
    } else {
      // Update immediately with O(n) approach
      setActivities(prev => {
        const activityMap = new Map<string, Activity>();
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - MAX_ACTIVITY_AGE_DAYS);
        const cutoffTime = cutoffDate.getTime();
        
        // Add new activity first (if within time limit)
        const newActivityTime = new Date(activity.timestamp).getTime();
        if (newActivityTime >= cutoffTime) {
          activityMap.set(activity.id, activity);
        }
        
        // Add existing activities
        prev.forEach(a => {
          const activityTime = new Date(a.timestamp).getTime();
          if (activityTime >= cutoffTime && !activityMap.has(a.id)) {
            activityMap.set(a.id, a);
          }
        });
        
        // Convert to sorted array with limit
        return Array.from(activityMap.values())
          .sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          )
          .slice(0, MAX_ACTIVITIES);
      });
      
      // Update unread count
      setUnreadCount(prev => prev + 1);
    }
  }, [batchUpdates, batchInterval, onNewActivity, processBatchedActivities]);
  
  // Handle real-time events
  const handleEvent = useCallback((event: RealTimeEvent) => {
    if (event.type === 'activity') {
      handleNewActivity(event.data);
    } else if (event.type === 'connection') {
      setConnectionState(event.state);
      setConnectionMessage(event.message);
    }
  }, [handleNewActivity]);
  
  // Connect to real-time service
  const connect = useCallback(() => {
    realTimeService.connect();
  }, []);
  
  // Disconnect from real-time service
  const disconnect = useCallback(() => {
    realTimeService.disconnect();
  }, []);
  
  // Mark all activities as read
  const markAllAsRead = useCallback(() => {
    setUnreadCount(0);
  }, []);
  
  // Initialize real-time connection
  useEffect(() => {
    if (!enabled || isInitializedRef.current) return;
    
    isInitializedRef.current = true;
    
    // Add event listener
    const removeListener = realTimeService.addEventListener(handleEvent);
    
    // Connect if enabled
    if (enabled) {
      connect();
      
      // Enable polling fallback if requested
      if (enablePollingFallback) {
        realTimeService.enablePolling();
      }
    }
    
    // Cleanup
    return () => {
      removeListener();
      
      // Clear any pending batch timeout
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }
      
      // Disconnect if component is unmounted
      disconnect();
      
      // Disable polling
      if (enablePollingFallback) {
        realTimeService.disablePolling();
      }
    };
  }, [enabled, connect, disconnect, handleEvent, enablePollingFallback]);
  
  return {
    activities,
    connectionState,
    connectionMessage,
    unreadCount,
    markAllAsRead,
    connect,
    disconnect
  };
};