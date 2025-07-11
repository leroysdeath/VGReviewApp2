import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Star, 
  MessageSquare, 
  ThumbsUp, 
  Trophy, 
  Clock, 
  Heart,
  CheckSquare,
  Calendar
} from 'lucide-react';

export interface ActivityItem {
  id: string;
  type: 'review' | 'rating' | 'completion' | 'wishlist' | 'started' | 'achievement' | 'like';
  date: string;
  user: {
    id: string;
    username: string;
    avatar?: string;
  };
  game?: {
    id: string;
    title: string;
    coverImage?: string;
  };
  review?: {
    id: string;
    rating: number;
    text?: string;
  };
  achievement?: {
    id: string;
    title: string;
    description: string;
    icon: string;
  };
}

interface UserActivityFeedProps {
  activities: ActivityItem[];
  isLoading?: boolean;
  className?: string;
}

export const UserActivityFeed: React.FC<UserActivityFeedProps> = ({
  activities,
  isLoading = false,
  className = ''
}) => {
  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  // Get activity icon based on type
  const getActivityIcon = (activity: ActivityItem) => {
    switch (activity.type) {
      case 'review':
        return <MessageSquare className="h-5 w-5 text-purple-400" />;
      case 'rating':
        return <Star className="h-5 w-5 text-yellow-400" />;
      case 'completion':
        return <CheckSquare className="h-5 w-5 text-green-400" />;
      case 'wishlist':
        return <Heart className="h-5 w-5 text-red-400" />;
      case 'started':
        return <Clock className="h-5 w-5 text-blue-400" />;
      case 'achievement':
        return <Trophy className="h-5 w-5 text-yellow-400" />;
      case 'like':
        return <ThumbsUp className="h-5 w-5 text-green-400" />;
      default:
        return <Calendar className="h-5 w-5 text-gray-400" />;
    }
  };

  // Get activity text based on type
  const getActivityText = (activity: ActivityItem) => {
    switch (activity.type) {
      case 'review':
        return (
          <span>
            reviewed <Link to={`/game/${activity.game?.id}`} className="font-medium text-white hover:text-purple-400 transition-colors">{activity.game?.title}</Link>
            {activity.review?.rating && (
              <span className="ml-1 text-yellow-400 font-medium">{activity.review.rating.toFixed(1)}/10</span>
            )}
          </span>
        );
      case 'rating':
        return (
          <span>
            rated <Link to={`/game/${activity.game?.id}`} className="font-medium text-white hover:text-purple-400 transition-colors">{activity.game?.title}</Link>
            <span className="ml-1 text-yellow-400 font-medium">{activity.review?.rating.toFixed(1)}/10</span>
          </span>
        );
      case 'completion':
        return (
          <span>
            completed <Link to={`/game/${activity.game?.id}`} className="font-medium text-white hover:text-purple-400 transition-colors">{activity.game?.title}</Link>
          </span>
        );
      case 'wishlist':
        return (
          <span>
            added <Link to={`/game/${activity.game?.id}`} className="font-medium text-white hover:text-purple-400 transition-colors">{activity.game?.title}</Link> to wishlist
          </span>
        );
      case 'started':
        return (
          <span>
            started playing <Link to={`/game/${activity.game?.id}`} className="font-medium text-white hover:text-purple-400 transition-colors">{activity.game?.title}</Link>
          </span>
        );
      case 'achievement':
        return (
          <span>
            earned achievement <span className="font-medium text-white">{activity.achievement?.title}</span> in <Link to={`/game/${activity.game?.id}`} className="font-medium text-white hover:text-purple-400 transition-colors">{activity.game?.title}</Link>
          </span>
        );
      case 'like':
        return (
          <span>
            liked a review of <Link to={`/game/${activity.game?.id}`} className="font-medium text-white hover:text-purple-400 transition-colors">{activity.game?.title}</Link>
          </span>
        );
      default:
        return <span>performed an action</span>;
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex gap-4 animate-pulse">
            <div className="w-10 h-10 bg-gray-700 rounded-full flex-shrink-0"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-700 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (activities.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <Calendar className="h-8 w-8 text-gray-500" />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">No recent activity</h3>
        <p className="text-gray-400">
          Activities will appear here once the user starts interacting with games.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {activities.map((activity) => (
        <div key={activity.id} className="flex gap-4 p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors">
          {/* Activity Icon */}
          <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center flex-shrink-0">
            {getActivityIcon(activity)}
          </div>
          
          {/* Activity Content */}
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-1">
              <div>
                <Link 
                  to={`/user/${activity.user.id}`}
                  className="font-medium text-white hover:text-purple-400 transition-colors"
                >
                  {activity.user.username}
                </Link>
                <span className="text-gray-400"> {getActivityText(activity)}</span>
              </div>
              <div className="text-sm text-gray-500">
                {formatDate(activity.date)}
              </div>
            </div>
            
            {/* Review text preview */}
            {activity.type === 'review' && activity.review?.text && (
              <div className="mt-2 text-gray-300 text-sm bg-gray-800/50 p-3 rounded-lg">
                "{activity.review.text.length > 120 
                  ? `${activity.review.text.substring(0, 120)}...` 
                  : activity.review.text}"
              </div>
            )}
            
            {/* Game image for certain activities */}
            {['review', 'rating', 'completion', 'started'].includes(activity.type) && activity.game?.coverImage && (
              <div className="mt-2">
                <Link to={`/game/${activity.game.id}`} className="inline-block">
                  <img 
                    src={activity.game.coverImage} 
                    alt={activity.game.title}
                    className="h-16 rounded object-cover"
                  />
                </Link>
              </div>
            )}
            
            {/* Achievement details */}
            {activity.type === 'achievement' && activity.achievement && (
              <div className="mt-2 flex items-center gap-3 bg-gray-800/50 p-3 rounded-lg">
                <div className="w-8 h-8 bg-yellow-600/30 rounded-full flex items-center justify-center">
                  <span className="text-lg">{activity.achievement.icon}</span>
                </div>
                <div>
                  <div className="font-medium text-white">{activity.achievement.title}</div>
                  <div className="text-sm text-gray-400">{activity.achievement.description}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};