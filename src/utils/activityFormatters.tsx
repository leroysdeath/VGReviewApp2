import React from 'react';
import { Link } from 'react-router-dom';
import { getGameUrl } from './gameUrls';
import { getRelativeTime } from './dateUtils';

// Activity types
export type ActivityType = 'review' | 'review_like' | 'comment' | 'comment_like' | 'comment_reply';

// Base activity data interface
export interface ActivityData {
  type: ActivityType;
  timestamp: Date | string;
  actor: {
    id: string;
    username: string;
  };
  target?: {
    id: string;
    type: 'game' | 'review' | 'comment';
    name?: string;
  };
  game?: {
    id: string | number;
    igdb_id?: string | number; // IGDB ID for navigation
    slug?: string | null;
    name: string;
  };
  content?: string;
}

/**
 * Export formatRelativeTime as an alias to the centralized getRelativeTime
 * for backward compatibility
 */
export const formatRelativeTime = getRelativeTime;

/**
 * Format activity data into a user-friendly description with links
 */
export const formatActivity = (activity: ActivityData, currentUserId?: string): React.ReactNode => {
  try {
    // Check for required data
    if (!activity.actor || !activity.type) {
      throw new Error('Invalid activity data: missing actor or type');
    }
    
    // Check if the current user is the actor
    const isCurrentUser = currentUserId && activity.actor.id === currentUserId;
    
    // Format timestamp
    const timeAgo = formatRelativeTime(activity.timestamp);
    
    // Format based on activity type
    switch (activity.type) {
      case 'review':
        if (!activity.game) {
          throw new Error('Invalid review activity: missing game data');
        }
        
        return (
          <>
            {isCurrentUser ? (
              <>You posted a review for </>
            ) : (
              <>
                <Link 
                  to={`/user/${activity.actor.id}`}
                  className="font-medium text-blue-400 hover:text-blue-300 transition-colors"
                >
                  {activity.actor.username}
                </Link>
                <> posted a review for </>
              </>
            )}
            <Link 
              to={getGameUrl(activity.game)}
              className="font-medium text-blue-400 hover:text-blue-300 transition-colors"
            >
              {activity.game.name}
            </Link>
            <> <span className="text-gray-400">{timeAgo}</span></>
          </>
        );
        
      case 'review_like':
        if (!activity.target || !activity.game) {
          throw new Error('Invalid review_like activity: missing target or game data');
        }
        
        return (
          <>
            {isCurrentUser ? (
              <>You liked </>
            ) : (
              <>
                <Link 
                  to={`/user/${activity.actor.id}`}
                  className="font-medium text-blue-400 hover:text-blue-300 transition-colors"
                >
                  {activity.actor.username}
                </Link>
                <> liked </>
              </>
            )}
            {activity.target.type === 'review' && activity.target.name ? (
              <>
                <Link 
                  to={`/review/${activity.target.id}`}
                  className="font-medium text-blue-400 hover:text-blue-300 transition-colors"
                >
                  {activity.target.name}'s review
                </Link>
              </>
            ) : (
              <>a review</>
            )}
            <> of </>
            <Link 
              to={getGameUrl(activity.game)}
              className="font-medium text-blue-400 hover:text-blue-300 transition-colors"
            >
              {activity.game.name}
            </Link>
            <> <span className="text-gray-400">{timeAgo}</span></>
          </>
        );
        
      case 'comment':
        if (!activity.target || !activity.game) {
          throw new Error('Invalid comment activity: missing target or game data');
        }
        
        return (
          <>
            {isCurrentUser ? (
              <>You commented on </>
            ) : (
              <>
                <Link 
                  to={`/user/${activity.actor.id}`}
                  className="font-medium text-blue-400 hover:text-blue-300 transition-colors"
                >
                  {activity.actor.username}
                </Link>
                <> commented on </>
              </>
            )}
            {activity.target.type === 'review' && activity.target.name ? (
              <>
                <Link 
                  to={`/review/${activity.target.id}`}
                  className="font-medium text-blue-400 hover:text-blue-300 transition-colors"
                >
                  {activity.target.name}'s review
                </Link>
              </>
            ) : (
              <>a review</>
            )}
            <> of </>
            <Link 
              to={getGameUrl(activity.game)}
              className="font-medium text-blue-400 hover:text-blue-300 transition-colors"
            >
              {activity.game.name}
            </Link>
            <> <span className="text-gray-400">{timeAgo}</span></>
          </>
        );
        
      case 'comment_like':
        if (!activity.target || !activity.game) {
          throw new Error('Invalid comment_like activity: missing target or game data');
        }
        
        return (
          <>
            {isCurrentUser ? (
              <>You liked </>
            ) : (
              <>
                <Link 
                  to={`/user/${activity.actor.id}`}
                  className="font-medium text-blue-400 hover:text-blue-300 transition-colors"
                >
                  {activity.actor.username}
                </Link>
                <> liked </>
              </>
            )}
            {activity.target.type === 'comment' && activity.target.name ? (
              <>
                <Link 
                  to={`/user/${activity.target.id}`}
                  className="font-medium text-blue-400 hover:text-blue-300 transition-colors"
                >
                  {activity.target.name}'s comment
                </Link>
              </>
            ) : (
              <>a comment</>
            )}
            <> on </>
            <Link 
              to={getGameUrl(activity.game)}
              className="font-medium text-blue-400 hover:text-blue-300 transition-colors"
            >
              {activity.game.name}
            </Link>
            <> <span className="text-gray-400">{timeAgo}</span></>
          </>
        );
        
      case 'comment_reply':
        if (!activity.target || !activity.game) {
          throw new Error('Invalid comment_reply activity: missing target or game data');
        }
        
        return (
          <>
            {isCurrentUser ? (
              <>You replied to </>
            ) : (
              <>
                <Link 
                  to={`/user/${activity.actor.id}`}
                  className="font-medium text-blue-400 hover:text-blue-300 transition-colors"
                >
                  {activity.actor.username}
                </Link>
                <> replied to </>
              </>
            )}
            {activity.target.type === 'comment' && activity.target.name ? (
              <>
                <Link 
                  to={`/user/${activity.target.id}`}
                  className="font-medium text-blue-400 hover:text-blue-300 transition-colors"
                >
                  {activity.target.name}'s comment
                </Link>
              </>
            ) : (
              <>a comment</>
            )}
            <> on </>
            <Link 
              to={getGameUrl(activity.game)}
              className="font-medium text-blue-400 hover:text-blue-300 transition-colors"
            >
              {activity.game.name}
            </Link>
            <> <span className="text-gray-400">{timeAgo}</span></>
          </>
        );
        
      default:
        return (
          <>
            <Link 
              to={`/user/${activity.actor.id}`}
              className="font-medium text-blue-400 hover:text-blue-300 transition-colors"
            >
              {activity.actor.username}
            </Link>
            <> performed an activity <span className="text-gray-400">{timeAgo}</span></>
          </>
        );
    }
  } catch (error) {
    console.error('Error formatting activity:', error);
    return <>Activity data unavailable</>;
  }
};

/**
 * Format a plain text activity description (without React components)
 */
export const formatActivityText = (activity: ActivityData, currentUserId?: string): string => {
  try {
    // Check for required data
    if (!activity.actor || !activity.type) {
      throw new Error('Invalid activity data: missing actor or type');
    }
    
    // Check if the current user is the actor
    const isCurrentUser = currentUserId && activity.actor.id === currentUserId;
    
    // Format timestamp
    const timeAgo = formatRelativeTime(activity.timestamp);
    
    // Format based on activity type
    switch (activity.type) {
      case 'review':
        if (!activity.game) {
          throw new Error('Invalid review activity: missing game data');
        }
        
        return `${isCurrentUser ? 'You' : activity.actor.username} posted a review for ${activity.game.name} ${timeAgo}`;
        
      case 'review_like':
        if (!activity.target || !activity.game) {
          throw new Error('Invalid review_like activity: missing target or game data');
        }
        
        const reviewOwner = activity.target.type === 'review' && activity.target.name 
          ? `${activity.target.name}'s review` 
          : 'a review';
          
        return `${isCurrentUser ? 'You' : activity.actor.username} liked ${reviewOwner} of ${activity.game.name} ${timeAgo}`;
        
      case 'comment':
        if (!activity.target || !activity.game) {
          throw new Error('Invalid comment activity: missing target or game data');
        }
        
        const reviewTarget = activity.target.type === 'review' && activity.target.name 
          ? `${activity.target.name}'s review` 
          : 'a review';
          
        return `${isCurrentUser ? 'You' : activity.actor.username} commented on ${reviewTarget} of ${activity.game.name} ${timeAgo}`;
        
      case 'comment_like':
        if (!activity.target || !activity.game) {
          throw new Error('Invalid comment_like activity: missing target or game data');
        }
        
        const commentOwner = activity.target.type === 'comment' && activity.target.name 
          ? `${activity.target.name}'s comment` 
          : 'a comment';
          
        return `${isCurrentUser ? 'You' : activity.actor.username} liked ${commentOwner} on ${activity.game.name} ${timeAgo}`;
        
      case 'comment_reply':
        if (!activity.target || !activity.game) {
          throw new Error('Invalid comment_reply activity: missing target or game data');
        }
        
        const commentTarget = activity.target.type === 'comment' && activity.target.name 
          ? `${activity.target.name}'s comment` 
          : 'a comment';
          
        return `${isCurrentUser ? 'You' : activity.actor.username} replied to ${commentTarget} on ${activity.game.name} ${timeAgo}`;
        
      default:
        return `${activity.actor.username} performed an activity ${timeAgo}`;
    }
  } catch (error) {
    console.error('Error formatting activity text:', error);
    return 'Activity data unavailable';
  }
};

/**
 * Get the appropriate icon name for an activity type
 */
export const getActivityIconName = (type: ActivityType): string => {
  switch (type) {
    case 'review':
      return 'star';
    case 'review_like':
      return 'heart';
    case 'comment':
      return 'message-square';
    case 'comment_like':
      return 'thumbs-up';
    case 'comment_reply':
      return 'reply';
    default:
      return 'activity';
  }
};

/**
 * Get the appropriate color for an activity type
 */
export const getActivityColor = (type: ActivityType): string => {
  switch (type) {
    case 'review':
      return 'text-yellow-400';
    case 'review_like':
      return 'text-red-400';
    case 'comment':
      return 'text-blue-400';
    case 'comment_like':
      return 'text-green-400';
    case 'comment_reply':
      return 'text-purple-400';
    default:
      return 'text-gray-400';
  }
};

/**
 * Format a count with proper pluralization
 */
export const formatCount = (count: number, singular: string, plural: string): string => {
  return `${count} ${count === 1 ? singular : plural}`;
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (!text || text.length <= maxLength) return text || '';
  return text.substring(0, maxLength) + '...';
};
