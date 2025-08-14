import React, { useEffect, useState } from 'react';
import { Bell, X, CheckCheck, AlertTriangle, RefreshCw } from 'lucide-react';
import FocusTrap from 'focus-trap-react';
import { useNotificationStore } from '../store/notificationStore';
import { NotificationItem } from './NotificationItem';
import { InfiniteScroll } from './InfiniteScroll';

interface NotificationCenterProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  userId,
  isOpen,
  onClose,
  className = ''
}) => {
  const { 
    notifications, 
    unreadCount, 
    isLoading, 
    error, 
    hasMore,
    fetchNotifications,
    fetchMoreNotifications,
    markAllAsRead,
    clearError
  } = useNotificationStore();
  
  const [initialLoad, setInitialLoad] = useState(true);
  const [lastFocusedElement, setLastFocusedElement] = useState<HTMLElement | null>(null);
  
  // Fetch notifications when opened
  useEffect(() => {
    if (isOpen && initialLoad) {
      fetchNotifications(userId);
      setInitialLoad(false);
      
      // Store the currently focused element
      setLastFocusedElement(document.activeElement as HTMLElement);
    }
  }, [isOpen, initialLoad, userId, fetchNotifications]);
  
  // Restore focus when closing
  useEffect(() => {
    return () => {
      if (!isOpen && lastFocusedElement) {
        lastFocusedElement.focus();
      }
    };
  }, [isOpen, lastFocusedElement]);
  
  // Handle mark all as read
  const handleMarkAllAsRead = () => {
    // Provide haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }
    markAllAsRead();
  };
  
  // Handle retry on error
  const handleRetry = () => {
    // Provide haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    clearError();
    fetchNotifications(userId);
  };
  
  if (!isOpen) return null;
  
  return (
    <FocusTrap>
      <div 
        className="fixed inset-0 z-50 flex items-start justify-center sm:items-center"
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-title"
      >
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm" 
          onClick={onClose}
        />
        
        {/* Notification Panel */}
        <div 
          className={`relative w-full max-w-md max-h-[90vh] bg-gray-900 rounded-lg shadow-xl overflow-hidden ${className}`}
          onClick={e => e.stopPropagation()}
        >
          {/* Skip link for keyboard users */}
          <a 
            href="#notification-list" 
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:p-4 focus:bg-gray-800 focus:text-white focus:rounded-lg"
          >
            Skip to notifications
          </a>
          
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-blue-400" aria-hidden="true" />
              <h2 id="notification-title" className="text-lg font-semibold text-white">Notifications</h2>
              {unreadCount > 0 && (
                <span 
                  className="px-2 py-0.5 bg-blue-500 text-white text-xs font-medium rounded-full"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {unreadCount}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-gray-300 hover:text-white transition-colors min-h-[44px] min-w-[44px]"
                  aria-label={`Mark all ${unreadCount} notifications as read`}
                >
                  <CheckCheck className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Mark all as read</span>
                </button>
              )}
              
              <button
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-gray-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Close notifications"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>
          
          {/* Notification List */}
          <div 
            id="notification-list"
            className="overflow-y-auto max-h-[calc(90vh-60px)] overscroll-behavior-y: contain;"
            aria-live="polite"
          >
            {/* Initial Loading State */}
            {isLoading && notifications.length === 0 && (
              <div 
                className="flex flex-col items-center justify-center py-12"
                role="status"
                aria-busy="true"
                aria-label="Loading notifications"
              >
                <RefreshCw className="h-8 w-8 text-blue-400 animate-spin mb-4" aria-hidden="true" />
                <p className="text-gray-400">Loading notifications...</p>
              </div>
            )}
            
            {/* Error State */}
            {error && (
              <div 
                className="p-4 m-4 bg-red-900/30 border border-red-800/50 rounded-lg"
                role="alert"
                aria-live="assertive"
              >
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-red-400" aria-hidden="true" />
                  <h3 className="text-red-400 font-medium">Error</h3>
                </div>
                <p className="text-red-300 text-sm mb-3">{error}</p>
                <button
                  onClick={handleRetry}
                  className="px-4 py-2 bg-red-800/50 text-white rounded-lg hover:bg-red-700/50 transition-colors text-sm min-h-[44px] min-w-[44px]"
                  aria-label="Try loading notifications again"
                >
                  Try Again
                </button>
              </div>
            )}
            
            {/* Empty State */}
            {!isLoading && !error && notifications.length === 0 && (
              <div 
                className="flex flex-col items-center justify-center py-12"
                role="status"
                aria-label="No notifications"
              >
                <Bell className="h-12 w-12 text-gray-700 mb-4" aria-hidden="true" />
                <h3 className="text-lg font-medium text-white mb-2">No notifications</h3>
                <p className="text-gray-400 text-center max-w-xs">
                  You don't have any notifications yet. We'll notify you when something important happens.
                </p>
              </div>
            )}
            
            {/* Notification Items */}
            {notifications.length > 0 && (
              <InfiniteScroll
                hasMore={hasMore}
                loading={isLoading}
                onLoadMore={fetchMoreNotifications}
                className="divide-y divide-gray-800"
              >
                {notifications.map(notification => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onClick={onClose}
                  />
                ))}
              </InfiniteScroll>
            )}
          </div>
        </div>
      </div>
    </FocusTrap>
  );
};