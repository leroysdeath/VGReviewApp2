import React from 'react';
import { Bell } from 'lucide-react';
import { useNotificationStore } from '../store/notificationStore';

interface NotificationBadgeProps {
  onClick?: () => void;
  className?: string;
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  onClick,
  className = ''
}) => {
  const { unreadCount } = useNotificationStore();
  
  return (
    <button
      onClick={onClick}
      className={`relative p-2 rounded-full hover:bg-gray-700 transition-colors ${className}`}
      aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
    >
      <Bell className="h-5 w-5 text-gray-300" />
      
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] text-xs font-medium text-white bg-red-500 rounded-full px-1">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
};