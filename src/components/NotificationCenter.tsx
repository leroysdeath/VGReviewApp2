// src/components/NotificationCenter.tsx
import React from 'react';
import { Bell, X, CheckCheck } from 'lucide-react';

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
  // Mock notifications for now
  const mockNotifications = [
    {
      id: '1',
      title: 'New Review',
      message: 'John Doe reviewed Cyberpunk 2077',
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
      isRead: false
    },
    {
      id: '2',
      title: 'New Follower',
      message: 'Jane Smith is now following you',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
      isRead: false
    },
    {
      id: '3',
      title: 'Comment Reply',
      message: 'Someone replied to your comment on The Witcher 3',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
      isRead: true
    }
  ];

  const unreadCount = mockNotifications.filter(n => !n.isRead).length;

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
    return `${diffDay}d ago`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center sm:items-center">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      {/* Notification Panel */}
      <div 
        className={`relative w-full max-w-md max-h-[90vh] bg-gray-900 rounded-lg shadow-xl overflow-hidden mt-16 sm:mt-0 ${className}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">Notifications</h2>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 bg-blue-500 text-white text-xs font-medium rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={() => console.log('Mark all as read')}
                className="flex items-center gap-1 px-2 py-1 text-xs text-gray-300 hover:text-white transition-colors"
              >
                <CheckCheck className="h-4 w-4" />
                <span className="hidden sm:inline">Mark all as read</span>
              </button>
            )}
            
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-gray-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        {/* Notification List */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          {mockNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Bell className="h-12 w-12 text-gray-700 mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No notifications</h3>
              <p className="text-gray-400 text-center max-w-xs">
                You don't have any notifications yet. We'll notify you when something important happens.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {mockNotifications.map(notification => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-800/50 transition-colors cursor-pointer ${
                    !notification.isRead ? 'bg-blue-500/5 border-l-2 border-l-blue-500' : ''
                  }`}
                  onClick={() => console.log('Notification clicked:', notification.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                      notification.isRead ? 'bg-gray-600' : 'bg-blue-500'
                    }`} />
                    
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-sm font-medium ${
                        notification.isRead ? 'text-gray-300' : 'text-white'
                      }`}>
                        {notification.title}
                      </h4>
                      <p className={`text-sm mt-1 ${
                        notification.isRead ? 'text-gray-400' : 'text-gray-300'
                      }`}>
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        {formatRelativeTime(notification.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
