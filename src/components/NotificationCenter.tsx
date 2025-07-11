import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Bell, 
  X, 
  Check, 
  Settings, 
  MessageSquare, 
  UserPlus, 
  Calendar, 
  DollarSign,
  Trophy,
  Users,
  Info,
  Mail
} from 'lucide-react';
import { NotificationWithActivity, NotificationType, NotificationGroup } from '../types/activity';
import { format, isToday, isYesterday, isThisWeek, isThisYear } from 'date-fns';
import { LazyImage } from './LazyImage';
import { useResponsive } from '../hooks/useResponsive';
import { useOnClickOutside } from '../hooks/useOnClickOutside';

interface NotificationCenterProps {
  notifications: NotificationWithActivity[];
  groupedNotifications: NotificationGroup[];
  unreadCount: number;
  loading: boolean;
  onMarkAsRead: (id: number) => Promise<boolean>;
  onMarkAllAsRead: () => Promise<boolean>;
  onLoadMore: () => void;
  hasMore: boolean;
  className?: string;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  groupedNotifications,
  unreadCount,
  loading,
  onMarkAsRead,
  onMarkAllAsRead,
  onLoadMore,
  hasMore,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const { isMobile } = useResponsive();

  // Close when clicking outside
  useOnClickOutside(notificationRef, () => setIsOpen(false));

  // Close on escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  // Format date for grouping
  const formatGroupDate = (dateString: string) => {
    const date = new Date(dateString);
    
    if (isToday(date)) {
      return 'Today';
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else if (isThisWeek(date)) {
      return format(date, 'EEEE'); // Day name
    } else if (isThisYear(date)) {
      return format(date, 'MMMM d'); // Month and day
    } else {
      return format(date, 'MMMM d, yyyy'); // Full date
    }
  };

  // Get icon for notification type
  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'review_mention':
        return <MessageSquare className="h-4 w-4 text-purple-400" />;
      case 'comment_reply':
        return <MessageSquare className="h-4 w-4 text-blue-400" />;
      case 'user_followed':
        return <UserPlus className="h-4 w-4 text-green-400" />;
      case 'game_release':
        return <Calendar className="h-4 w-4 text-orange-400" />;
      case 'price_drop':
        return <DollarSign className="h-4 w-4 text-green-400" />;
      case 'community_milestone':
        return <Trophy className="h-4 w-4 text-yellow-400" />;
      case 'friend_activity':
        return <Users className="h-4 w-4 text-blue-400" />;
      case 'system_announcement':
        return <Info className="h-4 w-4 text-purple-400" />;
      case 'weekly_digest':
        return <Mail className="h-4 w-4 text-purple-400" />;
      default:
        return <Bell className="h-4 w-4 text-gray-400" />;
    }
  };

  // Handle notification click
  const handleNotificationClick = async (notification: NotificationWithActivity) => {
    if (!notification.is_read) {
      await onMarkAsRead(notification.id);
    }
    
    // Close notification center on mobile
    if (isMobile) {
      setIsOpen(false);
    }
  };

  // Mobile full-screen notification center
  if (isMobile && isOpen) {
    return (
      <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col">
        {/* Header */}
        <div className="bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-purple-400" />
            <h2 className="text-xl font-semibold text-white">Notifications</h2>
            {unreadCount > 0 && (
              <span className="bg-purple-600 text-white text-xs px-2 py-1 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllAsRead}
                className="flex items-center gap-1 px-3 py-1 bg-gray-700 text-white rounded-lg text-sm hover:bg-gray-600 transition-colors"
              >
                <Check className="h-4 w-4" />
                <span>Mark all read</span>
              </button>
            )}
            
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              aria-label="Close notifications"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>
        
        {/* Notification list */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && notifications.length === 0 ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="bg-gray-800 rounded-lg p-4 animate-pulse">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 bg-gray-700 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No notifications</h3>
              <p className="text-gray-400">
                You're all caught up! Check back later for new notifications.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {groupedNotifications.map((group) => (
                <div key={group.date} className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                    {formatGroupDate(group.date)}
                  </h3>
                  
                  {group.notifications.map((notification) => (
                    <Link
                      key={notification.id}
                      to={notification.link || '#'}
                      className={`block p-4 rounded-lg transition-colors ${
                        notification.is_read
                          ? 'bg-gray-800 hover:bg-gray-750'
                          : 'bg-gray-750 hover:bg-gray-700 border-l-2 border-purple-500'
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex gap-3">
                        {/* Icon */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          notification.is_read ? 'bg-gray-700' : 'bg-purple-900/30'
                        }`}>
                          {getNotificationIcon(notification.notification_type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h4 className={`font-medium ${notification.is_read ? 'text-gray-300' : 'text-white'}`}>
                            {notification.title}
                          </h4>
                          <p className="text-gray-400 text-sm line-clamp-2">
                            {notification.message}
                          </p>
                          <span className="text-xs text-gray-500 mt-1 block">
                            {notification.relativeTime}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ))}
              
              {/* Load more */}
              {hasMore && (
                <div className="flex justify-center py-4">
                  <button
                    onClick={onLoadMore}
                    disabled={loading}
                    className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Loading...' : 'Load more'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="bg-gray-800 border-t border-gray-700 p-4">
          <Link
            to="/settings/notifications"
            className="flex items-center justify-center gap-2 text-gray-400 hover:text-white transition-colors"
            onClick={() => setIsOpen(false)}
          >
            <Settings className="h-4 w-4" />
            <span>Notification Settings</span>
          </Link>
        </div>
      </div>
    );
  }

  // Desktop dropdown
  return (
    <div className={`relative ${className}`} ref={notificationRef}>
      {/* Notification bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-white transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-purple-600 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      
      {/* Notification dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 max-h-[80vh] bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-white">Notifications</h3>
              {unreadCount > 0 && (
                <span className="bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={onMarkAllAsRead}
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                  title="Mark all as read"
                >
                  <Check className="h-4 w-4" />
                </button>
              )}
              
              <Link
                to="/settings/notifications"
                className="text-sm text-gray-400 hover:text-white transition-colors"
                title="Notification settings"
              >
                <Settings className="h-4 w-4" />
              </Link>
            </div>
          </div>
          
          {/* Notification list */}
          <div className="overflow-y-auto flex-1">
            {loading && notifications.length === 0 ? (
              <div className="p-4 space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-gray-750 rounded-lg p-3 animate-pulse">
                    <div className="flex gap-3">
                      <div className="w-8 h-8 bg-gray-700 rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-3 bg-gray-700 rounded w-3/4 mb-2"></div>
                        <div className="h-2 bg-gray-700 rounded w-1/2"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8 px-4">
                <Bell className="h-8 w-8 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">
                  No notifications yet
                </p>
              </div>
            ) : (
              <div className="p-2">
                {notifications.slice(0, 10).map((notification) => (
                  <Link
                    key={notification.id}
                    to={notification.link || '#'}
                    className={`block p-3 rounded-lg mb-1 transition-colors ${
                      notification.is_read
                        ? 'bg-gray-800 hover:bg-gray-750'
                        : 'bg-gray-750 hover:bg-gray-700 border-l-2 border-purple-500'
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex gap-2">
                      {/* Icon */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        notification.is_read ? 'bg-gray-700' : 'bg-purple-900/30'
                      }`}>
                        {getNotificationIcon(notification.notification_type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm line-clamp-2 ${notification.is_read ? 'text-gray-300' : 'text-white'}`}>
                          {notification.message}
                        </p>
                        <span className="text-xs text-gray-500 mt-1 block">
                          {notification.relativeTime}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
                
                {notifications.length > 10 && (
                  <Link
                    to="/notifications"
                    className="block text-center py-2 text-sm text-purple-400 hover:text-purple-300 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    View all {notifications.length} notifications
                  </Link>
                )}
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="p-3 border-t border-gray-700">
            <Link
              to="/notifications"
              className="block text-center text-sm text-gray-400 hover:text-white transition-colors"
              onClick={() => setIsOpen(false)}
            >
              See all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};