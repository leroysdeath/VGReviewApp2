import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  MessageSquare, 
  Star, 
  Heart, 
  UserPlus, 
  Clock, 
  Check, 
  RefreshCw,
  Filter,
  ChevronDown
} from 'lucide-react';
import { ActivityWithUser, ActivityType } from '../types/activity';
import { InfiniteScroll } from './InfiniteScroll';
import { LazyImage } from './LazyImage';
import { useResponsive } from '../hooks/useResponsive';
import { PullToRefresh } from './PullToRefresh';

interface ActivityFeedProps {
  activities: ActivityWithUser[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onRefresh: () => Promise<void>;
  emptyMessage?: string;
  className?: string;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  activities,
  loading,
  hasMore,
  onLoadMore,
  onRefresh,
  emptyMessage = 'No activity yet',
  className = ''
}) => {
  const [filter, setFilter] = useState<ActivityType | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const { isMobile } = useResponsive();

  // Filter activities
  const filteredActivities = filter === 'all'
    ? activities
    : activities.filter(activity => activity.activity_type === filter);

  // Get icon for activity type
  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case 'review_created':
      case 'review_updated':
        return <MessageSquare className="h-4 w-4 text-purple-400" />;
      case 'rating_created':
      case 'rating_updated':
        return <Star className="h-4 w-4 text-yellow-400" />;
      case 'comment_created':
        return <MessageSquare className="h-4 w-4 text-blue-400" />;
      case 'user_followed':
        return <UserPlus className="h-4 w-4 text-green-400" />;
      case 'game_added':
      case 'wishlist_added':
        return <Heart className="h-4 w-4 text-red-400" />;
      case 'game_completed':
        return <Check className="h-4 w-4 text-green-400" />;
      case 'price_alert':
      case 'release_alert':
        return <Clock className="h-4 w-4 text-orange-400" />;
      case 'system_announcement':
        return <MessageSquare className="h-4 w-4 text-blue-400" />;
      default:
        return <MessageSquare className="h-4 w-4 text-gray-400" />;
    }
  };

  // Get activity message
  const getActivityMessage = (activity: ActivityWithUser) => {
    const userName = activity.user?.name || 'A user';
    
    switch (activity.activity_type) {
      case 'review_created':
        return (
          <>
            <Link to={`/user/${activity.user_id}`} className="font-medium text-white hover:text-purple-400 transition-colors">
              {userName}
            </Link>
            {' reviewed '}
            <Link to={`/game/${activity.object_id}`} className="font-medium text-white hover:text-purple-400 transition-colors">
              {activity.game?.name || 'a game'}
            </Link>
          </>
        );
      case 'review_updated':
        return (
          <>
            <Link to={`/user/${activity.user_id}`} className="font-medium text-white hover:text-purple-400 transition-colors">
              {userName}
            </Link>
            {' updated their review of '}
            <Link to={`/game/${activity.object_id}`} className="font-medium text-white hover:text-purple-400 transition-colors">
              {activity.game?.name || 'a game'}
            </Link>
          </>
        );
      case 'rating_created':
        return (
          <>
            <Link to={`/user/${activity.user_id}`} className="font-medium text-white hover:text-purple-400 transition-colors">
              {userName}
            </Link>
            {' rated '}
            <Link to={`/game/${activity.object_id}`} className="font-medium text-white hover:text-purple-400 transition-colors">
              {activity.game?.name || 'a game'}
            </Link>
            {activity.metadata?.rating && (
              <> {activity.metadata.rating}/10</>
            )}
          </>
        );
      case 'rating_updated':
        return (
          <>
            <Link to={`/user/${activity.user_id}`} className="font-medium text-white hover:text-purple-400 transition-colors">
              {userName}
            </Link>
            {' updated their rating of '}
            <Link to={`/game/${activity.object_id}`} className="font-medium text-white hover:text-purple-400 transition-colors">
              {activity.game?.name || 'a game'}
            </Link>
            {activity.metadata?.rating && (
              <> to {activity.metadata.rating}/10</>
            )}
          </>
        );
      case 'comment_created':
        return (
          <>
            <Link to={`/user/${activity.user_id}`} className="font-medium text-white hover:text-purple-400 transition-colors">
              {userName}
            </Link>
            {' commented on '}
            {activity.object_type === 'review' ? (
              <>
                {'a review of '}
                <Link to={`/game/${activity.metadata?.game_id}`} className="font-medium text-white hover:text-purple-400 transition-colors">
                  {activity.game?.name || 'a game'}
                </Link>
              </>
            ) : activity.object_type === 'game' ? (
              <Link to={`/game/${activity.object_id}`} className="font-medium text-white hover:text-purple-400 transition-colors">
                {activity.game?.name || 'a game'}
              </Link>
            ) : (
              'a post'
            )}
          </>
        );
      case 'user_followed':
        return (
          <>
            <Link to={`/user/${activity.user_id}`} className="font-medium text-white hover:text-purple-400 transition-colors">
              {userName}
            </Link>
            {' started following '}
            <Link to={`/user/${activity.target_id}`} className="font-medium text-white hover:text-purple-400 transition-colors">
              {activity.metadata?.target_name || 'another user'}
            </Link>
          </>
        );
      case 'game_added':
        return (
          <>
            <Link to={`/user/${activity.user_id}`} className="font-medium text-white hover:text-purple-400 transition-colors">
              {userName}
            </Link>
            {' added '}
            <Link to={`/game/${activity.object_id}`} className="font-medium text-white hover:text-purple-400 transition-colors">
              {activity.game?.name || 'a game'}
            </Link>
            {' to their collection'}
          </>
        );
      case 'game_completed':
        return (
          <>
            <Link to={`/user/${activity.user_id}`} className="font-medium text-white hover:text-purple-400 transition-colors">
              {userName}
            </Link>
            {' completed '}
            <Link to={`/game/${activity.object_id}`} className="font-medium text-white hover:text-purple-400 transition-colors">
              {activity.game?.name || 'a game'}
            </Link>
          </>
        );
      case 'wishlist_added':
        return (
          <>
            <Link to={`/user/${activity.user_id}`} className="font-medium text-white hover:text-purple-400 transition-colors">
              {userName}
            </Link>
            {' added '}
            <Link to={`/game/${activity.object_id}`} className="font-medium text-white hover:text-purple-400 transition-colors">
              {activity.game?.name || 'a game'}
            </Link>
            {' to their wishlist'}
          </>
        );
      default:
        return (
          <>
            <Link to={`/user/${activity.user_id}`} className="font-medium text-white hover:text-purple-400 transition-colors">
              {userName}
            </Link>
            {' performed an activity'}
          </>
        );
    }
  };

  // Empty state
  if (activities.length === 0 && !loading) {
    return (
      <div className={`bg-gray-800 rounded-lg p-6 text-center ${className}`}>
        <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock className="h-8 w-8 text-gray-500" />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">{emptyMessage}</h3>
        <p className="text-gray-400 mb-4">
          Follow users or interact with games to see activity here
        </p>
        <button
          onClick={() => onRefresh()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={onRefresh} className={className}>
      <div className="space-y-4">
        {/* Filter controls */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Activity Feed</h2>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            <Filter className="h-4 w-4" />
            <span className="text-sm">Filter</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>
        
        {/* Filter options */}
        {showFilters && (
          <div className="bg-gray-700 rounded-lg p-4 mb-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded-lg text-sm ${
                  filter === 'all'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                }`}
              >
                All Activity
              </button>
              <button
                onClick={() => setFilter('review_created')}
                className={`px-3 py-1 rounded-lg text-sm ${
                  filter === 'review_created'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                }`}
              >
                Reviews
              </button>
              <button
                onClick={() => setFilter('rating_created')}
                className={`px-3 py-1 rounded-lg text-sm ${
                  filter === 'rating_created'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                }`}
              >
                Ratings
              </button>
              <button
                onClick={() => setFilter('comment_created')}
                className={`px-3 py-1 rounded-lg text-sm ${
                  filter === 'comment_created'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                }`}
              >
                Comments
              </button>
              <button
                onClick={() => setFilter('user_followed')}
                className={`px-3 py-1 rounded-lg text-sm ${
                  filter === 'user_followed'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                }`}
              >
                Follows
              </button>
              <button
                onClick={() => setFilter('game_completed')}
                className={`px-3 py-1 rounded-lg text-sm ${
                  filter === 'game_completed'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                }`}
              >
                Completions
              </button>
            </div>
          </div>
        )}
        
        {/* Activity list */}
        <InfiniteScroll
          hasMore={hasMore}
          loading={loading}
          onLoadMore={onLoadMore}
          className="space-y-4"
        >
          {filteredActivities.map((activity) => (
            <div
              key={activity.id}
              className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors"
            >
              <div className="flex gap-3">
                {/* User avatar */}
                <Link
                  to={`/user/${activity.user_id}`}
                  className="flex-shrink-0"
                >
                  {activity.user?.picurl ? (
                    <LazyImage
                      src={activity.user.picurl}
                      alt={activity.user.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                      <span className="text-gray-400 font-medium">
                        {activity.user?.name.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                  )}
                </Link>
                
                <div className="flex-1 min-w-0">
                  {/* Activity content */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2 mb-2">
                      {getActivityIcon(activity.activity_type)}
                      <p className="text-gray-300">
                        {getActivityMessage(activity)}
                      </p>
                    </div>
                    
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {activity.relativeTime}
                    </span>
                  </div>
                  
                  {/* Game image for game-related activities */}
                  {activity.game && (
                    <div className="mt-3 flex gap-3">
                      <Link
                        to={`/game/${activity.object_id}`}
                        className="flex-shrink-0"
                      >
                        {activity.game.pic_url ? (
                          <LazyImage
                            src={activity.game.pic_url}
                            alt={activity.game.name}
                            className="w-16 h-20 object-cover rounded"
                          />
                        ) : (
                          <div className="w-16 h-20 bg-gray-700 rounded flex items-center justify-center">
                            <span className="text-gray-500">No image</span>
                          </div>
                        )}
                      </Link>
                      
                      {/* Activity details */}
                      {activity.activity_type === 'review_created' && activity.metadata?.review_excerpt && (
                        <div className="flex-1 bg-gray-700 p-3 rounded text-sm text-gray-300">
                          <p className="line-clamp-3">{activity.metadata.review_excerpt}</p>
                          <Link
                            to={`/game/${activity.object_id}`}
                            className="text-purple-400 hover:text-purple-300 transition-colors text-xs mt-2 inline-block"
                          >
                            Read full review
                          </Link>
                        </div>
                      )}
                      
                      {activity.activity_type === 'rating_created' && activity.metadata?.rating && (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < Math.floor(activity.metadata.rating / 2)
                                    ? 'text-yellow-400 fill-current'
                                    : 'text-gray-600'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-white font-medium">{activity.metadata.rating}/10</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {/* Loading indicator */}
          {loading && (
            <div className="flex justify-center py-4">
              <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </InfiniteScroll>
      </div>
    </PullToRefresh>
  );
};