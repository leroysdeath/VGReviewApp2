import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Bell, Check, Filter, ChevronDown } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { NotificationType } from '../types/activity';
import { InfiniteScroll } from '../components/InfiniteScroll';
import { format, isToday, isYesterday, isThisWeek, isThisYear } from 'date-fns';
import { Link } from 'react-router-dom';
import { LazyImage } from '../components/LazyImage';
import { PullToRefresh } from '../components/PullToRefresh';

export const NotificationsPage: React.FC = () => {
  const [filter, setFilter] = useState<NotificationType | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);
  
  const {
    notifications,
    groupedNotifications,
    loading,
    error,
    hasMore,
    unreadCount,
    loadMore,
    refresh,
    markAsRead,
    markAllAsRead
  } = useNotifications({
    pageSize: 20,
    unreadOnly,
    groupByDate: true
  });

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
        return <div className="w-10 h-10 bg-purple-900/30 rounded-full flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </div>;
      case 'comment_reply':
        return <div className="w-10 h-10 bg-blue-900/30 rounded-full flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </div>;
      case 'user_followed':
        return <div className="w-10 h-10 bg-green-900/30 rounded-full flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="8.5" cy="7" r="4"></circle>
            <line x1="20" y1="8" x2="20" y2="14"></line>
            <line x1="23" y1="11" x2="17" y2="11"></line>
          </svg>
        </div>;
      case 'game_release':
        return <div className="w-10 h-10 bg-orange-900/30 rounded-full flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-400">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
        </div>;
      case 'price_drop':
        return <div className="w-10 h-10 bg-green-900/30 rounded-full flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
            <line x1="12" y1="1" x2="12" y2="23"></line>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
          </svg>
        </div>;
      case 'community_milestone':
        return <div className="w-10 h-10 bg-yellow-900/30 rounded-full flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-400">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
          </svg>
        </div>;
      case 'friend_activity':
        return <div className="w-10 h-10 bg-blue-900/30 rounded-full flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
        </div>;
      case 'system_announcement':
        return <div className="w-10 h-10 bg-purple-900/30 rounded-full flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
        </div>;
      case 'weekly_digest':
        return <div className="w-10 h-10 bg-purple-900/30 rounded-full flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
            <polyline points="22,6 12,13 2,6"></polyline>
          </svg>
        </div>;
      default:
        return <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
          <Bell className="h-5 w-5 text-gray-400" />
        </div>;
    }
  };

  // Filter notifications
  const filteredNotifications = groupedNotifications.map(group => ({
    ...group,
    notifications: group.notifications.filter(notification => 
      (filter === 'all' || notification.notification_type === filter) &&
      (!unreadOnly || !notification.is_read)
    )
  })).filter(group => group.notifications.length > 0);

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <Helmet>
        <title>Notifications | GameVault</title>
        <meta name="description" content="View your notifications and activity updates" />
      </Helmet>
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Bell className="h-6 w-6 text-purple-400" />
            <h1 className="text-2xl font-bold text-white">Notifications</h1>
            {unreadCount > 0 && (
              <span className="bg-purple-600 text-white text-sm px-2 py-0.5 rounded-full">
                {unreadCount} unread
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Check className="h-4 w-4" />
                <span>Mark all as read</span>
              </button>
            )}
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Filter className="h-4 w-4" />
              <span>Filter</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
        
        {/* Filter options */}
        {showFilters && (
          <div className="bg-gray-800 rounded-lg p-4 mb-6">
            <div className="flex flex-wrap gap-3 mb-4">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded-lg text-sm ${
                  filter === 'all'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                All Types
              </button>
              <button
                onClick={() => setFilter('review_mention')}
                className={`px-3 py-1 rounded-lg text-sm ${
                  filter === 'review_mention'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Mentions
              </button>
              <button
                onClick={() => setFilter('comment_reply')}
                className={`px-3 py-1 rounded-lg text-sm ${
                  filter === 'comment_reply'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Replies
              </button>
              <button
                onClick={() => setFilter('user_followed')}
                className={`px-3 py-1 rounded-lg text-sm ${
                  filter === 'user_followed'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Follows
              </button>
              <button
                onClick={() => setFilter('game_release')}
                className={`px-3 py-1 rounded-lg text-sm ${
                  filter === 'game_release'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Releases
              </button>
              <button
                onClick={() => setFilter('price_drop')}
                className={`px-3 py-1 rounded-lg text-sm ${
                  filter === 'price_drop'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Price Drops
              </button>
              <button
                onClick={() => setFilter('friend_activity')}
                className={`px-3 py-1 rounded-lg text-sm ${
                  filter === 'friend_activity'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Friend Activity
              </button>
            </div>
            
            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={unreadOnly}
                  onChange={(e) => setUnreadOnly(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600 relative"></div>
                <span className="text-gray-300 text-sm">Show unread only</span>
              </label>
            </div>
          </div>
        )}
        
        {/* Error message */}
        {error && (
          <div className="bg-red-900/20 border border-red-800 text-red-300 px-4 py-3 rounded-lg mb-6">
            <p>{error}</p>
          </div>
        )}
        
        {/* Notifications list */}
        <PullToRefresh onRefresh={refresh}>
          <InfiniteScroll
            hasMore={hasMore}
            loading={loading}
            onLoadMore={loadMore}
            className="space-y-6"
          >
            {loading && notifications.length === 0 ? (
              <div className="space-y-6">
                {Array.from({ length: 3 }).map((_, groupIndex) => (
                  <div key={groupIndex} className="space-y-3">
                    <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider animate-pulse">
                      <div className="h-4 bg-gray-700 rounded w-24"></div>
                    </h3>
                    
                    {Array.from({ length: 3 }).map((_, i) => (
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
                ))}
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="bg-gray-800 rounded-lg p-8 text-center">
                <Bell className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No notifications</h3>
                <p className="text-gray-400">
                  {unreadOnly
                    ? "You've read all your notifications"
                    : filter !== 'all'
                    ? `No ${filter.replace('_', ' ')} notifications`
                    : "You're all caught up! Check back later for new notifications."}
                </p>
                
                {(unreadOnly || filter !== 'all') && (
                  <button
                    onClick={() => {
                      setUnreadOnly(false);
                      setFilter('all');
                    }}
                    className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Show all notifications
                  </button>
                )}
              </div>
            ) : (
              filteredNotifications.map((group) => (
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
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="flex gap-3">
                        {/* Icon or user avatar */}
                        {notification.activity?.user?.picurl ? (
                          <LazyImage
                            src={notification.activity.user.picurl}
                            alt={notification.activity.user.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          getNotificationIcon(notification.notification_type)
                        )}
                        
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
                        
                        {/* Game image if available */}
                        {notification.activity?.game?.pic_url && (
                          <div className="flex-shrink-0">
                            <LazyImage
                              src={notification.activity.game.pic_url}
                              alt={notification.activity.game.name}
                              className="w-16 h-20 object-cover rounded"
                            />
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              ))
            )}
            
            {/* Loading indicator */}
            {loading && notifications.length > 0 && (
              <div className="flex justify-center py-4">
                <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </InfiniteScroll>
        </PullToRefresh>
        
        {/* Settings link */}
        <div className="mt-8 text-center">
          <Link
            to="/settings/notifications"
            className="text-purple-400 hover:text-purple-300 transition-colors"
          >
            Manage notification settings
          </Link>
        </div>
      </div>
    </div>
  );
};