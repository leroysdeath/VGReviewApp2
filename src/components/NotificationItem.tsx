import React, { useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { 
  Heart, 
  MessageCircle, 
  UserPlus, 
  Trophy, 
  Star, 
  Gamepad2,
  AlertCircle,
  Check
} from 'lucide-react';
import { Notification } from '../types/notification';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  onAction?: (notification: Notification) => void;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkAsRead,
  onDelete,
  onAction
}) => {
  const swipeRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);
  const [swiping, setSwiping] = React.useState(false);

  // Get icon based on notification type
  const getIcon = () => {
    switch (notification.type) {
      case 'like':
        return <Heart className="h-5 w-5 text-red-500" />;
      case 'comment':
        return <MessageCircle className="h-5 w-5 text-blue-500" />;
      case 'follow':
        return <UserPlus className="h-5 w-5 text-green-500" />;
      case 'achievement':
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 'review':
        return <Star className="h-5 w-5 text-purple-500" />;
      case 'game_update':
        return <Gamepad2 className="h-5 w-5 text-indigo-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  // Handle touch events for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    setSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swiping || !swipeRef.current) return;
    
    currentXRef.current = e.touches[0].clientX;
    const diff = startXRef.current - currentXRef.current;
    
    if (diff > 0) {
      swipeRef.current.style.transform = `translateX(-${Math.min(diff, 80)}px)`;
    }
  };

  const handleTouchEnd = () => {
    if (!swipeRef.current) return;
    
    const diff = startXRef.current - currentXRef.current;
    
    if (diff > 50) {
      // Show delete action
      swipeRef.current.style.transform = 'translateX(-80px)';
    } else {
      // Reset position
      swipeRef.current.style.transform = 'translateX(0)';
    }
    
    setSwiping(false);
  };

  return (
    <div className="relative overflow-hidden">
      {/* Delete button (revealed on swipe) */}
      <button
        onClick={() => onDelete(notification.id)}
        className="absolute right-0 top-0 bottom-0 w-20 bg-red-600 text-white flex items-center justify-center"
      >
        Delete
      </button>

      {/* Notification content */}
      <div
        ref={swipeRef}
        className={`
          relative bg-gray-800 p-4 transition-all duration-200 cursor-pointer
          ${!notification.isRead ? 'bg-gray-800/80 border-l-4 border-purple-600' : ''}
        `}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => {
          if (!notification.isRead) {
            onMarkAsRead(notification.id);
          }
          if (onAction) {
            onAction(notification);
          }
        }}
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 mt-1">
            {getIcon()}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-300">
              <span className="font-medium text-white">{notification.title}</span>
              {notification.message && (
                <span className="ml-1">{notification.message}</span>
              )}
            </p>

            {/* Metadata */}
            <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
              <span>
                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
              </span>
              {notification.actionUrl && (
                <span className="text-purple-400 hover:text-purple-300">
                  View
                </span>
              )}
            </div>
          </div>

          {/* Read indicator */}
          {!notification.isRead && (
            <div className="flex-shrink-0">
              <div className="h-2 w-2 bg-purple-600 rounded-full animate-pulse" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
