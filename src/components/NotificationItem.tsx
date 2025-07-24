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

  const handleClick = () => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    onClick?.();
  };

  const getNotificationIcon = () => {
    switch (notification.type) {
      case 'review':
        return <MessageSquare className="w-5 h-5 text-blue-400" />;
      case 'follow':
        return <User className="w-5 h-5 text-green-400" />;
      case 'mention':
        return <Tag className="w-5 h-5 text-purple-400" />;
      case 'achievement':
        return <Calendar className="w-5 h-5 text-yellow-400" />;
      case 'system':
        return <Bell className="w-5 h-5 text-gray-400" />;
      default:
        return <Circle className="w-5 h-5 text-gray-400" />;
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`;
    return time.toLocaleDateString();
  };

  const notificationContent = (
    <div 
      className={`
        flex items-start gap-3 p-4 hover:bg-gray-700/50 transition-colors cursor-pointer
        border-l-4 ${notification.read ? 'border-transparent' : 'border-blue-500'}
        ${!notification.read ? 'bg-gray-800/50' : 'bg-transparent'}
        ${className}
      `}
      onClick={handleClick}
    >
      {/* Icon */}
      <div className="flex-shrink-0 mt-1">
        {getNotificationIcon()}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            {/* Title */}
            <h4 className={`text-sm font-medium ${
              notification.read ? 'text-gray-300' : 'text-white'
            }`}>
              {notification.title}
            </h4>
            
            {/* Message */}
            <p className={`text-sm mt-1 ${
              notification.read ? 'text-gray-500' : 'text-gray-400'
            }`}>
              {notification.message}
            </p>
            
            {/* Metadata */}
            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
              <span>{formatTimeAgo(notification.timestamp)}</span>
              {notification.category && (
                <>
                  <span>•</span>
                  <span className="capitalize">{notification.category}</span>
                </>
              )}
            </div>
          </div>

          {/* Read Status Indicator */}
          {!notification.read && (
            <div className="flex-shrink-0">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // If there's a link, wrap in Link component
  if (notification.link) {
    return (
      <Link to={notification.link} className="block">
        {notificationContent}
      </Link>
    );
  }

  return notificationContent;
};
