import React, { useState } from 'react';
import { Heart, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { Comment } from '../services/reviewService';

interface ReviewInteractionsProps {aimport React, { useState } from 'react';
import { Heart, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { Comment } from '../services/reviewService';

interface ReviewInteractionsProps {
  reviewId: string;
  initialLikeCount: number;
  initialCommentCount: number;
  isLiked: boolean;
  onLike: () => void;
  onUnlike: () => void;
  comments: Comment[];
  onAddComment: (content: string, parentId?: number) => Promise<void>;
  isLoadingComments: boolean;
  isLoadingLike: boolean;
  error?: string;
  className?: string;
}

export const ReviewInteractions: React.FC<ReviewInteractionsProps> = ({
  reviewId,
  initialLikeCount,
  initialCommentCount,
  isLiked,
  onLike,
  onUnlike,
  comments,
  onAddComment,
  isLoadingComments,
  isLoadingLike,
  error,
  className = ''
}) => {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [commentError, setCommentError] = useState<string | undefined>();
  
  // Character limit for comments
  const MAX_CHARS = 500;
  const remainingChars = MAX_CHARS - commentText.length;
  const isOverLimit = remainingChars < 0;
  
  const handleLikeToggle = () => {
    if (isLiked) {
      onUnlike();
    } else {
      onLike();
    }
  };
  
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!commentText.trim() || isOverLimit) {
      return;
    }
    
    setIsSubmitting(true);
    setCommentError(undefined);
    
    try {
      await onAddComment(commentText);
      setCommentText('');
    } catch (err) {
      setCommentError('Failed to post comment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const toggleComments = () => {
    setShowComments(!showComments);
  };
  
  // Format relative time for comments
  const formatRelativeTime = (date: string): string => {
    const now = new Date();
    const commentDate = new Date(date);
    const diffTime = Math.abs(now.getTime() - commentDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffTime / (1000 * 60));
        return diffMinutes === 0 ? 'just now' : `${diffMinutes}m ago`;
      }
      return `${diffHours}h ago`;
    }
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
    return `${Math.floor(diffDays / 365)}y ago`;
  };
  
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Like and Comment Buttons */}
      <div className="flex items-center gap-6 text-gray-400">
        <button
          onClick={handleLikeToggle}
          disabled={isLoadingLike}
          className={`flex items-center gap-2 transition-colors ${
            isLiked ? 'text-red-500 hover:text-red-600' : 'hover:text-white'
          }`}
          aria-label={isLiked ? 'Unlike review' : 'Like review'}
        >
          <Heart className={`h-5 w-5 transition-transform ${isLiked ? 'fill-current scale-110' : 'scale-100'}`} />
          <span>{initialLikeCount}</span>
        </button>
        
        <button
          onClick={toggleComments}
          className="flex items-center gap-2 hover:text-white transition-colors"
          aria-label={showComments ? 'Hide comments' : 'Show comments'}
        >
          <MessageSquare className="h-5 w-5" />
          <span>{initialCommentCount}</span>
          {showComments ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
      </div>
      
      {/* Comments Section */}
      {showComments && (
        <div className="pt-2 border-t border-gray-700">
          {/* Comment Form */}
          <form onSubmit={handleCommentSubmit} className="mb-4">
            <div className="relative">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="What are your thoughts?"
                className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors ${
                  isOverLimit ? 'border-red-500' : 'border-gray-600'
                }`}
                rows={3}
                maxLength={MAX_CHARS}
                disabled={isSubmitting}
                aria-label="Add a comment"
              />
              <div className={`absolute bottom-2 right-2 text-xs ${
                isOverLimit ? 'text-red-500' : 'text-gray-400'
              }`}>
                {remainingChars} characters remaining
              </div>
            </div>
            
            {commentError && (
              <p className="mt-1 text-sm text-red-500">{commentError}</p>
            )}
            
            <div className="flex justify-end mt-2">
              <button
                type="submit"
                disabled={isSubmitting || !commentText.trim() || isOverLimit}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Posting...' : 'Post Comment'}
              </button>
            </div>
          </form>
          
          {/* Comments List */}
          {isLoadingComments ? (
            <div className="py-4 text-center text-gray-400">
              Loading comments...
            </div>
          ) : comments.length > 0 ? (
            <div className="space-y-4">
              {comments.map((comment) => (
                <CommentItem 
                  key={comment.id} 
                  comment={comment} 
                  formatRelativeTime={formatRelativeTime}
                />
              ))}
            </div>
          ) : (
            <div className="py-4 text-center text-gray-400">
              No comments yet. Be the first to share your thoughts!
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface CommentItemProps {
  comment: Comment;
  formatRelativeTime: (date: string) => string;
  level?: number;
}

const CommentItem: React.FC<CommentItemProps> = ({ 
  comment, 
  formatRelativeTime,
  level = 0 
}) => {
  const maxLevel = 5; // Maximum nesting level
  
  return (
    <div className="comment-item" style={{ marginLeft: level > 0 ? `${level * 24}px` : '0' }}>
      <div className="flex gap-3">
        {/* User Avatar */}
        <div className="flex-shrink-0">
          {comment.user?.picurl ? (
            <img
              src={comment.user.picurl}
              alt={`${comment.user.username || comment.user.name}'s avatar`}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-gray-300 text-sm">
              {comment.user?.name.charAt(0).toUpperCase() || '?'}
            </div>
          )}
        </div>
        
        {/* Comment Content */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-white">{comment.user?.name || 'Anonymous'}</span>
            <span className="text-gray-400 text-xs">{formatRelativeTime(comment.createdAt)}</span>
          </div>
          <p className="text-gray-300 text-sm mb-2">{comment.content}</p>
          
          {/* Comment Actions */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <button className="hover:text-white transition-colors">
              Reply
            </button>
          </div>
          
          {/* Nested Replies */}
          {comment.replies && comment.replies.length > 0 && level < maxLevel && (
            <div className="mt-3 space-y-3">
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  formatRelativeTime={formatRelativeTime}
                  level={level + 1}
                />
              ))}
            </div>
          )}
          
          {/* "Continue thread" for deeply nested comments */}
          {comment.replies && comment.replies.length > 0 && level >= maxLevel && (
            <div className="mt-2 text-sm text-purple-400 hover:text-purple-300 cursor-pointer">
              Continue this thread →
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
  reviewId: string;
  initialLikeCount: number;
  initialCommentCount: number;
  isLiked: boolean;
  onLike: () => void;
  onUnlike: () => void;
  comments: Comment[];
  onAddComment: (content: string, parentId?: number) => Promise<void>;
  isLoadingComments: boolean;
  isLoadingLike: boolean;
  error?: string;
  className?: string;
}

export const ReviewInteractions: React.FC<ReviewInteractionsProps> = ({
  reviewId,
  initialLikeCount,
  initialCommentCount,
  isLiked,
  onLike,
  onUnlike,
  comments,
  onAddComment,
  isLoadingComments,
  isLoadingLike,
  error,
  className = ''
}) => {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [commentError, setCommentError] = useState<string | undefined>();
  
  // Character limit for comments
  const MAX_CHARS = 500;
  const remainingChars = MAX_CHARS - commentText.length;
  const isOverLimit = remainingChars < 0;
  
  const handleLikeToggle = () => {
    if (isLiked) {
      onUnlike();
    } else {
      onLike();
    }
  };
  
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!commentText.trim() || isOverLimit) {
      return;
    }
    
    setIsSubmitting(true);
    setCommentError(undefined);
    
    try {
      await onAddComment(commentText);
      setCommentText('');
    } catch (err) {
      setCommentError('Failed to post comment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const toggleComments = () => {
    setShowComments(!showComments);
  };
  
  // Format relative time for comments
  const formatRelativeTime = (date: string): string => {
    const now = new Date();
    const commentDate = new Date(date);
    const diffTime = Math.abs(now.getTime() - commentDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffTime / (1000 * 60));
        return diffMinutes === 0 ? 'just now' : `${diffMinutes}m ago`;
      }
      return `${diffHours}h ago`;
    }
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
    return `${Math.floor(diffDays / 365)}y ago`;
  };
  
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Like and Comment Buttons */}
      <div className="flex items-center gap-6 text-gray-400">
        <button
          onClick={handleLikeToggle}
          disabled={isLoadingLike}
          className={`flex items-center gap-2 transition-colors ${
            isLiked ? 'text-red-500 hover:text-red-600' : 'hover:text-white'
          }`}
          aria-label={isLiked ? 'Unlike review' : 'Like review'}
        >
          <Heart className={`h-5 w-5 transition-transform ${isLiked ? 'fill-current scale-110' : 'scale-100'}`} />
          <span>{initialLikeCount}</span>
        </button>
        
        <button
          onClick={toggleComments}
          className="flex items-center gap-2 hover:text-white transition-colors"
          aria-label={showComments ? 'Hide comments' : 'Show comments'}
        >
          <MessageSquare className="h-5 w-5" />
          <span>{initialCommentCount}</span>
          {showComments ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
      </div>
      
      {/* Comments Section */}
      {showComments && (
        <div className="pt-2 border-t border-gray-700">
          {/* Comment Form */}
          <form onSubmit={handleCommentSubmit} className="mb-4">
            <div className="relative">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="What are your thoughts?"
                className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors ${
                  isOverLimit ? 'border-red-500' : 'border-gray-600'
                }`}
                rows={3}
                maxLength={MAX_CHARS}
                disabled={isSubmitting}
                aria-label="Add a comment"
              />
              <div className={`absolute bottom-2 right-2 text-xs ${
                isOverLimit ? 'text-red-500' : 'text-gray-400'
              }`}>
                {remainingChars} characters remaining
              </div>
            </div>
            
            {commentError && (
              <p className="mt-1 text-sm text-red-500">{commentError}</p>
            )}
            
            <div className="flex justify-end mt-2">
              <button
                type="submit"
                disabled={isSubmitting || !commentText.trim() || isOverLimit}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Posting...' : 'Post Comment'}
              </button>
            </div>
          </form>
          
          {/* Comments List */}
          {isLoadingComments ? (
            <div className="py-4 text-center text-gray-400">
              Loading comments...
            </div>
          ) : comments.length > 0 ? (
            <div className="space-y-4">
              {comments.map((comment) => (
                <CommentItem 
                  key={comment.id} 
                  comment={comment} 
                  formatRelativeTime={formatRelativeTime}
                />
              ))}
            </div>
          ) : (
            <div className="py-4 text-center text-gray-400">
              No comments yet. Be the first to share your thoughts!
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface CommentItemProps {
  comment: Comment;
  formatRelativeTime: (date: string) => string;
  level?: number;
}

const CommentItem: React.FC<CommentItemProps> = ({ 
  comment, 
  formatRelativeTime,
  level = 0 
}) => {
  const maxLevel = 5; // Maximum nesting level
  
  return (
    <div className="comment-item" style={{ marginLeft: level > 0 ? `${level * 24}px` : '0' }}>
      <div className="flex gap-3">
        {/* User Avatar */}
        <div className="flex-shrink-0">
          {comment.user?.picurl ? (
            <img
              src={comment.user.picurl}
              alt={`${comment.user.name}'s avatar`}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-gray-300 text-sm">
              {comment.user?.name.charAt(0).toUpperCase() || '?'}
            </div>
          )}
        </div>
        
        {/* Comment Content */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-white">{comment.user?.name || 'Anonymous'}</span>
            <span className="text-gray-400 text-xs">{formatRelativeTime(comment.createdAt)}</span>
          </div>
          <p className="text-gray-300 text-sm mb-2">{comment.content}</p>
          
          {/* Comment Actions */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <button className="hover:text-white transition-colors">
              Reply
            </button>
          </div>
          
          {/* Nested Replies */}
          {comment.replies && comment.replies.length > 0 && level < maxLevel && (
            <div className="mt-3 space-y-3">
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  formatRelativeTime={formatRelativeTime}
                  level={level + 1}
                />
              ))}
            </div>
          )}
          
          {/* "Continue thread" for deeply nested comments */}
          {comment.replies && comment.replies.length > 0 && level >= maxLevel && (
            <div className="mt-2 text-sm text-purple-400 hover:text-purple-300 cursor-pointer">
              Continue this thread →
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
