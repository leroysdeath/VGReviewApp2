import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Star, 
  Heart, 
  MessageSquare, 
  ThumbsUp, 
  Reply, 
  Calendar 
} from 'lucide-react';
import { 
  ActivityType, 
  formatRelativeTime, 
  getActivityColor, 
  truncateText 
} from '../utils/activityFormatters';

interface ActivityItemProps {
  id: string;
  type: ActivityType;
  timestamp: Date | string;
  actor: {
    id: string;
    username: string;
    avatar?: string;
  };
  target?: {
    id: string;
    type: 'game' | 'review' | 'comment';
    name?: string;
  };
  game?: {
    id: string;
    name: string;
    coverImage?: string;
  };
  content?: string;
  currentUserId?: string;
  className?: string;
  onClick?: () => void;
}

const ActivityItem: React.FC<ActivityItemProps> = ({
  id,
  type,
  timestamp,
  actor,
  target,
  game,
  content,
  currentUserId,
  className = '',
  onClick
}) => {
  // Get icon based on activity type
  const getActivityIcon = () => {
    switch (type) {
      case 'review':
        return <Star className="h-5 w-5 text-yellow-400" />;
      case 'review_like':
        return <Heart className="h-5 w-5 text-red-400" />;
      case 'comment':
        return <MessageSquare className="h-5 w-5 text-blue-400" />;
      case 'comment_like':
        return <ThumbsUp className="h-5 w-5 text-green-400" />;
      case 'comment_reply':
        return <Reply className="h-5 w-5 text-purple-400" />;
      default:
        return <Calendar className="h-5 w-5 text-gray-400" />;
    }
  };

  // Check if current user is the actor
  const isCurrentUser = currentUserId && actor.id === currentUserId;

  // Format activity description
  const getActivityDescription = () => {
    switch (type) {
      case 'review':
        if (!game) return 'posted a review';
        
        return (
          <>
            {isCurrentUser ? 'You' : (
              <Link 
                to={`/user/${actor.id}`}
                className="font-medium text-white hover:text-blue-400 transition-colors"
              >
                {actor.username}
              </Link>
            )}
            {' posted a review for '}
            <Link 
              to={`/game/${game.id}`}
              className="font-medium text-white hover:text-blue-400 transition-colors"
            >
              {game.name}
            </Link>
          </>
        );
        
      case 'review_like':
        if (!target || !game) return 'liked a review';
        
        return (
          <>
            {isCurrentUser ? 'You' : (
              <Link 
                to={`/user/${actor.id}`}
                className="font-medium text-white hover:text-blue-400 transition-colors"
              >
                {actor.username}
              </Link>
            )}
            {' liked '}
            {target.type === 'review' && target.name ? (
              <>
                <Link 
                  to={`/review/${target.id}`}
                  className="font-medium text-white hover:text-blue-400 transition-colors"
                >
                  {target.name}'s review
                </Link>
              </>
            ) : (
              'a review'
            )}
            {' of '}
            <Link 
              to={`/game/${game.id}`}
              className="font-medium text-white hover:text-blue-400 transition-colors"
            >
              {game.name}
            </Link>
          </>
        );
        
      case 'comment':
        if (!target || !game) return 'commented on a review';
        
        return (
          <>
            {isCurrentUser ? 'You' : (
              <Link 
                to={`/user/${actor.id}`}
                className="font-medium text-white hover:text-blue-400 transition-colors"
              >
                {actor.username}
              </Link>
            )}
            {' commented on '}
            {target.type === 'review' && target.name ? (
              <>
                <Link 
                  to={`/review/${target.id}`}
                  className="font-medium text-white hover:text-blue-400 transition-colors"
                >
                  {target.name}'s review
                </Link>
              </>
            ) : (
              'a review'
            )}
            {' of '}
            <Link 
              to={`/game/${game.id}`}
              className="font-medium text-white hover:text-blue-400 transition-colors"
            >
              {game.name}
            </Link>
          </>
        );
        
      case 'comment_like':
        if (!target || !game) return 'liked a comment';
        
        return (
          <>
            {isCurrentUser ? 'You' : (
              <Link 
                to={`/user/${actor.id}`}
                className="font-medium text-white hover:text-blue-400 transition-colors"
              >
                {actor.username}
              </Link>
            )}
            {' liked '}
            {target.type === 'comment' && target.name ? (
              <>
                <Link 
                  to={`/user/${target.id}`}
                  className="font-medium text-white hover:text-blue-400 transition-colors"
                >
                  {target.name}'s comment
                </Link>
              </>
            ) : (
              'a comment'
            )}
            {' on '}
            <Link 
              to={`/game/${game.id}`}
              className="font-medium text-white hover:text-blue-400 transition-colors"
            >
              {game.name}
            </Link>
          </>
        );
        
      case 'comment_reply':
        if (!target || !game) return 'replied to a comment';
        
        return (
          <>
            {isCurrentUser ? 'You' : (
              <Link 
                to={`/user/${actor.id}`}
                className="font-medium text-white hover:text-blue-400 transition-colors"
              >
                {actor.username}
              </Link>
            )}
            {' replied to '}
            {target.type === 'comment' && target.name ? (
              <>
                <Link 
                  to={`/user/${target.id}`}
                  className="font-medium text-white hover:text-blue-400 transition-colors"
                >
                  {target.name}'s comment
                </Link>
              </>
            ) : (
              'a comment'
            )}
            {' on '}
            <Link 
              to={`/game/${game.id}`}
              className="font-medium text-white hover:text-blue-400 transition-colors"
            >
              {game.name}
            </Link>
          </>
        );
        
      default:
        return (
          <>
            <Link 
              to={`/user/${actor.id}`}
              className="font-medium text-white hover:text-blue-400 transition-colors"
            >
              {actor.username}
            </Link>
            {' performed an activity'}
          </>
        );
    }
  };

  // Generate user initial from username
  const getUserInitial = (username: string): string => {
    return username.charAt(0).toUpperCase();
  };

  return (
    <div 
      className={`bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors ${className}`}
      onClick={onClick}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      <div className="flex gap-3">
        {/* Activity Icon */}
        <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
          {getActivityIcon()}
        </div>
        
        {/* Activity Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="text-gray-300">
              {getActivityDescription()}
            </div>
            <div className="text-gray-500 text-sm">
              {formatRelativeTime(timestamp)}
            </div>
          </div>
          
          {/* Content Preview */}
          {content && (
            <div className="mt-2 p-3 bg-gray-700 rounded-lg">
              <p className="text-gray-300 text-sm line-clamp-2">
                {content}
              </p>
            </div>
          )}
          
          {/* Game Image */}
          {game?.coverImage && (
            <div className="mt-2">
              <Link to={`/game/${game.id}`}>
                <img 
                  src={game.coverImage} 
                  alt={game.name}
                  className="h-16 rounded object-cover"
                  loading="lazy"
                />
              </Link>
            </div>
          )}
          
          {/* User Avatar */}
          {!isCurrentUser && (
            <div className="mt-2 flex items-center gap-2">
              {actor.avatar ? (
                <img
                  src={actor.avatar}
                  alt={actor.username}
                  className="w-6 h-6 rounded-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center text-white text-xs">
                  {getUserInitial(actor.username)}
                </div>
              )}
              <span className="text-gray-400 text-xs">
                {actor.username}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
export default memo(ActivityItem);