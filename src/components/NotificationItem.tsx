import React from 'react';
import { Link } from 'react-router-dom';
import { 
  MessageSquare, 
  User, 
  Bell, 
  Tag, 
  Calendar, 
  DollarSign,
  Check,
  Circle
} from 'lucide-react';
import { Notification } from '../types/notification';
import { useNotificationStore } from '../store/notificationStore';

interface NotificationItemProps {
  notification: Notification;
  onClick?: () => void;
  className?: string;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onClick,
  className = ''
}) => {
  const { markAsRead } = useNotificationStore();
  const itemRef = useRef<HTMLDivElement | null>(null);
  
  // Format relative time
  const formatRelativeTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    
    if (diffSec < 60) return 'just now';
    
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;
    
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 7) return `${diffDay}d ago`;
    
    const diffWeek = Math.floor(diffDay / 7);
    if (diffWeek < 4) return `${diffWeek}w ago`;
    
    const diffMonth = Math.floor(diffDay / 30);
    if (diffMonth < 12) return `${diffMonth}mo ago`;
    
    const diffYear = Math.floor(diffDay / 365);
    return `${diffYear}y ago`;
  };
  
  // Get notification icon based on type
  const getNotificationIcon = () => {
    switch (notification.type) {
      case 'review_mention':
        return <Tag className="h-5 w-5 text-purple-400" />;
      case 'comment_reply':
        return <MessageSquare className="h-5 w-5 text-blue-400" />;
      case 'user_followed':
        return <User className="h-5 w-5 text-green-400" />;
      case 'game_release':
        return <Calendar className="h-5 w-5 text-orange-400" />;
      case 'price_drop':
        return <DollarSign className="h-5 w-5 text-green-400" />;
      case 'system_announcement':
        return <Bell className="h-5 w-5 text-red-400" />;
      default:
        return <Bell className="h-5 w-5 text-gray-400" />;
    }
  };
  
  // Handle click on notification
  const handleClick = () => {
    if (!notification.isRead) {
      // Provide haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      markAsRead(notification.id);
    }
    
    if (onClick) {
      onClick();
    }
  };
  
  // Handle mark as read button click
  const handleMarkAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    // Provide haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
  };
  
  const NotificationContent = () => (
    <div className="flex gap-3 w-full" ref={itemRef}>
      {/* Notification Icon */}
      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
        notification.isRead ? 'bg-gray-700' : 'bg-gray-700/50'
      }`}>
        {getNotificationIcon()}
      </div>
      
      {/* Notification Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h3 className={`font-medium ${notification.isRead ? 'text-gray-300' : 'text-white'}`}>
            {notification.title}
          </h3>
          <span className="text-gray-500 text-xs">
            {formatRelativeTime(notification.timestamp)}
          </span>
        </div>
        
        <p className={`text-sm ${notification.isRead ? 'text-gray-400' : 'text-gray-300'}`}>
          {notification.message}
        </p>
        
        {/* Read status indicator and mark as read button */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1">
            {notification.isRead ? (
              <Check className="h-3 w-3 text-gray-500" />
            ) : (
              <Circle className="h-3 w-3 text-blue-400 fill-blue-400" />
            )}
            <span className="text-xs text-gray-500">
              {notification.isRead ? 'Read' : 'Unread'}
            </span>
          </div>
          
          {!notification.isRead && (
            <button
              onClick={handleMarkAsRead}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Mark notification as read"
            >
              Mark as read
            </button>
          )}
        </div>
      </div>
    </div>
  );
  
  return notification.link ? (
    <Link
      to={notification.link}
      className={`block p-4 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
        notification.isRead ? 'bg-gray-800' : 'bg-gray-800/70 border-l-2 border-blue-500'
      } hover:bg-gray-750 transition-colors ${className}`}
      onClick={handleClick}
      aria-label={`${notification.title}. ${notification.isRead ? 'Read' : 'Unread'}`}
    >
      <NotificationContent />
    </Link>
  ) : (
    <div
      className={`p-4 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
        notification.isRead ? 'bg-gray-800' : 'bg-gray-800/70 border-l-2 border-blue-500'
      } hover:bg-gray-750 transition-colors cursor-pointer ${className}`}
      onClick={handleClick}
      tabIndex={0}
      role="button"
      aria-label={`${notification.title}. ${notification.isRead ? 'Read' : 'Unread'}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <NotificationContent />
    </div>
  );
};