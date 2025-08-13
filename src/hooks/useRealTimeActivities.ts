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
  
  // Process batched activities
  const processBatchedActivities = useCallback(() => {
    if (pendingActivities.current.length === 0) return;
    
    setActivities(prev => {
      // Combine existing and new activities
      const combined = [...pendingActivities.current, ...prev];
      
      // Sort by timestamp (newest first)
      combined.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      // Remove duplicates (by id)
      const uniqueActivities = combined.filter(
        (activity, index, self) => 
          index === self.findIndex(a => a.id === activity.id)
      );
      
      return uniqueActivities;
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
      
      // Clear existing timeout
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }
      
      // Set new timeout
      batchTimeoutRef.current = setTimeout(() => {
        processBatchedActivities();
      }, batchInterval);
    } else {
      // Update immediately
      setActivities(prev => {
        const combined = [activity, ...prev];
        
        // Remove duplicates (by id)
        const uniqueActivities = combined.filter(
          (a, index, self) => 
            index === self.findIndex(item => item.id === a.id)
        );
        
        return uniqueActivities;
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