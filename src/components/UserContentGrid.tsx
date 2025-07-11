import React, { useState } from 'react';
import { UserContentWithStats } from '../types/social';
import { ThumbsUp, MessageSquare, Share2, MoreVertical, Play, Image, Video, FileText, User } from 'lucide-react';
import { LazyImage } from './LazyImage';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

interface UserContentGridProps {
  content: UserContentWithStats[];
  onLike?: (contentId: number) => Promise<boolean>;
  onUnlike?: (contentId: number) => Promise<boolean>;
  onShare?: (contentId: number) => Promise<boolean>;
  onDelete?: (contentId: number) => Promise<boolean>;
  loading?: boolean;
  className?: string;
}

export const UserContentGrid: React.FC<UserContentGridProps> = ({
  content,
  onLike,
  onUnlike,
  onShare,
  onDelete,
  loading = false,
  className = ''
}) => {
  const [activeContent, setActiveContent] = useState<UserContentWithStats | null>(null);

  // Get content type icon
  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'screenshot':
        return <Image className="h-5 w-5 text-blue-400" />;
      case 'video':
        return <Video className="h-5 w-5 text-red-400" />;
      case 'clip':
        return <Play className="h-5 w-5 text-green-400" />;
      default:
        return <FileText className="h-5 w-5 text-purple-400" />;
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy');
  };

  // Handle like/unlike
  const handleLikeToggle = async (contentId: number, isLiked: boolean) => {
    if (isLiked && onUnlike) {
      await onUnlike(contentId);
    } else if (!isLiked && onLike) {
      await onLike(contentId);
    }
  };

  if (loading) {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-gray-800 rounded-lg overflow-hidden animate-pulse">
            <div className="aspect-video bg-gray-700"></div>
            <div className="p-4">
              <div className="h-5 bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-700 rounded w-1/2 mb-4"></div>
              <div className="flex justify-between">
                <div className="h-4 bg-gray-700 rounded w-16"></div>
                <div className="h-4 bg-gray-700 rounded w-16"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (content.length === 0) {
    return (
      <div className={`text-center py-12 bg-gray-800 rounded-lg ${className}`}>
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-700 rounded-full flex items-center justify-center">
          <Image className="h-8 w-8 text-gray-500" />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">No content yet</h3>
        <p className="text-gray-400">
          Share screenshots, videos, and more from your favorite games
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {content.map((item) => (
          <div key={item.id} className="bg-gray-800 rounded-lg overflow-hidden group">
            {/* Content preview */}
            <div
              className="aspect-video relative cursor-pointer"
              onClick={() => setActiveContent(item)}
            >
              {item.thumbnail_url || item.content_url ? (
                <LazyImage
                  src={item.thumbnail_url || item.content_url}
                  alt={item.title || 'User content'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                  {getContentTypeIcon(item.content_type)}
                </div>
              )}
              
              {/* Overlay with content type */}
              <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 backdrop-blur-sm rounded text-xs text-white flex items-center gap-1">
                {getContentTypeIcon(item.content_type)}
                <span>{item.content_type}</span>
              </div>
              
              {/* Play button for videos and clips */}
              {(item.content_type === 'video' || item.content_type === 'clip') && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center">
                    <Play className="h-6 w-6 text-white" />
                  </div>
                </div>
              )}
              
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                  View {item.content_type}
                </button>
              </div>
            </div>
            
            {/* Content info */}
            <div className="p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-medium text-white line-clamp-1">
                  {item.title || `${item.content_type} from ${item.game?.name || 'a game'}`}
                </h3>
                
                <div className="relative group">
                  <button className="p-1 text-gray-400 hover:text-white transition-colors">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  <div className="absolute right-0 mt-2 w-48 bg-gray-900 rounded-lg shadow-lg py-1 z-10 hidden group-hover:block">
                    <button className="flex items-center gap-2 w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-800 transition-colors">
                      <Share2 className="h-4 w-4" />
                      <span>Share</span>
                    </button>
                    {onDelete && (
                      <button
                        onClick={() => onDelete(item.id)}
                        className="flex items-center gap-2 w-full px-4 py-2 text-left text-red-400 hover:bg-gray-800 transition-colors"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          <line x1="10" y1="11" x2="10" y2="17"></line>
                          <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 mb-3">
                <Link
                  to={`/user/${item.user?.id}`}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-purple-400 transition-colors"
                >
                  {item.user?.picurl ? (
                    <LazyImage
                      src={item.user.picurl}
                      alt={item.user.name}
                      className="w-4 h-4 rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-3 w-3" />
                  )}
                  <span>{item.user?.name}</span>
                </Link>
                <span className="text-xs text-gray-500">•</span>
                <span className="text-xs text-gray-500">{formatDate(item.created_at)}</span>
              </div>
              
              {item.description && (
                <p className="text-sm text-gray-300 mb-3 line-clamp-2">{item.description}</p>
              )}
              
              {/* Game link if available */}
              {item.game && (
                <Link
                  to={`/game/${item.game.id}`}
                  className="inline-block mb-3 px-2 py-1 bg-gray-700 rounded text-xs text-gray-300 hover:bg-gray-600 transition-colors"
                >
                  {item.game.name}
                </Link>
              )}
              
              {/* Interaction buttons */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => handleLikeToggle(item.id, item.isLiked)}
                  className={`flex items-center gap-1 text-sm ${
                    item.isLiked ? 'text-purple-400' : 'text-gray-400 hover:text-purple-400'
                  } transition-colors`}
                >
                  <ThumbsUp className="h-4 w-4" />
                  <span>{item.likes}</span>
                </button>
                
                <button className="flex items-center gap-1 text-sm text-gray-400 hover:text-purple-400 transition-colors">
                  <MessageSquare className="h-4 w-4" />
                  <span>{item.comments}</span>
                </button>
                
                {onShare && (
                  <button
                    onClick={() => onShare(item.id)}
                    className="flex items-center gap-1 text-sm text-gray-400 hover:text-purple-400 transition-colors"
                  >
                    <Share2 className="h-4 w-4" />
                    <span>{item.shares}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Content viewer modal */}
      {activeContent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
          onClick={() => setActiveContent(null)}
        >
          <div
            className="bg-gray-900 rounded-lg overflow-hidden max-w-4xl w-full max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <h3 className="font-medium text-white">{activeContent.title || 'User Content'}</h3>
              <button
                onClick={() => setActiveContent(null)}
                className="p-1 text-gray-400 hover:text-white transition-colors"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-auto">
              {activeContent.content_type === 'video' || activeContent.content_type === 'clip' ? (
                <video
                  src={activeContent.content_url}
                  controls
                  className="w-full h-full object-contain"
                />
              ) : (
                <img
                  src={activeContent.content_url}
                  alt={activeContent.title || 'User content'}
                  className="w-full h-full object-contain"
                />
              )}
            </div>
            
            <div className="p-4 border-t border-gray-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {activeContent.user?.picurl ? (
                    <LazyImage
                      src={activeContent.user.picurl}
                      alt={activeContent.user.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-gray-400" />
                    </div>
                  )}
                  
                  <div>
                    <Link
                      to={`/user/${activeContent.user?.id}`}
                      className="font-medium text-white hover:text-purple-400 transition-colors"
                    >
                      {activeContent.user?.name}
                    </Link>
                    <div className="text-xs text-gray-400">
                      {formatDate(activeContent.created_at)}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleLikeToggle(activeContent.id, activeContent.isLiked)}
                    className={`flex items-center gap-1 ${
                      activeContent.isLiked ? 'text-purple-400' : 'text-gray-400 hover:text-purple-400'
                    } transition-colors`}
                  >
                    <ThumbsUp className="h-4 w-4" />
                    <span>{activeContent.likes}</span>
                  </button>
                  
                  <button className="flex items-center gap-1 text-gray-400 hover:text-purple-400 transition-colors">
                    <MessageSquare className="h-4 w-4" />
                    <span>{activeContent.comments}</span>
                  </button>
                  
                  {onShare && (
                    <button
                      onClick={() => onShare(activeContent.id)}
                      className="flex items-center gap-1 text-gray-400 hover:text-purple-400 transition-colors"
                    >
                      <Share2 className="h-4 w-4" />
                      <span>{activeContent.shares}</span>
                    </button>
                  )}
                </div>
              </div>
              
              {activeContent.description && (
                <p className="text-gray-300">{activeContent.description}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};