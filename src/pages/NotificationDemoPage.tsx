import React, { useState, useEffect } from 'react';
import { Bell, Settings, RefreshCw, CheckCheck, AlertTriangle } from 'lucide-react';
import { NotificationBadge } from '../components/NotificationBadge';
import { NotificationCenter } from '../components/NotificationCenter';
import { NotificationItem } from '../components/NotificationItem';
import { useNotificationStore } from '../store/notificationStore';
import { Notification } from '../types/notification';
import { ActivityFeed } from '../components/ActivityFeed';

// Sample activity data
const sampleActivities = [
  {
    id: '1',
    type: 'review' as const,
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    user: {
      id: '101',
      name: 'GamerPro',
      avatar: 'https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=150'
    },
    game: {
      id: '201',
      title: 'Elden Ring',
      coverImage: 'https://images.pexels.com/photos/3945654/pexels-photo-3945654.jpeg?auto=compress&cs=tinysrgb&w=400'
    },
    review: {
      id: '301',
      rating: 9.5,
      text: 'Elden Ring is an absolute masterpiece. The open world is breathtaking and the freedom of exploration is unmatched. The combat system is challenging but fair, and the boss fights are some of the best in gaming history.'
    }
  },
  {
    id: '2',
    type: 'review_like' as const,
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
    user: {
      id: '102',
      name: 'RPGFanatic',
      avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150'
    },
    targetUser: {
      id: '103',
      name: 'GameCritic',
      avatar: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=150'
    },
    game: {
      id: '202',
      title: 'The Witcher 3: Wild Hunt',
      coverImage: 'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=400'
    },
    review: {
      id: '302',
      rating: 10.0,
      text: 'The Witcher 3 is without a doubt one of the greatest RPGs ever created, and quite possibly one of the best games of all time. CD Projekt Red has crafted an incredibly immersive world filled with meaningful quests, complex characters, and stunning environments.'
    }
  }
];

// Sample notification data
const sampleNotifications: Notification[] = [
  {
    id: '1',
    type: 'review_mention',
    title: 'You were mentioned in a review',
    message: 'GameCritic mentioned you in their review of Elden Ring',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    isRead: false,
    link: '/game/201',
    userId: 'user123',
    sourceId: '301',
    sourceType: 'review'
  },
  {
    id: '2',
    type: 'comment_reply',
    title: 'New reply to your comment',
    message: 'RPGFanatic replied to your comment on The Witcher 3 review',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    isRead: true,
    link: '/game/202',
    userId: 'user123',
    sourceId: '302',
    sourceType: 'comment'
  },
  {
    id: '3',
    type: 'user_followed',
    title: 'New follower',
    message: 'GameDev is now following you',
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    isRead: false,
    link: '/user/104',
    userId: 'user123',
    sourceId: '104',
    sourceType: 'user'
  }
];

export const NotificationDemoPage: React.FC = () => {
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [demoUserId] = useState('user123');
  const { 
    notifications, 
    unreadCount, 
    isLoading, 
    error, 
    fetchNotifications, 
    markAsRead, 
    markAllAsRead 
  } = useNotificationStore();
  
  // Initialize with sample notifications
  useEffect(() => {
    // In a real app, this would be fetched from the API
    // For demo purposes, we'll just set some sample data
    fetchNotifications(demoUserId);
  }, [fetchNotifications, demoUserId]);
  
  // Toggle notification center
  const toggleNotificationCenter = () => {
    setIsNotificationCenterOpen(!isNotificationCenterOpen);
  };
  
  // Mark a notification as read
  const handleMarkAsRead = (notificationId: string) => {
    markAsRead(notificationId);
  };
  
  // Mark all notifications as read
  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };
  
  // Simulate new notification
  const addNewNotification = () => {
    // In a real app, this would be handled by a WebSocket or polling
    // For demo purposes, we'll just refetch to simulate a new notification
    fetchNotifications(demoUserId);
  };
  
  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">Notification System</h1>
          
          <div className="flex items-center gap-4">
            <button
              onClick={addNewNotification}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Bell className="h-4 w-4" />
              Simulate New Notification
            </button>
            
            <NotificationBadge onClick={toggleNotificationCenter} />
          </div>
        </div>
        
        {/* Demo Controls */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Notification Controls</h2>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-gray-400" />
              <span className="text-gray-400">Demo Settings</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-white mb-3">Notification Status</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Unread Notifications:</span>
                  <span className="text-blue-400 font-medium">{unreadCount}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Total Notifications:</span>
                  <span className="text-white font-medium">{notifications.length}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Loading State:</span>
                  <div className="flex items-center gap-2">
                    {isLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 text-blue-400 animate-spin" />
                        <span className="text-blue-400">Loading...</span>
                      </>
                    ) : (
                      <span className="text-green-400">Ready</span>
                    )}
                  </div>
                </div>
                
                {error && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Error:</span>
                    <span className="text-red-400">{error}</span>
                  </div>
                )}
              </div>
              
              <div className="mt-4">
                <button
                  onClick={handleMarkAllAsRead}
                  disabled={unreadCount === 0}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <CheckCheck className="h-4 w-4" />
                  Mark All as Read
                </button>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-white mb-3">Sample Notification</h3>
              {sampleNotifications.length > 0 && (
                <div className="bg-gray-850 rounded-lg overflow-hidden">
                  <NotificationItem
                    notification={sampleNotifications[0]}
                    onClick={() => handleMarkAsRead(sampleNotifications[0].id)}
                  />
                </div>
              )}
              
              <div className="mt-4 p-3 bg-gray-700 rounded-lg">
                <h4 className="text-white font-medium mb-2">Features</h4>
                <ul className="text-sm text-gray-300 space-y-1 list-disc pl-5">
                  <li>Real-time notification updates</li>
                  <li>Mark individual notifications as read</li>
                  <li>Mark all notifications as read</li>
                  <li>Unread count badge</li>
                  <li>Notification center with infinite scroll</li>
                  <li>Error handling and retry mechanism</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        {/* Activity Feed with Notification Controls */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-6">Activity Feed with Notifications</h2>
          
          <ActivityFeed
            activities={sampleActivities}
            isLoading={false}
            error={null}
            onRetry={() => {}}
            onLoadMore={() => {}}
            hasMore={false}
            showNotificationControls={true}
            userId={demoUserId}
            className="mb-8"
          />
        </div>
        
        {/* Implementation Details */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Implementation Details</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-white mb-2">State Management</h3>
              <p className="text-gray-300">
                Notifications are managed using Zustand with Immer for immutable state updates.
                The store tracks read/unread status, maintains accurate unread counts, and
                persists changes across page refreshes.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-white mb-2">API Integration</h3>
              <p className="text-gray-300">
                The system integrates with two key endpoints:
              </p>
              <ul className="list-disc pl-5 text-gray-300 mt-2 space-y-1">
                <li>PATCH /notifications/{'{id}'}/read - Mark single notification as read</li>
                <li>PATCH /notifications/mark-all-read - Mark all notifications as read</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-white mb-2">Optimistic Updates</h3>
              <p className="text-gray-300">
                The system uses optimistic updates to provide immediate feedback to users.
                When marking notifications as read, the UI updates immediately while the API
                request is processed in the background. If the request fails, the UI reverts
                to its previous state.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Notification Center */}
      <NotificationCenter
        userId={demoUserId}
        isOpen={isNotificationCenterOpen}
        onClose={() => setIsNotificationCenterOpen(false)}
      />
    </div>
  );
};