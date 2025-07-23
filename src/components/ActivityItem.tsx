import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Trophy, 
  Star, 
  MessageCircle, 
  Plus, 
  Heart,
  Clock
} from 'lucide-react';

interface ActivityItemProps {
  type: 'rating' | 'review' | 'completed' | 'wishlist' | 'like';
  actor: {
    id: string;
    username: string;
    avatar?: string | null;
  };
  game?: {
    id: string;
    name: string;
    coverImage?: string | null;
  } | null;
  content?: string;
  rating?: number;
  timestamp: string;
  isCurrentUser?: boolean;
  onClick?: () => void;
}

const ActivityItem: React.FC<ActivityItemProps> = ({
  type,
  actor,
  game,
  content,
  rating,
  timestamp,
  isCurrentUser = false,
  onClick
}) => {
  // Safe avatar access with null checks
  const getActorAvatar = () => {
    if (!actor) return null;
    return actor.avatar || null;
  };

  // Get user initial safely
  const getUserInitial = (username?: string) => {
    if (!username) return '?';
    return username.charAt(0).toUpperCase();
  };

  // Format relative time
  const formatRelativeTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
      
      if (diffInHours < 1) return 'Just now';
      if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
      if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
      return `${Math.floor(diffInHours / 168)}w ago`;
    } catch (error) {
      return 'Recently';
    }
  };

  // Get activity icon
  const getActivityIcon = () => {
    switch (type) {
      case 'rating':
        return <Star className="w-5 h-5 text-yellow-400" />;
      case 'review':
        return <MessageCircle className="w-5 h-5 text-blue-400" />;
      case 'completed':
        return <Trophy className="w-5 h-5 text-green-400" />;
      case 'wishlist':
        return <Plus className="w-5 h-5 text-purple-400" />;
      case 'like':
        return <Heart className="w-5 h-5 text-red-400" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  // Get activity description
  const getActivityDescription = () => {
    const username = actor?.username || 'Unknown user';
    const gameName = game?.name || 'a game';
    
    switch (type) {
      case 'rating':
        return (
          <span>
            <span className="font-medium text-white">{username}</span>
            {' rated '}
            <span className="font-medium text-white">{gameName}</span>
            {rating && (
              <span className="ml-2 text-yellow-400">
                {'★'.repeat(Math.floor(rating))}
              </span>
            )}
          </span>
        );
      case 'review':
        return (
          <span>
            <span className="font-medium text-white">{username}</span>
            {' reviewed '}
            <span className="font-medium text-white">{gameName}</span>
          </span>
        );
      case 'completed':
        return (
          <span>
            <span className="font-medium text-white">{username}</span>
            {' completed '}
            <span className="font-medium text-white">{gameName}</span>
          </span>
        );
      case 'wishlist':
        return (
          <span>
            <span className="font-medium text-white">{username}</span>
            {' added '}
            <span className="font-medium text-white">{gameName}</span>
            {' to wishlist'}
          </span>
        );
      case 'like':
        return (
          <span>
            <span className="font-medium text-white">{username}</span>
            {' liked '}
            <span className="font-medium text-white">{gameName}</span>
          </span>
        );
      default:
        return (
          <span>
            <span className="font-medium text-white">{username}</span>
            {' had some activity with '}
            <span className="font-medium text-white">{gameName}</span>
          </span>
        );
    }
  };

  return (
    <div
      className={`p-4 bg-gray-800 rounded-lg border border-gray-700 transition-colors ${
        onClick ? 'hover:bg-gray-750 cursor-pointer' : ''
      }`}
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
                  onError={(e) => {
                    // Handle broken images
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              </Link>
            </div>
          )}
          
          {/* User Avatar - Only show if not current user */}
          {!isCurrentUser && actor && (
            <div className="mt-2 flex items-center gap-2">
              {getActorAvatar() ? (
                <img
                  src={getActorAvatar()!}
                  alt={actor.username}
                  className="w-6 h-6 rounded-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    // Fallback to initials if avatar fails to load
                    const target = e.target as HTMLImageElement;
                    const parent = target.parentElement;
                    if (parent) {
                      target.style.display = 'none';
                      const fallback = document.createElement('div');
                      fallback.className = 'w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center text-white text-xs';
                      fallback.textContent = getUserInitial(actor.username);
                      parent.appendChild(fallback);
                    }
                  }}
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
